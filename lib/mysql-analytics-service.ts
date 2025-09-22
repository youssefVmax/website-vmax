export interface CallbackKPIs {
  totalCallbacks: number;
  pendingCallbacks: number;
  contactedCallbacks: number;
  completedCallbacks: number;
  cancelledCallbacks: number;
  conversionRate: number;
  averageResponseTime: number;
  callbacksByAgent: Array<{ agent: string; count: number; conversions: number }>;
  callbacksByStatus: Array<{ status: string; count: number; percentage: number }>;
  dailyCallbackTrend: Array<{ date: string; callbacks: number; conversions: number }>;
  topPerformingAgents: Array<{ agent: string; conversionRate: number; totalCallbacks: number }>;
  recentCallbacks: any[];
  monthlyTrend: Array<{ month: string; callbacks: number; conversions: number }>;
  responseTimeMetrics: {
    averageHours: number;
    medianHours: number;
    fastest: number;
    slowest: number;
  };
  topAgentsByResponseTime: Array<{ agent: string; avgHours: number; medianHours: number; count: number }>;
}

export interface SalesKPIs {
  totalDeals: number;
  totalRevenue: number;
  averageDealSize: number;
  closedDeals: number;
  activeDeals: number;
  todayDeals: number;
  todayRevenue: number;
  salesByAgent: Array<{ agent: string; deals: number; revenue: number; avgDealSize: number; conversions: number }>;
  dailyTrend: Array<{ date: string; deals: number; revenue: number; conversions: number }>;
  monthlyTrend: Array<{ month: string; deals: number; revenue: number; conversions: number }>;
  salesByService: Array<{ service: string; deals: number; revenue: number }>;
  salesByProgram: Array<{ program: string; deals: number; revenue: number }>;
  recentDeals: any[];
}

export interface DashboardStats {
  totalDeals: number;
  totalRevenue: number;
  todayDeals: number;
  todayRevenue: number;
  totalCallbacks: number;
  pendingCallbacks: number;
  todayCallbacks: number;
}

export interface CallbackFilters {
  dateRange?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  status?: 'pending' | 'contacted' | 'completed' | 'cancelled';
  agent?: string;
  userRole?: 'manager' | 'salesman' | 'team-leader';
  userId?: string;
  userName?: string;
  team?: string;
}

import { directMySQLService } from './direct-mysql-service';

export class MySQLAnalyticsService {
  private async fetchAnalytics(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const queryParams = new URLSearchParams({
        endpoint,
        ...Object.fromEntries(
          Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)
        )
      });

      console.log(`🔍 Analytics request: ${endpoint} with params:`, params);
      
