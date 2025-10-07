import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('user_role');
    const dataType = searchParams.get('data_type') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;

    // Validate numeric parameters to prevent SQL injection
    if (isNaN(page) || page < 1) {
      const response = NextResponse.json({
        success: false,
        error: 'Invalid page parameter'
      }, { status: 400 });
      return addCorsHeaders(response);
    }
    
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      const response = NextResponse.json({
        success: false,
        error: 'Invalid limit parameter (must be 1-1000)'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    console.log('✅ Data center API working');

    if (!userId || !userRole) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameters: user_id and user_role'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Ensure table exists
    try {
      await query('SELECT 1 FROM data_center LIMIT 1', []);
    } catch (tableError) {
      if (tableError instanceof Error && tableError.message.includes("doesn't exist")) {
        const createTableQuery = `
          CREATE TABLE data_center (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            content LONGTEXT,
            data_type VARCHAR(100) DEFAULT 'general',
            sent_by_id VARCHAR(255),
            sent_to_id VARCHAR(255),
            sent_to_team VARCHAR(255),
            priority VARCHAR(50) DEFAULT 'medium',
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `;
        await query(createTableQuery, []);
        console.log('✅ Data center table created');
      }
    }

    // Build queries based on role
    let dataQuery = '';
    let countQuery = '';
    let params: any[] = [];
    let countParams: any[] = [];

    if (userRole === 'manager') {
      // Managers see all data
      if (dataType !== 'all') {
        dataQuery = `SELECT * FROM data_center WHERE data_type = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        countQuery = 'SELECT COUNT(*) as total FROM data_center WHERE data_type = ?';
        params = [dataType];
        countParams = [dataType];
      } else {
        dataQuery = `SELECT * FROM data_center ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        countQuery = 'SELECT COUNT(*) as total FROM data_center';
        params = [];
        countParams = [];
      }
    } else {
      // Non-managers see only data shared with them
      if (dataType !== 'all') {
        dataQuery = `SELECT * FROM data_center WHERE data_type = ? AND sent_to_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        countQuery = `SELECT COUNT(*) as total FROM data_center WHERE data_type = ? AND sent_to_id = ?`;
        params = [dataType, userId];
        countParams = [dataType, userId];
      } else {
        dataQuery = `SELECT * FROM data_center WHERE sent_to_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        countQuery = `SELECT COUNT(*) as total FROM data_center WHERE sent_to_id = ?`;
        params = [userId];
        countParams = [userId];
      }
    }

    const [dataResults] = await query<any>(dataQuery, params);
    const [countResults] = await query<any>(countQuery, countParams);

    const total = countResults[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const response = NextResponse.json({
      success: true,
      data: dataResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        userRole,
        dataType,
        userId
      }
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Data Center API Error:', error);
    const response = NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
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

    console.log('🔍 About to insert data with params:', params);
    console.log('🔍 Insert query:', insertQuery);

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