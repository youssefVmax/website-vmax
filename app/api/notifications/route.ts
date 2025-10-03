import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    let userRole = searchParams.get('userRole');
    const userId = searchParams.get('userId');
    const isRead = searchParams.get('isRead');
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 200);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];

    // Role-based data filtering for notifications
    if (userRole === 'salesman' && userId) {
      // Salesmen can see notifications sent to them OR created by them
      // Check multiple ways the user might be in the "to" field
      where.push('(`salesAgentId` = ? OR JSON_CONTAINS(`to`, ?) OR JSON_CONTAINS(`to`, ?) OR JSON_CONTAINS(`to`, ?) OR `from` = ?)');
      params.push(userId, `"${userId}"`, `"all"`, `"ALL"`, userId);
    } else if (userRole === 'team_leader' && userId) {
      // Team leaders see notifications sent to them OR created by them
      where.push('(`salesAgentId` = ? OR JSON_CONTAINS(`to`, ?) OR JSON_CONTAINS(`to`, ?) OR JSON_CONTAINS(`to`, ?) OR `from` = ?)');
      params.push(userId, `"${userId}"`, `"all"`, `"ALL"`, userId);
    }
    // DO NOT filter by userRole for salesmen - this was preventing them from seeing manager notifications
    // Managers can see all notifications (no additional filtering)

    // Additional filters
    if (salesAgentId && userRole === 'manager') { 
      where.push('`salesAgentId` = ?'); 
      params.push(salesAgentId); 
    }
    if (isRead !== null) { 
      where.push('`isRead` = ?'); 
      params.push(isRead === 'true' ? 1 : 0); 
    }
    
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    let rows: any[] = [];
    let totals: any[] = [];
    
    try {
      // Build the complete SQL query with proper parameter handling
      const baseSql = `SELECT * FROM notifications ${whereSql} ORDER BY COALESCE(timestamp, created_at) DESC, id DESC`;
      const countSql = `SELECT COUNT(*) as c FROM notifications ${whereSql}`;
      const paginatedSql = `${baseSql} LIMIT ${limit} OFFSET ${offset}`;
      const [rowsResult] = await query<any>(paginatedSql, params);
      rows = rowsResult || [];
      
      const [totalsResult] = await query<any>(countSql, params);
      totals = totalsResult || [{ c: 0 }];
      
    } catch (queryError) {
      console.error('❌ Query error:', queryError);
      rows = [];
      totals = [{ c: 0 }];
    }
    
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
    console.error('❌ Error fetching notifications:', error);
    return addCorsHeaders(NextResponse.json({ 
      notifications: [],
      total: 0,
      page: 1,
      limit: 25,
      success: true,
      error: 'Failed to fetch notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 }));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Generate unique ID
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Prepare the data for insertion - ensure all required fields are present in table order
    const insertData = [
      id,
      body.message || '',
      body.customerName || null,
      JSON.stringify(body.to || []),
      body.actionRequired !== undefined ? (body.actionRequired ? 1 : 0) : null,
      body.isRead !== undefined ? (body.isRead ? 1 : 0) : null,
      now,
      body.salesAgent || '',
      body.title || '',
      now,
      body.type || 'info',
      body.callbackId || null,
      body.salesAgentId || '',
      body.callbackStatus || null,
      body.priority || 'medium',
      body.from || 'System',
      body.customerPhone || null,
      body.customerEmail || null,
      body.callbackReason || null,
      body.fromAvatar || null,
      body.scheduledDate || null,
      body.teamName || null,
      body.scheduledTime || null,
      body.isManagerMessage !== undefined ? (body.isManagerMessage ? 1 : 0) : null,
      body.targetId || null,
      body.userRole || null
    ];

    const [result] = await query<any>(
      `INSERT INTO notifications (
        id, message, customerName, \`to\`, actionRequired, isRead, timestamp,
        salesAgent, title, created_at, type, callbackId, salesAgentId,
        callbackStatus, priority, \`from\`, customerPhone, customerEmail,
        callbackReason, fromAvatar, scheduledDate, teamName, scheduledTime,
        isManagerMessage, targetId, userRole
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      insertData
    );

    return addCorsHeaders(NextResponse.json({ success: true, id }, { status: 201 }));
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'Failed to create notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 502 }));
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
        setClauses.push('\`to\` = ?');
        params.push(JSON.stringify(value));
      } else if (key === 'actionRequired' || key === 'isRead' || key === 'isManagerMessage') {
        setClauses.push(`\`${key}\` = ?`);
        params.push(value ? 1 : 0);
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
      `UPDATE notifications SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('Error updating notification:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 502 }));
  }
}
