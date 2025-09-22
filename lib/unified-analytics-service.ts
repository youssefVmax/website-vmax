import { analyticsApiService } from './analytics-api-service';
import { mysqlAnalyticsService } from './mysql-analytics-service';

interface UserContext {
  id: string;
  name: string;
  username: string;
  role: 'manager' | 'salesman' | 'team-leader';
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

      // Try the new analytics API first
      let analyticsResponse;
      
      if (user.role === 'manager') {
        analyticsResponse = await analyticsApiService.getManagerAnalytics(dateRange);
      } else if (user.role === 'salesman') {
        analyticsResponse = await analyticsApiService.getSalesmanAnalytics(user.id, user.name, dateRange);
      } else if (user.role === 'team-leader' && user.managedTeam) {
        analyticsResponse = await analyticsApiService.getTeamLeaderAnalytics(user.id, user.name, user.managedTeam, dateRange);
      }

      if (analyticsResponse?.success && analyticsResponse.data?.analytics) {
        console.log('✅ UnifiedAnalyticsService: API analytics loaded successfully');
        return analyticsResponse.data.analytics;
      }

      // Fallback to existing MySQL analytics service
      console.log('⚠️ UnifiedAnalyticsService: API failed, using fallback MySQL service');
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
   * Get callback metrics using existing service
   */
  async getCallbackMetrics(user: UserContext): Promise<any> {
    try {
      return await mysqlAnalyticsService.getLiveCallbackMetrics(user.role, user.id, user.name);
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
