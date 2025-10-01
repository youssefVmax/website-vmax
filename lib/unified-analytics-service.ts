// Import services with fallback handling
import { analyticsApiService } from './analytics-api-service';
import { mysqlAnalyticsService } from './mysql-analytics-service';

interface UserContext {
  id: string;
  name: string;
  username: string;
  role: 'manager' | 'salesman' | 'team_leader';
  managedTeam?: string;
}

interface UnifiedAnalytics {
  overview: {
    totalDeals: number;
    totalRevenue: number;
    averageDealSize: number;
    totalCallbacks: number;
    pendingCallbacks: number;
    completedCallbacks: number;
    conversionRate: number;
  };
  charts: {
    topAgents: Array<{ agent: string; sales: number; deals: number }>;
    serviceDistribution: Array<{ service: string; sales: number }>;
    teamDistribution: Array<{ team: string; sales: number }>;
    dailyTrend: Array<{ date: string; sales: number }>;
  };
  tables: {
    recentDeals: any[];
    recentCallbacks: any[];
  };
  targets: {
    total: number;
    achieved: number;
    progress: Array<{
      agent: string;
      target: number;
      current: number;
      percentage: number;
    }>;
  };
}

class UnifiedAnalyticsService {
  /**
   * Get comprehensive analytics for any user role
   */
  async getAnalytics(user: UserContext, dateRange: string = 'all'): Promise<UnifiedAnalytics> {
    try {
      console.log('🔄 UnifiedAnalyticsService: Fetching analytics for', { 
        userId: user.id, 
        userRole: user.role, 
        userName: user.name,
        managedTeam: user.managedTeam,
        dateRange 
      });

      // Try direct API calls first
      const analyticsData = await this.getDirectAnalytics(user, dateRange);
      if (analyticsData) {
        console.log('✅ UnifiedAnalyticsService: Direct API analytics loaded successfully');
        return analyticsData;
      }

      // Fallback to service-based analytics if available
      if (analyticsApiService) {
        try {
          let analyticsResponse;
          
          if (user.role === 'manager') {
            analyticsResponse = await analyticsApiService.getManagerAnalytics(dateRange);
          } else if (user.role === 'salesman') {
            analyticsResponse = await analyticsApiService.getSalesmanAnalytics(user.id, user.name, dateRange);
          } else if (user.role === 'team_leader' && user.managedTeam) {
            analyticsResponse = await analyticsApiService.getTeamLeaderAnalytics(user.id, user.name, user.managedTeam, dateRange);
          }

          if (analyticsResponse?.success && analyticsResponse.data?.analytics) {
            console.log('✅ UnifiedAnalyticsService: Service analytics loaded successfully');
            return analyticsResponse.data.analytics;
          }
        } catch (error) {
          console.warn('⚠️ UnifiedAnalyticsService: Service analytics failed:', error);
        }
      }

      // Final fallback
      console.log('⚠️ UnifiedAnalyticsService: Using fallback analytics');
      return await this.getFallbackAnalytics(user, dateRange);

    } catch (error) {
      console.error('❌ UnifiedAnalyticsService: Error fetching analytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Get quick KPIs for dashboard cards
   */
  async getQuickKPIs(user: UserContext, dateRange: string = 'all'): Promise<{
    totalDeals: number;
    totalRevenue: number;
    averageDealSize: number;
    totalCallbacks: number;
    conversionRate: number;
  }> {
    try {
      const analytics = await this.getAnalytics(user, dateRange);
      return analytics.overview;
    } catch (error) {
      console.error('❌ UnifiedAnalyticsService: Error fetching KPIs:', error);
      return {
        totalDeals: 0,
        totalRevenue: 0,
        averageDealSize: 0,
        totalCallbacks: 0,
        conversionRate: 0
      };
    }
  }

  /**
   * Get chart data for visualizations
   */
  async getChartData(user: UserContext, dateRange: string = 'all'): Promise<{
    topAgents: Array<{ agent: string; sales: number; deals: number }>;
    serviceDistribution: Array<{ service: string; sales: number }>;
    teamDistribution: Array<{ team: string; sales: number }>;
    dailyTrend: Array<{ date: string; sales: number }>;
  }> {
    try {
      const analytics = await this.getAnalytics(user, dateRange);
      return analytics.charts;
    } catch (error) {
      console.error('❌ UnifiedAnalyticsService: Error fetching chart data:', error);
      return {
        topAgents: [],
        serviceDistribution: [],
        teamDistribution: [],
        dailyTrend: []
      };
    }
  }

  /**
   * Get analytics directly from API endpoints
   */
  async getDirectAnalytics(user: UserContext, dateRange: string = 'all'): Promise<UnifiedAnalytics | null> {
    try {
      const params = new URLSearchParams({
        endpoint: 'dashboard-stats',
        user_role: user.role,
        user_id: user.id,
        date_range: dateRange
      });

      if (user.managedTeam) {
        params.set('managed_team', user.managedTeam);
      }

      const response = await fetch(`/api/analytics-api.php?${params.toString()}`);
      
      if (!response.ok) {
        console.warn('⚠️ Direct analytics API failed:', response.status, response.statusText);
        return null;
      }

      const result = await response.json();
      
      if (!result.success) {
        console.warn('⚠️ Direct analytics API returned error:', result.error);
        return null;
      }

      // Transform API response to UnifiedAnalytics format
      return {
        overview: {
          totalDeals: result.total_deals || 0,
          totalRevenue: result.total_revenue || 0,
          averageDealSize: result.avg_deal_size || 0,
          totalCallbacks: result.total_callbacks || 0,
          pendingCallbacks: result.pending_callbacks || 0,
          completedCallbacks: result.completed_callbacks || 0,
          conversionRate: result.conversion_rate || 0
        },
        charts: {
          topAgents: (result.agent_performance || []).map((agent: any) => ({
            agent: agent.sales_agent || agent.agent || 'Unknown',
            sales: agent.agent_revenue || agent.revenue || 0,
            deals: agent.agent_deals || agent.deals_count || 0
          })),
          serviceDistribution: [], // Not provided by this API
          teamDistribution: (result.team_performance || []).map((team: any) => ({
            team: team.sales_team || team.team || 'Unknown',
            sales: team.team_revenue || team.total_revenue || 0
          })),
          dailyTrend: (result.monthly_trends || []).map((trend: any) => ({
            date: trend.month || trend.date || '',
            sales: trend.revenue || 0
          }))
        },
        tables: {
          recentDeals: [], // Not provided by this API
          recentCallbacks: []
        },
        targets: {
          total: 0, // Not provided by this API
          achieved: 0,
          progress: []
        }
      };
    } catch (error) {
      console.error('❌ UnifiedAnalyticsService: Direct analytics error:', error);
      return null;
    }
  }

  /**
   * Get callback metrics using existing service
   */
  async getCallbackMetrics(user: UserContext): Promise<any> {
    try {
      if (mysqlAnalyticsService) {
        return await mysqlAnalyticsService.getLiveCallbackMetrics(user.role, user.id, user.name);
      }
      
      // Direct API fallback
      const response = await fetch(`/api/analytics-api.php?endpoint=callback-metrics&user_role=${user.role}&user_id=${user.id}`);
      if (response.ok) {
        const result = await response.json();
        return result.success ? result.data : {};
      }
      
      return {
        pendingCount: 0,
        todayCallbacks: 0,
        todayConversions: 0,
        averageResponseTimeToday: 0
      };
    } catch (error) {
      console.error('❌ UnifiedAnalyticsService: Error fetching callback metrics:', error);
      return {
        pendingCount: 0,
        todayCallbacks: 0,
        todayConversions: 0,
        averageResponseTimeToday: 0
      };
    }
  }

  /**
   * Fallback analytics using existing MySQL service
   */
  private async getFallbackAnalytics(user: UserContext, dateRange: string): Promise<UnifiedAnalytics> {
    try {
      // Use existing MySQL analytics service as fallback
      const callbackMetrics = await this.getCallbackMetrics(user);
      
      return {
        overview: {
          totalDeals: 0,
          totalRevenue: 0,
          averageDealSize: 0,
          totalCallbacks: callbackMetrics.todayCallbacks || 0,
          pendingCallbacks: callbackMetrics.pendingCount || 0,
          completedCallbacks: 0,
          conversionRate: 0
        },
        charts: {
          topAgents: [],
          serviceDistribution: [],
          teamDistribution: [],
          dailyTrend: []
        },
        tables: {
          recentDeals: [],
          recentCallbacks: []
        },
        targets: {
          total: 0,
          achieved: 0,
          progress: []
        }
      };
    } catch (error) {
      console.error('❌ UnifiedAnalyticsService: Fallback analytics failed:', error);
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Empty analytics structure for error cases
   */
  private getEmptyAnalytics(): UnifiedAnalytics {
    return {
      overview: {
        totalDeals: 0,
        totalRevenue: 0,
        averageDealSize: 0,
        totalCallbacks: 0,
        pendingCallbacks: 0,
        completedCallbacks: 0,
        conversionRate: 0
      },
      charts: {
        topAgents: [],
        serviceDistribution: [],
        teamDistribution: [],
        dailyTrend: []
      },
      tables: {
        recentDeals: [],
        recentCallbacks: []
      },
      targets: {
        total: 0,
        achieved: 0,
        progress: []
      }
    };
  }

  /**
   * Test the analytics API connection
   */
  async testConnection(user: UserContext): Promise<boolean> {
    try {
      const analytics = await this.getAnalytics(user);
      return analytics !== null;
    } catch (error) {
      console.error('❌ UnifiedAnalyticsService: Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const unifiedAnalyticsService = new UnifiedAnalyticsService();
export default unifiedAnalyticsService;
export type { UserContext, UnifiedAnalytics };
