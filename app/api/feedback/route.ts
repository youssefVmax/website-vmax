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
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const status = searchParams.get('status');
    const feedbackType = searchParams.get('feedbackType');
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 200);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];

    // Role-based filtering
    if (userRole === 'salesman' && userId) {
      // Salesmen can only see their own feedback
      where.push('`user_id` = ?');
      params.push(userId);
    } else if (userRole === 'team_leader') {
      // Team leaders can see their own feedback and their team's feedback
      if (userId) {
        where.push('(`user_id` = ? OR `user_id` IN (SELECT `id` FROM `users` WHERE `managedTeam` = (SELECT `managedTeam` FROM `users` WHERE `id` = ?)))');
        params.push(userId, userId);
      }
    }
    // Managers can see all feedback (no additional filtering)

    if (status) { where.push('`status` = ?'); params.push(status); }
    if (feedbackType) { where.push('`feedback_type` = ?'); params.push(feedbackType); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Build the complete SQL query with proper parameter handling
    const baseSql = `SELECT * FROM feedback ${whereSql} ORDER BY created_at DESC`;
    const countSql = `SELECT COUNT(*) as c FROM feedback ${whereSql}`;
    
    // For pagination, we need to append LIMIT and OFFSET to the query string
    // since MySQL has issues with prepared statements for LIMIT/OFFSET
    const paginatedSql = `${baseSql} LIMIT ${limit} OFFSET ${offset}`;
    
    const [rows] = await query<any>(paginatedSql, params);
    const [totals] = await query<any>(countSql, params);

    return addCorsHeaders(NextResponse.json({
      feedback: rows,
      total: totals[0]?.c || 0,
      page,
      limit,
      success: true
    }));
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to fetch feedback' }, { status: 502 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate unique ID
    const id = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await query<any>(
      `INSERT INTO  feedback  (
        id, user_id, user_name, user_role, feedback_type, subject, message, 
        priority, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.userId || body.user_id,
        body.userName || body.user_name,
        body.userRole || body.user_role,
        body.feedbackType || body.feedback_type || 'general',
        body.subject,
        body.message,
        body.priority || 'medium',
        'pending',
        now, now
      ]
    );

    console.log('✅ Feedback created successfully:', { id });

    // Create notification for managers about new feedback
    try {
      const notificationId = `feedback-${id}-${Date.now()}`;
      await query(`
        INSERT INTO notifications (
          id, title, message, type, priority, \`from\`, \`to\`, 
          timestamp, isRead, salesAgentId, userRole, 
          customerName, isManagerMessage, actionRequired, teamName
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        notificationId,
        '💬 New Feedback Received!',
        `${body.feedbackType || body.feedback_type || 'General'} feedback: "${body.subject}" from ${body.userName || body.user_name || 'user'}`,
        'warning',
        body.priority === 'high' ? 'high' : 'medium',
        body.userName || body.user_name || 'User',
        JSON.stringify(['ALL', 'manager', 'team_leader']),
        now,
        0,
        body.userId || body.user_id || 'unknown',
        'manager',
        body.userName || body.user_name || 'User',
        false,
        body.priority === 'high',
        body.userTeam || body.user_team || 'Unknown Team'
      ]);
      console.log('✅ Feedback notification created successfully');
    } catch (notificationError) {
      console.error('❌ Failed to create feedback notification:', notificationError);
      // Don't fail the feedback creation if notification fails
    }

    return addCorsHeaders(NextResponse.json({ success: true, id }, { status: 201 }));
  } catch (error) {
    console.error('❌ Error creating feedback:', error);
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Failed to create feedback', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 502 }));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Feedback ID is required' }, { status: 400 }));
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const setClauses: string[] = [];
    const params: any[] = [];

    // Map common fields
    const fieldMap: Record<string, string> = {
      feedbackType: 'feedback_type', feedback_type: 'feedback_type',
      userName: 'user_name', user_name: 'user_name',
      userRole: 'user_role', user_role: 'user_role',
      assignedTo: 'assigned_to', assigned_to: 'assigned_to',
      responseBy: 'response_by', response_by: 'response_by',
      responseAt: 'response_at', response_at: 'response_at'
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id') return;
      const dbField = fieldMap[key] || key;
      setClauses.push(` ${dbField}  = ?`);
      params.push(value);
    });

    if (setClauses.length === 0) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 }));
    }

    setClauses.push('`updated_at` = ?');
    params.push(now, id);

    const [result] = await query<any>(
      `UPDATE  feedback  SET ${setClauses.join(', ')} WHERE  id  = ?`,
      params
    );

    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('Error updating feedback:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to update feedback' }, { status: 502 }));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Feedback ID is required' }, { status: 400 }));
    }

    const [result] = await query<any>(`DELETE FROM  feedback  WHERE  id  = ?`, [id]);
    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to delete feedback' }, { status: 502 }));
  }
}
