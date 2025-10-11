import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/server/db';

// Force dynamic rendering - NO CACHING
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function addCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  // CRITICAL: No caching headers
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('X-Accel-Expires', '0');
  return res;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/callbacks/selectors - Fetching selector data');
    
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');
    const userId = searchParams.get('userId');
    
    console.log('👤 User context:', { userRole, userId });

    // Get available months for filtering
    let availableMonths: { value: string; label: string }[] = [];
    try {
      const [monthRows] = await query<any>(`
        SELECT DISTINCT DATE_FORMAT(COALESCE(created_at, updated_at), "%Y-%m") as month
        FROM callbacks 
        WHERE COALESCE(created_at, updated_at) IS NOT NULL
        ORDER BY month DESC
        LIMIT 24
      `);
      
      availableMonths = monthRows
        .map((row: any) => row.month)
        .filter(Boolean)
        .map((month: string) => {
          const [year, monthNum] = month.split('-');
          const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          });
          return {
            value: month,
            label: monthName
          };
        });
    } catch (monthError) {
      console.error('❌ Error fetching available months:', monthError);
    }

    // Get available agents for filtering (role-based)
    let availableAgents: { value: string; label: string }[] = [];
    try {
      let agentQuery = '';
      let agentParams: any[] = [];
      
      if (userRole === 'manager') {
        // Managers can see all agents
        agentQuery = `
          SELECT DISTINCT sales_agent
          FROM callbacks 
          WHERE sales_agent IS NOT NULL AND sales_agent != ''
          ORDER BY sales_agent ASC
        `;
      } else if (userRole === 'team_leader' && userId) {
        // Team leaders can see agents from their team + themselves
        const [userRows] = await query<any>('SELECT `managedTeam` FROM `users` WHERE `id` = ?', [userId]);
        const managedTeam = userRows[0]?.managedTeam;
        if (managedTeam) {
          agentQuery = `
            SELECT DISTINCT sales_agent
            FROM callbacks 
            WHERE sales_agent IS NOT NULL AND sales_agent != ''
            AND (SalesAgentID = ? OR sales_team = ?)
            ORDER BY sales_agent ASC
          `;
          agentParams = [userId, managedTeam];
        } else {
          agentQuery = `
            SELECT DISTINCT sales_agent
            FROM callbacks 
            WHERE sales_agent IS NOT NULL AND sales_agent != ''
            AND SalesAgentID = ?
            ORDER BY sales_agent ASC
          `;
          agentParams = [userId];
        }
      } else if (userRole === 'salesman' && userId) {
        // Salesmen can only see themselves
        agentQuery = `
          SELECT DISTINCT sales_agent
          FROM callbacks 
          WHERE sales_agent IS NOT NULL AND sales_agent != ''
          AND SalesAgentID = ?
          ORDER BY sales_agent ASC
        `;
        agentParams = [userId];
      }
      
      if (agentQuery) {
        const [agentRows] = await query<any>(agentQuery, agentParams);
        availableAgents = agentRows
          .map((row: any) => row.sales_agent)
          .filter(Boolean)
          .map((agent: string) => ({
            value: agent,
            label: agent
          }));
      }
    } catch (agentError) {
      console.error('❌ Error fetching available agents:', agentError);
    }

    // Get available teams for filtering (only for managers)
    let availableTeams: { value: string; label: string }[] = [];
    if (userRole === 'manager') {
      try {
        const [teamRows] = await query<any>(`
          SELECT DISTINCT sales_team
          FROM callbacks 
          WHERE sales_team IS NOT NULL AND sales_team != ''
          ORDER BY sales_team ASC
        `);
        
        availableTeams = teamRows
          .map((row: any) => row.sales_team)
          .filter(Boolean)
          .map((team: string) => ({
            value: team,
            label: team
          }));
      } catch (teamError) {
        console.error('❌ Error fetching available teams:', teamError);
      }
    }

    // Get status options (static but consistent)
    const availableStatuses = [
      { value: 'pending', label: 'Pending' },
      { value: 'contacted', label: 'Contacted' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ];

    // Get priority options (static but consistent)
    const availablePriorities = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' }
    ];

    console.log('✅ Selector data fetched successfully:', {
      months: availableMonths.length,
      agents: availableAgents.length,
      teams: availableTeams.length
    });

    return addCorsHeaders(NextResponse.json({
      success: true,
      data: {
        months: availableMonths,
        agents: availableAgents,
        teams: availableTeams,
        statuses: availableStatuses,
        priorities: availablePriorities
      },
      userRole,
      userId,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('❌ Error fetching selector data:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch selector data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 }));
  }
}

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}