      if (endpoint === 'dashboard-stats') {
        return await directMySQLService.getDashboardStats();
      } else if (endpoint === 'callback-kpis') {
        const filters: Record<string, string> = {};
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            filters[key] = String(value);
          }
        });
        return await directMySQLService.getAnalytics(filters);
      }
      
      // Fallback to direct MySQL service
      return await directMySQLService.makeDirectRequest(`analytics-api.php?${queryParams}`, {
        method: 'GET'
      });
    } catch (error) {
      console.error(`Analytics fetch error for ${endpoint}:`, error);
      throw error;
    }
  }

  async getSalesKPIs(filters: CallbackFilters = {}): Promise<SalesKPIs> {
    try {
      const data = await this.fetchAnalytics('sales-kpis', {
        user_role: filters.userRole,
        user_id: filters.userId,
        date_range: filters.dateRange,
        team: filters.team
      });

      return {
        totalDeals: data.totals.total_deals || 0,
        totalRevenue: parseFloat(data.totals.total_revenue) || 0,
        averageDealSize: parseFloat(data.totals.avg_deal_size) || 0,
        closedDeals: data.totals.closed_deals || 0,
        activeDeals: data.totals.active_deals || 0,
        todayDeals: data.totals.today_deals || 0,
        todayRevenue: parseFloat(data.totals.today_revenue) || 0,
        salesByAgent: data.salesByAgent || [],
        dailyTrend: data.dailyTrend || [],
        monthlyTrend: data.monthlyTrend || [],
        salesByService: data.salesByService || [],
        salesByProgram: data.salesByProgram || [],
        recentDeals: data.recentDeals || []
      };
    } catch (error) {
      console.error('Error fetching sales KPIs:', error);
      return this.getEmptySalesKPIs();
    }
  }

  async getCallbackKPIs(filters: CallbackFilters = {}): Promise<CallbackKPIs> {
    try {
      const data = await this.fetchAnalytics('callback-kpis', {
        user_role: filters.userRole,
        user_id: filters.userId,
        date_range: filters.dateRange,
        team: filters.team
      });

      return {
        totalCallbacks: data.total_callbacks || 0,
        pendingCallbacks: data.pending_callbacks || 0,
        contactedCallbacks: data.contacted_callbacks || 0,
        completedCallbacks: data.completed_callbacks || 0,
        cancelledCallbacks: data.cancelled_callbacks || 0,
        conversionRate: parseFloat(data.conversion_rate) || 0,
        averageResponseTime: parseFloat(data.avg_response_hours) || 0,
        callbacksByAgent: data.callbacksByAgent || [],
        callbacksByStatus: data.statusDistribution || [],
        dailyCallbackTrend: data.dailyTrend || [],
        topPerformingAgents: data.callbacksByAgent?.slice(0, 10).map((agent: any) => ({
          agent: agent.agent,
          conversionRate: agent.conversion_rate || 0,
          totalCallbacks: agent.callbacks || 0
        })) || [],
        recentCallbacks: data.recentCallbacks || [],
        monthlyTrend: [], // Will be calculated from daily trend
        responseTimeMetrics: {
          averageHours: parseFloat(data.responseMetrics?.avg_hours) || 0,
          medianHours: parseFloat(data.responseMetrics?.avg_hours) || 0, // Using avg as approximation
          fastest: parseFloat(data.responseMetrics?.fastest_hours) || 0,
          slowest: parseFloat(data.responseMetrics?.slowest_hours) || 0
        },
        topAgentsByResponseTime: data.callbacksByAgent?.filter((agent: any) => agent.avg_response_hours > 0)
          .sort((a: any, b: any) => a.avg_response_hours - b.avg_response_hours)
          .slice(0, 10)
          .map((agent: any) => ({
            agent: agent.agent,
            avgHours: parseFloat(agent.avg_response_hours) || 0,
            medianHours: parseFloat(agent.avg_response_hours) || 0,
            count: agent.callbacks || 0
          })) || []
      };
    } catch (error) {
      console.error('Error fetching callback KPIs:', error);
      return this.getEmptyCallbackKPIs();
    }
  }

  async getDashboardStats(userRole?: string, userId?: string, team?: string): Promise<DashboardStats> {
    try {
      const data = await this.fetchAnalytics('dashboard-stats', {
        user_role: userRole,
        user_id: userId,
        team: team
      });

      return {
        totalDeals: data.total_deals || 0,
        totalRevenue: parseFloat(data.total_revenue) || 0,
        todayDeals: data.today_deals || 0,
        todayRevenue: parseFloat(data.today_revenue) || 0,
        totalCallbacks: data.total_callbacks || 0,
        pendingCallbacks: data.pending_callbacks || 0,
        todayCallbacks: data.today_callbacks || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalDeals: 0,
        totalRevenue: 0,
        todayDeals: 0,
        todayRevenue: 0,
        totalCallbacks: 0,
        pendingCallbacks: 0,
        todayCallbacks: 0
      };
    }
  }

  async getAgentPerformance(userRole?: string, dateRange?: string, team?: string): Promise<any[]> {
    try {
      const data = await this.fetchAnalytics('agent-performance', {
        user_role: userRole,
        date_range: dateRange,
        team: team
      });

      return data || [];
    } catch (error) {
      console.error('Error fetching agent performance:', error);
      return [];
    }
  }

  async getRevenueAnalytics(userRole?: string, userId?: string, team?: string): Promise<any[]> {
    try {
      const data = await this.fetchAnalytics('revenue-analytics', {
        user_role: userRole,
        user_id: userId,
        team: team
      });

      return data || [];
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      return [];
    }
  }

  async getConversionMetrics(userRole?: string, userId?: string, team?: string): Promise<any> {
    try {
      const data = await this.fetchAnalytics('conversion-metrics', {
        user_role: userRole,
        user_id: userId,
        team: team
      });

      return data || {};
    } catch (error) {
      console.error('Error fetching conversion metrics:', error);
      return {};
    }
  }

  // Real-time callback metrics for live dashboard
  async getLiveCallbackMetrics(userRole?: string, userId?: string, userName?: string): Promise<{
    pendingCount: number;
    todayCallbacks: number;
    todayConversions: number;
    averageResponseTimeToday: number;
  }> {
    try {
      const stats = await this.getDashboardStats(userRole, userId);
      const callbackKPIs = await this.getCallbackKPIs({ 
        userRole: userRole as any, 
        userId, 
        userName, 
        dateRange: 'today' 
      });

      return {
        pendingCount: stats.pendingCallbacks,
        todayCallbacks: stats.todayCallbacks,
        todayConversions: callbackKPIs.completedCallbacks,
        averageResponseTimeToday: callbackKPIs.averageResponseTime
      };
    } catch (error) {
      console.error('Error getting live callback metrics:', error);
      return {
        pendingCount: 0,
        todayCallbacks: 0,
        todayConversions: 0,
        averageResponseTimeToday: 0
      };
    }
  }

  private getEmptySalesKPIs(): SalesKPIs {
    return {
      totalDeals: 0,
      totalRevenue: 0,
      averageDealSize: 0,
      closedDeals: 0,
      activeDeals: 0,
      todayDeals: 0,
      todayRevenue: 0,
      salesByAgent: [],
      dailyTrend: [],
      monthlyTrend: [],
      salesByService: [],
      salesByProgram: [],
      recentDeals: []
    };
  }

  private getEmptyCallbackKPIs(): CallbackKPIs {
    return {
      totalCallbacks: 0,
      pendingCallbacks: 0,
      contactedCallbacks: 0,
      completedCallbacks: 0,
      cancelledCallbacks: 0,
      conversionRate: 0,
      averageResponseTime: 0,
      callbacksByAgent: [],
      callbacksByStatus: [],
      dailyCallbackTrend: [],
      topPerformingAgents: [],
      recentCallbacks: [],
      monthlyTrend: [],
      responseTimeMetrics: { averageHours: 0, medianHours: 0, fastest: 0, slowest: 0 },
      topAgentsByResponseTime: []
    };
  }
}

export const mysqlAnalyticsService = new MySQLAnalyticsService();
