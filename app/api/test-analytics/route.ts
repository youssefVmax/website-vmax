import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole') || 'manager';
    const dateRange = searchParams.get('dateRange') || 'today';

    console.log('🔄 Test Analytics: Starting analysis with params:', { userRole, dateRange });

    // Test 1: Count all deals in database
    const [totalDealsResult] = await query('SELECT COUNT(*) as total FROM deals');
    const totalDeals = totalDealsResult[0]?.total || 0;
    console.log('📊 Test Analytics: Total deals in database:', totalDeals);

    // Test 2: Check deals created today
    const [todayDealsResult] = await query(`
      SELECT COUNT(*) as today_count, 
             SUM(COALESCE(amountPaid, amount, totalAmount, 0)) as today_revenue
      FROM deals 
      WHERE DATE(created_at) = CURDATE()
    `);
    const todayDeals = todayDealsResult[0]?.today_count || 0;
    const todayRevenue = todayDealsResult[0]?.today_revenue || 0;
    console.log('📊 Test Analytics: Today deals:', todayDeals, 'Revenue:', todayRevenue);

    // Test 3: Check recent deals (last 7 days)
    const [recentDealsResult] = await query(`
      SELECT COUNT(*) as recent_count,
             SUM(COALESCE(amountPaid, amount, totalAmount, 0)) as recent_revenue
      FROM deals 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const recentDeals = recentDealsResult[0]?.recent_count || 0;
    const recentRevenue = recentDealsResult[0]?.recent_revenue || 0;
    console.log('📊 Test Analytics: Recent deals (7 days):', recentDeals, 'Revenue:', recentRevenue);

    // Test 4: Check deal dates to understand the data
    const [dealDatesResult] = await query(`
      SELECT DATE(created_at) as deal_date, COUNT(*) as count
      FROM deals 
      GROUP BY DATE(created_at)
      ORDER BY deal_date DESC
      LIMIT 10
    `);
    console.log('📊 Test Analytics: Deal dates distribution:', dealDatesResult);

    // Test 5: Sample deals data
    const [sampleDealsResult] = await query(`
      SELECT id, customerName, amountPaid, amount, totalAmount, created_at, status
      FROM deals 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('📊 Test Analytics: Sample deals:', sampleDealsResult);

    // Test 6: Check callbacks
    const [totalCallbacksResult] = await query('SELECT COUNT(*) as total FROM callbacks');
    const totalCallbacks = totalCallbacksResult[0]?.total || 0;
    console.log('📊 Test Analytics: Total callbacks in database:', totalCallbacks);

    // Test 7: Check today's callbacks
    const [todayCallbacksResult] = await query(`
      SELECT COUNT(*) as today_count
      FROM callbacks 
      WHERE DATE(created_at) = CURDATE()
    `);
    const todayCallbacks = todayCallbacksResult[0]?.today_count || 0;
    console.log('📊 Test Analytics: Today callbacks:', todayCallbacks);

    // Calculate proper analytics
    const avgDealSize = totalDeals > 0 ? (recentRevenue / recentDeals) : 0;
    
    // Get unique agents
    const [agentsResult] = await query(`
      SELECT COUNT(DISTINCT SalesAgentID) as unique_agents
      FROM deals 
      WHERE SalesAgentID IS NOT NULL AND SalesAgentID != ''
    `);
    const uniqueAgents = agentsResult[0]?.unique_agents || 0;

    return NextResponse.json({
      success: true,
      debug_info: {
        total_deals_in_db: totalDeals,
        today_deals: todayDeals,
        today_revenue: todayRevenue,
        recent_deals_7d: recentDeals,
        recent_revenue_7d: recentRevenue,
        total_callbacks: totalCallbacks,
        today_callbacks: todayCallbacks,
        unique_agents: uniqueAgents,
        avg_deal_size: avgDealSize,
        deal_dates_sample: dealDatesResult,
        sample_deals: sampleDealsResult
      },
      corrected_analytics: {
        total_deals: totalDeals.toString(),
        today_deals: todayDeals.toString(),
        today_revenue: todayRevenue,
        total_revenue: recentRevenue,
        avg_deal_size: avgDealSize,
        unique_agents: uniqueAgents.toString(),
        total_callbacks: totalCallbacks.toString(),
        today_callbacks: todayCallbacks.toString(),
        conversion_rate: totalCallbacks > 0 ? ((todayDeals / totalCallbacks) * 100) : 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test Analytics: Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to run analytics test',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
