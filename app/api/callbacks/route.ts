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

export async function OPTIONS() {``
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
      `SELECT * FROM \`callbacks\` ${whereSql} ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [totals] = await query<any>(`SELECT COUNT(*) as c FROM \`callbacks\` ${whereSql}`, params);

    return addCorsHeaders(NextResponse.json({
      callbacks: rows,
      total: totals[0]?.c || 0,
      page,
      limit,
      success: true
    }));
  } catch (error) {
    console.error('Error fetching callbacks:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to fetch callbacks' }, { status: 502 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate unique ID
    const id = `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Enhanced field mapping for all callback fields
    const [result] = await query<any>(
      `INSERT INTO \`callbacks\` (
        id, customer_name, phone_number, email, SalesAgentID, sales_agent, sales_team,
        status, priority, callback_reason, callback_notes, scheduled_date, scheduled_time,
        first_call_date, first_call_time, follow_up_required, created_by_id, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        body.customerName || body.customer_name, 
        body.phoneNumber || body.phone_number, 
        body.email,
        body.salesAgentId || body.SalesAgentID, 
        body.salesAgentName || body.sales_agent, 
        body.salesTeam || body.sales_team,
        body.status || 'pending', 
        body.priority || 'medium', 
        body.callbackReason || body.callback_reason, 
        body.callbackNotes || body.callback_notes,
        body.scheduledDate || body.scheduled_date, 
        body.scheduledTime || body.scheduled_time,
        body.firstCallDate || body.first_call_date, 
        body.firstCallTime || body.first_call_time,
        body.followUpRequired || body.follow_up_required || false,
        body.createdById || body.created_by_id, 
        body.createdBy || body.created_by, 
        now, now
      ]
    );

    console.log('✅ Callback created successfully:', { id });
    return addCorsHeaders(NextResponse.json({ success: true, id }, { status: 201 }));
  } catch (error) {
    console.error('❌ Error creating callback:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to create callback', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 }));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Callback ID is required' }, { status: 400 }));
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const setClauses: string[] = [];
    const params: any[] = [];

    // Map common fields
    const fieldMap: Record<string, string> = {
      customerName: 'customer_name', customer_name: 'customer_name',
      phoneNumber: 'phone_number', phone_number: 'phone_number',
      salesAgentId: 'SalesAgentID', SalesAgentID: 'SalesAgentID',
      salesAgentName: 'sales_agent', sales_agent: 'sales_agent',
      salesTeam: 'sales_team', sales_team: 'sales_team',
      callbackReason: 'callback_reason', callback_reason: 'callback_reason',
      callbackNotes: 'callback_notes', callback_notes: 'callback_notes',
      scheduledDate: 'scheduled_date', scheduled_date: 'scheduled_date',
      scheduledTime: 'scheduled_time', scheduled_time: 'scheduled_time',
      firstCallDate: 'first_call_date', first_call_date: 'first_call_date',
      firstCallTime: 'first_call_time', first_call_time: 'first_call_time',
      followUpRequired: 'follow_up_required', follow_up_required: 'follow_up_required'
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
      `UPDATE \`callbacks\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
      params
    );

    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('Error updating callback:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to update callback' }, { status: 502 }));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Callback ID is required' }, { status: 400 }));
    }

    const [result] = await query<any>(`DELETE FROM \`callbacks\` WHERE \`id\` = ?`, [id]);
    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('Error deleting callback:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to delete callback' }, { status: 502 }));
  }
}
