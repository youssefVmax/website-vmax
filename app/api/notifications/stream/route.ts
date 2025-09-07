import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { USERS } from '@/lib/auth'

const dataFilePath = path.join(process.cwd(), 'public', 'data', 'notifications.json')

async function readNotifications() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8')
    return JSON.parse(fileContent)
  } catch {
    return []
  }
}

function filterForUser(all: any[], userId?: string | null, role?: string | null) {
  const validIds = new Set<string>(USERS.map(u => u.id))
  const sanitized = all.filter((n) => Array.isArray(n.to) && n.to.every((t: any) => typeof t === 'string' && (t === 'ALL' || validIds.has(t))))
  if (role === 'manager') return sanitized
  if (!userId) return []
  return sanitized.filter((n) => n.to.includes('ALL') || n.to.includes(userId))
}

export async function GET(req: Request) {
  let timer: any
  let closed = false
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null
  const url = new URL((req as any).url)
  const userId = url.searchParams.get('userId')
  const role = url.searchParams.get('role')
  const stream = new ReadableStream({
    async start(controller) {
      controllerRef = controller
      const encoder = new TextEncoder()

      const send = async () => {
        if (closed || !controllerRef) return
        try {
          const all = await readNotifications()
          const data = filterForUser(all, userId, role)
          const payload = `data: ${JSON.stringify(data)}\n\n`
          try {
            controllerRef.enqueue(encoder.encode(payload))
          } catch (err) {
            // If enqueue fails, close down the stream loop
            closed = true
            if (timer) clearInterval(timer)
            controllerRef = null
            return
          }
        } catch (e) {
          // swallow errors but keep stream alive
          console.error('notifications stream send failed', e)
        }
      }

      try {
        await send()
      } catch (e) {
        // ignore initial failure
      }

      timer = setInterval(send, 5000)

      // Stop when client disconnects
      try {
        // In Next.js route handlers, the standard Request supports an abort signal
        // @ts-ignore - runtime provides signal on Request
        const signal: AbortSignal | undefined = (req as any)?.signal
        if (signal) {
          signal.addEventListener('abort', () => {
            closed = true
            if (timer) clearInterval(timer)
            try { controllerRef?.close() } catch {}
            controllerRef = null
          })
        }
      } catch {}
    },
    cancel() {
      closed = true
      if (timer) clearInterval(timer)
      controllerRef = null
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
