import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function addCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('X-Accel-Expires', '0');
  return res;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function GET() {
  try {

    const sql = `
      SELECT 
        c.sales_agent AS agent_name,
        COUNT(c.id) AS total_callbacks,
        SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        MAX(COALESCE(u.role, 'salesman')) AS agent_role,
        MAX(COALESCE(u.team, c.sales_team, 'Unknown Team')) AS agent_team,
        MAX(COALESCE(u.id, c.created_by_id, c.SalesAgentID)) AS agent_id
      FROM callbacks c
      LEFT JOIN users u ON (c.created_by_id = u.id OR c.SalesAgentID = u.id)
      WHERE c.sales_agent IS NOT NULL AND c.sales_agent != ''
      GROUP BY c.sales_agent
      ORDER BY total_callbacks DESC
      LIMIT 3;
    `;

    const rows = await query(sql, []);

    const topCreators = rows.map((r: any, index: number) => ({
      rank: index + 1,
      agentId: r.agent_id || r.agent_name,
      userName: r.agent_name,
      userRole: r.agent_role || 'salesman',
      userTeam: r.agent_team || 'Unknown Team',
      callbackCount: parseInt(r.total_callbacks) || 0,
      completedCallbacks: parseInt(r.completed_count) || 0,
      pendingCallbacks: parseInt(r.pending_count) || 0,
      successRate: r.total_callbacks > 0 
        ? parseFloat(((r.completed_count / r.total_callbacks) * 100).toFixed(1))
        : 0
    }));


    return addCorsHeaders(NextResponse.json({
      success: true,
      data: {
        topCallbackCreators: topCreators,
        totalCreators: topCreators.length
      },
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('❌ Error fetching top callback creators:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'Failed to fetch top callback creators',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 }));
  }
}
