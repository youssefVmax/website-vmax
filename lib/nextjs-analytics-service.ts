// Next.js-based analytics service that uses our unified-data API instead of PHP
export class NextJSAnalyticsService {
  private baseUrl = '/api';

  async getDashboardStats(userRole: string = 'manager', userId?: string, dateRange: string = 'all') {
    try {
      console.log('🔄 NextJSAnalyticsService: Getting dashboard stats...', { userRole, userId, dateRange });

      // Use our unified-data API to get deals and callbacks
      const params = new URLSearchParams({
        userRole,
        dataTypes: 'deals,callbacks',
        limit: '1000',
        dateRange
      });

      if (userId) params.append('userId', userId);

      const response = await fetch(`${this.baseUrl}/unified-data?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      const deals = data.data.deals || [];
      const callbacks = data.data.callbacks || [];

      console.log('✅ NextJSAnalyticsService: Raw data loaded:', { 
        deals: deals.length, 
        callbacks: callbacks.length 
      });

      // Calculate analytics from the actual data
      const analytics = this.calculateAnalytics(deals, callbacks, dateRange);
      
      console.log('✅ NextJSAnalyticsService: Analytics calculated:', analytics);

      return {
        success: true,
        ...analytics,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ NextJSAnalyticsService: Error getting dashboard stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        total_deals: '0',
        total_revenue: 0,
        avg_deal_size: 0,
        unique_agents: '0',
        today_deals: '0',
        today_revenue: 0,
        total_callbacks: '0',
        today_callbacks: '0',
        pending_callbacks: '0',
        completed_callbacks: '0',
        cancelled_callbacks: '0',
        conversion_rate: 0,
        agent_performance: [],
        team_performance: [],
        monthly_trends: []
      };
    }
  }

  private calculateAnalytics(deals: any[], callbacks: any[], dateRange: string) {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Filter deals and callbacks based on date range
    let filteredDeals = deals;
    let filteredCallbacks = callbacks;

    if (dateRange === 'today') {
      filteredDeals = deals.filter(deal => {
        const dealDate = new Date(deal.created_at).toISOString().split('T')[0];
        return dealDate === today;
      });
      filteredCallbacks = callbacks.filter(callback => {
        const callbackDate = new Date(callback.created_at).toISOString().split('T')[0];
        return callbackDate === today;
      });
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredDeals = deals.filter(deal => new Date(deal.created_at) >= weekAgo);
      filteredCallbacks = callbacks.filter(callback => new Date(callback.created_at) >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredDeals = deals.filter(deal => new Date(deal.created_at) >= monthAgo);
      filteredCallbacks = callbacks.filter(callback => new Date(callback.created_at) >= monthAgo);
    }

    // Calculate deal metrics
    const totalDeals = filteredDeals.length;
    const totalRevenue = filteredDeals.reduce((sum, deal) => {
      return sum + (parseFloat(deal.amount_paid) || parseFloat(deal.amountPaid) || parseFloat(deal.amount) || 0);
    }, 0);
    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

    // Get today's specific metrics
    const todayDeals = deals.filter(deal => {
      const dealDate = new Date(deal.created_at).toISOString().split('T')[0];
      return dealDate === today;
    }).length;

    const todayRevenue = deals
      .filter(deal => {
        const dealDate = new Date(deal.created_at).toISOString().split('T')[0];
        return dealDate === today;
      })
      .reduce((sum, deal) => {
        return sum + (parseFloat(deal.amount_paid) || parseFloat(deal.amountPaid) || parseFloat(deal.amount) || 0);
      }, 0);

    // Calculate callback metrics
    const totalCallbacks = filteredCallbacks.length;
    const todayCallbacks = callbacks.filter(callback => {
      const callbackDate = new Date(callback.created_at).toISOString().split('T')[0];
      return callbackDate === today;
    }).length;

    const pendingCallbacks = filteredCallbacks.filter(cb => cb.status === 'pending').length;
    const completedCallbacks = filteredCallbacks.filter(cb => cb.status === 'completed').length;
    const cancelledCallbacks = filteredCallbacks.filter(cb => cb.status === 'cancelled').length;

    // Calculate conversion rate
    const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;

    // Get unique agents
    const uniqueAgents = new Set(
      filteredDeals
        .map(deal => deal.SalesAgentID || deal.salesAgentId)
        .filter(id => id && id !== '')
    ).size;

    // Calculate agent performance
    const agentPerformance = this.calculateAgentPerformance(filteredDeals, filteredCallbacks);

    return {
      total_deals: totalDeals.toString(),
      total_revenue: totalRevenue,
      avg_deal_size: avgDealSize,
      unique_agents: uniqueAgents.toString(),
      today_deals: todayDeals.toString(),
      today_revenue: todayRevenue,
      total_callbacks: totalCallbacks.toString(),
      today_callbacks: todayCallbacks.toString(),
      pending_callbacks: pendingCallbacks.toString(),
      completed_callbacks: completedCallbacks.toString(),
      cancelled_callbacks: cancelledCallbacks.toString(),
      conversion_rate: conversionRate,
      agent_performance: agentPerformance,
      team_performance: [], // Can be implemented later
      monthly_trends: [] // Can be implemented later
    };
  }

  private calculateAgentPerformance(deals: any[], callbacks: any[]) {
    const agentStats: Record<string, any> = {};

    // Process deals
    deals.forEach(deal => {
      const agentId = deal.SalesAgentID || deal.salesAgentId;
      const agentName = deal.salesAgentName || deal.sales_agent || agentId;
      
      if (!agentId) return;

      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          agent_id: agentId,
          agent_name: agentName,
          deals_count: 0,
          total_revenue: 0,
          callbacks_count: 0,
          conversion_rate: 0
        };
      }

      agentStats[agentId].deals_count++;
      agentStats[agentId].total_revenue += parseFloat(deal.amount_paid) || parseFloat(deal.amountPaid) || parseFloat(deal.amount) || 0;
    });

    // Process callbacks
    callbacks.forEach(callback => {
      const agentId = callback.SalesAgentID || callback.salesAgentId;
      
      if (!agentId || !agentStats[agentId]) return;

      agentStats[agentId].callbacks_count++;
    });

    // Calculate conversion rates
    Object.values(agentStats).forEach((agent: any) => {
      agent.conversion_rate = agent.callbacks_count > 0 
        ? (agent.deals_count / agent.callbacks_count) * 100 
        : 0;
    });

    return Object.values(agentStats);
  }
}

export const nextjsAnalyticsService = new NextJSAnalyticsService();
