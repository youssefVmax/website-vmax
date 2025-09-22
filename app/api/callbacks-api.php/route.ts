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

// Proxy requests to the PHP callbacks API
export async function GET(request: NextRequest) {
  try {
    // For development, return mock data
    if (process.env.NODE_ENV === 'development') {
      const response = NextResponse.json({
        callbacks: [
          {
            id: 1,
            customer_name: 'John Doe',
            phone: '+1234567890',
            email: 'john@example.com',
            status: 'pending',
            priority: 'high',
            notes: 'Interested in premium package',
            created_at: '2024-01-19 10:30:00',
            created_by: 'manager'
          },
          {
            id: 2,
            customer_name: 'Jane Smith',
            phone: '+1234567891',
            email: 'jane@example.com',
            status: 'completed',
            priority: 'medium',
            notes: 'Called back, deal closed',
            created_at: '2024-01-19 09:15:00',
            created_by: 'sales_agent_1',
            converted_to_deal: true
          }
        ]
      });
      return addCorsHeaders(response);
    }

    // In production, proxy to the actual PHP API
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const phpApiUrl = `http://vmaxcom.org/api/callbacks-api.php${queryString ? '?' + queryString : ''}`;
    
    const fetchResponse = await fetch(phpApiUrl);
    const data = await fetchResponse.json();

    const response = NextResponse.json(data);
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Callbacks API error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // For development, return success response
    if (process.env.NODE_ENV === 'development') {
      const response = NextResponse.json({
        success: true,
        message: 'Callback created successfully',
        callback: {
          id: Date.now(),
          ...body,
          created_at: new Date().toISOString(),
          status: 'pending'
        }
      });
      return addCorsHeaders(response);
    }

    // In production, proxy to the actual PHP API
    const response = await fetch('http://vmaxcom.org/api/callbacks-api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const jsonResponse = NextResponse.json(data);
    return addCorsHeaders(jsonResponse);
  } catch (error) {
    console.error('Callbacks API error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}
