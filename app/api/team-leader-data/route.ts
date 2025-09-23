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

// Team Leader Data API - Provides paginated deals and callbacks data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const managedTeam = searchParams.get('managed_team');
    const dataType = searchParams.get('data_type'); // 'team-deals', 'team-callbacks', 'personal-deals', 'personal-callbacks'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'DESC';

    console.log('🔍 Team Leader Data API:', { userId, managedTeam, dataType, page, limit });

    if (!userId || !managedTeam || !dataType) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameters: user_id, managed_team, and data_type'
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
    let baseQuery = '';
    let countQuery = '';
    let params: any[] = [];
    let countParams: any[] = [];
    let whereConditions: string[] = [];
    let searchConditions: string[] = [];

    // Build base conditions based on data type
    if (dataType === 'team-deals') {
      baseQuery = `
        SELECT 
          d.*,
          u.name as sales_agent_name,
          u.username as sales_agent_username
        FROM deals d
        LEFT JOIN users u ON d.SalesAgentID = u.id
      `;
      countQuery = 'SELECT COUNT(*) as total FROM deals d LEFT JOIN users u ON d.SalesAgentID = u.id';
      whereConditions.push('d.sales_team = ?');
      whereConditions.push('d.SalesAgentID != ?');
      params.push(managedTeam, userId);
      countParams.push(managedTeam, userId);
      
      if (search) {
        searchConditions.push('(d.customer_name LIKE ? OR d.email LIKE ? OR u.name LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm);
      }
    } 
    else if (dataType === 'team-callbacks') {
      baseQuery = `
        SELECT 
          c.*,
          u.name as sales_agent_name,
          u.username as sales_agent_username
        FROM callbacks c
        LEFT JOIN users u ON c.SalesAgentID = u.id
      `;
      countQuery = 'SELECT COUNT(*) as total FROM callbacks c LEFT JOIN users u ON c.SalesAgentID = u.id';
      whereConditions.push('c.sales_team = ?');
      whereConditions.push('c.SalesAgentID != ?');
      params.push(managedTeam, userId);
      countParams.push(managedTeam, userId);
      
      if (search) {
        searchConditions.push('(c.customer_name LIKE ? OR c.phone_number LIKE ? OR u.name LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm);
      }
    }
    else if (dataType === 'personal-deals') {
      baseQuery = 'SELECT * FROM deals';
      countQuery = 'SELECT COUNT(*) as total FROM deals';
      whereConditions.push('SalesAgentID = ?');
      params.push(userId);
      countParams.push(userId);
      
      if (search) {
        searchConditions.push('(customer_name LIKE ? OR email LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm);
      }
    }
    else if (dataType === 'personal-callbacks') {
      baseQuery = 'SELECT * FROM callbacks';
      countQuery = 'SELECT COUNT(*) as total FROM callbacks';
      whereConditions.push('SalesAgentID = ?');
      params.push(userId);
      countParams.push(userId);
      
      if (search) {
        searchConditions.push('(customer_name LIKE ? OR phone_number LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm);
      }
    }
    else {
      const response = NextResponse.json({
        success: false,
        error: 'Invalid data_type. Must be: team-deals, team-callbacks, personal-deals, or personal-callbacks'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Add status filter
    if (status && status !== 'all') {
      const statusColumn = dataType.includes('deals') ? 
        (dataType === 'team-deals' ? 'd.status' : 'status') : 
        (dataType === 'team-callbacks' ? 'c.status' : 'status');
      whereConditions.push(`${statusColumn} = ?`);
      params.push(status);
      countParams.push(status);
    }

    // Combine all conditions
    const allConditions = [...whereConditions, ...searchConditions];
    const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

    // Add sorting and pagination
    const orderByColumn = dataType.includes('team-') ? 
      (dataType === 'team-deals' ? `d.${sortBy}` : `c.${sortBy}`) : 
      sortBy;
    const fullQuery = `${baseQuery} ${whereClause} ORDER BY ${orderByColumn} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const fullCountQuery = `${countQuery} ${whereClause}`;

    console.log('🔍 Executing query:', fullQuery);
    console.log('🔍 Query params:', params);

    // Execute queries
    const [data, countResult] = await Promise.all([
      query<any>(fullQuery, params),
      query<any>(fullCountQuery, countParams)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Format the data based on type
    const formattedData = data.map((item: any) => {
      // Convert MySQL decimal/binary strings to proper numbers
      if (item.amount_paid) {
        item.amount_paid = parseFloat(item.amount_paid);
      }
      if (item.total_amount) {
        item.total_amount = parseFloat(item.total_amount);
      }
      
      // Ensure consistent field names
      return {
        ...item,
        customerName: item.customer_name || item.customerName,
        salesAgentName: item.sales_agent_name || item.salesAgentName || item.sales_agent,
        phoneNumber: item.phone_number || item.phoneNumber,
        amountPaid: item.amount_paid || item.amountPaid,
        totalAmount: item.total_amount || item.totalAmount,
        signupDate: item.signup_date || item.signupDate || item.created_at,
        createdAt: item.created_at || item.createdAt
      };
    });

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
      filters: {
        dataType,
        search,
        status,
        sortBy,
        sortOrder
      },
      timestamp: new Date().toISOString()
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Team Leader Data API Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// Handle PUT requests for updating personal data only
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const dataType = searchParams.get('data_type');
    const itemId = searchParams.get('item_id');
    
    const body = await request.json();
    
    console.log('🔄 Team Leader Data Update:', { userId, dataType, itemId, body });

    if (!userId || !dataType || !itemId) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameters: user_id, data_type, and item_id'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Only allow updates to personal data
    if (!dataType.startsWith('personal-')) {
      const response = NextResponse.json({
        success: false,
        error: 'Team leaders can only update their personal data'
      }, { status: 403 });
      return addCorsHeaders(response);
    }

    let updateQuery = '';
    let params: any[] = [];
    const updates: string[] = [];

    if (dataType === 'personal-deals') {
      // Build update query for deals
      if (body.status) {
        updates.push('status = ?');
        params.push(body.status);
      }
      if (body.amountPaid !== undefined) {
        updates.push('amount_paid = ?');
        params.push(body.amountPaid);
      }
      if (body.customerName) {
        updates.push('customer_name = ?');
        params.push(body.customerName);
      }
      if (body.email) {
        updates.push('email = ?');
        params.push(body.email);
      }
      
      if (updates.length === 0) {
        const response = NextResponse.json({
          success: false,
          error: 'No valid fields to update'
        }, { status: 400 });
        return addCorsHeaders(response);
      }

      updateQuery = `UPDATE deals SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND SalesAgentID = ?`;
      params.push(itemId, userId);
    }
    else if (dataType === 'personal-callbacks') {
      // Build update query for callbacks
      if (body.status) {
        updates.push('status = ?');
        params.push(body.status);
      }
      if (body.callback_notes) {
        updates.push('callback_notes = ?');
        params.push(body.callback_notes);
      }
      if (body.priority) {
        updates.push('priority = ?');
        params.push(body.priority);
      }
      if (body.scheduled_date) {
        updates.push('scheduled_date = ?');
        params.push(body.scheduled_date);
      }
      
      if (updates.length === 0) {
        const response = NextResponse.json({
          success: false,
          error: 'No valid fields to update'
        }, { status: 400 });
        return addCorsHeaders(response);
      }

      updateQuery = `UPDATE callbacks SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND SalesAgentID = ?`;
      params.push(itemId, userId);
    }

    console.log('🔄 Executing update:', updateQuery, params);

    const result = await query(updateQuery, params);
    
    if ((result as any).affectedRows === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'Item not found or you do not have permission to update it'
      }, { status: 404 });
      return addCorsHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Item updated successfully',
      affectedRows: (result as any).affectedRows
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Team Leader Data Update Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
