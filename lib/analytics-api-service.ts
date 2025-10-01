interface AnalyticsFilters {
  userRole: 'manager' | 'salesman' | 'team_leader';
  userId?: string;
  userName?: string;
  managedTeam?: string;
  dateRange?: string;
}

interface AnalyticsResponse {
  success: boolean;
  data: {
    deals: any[];
    callbacks: any[];
    targets: any[];
    analytics: {
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
    };
    filters: AnalyticsFilters;
  };
  timestamp: string;
}

class AnalyticsApiService {
  private baseUrl = '/api/analytics';

  async getAnalytics(filters: AnalyticsFilters): Promise<AnalyticsResponse> {
    try {
      const params = new URLSearchParams();
      
      // Add all filter parameters
      params.append('userRole', filters.userRole);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.userName) params.append('userName', filters.userName);
      if (filters.managedTeam) params.append('managedTeam', filters.managedTeam);
      if (filters.dateRange) params.append('dateRange', filters.dateRange);

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch analytics data');
      }

      return data;
    } catch (error) {
      console.error('Analytics API Service error:', error);
      
      // Return fallback data structure
      return {
        success: false,
        data: {
          deals: [],
          callbacks: [],
          targets: [],
          analytics: {
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
          },
          filters
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // Role-specific helper methods
  async getManagerAnalytics(dateRange: string = 'all'): Promise<AnalyticsResponse> {
    return this.getAnalytics({
      userRole: 'manager',
      dateRange
    });
  }

  async getSalesmanAnalytics(userId: string, userName: string, dateRange: string = 'all'): Promise<AnalyticsResponse> {
    return this.getAnalytics({
      userRole: 'salesman',
      userId,
      userName,
      dateRange
    });
  }

  async getTeamLeaderAnalytics(userId: string, userName: string, managedTeam: string, dateRange: string = 'all'): Promise<AnalyticsResponse> {
    return this.getAnalytics({
      userRole: 'team_leader',
      userId,
      userName,
      managedTeam,
      dateRange
    });
  }

  // Quick KPI methods
  async getQuickKPIs(filters: AnalyticsFilters): Promise<{
    totalDeals: number;
    totalRevenue: number;
    averageDealSize: number;
    totalCallbacks: number;
    conversionRate: number;
  }> {
    const response = await this.getAnalytics(filters);
    return response.data.analytics.overview;
  }

  // Chart data methods
  async getChartData(filters: AnalyticsFilters): Promise<{
    topAgents: Array<{ agent: string; sales: number; deals: number }>;
    serviceDistribution: Array<{ service: string; sales: number }>;
    teamDistribution: Array<{ team: string; sales: number }>;
    dailyTrend: Array<{ date: string; sales: number }>;
  }> {
    const response = await this.getAnalytics(filters);
    return response.data.analytics.charts;
  }
}

// Export singleton instance
export const analyticsApiService = new AnalyticsApiService();
export default analyticsApiService;
