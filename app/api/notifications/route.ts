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
    console.log('🔍 GET /api/notifications - Starting request processing');
    
    // Add headers to prevent caching issues
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    const { searchParams } = new URL(request.url);
    const salesAgentId = searchParams.get('salesAgentId');
    let userRole = searchParams.get('userRole');
    const userId = searchParams.get('userId');
    const isRead = searchParams.get('isRead');
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 200);
    const offset = (page - 1) * limit;

    console.log('📊 Request params:', { salesAgentId, userRole, userId, isRead, page, limit });

    const where: string[] = [];
    const params: any[] = [];

    // Role-based data filtering for notifications
    if (userRole === 'salesman' && userId) {
      // Salesmen can only see notifications sent to them
      where.push('(`salesAgentId` = ? OR JSON_CONTAINS(`to`, ?))');
      params.push(userId, `"${userId}"`);
    } else if ((userRole === 'team_leader' || userRole === 'team_leader') && userId) {
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

    let rows: any[] = [];
    let totals: any[] = [];
    
    try {
      // Build the complete SQL query with proper parameter handling
      const baseSql = `SELECT * FROM notifications ${whereSql} ORDER BY COALESCE(timestamp, created_at) DESC, id DESC`;
      const countSql = `SELECT COUNT(*) as c FROM notifications ${whereSql}`;
      
      // For pagination, we need to append LIMIT and OFFSET to the query string
      // since MySQL has issues with prepared statements for LIMIT/OFFSET
      const paginatedSql = `${baseSql} LIMIT ${limit} OFFSET ${offset}`;
      
      console.log('📝 Executing query:', paginatedSql);
      console.log('📝 With params:', params);
      
      const [rowsResult] = await query<any>(paginatedSql, params);
      rows = rowsResult || [];
      
      const [totalsResult] = await query<any>(countSql, params);
      totals = totalsResult || [{ c: 0 }];
    } catch (queryError) {
      console.error('❌ Query error:', queryError);
      // Return empty results instead of failing
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
    console.error('Full error details:', JSON.stringify(error, null, 2));
    return addCorsHeaders(NextResponse.json({ 
      notifications: [],
      total: 0,
      page: 1,
      limit: 25,
      success: true,
      error: 'Failed to fetch notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 })); // Return 200 with empty data instead of 502 error
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📨 POST /api/notifications - Received body:', body);

    // Generate unique ID
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');


    // Prepare the data for insertion - ensure all required fields are present in table order
    const insertData = [
      id, // 1. id
      body.message || '', // 2. message
      body.customerName || null, // 3. customerName
      JSON.stringify(body.to || []), // 4. `to` (JSON)
      body.actionRequired !== undefined ? (body.actionRequired ? 1 : 0) : null, // 5. actionRequired (TINYINT)
      body.isRead !== undefined ? (body.isRead ? 1 : 0) : null, // 6. isRead (TINYINT)
      now, // 7. timestamp
      body.salesAgent || '', // 8. salesAgent
      body.title || '', // 9. title
      now, // 10. created_at
      body.type || 'info', // 11. type
      body.callbackId || null, // 12. callbackId
      body.salesAgentId || '', // 13. salesAgentId
      body.callbackStatus || null, // 14. callbackStatus
      body.priority || 'medium', // 15. priority
      body.from || 'System', // 16. `from`
      body.customerPhone || null, // 17. customerPhone
      body.customerEmail || null, // 18. customerEmail
      body.callbackReason || null, // 19. callbackReason
      body.fromAvatar || null, // 20. fromAvatar
      body.scheduledDate || null, // 21. scheduledDate
      body.teamName || null, // 22. teamName
      body.scheduledTime || null, // 23. scheduledTime
      body.isManagerMessage !== undefined ? (body.isManagerMessage ? 1 : 0) : null, // 24. isManagerMessage (TINYINT)
      body.targetId || null, // 25. targetId
      body.userRole || null  // 26. userRole
    ];

    console.log('💾 Insert data:', insertData);

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

    console.log('✅ Notification created successfully:', result);
    return addCorsHeaders(NextResponse.json({ success: true, id }, { status: 201 }));
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
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
        // Convert boolean to TINYINT for these fields
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

