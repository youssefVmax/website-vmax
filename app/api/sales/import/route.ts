import { promises as fs } from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sanitizeRow(row: any) {
  const errors: string[] = []
  const customer_name = (row.customer_name ?? row.customer ?? '').toString().trim()
  const DealID = (row.DealID ?? '').toString().trim()
  const amtRaw = row.amount ?? row.amount_paid ?? row.AMOUNT
  const amount = typeof amtRaw === 'number' ? amtRaw : parseFloat(String(amtRaw))
  if (!customer_name) errors.push('customer_name is required')
  if (!DealID) errors.push('DealID is required')
  if (!Number.isFinite(amount)) errors.push('amount must be a valid number')
  if (errors.length) return { ok: false, errors }

  const date = (row.date ?? row.signup_date ?? new Date().toISOString().split('T')[0]).toString()
  const durationLabel: string = String(row.duration || '').toUpperCase()
  const duration_months = (() => {
    if (durationLabel.includes('TWO YEAR') || durationLabel.includes('2Y')) return 24
    if (durationLabel.includes('YEAR')) return 12
    const m = parseInt(String(row.duration_months || 12))
    return Number.isFinite(m) && m > 0 ? m : 12
  })()
  const d = new Date(date)
  const data_month = d.toLocaleString('en-US', { month: 'long' })
  const data_year = d.getFullYear()

  const program = (row.type_program || row.product_type || '').toString().toUpperCase()
  const service_tier = (row.type_service || row.service_tier || '').toString().toUpperCase()

  const is_ibo_player = program.includes('IBO PLAYER')
  const is_bob_player = program.includes('BOB')
  const is_smarters = program.includes('SMARTERS')
  const is_ibo_pro = program.includes('IBO PRO')

  const paid_per_month = duration_months > 0 ? amount / duration_months : amount

  // Return normalized CSV row headers
  return {
    ok: true,
    row: {
      signup_date: date,
      end_date: '',
      customer_name,
      email: row.email || '',
      phone_number: row.phone || row.phone_number || '',
      country: row.country || '',
      amount_paid: amount,
      paid_per_month,
      duration_months,
      sales_agent: (row.sales_agent || '').toString(),
      closing_agent: (row.closing_agent || '').toString(),
      sales_team: row.team || row.sales_team || '',
      product_type: program,
      service_tier,
      data_month,
      data_year,
      invoice_link: row.invoice || row.invoice_link || '',
      is_ibo_player,
      is_bob_player,
      is_smarters,
      is_ibo_pro,
      days_remaining: '',
      paid_per_day: '',
      duration_mean_paid: '',
      agent_avg_paid: '',
      is_above_avg: '',
      paid_rank: '',
      end_year: '',
      sales_agent_norm: (row.sales_agent_norm || row.sales_agent || '').toString().toLowerCase(),
      closing_agent_norm: (row.closing_agent_norm || row.closing_agent || '').toString().toLowerCase(),
      SalesAgentID: (row.SalesAgentID || '').toString(),
      ClosingAgentID: (row.ClosingAgentID || '').toString(),
      DealID,
    }
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('text/csv') && !contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Send CSV as text/csv or multipart/form-data with a file field named "file"' }, { status: 400 })
    }

    let csvText = ''
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
      csvText = await file.text()
    } else {
      csvText = await req.text()
    }

    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
    const incoming = (parsed.data as any[]) || []

    // Validate and normalize rows
    const normalized: any[] = []
    const errors: Array<{ index: number; errors: string[] }> = []
    incoming.forEach((r, idx) => {
      const res = sanitizeRow(r)
      if ((res as any).ok) normalized.push((res as any).row)
      else errors.push({ index: idx, errors: (res as any).errors })
    })

    if (!normalized.length) {
      return NextResponse.json({ error: 'No valid rows to import', details: errors }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), 'public', 'data', 'aug-ids-new.csv')
    await fs.access(filePath)
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const current = Papa.parse(fileContent, { header: true, skipEmptyLines: true })
    const rows = (current.data as any[]) || []

    // Append normalized rows
    rows.push(...normalized)
    const csvOut = Papa.unparse(rows, { header: true })
    await fs.writeFile(filePath, csvOut, 'utf-8')

    return NextResponse.json({ imported: normalized.length, rejected: errors.length, errors }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to import CSV' }, { status: 500 })
  }
}
