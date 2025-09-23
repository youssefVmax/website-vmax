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

// Data Center API - Manages data sharing and feedback between managers and team members
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('user_role');
    const dataType = searchParams.get('data_type') || 'all'; // 'all', 'sent', 'received'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log('🔍 Data Center API - GET:', { userId, userRole, dataType, page, limit });

    if (!userId || !userRole) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameters: user_id and user_role'
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
    let dataQuery = '';
    let countQuery = '';
    let params: any[] = [];
    let countParams: any[] = [];

    // Build query based on user role and data type
    if (userRole === 'manager') {
      if (dataType === 'sent') {
        // Manager viewing data they sent
        dataQuery = `
          SELECT 
            d.*,
            u1.name as sent_to_name,
            u1.username as sent_to_username,
            u2.name as sent_by_name,
            (SELECT COUNT(*) FROM data_feedback df WHERE df.data_id = d.id) as feedback_count
          FROM data_center d
          LEFT JOIN users u1 ON d.sent_to_id = u1.id
          LEFT JOIN users u2 ON d.sent_by_id = u2.id
          WHERE d.sent_by_id = ?
          ORDER BY d.created_at DESC
          LIMIT ? OFFSET ?
        `;
        countQuery = 'SELECT COUNT(*) as total FROM data_center WHERE sent_by_id = ?';
        params = [userId, limit, offset];
        countParams = [userId];
      } else {
        // Manager viewing all data
        dataQuery = `
          SELECT 
            d.*,
            u1.name as sent_to_name,
            u1.username as sent_to_username,
            u2.name as sent_by_name,
            (SELECT COUNT(*) FROM data_feedback df WHERE df.data_id = d.id) as feedback_count
          FROM data_center d
          LEFT JOIN users u1 ON d.sent_to_id = u1.id
          LEFT JOIN users u2 ON d.sent_by_id = u2.id
          ORDER BY d.created_at DESC
          LIMIT ? OFFSET ?
        `;
        countQuery = 'SELECT COUNT(*) as total FROM data_center';
        params = [limit, offset];
        countParams = [];
      }
    } else {
      // Salesman or team leader viewing data sent to them
      dataQuery = `
        SELECT 
          d.*,
          u1.name as sent_to_name,
          u1.username as sent_to_username,
          u2.name as sent_by_name,
          (SELECT COUNT(*) FROM data_feedback df WHERE df.data_id = d.id) as feedback_count,
          (SELECT COUNT(*) FROM data_feedback df WHERE df.data_id = d.id AND df.user_id = ?) as my_feedback_count
        FROM data_center d
        LEFT JOIN users u1 ON d.sent_to_id = u1.id
        LEFT JOIN users u2 ON d.sent_by_id = u2.id
        WHERE d.sent_to_id = ? OR d.sent_to_team = (SELECT team FROM users WHERE id = ?)
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `;
      countQuery = `
        SELECT COUNT(*) as total FROM data_center d
        WHERE d.sent_to_id = ? OR d.sent_to_team = (SELECT team FROM users WHERE id = ?)
      `;
      params = [userId, userId, userId, limit, offset];
      countParams = [userId, userId];
    }

    console.log('🔍 Executing query:', dataQuery);
    console.log('🔍 Query params:', params);

    // Execute queries
    const [data, countResult] = await Promise.all([
      query<any>(dataQuery, params),
      query<any>(countQuery, countParams)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Format the data
    const formattedData = data.map((item: any) => ({
      ...item,
      created_at: item.created_at ? new Date(item.created_at).toISOString() : null,
      updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null
    }));

    const response = NextResponse.json({
      success: true,
      data: formattedData,
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
    console.error('❌ Data Center API Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// Handle POST requests for creating new data entries (manager only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      content, 
      data_type, 
      sent_by_id, 
      sent_to_id, 
      sent_to_team, 
      priority,
      user_role 
    } = body;

    console.log('🔄 Data Center API - POST:', body);

    // Only managers can create data entries
    if (user_role !== 'manager') {
      const response = NextResponse.json({
        success: false,
        error: 'Only managers can create data entries'
      }, { status: 403 });
      return addCorsHeaders(response);
    }

    if (!title || !description || !sent_by_id) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required fields: title, description, sent_by_id'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Generate unique ID
    const dataId = `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const insertQuery = `
      INSERT INTO data_center (
        id, title, description, content, data_type, 
        sent_by_id, sent_to_id, sent_to_team, priority, 
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
    `;

    const params = [
      dataId,
      title,
      description,
      content || null,
      data_type || 'general',
      sent_by_id,
      sent_to_id || null,
      sent_to_team || null,
      priority || 'medium'
    ];

    console.log('🔄 Executing insert:', insertQuery, params);

    await query(insertQuery, params);

    const response = NextResponse.json({
      success: true,
      message: 'Data entry created successfully',
      data_id: dataId
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Data Center POST Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// Handle PUT requests for updating data entries
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataId = searchParams.get('data_id');
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('user_role');
    
    const body = await request.json();
    
    console.log('🔄 Data Center API - PUT:', { dataId, userId, userRole, body });

    if (!dataId || !userId || !userRole) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameters: data_id, user_id, user_role'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Check if user has permission to update this data
    const checkQuery = `
      SELECT * FROM data_center 
      WHERE id = ? AND (sent_by_id = ? OR ? = 'manager')
    `;
    
    const existingData = await query<any>(checkQuery, [dataId, userId, userRole]);
    
    if (existingData.length === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'Data not found or you do not have permission to update it'
      }, { status: 404 });
      return addCorsHeaders(response);
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (body.title) {
      updates.push('title = ?');
      params.push(body.title);
    }
    if (body.description) {
      updates.push('description = ?');
      params.push(body.description);
    }
    if (body.content !== undefined) {
      updates.push('content = ?');
      params.push(body.content);
    }
    if (body.priority) {
      updates.push('priority = ?');
      params.push(body.priority);
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
    params.push(dataId);

    const updateQuery = `UPDATE data_center SET ${updates.join(', ')} WHERE id = ?`;
    
    console.log('🔄 Executing update:', updateQuery, params);

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
      message: 'Data updated successfully'
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Data Center PUT Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// Handle DELETE requests for removing data entries
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataId = searchParams.get('data_id');
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('user_role');

    console.log('🔄 Data Center API - DELETE:', { dataId, userId, userRole });

    if (!dataId || !userId || !userRole) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameters: data_id, user_id, user_role'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Only managers can delete data entries
    if (userRole !== 'manager') {
      const response = NextResponse.json({
        success: false,
        error: 'Only managers can delete data entries'
      }, { status: 403 });
      return addCorsHeaders(response);
    }

    // Delete associated feedback first
    await query('DELETE FROM data_feedback WHERE data_id = ?', [dataId]);
    
    // Delete the data entry
    const deleteQuery = 'DELETE FROM data_center WHERE id = ? AND sent_by_id = ?';
    const result = await query(deleteQuery, [dataId, userId]);
    
    if ((result as any).affectedRows === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'Data not found or you do not have permission to delete it'
      }, { status: 404 });
      return addCorsHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Data deleted successfully'
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Data Center DELETE Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
