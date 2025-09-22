import { NextRequest, NextResponse } from 'next/server';

function addCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  return res;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://vmaxcom.org').replace(/\/$/, '');

export async function GET(request: NextRequest) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(`${BASE_URL}/api/schema-api.php`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      throw new Error(`Schema API responded with status: ${resp.status}`);
    }

    const data = await resp.json();
    return addCorsHeaders(NextResponse.json({ ...data, success: data?.success !== false }));
  } catch (error) {
    console.error('Schema proxy error:', error);
    return addCorsHeaders(
      NextResponse.json({ success: false, error: 'Failed to load schema' }, { status: 502 })
    );
  }
}
