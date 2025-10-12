import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/server/db';

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
    const dateRange = searchParams.get('dateRange'); // Number of days to look back

    // First, let's check if the tables exist
    try {
      const [tablesResult] = await query<any>('SHOW TABLES');
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
    
    if (dateRange && dateRange !== 'all') {
      const days = parseInt(dateRange);
      if (!isNaN(days) && days > 0) {
        dealFilters.push('`created_at` >= DATE_SUB(NOW(), INTERVAL ? DAY)');
        dealParams.push(days);
        callbackFilters.push('`created_at` >= DATE_SUB(NOW(), INTERVAL ? DAY)');
        callbackParams.push(days);
      }
    }

    const dealWhere = dealFilters.length ? `WHERE ${dealFilters.join(' AND ')}` : '';
    const callbackWhere = callbackFilters.length ? `WHERE ${callbackFilters.join(' AND ')}` : '';

    // Execute queries one by one with better error handling
    let dealsResult, callbacksResult, notificationsResult, targetsResult, revenueResult, todayDealsResult, todayCallbacksResult;

    try {   [dealsResult] = await query<any>(`SELECT COUNT(*) as count FROM deals ${dealWhere}`, dealParams);
    } catch (error) {
      console.error('❌ Error querying deals:', error);
      dealsResult = [{ count: 0 }];
    }

    try {
      [callbacksResult] = await query<any>(`SELECT COUNT(*) as count FROM callbacks ${callbackWhere}`, callbackParams);
    } catch (error) {
      console.error('❌ Error querying callbacks:', error);
      callbacksResult = [{ count: 0 }];
    }

    try {
      [notificationsResult] = await query<any>(`SELECT COUNT(*) as count FROM notifications ${
        userRole !== 'manager' && userId ? 'WHERE JSON_CONTAINS(`to`, JSON_QUOTE(?))' : ''
      }`, userRole !== 'manager' && userId ? [userId] : []);
    } catch (error) {
      console.error('❌ Error querying notifications:', error);
      notificationsResult = [{ count: 0 }];
    }

    try {
      [targetsResult] = await query<any>(`SELECT COUNT(*) as count FROM targets ${
        userRole === 'salesman' && userId ? 'WHERE `agentId` = ?' : 
        userRole === 'team_leader' && managedTeam ? 'WHERE (`agentId` = ? OR `managerId` = ?)' : ''
      }`, 
      userRole === 'salesman' && userId ? [userId] : 
      userRole === 'team_leader' && managedTeam ? [userId, userId] : []);
    } catch (error) {
      console.error('❌ Error querying targets:', error);
      targetsResult = [{ count: 0 }];
    }

    try {
      [revenueResult] = await query<any>(`SELECT COALESCE(SUM(amount_paid), 0) as revenue FROM deals ${dealWhere}`, dealParams);
    } catch (error) {
      console.error('❌ Error querying revenue:', error);
      revenueResult = [{ revenue: 0 }];
    }

    try {
      [todayDealsResult] = await query<any>(`SELECT COUNT(*) as count FROM deals ${dealWhere ? dealWhere + ' AND' : 'WHERE'} DATE(created_at) = CURDATE()`, dealParams);
    } catch (error) {
      console.error('❌ Error querying today deals:', error);
      todayDealsResult = [{ count: 0 }];
    }

    try {
      [todayCallbacksResult] = await query<any>(`SELECT COUNT(*) as count FROM callbacks ${callbackWhere ? callbackWhere + ' AND' : 'WHERE'} DATE(created_at) = CURDATE()`, callbackParams);
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
