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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        message: 'Username and password are required' 
      }, { status: 400 }));
    }

    console.log('🔐 Auth API: Attempting authentication for:', username);

    // Query the users table for authentication
    const [users] = await query<any>(
      'SELECT * FROM `users` WHERE `username` = ? OR `email` = ? LIMIT 1',
      [username, username]
    );

    if (!users || users.length === 0) {
      console.log('❌ Auth API: User not found:', username);
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        message: 'Invalid username or password' 
      }, { status: 401 }));
    }

    const user = users[0];
    
    // Simple password check (in production, use proper hashing)
    // For now, check if password matches the stored password or password_hash
    const passwordMatch = password === user.password || 
                         password === user.password_hash ||
                         password === user.pass; // Handle different column names

    if (!passwordMatch) {
      console.log('❌ Auth API: Invalid password for user:', username);
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        message: 'Invalid username or password' 
      }, { status: 401 }));
    }

    // Update last login
    try {
      await query(
        'UPDATE `users` SET `last_login` = NOW() WHERE `id` = ?',
        [user.id]
      );
    } catch (updateError) {
      console.warn('⚠️ Auth API: Could not update last login:', updateError);
    }

    // Return user data (excluding password)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name || user.name || user.display_name,
      phone: user.phone,
      role: user.role || user.user_role || 'salesman',
      team_id: user.team_id,
      team_name: user.team_name,
      is_active: user.is_active !== false && user.status !== 'inactive',
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    console.log('✅ Auth API: Authentication successful for:', username);
    
    return addCorsHeaders(NextResponse.json({
      success: true,
      user: userData,
      token: `token_${user.id}_${Date.now()}`, // Simple token generation
      message: 'Authentication successful'
    }));

  } catch (error) {
    console.error('❌ Auth API: Authentication error:', error);
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}

export async function GET(request: NextRequest) {
  try {
    // Health check endpoint
    return addCorsHeaders(NextResponse.json({
      success: true,
      message: 'Auth API is running',
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Auth API error' 
    }, { status: 500 }));
  }
}
