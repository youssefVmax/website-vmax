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
    const salesAgentId = searchParams.get('salesAgentId');
    const userRole = searchParams.get('userRole');
    const userId = searchParams.get('userId');
    const isRead = searchParams.get('isRead');
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 200);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];

    // Role-based data filtering for notifications
    if (userRole === 'salesman' && userId) {
      // Salesmen can only see notifications sent to them
      where.push('(`salesAgentId` = ? OR JSON_CONTAINS(`to`, ?))');
      params.push(userId, `"${userId}"`);
    } else if (userRole === 'team_leader' && userId) {
      // Team leaders see notifications sent to them
      where.push('(`salesAgentId` = ? OR JSON_CONTAINS(`to`, ?))');
      params.push(userId, `"${userId}"`);
    }
    // Managers can see all notifications (no additional filtering)

    // Additional filters
    if (salesAgentId && userRole === 'manager') { 
      where.push('`salesAgentId` = ?'); 
      params.push(salesAgentId); 
    }
    if (userRole && userRole !== 'manager') { 
      where.push('`userRole` = ?'); 
      params.push(userRole); 
    }
    if (isRead !== null) { 
      where.push('`isRead` = ?'); 
      params.push(isRead === 'true' ? 1 : 0); 
    }
    
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await query<any>(
      `SELECT * FROM \`notifications\` ${whereSql} ORDER BY COALESCE(timestamp, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [totals] = await query<any>(`SELECT COUNT(*) as c FROM \`notifications\` ${whereSql}`, params);

    return addCorsHeaders(NextResponse.json({
      notifications: rows,
      total: totals[0]?.c || 0,
      page,
      limit,
      success: true,
      userRole,
      userId
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 502 }));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Generate unique ID
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await query<any>(
      `INSERT INTO \`notifications\` (
        id, title, message, type, \`to\`, \`from\`, salesAgentId, salesAgent,
        customerName, customerPhone, customerEmail, actionRequired, isRead,
        priority, callbackId, callbackStatus, callbackReason, targetId,
        userRole, teamName, isManagerMessage, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, body.title, body.message, body.type || 'info',
        JSON.stringify(body.to || []), body.from, body.salesAgentId, body.salesAgent,
        body.customerName, body.customerPhone, body.customerEmail,
        body.actionRequired || false, body.isRead || false, body.priority || 'medium',
        body.callbackId, body.callbackStatus, body.callbackReason, body.targetId,
        body.userRole, body.teamName, body.isManagerMessage || false, now, now
      ]
    );

    return addCorsHeaders(NextResponse.json({ success: true, id }, { status: 201 }));
  } catch (error) {
    console.error('Error creating notification:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 502 }));
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Notification ID is required' }, { status: 400 }));
    }

    const setClauses: string[] = [];
    const params: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id') return;
      if (key === 'to' && Array.isArray(value)) {
        setClauses.push('`to` = ?');
        params.push(JSON.stringify(value));
      } else {
        setClauses.push(`\`${key}\` = ?`);
        params.push(value);
      }
    });

    if (setClauses.length === 0) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 }));
    }

    params.push(id);

    const [result] = await query<any>(
      `UPDATE \`notifications\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
      params
    );

    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('Error updating notification:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 502 }));
  }
}

