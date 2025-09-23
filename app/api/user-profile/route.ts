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

// User Profile API - Get user profile information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    console.log('🔍 User Profile API - GET:', { userId });

    if (!userId) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameter: user_id'
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

    // Get user profile with additional information
    const userQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.name as full_name,
        u.phone,
        u.role,
        u.team,
        u.managedTeam,
        u.created_at,
        u.updated_at,
        u.last_login,
        u.is_active,
        
        -- Get team statistics if user is a team leader
        CASE 
          WHEN u.role = 'team-leader' AND u.managedTeam IS NOT NULL THEN
            (SELECT COUNT(*) FROM users WHERE team = u.managedTeam AND id != u.id)
          ELSE 0
        END as managed_team_size,
        
        -- Get personal statistics
        (SELECT COUNT(*) FROM deals WHERE SalesAgentID = u.id) as total_deals,
        (SELECT COALESCE(SUM(amount_paid), 0) FROM deals WHERE SalesAgentID = u.id) as total_revenue,
        (SELECT COUNT(*) FROM callbacks WHERE SalesAgentID = u.id) as total_callbacks
        
      FROM users u
      WHERE u.id = ?
    `;

    console.log('🔍 Executing user query:', userQuery, [userId]);

    const userResult = await query<any>(userQuery, [userId]);

    if (userResult.length === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
      return addCorsHeaders(response);
    }

    const user = userResult[0];

    // Format the user data
    const userProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      team: user.team,
      team_name: user.team, // Alias for compatibility
      managedTeam: user.managedTeam,
      managed_team_size: user.managed_team_size,
      is_active: user.is_active,
      created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
      updated_at: user.updated_at ? new Date(user.updated_at).toISOString() : null,
      last_login: user.last_login ? new Date(user.last_login).toISOString() : null,
      
      // Statistics
      stats: {
        total_deals: user.total_deals || 0,
        total_revenue: parseFloat(user.total_revenue) || 0,
        total_callbacks: user.total_callbacks || 0,
        managed_team_size: user.managed_team_size || 0
      }
    };

    console.log('✅ User profile fetched successfully:', userProfile.username);

    const response = NextResponse.json({
      success: true,
      data: userProfile,
      timestamp: new Date().toISOString()
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ User Profile API Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// Handle PUT requests for updating user profile
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    const body = await request.json();
    
    console.log('🔄 User Profile API - PUT:', { userId, body });

    if (!userId) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameter: user_id'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (body.full_name) {
      updates.push('name = ?');
      params.push(body.full_name);
    }
    if (body.email) {
      updates.push('email = ?');
      params.push(body.email);
    }
    if (body.phone !== undefined) {
      updates.push('phone = ?');
      params.push(body.phone);
    }

    if (updates.length === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'No valid fields to update'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    updates.push('updated_at = NOW()');
    params.push(userId);

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    console.log('🔄 Executing update:', updateQuery, params);

    const result = await query(updateQuery, params);
    
    if ((result as any).affectedRows === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'User not found or no changes made'
      }, { status: 404 });
      return addCorsHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ User Profile PUT Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
