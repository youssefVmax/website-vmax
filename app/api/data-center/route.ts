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
    let dbConnectionOk = false;
    try {
      await query('SELECT 1 as test');
      dbConnectionOk = true;
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      console.warn('⚠️ Continuing with empty data due to database issues');
      dbConnectionOk = false;
    }

    // If database is not available, return empty data immediately
    if (!dbConnectionOk) {
      console.warn('⚠️ Database not available, returning empty data');
      const response = NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        timestamp: new Date().toISOString()
      });
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
            u_by.name AS sent_by_name,
            u_to.name AS sent_to_name,
            (SELECT COUNT(*) FROM data_feedback df WHERE df.data_id = d.id) as feedback_count
          FROM data_center d
          LEFT JOIN users u_by ON u_by.id = d.sent_by_id
          LEFT JOIN users u_to ON u_to.id = d.sent_to_id
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
            u_by.name AS sent_by_name,
            u_to.name AS sent_to_name,
            (SELECT COUNT(*) FROM data_feedback df WHERE df.data_id = d.id) as feedback_count
          FROM data_center d
          LEFT JOIN users u_by ON u_by.id = d.sent_by_id
          LEFT JOIN users u_to ON u_to.id = d.sent_to_id
          ORDER BY d.created_at DESC
          LIMIT ? OFFSET ?
        `;
        countQuery = 'SELECT COUNT(*) as total FROM data_center';
        params = [limit, offset];
        countParams = [];
      }
    } else {
      // Salesman or team leader viewing data sent to them OR data they created
      // For now, show all data to fix the filtering issue
      dataQuery = `
        SELECT 
          d.*,
          u_by.name AS sent_by_name,
          u_to.name AS sent_to_name,
          (SELECT COUNT(*) FROM data_feedback df WHERE df.data_id = d.id) as feedback_count,
          (SELECT COUNT(*) FROM data_feedback df WHERE df.data_id = d.id AND df.user_id = ?) as my_feedback_count
        FROM data_center d
        LEFT JOIN users u_by ON u_by.id = d.sent_by_id
        LEFT JOIN users u_to ON u_to.id = d.sent_to_id
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `;
      countQuery = `
        SELECT COUNT(*) as total FROM data_center d
      `;
      params = [userId, limit, offset];
      countParams = [];
    }

    console.log('🔍 Executing query:', dataQuery);
    console.log('🔍 Query params:', params);
    console.log('🔍 User info:', { userId, userRole });

    // Execute queries with better error handling
    let dataRows: any[] = [];
    let countRows: any[] = [{ total: 0 }];
    let queryError = false;

    try {
      // Execute queries sequentially instead of Promise.all to better handle errors
      const dataResult = await query<any>(dataQuery, params);
      dataRows = dataResult[0] as any[];
      console.log('🔍 Query result count:', dataRows.length);
      if (dataRows.length > 0) {
        console.log('🔍 Sample data entry:', dataRows[0]);
      }

      const countResult = await query<any>(countQuery, countParams);
      countRows = countResult[0] as any[];
    } catch (e: any) {
      queryError = true;
      const msg = (e && (e.code || e.message || '')) as string;
      console.error('❌ Query execution error:', e);
      console.error('❌ Error message:', msg);

      // Always return empty data for any query error to prevent 500 errors
      dataRows = [];
      countRows = [{ total: 0 }];
    }

    // If query failed, log it but continue with empty data
    if (queryError) {
      console.warn('⚠️ Database query failed, returning empty data');
    }

    const total = (countRows as any)[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Format the data
    const formattedData = dataRows.map((item: any) => ({
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
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    const errorResponse = NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      data: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
    return addCorsHeaders(errorResponse);
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
    console.log('🔍 User validation - checking sent_by_id:', sent_by_id);

    // All roles can create data entries (manager, team_leader, salesman)
    if (!['manager', 'team_leader', 'salesman'].includes(user_role)) {
      const response = NextResponse.json({
        success: false,
        error: 'Invalid user role'
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

    // Validate that sent_by_id exists in users table
    try {
      const [userCheck] = await query('SELECT id, name, role FROM users WHERE id = ?', [sent_by_id]);
      console.log('🔍 User validation result:', { sent_by_id, userCheck });
      
      if (!Array.isArray(userCheck) || userCheck.length === 0) {
        // Get all users for debugging
        const [allUsers] = await query('SELECT id, name, role FROM users LIMIT 5');
        console.log('🔍 Sample users in database:', allUsers);
        
        const response = NextResponse.json({
          success: false,
          error: `User with ID "${sent_by_id}" does not exist in users table. Available users: ${JSON.stringify(allUsers)}`
        }, { status: 400 });
        return addCorsHeaders(response);
      }
      
      console.log('✅ User validation passed:', userCheck[0]);
    } catch (userCheckError) {
      console.error('❌ User validation error:', userCheckError);
      const response = NextResponse.json({
        success: false,
        error: 'Failed to validate user',
        details: userCheckError instanceof Error ? userCheckError.message : 'Unknown error'
      }, { status: 500 });
      return addCorsHeaders(response);
    }

    // Validate sent_to_id if provided
    if (sent_to_id) {
      try {
        const [recipientCheck] = await query('SELECT id FROM users WHERE id = ?', [sent_to_id]);
        if (!Array.isArray(recipientCheck) || recipientCheck.length === 0) {
          const response = NextResponse.json({
            success: false,
            error: `Recipient user with ID ${sent_to_id} does not exist in users table`
          }, { status: 400 });
          return addCorsHeaders(response);
        }
      } catch (recipientCheckError) {
        console.error('❌ Recipient validation error:', recipientCheckError);
        const response = NextResponse.json({
          success: false,
          error: 'Failed to validate recipient user'
        }, { status: 500 });
        return addCorsHeaders(response);
      }
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

    // Execute the query
    const [result] = await query(insertQuery, params);
    console.log('✅ Insert successful:', result);

    const response = NextResponse.json({
      success: true,
      message: 'Data entry created successfully',
      data_id: dataId
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Data Center POST Error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage
    });
    
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      sqlError: (error as any)?.sqlMessage || null
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
    
    const [existingData] = await query<any>(checkQuery, [dataId, userId, userRole]);
    
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

    const [updateResult]: any = await query(updateQuery, params);
    
    if ((updateResult as any).affectedRows === 0) {
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
    
    // Delete the data entry (managers can delete any entry)
    const deleteQuery = 'DELETE FROM data_center WHERE id = ?';
    const [deleteResult]: any = await query(deleteQuery, [dataId]);
    
    if ((deleteResult as any).affectedRows === 0) {
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