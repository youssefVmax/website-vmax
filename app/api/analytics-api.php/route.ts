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

// Proxy requests to the PHP analytics API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const userRole = searchParams.get('user_role');
    const userId = searchParams.get('user_id');
    const dateRange = searchParams.get('date_range');
    const team = searchParams.get('team');

    // Build query string
    const queryParams = new URLSearchParams();
    if (endpoint) queryParams.set('endpoint', endpoint);
    if (userRole) queryParams.set('user_role', userRole);
    if (userId) queryParams.set('user_id', userId);
    if (dateRange) queryParams.set('date_range', dateRange);
    if (team) queryParams.set('team', team);

    // For development, we'll return mock data since PHP server might not be running
    if (process.env.NODE_ENV === 'development') {
      const response = NextResponse.json(getMockAnalyticsData(endpoint || ''));
      return addCorsHeaders(response);
    }

    // In production, proxy to the actual PHP API
    const phpApiUrl = `http://vmaxcom.org/api/analytics-api.php?${queryParams.toString()}`;
    const fetchResponse = await fetch(phpApiUrl);
    const data = await fetchResponse.json();

    const response = NextResponse.json(data);
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Analytics API error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

function getMockAnalyticsData(endpoint: string) {
  switch (endpoint) {
    case 'dashboard-stats':
      return {
        total_deals: 45,
        total_revenue: 125000,
        today_deals: 3,
        today_revenue: 8500,
        total_callbacks: 28,
        pending_callbacks: 12,
        today_callbacks: 5
      };

    case 'callback-kpis':
      return {
        totals: {
          total_callbacks: 28,
          pending_callbacks: 12,
          contacted_callbacks: 10,
          completed_callbacks: 6,
          cancelled_callbacks: 0,
          converted_callbacks: 4,
          today_callbacks: 5,
          today_completed: 2,
          conversion_rate: 21.4
        },
        callbacksByAgent: [
          {
            agent: 'manager',
            callbacks: 15,
            completed: 8,
            conversions: 5,
            avg_response_hours: 2.5,
            conversion_rate: 53.3
          },
          {
            agent: 'sales_agent_1',
            callbacks: 13,
            completed: 6,
            conversions: 3,
            avg_response_hours: 4.2,
            conversion_rate: 46.2
          }
        ],
        dailyTrend: [
          { date: '2024-01-15', callbacks: 3, completed: 2, conversions: 1 },
          { date: '2024-01-16', callbacks: 5, completed: 3, conversions: 2 },
          { date: '2024-01-17', callbacks: 4, completed: 2, conversions: 1 },
          { date: '2024-01-18', callbacks: 6, completed: 4, conversions: 3 },
          { date: '2024-01-19', callbacks: 5, completed: 2, conversions: 1 }
        ],
        statusDistribution: [
          { status: 'pending', count: 12, percentage: 42.9 },
          { status: 'contacted', count: 10, percentage: 35.7 },
          { status: 'completed', count: 6, percentage: 21.4 }
        ],
        priorityBreakdown: [
          { priority: 'high', count: 8 },
          { priority: 'medium', count: 15 },
          { priority: 'low', count: 5 }
        ],
        recentCallbacks: [
          {
            id: 1,
            customer_name: 'John Doe',
            phone: '+1234567890',
            status: 'pending',
            priority: 'high',
            created_at: '2024-01-19 10:30:00',
            created_by: 'manager'
          },
          {
            id: 2,
            customer_name: 'Jane Smith',
            phone: '+1234567891',
            status: 'completed',
            priority: 'medium',
            created_at: '2024-01-19 09:15:00',
            created_by: 'sales_agent_1'
          }
        ],
        responseMetrics: {
          avg_hours: 3.2,
          fastest_hours: 0.5,
          slowest_hours: 8.0
        }
      };

    case 'sales-kpis':
      return {
        totals: {
          total_deals: 45,
          total_revenue: 125000,
          avg_deal_size: 2777.78,
          closed_deals: 32,
          active_deals: 13,
          today_deals: 3,
          today_revenue: 8500
        },
        salesByAgent: [
          {
            agent: 'manager',
            deals: 20,
            revenue: 65000,
            avg_deal_size: 3250,
            conversions: 18
          },
          {
            agent: 'sales_agent_1',
            deals: 25,
            revenue: 60000,
            avg_deal_size: 2400,
            conversions: 14
          }
        ],
        dailyTrend: [
          { date: '2024-01-15', deals: 2, revenue: 5500, conversions: 2 },
          { date: '2024-01-16', deals: 3, revenue: 8200, conversions: 2 },
          { date: '2024-01-17', deals: 1, revenue: 2800, conversions: 1 },
          { date: '2024-01-18', deals: 4, revenue: 12000, conversions: 3 },
          { date: '2024-01-19', deals: 3, revenue: 8500, conversions: 2 }
        ],
        monthlyTrend: [
          { month: '2023-12', deals: 38, revenue: 95000, conversions: 28 },
          { month: '2024-01', deals: 45, revenue: 125000, conversions: 32 }
        ],
        salesByService: [
          { service: 'Premium Package', deals: 15, revenue: 45000 },
          { service: 'Standard Package', deals: 20, revenue: 50000 },
          { service: 'Basic Package', deals: 10, revenue: 30000 }
        ],
        salesByProgram: [
          { program: 'Digital Marketing', deals: 25, revenue: 75000 },
          { program: 'SEO Services', deals: 20, revenue: 50000 }
        ],
        recentDeals: [
          {
            id: 1,
            customer_name: 'ABC Corp',
            amount: 5000,
            status: 'closed',
            sales_agent: 'manager',
            created_at: '2024-01-19 14:30:00'
          },
          {
            id: 2,
            customer_name: 'XYZ Ltd',
            amount: 3500,
            status: 'active',
            sales_agent: 'sales_agent_1',
            created_at: '2024-01-19 11:15:00'
          }
        ]
      };

    default:
      return { error: 'Unknown endpoint' };
  }
}
