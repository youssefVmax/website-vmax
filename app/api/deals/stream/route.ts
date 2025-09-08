import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function readDeals() {
  const filePath = path.join(process.cwd(), 'public', 'data', 'deals.json')
  try {
    await fs.access(filePath)
  } catch (e) {
    return []
  }
  const fileContent = await fs.readFile(filePath, 'utf-8')
  try {
    const parsed = JSON.parse(fileContent)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error('deals stream parse error:', e)
    return []
  }
}

export async function GET() {
  let timer: any
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = async () => {
        try {
          const deals = await readDeals()
          const payload = `data: ${JSON.stringify(deals)}\n\n`
          controller.enqueue(encoder.encode(payload))
        } catch (e) {
          console.error('deals stream read failed', e)
        }
      }
      await send()
      timer = setInterval(send, 2000) // Update every 2 seconds
    },
    cancel() {
      if (timer) clearInterval(timer)
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
