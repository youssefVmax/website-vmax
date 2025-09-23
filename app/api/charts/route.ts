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

// Charts API - Get comprehensive chart data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole') || 'salesman';
    const userId = searchParams.get('userId') || '';
    const managedTeam = searchParams.get('managedTeam') || '';
    const chartType = searchParams.get('chartType') || 'all';
    const dateRange = searchParams.get('dateRange') || '30'; // days

    console.log('🔍 Charts API - Parameters:', { userRole, userId, managedTeam, chartType, dateRange });

    // Test database connection
    try {
      await query('SELECT 1 as test');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      const response = NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 503 });
      return addCorsHeaders(response);
    }

    const charts: any = {};

    // Build WHERE conditions based on role
    let dealsWhere = '';
    let callbacksWhere = '';
    const params: any[] = [];

    if (userRole === 'salesman') {
      dealsWhere = 'WHERE SalesAgentID = ?';
      callbacksWhere = 'WHERE SalesAgentID = ?';
      params.push(userId, userId);
    } else if (userRole === 'team-leader' && managedTeam) {
      dealsWhere = 'WHERE (SalesAgentID = ? OR sales_team = ?)';
      callbacksWhere = 'WHERE (SalesAgentID = ? OR sales_team = ?)';
      params.push(userId, managedTeam, userId, managedTeam);
    }

    // Add date range filter
    const dateFilter = `AND created_at >= DATE_SUB(NOW(), INTERVAL ${parseInt(dateRange)} DAY)`;
    dealsWhere += dealsWhere ? ` ${dateFilter}` : `WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${parseInt(dateRange)} DAY)`;
    callbacksWhere += callbacksWhere ? ` ${dateFilter}` : `WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${parseInt(dateRange)} DAY)`;

    // 1. Sales Trend Chart (Daily/Weekly/Monthly)
    if (chartType === 'all' || chartType === 'sales-trend') {
      const salesTrendQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as deals,
          COALESCE(SUM(amount_paid), 0) as revenue
        FROM deals 
        ${dealsWhere}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const salesTrend = await query<any>(salesTrendQuery, params.slice(0, userRole === 'team-leader' ? 2 : 1));
      
      charts.salesTrend = salesTrend.map(row => ({
        date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        deals: row.deals,
        revenue: row.revenue
      })).reverse();
    }

    // 2. Sales by Agent Chart
    if (chartType === 'all' || chartType === 'sales-by-agent') {
      const salesByAgentQuery = `
        SELECT 
          sales_agent as agent,
          COUNT(*) as deals,
          COALESCE(SUM(amount_paid), 0) as revenue
        FROM deals 
        ${dealsWhere}
        GROUP BY sales_agent
        ORDER BY revenue DESC
        LIMIT 10
      `;

      const salesByAgent = await query<any>(salesByAgentQuery, params.slice(0, userRole === 'team-leader' ? 2 : 1));
      
      charts.salesByAgent = salesByAgent.map(row => ({
        agent: row.agent || 'Unknown',
        deals: row.deals,
        revenue: row.revenue
      }));
    }

    // 3. Sales by Team Chart
    if (chartType === 'all' || chartType === 'sales-by-team') {
      const salesByTeamQuery = `
        SELECT 
          sales_team as team,
          COUNT(*) as deals,
          COALESCE(SUM(amount_paid), 0) as revenue
        FROM deals 
        ${userRole === 'manager' ? `WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${parseInt(dateRange)} DAY)` : dealsWhere}
        GROUP BY sales_team
        ORDER BY revenue DESC
      `;

      const teamParams = userRole === 'manager' ? [] : params.slice(0, userRole === 'team-leader' ? 2 : 1);
      const salesByTeam = await query<any>(salesByTeamQuery, teamParams);
      
      charts.salesByTeam = salesByTeam.map(row => ({
        team: row.team || 'Unknown',
        deals: row.deals,
        revenue: row.revenue
      }));
    }

    // 4. Deal Status Distribution
    if (chartType === 'all' || chartType === 'deal-status') {
      const dealStatusQuery = `
        SELECT 
          COALESCE(status, 'active') as status,
          COUNT(*) as count
        FROM deals 
        ${dealsWhere}
        GROUP BY status
        ORDER BY count DESC
      `;

      const dealStatus = await query<any>(dealStatusQuery, params.slice(0, userRole === 'team-leader' ? 2 : 1));
      
      charts.dealStatus = dealStatus.map(row => ({
        status: row.status,
        count: row.count,
        percentage: 0 // Will be calculated on frontend
      }));
    }

    // 5. Service Tier Distribution
    if (chartType === 'all' || chartType === 'service-tier') {
      const serviceTierQuery = `
        SELECT 
          service_tier as service,
          COUNT(*) as deals,
          COALESCE(SUM(amount_paid), 0) as revenue
        FROM deals 
        ${dealsWhere}
        GROUP BY service_tier
        ORDER BY revenue DESC
      `;

      const serviceTier = await query<any>(serviceTierQuery, params.slice(0, userRole === 'team-leader' ? 2 : 1));
      
      charts.serviceTier = serviceTier.map(row => ({
        service: row.service || 'Unknown',
        deals: row.deals,
        revenue: row.revenue
      }));
    }

    // 6. Callback Performance Chart
    if (chartType === 'all' || chartType === 'callback-performance') {
      const callbackPerformanceQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_callbacks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_callbacks,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_callbacks
        FROM callbacks 
        ${callbacksWhere}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const callbackParams = userRole === 'team-leader' ? [userId, managedTeam] : [userId];
      const callbackPerformance = await query<any>(callbackPerformanceQuery, callbackParams);
      
      charts.callbackPerformance = callbackPerformance.map(row => ({
        date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: row.total_callbacks,
        completed: row.completed_callbacks,
        pending: row.pending_callbacks,
        conversionRate: row.total_callbacks > 0 ? (row.completed_callbacks / row.total_callbacks) * 100 : 0
      })).reverse();
    }

    // 7. Monthly Revenue Comparison
    if (chartType === 'all' || chartType === 'monthly-revenue') {
      const monthlyRevenueQuery = `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as deals,
          COALESCE(SUM(amount_paid), 0) as revenue
        FROM deals 
        ${dealsWhere.replace('created_at >= DATE_SUB(NOW(), INTERVAL ' + dateRange + ' DAY)', 'created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)')}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
      `;

      const monthlyRevenue = await query<any>(monthlyRevenueQuery, params.slice(0, userRole === 'team-leader' ? 2 : 1));
      
      charts.monthlyRevenue = monthlyRevenue.map(row => ({
        month: new Date(row.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        deals: row.deals,
        revenue: row.revenue
      })).reverse();
    }

    // 8. Top Customers Chart
    if (chartType === 'all' || chartType === 'top-customers') {
      const topCustomersQuery = `
        SELECT 
          customer_name as customer,
          COUNT(*) as deals,
          COALESCE(SUM(amount_paid), 0) as revenue
        FROM deals 
        ${dealsWhere}
        GROUP BY customer_name
        ORDER BY revenue DESC
        LIMIT 10
      `;

      const topCustomers = await query<any>(topCustomersQuery, params.slice(0, userRole === 'team-leader' ? 2 : 1));
      
      charts.topCustomers = topCustomers.map(row => ({
        customer: row.customer || 'Unknown',
        deals: row.deals,
        revenue: row.revenue
      }));
    }

    // Calculate summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_deals,
        COALESCE(SUM(amount_paid), 0) as total_revenue,
        COALESCE(AVG(amount_paid), 0) as avg_deal_size,
        COUNT(DISTINCT sales_agent) as unique_agents
      FROM deals 
      ${dealsWhere}
    `;

    const summary = await query<any>(summaryQuery, params.slice(0, userRole === 'team-leader' ? 2 : 1));
    
    charts.summary = summary[0] || {
      total_deals: 0,
      total_revenue: 0,
      avg_deal_size: 0,
      unique_agents: 0
    };

    console.log('✅ Charts API: Data compiled successfully');

    const response = NextResponse.json({
      success: true,
      data: charts,
      timestamp: new Date().toISOString(),
      parameters: {
        userRole,
        userId,
        managedTeam,
        chartType,
        dateRange
      }
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Charts API Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
