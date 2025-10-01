import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function addCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  return res;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole') || 'manager';
    const userId = searchParams.get('userId');
    const managedTeam = searchParams.get('managedTeam');

    console.log('🔄 Fetching dashboard stats:', { userRole, userId, managedTeam });

    // First, let's check if the tables exist
    try {
      const [tablesResult] = await query<any>('SHOW TABLES');
      console.log('📋 Available tables:', tablesResult.map((row: any) => Object.values(row)[0]));
    } catch (tableError) {
      console.error('❌ Error checking tables:', tableError);
    }

    // Build role-based filters
    const dealFilters: string[] = [];
    const callbackFilters: string[] = [];
    const dealParams: any[] = [];
    const callbackParams: any[] = [];

    // Apply role-based filtering
    if (userRole === 'salesman' && userId) {
      dealFilters.push('`SalesAgentID` = ?');
      dealParams.push(userId);
      callbackFilters.push('`SalesAgentID` = ?');
      callbackParams.push(userId);
    } else if (userRole === 'team_leader' && userId) {
      if (managedTeam) {
        dealFilters.push('(`SalesAgentID` = ? OR `sales_team` = ?)');
        dealParams.push(userId, managedTeam);
        callbackFilters.push('(`SalesAgentID` = ? OR `sales_team` = ?)');
        callbackParams.push(userId, managedTeam);
      } else {
        dealFilters.push('`SalesAgentID` = ?');
        dealParams.push(userId);
        callbackFilters.push('`SalesAgentID` = ?');
        callbackParams.push(userId);
      }
    }
    // Managers see all data (no additional filters)

    const dealWhere = dealFilters.length ? `WHERE ${dealFilters.join(' AND ')}` : '';
    const callbackWhere = callbackFilters.length ? `WHERE ${callbackFilters.join(' AND ')}` : '';

    // Execute queries one by one with better error handling
    let dealsResult, callbacksResult, notificationsResult, targetsResult, revenueResult, todayDealsResult, todayCallbacksResult;

    try {
      console.log('🔍 Querying deals count...');
      [dealsResult] = await query<any>(`SELECT COUNT(*) as count FROM deals ${dealWhere}`, dealParams);
      console.log('✅ Deals count:', dealsResult[0]?.count);
    } catch (error) {
      console.error('❌ Error querying deals:', error);
      dealsResult = [{ count: 0 }];
    }

    try {
      console.log('🔍 Querying callbacks count...');
      [callbacksResult] = await query<any>(`SELECT COUNT(*) as count FROM callbacks ${callbackWhere}`, callbackParams);
      console.log('✅ Callbacks count:', callbacksResult[0]?.count);
    } catch (error) {
      console.error('❌ Error querying callbacks:', error);
      callbacksResult = [{ count: 0 }];
    }

    try {
      console.log('🔍 Querying notifications count...');
      [notificationsResult] = await query<any>(`SELECT COUNT(*) as count FROM notifications ${
        userRole !== 'manager' && userId ? 'WHERE JSON_CONTAINS(`to`, JSON_QUOTE(?))' : ''
      }`, userRole !== 'manager' && userId ? [userId] : []);
      console.log('✅ Notifications count:', notificationsResult[0]?.count);
    } catch (error) {
      console.error('❌ Error querying notifications:', error);
      notificationsResult = [{ count: 0 }];
    }

    try {
      console.log('🔍 Querying targets count...');
      [targetsResult] = await query<any>(`SELECT COUNT(*) as count FROM targets ${
        userRole === 'salesman' && userId ? 'WHERE `agentId` = ?' : 
        userRole === 'team_leader' && managedTeam ? 'WHERE (`agentId` = ? OR `managerId` = ?)' : ''
      }`, 
      userRole === 'salesman' && userId ? [userId] : 
      userRole === 'team_leader' && managedTeam ? [userId, userId] : []);
      console.log('✅ Targets count:', targetsResult[0]?.count);
    } catch (error) {
      console.error('❌ Error querying targets:', error);
      targetsResult = [{ count: 0 }];
    }

    try {
      console.log('🔍 Querying total revenue...');
      [revenueResult] = await query<any>(`SELECT COALESCE(SUM(amount_paid), 0) as revenue FROM deals ${dealWhere}`, dealParams);
      console.log('✅ Total revenue:', revenueResult[0]?.revenue);
    } catch (error) {
      console.error('❌ Error querying revenue:', error);
      revenueResult = [{ revenue: 0 }];
    }

    try {
      console.log('🔍 Querying today deals...');
      [todayDealsResult] = await query<any>(`SELECT COUNT(*) as count FROM deals ${dealWhere ? dealWhere + ' AND' : 'WHERE'} DATE(created_at) = CURDATE()`, dealParams);
      console.log('✅ Today deals:', todayDealsResult[0]?.count);
    } catch (error) {
      console.error('❌ Error querying today deals:', error);
      todayDealsResult = [{ count: 0 }];
    }

    try {
      console.log('🔍 Querying today callbacks...');
      [todayCallbacksResult] = await query<any>(`SELECT COUNT(*) as count FROM callbacks ${callbackWhere ? callbackWhere + ' AND' : 'WHERE'} DATE(created_at) = CURDATE()`, callbackParams);
      console.log('✅ Today callbacks:', todayCallbacksResult[0]?.count);
    } catch (error) {
      console.error('❌ Error querying today callbacks:', error);
      todayCallbacksResult = [{ count: 0 }];
    }

    // Calculate additional metrics
    const totalDeals = dealsResult[0]?.count || 0;
    const totalCallbacks = callbacksResult[0]?.count || 0;
    const totalNotifications = notificationsResult[0]?.count || 0;
    const totalTargets = targetsResult[0]?.count || 0;
    const totalRevenue = revenueResult[0]?.revenue || 0;
    const todayDeals = todayDealsResult[0]?.count || 0;
    const todayCallbacks = todayCallbacksResult[0]?.count || 0;

    // Get average deal size
    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

    // Get pending callbacks
    let pendingCallbacks = 0;
    try {
      console.log('🔍 Querying pending callbacks...');
      const [pendingCallbacksResult] = await query<any>(
        `SELECT COUNT(*) as count FROM callbacks ${callbackWhere ? callbackWhere + ' AND' : 'WHERE'} status = 'pending'`, 
        callbackParams
      );
      pendingCallbacks = pendingCallbacksResult[0]?.count || 0;
      console.log('✅ Pending callbacks:', pendingCallbacks);
    } catch (error) {
      console.error('❌ Error querying pending callbacks:', error);
    }

    // Get overdue callbacks
    let overdueCallbacks = 0;
    try {
      console.log('🔍 Querying overdue callbacks...');
      const [overdueCallbacksResult] = await query<any>(
        `SELECT COUNT(*) as count FROM callbacks ${callbackWhere ? callbackWhere + ' AND' : 'WHERE'} scheduled_date < CURDATE() AND status != 'completed'`, 
        callbackParams
      );
      overdueCallbacks = overdueCallbacksResult[0]?.count || 0;
      console.log('✅ Overdue callbacks:', overdueCallbacks);
    } catch (error) {
      console.error('❌ Error querying overdue callbacks:', error);
    }

    const dashboardStats = {
      deals: totalDeals,
      callbacks: totalCallbacks,
      notifications: totalNotifications,
      targets: totalTargets,
      revenue: totalRevenue,
      avgDealSize: Math.round(avgDealSize),
      todayDeals,
      todayCallbacks,
      pendingCallbacks,
      overdueCallbacks,
      // Additional computed metrics
      conversionRate: totalCallbacks > 0 ? Math.round((totalDeals / totalCallbacks) * 100) : 0,
      revenueGrowth: 0, // Would need historical data to calculate
      userRole,
      userId,
      managedTeam,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Dashboard stats calculated:', dashboardStats);

    return addCorsHeaders(NextResponse.json({
      success: true,
      data: dashboardStats,
      ...dashboardStats // For backward compatibility
    }));

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}
