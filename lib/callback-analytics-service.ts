import { callbacksService } from './firebase-callbacks-service';

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
}

export interface CallbackFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string[];
  agent?: string;
  userRole?: 'manager' | 'salesman' | 'customer-service';
  userId?: string;
}

export class CallbackAnalyticsService {
  
  async getCallbackKPIs(filters: CallbackFilters = {}): Promise<CallbackKPIs> {
    try {
      // Fetch callbacks with role-based filtering
      let callbacks = await callbacksService.getCallbacks(filters.userRole, filters.userId);
      
      // Apply additional filters
      callbacks = this.applyFilters(callbacks, filters);
      
      // Calculate basic metrics
      const totalCallbacks = callbacks.length;
      const pendingCallbacks = callbacks.filter((c: any) => c.status === 'pending').length;
      const contactedCallbacks = callbacks.filter((c: any) => c.status === 'contacted').length;
      const completedCallbacks = callbacks.filter((c: any) => c.status === 'completed').length;
      const cancelledCallbacks = callbacks.filter((c: any) => c.status === 'cancelled').length;
      
      // Calculate conversion rate (completed / total)
      const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;
      
      // Calculate response time metrics
      const responseTimeMetrics = this.calculateResponseTimeMetrics(callbacks);
      
      // Group by agent
      const callbacksByAgent = this.groupCallbacksByAgent(callbacks);
      
      // Group by status with percentages
      const callbacksByStatus = this.groupCallbacksByStatus(callbacks, totalCallbacks);
      
      // Daily trend analysis
      const dailyCallbackTrend = this.calculateDailyTrend(callbacks);
      
      // Monthly trend analysis
      const monthlyTrend = this.calculateMonthlyTrend(callbacks);
      
      // Top performing agents
      const topPerformingAgents = this.calculateTopPerformingAgents(callbacks);
      
      // Recent callbacks (last 10)
      const recentCallbacks = callbacks
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 10);
      
      return {
        totalCallbacks,
        pendingCallbacks,
        contactedCallbacks,
        completedCallbacks,
        cancelledCallbacks,
        conversionRate,
        averageResponseTime: responseTimeMetrics.averageHours,
        callbacksByAgent,
        callbacksByStatus,
        dailyCallbackTrend,
        monthlyTrend,
        topPerformingAgents,
        recentCallbacks,
        responseTimeMetrics
      };
      
    } catch (error) {
      console.error('Error calculating callback KPIs:', error);
      throw error;
    }
  }
  
  private applyFilters(callbacks: any[], filters: CallbackFilters): any[] {
    let filtered = [...callbacks];
    
    // Date range filter
    if (filters.dateRange) {
      filtered = filtered.filter(callback => {
        const callbackDate = new Date(callback.created_at);
        return callbackDate >= filters.dateRange!.start && callbackDate <= filters.dateRange!.end;
      });
    }
    
    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(callback => filters.status!.includes(callback.status));
    }
    
    // Agent filter
    if (filters.agent) {
      filtered = filtered.filter(callback => 
        callback.created_by === filters.agent || 
        callback.assigned_to === filters.agent
      );
    }
    
    // User role filter
    if (filters.userRole === 'salesman' && filters.userId) {
      filtered = filtered.filter(callback => 
        callback.created_by === filters.userId || 
        callback.assigned_to === filters.userId
      );
    }
    
    return filtered;
  }
  
  private calculateResponseTimeMetrics(callbacks: any[]) {
    const responseTimes: number[] = [];
    
    callbacks.forEach(callback => {
      if (callback.created_at && callback.updated_at && callback.status !== 'pending') {
        const created = new Date(callback.created_at);
        const updated = new Date(callback.updated_at);
        const diffHours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
        if (diffHours >= 0) {
          responseTimes.push(diffHours);
        }
      }
    });
    
    if (responseTimes.length === 0) {
      return { averageHours: 0, medianHours: 0, fastest: 0, slowest: 0 };
    }
    
    responseTimes.sort((a: number, b: number) => a - b);
    
    const averageHours = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const medianHours = responseTimes[Math.floor(responseTimes.length / 2)];
    const fastest = responseTimes[0];
    const slowest = responseTimes[responseTimes.length - 1];
    
    return { averageHours, medianHours, fastest, slowest };
  }
  
  private groupCallbacksByAgent(callbacks: any[]) {
    const agentMap: { [key: string]: { agent: string; count: number; conversions: number } } = {};
    
    callbacks.forEach(callback => {
      const agent = callback.created_by || callback.assigned_to || 'Unassigned';
      
      if (!agentMap[agent]) {
        agentMap[agent] = { agent, count: 0, conversions: 0 };
      }
      
      agentMap[agent].count++;
      
      if (callback.status === 'completed' || callback.converted_to_deal) {
        agentMap[agent].conversions++;
      }
    });
    
    return Object.values(agentMap).sort((a, b) => b.count - a.count);
  }
  
  private groupCallbacksByStatus(callbacks: any[], total: number) {
    const statusMap: { [key: string]: number } = {};
    
    callbacks.forEach(callback => {
      const status = callback.status || 'unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    
    return Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  }
  
  private calculateDailyTrend(callbacks: any[]) {
    const dailyMap: { [key: string]: { callbacks: number; conversions: number } } = {};
    
    callbacks.forEach(callback => {
      const date = new Date(callback.created_at).toISOString().split('T')[0];
      
      if (!dailyMap[date]) {
        dailyMap[date] = { callbacks: 0, conversions: 0 };
      }
      
      dailyMap[date].callbacks++;
      
      if (callback.status === 'completed' || callback.converted_to_deal) {
        dailyMap[date].conversions++;
      }
    });
    
    return Object.entries(dailyMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 days
  }
  
  private calculateMonthlyTrend(callbacks: any[]) {
    const monthlyMap: { [key: string]: { callbacks: number; conversions: number } } = {};
    
    callbacks.forEach(callback => {
      const date = new Date(callback.created_at);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap[month]) {
        monthlyMap[month] = { callbacks: 0, conversions: 0 };
      }
      
      monthlyMap[month].callbacks++;
      
      if (callback.status === 'completed' || callback.converted_to_deal) {
        monthlyMap[month].conversions++;
      }
    });
    
    return Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }
  
  private calculateTopPerformingAgents(callbacks: any[]) {
    const agentPerformance: { [key: string]: { totalCallbacks: number; conversions: number } } = {};
    
    callbacks.forEach(callback => {
      const agent = callback.created_by || callback.assigned_to || 'Unassigned';
      
      if (!agentPerformance[agent]) {
        agentPerformance[agent] = { totalCallbacks: 0, conversions: 0 };
      }
      
      agentPerformance[agent].totalCallbacks++;
      
      if (callback.status === 'completed' || callback.converted_to_deal) {
        agentPerformance[agent].conversions++;
      }
    });
    
    return Object.entries(agentPerformance)
      .map(([agent, data]) => ({
        agent,
        conversionRate: data.totalCallbacks > 0 ? (data.conversions / data.totalCallbacks) * 100 : 0,
        totalCallbacks: data.totalCallbacks
      }))
      .filter(agent => agent.totalCallbacks >= 5) // Only agents with at least 5 callbacks
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10);
  }
  
  // Real-time callback metrics for live dashboard
  async getLiveCallbackMetrics(userRole?: string, userId?: string, userName?: string): Promise<{
    pendingCount: number;
    todayCallbacks: number;
    todayConversions: number;
    averageResponseTimeToday: number;
  }> {
    try {
      console.log('Fetching callbacks for analytics:', { userRole, userId, userName });
      const callbacks = await callbacksService.getCallbacks(userRole, userId, userName);
      console.log('Callbacks fetched:', callbacks.length, callbacks);
      const today = new Date().toISOString().split('T')[0];
      
      const todayCallbacks = callbacks.filter((c: any) => 
        new Date(c.created_at).toISOString().split('T')[0] === today
      );
      
      const pendingCount = callbacks.filter((c: any) => c.status === 'pending').length;
      const todayConversions = todayCallbacks.filter((c: any) => 
        c.status === 'completed' || c.converted_to_deal
      ).length;
      
      // Calculate average response time for today
      const responseTimes = todayCallbacks
        .filter((c: any) => c.updated_at && c.status !== 'pending')
        .map((c: any) => {
          const created = new Date(c.created_at);
          const updated = new Date(c.updated_at);
          return (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
        });
      
      const averageResponseTimeToday = responseTimes.length > 0 
        ? responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length 
        : 0;
      
      return {
        pendingCount,
        todayCallbacks: todayCallbacks.length,
        todayConversions,
        averageResponseTimeToday
      };
      
    } catch (error) {
      console.error('Error getting live callback metrics:', error);
      throw error;
    }
  }
}

export const callbackAnalyticsService = new CallbackAnalyticsService();
