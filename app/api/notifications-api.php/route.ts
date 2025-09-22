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

// Proxy requests to the PHP notifications API
export async function GET(request: NextRequest) {
  try {
    // For development, return mock data
    if (process.env.NODE_ENV === 'development') {
      const response = NextResponse.json({
        notifications: [
          {
            id: 1,
            title: 'New Deal Created',
            message: 'ABC Corporation deal worth $5,000 has been created',
            type: 'deal',
            status: 'unread',
            created_at: '2024-01-19 14:30:00',
            user_id: 'manager'
          },
          {
            id: 2,
            title: 'Callback Completed',
            message: 'Jane Smith callback has been completed successfully',
            type: 'callback',
            status: 'read',
            created_at: '2024-01-19 09:15:00',
            user_id: 'sales_agent_1'
          },
          {
            id: 3,
            title: 'Target Achievement',
            message: 'You have achieved 65% of your monthly target',
            type: 'target',
            status: 'unread',
            created_at: '2024-01-19 08:00:00',
            user_id: 'manager'
          },
          {
            id: 4,
            title: 'New Callback Assigned',
            message: 'High priority callback from Mike Johnson has been assigned to you',
            type: 'callback',
            status: 'unread',
            created_at: '2024-01-18 15:45:00',
            user_id: 'manager'
          }
        ]
      });
      return addCorsHeaders(response);
    }

    // In production, proxy to the actual PHP API
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const phpApiUrl = `http://vmaxcom.org/api/notifications-api.php${queryString ? '?' + queryString : ''}`;
    
    const fetchResponse = await fetch(phpApiUrl);
    const data = await fetchResponse.json();

    const response = NextResponse.json(data);
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Notifications API error:', error);
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
        message: 'Notification created successfully',
        notification: {
          id: Date.now(),
          ...body,
          created_at: new Date().toISOString(),
          status: 'unread'
        }
      });
      return addCorsHeaders(response);
    }

    // In production, proxy to the actual PHP API
    const response = await fetch('http://vmaxcom.org/api/notifications-api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // For development, return success response
    if (process.env.NODE_ENV === 'development') {
      const response = NextResponse.json({
        success: true,
        message: 'Notification updated successfully'
      });
      return addCorsHeaders(response);
    }

    // In production, proxy to the actual PHP API
    const response = await fetch('http://vmaxcom.org/api/notifications-api.php', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
