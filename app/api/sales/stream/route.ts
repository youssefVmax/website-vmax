import { promises as fs } from 'fs'
import path from 'path'
import Papa from 'papaparse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function readCsv() {
  const filePath = path.join(process.cwd(), 'public', 'data', 'aug-ids-new.csv')
  try {
    await fs.access(filePath)
  } catch (e) {
    return []
  }
  const fileContent = await fs.readFile(filePath, 'utf-8')
  const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true })
  if (parsed.errors && parsed.errors.length) {
    console.error('CSV parse errors (sales stream):', parsed.errors.slice(0, 3))
  }
  return (parsed.data as any[])
}

export async function GET() {
  let timer: any
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = async () => {
        try {
          const rows = await readCsv()
          const payload = `data: ${JSON.stringify(rows)}\n\n`
          controller.enqueue(encoder.encode(payload))
        } catch (e) {
          // If reading fails, still keep the stream alive
          console.error('sales stream read failed', e)
        }
      }
      await send()
      timer = setInterval(send, 3000)
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
