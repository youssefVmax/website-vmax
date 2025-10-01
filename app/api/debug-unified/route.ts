import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole') as 'manager' | 'salesman' | 'team_leader';
    const dataTypes = (searchParams.get('dataTypes') || 'deals').split(',');
    
    console.log('🔄 Debug Unified API: Starting with params:', { userRole, dataTypes });

    // Step 1: Test basic database connection
    console.log('🔄 Debug: Testing database connection...');
    await query('SELECT 1 as test');
    console.log('✅ Debug: Database connection successful');

    // Step 2: Test deals query step by step
    if (dataTypes.includes('deals')) {
      console.log('🔄 Debug: Testing deals query...');
      
      // Test basic deals query first
      try {
        const basicQuery = 'SELECT COUNT(*) as count FROM deals';
        console.log('🔄 Debug: Running basic count query:', basicQuery);
        const [countResult] = await query(basicQuery);
        console.log('✅ Debug: Basic count result:', countResult);
        
        // Test the full deals query
        const fullQuery = `SELECT 
          deals.id, deals.DealID, deals.customerName as customer_name, 
          COALESCE(deals.amountPaid, deals.amount, deals.totalAmount, 0) as amount_paid,
          deals.SalesAgentID, deals.salesAgentName as sales_agent,
          deals.status, deals.created_at
        FROM deals 
        WHERE 1=1 
        ORDER BY deals.created_at DESC 
        LIMIT 5`;
        
        console.log('🔄 Debug: Running full deals query:', fullQuery);
        const [dealsResult] = await query(fullQuery);
        console.log('✅ Debug: Full deals result:', dealsResult);
        
        return NextResponse.json({
          success: true,
          debug: 'deals_query_successful',
          database_connection: 'ok',
          deals_count: countResult[0]?.count || 0,
          sample_deals: dealsResult,
          timestamp: new Date().toISOString()
        });
        
      } catch (dealsError) {
        console.error('❌ Debug: Deals query failed:', dealsError);
        return NextResponse.json({
          success: false,
          debug: 'deals_query_failed',
          database_connection: 'ok',
          error: dealsError instanceof Error ? dealsError.message : 'Unknown deals error',
          stack: dealsError instanceof Error ? dealsError.stack : undefined,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      debug: 'no_deals_requested',
      database_connection: 'ok',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Debug Unified API: Critical error:', error);
    
    return NextResponse.json({
      success: false,
      debug: 'critical_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
