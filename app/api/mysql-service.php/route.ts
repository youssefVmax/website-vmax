import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/server/db';

// Ensure Node.js runtime for mysql2
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

// Real-time MySQL service - direct database connection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 200);
    const offset = (page - 1) * limit;

    let payload: any = {};

    switch (path) {
      case 'deals': {
        const salesAgentId = searchParams.get('salesAgentId');
        const salesTeam = searchParams.get('salesTeam') || searchParams.get('team');
        const status = searchParams.get('status');
        const params: any[] = [];
        const where: string[] = [];
        if (salesAgentId) { where.push('`SalesAgentID` = ?'); params.push(salesAgentId); }
        if (salesTeam) { where.push('`sales_team` = ?'); params.push(salesTeam); }
        if (status) { where.push('`status` = ?'); params.push(status); }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [rows] = await query<any>(
          `SELECT * FROM \`deals\` ${whereSql} ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        );
        const [totals] = await query<any>(`SELECT COUNT(*) as c FROM \`deals\` ${whereSql}`, params);
        payload = { deals: rows, total: totals[0]?.c || 0, page, limit };
        break;
      }
      case 'callbacks': {
        const salesAgentId = searchParams.get('salesAgentId') || searchParams.get('SalesAgentID');
        const salesTeam = searchParams.get('salesTeam') || searchParams.get('team');
        const status = searchParams.get('status');
        const params: any[] = [];
        const where: string[] = [];
        if (salesAgentId) { where.push('`SalesAgentID` = ?'); params.push(salesAgentId); }
        if (salesTeam) { where.push('`sales_team` = ?'); params.push(salesTeam); }
        if (status) { where.push('`status` = ?'); params.push(status); }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [rows] = await query<any>(
          `SELECT * FROM \`callbacks\` ${whereSql} ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        );
        const [totals] = await query<any>(`SELECT COUNT(*) as c FROM \`callbacks\` ${whereSql}`, params);
        payload = { callbacks: rows, total: totals[0]?.c || 0, page, limit };
        break;
      }
      case 'targets': {
        const agentId = searchParams.get('agentId');
        const params: any[] = [];
        const where: string[] = [];
        if (agentId) { where.push('`agentId` = ?'); params.push(agentId); }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [rows] = await query<any>(
          `SELECT * FROM \`targets\` ${whereSql} ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        );
        const [totals] = await query<any>(`SELECT COUNT(*) as c FROM \`targets\` ${whereSql}`, params);
        payload = { targets: rows, total: totals[0]?.c || 0, page, limit };
        break;
      }
      case 'notifications': {
        // Basic list, optionally filter by salesAgentId or userRole
        const salesAgentId = searchParams.get('salesAgentId');
        const userRole = searchParams.get('userRole');
        const params: any[] = [];
        const where: string[] = [];
        if (salesAgentId) { where.push('`salesAgentId` = ?'); params.push(salesAgentId); }
        if (userRole) { where.push('`userRole` = ?'); params.push(userRole); }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [rows] = await query<any>(
          `SELECT * FROM \`notifications\` ${whereSql} ORDER BY COALESCE(timestamp, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        );
        const [totals] = await query<any>(`SELECT COUNT(*) as c FROM \`notifications\` ${whereSql}`, params);
        payload = { notifications: rows, total: totals[0]?.c || 0, page, limit };
        break;
      }
      case 'users': {
        const role = searchParams.get('role');
        const team = searchParams.get('team');
        const id = searchParams.get('id');
        const params: any[] = [];
        const where: string[] = [];
        if (id) { where.push('`id` = ?'); params.push(id); }
        if (role) { where.push('`role` = ?'); params.push(role); }
        if (team) { where.push('`team` = ?'); params.push(team); }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [rows] = await query<any>(
          `SELECT * FROM \`users\` ${whereSql} ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        );
        const [totals] = await query<any>(`SELECT COUNT(*) as c FROM \`users\` ${whereSql}`, params);
        payload = { users: rows, total: totals[0]?.c || 0, page, limit };
        break;
      }
      default: {
        payload = { message: 'Specify a valid path parameter', validPaths: ['deals','callbacks','targets','notifications','users'] };
      }
    }

    const response = NextResponse.json({
      ...payload,
      success: true,
      timestamp: new Date().toISOString(),
      source: 'next_mysql',
      path
    });
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Next MySQL Service error:', error);
    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data from MySQL',
        message: error instanceof Error ? error.message : 'Database error',
        timestamp: new Date().toISOString(),
        source: 'next_mysql_error',
        deals: [], callbacks: [], targets: [], notifications: [], users: [], total: 0,
      },
      { status: 502 }
    );
    return addCorsHeaders(response);
  }
}

export async function POST(request: NextRequest) {
  // For full Next-only migration, we will implement CREATE/UPDATE/DELETE here.
  // To avoid partial writes during transition, return 501 for now.
  const res = NextResponse.json(
    { success: false, error: 'Not implemented in Next yet. Use specific endpoints or request migration for writes.' },
    { status: 501 }
  );
  return addCorsHeaders(res);
}
