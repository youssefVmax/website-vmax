import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';

interface UnifiedDataRequest {
  userRole: 'manager' | 'salesman' | 'team-leader';
  userId?: string;
  userName?: string;
  managedTeam?: string;
  dataTypes: string[]; // ['deals', 'callbacks', 'targets', 'notifications', 'users']
  dateRange?: string;
  limit?: number;
  offset?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userRole = searchParams.get('userRole') as 'manager' | 'salesman' | 'team-leader';
  const userId = searchParams.get('userId');
  const userName = searchParams.get('userName');
  const managedTeam = searchParams.get('managedTeam');
  const dataTypesParam = searchParams.get('dataTypes') || 'deals,callbacks,targets';
  const dateRange = searchParams.get('dateRange') || 'all';
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!userRole) {
    return NextResponse.json({ error: 'userRole is required' }, { status: 400 });
  }

  const dataTypes = dataTypesParam.split(',');
  
  try {
    // Test database connection first
    console.log('🔄 Unified Data API: Testing database connection...');
    await query('SELECT 1 as test');
    console.log('✅ Unified Data API: Database connection successful');

    const result: any = {
      success: true,
      data: {},
      metadata: {
        userRole,
        userId,
        userName,
        managedTeam,
        dataTypes,
        dateRange,
        timestamp: new Date().toISOString()
      }
    };

    console.log('🔄 Unified Data API: Fetching data types:', dataTypes, 'for role:', userRole);

    // Fetch deals if requested
    if (dataTypes.includes('deals')) {
      try {
        console.log('🔄 Unified Data API: Starting deals query...');
        
        // Use a simpler, more robust query first
        let dealsQuery = `SELECT 
          id, DealID, customerName, 
          COALESCE(amountPaid, amount, totalAmount, 0) as amount_paid,
          COALESCE(amountPaid, amount, totalAmount, 0) as amount,
          SalesAgentID, ClosingAgentID, 
          salesAgentName, closingAgentName,
          serviceTier, salesTeam, 
          signupDate, created_at, updated_at, status,
          email, phoneNumber, durationMonths
        FROM deals WHERE 1=1`;
        const dealsParams: any[] = [];

        console.log('🔄 Unified Data API: Base query prepared');

        // Apply role-based filtering
        if (userRole === 'salesman' && userId) {
          dealsQuery += ' AND (SalesAgentID = ? OR ClosingAgentID = ?)';
          dealsParams.push(userId, userId);
          console.log('🔄 Unified Data API: Applied salesman filtering');
        } else if (userRole === 'team-leader' && managedTeam) {
          dealsQuery += ' AND (salesTeam = ? OR SalesAgentID = ?)';
          dealsParams.push(managedTeam, userId);
          console.log('🔄 Unified Data API: Applied team-leader filtering');
        }

        // Apply date filtering
        if (dateRange !== 'all') {
          try {
            const dateCondition = getDateCondition(dateRange, '');
            if (dateCondition) {
              dealsQuery += ` AND ${dateCondition}`;
              console.log('🔄 Unified Data API: Applied date filtering:', dateRange);
            }
          } catch (dateError) {
            console.warn('⚠️ Unified Data API: Date filtering failed, continuing without it:', dateError);
          }
        }

        dealsQuery += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        dealsParams.push(limit, offset);

        console.log('🔄 Unified Data API: Final query:', dealsQuery);
        console.log('🔄 Unified Data API: Query params:', dealsParams);

        const [dealsResult] = await query(dealsQuery, dealsParams);
        result.data.deals = Array.isArray(dealsResult) ? dealsResult : [];
        console.log('✅ Unified Data API: Fetched', result.data.deals.length, 'deals');
        
        // Log sample data for debugging
        if (result.data.deals.length > 0) {
          console.log('🔍 Unified Data API: Sample deal:', result.data.deals[0]);
        }
        
      } catch (error) {
        console.error('❌ Error fetching deals:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        result.data.deals = [];
      }
    }

    // Fetch callbacks if requested
    if (dataTypes.includes('callbacks')) {
      try {
        console.log('🔄 Unified Data API: Starting callbacks query...');
        
        let callbacksQuery = 'SELECT * FROM callbacks WHERE 1=1';
        const callbacksParams: any[] = [];

        // Apply role-based filtering
        if (userRole === 'salesman' && userId) {
          callbacksQuery += ' AND SalesAgentID = ?';
          callbacksParams.push(userId);
          console.log('🔄 Unified Data API: Applied salesman filtering for callbacks');
        } else if (userRole === 'team-leader' && managedTeam) {
          callbacksQuery += ' AND (sales_team = ? OR SalesAgentID = ?)';
          callbacksParams.push(managedTeam, userId);
          console.log('🔄 Unified Data API: Applied team-leader filtering for callbacks');
        }

        // Apply date filtering
        if (dateRange !== 'all') {
          try {
            const dateCondition = getDateCondition(dateRange, '');
            if (dateCondition) {
              callbacksQuery += ` AND ${dateCondition}`;
              console.log('🔄 Unified Data API: Applied date filtering for callbacks:', dateRange);
            }
          } catch (dateError) {
            console.warn('⚠️ Unified Data API: Callback date filtering failed, continuing without it:', dateError);
          }
        }

        callbacksQuery += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        callbacksParams.push(limit, offset);

        console.log('🔄 Unified Data API: Final callbacks query:', callbacksQuery);

        const [callbacksResult] = await query(callbacksQuery, callbacksParams);
        result.data.callbacks = Array.isArray(callbacksResult) ? callbacksResult : [];
        console.log('✅ Unified Data API: Fetched', result.data.callbacks.length, 'callbacks');
      } catch (error) {
        console.error('❌ Error fetching callbacks:', error);
        console.error('❌ Callback error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        result.data.callbacks = [];
      }
    }

    // Fetch targets if requested
    if (dataTypes.includes('targets')) {
      try {
        console.log('🔄 Unified Data API: Starting targets query...');
        
        let targetsQuery = 'SELECT * FROM targets WHERE 1=1';
        const targetsParams: any[] = [];

        // Apply role-based filtering
        if (userRole === 'salesman' && userId) {
          targetsQuery += ' AND agentId = ?';
          targetsParams.push(userId);
        } else if (userRole === 'team-leader' && managedTeam) {
          targetsQuery += ' AND (managerId = ? OR agentId = ?)';
          targetsParams.push(managedTeam, userId);
        }

        targetsQuery += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        targetsParams.push(limit, offset);

        console.log('🔄 Unified Data API: Final targets query:', targetsQuery);

        const [targetsResult] = await query(targetsQuery, targetsParams);
        result.data.targets = Array.isArray(targetsResult) ? targetsResult : [];
        console.log('✅ Unified Data API: Fetched', result.data.targets.length, 'targets');
      } catch (error) {
        console.error('❌ Error fetching targets:', error);
        result.data.targets = [];
      }
    }

    // Fetch notifications if requested
    if (dataTypes.includes('notifications')) {
      try {
        console.log('🔄 Unified Data API: Starting notifications query...');
        
        let notificationsQuery = 'SELECT * FROM notifications WHERE 1=1';
        const notificationsParams: any[] = [];

        // Apply role-based filtering for notifications
        if (userRole === 'salesman' && userId) {
          notificationsQuery += ' AND (salesAgentId = ? OR JSON_CONTAINS(`to`, JSON_QUOTE(?)))';
          notificationsParams.push(userId, userId);
        } else if (userRole === 'team-leader' && managedTeam) {
          notificationsQuery += ' AND (teamName = ? OR salesAgentId = ? OR JSON_CONTAINS(`to`, JSON_QUOTE(?)))';
          notificationsParams.push(managedTeam, userId, userId);
        }

        notificationsQuery += ` ORDER BY COALESCE(timestamp, created_at) DESC LIMIT ? OFFSET ?`;
        notificationsParams.push(limit, offset);

        console.log('🔄 Unified Data API: Final notifications query:', notificationsQuery);

        const [notificationsResult] = await query(notificationsQuery, notificationsParams);
        result.data.notifications = Array.isArray(notificationsResult) ? notificationsResult : [];
        console.log('✅ Unified Data API: Fetched', result.data.notifications.length, 'notifications');
      } catch (error) {
        console.error('❌ Error fetching notifications:', error);
        result.data.notifications = [];
      }
    }

    // Fetch users if requested (manager only)
    if (dataTypes.includes('users') && userRole === 'manager') {
      try {
        console.log('🔄 Unified Data API: Starting users query...');
        
        const usersQuery = 'SELECT id, username, name, email, role, team, phone, managedTeam, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?';
        const [usersResult] = await query(usersQuery, [limit, offset]);
        result.data.users = Array.isArray(usersResult) ? usersResult : [];
        console.log('✅ Unified Data API: Fetched', result.data.users.length, 'users');
      } catch (error) {
        console.error('❌ Error fetching users:', error);
        result.data.users = [];
      }
    }

    // Calculate analytics if deals and callbacks are fetched
    if (dataTypes.includes('deals') && dataTypes.includes('callbacks')) {
      try {
        const analytics = calculateQuickAnalytics(result.data.deals || [], result.data.callbacks || []);
        result.data.analytics = analytics;
        console.log('✅ Unified Data API: Calculated analytics');
      } catch (error) {
        console.error('❌ Error calculating analytics:', error);
        result.data.analytics = null;
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Unified Data API error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userRole,
      dataTypes,
      userId,
      userName
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch unified data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        debug: {
          userRole,
          dataTypes,
          userId,
          userName
        }
      },
      { status: 500 }
    );
  }
}

function getDateCondition(dateRange: string, tablePrefix: string = ''): string | null {
  const columnName = tablePrefix ? `${tablePrefix}.created_at` : 'created_at';
  switch (dateRange) {
    case 'today':
      return `DATE(${columnName}) = CURDATE()`;
    case 'week':
      return `${columnName} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
    case 'month':
      return `${columnName} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
    case 'quarter':
      return `${columnName} >= DATE_SUB(NOW(), INTERVAL 90 DAY)`;
    case 'year':
      return `${columnName} >= DATE_SUB(NOW(), INTERVAL 365 DAY)`;
    default:
      return null;
  }
}

function calculateQuickAnalytics(deals: any[], callbacks: any[]) {
  const totalDeals = deals.length;
  const totalRevenue = deals.reduce((sum, deal) => sum + (parseFloat(deal.amount_paid) || 0), 0);
  const averageDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;
  
  const totalCallbacks = callbacks.length;
  const pendingCallbacks = callbacks.filter(cb => cb.status === 'pending').length;
  const completedCallbacks = callbacks.filter(cb => cb.status === 'completed').length;
  const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;

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
    timestamp: new Date().toISOString()
  };
}
