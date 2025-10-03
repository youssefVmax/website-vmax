import { NextRequest, NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/server/db';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Analytics Test API: Starting connection test...');
    
    // Test basic database connection
    const connectionTest = await testConnection();
    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test basic queries
    const testResults: any = {
      connection: true,
      tables: {},
      timestamp: new Date().toISOString()
    };

    // Test deals table
    try {
      const [dealsResult] = await query('SELECT COUNT(*) as count FROM deals LIMIT 1');
      testResults.tables.deals = {
        accessible: true,
        count: dealsResult[0]?.count || 0
      };
      console.log('✅ Deals table test passed:', testResults.tables.deals);
    } catch (error) {
      testResults.tables.deals = {
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log('❌ Deals table test failed:', error);
    }

    // Test callbacks table
    try {
      const [callbacksResult] = await query('SELECT COUNT(*) as count FROM callbacks LIMIT 1');
      testResults.tables.callbacks = {
        accessible: true,
        count: callbacksResult[0]?.count || 0
      };
      console.log('✅ Callbacks table test passed:', testResults.tables.callbacks);
    } catch (error) {
      testResults.tables.callbacks = {
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log('❌ Callbacks table test failed:', error);
    }

    // Test targets table
    try {
      const [targetsResult] = await query('SELECT COUNT(*) as count FROM targets LIMIT 1');
      testResults.tables.targets = {
        accessible: true,
        count: targetsResult[0]?.count || 0
      };
      console.log('✅ Targets table test passed:', testResults.tables.targets);
    } catch (error) {
      testResults.tables.targets = {
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log('❌ Targets table test failed:', error);
    }

    // Test sample data fetch
    try {
      const [sampleDeals] = await query('SELECT * FROM deals LIMIT 3');
      testResults.sampleData = {
        deals: sampleDeals || []
      };
      console.log('✅ Sample data fetch passed');
    } catch (error) {
      testResults.sampleData = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log('❌ Sample data fetch failed:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Analytics API connection test completed',
      data: testResults
    });

  } catch (error) {
    console.error('❌ Analytics Test API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Analytics test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
