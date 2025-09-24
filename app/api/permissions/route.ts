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
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const checkType = searchParams.get('checkType'); // 'export', 'data_access', 'all'

    if (!userId || !userRole) {
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        error: 'userId and userRole are required' 
      }, { status: 400 }));
    }

    // Define role-based permissions
    const permissions = {
      manager: {
        data_access: {
          deals: { own: true, team: true, all: true },
          callbacks: { own: true, team: true, all: true },
          targets: { own: true, team: true, all: true },
          notifications: { own: true, team: true, all: true },
          feedback: { own: true, team: true, all: true },
          analytics: { own: true, team: true, all: true }
        },
        actions: {
          export: true,
          create_notifications: true,
          manage_users: true,
          view_all_performance: true,
          assign_targets: true,
          respond_to_feedback: true
        }
      },
      team_leader: {
        data_access: {
          deals: { own: true, team: true, all: false },
          callbacks: { own: true, team: true, all: false },
          targets: { own: true, team: true, all: false },
          notifications: { own: true, team: false, all: false },
          feedback: { own: true, team: false, all: false },
          analytics: { own: true, team: true, all: false }
        },
        actions: {
          export: false,
          create_notifications: false,
          manage_users: false,
          view_all_performance: false,
          assign_targets: false,
          respond_to_feedback: false,
          submit_feedback: true
        }
      },
      salesman: {
        data_access: {
          deals: { own: true, team: false, all: false },
          callbacks: { own: true, team: false, all: false },
          targets: { own: true, team: false, all: false },
          notifications: { own: true, team: false, all: false },
          feedback: { own: true, team: false, all: false },
          analytics: { own: true, team: false, all: false }
        },
        actions: {
          export: false,
          create_notifications: false,
          manage_users: false,
          view_all_performance: false,
          assign_targets: false,
          respond_to_feedback: false,
          submit_feedback: true
        }
      }
    };

    const userPermissions = permissions[userRole as keyof typeof permissions];
    
    if (!userPermissions) {
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        error: 'Invalid user role' 
      }, { status: 400 }));
    }

    // Get user's managed team if team leader
    let managedTeam = null;
    if (userRole === 'team_leader') {
      const [userRows] = await query<any>(
        'SELECT `managedTeam` FROM `users` WHERE `id` = ?',
        [userId]
      );
      managedTeam = userRows[0]?.managedTeam;
    }

    const response = {
      success: true,
      userId,
      userRole,
      managedTeam,
      permissions: userPermissions,
      filters: {
        // SQL filters for data access
        deals: generateDataFilter(userRole, userId, managedTeam, 'deals'),
        callbacks: generateDataFilter(userRole, userId, managedTeam, 'callbacks'),
        targets: generateDataFilter(userRole, userId, managedTeam, 'targets'),
        notifications: generateDataFilter(userRole, userId, managedTeam, 'notifications')
      }
    };

    return addCorsHeaders(NextResponse.json(response));
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch permissions' 
    }, { status: 502 }));
  }
}

function generateDataFilter(userRole: string, userId: string, managedTeam: string | null, entityType: string) {
  switch (userRole) {
    case 'manager':
      return { where: '', params: [] }; // No filter - can see all data
    
    case 'team_leader':
      if (entityType === 'notifications' || entityType === 'feedback') {
        // Team leaders only see their own notifications and feedback
        return {
          where: 'WHERE `user_id` = ? OR `salesAgentId` = ?',
          params: [userId, userId]
        };
      } else {
        // Team leaders see their own data + their team's data
        return {
          where: 'WHERE (`SalesAgentID` = ? OR `sales_team` = ?)',
          params: [userId, managedTeam || '']
        };
      }
    
    case 'salesman':
      // Salesmen only see their own data
      return {
        where: 'WHERE `SalesAgentID` = ? OR `user_id` = ? OR `salesAgentId` = ?',
        params: [userId, userId, userId]
      };
    
    default:
      return { where: 'WHERE 1=0', params: [] }; // No access
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userRole, action, entityType, entityId } = body;

    // Check if user has permission for the requested action
    const permissionCheck = await checkUserPermission(userId, userRole, action, entityType);
    
    if (!permissionCheck.allowed) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        error: 'Permission denied',
        reason: permissionCheck.reason
      }, { status: 403 }));
    }

    return addCorsHeaders(NextResponse.json({
      success: true,
      allowed: true,
      message: 'Permission granted'
    }));
  } catch (error) {
    console.error('Error checking permissions:', error);
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Failed to check permissions' 
    }, { status: 502 }));
  }
}

async function checkUserPermission(userId: string, userRole: string, action: string, entityType: string) {
  const rolePermissions = {
    manager: ['export', 'create_notifications', 'manage_users', 'view_all_performance', 'assign_targets', 'respond_to_feedback'],
    team_leader: ['submit_feedback'],
    salesman: ['submit_feedback']
  };

  const allowedActions = rolePermissions[userRole as keyof typeof rolePermissions] || [];
  
  if (!allowedActions.includes(action)) {
    return {
      allowed: false,
      reason: `Role '${userRole}' is not permitted to perform action '${action}'`
    };
  }

  return { allowed: true, reason: null };
}
