import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

// Next-only Analytics API (no placeholders, no PHP proxy)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const userRole = searchParams.get('user_role');
    const userId = searchParams.get('user_id');
    const dateRange = searchParams.get('date_range');
    const team = searchParams.get('team');

    // Build filters
    const dealWhere: string[] = [];
    const dealParams: any[] = [];
    const cbWhere: string[] = [];
    const cbParams: any[] = [];

    if (team) { dealWhere.push('`sales_team` = ?'); dealParams.push(team); cbWhere.push('`sales_team` = ?'); cbParams.push(team); }
    if (userRole === 'salesman' && userId) {
      dealWhere.push('`SalesAgentID` = ?'); dealParams.push(userId);
      cbWhere.push('`SalesAgentID` = ?'); cbParams.push(userId);
    }
    if (dateRange === 'today') {
      dealWhere.push('`signup_date` = CURDATE()');
      cbWhere.push('`scheduled_date` = CURDATE()');
    }

    const dealWhereSql = dealWhere.length ? `WHERE ${dealWhere.join(' AND ')}` : '';
    const cbWhereSql = cbWhere.length ? `WHERE ${cbWhere.join(' AND ')}` : '';

    // Dashboard stats
    if (endpoint === 'dashboard-stats' || !endpoint) {
      const [dealTotals] = await query<any>(`SELECT COUNT(*) as total_deals, COALESCE(SUM(amount_paid),0) as total_revenue FROM \`deals\` ${dealWhereSql}`, dealParams);
      const [todayDeals] = await query<any>(`SELECT COUNT(*) as today_deals, COALESCE(SUM(amount_paid),0) as today_revenue FROM \`deals\` WHERE signup_date = CURDATE() ${dealWhere.length ? ' AND ' + dealWhere.join(' AND ') : ''}`, dealParams);
      const [cbTotals] = await query<any>(`SELECT COUNT(*) as total_callbacks FROM \`callbacks\` ${cbWhereSql}`, cbParams);
      const [cbPending] = await query<any>(`SELECT COUNT(*) as pending_callbacks FROM \`callbacks\` ${cbWhereSql}${cbWhereSql ? ' AND' : ' WHERE'} status = 'pending'`, cbParams);
      const [cbToday] = await query<any>(`SELECT COUNT(*) as today_callbacks FROM \`callbacks\` WHERE scheduled_date = CURDATE() ${cbWhere.length ? ' AND ' + cbWhere.join(' AND ') : ''}`, cbParams);

      const data = {
        total_deals: dealTotals[0]?.total_deals || 0,
        total_revenue: Number(dealTotals[0]?.total_revenue || 0),
        today_deals: todayDeals[0]?.today_deals || 0,
        today_revenue: Number(todayDeals[0]?.today_revenue || 0),
        total_callbacks: cbTotals[0]?.total_callbacks || 0,
        pending_callbacks: cbPending[0]?.pending_callbacks || 0,
        today_callbacks: cbToday[0]?.today_callbacks || 0,
      };

      const response = NextResponse.json({ ...data, success: true });
      return addCorsHeaders(response);
    }

    // Unknown endpoint
    const response = NextResponse.json({ success: false, error: 'Unknown analytics endpoint' }, { status: 400 });
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Analytics API error:', error);
    const response = NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 502 }
    );
    return addCorsHeaders(response);
  }
}
 
