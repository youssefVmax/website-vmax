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
    console.log('🔍 Analytics API called:', request.url);
    
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole') as 'manager' | 'salesman' | 'team_leader';
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');
    const managedTeam = searchParams.get('managedTeam');
    const dateRange = searchParams.get('dateRange') || 'all';

    console.log('📋 Analytics request params:', { userRole, userId, userName, managedTeam, dateRange });

    if (!userRole) {
      console.error('❌ Missing userRole parameter');
      return addCorsHeaders(NextResponse.json({ error: 'userRole is required' }, { status: 400 }));
    }

    if (!userId && userRole !== 'manager') {
      console.error('❌ Missing userId parameter for non-manager role');
      return addCorsHeaders(NextResponse.json({ error: 'userId is required for non-manager roles' }, { status: 400 }));
    }

    // Build base queries based on role
    let dealsQuery = 'SELECT d.*, COALESCE(u1.name, \'Unknown Agent\') as sales_agent_name, COALESCE(u2.name, d.closing_agent, \'Unknown Agent\') as closing_agent_name FROM deals d LEFT JOIN users u1 ON d.SalesAgentID = u1.id LEFT JOIN users u2 ON d.ClosingAgentID = u2.id WHERE 1=1';
    let callbacksQuery = 'SELECT * FROM callbacks WHERE 1=1';
    let targetsQuery = 'SELECT * FROM targets WHERE 1=1';
    const queryParams: any[] = [];

    // Apply role-based filtering using correct field names
    if (userRole === 'salesman' && userId) {
      dealsQuery += ' AND (d.SalesAgentID = ? OR d.ClosingAgentID = ?)';
      callbacksQuery += ' AND SalesAgentID = ?';
      targetsQuery += ' AND agentId = ?';
    } else if (userRole === 'team_leader' && userId) {
      if (managedTeam) {
        dealsQuery += ' AND (d.SalesAgentID = ? OR d.sales_team = ?)';
        callbacksQuery += ' AND (SalesAgentID = ? OR sales_team = ?)';
        targetsQuery += ' AND (managerId = ? OR agentId = ?)';
      } else {
        dealsQuery += ' AND d.SalesAgentID = ?';
        callbacksQuery += ' AND SalesAgentID = ?';
        targetsQuery += ' AND agentId = ?';
      }
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
    const dealsParams = getQueryParams(userRole, userId, managedTeam, 'deals');
    const callbacksParams = getQueryParams(userRole, userId, managedTeam, 'callbacks');
    const targetsParams = getQueryParams(userRole, userId, managedTeam, 'targets');
    
    
    let deals: any[] = [];
    let callbacks: any[] = [];
    let targets: any[] = [];

    // Execute queries with timeout protection
    const queryTimeout = 10000; // 10 seconds timeout

    try {
      console.log('🔍 Fetching deals...');
      const dealsPromise = query(dealsQuery, dealsParams);
      const dealsResult: any = await Promise.race([
        dealsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Deals query timeout')), queryTimeout))
      ]);
      deals = Array.isArray(dealsResult) ? dealsResult : (Array.isArray(dealsResult[0]) ? dealsResult[0] : []);
      console.log(`✅ Found ${deals.length} deals`);
    } catch (error) {
      console.error('❌ Error fetching deals:', error);
      deals = [];
    }

    try {
      console.log('📞 Fetching callbacks...');
      const callbacksPromise = query(callbacksQuery, callbacksParams);
      const callbacksResult: any = await Promise.race([
        callbacksPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Callbacks query timeout')), queryTimeout))
      ]);
      callbacks = Array.isArray(callbacksResult) ? callbacksResult : (Array.isArray(callbacksResult[0]) ? callbacksResult[0] : []);
      console.log(`✅ Found ${callbacks.length} callbacks`);
    } catch (error) {
      console.error('❌ Error fetching callbacks:', error);
      callbacks = [];
    }

    try {
      console.log('🎯 Fetching targets...');
      const targetsPromise = query(targetsQuery, targetsParams);
      const targetsResult: any = await Promise.race([
        targetsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Targets query timeout')), queryTimeout))
      ]);
      targets = Array.isArray(targetsResult) ? targetsResult : (Array.isArray(targetsResult[0]) ? targetsResult[0] : []);
      console.log(`✅ Found ${targets.length} targets`);
    } catch (error) {
      console.error('❌ Error fetching targets:', error);
      targets = [];
    }

    // Calculate analytics
    console.log('📊 Calculating analytics...');
    let analytics;
    try {
      analytics = calculateAnalytics(deals, callbacks, targets, userRole);
      console.log('✅ Analytics calculated successfully');
    } catch (error) {
      console.error('❌ Error calculating analytics:', error);
      analytics = {
        overview: {
          totalDeals: deals.length,
          totalRevenue: 0,
          averageDealSize: 0,
          totalCallbacks: callbacks.length,
          pendingCallbacks: 0,
          completedCallbacks: 0,
          conversionRate: 0
        },
        charts: {
          topAgents: [],
          serviceDistribution: [],
          teamDistribution: [],
          dailyTrend: []
        },
        tables: {
          recentDeals: deals.slice(0, 10),
          recentCallbacks: callbacks.slice(0, 10)
        },
        targets: {
          total: targets.length,
          achieved: 0,
          progress: []
        }
      };
    }

    console.log('🎉 Analytics API response ready');
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
  } else if (userRole === 'team_leader' && userId) {
    if (managedTeam) {
      if (queryType === 'deals') {
        params.push(userId, managedTeam); // SalesAgentID, sales_team
      } else if (queryType === 'callbacks') {
        params.push(userId, managedTeam); // SalesAgentID, sales_team
      } else if (queryType === 'targets') {
        params.push(managedTeam, userId); // managerId, agentId
      }
    } else {
      if (queryType === 'deals') {
        params.push(userId); // SalesAgentID only
      } else if (queryType === 'callbacks') {
        params.push(userId); // SalesAgentID only
      } else if (queryType === 'targets') {
        params.push(userId); // agentId only
      }
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
    const agent = deal.sales_agent_name || deal.sales_agent || deal.SalesAgentID || 'Unknown';
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
