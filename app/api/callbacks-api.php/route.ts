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

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://vmaxcom.org').replace(/\/$/, '');

// Proxy requests to the PHP callbacks API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const phpApiUrl = `${BASE_URL}/api/callbacks-api.php${queryString ? '?' + queryString : ''}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const fetchResponse = await fetch(phpApiUrl, { headers: { Accept: 'application/json' }, signal: controller.signal });
    clearTimeout(timeout);

    if (!fetchResponse.ok) {
      throw new Error(`Callbacks API responded with status: ${fetchResponse.status}`);
    }

    let data: any;
    try { data = await fetchResponse.json(); } catch { data = { success: true }; }

    const response = NextResponse.json({ ...data, success: data?.success !== false });
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Callbacks API error:', error);
    const response = NextResponse.json(
      { success: false, error: 'Internal server error' },
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
    const response = await fetch(`${BASE_URL}/api/callbacks-api.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Callbacks API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const jsonResponse = NextResponse.json({ ...data, success: data?.success !== false });
    return addCorsHeaders(jsonResponse);
  } catch (error) {
    console.error('Callbacks API error:', error);
    const response = NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 502 }
    );
    return addCorsHeaders(response);
  }
}
