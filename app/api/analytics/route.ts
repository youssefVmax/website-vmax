import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';

// Force dynamic rendering - NO CACHING
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AnalyticsFilters {
  userRole: 'manager' | 'salesman' | 'team_leader';
  userId?: string;
  userName?: string;
  managedTeam?: string;
  dateRange?: string;
}

function addCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  // CRITICAL: No caching headers
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('X-Accel-Expires', '0');
  return res;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole') as 'manager' | 'salesman' | 'team_leader';
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');
    const managedTeam = searchParams.get('managedTeam');
    const dateRange = searchParams.get('dateRange') || 'all';

    if (!userRole) {
      return NextResponse.json({ error: 'userRole is required' }, { status: 400 });
    }

    // Build base queries based on role
    let dealsQuery = 'SELECT * FROM deals WHERE 1=1';
    let callbacksQuery = 'SELECT * FROM callbacks WHERE 1=1';
    let targetsQuery = 'SELECT * FROM targets WHERE 1=1';
    const queryParams: any[] = [];

    // Apply role-based filtering using correct field names
    if (userRole === 'salesman' && userId) {
      dealsQuery += ' AND (SalesAgentID = ? OR ClosingAgentID = ?)';
      callbacksQuery += ' AND SalesAgentID = ?';
      targetsQuery += ' AND agentId = ?';
      queryParams.push(userId, userId, userId, userId);
    } else if (userRole === 'team_leader' && managedTeam) {
      dealsQuery += ' AND (sales_team = ? OR SalesAgentID = ?)';
      callbacksQuery += ' AND (sales_team = ? OR SalesAgentID = ?)';
      targetsQuery += ' AND (managerId = ? OR agentId = ?)';
      queryParams.push(managedTeam, userId, managedTeam, userId, managedTeam, userId);
    }
    // Manager sees all data (no additional filters)

    // Apply date range filtering
    if (dateRange !== 'all') {
      const dateCondition = getDateCondition(dateRange);
      if (dateCondition) {
        dealsQuery += ` AND ${dateCondition}`;
        callbacksQuery += ` AND ${dateCondition}`;
      }
    }

    // Execute queries with proper parameter handling
    console.log('Executing queries:', { dealsQuery, callbacksQuery, targetsQuery, queryParams });
    
    let deals: any[] = [];
    let callbacks: any[] = [];
    let targets: any[] = [];

    try {
      const [dealsResult] = await query(dealsQuery, getQueryParams(userRole, userId, managedTeam, 'deals'));
      deals = Array.isArray(dealsResult) ? dealsResult : [];
      console.log(`Found ${deals.length} deals`);
    } catch (error) {
      console.error('Error fetching deals:', error);
    }

    try {
      const [callbacksResult] = await query(callbacksQuery, getQueryParams(userRole, userId, managedTeam, 'callbacks'));
      callbacks = Array.isArray(callbacksResult) ? callbacksResult : [];
      console.log(`Found ${callbacks.length} callbacks`);
    } catch (error) {
      console.error('Error fetching callbacks:', error);
    }

    try {
      const [targetsResult] = await query(targetsQuery, getQueryParams(userRole, userId, managedTeam, 'targets'));
      targets = Array.isArray(targetsResult) ? targetsResult : [];
      console.log(`Found ${targets.length} targets`);
    } catch (error) {
      console.error('Error fetching targets:', error);
    }

    // Calculate analytics
    const analytics = calculateAnalytics(deals, callbacks, targets, userRole);

    return addCorsHeaders(NextResponse.json({
      success: true,
      data: {
        deals,
        callbacks,
        targets,
        analytics,
        filters: {
          userRole,
          userId,
          userName,
          managedTeam,
          dateRange
        }
      },
      timestamp: new Date().toISOString(),
      fresh: true // Indicator that this is fresh data
    }));

  } catch (error) {
    console.error('Analytics API error:', error);
    return addCorsHeaders(NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch analytics data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    ));
  }
}

function getQueryParams(userRole: string, userId?: string | null, managedTeam?: string | null, queryType?: string): any[] {
  const params: any[] = [];
  
  if (userRole === 'salesman' && userId) {
    if (queryType === 'deals') {
      params.push(userId, userId); // SalesAgentID, ClosingAgentID
    } else if (queryType === 'callbacks') {
      params.push(userId); // SalesAgentID
    } else if (queryType === 'targets') {
      params.push(userId); // agentId
    }
  } else if (userRole === 'team_leader' && managedTeam && userId) {
    if (queryType === 'deals') {
      params.push(managedTeam, userId); // sales_team, SalesAgentID
    } else if (queryType === 'callbacks') {
      params.push(managedTeam, userId); // sales_team, SalesAgentID
    } else if (queryType === 'targets') {
      params.push(managedTeam, userId); // managerId, agentId
    }
  }
  // Manager needs no params (sees all data)
  
  return params;
}

