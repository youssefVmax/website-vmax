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

    // Use COALESCE for date source (some rows may lack created_at)
    const dealDateExpr = `COALESCE(d.created_at, d.signup_date, NOW())`;

    if (userRole === 'salesman') {
      dealsWhere = 'WHERE d.SalesAgentID = ?';
      callbacksWhere = 'WHERE c.SalesAgentID = ?';
      params.push(userId, userId);
    } else if (userRole === 'team_leader' && managedTeam) {
      dealsWhere = 'WHERE (d.SalesAgentID = ? OR d.sales_team = ?)';
      callbacksWhere = 'WHERE (c.SalesAgentID = ? OR c.sales_team = ?)';
      params.push(userId, managedTeam, userId, managedTeam);
    }

    // Add date range filter (use dealDateExpr for deals)
    if (userRole === 'salesman') {
      const dateFilterDeals = `AND ${dealDateExpr} >= DATE_SUB(NOW(), INTERVAL ${parseInt(dateRange)} DAY)`;
      dealsWhere += ` ${dateFilterDeals}`;
      const dateFilterCallbacks = `AND created_at >= DATE_SUB(NOW(), INTERVAL ${parseInt(dateRange)} DAY)`;
      callbacksWhere += ` ${dateFilterCallbacks}`;
    } else if (userRole === 'team_leader' && managedTeam) {
      const dateFilterDeals = `AND ${dealDateExpr} >= DATE_SUB(NOW(), INTERVAL ${parseInt(dateRange)} DAY)`;
      dealsWhere += ` ${dateFilterDeals}`;
      const dateFilterCallbacks = `AND created_at >= DATE_SUB(NOW(), INTERVAL ${parseInt(dateRange)} DAY)`;
      callbacksWhere += ` ${dateFilterCallbacks}`;
    } else {
      // Manager - no role filter, just date filter
      dealsWhere = `WHERE ${dealDateExpr} >= DATE_SUB(NOW(), INTERVAL ${parseInt(dateRange)} DAY)`;
      callbacksWhere = `WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${parseInt(dateRange)} DAY)`;
    }

    // 1. Sales Trend Chart (Daily/Weekly/Monthly)
    if (chartType === 'all' || chartType === 'sales-trend') {
      const salesTrendQuery = `
        SELECT 
          DATE(${dealDateExpr}) as date,
          COUNT(*) as deals,
          COALESCE(SUM(d.amount_paid), 0) as revenue
        FROM deals d 
        LEFT JOIN users u1 ON d.SalesAgentID = u1.id
        ${dealsWhere}
        GROUP BY DATE(${dealDateExpr})
        ORDER BY date DESC
        LIMIT 30
      `;

      const salesTrend = await query<any>(salesTrendQuery, params.slice(0, userRole === 'team_leader' ? 2 : 1));
      
      console.log('📊 Sales trend raw data:', salesTrend.slice(0, 3)); // Log first 3 entries
      
      charts.salesTrend = salesTrend.map(row => {
        // Handle invalid or null dates
        let dateString = 'Invalid Date';
        try {
          if (row.date && row.date !== '0000-00-00') {
            const date = new Date(row.date);
            if (!isNaN(date.getTime())) {
              dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          }
        } catch (e) {
          console.warn('⚠️ Invalid date in sales trend:', row.date, e);
        }
        
        return {
          date: dateString,
          deals: row.deals || 0,
          revenue: row.revenue || 0
        };
      }).reverse();
    }

    // 2. Sales by Agent Chart
    if (chartType === 'all' || chartType === 'sales-by-agent') {
      const salesByAgentQuery = `
        SELECT 
          COALESCE(u1.name, d.sales_agent, d.SalesAgentID) as agent,
          COUNT(*) as deals,
          COALESCE(SUM(d.amount_paid), 0) as revenue
        FROM deals d 
        LEFT JOIN users u1 ON d.SalesAgentID = u1.id
        ${dealsWhere}
        GROUP BY COALESCE(u1.name, d.sales_agent, d.SalesAgentID)
        ORDER BY revenue DESC
        LIMIT 10
      `;

      const salesByAgent = await query<any>(salesByAgentQuery, params.slice(0, userRole === 'team_leader' ? 2 : 1));
      
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
          d.sales_team as team,
          COUNT(*) as deals,
          COALESCE(SUM(d.amount_paid), 0) as revenue
        FROM deals d 
        LEFT JOIN users u1 ON d.SalesAgentID = u1.id
        ${userRole === 'manager' ? `WHERE ${dealDateExpr} >= DATE_SUB(NOW(), INTERVAL ${parseInt(dateRange)} DAY)` : dealsWhere}
        GROUP BY d.sales_team
        ORDER BY revenue DESC
      `;

      const teamParams = userRole === 'manager' ? [] : params.slice(0, userRole === 'team_leader' ? 2 : 1);
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
          COALESCE(d.status, 'active') as status,
          COUNT(*) as count
        FROM deals d 
        LEFT JOIN users u1 ON d.SalesAgentID = u1.id
        ${dealsWhere}
        GROUP BY d.status
        ORDER BY count DESC
      `;

      const dealStatus = await query<any>(dealStatusQuery, params.slice(0, userRole === 'team_leader' ? 2 : 1));
      
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
          COALESCE(d.service_tier, 'Unknown') as service,
          COUNT(*) as deals,
          COALESCE(SUM(d.amount_paid), 0) as revenue
        FROM deals d 
        LEFT JOIN users u1 ON d.SalesAgentID = u1.id
        ${dealsWhere}
        GROUP BY COALESCE(d.service_tier, 'Unknown')
        ORDER BY revenue DESC
      `;

      const serviceTier = await query<any>(serviceTierQuery, params.slice(0, userRole === 'team_leader' ? 2 : 1));
      
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
          DATE(c.created_at) as date,
          COUNT(*) as total_callbacks,
          COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_callbacks,
          COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_callbacks
        FROM callbacks c 
        ${callbacksWhere}
        GROUP BY DATE(c.created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const callbackParams = userRole === 'team_leader' ? [userId, managedTeam] : [userId];
      const callbackPerformance = await query<any>(callbackPerformanceQuery, callbackParams);
      
      charts.callbackPerformance = callbackPerformance.map(row => {
        // Handle invalid or null dates
        let dateString = 'Invalid Date';
        try {
          if (row.date && row.date !== '0000-00-00') {
            const date = new Date(row.date);
            if (!isNaN(date.getTime())) {
              dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          }
        } catch (e) {
          console.warn('⚠️ Invalid date in callback performance:', row.date);
        }
        
        return {
          date: dateString,
          total: row.total_callbacks || 0,
          completed: row.completed_callbacks || 0,
          pending: row.pending_callbacks || 0,
          conversionRate: row.total_callbacks > 0 ? (row.completed_callbacks / row.total_callbacks) * 100 : 0
        };
      }).reverse();
    }

    // 7. Monthly Revenue Comparison
    if (chartType === 'all' || chartType === 'monthly-revenue') {
      let monthlyDealsWhere = dealsWhere;
      if (userRole === 'salesman') {
        monthlyDealsWhere = monthlyDealsWhere.replace(/AND COALESCE\(d\.created_at, d\.signup_date, NOW\(\)\) >= DATE_SUB\(NOW\(\), INTERVAL \d+ DAY\)/, 'AND COALESCE(d.created_at, d.signup_date, NOW()) >= DATE_SUB(NOW(), INTERVAL 12 MONTH)');
      } else if (userRole === 'team_leader' && managedTeam) {
        monthlyDealsWhere = monthlyDealsWhere.replace(/AND COALESCE\(d\.created_at, d\.signup_date, NOW\(\)\) >= DATE_SUB\(NOW\(\), INTERVAL \d+ DAY\)/, 'AND COALESCE(d.created_at, d.signup_date, NOW()) >= DATE_SUB(NOW(), INTERVAL 12 MONTH)');
      } else {
        monthlyDealsWhere = monthlyDealsWhere.replace(/WHERE COALESCE\(d\.created_at, d\.signup_date, NOW\(\)\) >= DATE_SUB\(NOW\(\), INTERVAL \d+ DAY\)/, 'WHERE COALESCE(d.created_at, d.signup_date, NOW()) >= DATE_SUB(NOW(), INTERVAL 12 MONTH)');
      }
      
      const monthlyRevenueQuery = `
        SELECT 
          DATE_FORMAT(${dealDateExpr}, '%Y-%m') as month,
          COUNT(*) as deals,
          COALESCE(SUM(d.amount_paid), 0) as revenue
        FROM deals d 
        LEFT JOIN users u1 ON d.SalesAgentID = u1.id
        ${monthlyDealsWhere}
        GROUP BY DATE_FORMAT(${dealDateExpr}, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
      `;

      const monthlyRevenue = await query<any>(monthlyRevenueQuery, params.slice(0, userRole === 'team_leader' ? 2 : 1));
            
      charts.monthlyRevenue = monthlyRevenue.map(row => {
        // Handle invalid or null months
        let monthString = 'Invalid Month';
        try {
          if (row.month && row.month !== '0000-00') {
            const date = new Date(row.month + '-01');
            if (!isNaN(date.getTime())) {
              monthString = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
          }
        } catch (e) {
          console.warn('⚠️ Invalid month in monthly revenue:', row.month);
        }
        
        return {
          month: monthString,
          deals: row.deals || 0,
          revenue: row.revenue || 0
        };
      }).reverse();
    }

    // 8. Top Customers Chart
    if (chartType === 'all' || chartType === 'top-customers') {
      const topCustomersQuery = `
        SELECT 
          d.customer_name as customer,
          COUNT(*) as deals,
          COALESCE(SUM(d.amount_paid), 0) as revenue
        FROM deals d 
        LEFT JOIN users u1 ON d.SalesAgentID = u1.id
        ${dealsWhere}
        GROUP BY d.customer_name
        ORDER BY revenue DESC
        LIMIT 10
      `;

      const topCustomers = await query<any>(topCustomersQuery, params.slice(0, userRole === 'team_leader' ? 2 : 1));
      
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
        COALESCE(SUM(d.amount_paid), 0) as total_revenue,
        COALESCE(AVG(d.amount_paid), 0) as avg_deal_size,
        COUNT(DISTINCT COALESCE(u1.name, d.sales_agent, d.SalesAgentID)) as unique_agents
      FROM deals d 
      LEFT JOIN users u1 ON d.SalesAgentID = u1.id
      ${dealsWhere}
    `;

    const summary = await query<any>(summaryQuery, params.slice(0, userRole === 'team_leader' ? 2 : 1));
    
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
