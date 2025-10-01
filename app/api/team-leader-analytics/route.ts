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

// Team Leader Analytics API - Provides separate analytics for team and personal data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const managedTeam = searchParams.get('managed_team');
    const dateRange = searchParams.get('date_range') || 'all';
    const endpoint = searchParams.get('endpoint') || 'full-analytics';

    console.log('🔍 Team Leader Analytics API:', { userId, managedTeam, dateRange, endpoint });

    if (!userId || !managedTeam) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameters: user_id and managed_team'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Test database connection
    try {
      await query('SELECT 1 as test');
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      const response = NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 503 });
      return addCorsHeaders(response);
    }

    // Date filtering
    let dateFilter = '';
    const dateParams: any[] = [];
    
    if (dateRange === 'today') {
      dateFilter = 'AND DATE(created_at) = CURDATE()';
    } else if (dateRange === 'week') {
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (dateRange === 'month') {
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (dateRange === 'quarter') {
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
    }

    // Get team analytics (excluding personal data)
    const teamDealsQuery = `
      SELECT 
        COUNT(*) as total_deals,
        COALESCE(SUM(amount_paid), 0) as total_revenue,
        COALESCE(AVG(amount_paid), 0) as avg_deal_size,
        COUNT(DISTINCT SalesAgentID) as unique_agents,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_deals,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_deals
      FROM deals 
      WHERE sales_team = ? 
        AND SalesAgentID != ? 
        ${dateFilter}
    `;

    const teamCallbacksQuery = `
      SELECT 
        COUNT(*) as total_callbacks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_callbacks,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_callbacks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_callbacks,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_callbacks
      FROM callbacks 
      WHERE sales_team = ? 
        AND SalesAgentID != ? 
        ${dateFilter}
    `;

    // Get personal analytics
    const personalDealsQuery = `
      SELECT 
        COUNT(*) as total_deals,
        COALESCE(SUM(amount_paid), 0) as total_revenue,
        COALESCE(AVG(amount_paid), 0) as avg_deal_size,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_deals,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_deals
      FROM deals 
      WHERE SalesAgentID = ? 
        ${dateFilter}
    `;

    const personalCallbacksQuery = `
      SELECT 
        COUNT(*) as total_callbacks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_callbacks,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_callbacks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_callbacks,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_callbacks
      FROM callbacks 
      WHERE SalesAgentID = ? 
        ${dateFilter}
    `;

    // Execute queries
    const teamDealsResult = await query<any>(teamDealsQuery, [managedTeam, userId]);
    const teamCallbacksResult = await query<any>(teamCallbacksQuery, [managedTeam, userId]);
    const personalDealsResult = await query<any>(personalDealsQuery, [userId]);
    const personalCallbacksResult = await query<any>(personalCallbacksQuery, [userId]);

    const teamDeals = teamDealsResult[0][0] || {};
    const teamCallbacks = teamCallbacksResult[0][0] || {};
    const personalDeals = personalDealsResult[0][0] || {};
    const personalCallbacks = personalCallbacksResult[0][0] || {};

    // Get team member performance
    const teamMembersQuery = `
      SELECT 
        u.id,
        u.name,
        u.username,
        COUNT(d.id) as deals_count,
        COALESCE(SUM(d.amount_paid), 0) as total_revenue,
        COALESCE(AVG(d.amount_paid), 0) as avg_deal_size,
        COUNT(c.id) as callbacks_count,
        COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_callbacks
      FROM users u
      LEFT JOIN deals d ON u.id = d.SalesAgentID ${dateFilter.replace('created_at', 'd.created_at')}
      LEFT JOIN callbacks c ON u.id = c.SalesAgentID ${dateFilter.replace('created_at', 'c.created_at')}
      WHERE u.team = ? AND u.id != ?
      GROUP BY u.id, u.name, u.username
      ORDER BY total_revenue DESC
    `;

    const teamMembers = await query<any>(teamMembersQuery, [managedTeam, userId]);

    // Get recent team deals (for overview)
    const recentTeamDealsQuery = `
      SELECT 
        d.*,
        u.name as sales_agent_name
      FROM deals d
      LEFT JOIN users u ON d.SalesAgentID = u.id
      WHERE d.sales_team = ? 
        AND d.SalesAgentID != ?
      ORDER BY d.created_at DESC
      LIMIT 10
    `;

    const recentTeamDeals = await query<any>(recentTeamDealsQuery, [managedTeam, userId]);

    // Get recent personal deals
    const recentPersonalDealsQuery = `
      SELECT *
      FROM deals
      WHERE SalesAgentID = ?
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const recentPersonalDeals = await query<any>(recentPersonalDealsQuery, [userId]);

    // Get recent team callbacks
    const recentTeamCallbacksQuery = `
      SELECT 
        c.*,
        u.name as sales_agent_name
      FROM callbacks c
      LEFT JOIN users u ON c.SalesAgentID = u.id
      WHERE c.sales_team = ? 
        AND c.SalesAgentID != ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `;

    const recentTeamCallbacks = await query<any>(recentTeamCallbacksQuery, [managedTeam, userId]);

    // Get recent personal callbacks
    const recentPersonalCallbacksQuery = `
      SELECT *
      FROM callbacks
      WHERE SalesAgentID = ?
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const recentPersonalCallbacks = await query<any>(recentPersonalCallbacksQuery, [userId]);

    // Calculate conversion rates
    const teamConversionRate = teamCallbacks.total_callbacks > 0 
      ? (teamCallbacks.completed_callbacks / teamCallbacks.total_callbacks) * 100 
      : 0;

    const personalConversionRate = personalCallbacks.total_callbacks > 0 
      ? (personalCallbacks.completed_callbacks / personalCallbacks.total_callbacks) * 100 
      : 0;

    // Build response based on endpoint
    if (endpoint === 'team-only') {
      const response = NextResponse.json({
        success: true,
        data: {
          analytics: {
            totalDeals: teamDeals.total_deals || 0,
            totalRevenue: parseFloat(teamDeals.total_revenue) || 0,
            avgDealSize: parseFloat(teamDeals.avg_deal_size) || 0,
            totalCallbacks: teamCallbacks.total_callbacks || 0,
            completedCallbacks: teamCallbacks.completed_callbacks || 0,
            conversionRate: teamConversionRate
          },
          deals: recentTeamDeals,
          callbacks: recentTeamCallbacks,
          members: teamMembers
        }
      });
      return addCorsHeaders(response);
    }

    if (endpoint === 'personal-only') {
      const response = NextResponse.json({
        success: true,
        data: {
          analytics: {
            totalDeals: personalDeals.total_deals || 0,
            totalRevenue: parseFloat(personalDeals.total_revenue) || 0,
            avgDealSize: parseFloat(personalDeals.avg_deal_size) || 0,
            totalCallbacks: personalCallbacks.total_callbacks || 0,
            completedCallbacks: personalCallbacks.completed_callbacks || 0,
            conversionRate: personalConversionRate
          },
          deals: recentPersonalDeals,
          callbacks: recentPersonalCallbacks
        }
      });
      return addCorsHeaders(response);
    }

    // Full analytics (default)
    const response = NextResponse.json({
      success: true,
      data: {
        team: {
          analytics: {
            totalDeals: teamDeals.total_deals || 0,
            totalRevenue: parseFloat(teamDeals.total_revenue) || 0,
            avgDealSize: parseFloat(teamDeals.avg_deal_size) || 0,
            uniqueAgents: teamDeals.unique_agents || 0,
            completedDeals: teamDeals.completed_deals || 0,
            pendingDeals: teamDeals.pending_deals || 0,
            totalCallbacks: teamCallbacks.total_callbacks || 0,
            pendingCallbacks: teamCallbacks.pending_callbacks || 0,
            contactedCallbacks: teamCallbacks.contacted_callbacks || 0,
            completedCallbacks: teamCallbacks.completed_callbacks || 0,
            cancelledCallbacks: teamCallbacks.cancelled_callbacks || 0,
            conversionRate: teamConversionRate
          },
          deals: recentTeamDeals,
          callbacks: recentTeamCallbacks,
          members: teamMembers
        },
        personal: {
          analytics: {
            totalDeals: personalDeals.total_deals || 0,
            totalRevenue: parseFloat(personalDeals.total_revenue) || 0,
            avgDealSize: parseFloat(personalDeals.avg_deal_size) || 0,
            completedDeals: personalDeals.completed_deals || 0,
            pendingDeals: personalDeals.pending_deals || 0,
            totalCallbacks: personalCallbacks.total_callbacks || 0,
            pendingCallbacks: personalCallbacks.pending_callbacks || 0,
            contactedCallbacks: personalCallbacks.contacted_callbacks || 0,
            completedCallbacks: personalCallbacks.completed_callbacks || 0,
            cancelledCallbacks: personalCallbacks.cancelled_callbacks || 0,
            conversionRate: personalConversionRate
          },
          deals: recentPersonalDeals,
          callbacks: recentPersonalCallbacks
        },
        summary: {
          teamName: managedTeam,
          totalTeamRevenue: parseFloat(teamDeals.total_revenue) + parseFloat(personalDeals.total_revenue),
          totalTeamDeals: (teamDeals.total_deals || 0) + (personalDeals.total_deals || 0),
          personalContribution: {
            revenuePercentage: parseFloat(teamDeals.total_revenue) + parseFloat(personalDeals.total_revenue) > 0 
              ? (parseFloat(personalDeals.total_revenue) / (parseFloat(teamDeals.total_revenue) + parseFloat(personalDeals.total_revenue))) * 100 
              : 0,
            dealsPercentage: (teamDeals.total_deals || 0) + (personalDeals.total_deals || 0) > 0 
              ? ((personalDeals.total_deals || 0) / ((teamDeals.total_deals || 0) + (personalDeals.total_deals || 0))) * 100 
              : 0
          }
        }
      },
      timestamp: new Date().toISOString(),
      filters: { userId, managedTeam, dateRange }
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Team Leader Analytics API Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