function getDateCondition(dateRange: string): string | null {
  const now = new Date();
  
  switch (dateRange) {
    case 'today':
      return `DATE(created_at) = CURDATE()`;
    case 'week':
      return `created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
    case 'month':
      return `created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
    case 'quarter':
      return `created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`;
    case 'year':
      return `created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)`;
    default:
      return null;
  }
}

function calculateAnalytics(deals: any[], callbacks: any[], targets: any[], userRole: string) {
  console.log(`📊 Calculating analytics for ${deals.length} deals, ${callbacks.length} callbacks, ${targets.length} targets`);
  
  // Calculate basic metrics
  const totalDeals = deals.length;
  const totalRevenue = deals.reduce((sum, deal) => sum + (parseFloat(deal.amount_paid) || 0), 0);
  const averageDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

  // Calculate callback metrics
  const totalCallbacks = callbacks.length;
  const pendingCallbacks = callbacks.filter(cb => cb.status === 'pending').length;
  const completedCallbacks = callbacks.filter(cb => cb.status === 'completed').length;
  const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;

  console.log(`💰 Revenue: $${totalRevenue}, Deals: ${totalDeals}, Callbacks: ${totalCallbacks}`);

  // Sales by agent (using correct field names)
  const salesByAgent: { [key: string]: { agent: string; sales: number; deals: number } } = {};
  deals.forEach(deal => {
    const agent = deal.sales_agent || deal.SalesAgentID || 'Unknown';
    if (!salesByAgent[agent]) {
      salesByAgent[agent] = { agent, sales: 0, deals: 0 };
    }
    salesByAgent[agent].sales += parseFloat(deal.amount_paid) || 0;
    salesByAgent[agent].deals += 1;
  });

  // Sales by service (using correct field names)
  const salesByService: { [key: string]: { service: string; sales: number } } = {};
  deals.forEach(deal => {
    const service = deal.service_tier || deal.product_type || 'Unknown';
    if (!salesByService[service]) {
      salesByService[service] = { service, sales: 0 };
    }
    salesByService[service].sales += parseFloat(deal.amount_paid) || 0;
  });

  // Sales by team (using correct field names)
  const salesByTeam: { [key: string]: { team: string; sales: number } } = {};
  deals.forEach(deal => {
    const team = deal.sales_team || 'Unknown';
    if (!salesByTeam[team]) {
      salesByTeam[team] = { team, sales: 0 };
    }
    salesByTeam[team].sales += parseFloat(deal.amount_paid) || 0;
  });

  // Daily trend (last 30 days) - using correct field names
  const dailyTrend: { [key: string]: { date: string; sales: number } } = {};
  deals.forEach(deal => {
    const date = deal.signup_date || (deal.created_at ? new Date(deal.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    if (!dailyTrend[date]) {
      dailyTrend[date] = { date, sales: 0 };
    }
    dailyTrend[date].sales += parseFloat(deal.amount_paid) || 0;
  });

  // Convert to arrays and sort
  const topAgents = Object.values(salesByAgent)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  const serviceDistribution = Object.values(salesByService)
    .sort((a, b) => b.sales - a.sales);

  const teamDistribution = Object.values(salesByTeam)
    .sort((a, b) => b.sales - a.sales);

  const dailyTrendArray = Object.values(dailyTrend)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30); // Last 30 days

  // Recent deals
  const recentDeals = deals
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return {
    overview: {
      totalDeals,
      totalRevenue,
      averageDealSize,
      totalCallbacks,
      pendingCallbacks,
      completedCallbacks,
      conversionRate
    },
    charts: {
      topAgents,
      serviceDistribution,
      teamDistribution,
      dailyTrend: dailyTrendArray
    },
    tables: {
      recentDeals,
      recentCallbacks: callbacks.slice(0, 10)
    },
    targets: {
      total: targets.length,
      achieved: targets.filter(t => (t.current_amount || 0) >= (t.target_amount || 0)).length,
      progress: targets.map(t => ({
        agent: t.agent_name || t.agent_id,
        target: t.target_amount || 0,
        current: t.current_amount || 0,
        percentage: t.target_amount > 0 ? ((t.current_amount || 0) / t.target_amount) * 100 : 0
      }))
    }
  };
}
