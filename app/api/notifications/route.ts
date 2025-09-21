import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// MySQL API endpoint for notifications
const MYSQL_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function callMySQLAPI(endpoint: string, method: string = 'GET', data?: any) {
  const url = `${MYSQL_API_BASE}/api/notifications-api.php${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`MySQL API error: ${response.statusText}`);
  }
  
  return response.json();
}


export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams;
    const userId = search.get('userId');
    const role = search.get('role');

    // Build query parameters for MySQL API
    const queryParams = new URLSearchParams();
    if (userId) queryParams.set('userId', userId);
    if (role) queryParams.set('role', role);

    const notifications = await callMySQLAPI(`?${queryParams.toString()}`);
    return NextResponse.json(notifications, { status: 200 });
  } catch (error) {
    console.error('Error reading notifications:', error);
    return NextResponse.json({ message: 'Error reading notifications', details: String((error as any)?.message || error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    if (!Array.isArray(body.to) || body.to.length === 0) {
      return NextResponse.json({ message: 'Notifications require a non-empty "to" array' }, { status: 400 });
    }

    // Create notification via MySQL API
    const result = await callMySQLAPI('', 'POST', body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ message: 'Error creating notification', details: String((error as any)?.message || error) }, { status: 500 });
  }
}

// PUT supports marking a notification as read or mark-all for a user
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Update notification via MySQL API
    const result = await callMySQLAPI('', 'PUT', body);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ message: 'Error updating notification', details: String((error as any)?.message || error) }, { status: 500 });
  }
}

