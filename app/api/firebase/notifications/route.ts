import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'http://vmaxcom.org';

async function callMySQLAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}/api/notifications-api.php${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`MySQL API error: ${response.status}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = queryString ? `?${queryString}` : '';
    
    const data = await callMySQLAPI(endpoint);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const data = await callMySQLAPI('', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    return NextResponse.json(data, { status: data.success ? 201 : 400 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const data = await callMySQLAPI('', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
