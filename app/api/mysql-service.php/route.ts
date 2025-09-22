import { NextRequest, NextResponse } from 'next/server';

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

// Real-time MySQL service - direct database connection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const queryString = searchParams.toString();

    // Always fetch real-time data from MySQL database
    const phpApiUrl = `http://vmaxcom.org/api/mysql-service.php?${queryString}`;
    
    const fetchResponse = await fetch(phpApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!fetchResponse.ok) {
      throw new Error(`MySQL database responded with status: ${fetchResponse.status}`);
    }

    const data = await fetchResponse.json();
    
    // Add real-time metadata
    const response = NextResponse.json({
      ...data,
      timestamp: new Date().toISOString(),
      source: 'mysql_realtime',
      path: path
    });
    
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Real-time MySQL Service error:', error);
    
    // Return empty data structure instead of placeholder data
    const response = NextResponse.json({
      error: 'Failed to fetch real-time data from MySQL',
      message: error instanceof Error ? error.message : 'Database connection failed',
      timestamp: new Date().toISOString(),
      source: 'mysql_error',
      // Return empty structures based on path
      deals: [],
      callbacks: [],
      targets: [],
      notifications: [],
      users: [],
      total: 0
    }, { status: 500 });
    
    return addCorsHeaders(response);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    // Always create real data in MySQL database
    const fetchResponse = await fetch(`http://vmaxcom.org/api/mysql-service.php?${queryString}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        ...body,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(15000) // 15 second timeout for creation
    });

    if (!fetchResponse.ok) {
      throw new Error(`MySQL database responded with status: ${fetchResponse.status}`);
    }

    const data = await fetchResponse.json();
    
    const response = NextResponse.json({
      ...data,
      timestamp: new Date().toISOString(),
      source: 'mysql_realtime'
    });
    
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Real-time MySQL creation error:', error);
    const response = NextResponse.json(
      { 
        error: 'Failed to create data in MySQL',
        message: error instanceof Error ? error.message : 'Database operation failed',
        timestamp: new Date().toISOString(),
        source: 'mysql_error'
      },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}
