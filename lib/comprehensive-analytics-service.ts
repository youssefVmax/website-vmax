// Comprehensive Analytics Service - Uses all API endpoints for complete dashboard
import { DirectMySQLService } from './direct-mysql-service';

export interface ComprehensiveAnalytics {
  // Dashboard Stats
  dashboardStats: {
    total_deals: number;
    total_revenue: number;
    avg_deal_size: number;
    unique_agents: number;
    today_deals: number;
    today_revenue: number;
    total_callbacks: number;
    pending_callbacks: number;
    completed_callbacks: number;
    cancelled_callbacks: number;
    today_callbacks: number;
    conversion_rate: string;
    team_performance: Array<{
      sales_team: string;
      team_deals: number;
      team_revenue: number;
      team_avg_deal: number;
    }>;
    agent_performance: Array<{
      SalesAgentID: string;
      sales_agent: string;
      sales_team: string;
      agent_deals: number;
      agent_revenue: number;
      agent_avg_deal: number;
    }>;
    monthly_trends: Array<{
      month: string;
      deals_count: number;
      revenue: number;
    }>;
    filters: any;
    timestamp: string;
  };

  // Team Analytics
  teamAnalytics: Array<{
    sales_team: string;
    total_deals: number;
    total_revenue: number;
    avg_deal_size: number;
    team_size: number;
    total_callbacks: number;
    completed_callbacks: number;
  }>;

  // Agent Performance
  agentPerformance: Array<{
    SalesAgentID: string;
    sales_agent: string;
    sales_team: string;
    deals_count: number;
    revenue: number;
    avg_deal_size: number;
    callbacks_count: number;
    completed_callbacks: number;
    conversion_rate: number;
  }>;

  // Deals Data
  deals: Array<any>;
  
  // Callbacks Data
  callbacks: Array<any>;
  
  // Targets Data
  targets: Array<any>;

  // Health Status
  healthStatus: {
    api_status: string;
    database_status: string;
    last_check: string;
  };
}

export interface AnalyticsFilters {
  userRole: 'manager' | 'team-leader' | 'salesman';
  userId?: string;
  userName?: string;
  managedTeam?: string;
  dateRange?: 'today' | 'week' | 'month';
  team?: string;
}

class ComprehensiveAnalyticsService {
  private directMySQLService: DirectMySQLService;

  constructor() {
    this.directMySQLService = new DirectMySQLService();
  }

  /**
   * Fetch all analytics data from all available endpoints
   */
  async fetchAllAnalytics(filters: AnalyticsFilters): Promise<ComprehensiveAnalytics> {
    console.log('🔄 Fetching comprehensive analytics with filters:', filters);

    try {
      // Parallel fetch all data sources
      const [
        dashboardStats,
        teamAnalytics,
        agentPerformance,
        deals,
        callbacks,
        targets,
        healthStatus
      ] = await Promise.allSettled([
        this.fetchDashboardStats(filters),
        this.fetchTeamAnalytics(filters),
        this.fetchAgentPerformance(filters),
        this.fetchDeals(filters),
        this.fetchCallbacks(filters),
        this.fetchTargets(filters),
        this.checkHealthStatus()
      ]);

      const result: ComprehensiveAnalytics = {
        dashboardStats: dashboardStats.status === 'fulfilled' ? dashboardStats.value : this.getDefaultDashboardStats(),
        teamAnalytics: teamAnalytics.status === 'fulfilled' ? teamAnalytics.value : [],
        agentPerformance: agentPerformance.status === 'fulfilled' ? agentPerformance.value : [],
        deals: deals.status === 'fulfilled' ? deals.value : [],
        callbacks: callbacks.status === 'fulfilled' ? callbacks.value : [],
        targets: targets.status === 'fulfilled' ? targets.value : [],
        healthStatus: healthStatus.status === 'fulfilled' ? healthStatus.value : {
          api_status: 'unknown',
          database_status: 'unknown',
          last_check: new Date().toISOString()
        }
      };

      console.log('✅ Comprehensive analytics fetched successfully');
      return result;

    } catch (error) {
      console.error('❌ Error fetching comprehensive analytics:', error);
      throw error;
    }
  }

  /**
   * Fetch dashboard statistics
   */
  private async fetchDashboardStats(filters: AnalyticsFilters) {
    const params = new URLSearchParams({
      endpoint: 'dashboard-stats',
      user_role: filters.userRole,
      ...(filters.userId && { user_id: filters.userId }),
      ...(filters.managedTeam && { managed_team: filters.managedTeam }),
      ...(filters.dateRange && { date_range: filters.dateRange }),
      ...(filters.team && { team: filters.team })
    });

    const response = await this.directMySQLService.makeDirectRequest(`analytics-api.php?${params}`);
    return response;
  }

