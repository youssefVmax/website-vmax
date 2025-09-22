import { NextRequest, NextResponse } from 'next/server';
import { testConnection, getPoolStats } from '@/lib/server/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Health check requested');
    
    const startTime = Date.now();
    
    // Test database connection
    const dbHealthy = await testConnection();
    const dbResponseTime = Date.now() - startTime;
    
    // Get pool statistics
    const poolStats = getPoolStats();
    
    // Check system health
    const systemHealth = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    };
    
    const healthStatus = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      database: {
        connected: dbHealthy,
        responseTime: `${dbResponseTime}ms`,
        pool: poolStats
      },
      system: systemHealth,
      services: {
        unifiedData: 'active',
        analytics: 'active',
        userManagement: 'active'
      }
    };
    
    console.log('✅ Health check completed:', healthStatus.status);
    
    return NextResponse.json(healthStatus, {
      status: dbHealthy ? 200 : 503
    });
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}
