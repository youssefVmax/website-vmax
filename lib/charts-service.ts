/**
 * Charts Service for fetching chart data from the API
 */

export interface ChartDataPoint {
  date?: string;
  month?: string;
  deals: number;
  revenue: number;
  agent?: string;
  team?: string;
  service?: string;
  customer?: string;
  status?: string;
  count?: number;
  percentage?: number;
  total?: number;
  completed?: number;
  pending?: number;
  conversionRate?: number;
}

export interface ChartSummary {
  total_deals: number;
  total_revenue: number;
  avg_deal_size: number;
  unique_agents: number;
}

export interface ChartsData {
  salesTrend?: ChartDataPoint[];
  salesByAgent?: ChartDataPoint[];
  salesByTeam?: ChartDataPoint[];
  dealStatus?: ChartDataPoint[];
  serviceTier?: ChartDataPoint[];
  callbackPerformance?: ChartDataPoint[];
  monthlyRevenue?: ChartDataPoint[];
  topCustomers?: ChartDataPoint[];
  summary?: ChartSummary;
}

export interface ChartsFilters {
  userRole: 'manager' | 'salesman' | 'team_leader';
  userId: string;
  managedTeam?: string;
  chartType?: string;
  dateRange?: string;
}

class ChartsService {
  private baseUrl = '/api/charts';

  /**
   * Fetch chart data from the API
   */
  async getChartsData(filters: ChartsFilters): Promise<ChartsData> {
    try {
      const params = new URLSearchParams({
        userRole: filters.userRole,
        userId: filters.userId,
        chartType: filters.chartType || 'all',
        dateRange: filters.dateRange || '30'
      });

      if (filters.managedTeam) {
        params.append('managedTeam', filters.managedTeam);
      }

      console.log('🔄 ChartsService: Fetching chart data...', filters);

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Charts API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch chart data');
      }

      console.log('✅ ChartsService: Chart data fetched successfully');
      return result.data;
    } catch (error) {
      console.error('❌ ChartsService: Error fetching chart data:', error);
      throw error;
    }
  }

  /**
   * Get specific chart data
   */
  async getSpecificChart(chartType: string, filters: Omit<ChartsFilters, 'chartType'>): Promise<ChartDataPoint[]> {
    try {
      const data = await this.getChartsData({ ...filters, chartType });
      
      switch (chartType) {
        case 'sales-trend':
          return data.salesTrend || [];
        case 'sales-by-agent':
          return data.salesByAgent || [];
        case 'sales-by-team':
          return data.salesByTeam || [];
        case 'deal-status':
          return data.dealStatus || [];
        case 'service-tier':
          return data.serviceTier || [];
        case 'callback-performance':
          return data.callbackPerformance || [];
        case 'monthly-revenue':
          return data.monthlyRevenue || [];
        case 'top-customers':
          return data.topCustomers || [];
        default:
          return [];
      }
    } catch (error) {
      console.error(`❌ ChartsService: Error fetching ${chartType} chart:`, error);
      throw error;
    }
  }

  /**
   * Get chart colors based on chart type
   */
  getChartColors(chartType: string): string[] {
    const colorSchemes: Record<string, string[]> = {
      'sales-trend': ['#3B82F6', '#10B981'],
      'sales-by-agent': ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'],
      'sales-by-team': ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'],
      'deal-status': ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
      'service-tier': ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'],
      'callback-performance': ['#10B981', '#F59E0B', '#EF4444'],
      'monthly-revenue': ['#3B82F6', '#10B981'],
      'top-customers': ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444']
    };

    return colorSchemes[chartType] || ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];
  }

  /**
   * Format chart data for display
   */
  formatChartData(data: ChartDataPoint[], chartType: string): ChartDataPoint[] {
    if (!Array.isArray(data)) return [];

    switch (chartType) {
      case 'deal-status':
        // Calculate percentages for status distribution
        const total = data.reduce((sum, item) => sum + (item.count || 0), 0);
        return data.map(item => ({
          ...item,
          percentage: total > 0 ? Math.round(((item.count || 0) / total) * 100) : 0
        }));
      
      case 'sales-by-agent':
      case 'sales-by-team':
      case 'service-tier':
      case 'top-customers':
        // Sort by revenue descending
        return [...data].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
      
      case 'sales-trend':
      case 'callback-performance':
      case 'monthly-revenue':
        // Ensure chronological order
        return [...data].sort((a, b) => {
          const dateA = new Date(a.date || a.month || '');
          const dateB = new Date(b.date || b.month || '');
          return dateA.getTime() - dateB.getTime();
        });
      
      default:
        return data;
    }
  }

  /**
   * Get chart configuration
   */
  getChartConfig(chartType: string) {
    const configs: Record<string, any> = {
      'sales-trend': {
        type: 'line',
        xAxis: 'date',
        yAxis: ['deals', 'revenue'],
        title: 'Sales Trend Over Time'
      },
      'sales-by-agent': {
        type: 'bar',
        xAxis: 'agent',
        yAxis: 'revenue',
        title: 'Sales by Agent'
      },
      'sales-by-team': {
        type: 'pie',
        dataKey: 'revenue',
        nameKey: 'team',
        title: 'Sales by Team'
      },
      'deal-status': {
        type: 'pie',
        dataKey: 'count',
        nameKey: 'status',
        title: 'Deal Status Distribution'
      },
      'service-tier': {
        type: 'bar',
        xAxis: 'service',
        yAxis: 'revenue',
        title: 'Revenue by Service Tier'
      },
      'callback-performance': {
        type: 'area',
        xAxis: 'date',
        yAxis: ['total', 'completed', 'pending'],
        title: 'Callback Performance'
      },
      'monthly-revenue': {
        type: 'bar',
        xAxis: 'month',
        yAxis: 'revenue',
        title: 'Monthly Revenue Comparison'
      },
      'top-customers': {
        type: 'bar',
        xAxis: 'customer',
        yAxis: 'revenue',
        title: 'Top Customers by Revenue'
      }
    };

    return configs[chartType] || { type: 'bar', title: 'Chart' };
  }
}

// Export singleton instance
export const chartsService = new ChartsService();

// Export utility functions
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};
