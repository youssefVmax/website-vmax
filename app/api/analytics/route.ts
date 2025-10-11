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
      console.error('❌ Missing userRole parameter');
      return addCorsHeaders(NextResponse.json({ error: 'userRole is required' }, { status: 400 }));
    }

    if (!userId && userRole !== 'manager') {
      console.error('❌ Missing userId parameter for non-manager role');
      return addCorsHeaders(NextResponse.json({ error: 'userId is required for non-manager roles' }, { status: 400 }));
    }

    // Build base queries based on role
    let dealsQuery = 'SELECT d.*, COALESCE(u1.name, \'Unknown Agent\') as sales_agent_name, COALESCE(u2.name, d.closing_agent, \'Unknown Agent\') as closing_agent_name FROM deals d LEFT JOIN users u1 ON d.SalesAgentID = u1.id LEFT JOIN users u2 ON d.ClosingAgentID = u2.id WHERE 1=1';
    let callbacksQuery = 'SELECT c.*, COALESCE(u.name, c.sales_agent, \'Unknown Agent\') as agent_name, COALESCE(u.role, \'salesman\') as agent_role, COALESCE(u.team, c.sales_team, \'Unknown Team\') as agent_team FROM callbacks c LEFT JOIN users u ON (c.SalesAgentID = u.id OR c.created_by_id = u.id) WHERE 1=1';
    let targetsQuery = 'SELECT * FROM targets WHERE 1=1';
    let usersQuery = 'SELECT id, name, username, role, team FROM users WHERE 1=1';
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
    
    console.log('📊 Executing queries:', { 
      dealsQuery, 
      callbacksQuery, 
      targetsQuery,
      dealsParams,
      callbacksParams,
      targetsParams
    });
    
    let deals: any[] = [];
    let callbacks: any[] = [];
    let targets: any[] = [];
    let users: any[] = [];

    // Execute queries with timeout protection
    const queryTimeout = 20000; // 20 seconds timeout for complex queries

    try {
      const dealsPromise = query(dealsQuery, dealsParams);
      const dealsResult: any = await Promise.race([
        dealsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Deals query timeout')), queryTimeout))
      ]);
      deals = Array.isArray(dealsResult) ? dealsResult : (Array.isArray(dealsResult[0]) ? dealsResult[0] : []);
    } catch (error) {
      console.error('❌ Error fetching deals:', error);
      deals = [];
    }

    try {
      const callbacksPromise = query(callbacksQuery, callbacksParams);
      const callbacksResult: any = await Promise.race([
        callbacksPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Callbacks query timeout')), queryTimeout))
      ]);
      callbacks = Array.isArray(callbacksResult) ? callbacksResult : (Array.isArray(callbacksResult[0]) ? callbacksResult[0] : []);
    } catch (error) {
      console.error('❌ Error fetching callbacks:', error);
      callbacks = [];
    }

    try {
      const targetsPromise = query(targetsQuery, targetsParams);
      const targetsResult: any = await Promise.race([
        targetsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Targets query timeout')), queryTimeout))
      ]);
      targets = Array.isArray(targetsResult) ? targetsResult : (Array.isArray(targetsResult[0]) ? targetsResult[0] : []);
    } catch (error) {
      console.error('❌ Error fetching targets:', error);
      targets = [];
    }

    try {
      const usersPromise = query(usersQuery, []);
      const usersResult: any = await Promise.race([
        usersPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Users query timeout')), queryTimeout))
      ]);
      users = Array.isArray(usersResult) ? usersResult : (Array.isArray(usersResult[0]) ? usersResult[0] : []);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      users = [];
    }

    // Calculate analytics
    let analytics;
    try {
      analytics = calculateAnalytics(deals, callbacks, targets, users, userRole);
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
          dailyTrend: [],
          topCallbackCreators: []
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

function calculateAnalytics(deals: any[], callbacks: any[], targets: any[], users: any[], userRole: string) {
  
  // Calculate basic metrics
  const totalDeals = deals.length;
  const totalRevenue = deals.reduce((sum, deal) => sum + (parseFloat(deal.amount_paid) || 0), 0);
  const averageDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

  // Calculate callback metrics
  const totalCallbacks = callbacks.length;
  const pendingCallbacks = callbacks.filter(cb => cb.status === 'pending').length;
  const completedCallbacks = callbacks.filter(cb => cb.status === 'completed').length;
  const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;


  // Calculate Top Callback Creators with proper field mapping
  const callbackCreatorMap: { [key: string]: { 
    agentId: string; 
    userName: string; 
    userTeam: string; 
    userRole: string; 
    callbackCount: number; 
    completedCallbacks: number; 
    pendingCallbacks: number; 
    successRate: number;
  } } = {};

  callbacks.forEach((callback, index) => {
    // Use the JOINed user data from the query for better accuracy
    const agentId = callback.SalesAgentID || callback.salesAgentId || callback.created_by_id || callback.sales_agent_id || callback.created_by;
    const agentName = callback.agent_name || callback.sales_agent || callback.salesAgentName || callback.created_by || 'Unknown Agent';
    const agentTeam = callback.agent_team || callback.sales_team || callback.team || 'Unknown Team';
    const agentRole = callback.agent_role || 'salesman';
    
    if (agentId || agentName) {
      const creatorKey = agentId || agentName;
      
      if (!callbackCreatorMap[creatorKey]) {
        callbackCreatorMap[creatorKey] = {
          agentId: creatorKey,
          userName: agentName,
          userTeam: agentTeam,
          userRole: agentRole,
          callbackCount: 0,
          completedCallbacks: 0,
          pendingCallbacks: 0,
          successRate: 0
        };
      }
      
      const creator = callbackCreatorMap[creatorKey];
      creator.callbackCount += 1;
      
      if (callback.status === 'completed') {
        creator.completedCallbacks += 1;
      } else if (callback.status === 'pending') {
        creator.pendingCallbacks += 1;
      }
      
      // Calculate success rate
      creator.successRate = creator.callbackCount > 0 ? 
        (creator.completedCallbacks / creator.callbackCount) * 100 : 0;
    }
  });

  // Get top 3 callback creators sorted by callback count
  const topCallbackCreators = Object.values(callbackCreatorMap)
    .sort((a, b) => b.callbackCount - a.callbackCount)
    .slice(0, 3)
    .map((creator, index) => ({
      ...creator,
      rank: index + 1,
      successRate: parseFloat(creator.successRate.toFixed(1))
    }));
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
      dailyTrend: dailyTrendArray,
      topCallbackCreators
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
