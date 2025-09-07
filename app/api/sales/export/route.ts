import { promises as fs } from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || undefined
    const role = searchParams.get('role') || undefined

    const filePath = path.join(process.cwd(), 'public', 'data', 'aug-ids-new.csv')
    await fs.access(filePath)
    const fileContent = await fs.readFile(filePath, 'utf-8')

    const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true })
    let rows: any[] = (parsed.data as any[]) || []

    // Optional filter by role/userId
    if (userId && role) {
      if (role === 'salesman') {
        rows = rows.filter(r => r.SalesAgentID === userId || r.sales_agent_norm === userId)
      } else if (role === 'customer-service') {
        rows = rows.filter(r => r.ClosingAgentID === userId || r.closing_agent_norm === userId)
      }
    }

    const csv = Papa.unparse(rows, { header: true })

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sales-export.csv"',
        'Cache-Control': 'no-cache',
      },
      status: 200,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to export CSV' }, { status: 500 })
  }
}
