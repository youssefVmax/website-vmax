import { NextRequest, NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/server/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Health Check: Testing database connection...');
    
    // Test basic database connection
    const isConnected = await testConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    // Test basic queries
    const [dealsCount] = await query('SELECT COUNT(*) as count FROM deals');
    const [callbacksCount] = await query('SELECT COUNT(*) as count FROM callbacks');
    const [usersCount] = await query('SELECT COUNT(*) as count FROM users');
    const [notificationsCount] = await query('SELECT COUNT(*) as count FROM notifications');
    
    // Check if targets table exists
    let targetsCount = [{ count: 0 }];
    let targetsTableExists = false;
    try {
      const [result] = await query('SELECT COUNT(*) as count FROM targets');
      targetsCount = result as any;
      targetsTableExists = true;
    } catch (error) {
      console.log('⚠️ Health Check: Targets table does not exist:', error);
    }

    console.log('✅ Health Check: All database queries successful');

    return NextResponse.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      counts: {
        deals: dealsCount[0]?.count || 0,
        callbacks: callbacksCount[0]?.count || 0,
        users: usersCount[0]?.count || 0,
        notifications: notificationsCount[0]?.count || 0,
        targets: targetsTableExists ? (targetsCount[0]?.count || 0) : 'table_missing'
      },
      tables: {
        targets: targetsTableExists ? 'exists' : 'missing'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Health Check: Error:', error);
    
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
