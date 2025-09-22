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
const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://vmaxcom.org').replace(/\/$/, '');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Fetch from configured PHP host
    const phpApiUrl = `${BASE_URL}/api/deals-api.php${queryString ? '?' + queryString : ''}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const fetchResponse = await fetch(phpApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!fetchResponse.ok) {
      throw new Error(`MySQL API responded with status: ${fetchResponse.status}`);
    }

    let data: any;
    try {
      data = await fetchResponse.json();
    } catch {
      data = { success: true };
    }
    
    // Ensure we return real-time data structure
    const response = NextResponse.json({
      deals: data.deals || [],
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 25,
      success: data?.success !== false,
      timestamp: new Date().toISOString()
    });
    
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Real-time Deals API error:', error);
    
    // Return error with timestamp for debugging
    const response = NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch real-time deals data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        deals: [], // Empty array instead of placeholder data
        total: 0
      },
      { status: 502 }
    );
    return addCorsHeaders(response);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const fetchResponse = await fetch(`${BASE_URL}/api/deals-api.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        timestamp: new Date().toISOString()
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!fetchResponse.ok) {
      throw new Error(`MySQL API responded with status: ${fetchResponse.status}`);
    }

    const data = await fetchResponse.json();
    
    const response = NextResponse.json({
      ...data,
      success: data?.success !== false,
      timestamp: new Date().toISOString()
    });
    
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Real-time Deal creation error:', error);
    const response = NextResponse.json(
      { 
        success: false,
        error: 'Failed to create deal in real-time',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 502 }
    );
    return addCorsHeaders(response);
  }
}
