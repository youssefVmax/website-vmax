import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/server/db';
import { UserRole, USER_ROLES, isValidRole } from '../../../types/user';

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
    const userId = searchParams.get('userId') || searchParams.get('user_id');
    const role = searchParams.get('role');
    const username = searchParams.get('username');
    const team = searchParams.get('team');
    const managedTeam = searchParams.get('managedTeam');
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 100); // Max 100 users per page
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];

    // Filter by specific user ID
    if (userId) {
      where.push('`id` = ?');
      params.push(userId);
    }

    // Filter by exact username if provided
    if (username) {
      where.push('`username` = ?');
      params.push(username);
    }

    // Filter by role
    if (role && isValidRole(role)) {
      where.push('`role` = ?');
      params.push(role);
    }

    // Filter by team
    if (team) {
      where.push('`team` = ?');
      params.push(team);
    }

    // Filter by managed team (for team leaders)
    if (managedTeam) {
      where.push('`managedTeam` = ?');
      params.push(managedTeam);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Get users
    // Build the complete SQL query with proper parameter handling
    const baseSql = `SELECT 
      id, username, email, name, phone, role, team, managedTeam, password,
      created_at, updated_at
     FROM users ${whereSql} 
     ORDER BY created_at DESC`;
    const countSql = `SELECT COUNT(*) as c FROM users ${whereSql}`;
    
    // Use string interpolation for LIMIT and OFFSET to avoid MySQL prepared statement issues
    const paginatedSql = `${baseSql} LIMIT ${limit} OFFSET ${offset}`;
    
    
    const [rows] = await query<any>(paginatedSql, params);

    // Get total count
    const [totals] = await query<any>(countSql, params);
    
    console.log('✅ Users query executed successfully, returned', rows.length, 'rows');

    // Transform data for frontend compatibility
    const users = rows.map((user: any) => ({
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role as UserRole,
      team: user.team,
      managedTeam: user.managedTeam,
      password: (user as any).password,
      created_by: (user as any).created_by ?? null,
      is_active: (user as any).is_active ?? true,
      created_at: user.created_at,
      updated_at: user.updated_at,
      // Backward compatibility
      full_name: user.name,
      team_name: user.team,
      team_id: user.team === 'ALI ASHRAF' ? 1 : user.team === 'CS TEAM' ? 2 : 0,
    }));

    return addCorsHeaders(NextResponse.json({
      success: true,
      users: (userId || username) ? (users[0] ? [users[0]] : []) : users,
      user: (userId || username) ? (users[0] || null) : undefined,
      total: (totals as any)[0]?.c || 0,
      page,
      limit
    }));

  } catch (error) {
    console.error('Error fetching users:', error);
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Normalize fields
    if (body.username && typeof body.username === 'string') {
      body.username = body.username.trim();
    }
    
    // Validate required fields (email optional to match UI)
    if (!body.username || !body.name || !body.role) {
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: username, name, role' 
      }, { status: 400 }));
    }

    // Additional validation matching UI constraints
    if (!body.team) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        error: 'Team is required'
      }, { status: 400 }));
    }
    if (body.role === 'team_leader' && !body.managedTeam) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        error: 'Managed team is required for team leaders'
      }, { status: 400 }));
    }

    // Check duplicate username
    const [dupRows] = await query<any>(
      `SELECT id FROM users WHERE username = ? LIMIT 1`,
      [body.username]
    );
    if (Array.isArray(dupRows) && dupRows.length > 0) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        error: 'Username already exists'
      }, { status: 409 }));
    }

    // Validate role
    if (!isValidRole(body.role)) {
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        error: 'Invalid role. Must be one of: manager, team_leader, salesman' 
      }, { status: 400 }));
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Hash password if provided (in a real app, use proper password hashing)
    const hashedPassword = body.password ? body.password : 'default_password';

    let insertedId: any = null;
    try {
      // Attempt insert assuming auto-increment numeric id
      const [result] = await query<any>(
        `INSERT INTO users (
          username, email, name, phone, role, team, managedTeam,
          password, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.username,
          body.email || null,
          body.name,
          body.phone || null,
          body.role,
          body.team,
          (body.role === 'team_leader' ? (body.managedTeam || null) : null),
          hashedPassword,
          now,
          now
        ]
      );
      insertedId = (result as any)?.insertId ?? null;
    } catch (insertErr: any) {
      // Retry without managedTeam if column doesn't exist
      const message = String(insertErr?.message || insertErr || '')
      if (/unknown column\s+'?managedteam'?/i.test(message)) {
        const [resultNoMT] = await query<any>(
          `INSERT INTO users (
            username, email, name, phone, role, team,
            password, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            body.username,
            body.email || null,
            body.name,
            body.phone || null,
            body.role,
            body.team,
            hashedPassword,
            now,
            now
          ]
        );
        insertedId = (resultNoMT as any)?.insertId ?? null;
      } else {
        // If table requires explicit string id or id cannot be null, retry with generated id
        const generatedId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        try {
          const [result2] = await query<any>(
            `INSERT INTO users (
              id, username, email, name, phone, role, team, managedTeam,
              password, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generatedId,
              body.username,
              body.email || null,
              body.name,
              body.phone || null,
              body.role,
              body.team,
              (body.role === 'team_leader' ? (body.managedTeam || null) : null),
              hashedPassword,
              now,
              now
            ]
          );
          insertedId = (result2 as any)?.insertId ?? generatedId;
        } catch (insertErr2: any) {
          // Final fallback: retry explicit id without managedTeam as well
          const msg2 = String(insertErr2?.message || insertErr2 || '')
          if (/unknown column\s+'?managedteam'?/i.test(msg2)) {
            const [result3] = await query<any>(
              `INSERT INTO users (
                id, username, email, name, phone, role, team,
                password, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generatedId,
                body.username,
                body.email || null,
                body.name,
                body.phone || null,
                body.role,
                body.team,
                hashedPassword,
                now,
                now
              ]
            );
            insertedId = (result3 as any)?.insertId ?? generatedId;
          } else {
            throw insertErr2;
          }
        }
      }
    }
    console.log('✅ User created successfully:', { id: insertedId, username: body.username, role: body.role });
    return addCorsHeaders(NextResponse.json({ 
      success: true, 
      id: insertedId, 
      message: 'User created successfully' 
    }, { status: 201 }));

  } catch (error) {
    console.error('❌ Error creating user:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: `Failed to create user: ${message}`,
      details: message
    }, { status: 500 }));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json();
    
    // Try to get ID from body first, then from query params as fallback
    let { id, ...updates } = body;
    if (!id) {
      id = searchParams.get('id');
    }
    
    
    if (!id) {
      console.error('❌ No ID found in request body or query params');
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        error: 'User ID is required in request body or query parameter' 
      }, { status: 400 }));
    }

    // Validate role if being updated
    if (updates.role && !isValidRole(updates.role)) {
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        error: 'Invalid role. Must be one of: manager, team_leader, salesman' 
      }, { status: 400 }));
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const setClauses: string[] = [];
    const params: any[] = [];

    // Build update query dynamically
    const allowedFields = ['username', 'email', 'name', 'phone', 'role', 'team', 'managedTeam', 'is_active'];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        setClauses.push(` ${key}  = ?`);
        params.push(value);
      }
    });

    if (setClauses.length === 0) {
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        error: 'No valid fields to update' 
      }, { status: 400 }));
    }

    setClauses.push('`updated_at` = ?');
    params.push(now, id);

    const [result] = await query<any>(
      `UPDATE users SET ${setClauses.join(', ')} WHERE  id  = ?`,
      params
    );

    return addCorsHeaders(NextResponse.json({ 
      success: true, 
      affected: (result as any).affectedRows,
      message: 'User updated successfully'
    }));

  } catch (error) {
    console.error('Error updating user:', error);
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 }));
    }

    const [result] = await query<any>(`DELETE FROM users WHERE  id  = ?`, [id]);
    
    return addCorsHeaders(NextResponse.json({ 
      success: true, 
      affected: (result as any).affectedRows,
      message: 'User deleted successfully'
    }));

  } catch (error) {
    console.error('Error deleting user:', error);
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}
