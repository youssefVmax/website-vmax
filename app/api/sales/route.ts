import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import Papa from 'papaparse';

// Ensure this route runs in the Node.js runtime (fs is not available on Edge)
export const runtime = 'nodejs';
// Disable static optimization/caching to always read the latest CSV on each request
export const dynamic = 'force-dynamic';

export interface Sale {
  date: string;
  customer_name: string;
  amount: number;
  sales_agent: string;
  closing_agent: string;
  team: string;
  type_service: string;
  sales_agent_norm: string;
  closing_agent_norm: string;
  SalesAgentID: string;
  ClosingAgentID: string;
  DealID: string;
}

export async function POST(req: Request) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'aug-ids-new.csv');

    // Ensure file exists
    try {
      await fs.access(filePath);
    } catch (e) {
      return NextResponse.json(
        { error: `Data file not found at ${filePath}` },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Server-side validation: required fields and numeric amount
    const errors: string[] = [];
    const customerName = (body.customer_name ?? body.customer ?? '').toString().trim();
    const dealId = (body.DealID ?? '').toString().trim();
    const amountNum: number = typeof body.amount === 'number' ? body.amount : parseFloat(String(body.amount || body.amount_paid || body.AMOUNT));
    if (!customerName) errors.push('customer_name is required');
    if (!dealId) errors.push('DealID is required');
    if (!Number.isFinite(amountNum)) errors.push('amount must be a valid number');
    if (errors.length) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }
    const dateStr: string = body.date || new Date().toISOString().split('T')[0];
    // amountNum computed above
    const durationLabel: string = String(body.duration || '').toUpperCase();
    const durationMonths = (() => {
      if (durationLabel.includes('TWO YEAR') || durationLabel.includes('2Y')) return 24;
      if (durationLabel.includes('YEAR')) return 12;
      const m = parseInt(String(body.duration_months || 12));
      return Number.isFinite(m) && m > 0 ? m : 12;
    })();
    const dataMonth = (() => {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', { month: 'long' });
    })();
    const dataYear = (() => {
      const d = new Date(dateStr);
      return d.getFullYear();
    })();

    const program: string = String(body.type_program || 'IBO PLAYER').toUpperCase();
    const serviceTier: string = String(body.type_service || 'SLIVER').toUpperCase();

    const is_ibo_player = program.includes('IBO PLAYER');
    const is_bob_player = program.includes('BOB');
    const is_smarters = program.includes('SMARTERS');
    const is_ibo_pro = program.includes('IBO PRO');

    const paid_per_month = durationMonths > 0 ? amountNum / durationMonths : amountNum;

    const newRow = {
      signup_date: dateStr,
      end_date: '',
      customer_name: customerName,
      email: body.email || '',
      phone_number: body.phone || '',
      country: body.country || '',
      amount_paid: amountNum,
      paid_per_month,
      duration_months: durationMonths,
      sales_agent: (body.sales_agent || '').toString(),
      closing_agent: (body.closing_agent || '').toString(),
      sales_team: body.team || '',
      product_type: (body.type_program || '').toString().toUpperCase(),
      service_tier: (body.type_service || '').toString().toUpperCase(),
      data_month: dataMonth,
      data_year: dataYear,
      invoice_link: body.invoice || '',
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
      sales_agent_norm: (body.sales_agent_norm || (body.sales_agent || '')).toString().toLowerCase(),
      closing_agent_norm: (body.closing_agent_norm || (body.closing_agent || '')).toString().toLowerCase(),
      SalesAgentID: (body.SalesAgentID || '').toString(),
      ClosingAgentID: (body.ClosingAgentID || '').toString(),
      DealID: dealId,
    } as any;

    // Read, parse existing CSV
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
    const rows = (parsed.data as any[]) || [];
    rows.push(newRow);

    // Unparse and write back
    const csv = Papa.unparse(rows, { header: true });
    await fs.writeFile(filePath, csv, 'utf-8');

    return NextResponse.json({ success: true, row: newRow }, { status: 201 });
  } catch (error) {
    console.error('Error appending sale:', error);
    return NextResponse.json(
      { error: 'Failed to append sale.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'aug-ids-new.csv');

    // Verify file exists and is readable
    try {
      await fs.access(filePath);
    } catch (e) {
      return NextResponse.json(
        { error: `Data file not found at ${filePath}` },
        { status: 404 }
      );
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Parse CSV safely with headers and quoting support
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors && parsed.errors.length > 0) {
      console.error('CSV parse errors:', parsed.errors.slice(0, 3));
    }

    const sales: Sale[] = (parsed.data as any[]).map((row) => {
      // Map new CSV headers to Sale interface
      const date = (row.signup_date ?? row.date ?? '').toString();
      const customer_name = (row.customer_name ?? row.customer ?? '').toString();
      const amountRaw = row.amount_paid ?? row.amount ?? row.AMOUNT;
      const amount = typeof amountRaw === 'number' ? amountRaw : parseFloat(String(amountRaw)) || 0;
      const sales_agent = (row.sales_agent ?? row.SalesAgent ?? '').toString();
      const closing_agent = (row.closing_agent ?? row.ClosingAgent ?? '').toString();
      const team = (row.sales_team ?? row.team ?? '').toString();
      const type_service = (row.service_tier ?? row.product_type ?? row.type_service ?? '').toString();
      const sales_agent_norm = (row.sales_agent_norm ?? '').toString();
      const closing_agent_norm = (row.closing_agent_norm ?? '').toString();
      const SalesAgentID = (row.SalesAgentID ?? '').toString();
      const ClosingAgentID = (row.ClosingAgentID ?? '').toString();
      const DealID = (row.DealID ?? '').toString();

      return {
        date,
        customer_name,
        amount,
        sales_agent,
        closing_agent,
        team,
        type_service,
        sales_agent_norm,
        closing_agent_norm,
        SalesAgentID,
        ClosingAgentID,
        DealID,
      } as Sale;
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error loading sales data:', error);
    return NextResponse.json(
      { error: 'Failed to load sales data. Please make sure the data file exists and is valid CSV.' },
      { status: 500 }
    );
  }
}

