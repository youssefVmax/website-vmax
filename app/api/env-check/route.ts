import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering - NO CACHING
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV || 'not_set',
      DB_HOST: process.env.DB_HOST ? '✅ Set' : '❌ Not set (using fallback: vmaxcom.org)',
      DB_PORT: process.env.DB_PORT ? '✅ Set' : '❌ Not set (using fallback: 3306)',
      DB_USER: process.env.DB_USER ? '✅ Set' : '❌ Not set (using fallback: youssef)',
      DB_PASSWORD: process.env.DB_PASSWORD ? '✅ Set' : '❌ Not set (using fallback)',
      DB_NAME: process.env.DB_NAME ? '✅ Set' : '❌ Not set (using fallback: vmax)',
      DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT ? '✅ Set' : '❌ Not set (using fallback: 5)',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'not_set',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: 'Environment variables checked successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check environment',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
