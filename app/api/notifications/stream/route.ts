import { NextRequest } from 'next/server'
import { query } from '../../../../lib/server/db'

async function getNotifications(userId: string | null, role: string | null) {
  try {
    const where: string[] = [];
    const params: any[] = [];
    
    // If not manager, only get notifications for this user
    if (role !== 'manager' && userId) {
      where.push('`salesAgentId` = ?');
      params.push(userId);
    }
    
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await query<any>(
      `SELECT * FROM  notifications  ${whereSql} ORDER BY COALESCE(timestamp, created_at) DESC LIMIT 50`,
      params
    );
    
    return rows;
  } catch (error) {
    console.error('Error reading notifications:', error)
    return []
  }
}

function filterForUser(all: any[], userId?: string | null, role?: string | null) {
  // If user is a manager, they can see all notifications
  if (role === 'manager') {
    return all.filter((n) => Array.isArray(n.to));
  }
  
  // If no user ID, return empty array
  if (!userId) return [];
  
  // For non-managers, filter notifications that are either:
  // 1. Addressed to 'ALL'
  // 2. Specifically addressed to this user
  return all.filter((n) => 
    Array.isArray(n.to) && 
    (n.to.includes('ALL') || n.to.includes(userId))
  );
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
          const notifications = await getNotifications(userId, role)
          const data = filterForUser(notifications, userId, role)
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
