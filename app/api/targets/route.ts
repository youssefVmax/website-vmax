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
    const agentId = searchParams.get('agentId');
    const managerId = searchParams.get('managerId');
    const period = searchParams.get('period');
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 200);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];
    if (agentId) { where.push('`agentId` = ?'); params.push(agentId); }
    if (managerId) { where.push('`managerId` = ?'); params.push(managerId); }
    if (period) { where.push('`period` = ?'); params.push(period); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await query<any>(
      `SELECT * FROM \`targets\` ${whereSql} ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [totals] = await query<any>(`SELECT COUNT(*) as c FROM \`targets\` ${whereSql}`, params);

    return addCorsHeaders(NextResponse.json({
      targets: rows,
      total: totals[0]?.c || 0,
      page,
      limit,
      success: true
    }));
  } catch (error) {
    console.error('Error fetching targets:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to fetch targets' }, { status: 502 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate unique ID
    const id = `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await query<any>(
      `INSERT INTO \`targets\` (
        id, agentId, agentName, managerId, managerName, monthlyTarget, dealsTarget,
        period, type, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, body.agentId, body.agentName, body.managerId, body.managerName,
        body.monthlyTarget || 0, body.dealsTarget || 0, body.period,
        body.type || 'sales', body.description, now, now
      ]
    );

    return addCorsHeaders(NextResponse.json({ success: true, id }, { status: 201 }));
  } catch (error) {
    console.error('Error creating target:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to create target' }, { status: 502 }));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Target ID is required' }, { status: 400 }));
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const setClauses: string[] = [];
    const params: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id') return;
      setClauses.push(`\`${key}\` = ?`);
      params.push(value);
    });

    if (setClauses.length === 0) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 }));
    }

    setClauses.push('`updated_at` = ?');
    params.push(now, id);

    const [result] = await query<any>(
      `UPDATE \`targets\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
      params
    );

    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('Error updating target:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to update target' }, { status: 502 }));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Target ID is required' }, { status: 400 }));
    }

    const [result] = await query<any>(`DELETE FROM \`targets\` WHERE \`id\` = ?`, [id]);
    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('Error deleting target:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to delete target' }, { status: 502 }));
  }
}
