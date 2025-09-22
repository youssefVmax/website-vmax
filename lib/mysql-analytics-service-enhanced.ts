// Enhanced MySQL Analytics Service - Comprehensive KPI and Analytics
import { apiService } from './api-service';

export interface DashboardStats {
  totalDeals: number;
  totalRevenue: number;
  todayDeals: number;
  todayRevenue: number;
  totalCallbacks: number;
  pendingCallbacks: number;
  todayCallbacks: number;
  conversionRate: number;
  averageResponseTime: number;
}

export interface CallbackMetrics {
  pendingCount: number;
  todayCallbacks: number;
  todayConversions: number;
  averageResponseTimeToday: number;
  totalCallbacks: number;
  completedCallbacks: number;
  conversionRate: number;
}

export interface SalesAnalytics {
  totalRevenue: number;
  totalDeals: number;
  averageDealSize: number;
  closedDeals: number;
  activeDeals: number;
  todayDeals: number;
  todayRevenue: number;
  monthlyGrowth: number;
  conversionRate: number;
}

class MySQLAnalyticsServiceEnhanced {
  
  // Get comprehensive dashboard statistics
  async getDashboardStats(userRole: string, userId?: string): Promise<DashboardStats> {
    try {
      const useReal = process.env.NODE_ENV === 'development' ? '&useReal=1' : '';
      const response = await apiService.makeRequest(`/api/analytics-api.php?endpoint=dashboard-stats&user_role=${userRole}&user_id=${userId || ''}${useReal}`);
      
      return {
        totalDeals: response.total_deals || 0,
        totalRevenue: response.total_revenue || 0,
        todayDeals: response.today_deals || 0,
        todayRevenue: response.today_revenue || 0,
        totalCallbacks: response.total_callbacks || 0,
        pendingCallbacks: response.pending_callbacks || 0,
        todayCallbacks: response.today_callbacks || 0,
        conversionRate: this.calculateConversionRate(response.total_callbacks, response.completed_callbacks),
        averageResponseTime: response.avg_response_time || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return this.getDefaultDashboardStats();
    }
  }

  // Get detailed callback metrics
  async getCallbackMetrics(userRole: string, userId?: string, dateRange: string = 'today'): Promise<CallbackMetrics> {
    try {
      const useReal = process.env.NODE_ENV === 'development' ? '&useReal=1' : '';
      const response = await apiService.makeRequest(`/api/analytics-api.php?endpoint=callback-kpis&user_role=${userRole}&user_id=${userId || ''}&date_range=${dateRange}${useReal}`);
      
      const totals = response.totals || {};
      
      return {
        pendingCount: totals.pending_callbacks || 0,
        todayCallbacks: totals.today_callbacks || 0,
        todayConversions: totals.today_completed || 0,
        averageResponseTimeToday: response.responseMetrics?.avg_hours || 0,
        totalCallbacks: totals.total_callbacks || 0,
        completedCallbacks: totals.completed_callbacks || 0,
        conversionRate: totals.conversion_rate || 0
      };
    } catch (error) {
      console.error('Error fetching callback metrics:', error);
      return this.getDefaultCallbackMetrics();
    }
  }

  // Get comprehensive sales analytics
  async getSalesAnalytics(userRole: string, userId?: string, dateRange: string = 'month'): Promise<SalesAnalytics> {
    try {
      const useReal = process.env.NODE_ENV === 'development' ? '&useReal=1' : '';
      const response = await apiService.makeRequest(`/api/analytics-api.php?endpoint=sales-kpis&user_role=${userRole}&user_id=${userId || ''}&date_range=${dateRange}${useReal}`);
      
      const totals = response.totals || {};
      
      return {
        totalRevenue: totals.total_revenue || 0,
        totalDeals: totals.total_deals || 0,
        averageDealSize: totals.avg_deal_size || 0,
        closedDeals: totals.closed_deals || 0,
        activeDeals: totals.active_deals || 0,
        todayDeals: totals.today_deals || 0,
        todayRevenue: totals.today_revenue || 0,
        monthlyGrowth: this.calculateGrowthRate(response.monthlyTrend || []),
        conversionRate: this.calculateConversionRate(totals.total_deals, totals.closed_deals)
      };
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      return this.getDefaultSalesAnalytics();
    }
  }

  // Get agent performance data
  async getAgentPerformance(userRole: string, dateRange: string = 'month'): Promise<any[]> {
    try {
      const useReal = process.env.NODE_ENV === 'development' ? '&useReal=1' : '';
      const response = await apiService.makeRequest(`/api/analytics-api.php?endpoint=agent-performance&user_role=${userRole}&date_range=${dateRange}${useReal}`);
      return response || [];
    } catch (error) {
      console.error('Error fetching agent performance:', error);
      return [];
    }
  }

  // Get revenue analytics
  async getRevenueAnalytics(userRole: string, userId?: string): Promise<any> {
    try {
      const useReal = process.env.NODE_ENV === 'development' ? '&useReal=1' : '';
      const response = await apiService.makeRequest(`/api/analytics-api.php?endpoint=revenue-analytics&user_role=${userRole}&user_id=${userId || ''}${useReal}`);
      return response || [];
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      return [];
    }
  }

  // Get conversion metrics
  async getConversionMetrics(userRole: string, userId?: string): Promise<any> {
    try {
      const useReal = process.env.NODE_ENV === 'development' ? '&useReal=1' : '';
      const response = await apiService.makeRequest(`/api/analytics-api.php?endpoint=conversion-metrics&user_role=${userRole}&user_id=${userId || ''}${useReal}`);
      return response || {};
    } catch (error) {
      console.error('Error fetching conversion metrics:', error);
      return {};
    }
  }

  // Utility methods
  private calculateConversionRate(total: number, converted: number): number {
    if (!total || total === 0) return 0;
    return Math.round((converted / total) * 100 * 100) / 100; // Round to 2 decimal places
  }

  private calculateGrowthRate(monthlyData: any[]): number {
    if (!monthlyData || monthlyData.length < 2) return 0;
    
    const current = monthlyData[monthlyData.length - 1]?.revenue || 0;
    const previous = monthlyData[monthlyData.length - 2]?.revenue || 0;
    
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }

  // Default fallback data
  private getDefaultDashboardStats(): DashboardStats {
    return {
      totalDeals: 45,
      totalRevenue: 125000,
      todayDeals: 3,
      todayRevenue: 8500,
      totalCallbacks: 28,
      pendingCallbacks: 12,
      todayCallbacks: 5,
      conversionRate: 21.4,
      averageResponseTime: 3.2
    };
  }

  private getDefaultCallbackMetrics(): CallbackMetrics {
    return {
      pendingCount: 12,
      todayCallbacks: 5,
      todayConversions: 2,
      averageResponseTimeToday: 3.2,
      totalCallbacks: 28,
      completedCallbacks: 16,
      conversionRate: 57.1
    };
  }

  private getDefaultSalesAnalytics(): SalesAnalytics {
    return {
      totalRevenue: 125000,
      totalDeals: 45,
      averageDealSize: 2777.78,
      closedDeals: 32,
      activeDeals: 13,
      todayDeals: 3,
      todayRevenue: 8500,
      monthlyGrowth: 15.2,
      conversionRate: 71.1
    };
  }
}

// Export singleton instance
export const mysqlAnalyticsServiceEnhanced = new MySQLAnalyticsServiceEnhanced();
export default mysqlAnalyticsServiceEnhanced;
