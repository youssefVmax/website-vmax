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
    const managedTeam = searchParams.get('managed_team');

    console.log('🔍 Analytics API - Endpoint:', endpoint, 'Role:', userRole, 'Team:', team, 'UserId:', userId);
    console.log('🔍 Full request URL:', request.url);
    console.log('🔍 All search params:', Object.fromEntries(searchParams.entries()));

    console.log('🔍 Analytics API - Processing request...');

    // Build comprehensive filters
    const dealWhere: string[] = [];
    const dealParams: any[] = [];
    const cbWhere: string[] = [];
    const cbParams: any[] = [];

    // Team filtering (including team leader support)
    if (team) { 
      dealWhere.push('`sales_team` = ?'); 
      dealParams.push(team); 
      cbWhere.push('`sales_team` = ?'); 
      cbParams.push(team); 
    }
    
    // Team leader filtering (dual access: personal + managed team)
    if (userRole === 'team_leader' && managedTeam && userId) {
      dealWhere.push('(`sales_team` = ? OR `SalesAgentID` = ?)');
      dealParams.push(managedTeam, userId);
      cbWhere.push('(`sales_team` = ? OR `SalesAgentID` = ?)');
      cbParams.push(managedTeam, userId);
    } else if (userRole === 'salesman' && userId) {
      dealWhere.push('`SalesAgentID` = ?'); 
      dealParams.push(userId);
      cbWhere.push('`SalesAgentID` = ?'); 
      cbParams.push(userId);
    }
    
    // Date range filtering
    if (dateRange === 'today') {
      dealWhere.push('DATE(`created_at`) = CURDATE()');
      cbWhere.push('DATE(`created_at`) = CURDATE()');
    } else if (dateRange === 'week') {
      dealWhere.push('`created_at` >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
      cbWhere.push('`created_at` >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    } else if (dateRange === 'month') {
      dealWhere.push('`created_at` >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
      cbWhere.push('`created_at` >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    }

    const dealWhereSql = dealWhere.length ? `WHERE ${dealWhere.join(' AND ')}` : '';
    const cbWhereSql = cbWhere.length ? `WHERE ${cbWhere.join(' AND ')}` : '';

    // Health check endpoint
    if (endpoint === 'health') {
      console.log('✅ Health check endpoint called');
      const response = NextResponse.json({
        success: true,
        message: 'Analytics API is working',
        timestamp: new Date().toISOString(),
        params: { endpoint, userRole, userId, team, managedTeam, dateRange }
      });
      return addCorsHeaders(response);
    }

    // Dashboard stats with enhanced analytics
    if (endpoint === 'dashboard-stats' || !endpoint) {
      try {
        console.log('📊 Fetching dashboard stats with filters:', { dealWhereSql, dealParams });
        
        const [dealTotals] = await query<any>(
          `SELECT 
            COUNT(*) as total_deals, 
            COALESCE(SUM(amount_paid), 0) as total_revenue,
            COALESCE(AVG(amount_paid), 0) as avg_deal_size,
            COUNT(DISTINCT SalesAgentID) as unique_agents
          FROM  deals  ${dealWhereSql}`, 
          dealParams
        );
        
        if (!dealTotals || dealTotals.length === 0) {
          console.log('⚠️ No deal totals found, using defaults');
        }
      
        const [todayDeals] = await query<any>(
          `SELECT 
            COUNT(*) as today_deals, 
            COALESCE(SUM(amount_paid), 0) as today_revenue
          FROM  deals  
          WHERE DATE(created_at) = CURDATE() ${dealWhere.length ? ' AND (' + dealWhere.join(' AND ') + ')' : ''}`, 
          dealParams
        );
        
        const [cbTotals] = await query<any>(
          `SELECT 
            COUNT(*) as total_callbacks,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_callbacks,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_callbacks,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_callbacks
          FROM  callbacks  ${cbWhereSql}`, 
          cbParams
        );
        
        const [cbToday] = await query<any>(
          `SELECT COUNT(*) as today_callbacks 
          FROM  callbacks  
          WHERE DATE(created_at) = CURDATE() ${cbWhere.length ? ' AND (' + cbWhere.join(' AND ') + ')' : ''}`, 
          cbParams
        );

        // Team performance analytics
        const [teamStats] = await query<any>(
          `SELECT 
            sales_team,
            COUNT(*) as team_deals,
            COALESCE(SUM(amount_paid), 0) as team_revenue,
            COALESCE(AVG(amount_paid), 0) as team_avg_deal
          FROM  deals  ${dealWhereSql}
          GROUP BY sales_team
          ORDER BY team_revenue DESC`, 
          dealParams
        );

        // Agent performance analytics
        const [agentStats] = await query<any>(
          `SELECT 
            SalesAgentID,
            sales_agent,
            sales_team,
            COUNT(*) as agent_deals,
            COALESCE(SUM(amount_paid), 0) as agent_revenue,
            COALESCE(AVG(amount_paid), 0) as agent_avg_deal
          FROM  deals  ${dealWhereSql}
          GROUP BY SalesAgentID, sales_agent, sales_team
          ORDER BY agent_revenue DESC
          LIMIT 10`, 
          dealParams
        );

        // Monthly trends
        const [monthlyTrends] = await query<any>(
          `SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as deals_count,
            COALESCE(SUM(amount_paid), 0) as revenue
          FROM  deals  ${dealWhereSql}
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY month DESC
          LIMIT 12`, 
          dealParams
        );

        const data = {
          // Basic stats
          total_deals: dealTotals[0]?.total_deals || 0,
          total_revenue: Number(dealTotals[0]?.total_revenue || 0),
          avg_deal_size: Number(dealTotals[0]?.avg_deal_size || 0),
          unique_agents: dealTotals[0]?.unique_agents || 0,
          
          // Today's stats
          today_deals: todayDeals[0]?.today_deals || 0,
          today_revenue: Number(todayDeals[0]?.today_revenue || 0),
          
          // Callback stats
          total_callbacks: cbTotals[0]?.total_callbacks || 0,
          pending_callbacks: cbTotals[0]?.pending_callbacks || 0,
          completed_callbacks: cbTotals[0]?.completed_callbacks || 0,
          cancelled_callbacks: cbTotals[0]?.cancelled_callbacks || 0,
          today_callbacks: cbToday[0]?.today_callbacks || 0,
          
          // Conversion rate
          conversion_rate: cbTotals[0]?.total_callbacks > 0 ? 
            ((cbTotals[0]?.completed_callbacks || 0) / cbTotals[0]?.total_callbacks * 100).toFixed(2) : 0,
          
          // Enhanced analytics
          team_performance: Array.isArray(teamStats) ? teamStats : [],
          agent_performance: Array.isArray(agentStats) ? agentStats : [],
          monthly_trends: Array.isArray(monthlyTrends) ? monthlyTrends : [],
          
          // Metadata
          filters: { userRole, userId, team, managedTeam, dateRange },
          timestamp: new Date().toISOString()
        };

        console.log('✅ Analytics data compiled successfully');
        const response = NextResponse.json({ ...data, success: true });
        return addCorsHeaders(response);
      } catch (dashboardError) {
        console.error('❌ Dashboard stats error:', dashboardError);
        const response = NextResponse.json({
          success: false,
          error: 'Failed to fetch dashboard stats',
          details: dashboardError instanceof Error ? dashboardError.message : 'Unknown error'
        }, { status: 500 });
        return addCorsHeaders(response);
      }
    }

    // Team analytics endpoint
    if (endpoint === 'team-analytics') {
      const [teamAnalytics] = await query<any>(
        `SELECT 
          d.sales_team,
          COUNT(DISTINCT d.id) as total_deals,
          COALESCE(SUM(d.amount_paid), 0) as total_revenue,
          COALESCE(AVG(d.amount_paid), 0) as avg_deal_size,
          COUNT(DISTINCT d.SalesAgentID) as team_size,
          COUNT(DISTINCT c.id) as total_callbacks,
          COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_callbacks
        FROM  deals  d
        LEFT JOIN  callbacks  c ON c.sales_team = d.sales_team
        ${dealWhereSql}
        GROUP BY d.sales_team
        ORDER BY total_revenue DESC`, 
        dealParams
      );

      const response = NextResponse.json({ 
        team_analytics: Array.isArray(teamAnalytics) ? teamAnalytics : [],
        success: true 
      });
      return addCorsHeaders(response);
    }

    // Agent performance endpoint
    if (endpoint === 'agent-performance') {
      const [agentPerformance] = await query<any>(
        `SELECT 
          d.SalesAgentID,
          d.sales_agent,
          d.sales_team,
          COUNT(DISTINCT d.id) as deals_count,
          COALESCE(SUM(d.amount_paid), 0) as revenue,
          COALESCE(AVG(d.amount_paid), 0) as avg_deal_size,
          COUNT(DISTINCT c.id) as callbacks_count,
          COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_callbacks,
          CASE 
            WHEN COUNT(DISTINCT c.id) > 0 THEN 
              (COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) / COUNT(DISTINCT c.id) * 100)
            ELSE 0 
          END as conversion_rate
        FROM  deals  d
        LEFT JOIN  callbacks  c ON c.SalesAgentID = d.SalesAgentID
        ${dealWhereSql}
        GROUP BY d.SalesAgentID, d.sales_agent, d.sales_team
        ORDER BY revenue DESC`, 
        dealParams
      );

      const response = NextResponse.json({ 
        agent_performance: Array.isArray(agentPerformance) ? agentPerformance : [],
        success: true 
      });
      return addCorsHeaders(response);
    }

    // Callback KPIs endpoint
    if (endpoint === 'callback-kpis') {
      try {
        const [cbTotals] = await query<any>(
          `SELECT 
            COUNT(*) as total_callbacks,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_callbacks,
            COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_callbacks,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_callbacks,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_callbacks,
            COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
            COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
            COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority
          FROM callbacks ${cbWhereSql}`, 
          cbParams
        );

        const [cbToday] = await query<any>(
          `SELECT COUNT(*) as today_callbacks 
          FROM callbacks 
          WHERE DATE(created_at) = CURDATE() ${cbWhere.length ? ' AND (' + cbWhere.join(' AND ') + ')' : ''}`, 
          cbParams
        );

        const [cbConversions] = await query<any>(
          `SELECT 
            COUNT(CASE WHEN converted_to_deal = 1 THEN 1 END) as converted_callbacks,
            AVG(CASE WHEN status = 'completed' THEN 
              DATEDIFF(STR_TO_DATE(CONCAT(scheduled_date, ' ', scheduled_time), '%Y-%m-%d %H:%i:%s'), created_at)
            END) as avg_response_time_days
          FROM callbacks ${cbWhereSql}`, 
          cbParams
        );

        const totalCallbacks = cbTotals[0]?.total_callbacks || 0;
        const completedCallbacks = cbTotals[0]?.completed_callbacks || 0;
        const convertedCallbacks = cbConversions[0]?.converted_callbacks || 0;

        const data = {
          totals: {
            total_callbacks: totalCallbacks,
            pending_callbacks: cbTotals[0]?.pending_callbacks || 0,
            contacted_callbacks: cbTotals[0]?.contacted_callbacks || 0,
            completed_callbacks: completedCallbacks,
            cancelled_callbacks: cbTotals[0]?.cancelled_callbacks || 0,
            today_callbacks: cbToday[0]?.today_callbacks || 0,
            converted_callbacks: convertedCallbacks,
            high_priority: cbTotals[0]?.high_priority || 0,
            medium_priority: cbTotals[0]?.medium_priority || 0,
            low_priority: cbTotals[0]?.low_priority || 0
          },
          metrics: {
            completion_rate: totalCallbacks > 0 ? (completedCallbacks / totalCallbacks * 100).toFixed(2) : '0',
            conversion_rate: totalCallbacks > 0 ? (convertedCallbacks / totalCallbacks * 100).toFixed(2) : '0',
            avg_response_time_days: Number(cbConversions[0]?.avg_response_time_days || 0).toFixed(1)
          },
          success: true
        };

        const response = NextResponse.json(data);
        return addCorsHeaders(response);
      } catch (error) {
        console.error('❌ Callback KPIs error:', error);
        const response = NextResponse.json({
          success: false,
          error: 'Failed to fetch callback KPIs',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
        return addCorsHeaders(response);
      }
    }

    // Sales KPIs endpoint
    if (endpoint === 'sales-kpis') {
      try {
        const [salesTotals] = await query<any>(
          `SELECT 
            COUNT(*) as total_deals,
            COALESCE(SUM(amount_paid), 0) as total_revenue,
            COALESCE(AVG(amount_paid), 0) as avg_deal_size,
            COUNT(DISTINCT SalesAgentID) as active_agents,
            COUNT(DISTINCT sales_team) as active_teams,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_deals,
            COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_deals
          FROM deals ${dealWhereSql}`, 
          dealParams
        );

        const [revenueByService] = await query<any>(
          `SELECT 
            service_tier,
            COUNT(*) as deals_count,
            COALESCE(SUM(amount_paid), 0) as service_revenue
          FROM deals ${dealWhereSql}
          GROUP BY service_tier
          ORDER BY service_revenue DESC`, 
          dealParams
        );

        const data = {
          totals: salesTotals[0] || {},
          revenue_by_service: Array.isArray(revenueByService) ? revenueByService : [],
          success: true
        };

        const response = NextResponse.json(data);
        return addCorsHeaders(response);
      } catch (error) {
        console.error('❌ Sales KPIs error:', error);
        const response = NextResponse.json({
          success: false,
          error: 'Failed to fetch sales KPIs',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
        return addCorsHeaders(response);
      }
    }

    // Revenue analytics endpoint
    if (endpoint === 'revenue-analytics') {
      try {
        const [monthlyRevenue] = await query<any>(
          `SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as deals_count,
            COALESCE(SUM(amount_paid), 0) as monthly_revenue,
            COALESCE(AVG(amount_paid), 0) as avg_deal_size
          FROM deals ${dealWhereSql}
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY month DESC
          LIMIT 12`, 
          dealParams
        );

        const [quarterlyRevenue] = await query<any>(
          `SELECT 
            YEAR(created_at) as year,
            QUARTER(created_at) as quarter,
            COUNT(*) as deals_count,
            COALESCE(SUM(amount_paid), 0) as quarterly_revenue
          FROM deals ${dealWhereSql}
          GROUP BY YEAR(created_at), QUARTER(created_at)
          ORDER BY year DESC, quarter DESC
          LIMIT 8`, 
          dealParams
        );

        const data = {
          monthly_revenue: Array.isArray(monthlyRevenue) ? monthlyRevenue : [],
          quarterly_revenue: Array.isArray(quarterlyRevenue) ? quarterlyRevenue : [],
          success: true
        };

        const response = NextResponse.json(data);
        return addCorsHeaders(response);
      } catch (error) {
        console.error('❌ Revenue analytics error:', error);
        const response = NextResponse.json({
          success: false,
          error: 'Failed to fetch revenue analytics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
        return addCorsHeaders(response);
      }
    }

    // Conversion metrics endpoint
    if (endpoint === 'conversion-metrics') {
      try {
        const [conversionStats] = await query<any>(
          `SELECT 
            COUNT(DISTINCT c.id) as total_callbacks,
            COUNT(DISTINCT CASE WHEN c.converted_to_deal = 1 THEN c.id END) as converted_callbacks,
            COUNT(DISTINCT d.id) as total_deals,
            COALESCE(SUM(CASE WHEN c.converted_to_deal = 1 THEN d.amount_paid END), 0) as conversion_revenue,
            COALESCE(AVG(CASE WHEN c.converted_to_deal = 1 THEN d.amount_paid END), 0) as avg_conversion_value
          FROM callbacks c
          LEFT JOIN deals d ON d.id = c.converted_deal_id
          ${cbWhereSql}`, 
          cbParams
        );

        const [conversionByTeam] = await query<any>(
          `SELECT 
            c.sales_team,
            COUNT(c.id) as team_callbacks,
            COUNT(CASE WHEN c.converted_to_deal = 1 THEN c.id END) as team_conversions,
            CASE 
              WHEN COUNT(c.id) > 0 THEN 
                (COUNT(CASE WHEN c.converted_to_deal = 1 THEN c.id END) / COUNT(c.id) * 100)
              ELSE 0 
            END as team_conversion_rate
          FROM callbacks c
          ${cbWhereSql}
          GROUP BY c.sales_team
          ORDER BY team_conversion_rate DESC`, 
          cbParams
        );

        const totalCallbacks = conversionStats[0]?.total_callbacks || 0;
        const convertedCallbacks = conversionStats[0]?.converted_callbacks || 0;

        const data = {
          overall_conversion_rate: totalCallbacks > 0 ? (convertedCallbacks / totalCallbacks * 100).toFixed(2) : '0',
          total_callbacks: totalCallbacks,
          converted_callbacks: convertedCallbacks,
          conversion_revenue: Number(conversionStats[0]?.conversion_revenue || 0),
          avg_conversion_value: Number(conversionStats[0]?.avg_conversion_value || 0),
          conversion_by_team: Array.isArray(conversionByTeam) ? conversionByTeam : [],
          success: true
        };

        const response = NextResponse.json(data);
        return addCorsHeaders(response);
      } catch (error) {
        console.error('❌ Conversion metrics error:', error);
        const response = NextResponse.json({
          success: false,
          error: 'Failed to fetch conversion metrics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
        return addCorsHeaders(response);
      }
    }

    // Unknown endpoint
    const response = NextResponse.json({ 
      success: false, 
      error: 'Unknown analytics endpoint. Available: dashboard-stats, team-analytics, agent-performance, callback-kpis, sales-kpis, revenue-analytics, conversion-metrics, health' 
    }, { status: 400 });
    return addCorsHeaders(response);
    
  } catch (error) {
    console.error('❌ Analytics API error:', error);
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 502 }
    );
    return addCorsHeaders(response);
  }
}
