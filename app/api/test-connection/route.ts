import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '../../../lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing MySQL connection...');
    const isConnected = await testConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'MySQL connection successful',
        timestamp: new Date().toISOString(),
        database_config: {
          host: process.env.MYSQL_HOST || 'localhost',
          port: process.env.MYSQL_PORT || '3306',
          user: process.env.MYSQL_USER || 'youssef',
          database: process.env.MYSQL_DATABASE || 'vmax'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'MySQL connection failed',
        timestamp: new Date().toISOString(),
        database_config: {
          host: process.env.MYSQL_HOST || 'localhost',
          port: process.env.MYSQL_PORT || '3306',
          user: process.env.MYSQL_USER || 'youssef',
          database: process.env.MYSQL_DATABASE || 'vmax'
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      database_config: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || '3306',
        user: process.env.MYSQL_USER || 'youssef',
        database: process.env.MYSQL_DATABASE || 'vmax'
      }
    }, { status: 500 });
  }
}
