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

// Real-time MySQL deals API - no placeholders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Always fetch from real MySQL database
    const phpApiUrl = `http://vmaxcom.org/api/deals-api.php${queryString ? '?' + queryString : ''}`;
    
    const fetchResponse = await fetch(phpApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // Add timeout for real-time responsiveness
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!fetchResponse.ok) {
      throw new Error(`MySQL API responded with status: ${fetchResponse.status}`);
    }

    const data = await fetchResponse.json();
    
    // Ensure we return real-time data structure
    const response = NextResponse.json({
      deals: data.deals || [],
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 25,
      timestamp: new Date().toISOString()
    });
    
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Real-time Deals API error:', error);
    
    // Return error with timestamp for debugging
    const response = NextResponse.json(
      { 
        error: 'Failed to fetch real-time deals data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        deals: [], // Empty array instead of placeholder data
        total: 0
      },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Always create real deal in MySQL database
    const fetchResponse = await fetch('http://vmaxcom.org/api/deals-api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(15000) // 15 second timeout for creation
    });

    if (!fetchResponse.ok) {
      throw new Error(`MySQL API responded with status: ${fetchResponse.status}`);
    }

    const data = await fetchResponse.json();
    
    const response = NextResponse.json({
      ...data,
      timestamp: new Date().toISOString()
    });
    
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Real-time Deal creation error:', error);
    const response = NextResponse.json(
      { 
        error: 'Failed to create deal in real-time',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}
