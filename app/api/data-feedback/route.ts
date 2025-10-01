import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Add CORS headers to response
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

// Data Feedback API - Manages feedback for data center entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataId = searchParams.get('data_id');
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('user_role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log('🔍 Data Feedback API - GET:', { dataId, userId, userRole, page, limit });

    if (!dataId) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameter: data_id'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Test database connection
    try {
      await query('SELECT 1 as test');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      const response = NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 503 });
      return addCorsHeaders(response);
    }

    const offset = (page - 1) * limit;

    // Get feedback for the specific data entry
    const feedbackQuery = `
      SELECT 
        f.*,
        f.user_id as user_name,
        f.user_id as user_username,
        'user' as user_role
      FROM data_feedback f
      WHERE f.data_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM data_feedback WHERE data_id = ?';

    console.log('🔍 Executing feedback query:', feedbackQuery, [dataId, limit, offset]);

    // Execute queries with proper tuple destructuring and graceful handling
    let feedbackRows: any[] = [];
    let countRows: any[] = [{ total: 0 }];
    try {
      const [[qRows], [qCount]] = await Promise.all([
        query<any>(feedbackQuery, [dataId, limit, offset]),
        query<any>(countQuery, [dataId])
      ]);
      feedbackRows = qRows as any[];
      countRows = qCount as any[];
    } catch (e: any) {
      const msg = (e && (e.code || e.message || '')) as string;
      const isMissingTable = msg.includes('ER_NO_SUCH_TABLE') || msg.toLowerCase().includes("doesn't exist") || msg.toLowerCase().includes('does not exist');
      if (isMissingTable) {
        console.warn('⚠️ data_feedback or data_center table missing. Returning empty feedback.');
        feedbackRows = [];
        countRows = [{ total: 0 } as any];
      } else {
        throw e;
      }
    }

    const total = (countRows as any)[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Format the feedback data
    const formattedFeedback = feedbackRows.map((item: any) => ({
      ...item,
      created_at: item.created_at ? new Date(item.created_at).toISOString() : null,
      updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null
    }));

    const response = NextResponse.json({
      success: true,
      data: formattedFeedback,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Data Feedback API Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// Handle POST requests for creating feedback (salesman and team leaders)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      data_id, 
      user_id, 
      user_role,
      feedback_text, 
      rating,
      feedback_type 
    } = body;

    console.log('🔄 Data Feedback API - POST:', body);

    // Only salesman and team leaders can provide feedback
    if (!['salesman', 'team_leader'].includes(user_role)) {
      const response = NextResponse.json({
        success: false,
        error: 'Only salesmen and team leaders can provide feedback'
      }, { status: 403 });
      return addCorsHeaders(response);
    }

    if (!data_id || !user_id || !feedback_text) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required fields: data_id, user_id, feedback_text'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Check if the data entry exists and user has access to it
    const dataCheckQuery = `
      SELECT * FROM data_center 
      WHERE id = ? AND (sent_to_id = ? OR sent_to_team IN ('ALI ASHRAF', 'CS TEAM', 'SALES', 'SUPPORT'))
    `;
    
    let dataExists: any[] = [];
    try {
      const [rows] = await query<any>(dataCheckQuery, [data_id, user_id]);
      dataExists = rows as any[];
    } catch (e: any) {
      const msg = (e && (e.code || e.message || '')) as string;
      const isMissingTable = msg.includes('ER_NO_SUCH_TABLE') || msg.toLowerCase().includes("doesn't exist") || msg.toLowerCase().includes('does not exist');
      if (isMissingTable) {
        return addCorsHeaders(NextResponse.json({
          success: false,
          error: 'Data Center is not initialized yet.'
        }, { status: 400 }));
      }
      throw e;
    }

    if (!Array.isArray(dataExists) || dataExists.length === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'Data not found or you do not have access to provide feedback'
      }, { status: 404 });
      return addCorsHeaders(response);
    }

    // Generate unique feedback ID
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const insertQuery = `
      INSERT INTO data_feedback (
        id, data_id, user_id, feedback_text, rating, 
        feedback_type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
    `;

    const params = [
      feedbackId,
      data_id,
      user_id,
      feedback_text,
      rating || null,
      feedback_type || 'general'
    ];

    console.log('🔄 Executing feedback insert:', insertQuery, params);

    await query(insertQuery, params);

    // Update the data entry's updated_at timestamp
    await query('UPDATE data_center SET updated_at = NOW() WHERE id = ?', [data_id]);

    const response = NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback_id: feedbackId
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Data Feedback POST Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// Handle PUT requests for updating feedback
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get('feedback_id');
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('user_role');
    
    const body = await request.json();
    
    console.log('🔄 Data Feedback API - PUT:', { feedbackId, userId, userRole, body });

    if (!feedbackId || !userId) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameters: feedback_id, user_id'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Check if user owns this feedback or is a manager
    const checkQuery = `
      SELECT * FROM data_feedback 
      WHERE id = ? AND (user_id = ? OR ? = 'manager')
    `;
    
    const existingFeedback: any[] = await query<any>(checkQuery, [feedbackId, userId, userRole]);
    
    if (!Array.isArray(existingFeedback) || existingFeedback.length === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'Feedback not found or you do not have permission to update it'
      }, { status: 404 });
      return addCorsHeaders(response);
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (body.feedback_text) {
      updates.push('feedback_text = ?');
      params.push(body.feedback_text);
    }
    if (body.rating !== undefined) {
      updates.push('rating = ?');
      params.push(body.rating);
    }
    if (body.feedback_type) {
      updates.push('feedback_type = ?');
      params.push(body.feedback_type);
    }
    if (body.status) {
      updates.push('status = ?');
      params.push(body.status);
    }

    if (updates.length === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'No valid fields to update'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    updates.push('updated_at = NOW()');
    params.push(feedbackId);

    const updateQuery = `UPDATE data_feedback SET ${updates.join(', ')} WHERE id = ?`;
    
    console.log('🔄 Executing feedback update:', updateQuery, params);

    const result = await query(updateQuery, params);
    
    if ((result as any).affectedRows === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'No rows updated'
      }, { status: 404 });
      return addCorsHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Feedback updated successfully'
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Data Feedback PUT Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// Handle DELETE requests for removing feedback
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get('feedback_id');
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('user_role');

    console.log('🔄 Data Feedback API - DELETE:', { feedbackId, userId, userRole });

    if (!feedbackId || !userId) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameters: feedback_id, user_id'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Users can only delete their own feedback, managers can delete any
    const deleteQuery = `
      DELETE FROM data_feedback 
      WHERE id = ? AND (user_id = ? OR ? = 'manager')
    `;
    
    const result = await query(deleteQuery, [feedbackId, userId, userRole]);
    
    if ((result as any).affectedRows === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'Feedback not found or you do not have permission to delete it'
      }, { status: 404 });
      return addCorsHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Feedback deleted successfully'
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Data Feedback DELETE Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
