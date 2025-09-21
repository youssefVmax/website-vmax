import { NextRequest, NextResponse } from 'next/server';

// MySQL API endpoint for callbacks
const MYSQL_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function callMySQLAPI(endpoint: string, method: string = 'GET', data?: any) {
  const url = `${MYSQL_API_BASE}/api/callbacks-api.php${endpoint}`;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');

    // Build query parameters for MySQL API
    const queryParams = new URLSearchParams();
    if (userRole) queryParams.set('userRole', userRole);
    if (userId) queryParams.set('userId', userId);
    if (userName) queryParams.set('userName', userName);

    const callbacks = await callMySQLAPI(`?${queryParams.toString()}`);
    return NextResponse.json(callbacks);
  } catch (error) {
    console.error('Error fetching callbacks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch callbacks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.customer_name || !body.phone_number || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_name, phone_number, email' },
        { status: 400 }
      );
    }

    // Create callback via MySQL API
    const result = await callMySQLAPI('', 'POST', body);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating callback:', error);
    return NextResponse.json(
      { error: 'Failed to create callback' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Callback ID is required' },
        { status: 400 }
      );
    }

    // Update callback via MySQL API
    const result = await callMySQLAPI('', 'PUT', body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating callback:', error);
    return NextResponse.json(
      { error: 'Failed to update callback' },
      { status: 500 }
    );
  }
}