  /**
   * Fetch team analytics
   */
  private async fetchTeamAnalytics(filters: AnalyticsFilters) {
    const params = new URLSearchParams({
      endpoint: 'team-analytics',
      user_role: filters.userRole,
      ...(filters.userId && { user_id: filters.userId }),
      ...(filters.managedTeam && { managed_team: filters.managedTeam }),
      ...(filters.dateRange && { date_range: filters.dateRange })
    });

    const response = await this.directMySQLService.makeDirectRequest(`analytics-api.php?${params}`);
    return response.team_analytics || [];
  }

  /**
   * Fetch agent performance
   */
  private async fetchAgentPerformance(filters: AnalyticsFilters) {
    const params = new URLSearchParams({
      endpoint: 'agent-performance',
      user_role: filters.userRole,
      ...(filters.userId && { user_id: filters.userId }),
      ...(filters.managedTeam && { managed_team: filters.managedTeam }),
      ...(filters.dateRange && { date_range: filters.dateRange })
    });

    const response = await this.directMySQLService.makeDirectRequest(`analytics-api.php?${params}`);
    return response.agent_performance || [];
  }

  /**
   * Fetch deals data
   */
  private async fetchDeals(filters: AnalyticsFilters) {
    const params = new URLSearchParams({
      ...(filters.userRole === 'salesman' && filters.userId && { salesAgentId: filters.userId }),
      ...(filters.userRole === 'team-leader' && filters.managedTeam && { salesTeam: filters.managedTeam }),
      limit: '100'
    });

    const response = await this.directMySQLService.makeDirectRequest(`deals?${params}`);
    return response.deals || [];
  }

  /**
   * Fetch callbacks data
   */
  private async fetchCallbacks(filters: AnalyticsFilters) {
    const params = new URLSearchParams({
      ...(filters.userRole === 'salesman' && filters.userId && { salesAgentId: filters.userId }),
      ...(filters.userRole === 'team-leader' && filters.managedTeam && { salesTeam: filters.managedTeam }),
      limit: '100'
    });

    const response = await this.directMySQLService.makeDirectRequest(`callbacks?${params}`);
    return response.callbacks || [];
  }

  /**
   * Fetch targets data
   */
  private async fetchTargets(filters: AnalyticsFilters) {
    const params = new URLSearchParams({
      ...(filters.userId && { agentId: filters.userId }),
      limit: '50'
    });

    const response = await this.directMySQLService.makeDirectRequest(`targets?${params}`);
    return response.targets || [];
  }

  /**
   * Check API health status
   */
  private async checkHealthStatus() {
    try {
      const response = await this.directMySQLService.makeDirectRequest('analytics-api.php?endpoint=health');
      return {
        api_status: 'healthy',
        database_status: 'connected',
        last_check: response.timestamp || new Date().toISOString()
      };
    } catch (error) {
      return {
        api_status: 'error',
        database_status: 'unknown',
        last_check: new Date().toISOString()
      };
    }
  }

  /**
   * Get default dashboard stats structure
   */
  private getDefaultDashboardStats() {
    return {
      total_deals: 0,
      total_revenue: 0,
      avg_deal_size: 0,
      unique_agents: 0,
      today_deals: 0,
      today_revenue: 0,
      total_callbacks: 0,
      pending_callbacks: 0,
      completed_callbacks: 0,
      cancelled_callbacks: 0,
      today_callbacks: 0,
      conversion_rate: '0',
      team_performance: [],
      agent_performance: [],
      monthly_trends: [],
      filters: {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Fetch analytics for specific date range
   */
  async fetchAnalyticsByDateRange(filters: AnalyticsFilters, dateRange: 'today' | 'week' | 'month') {
    return this.fetchAllAnalytics({
      ...filters,
      dateRange
    });
  }

  /**
   * Fetch analytics for specific team
   */
  async fetchAnalyticsForTeam(filters: AnalyticsFilters, team: string) {
    return this.fetchAllAnalytics({
      ...filters,
      team
    });
  }

  /**
   * Get real-time analytics with auto-refresh
   */
  async getRealtimeAnalytics(filters: AnalyticsFilters, intervalMs: number = 30000) {
    const fetchData = () => this.fetchAllAnalytics(filters);
    
    // Initial fetch
    let currentData = await fetchData();
    
    // Set up interval for real-time updates
    const interval = setInterval(async () => {
      try {
        currentData = await fetchData();
        console.log('🔄 Real-time analytics updated');
      } catch (error) {
        console.error('❌ Real-time analytics update failed:', error);
      }
    }, intervalMs);

    return {
      data: currentData,
      stopUpdates: () => clearInterval(interval)
    };
  }
}

// Export singleton instance
export const comprehensiveAnalyticsService = new ComprehensiveAnalyticsService();
export default comprehensiveAnalyticsService;
