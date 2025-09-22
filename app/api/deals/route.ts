import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function addCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  return res;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salesAgentId = searchParams.get('salesAgentId') || searchParams.get('SalesAgentID');
    const salesTeam = searchParams.get('salesTeam') || searchParams.get('team');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 200);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];
    if (salesAgentId) { where.push('`SalesAgentID` = ?'); params.push(salesAgentId); }
    if (salesTeam) { where.push('`sales_team` = ?'); params.push(salesTeam); }
    if (status) { where.push('`status` = ?'); params.push(status); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await query<any>(
      `SELECT * FROM \`deals\` ${whereSql} ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [totals] = await query<any>(`SELECT COUNT(*) as c FROM \`deals\` ${whereSql}`, params);

    return addCorsHeaders(NextResponse.json({
      deals: rows,
      total: totals[0]?.c || 0,
      page,
      limit,
      success: true
    }));
  } catch (error) {
    console.error('Error fetching deals:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to fetch deals' }, { status: 502 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate unique IDs
    const id = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dealId = body.dealId || body.DealID || `D${Date.now()}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Enhanced field mapping for all deal fields
    const [result] = await query<any>(
      `INSERT INTO \`deals\` (
        id, DealID, customer_name, email, phone_number, country, custom_country,
        amount_paid, service_tier, product_type, SalesAgentID, sales_agent, sales_team,
        ClosingAgentID, closing_agent, stage, status, priority, signup_date, end_date, 
        duration_years, duration_months, number_of_users, notes, invoice_link,
        is_ibo_player, is_bob_player, is_iboss, is_ibo_pro, is_smarters, is_above_avg,
        data_month, data_year, end_year, paid_per_day, paid_per_month, paid_rank,
        days_remaining, agent_avg_paid, duration_mean_paid, device_id, device_key,
        sales_agent_norm, closing_agent_norm, created_by_id, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, dealId, 
        body.customerName || body.customer_name, 
        body.email,
        body.phoneNumber || body.phone_number, 
        body.country, 
        body.customCountry || body.custom_country,
        body.amountPaid || body.amount_paid || 0, 
        body.serviceTier || body.service_tier,
        body.productType || body.product_type,
        body.salesAgentId || body.SalesAgentID, 
        body.salesAgentName || body.sales_agent, 
        body.salesTeam || body.sales_team,
        body.closingAgentId || body.ClosingAgentID,
        body.closingAgent || body.closing_agent,
        body.stage || 'prospect', 
        body.status || 'active', 
        body.priority || 'medium',
        body.signupDate || body.signup_date, 
        body.endDate || body.end_date,
        body.durationYears || body.duration_years, 
        body.durationMonths || body.duration_months,
        body.numberOfUsers || body.number_of_users, 
        body.notes,
        body.invoiceLink || body.invoice_link,
        body.isIboPlayer || body.is_ibo_player || false,
        body.isBobPlayer || body.is_bob_player || false,
        body.isIboss || body.is_iboss || false,
        body.isIboPro || body.is_ibo_pro || false,
        body.isSmarters || body.is_smarters || false,
        body.isAboveAvg || body.is_above_avg || false,
        body.dataMonth || body.data_month,
        body.dataYear || body.data_year,
        body.endYear || body.end_year,
        body.paidPerDay || body.paid_per_day,
        body.paidPerMonth || body.paid_per_month,
        body.paidRank || body.paid_rank,
        body.daysRemaining || body.days_remaining,
        body.agentAvgPaid || body.agent_avg_paid,
        body.durationMeanPaid || body.duration_mean_paid,
        body.deviceId || body.device_id,
        body.deviceKey || body.device_key,
        body.salesAgentNorm || body.sales_agent_norm,
        body.closingAgentNorm || body.closing_agent_norm,
        body.createdById || body.created_by_id, 
        body.createdBy || body.created_by, 
        now, now
      ]
    );

    console.log('✅ Deal created successfully:', { id, dealId });
    return addCorsHeaders(NextResponse.json({ success: true, id, dealId }, { status: 201 }));
  } catch (error) {
    console.error('❌ Error creating deal:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to create deal', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 }));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Deal ID is required' }, { status: 400 }));
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const setClauses: string[] = [];
    const params: any[] = [];

    // Comprehensive field mapping for all deal fields
    const fieldMap: Record<string, string> = {
      customerName: 'customer_name', customer_name: 'customer_name',
      phoneNumber: 'phone_number', phone_number: 'phone_number',
      amountPaid: 'amount_paid', amount_paid: 'amount_paid',
      serviceTier: 'service_tier', service_tier: 'service_tier',
      productType: 'product_type', product_type: 'product_type',
      salesAgentId: 'SalesAgentID', SalesAgentID: 'SalesAgentID',
      salesAgentName: 'sales_agent', sales_agent: 'sales_agent',
      salesTeam: 'sales_team', sales_team: 'sales_team',
      closingAgentId: 'ClosingAgentID', ClosingAgentID: 'ClosingAgentID',
      closingAgent: 'closing_agent', closing_agent: 'closing_agent',
      signupDate: 'signup_date', signup_date: 'signup_date',
      endDate: 'end_date', end_date: 'end_date',
      durationYears: 'duration_years', duration_years: 'duration_years',
      durationMonths: 'duration_months', duration_months: 'duration_months',
      numberOfUsers: 'number_of_users', number_of_users: 'number_of_users',
      customCountry: 'custom_country', custom_country: 'custom_country',
      invoiceLink: 'invoice_link', invoice_link: 'invoice_link',
      isIboPlayer: 'is_ibo_player', is_ibo_player: 'is_ibo_player',
      isBobPlayer: 'is_bob_player', is_bob_player: 'is_bob_player',
      isIboss: 'is_iboss', is_iboss: 'is_iboss',
      isIboPro: 'is_ibo_pro', is_ibo_pro: 'is_ibo_pro',
      isSmarters: 'is_smarters', is_smarters: 'is_smarters',
      isAboveAvg: 'is_above_avg', is_above_avg: 'is_above_avg',
      dataMonth: 'data_month', data_month: 'data_month',
      dataYear: 'data_year', data_year: 'data_year',
      endYear: 'end_year', end_year: 'end_year',
      paidPerDay: 'paid_per_day', paid_per_day: 'paid_per_day',
      paidPerMonth: 'paid_per_month', paid_per_month: 'paid_per_month',
      paidRank: 'paid_rank', paid_rank: 'paid_rank',
      daysRemaining: 'days_remaining', days_remaining: 'days_remaining',
      agentAvgPaid: 'agent_avg_paid', agent_avg_paid: 'agent_avg_paid',
      durationMeanPaid: 'duration_mean_paid', duration_mean_paid: 'duration_mean_paid',
      deviceId: 'device_id', device_id: 'device_id',
      deviceKey: 'device_key', device_key: 'device_key',
      salesAgentNorm: 'sales_agent_norm', sales_agent_norm: 'sales_agent_norm',
      closingAgentNorm: 'closing_agent_norm', closing_agent_norm: 'closing_agent_norm',
      dealId: 'DealID', DealID: 'DealID'
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id') return;
      const dbField = fieldMap[key] || key;
      setClauses.push(`\`${dbField}\` = ?`);
      params.push(value);
    });

    if (setClauses.length === 0) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 }));
    }

    setClauses.push('`updated_at` = ?');
    params.push(now, id);

    const [result] = await query<any>(
      `UPDATE \`deals\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
      params
    );

    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('Error updating deal:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to update deal' }, { status: 502 }));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Deal ID is required' }, { status: 400 }));
    }

    const [result] = await query<any>(`DELETE FROM \`deals\` WHERE \`id\` = ?`, [id]);
    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('Error deleting deal:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to delete deal' }, { status: 502 }));
  }
}
