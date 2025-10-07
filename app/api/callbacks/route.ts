import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/server/db';
// Force dynamic rendering - NO CACHING
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function addCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  // CRITICAL: No caching headers
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('X-Accel-Expires', '0');
  return res;
}

// Helper function to format dates for MySQL DATE columns
function formatDateForMySQL(dateValue: any): string | null {
  if (!dateValue) return null;
  
  try {
    const dateValueTyped = typeof dateValue === 'string' || typeof dateValue === 'number' || dateValue instanceof Date ? dateValue : String(dateValue);
    const dateObj = new Date(dateValueTyped);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
  } catch (dateError) {
    console.warn('⚠️ Failed to format date for MySQL:', dateValue, dateError);
  }
  
  return null;
}
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/callbacks - Starting request processing');
    
    const { searchParams } = new URL(request.url);
    const salesAgentId = searchParams.get('salesAgentId') || searchParams.get('SalesAgentID');
    const salesTeam = searchParams.get('salesTeam') || searchParams.get('team');
    const managedTeam = searchParams.get('managedTeam');
    const status = searchParams.get('status');
    const userRole = searchParams.get('userRole');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const agentName = searchParams.get('agent'); // optional filter by sales agent name
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 
      userRole === 'team_leader' ? 1000 :  // Allow team leaders to fetch up to 1000 callbacks
      userRole === 'manager' ? 5000 :     // Allow managers to fetch up to 5000 callbacks
      200                                   // Default max for others
    );
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];

    // Role-based data filtering
    if (userRole === 'salesman' && userId) {
      // Salesmen can only see their own callbacks
      where.push('`SalesAgentID` = ?');
      params.push(userId);
      console.log('👤 Filtering for salesman:', userId);
    } else if (userRole === 'team_leader' && userId) {
      // Team leaders see their own callbacks + their team's callbacks
      console.log('👥 Fetching team leader data for:', userId);
      const [userRows] = await query<any>('SELECT `managedTeam` FROM `users` WHERE `id` = ?', [userId]);
      const managedTeam = userRows[0]?.managedTeam;
      console.log('🏢 Managed team:', managedTeam);
      if (managedTeam) {
        where.push('(`SalesAgentID` = ? OR `sales_team` = ?)');
        params.push(userId, managedTeam);
      } else {
        where.push('`SalesAgentID` = ?');
        params.push(userId);
      }
    }
    // Managers can see all callbacks (no additional filtering)

    // Additional filters
    if (salesAgentId && userRole === 'manager') { 
      where.push('`SalesAgentID` = ?'); 
      params.push(salesAgentId); 
    }
    if (salesTeam && userRole === 'manager') { 
      where.push('`sales_team` = ?'); 
      params.push(salesTeam); 
    }
    if (status) { where.push('`status` = ?'); params.push(status); }

    // Agent name filter (available for all roles). This further narrows results after role-based scoping
    if (agentName && agentName.trim()) {
      where.push('`sales_agent` = ?');
      params.push(agentName.trim());
    }
    
    // Search functionality
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      where.push('(`customer_name` LIKE ? OR `phone_number` LIKE ? OR `email` LIKE ? OR `sales_agent` LIKE ? OR `callback_reason` LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    console.log('🔍 Executing callbacks query with WHERE:', whereSql);
    console.log('📝 Query params:', [...params, limit, offset]);
    
    // Check if callbacks table exists and create if needed
    try {
      const [tableCheck] = await query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'vmax' AND TABLE_NAME = 'callbacks'
      `);

    } catch (tableError) {
      console.error('❌ Table creation failed:', tableError);
      return addCorsHeaders(NextResponse.json({
        callbacks: [],
        total: 0,
        page,
        limit,
        success: true,
        userRole,
        userId,
        error: 'Database setup failed'
      }));
    }
    
    let rows: any[] = [];
    let totals: any[] = [];
    
    try {
      // Build the complete SQL query with proper parameter handling
      const baseSql = `SELECT * FROM callbacks ${whereSql} ORDER BY COALESCE(updated_at, created_at) DESC, id DESC`;
      const countSql = `SELECT COUNT(*) as c FROM callbacks ${whereSql}`;
      
      // For pagination, we need to append LIMIT and OFFSET to the query string
      // since MySQL has issues with prepared statements for LIMIT/OFFSET
      const paginatedSql = `${baseSql} LIMIT ${limit} OFFSET ${offset}`;
      
      [rows] = await query<any>(paginatedSql, params);
      [totals] = await query<any>(countSql, params);
      
    } catch (queryError) {
      console.error('❌ Callbacks query error:', queryError);
      rows = [];
      totals = [{ c: 0 }];
    }

    return addCorsHeaders(NextResponse.json({
      callbacks: rows,
      total: totals[0]?.c || 0,
      page,
      limit,
      success: true,
      userRole,
      userId
    }));
  } catch (error) {
    console.error('❌ Error fetching callbacks:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch callbacks',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 502 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 POST /api/callbacks - Starting callback creation');
    const body = await request.json();
    console.log('📋 Request body:', body);
    
    // Generate unique ID
    const id = `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    console.log('🆔 Generated callback ID:', id);

    // Map request body to database fields based on the table structure
    const insertData = {
      id,
      first_call_date: formatDateForMySQL(body.firstCallDate || body.first_call_date),
      phone_number: body.phoneNumber || body.phone_number || null,
      first_call_time: body.firstCallTime || body.first_call_time || null,
      scheduled_date: formatDateForMySQL(body.scheduledDate || body.scheduled_date),
      status: body.status || 'pending',
      customer_name: body.customerName || body.customer_name || null,
      created_by_id: body.createdById || body.created_by_id || null,
      updated_at: now,
      callback_notes: body.callbackNotes || body.callback_notes || null,
      created_at: now,
      follow_up_required: body.followUpRequired || body.follow_up_required || false,
      sales_agent: body.salesAgentName || body.sales_agent || null,
      SalesAgentID: body.salesAgentId || body.SalesAgentID || null,
      created_by: body.createdBy || body.created_by || null,
      email: body.email || null,
      sales_team: body.salesTeam || body.sales_team || null,
      scheduled_time: body.scheduledTime || body.scheduled_time || null,
      priority: body.priority || 'medium',
      callback_reason: body.callbackReason || body.callback_reason || null
    };

    console.log('📊 Mapped insert data:', insertData);

    // Insert callback using exact table structure
    const [result] = await query<any>(
      `INSERT INTO callbacks (
        id, first_call_date, phone_number, first_call_time, scheduled_date, status,
        customer_name, created_by_id, updated_at, callback_notes, created_at,
        follow_up_required, sales_agent, SalesAgentID, created_by, email,
        sales_team, scheduled_time, priority, callback_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        insertData.id,
        insertData.first_call_date,
        insertData.phone_number,
        insertData.first_call_time,
        insertData.scheduled_date,
        insertData.status,
        insertData.customer_name,
        insertData.created_by_id,
        insertData.updated_at,
        insertData.callback_notes,
        insertData.created_at,
        insertData.follow_up_required,
        insertData.sales_agent,
        insertData.SalesAgentID,
        insertData.created_by,
        insertData.email,
        insertData.sales_team,
        insertData.scheduled_time,
        insertData.priority,
        insertData.callback_reason
      ]
    );

    console.log('✅ Callback created successfully:', { id, affectedRows: (result as any).affectedRows });

    // Create notification for managers about new callback
    try {
      const notificationId = `callback-${id}-${Date.now()}`;
      await query(`
        INSERT INTO notifications (
          id, title, message, type, priority, \`from\`, \`to\`, 
          timestamp, isRead, salesAgentId, userRole, callbackId,
          customerName, customerPhone, customerEmail, isManagerMessage, actionRequired, teamName
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        notificationId,
        '📞 New Callback Scheduled!',
        `${insertData.customer_name || 'New customer'} callback scheduled for ${formatDateForMySQL(insertData.scheduled_date)} by ${insertData.sales_agent || 'agent'}`,
        'info',
        insertData.priority === 'high' ? 'high' : 'medium',
        insertData.sales_agent || 'Sales Agent',
        JSON.stringify(['ALL', 'manager', 'team_leader']),
        now,
        0,
        insertData.SalesAgentID || 'unknown',
        'manager',
        id,
        insertData.customer_name || 'New Customer',
        insertData.phone_number || null,
        insertData.email || null,
        false,
        insertData.priority === 'high',
        insertData.sales_team || 'Unknown Team'
      ]);
      console.log('✅ Callback notification created successfully');
    } catch (notificationError) {
      console.error('❌ Failed to create callback notification:', notificationError);
      // Don't fail the callback creation if notification fails
    }

    return addCorsHeaders(NextResponse.json({ success: true, id }, { status: 201 }));
  } catch (error) {
    console.error('❌ Error creating callback:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      sqlState: (error as any)?.sqlState,
      errno: (error as any)?.errno,
      code: (error as any)?.code
    });
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Failed to create callback', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 502 }));
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 PUT /api/callbacks - Starting callback update');
    const body = await request.json();
    const { id, ...updates } = body;
    const { searchParams } = new URL(request.url);
    
    // Get role-based parameters
    const userRole = searchParams.get('userRole') || body.userRole;
    const userId = searchParams.get('userId') || body.userId;
    const managedTeam = searchParams.get('managedTeam') || body.managedTeam;

    console.log('📋 PUT Request details:', { id, updates, userRole, userId, managedTeam, searchParams: Object.fromEntries(searchParams.entries()) });

    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Callback ID is required' }, { status: 400 }));
    }

    console.log('🔒 PUT /api/callbacks - Role-based update check:', { userRole, userId, managedTeam, callbackId: id });
    console.log('📋 PUT Request body updates:', updates);

    // First, check if the callback exists and get its details for permission check
    console.log('🔍 Checking if callback exists:', id);
    const [existingCallback] = await query<any>(`
      SELECT SalesAgentID, sales_team, created_by_id 
      FROM callbacks 
      WHERE id = ?
    `, [id]);

    console.log('📋 Existing callback query result:', existingCallback);

    if (!existingCallback || existingCallback.length === 0) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Callback not found' }, { status: 404 }));
    }

    const callback = existingCallback[0];
    console.log('📋 Existing callback details:', callback);

    // Role-based permission check
    let hasPermission = false;
    
    if (userRole === 'manager') {
      // Managers can edit all callbacks
      hasPermission = true;
      console.log('✅ Manager access granted');
    } else if (userRole === 'team_leader') {
      // Team leaders can edit their own callbacks OR their team's callbacks
      const isOwnCallback = callback.SalesAgentID === userId || callback.created_by_id === userId;
      const isTeamCallback = Boolean(managedTeam && callback.sales_team === managedTeam);
      hasPermission = isOwnCallback || isTeamCallback;
      console.log('🔍 Team leader permission check:', { isOwnCallback, isTeamCallback, hasPermission });
    } else if (userRole === 'salesman') {
      // Salesmen can only edit their own callbacks
      const isOwnCallback = callback.SalesAgentID === userId || callback.created_by_id === userId;
      hasPermission = isOwnCallback;
      console.log('🔍 Salesman permission check:', { isOwnCallback, hasPermission });
    }

    if (!hasPermission) {
      console.log('❌ Permission denied for callback update');
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        error: 'Permission denied. You can only edit your own callbacks.' 
      }, { status: 403 }));
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const setClauses: string[] = [];
    const params: any[] = [];

    // Map common fields
    const fieldMap: Record<string, string> = {
      customerName: 'customer_name', customer_name: 'customer_name',
      phoneNumber: 'phone_number', phone_number: 'phone_number',
      email: 'email',
      status: 'status',
      priority: 'priority',
      salesAgentId: 'SalesAgentID', SalesAgentID: 'SalesAgentID',
      salesAgentName: 'sales_agent', sales_agent: 'sales_agent',
      salesTeam: 'sales_team', sales_team: 'sales_team',
      callbackReason: 'callback_reason', callback_reason: 'callback_reason',
      callbackNotes: 'callback_notes', callback_notes: 'callback_notes',
      scheduledDate: 'scheduled_date', scheduled_date: 'scheduled_date',
      scheduledTime: 'scheduled_time', scheduled_time: 'scheduled_time',
      firstCallDate: 'first_call_date', first_call_date: 'first_call_date',
      firstCallTime: 'first_call_time', first_call_time: 'first_call_time',
      followUpRequired: 'follow_up_required', follow_up_required: 'follow_up_required'
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id' || key === 'userRole' || key === 'userId' || key === 'managedTeam') return;
      const dbField = fieldMap[key] || key;

      // Format DATE columns to MySQL DATE format (YYYY-MM-DD)
      let processedValue = value;
      if ((dbField === 'scheduled_date' || dbField === 'first_call_date') && value) {
        try {
          // Convert ISO timestamp or date string to MySQL DATE format
          const dateValue = typeof value === 'string' || typeof value === 'number' || value instanceof Date ? value : String(value);
          const dateObj = new Date(dateValue);
          if (!isNaN(dateObj.getTime())) {
            processedValue = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
            console.log(`📅 Formatted ${dbField} from '${value}' to '${processedValue}'`);
          }
        } catch (dateError) {
          console.warn(`⚠️ Failed to format date for ${dbField}:`, value, dateError);
        }
      }

      setClauses.push(`\`${dbField}\` = ?`);
      params.push(processedValue);
    });

    if (setClauses.length === 0) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 }));
    }

    setClauses.push('`updated_at` = ?');
    params.push(now, id);

    console.log('📝 Executing UPDATE with clauses:', setClauses.join(', '));
    console.log('📝 Update params:', params);

    console.log('🔄 Executing database update...');
    const [result] = await query<any>(
      `UPDATE callbacks SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    console.log('✅ Database update result:', result);
    console.log('✅ Callback updated successfully:', { id, affectedRows: (result as any).affectedRows });
    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('❌ Error updating callback:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      sqlState: (error as any)?.sqlState,
      errno: (error as any)?.errno,
      code: (error as any)?.code
    });
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Failed to update callback', 
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 502 }));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // Get role-based parameters
    const userRole = searchParams.get('userRole');
    const userId = searchParams.get('userId');
    const managedTeam = searchParams.get('managedTeam');
    
    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Callback ID is required' }, { status: 400 }));
    }

    console.log('🔒 DELETE /api/callbacks - Role-based delete check:', { userRole, userId, managedTeam, callbackId: id });

    // First, check if the callback exists and get its details for permission check
    const [existingCallback] = await query<any>(`
      SELECT SalesAgentID, sales_team, created_by_id 
      FROM callbacks 
      WHERE id = ?
    `, [id]);

    if (!existingCallback || existingCallback.length === 0) {
      return addCorsHeaders(NextResponse.json({ success: false, error: 'Callback not found' }, { status: 404 }));
    }

    const callback = existingCallback[0];
    console.log('📋 Existing callback details for delete:', callback);

    // Role-based permission check
    let hasPermission = false;
    
    if (userRole === 'manager') {
      // Managers can delete all callbacks
      hasPermission = true;
      console.log('✅ Manager delete access granted');
    } else if (userRole === 'team_leader') {
      // Team leaders can delete their own callbacks OR their team's callbacks
      const isOwnCallback = callback.SalesAgentID === userId || callback.created_by_id === userId;
      const isTeamCallback = Boolean(managedTeam && callback.sales_team === managedTeam);
      hasPermission = isOwnCallback || isTeamCallback;
      console.log('🔍 Team leader delete permission check:', { isOwnCallback, isTeamCallback, hasPermission });
    } else if (userRole === 'salesman') {
      // Salesmen can only delete their own callbacks
      const isOwnCallback = callback.SalesAgentID === userId || callback.created_by_id === userId;
      hasPermission = isOwnCallback;
      console.log('🔍 Salesman delete permission check:', { isOwnCallback, hasPermission });
    }

    if (!hasPermission) {
      console.log('❌ Permission denied for callback deletion');
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        error: 'Permission denied. You can only delete your own callbacks.' 
      }, { status: 403 }));
    }

    const [result] = await query<any>(`DELETE FROM callbacks WHERE id = ?`, [id]);
    console.log('✅ Callback deleted successfully:', { id, affectedRows: (result as any).affectedRows });
    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error('❌ Error deleting callback:', error);
    return addCorsHeaders(NextResponse.json({ success: false, error: 'Failed to delete callback' }, { status: 502 }));
  }
}
/*


CREATE TABLE `callback_history` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `callback_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_status` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_scheduled_date` date DEFAULT NULL,
  `new_scheduled_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE `callbacks` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_call_date` date DEFAULT NULL,
  `phone_number` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_call_time` text COLLATE utf8mb4_unicode_ci,
  `scheduled_date` date DEFAULT NULL,
  `status` text COLLATE utf8mb4_unicode_ci,
  `customer_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `callback_notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `follow_up_required` tinyint(1) DEFAULT NULL,
  `sales_agent` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SalesAgentID` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sales_team` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scheduled_time` time DEFAULT NULL,
  `priority` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `callback_reason` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/