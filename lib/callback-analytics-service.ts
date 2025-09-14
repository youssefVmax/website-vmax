import { callbacksService } from './firebase-callbacks-service';
import { getUserById } from './auth';

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

export interface CallbackFilters {
  dateRange?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  status?: 'pending' | 'contacted' | 'completed' | 'cancelled';
  agent?: string;
  userRole?: 'manager' | 'salesman' | 'customer-service';
  userId?: string;
  userName?: string;
}

export class CallbackAnalyticsService {
  
  async getCallbackKPIs(filters: CallbackFilters = {}): Promise<CallbackKPIs> {
    try {
      // Fetch callbacks with role-based filtering
      console.log('Fetching callbacks with filters:', filters);
      
      // For managers, fetch all callbacks without user filtering
      let callbacks;
      if (filters.userRole === 'manager') {
        callbacks = await callbacksService.getCallbacks('manager');
      } else {
        callbacks = await callbacksService.getCallbacks(filters.userRole, filters.userId, filters.userName);
      }
      
      console.log('Raw callbacks fetched for analytics:', callbacks.length, callbacks);
      
      // If no callbacks found, return empty KPIs structure
      if (!callbacks || callbacks.length === 0) {
        console.log('No callbacks found, returning empty KPIs');
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
          monthlyTrend: [],
          topPerformingAgents: [],
          recentCallbacks: [],
          responseTimeMetrics: { averageHours: 0, medianHours: 0, fastest: 0, slowest: 0 },
          topAgentsByResponseTime: []
        };
      }
      
      // Apply additional filters
      callbacks = this.applyFilters(callbacks, filters);
      console.log('Filtered callbacks:', callbacks.length, callbacks);
      
      // Resolve agent names (created_by / assigned_to may be IDs)
      const agentIds = new Set<string>()
      callbacks.forEach((c: any) => {
        if (c.created_by) agentIds.add(String(c.created_by))
        if (c.assigned_to) agentIds.add(String(c.assigned_to))
      })
      const idToName = new Map<string, string>()
      await Promise.all(
        Array.from(agentIds).map(async (id) => {
          try {
            const user = await getUserById(id)
            if (user?.name) idToName.set(id, user.name)
          } catch {}
        })
      )

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
      const callbacksByAgent = this.groupCallbacksByAgent(callbacks, idToName);
      
      // Group by status with percentages
      const callbacksByStatus = this.groupCallbacksByStatus(callbacks, totalCallbacks);
      
      // Daily trend analysis
      const dailyCallbackTrend = this.calculateDailyTrend(callbacks);
      
      // Monthly trend analysis
      const monthlyTrend = this.calculateMonthlyTrend(callbacks);
      
      // Top performing agents
      const topPerformingAgents = this.calculateTopPerformingAgents(callbacks, idToName);
      // Top agents by response time (fastest)
      const topAgentsByResponseTime = this.calculateTopAgentsByResponseTime(callbacks, idToName);
      
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
        responseTimeMetrics,
        topAgentsByResponseTime
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
      const now = new Date();
      let startDate: Date;
      let endDate = now;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(callback => {
        const callbackDate = new Date(callback.created_at);
        return callbackDate >= startDate && callbackDate <= endDate;
      });
    }
    
    // Status filter
    if (filters.status) {
      filtered = filtered.filter(callback => callback.status === filters.status);
    }
    
    // Agent filter
    if (filters.agent) {
      filtered = filtered.filter(callback => 
        callback.created_by === filters.agent || 
        callback.assigned_to === filters.agent
      );
    }
    
    // User role filter - for salesman, don't filter by userId since managers should see all callbacks
    // The filtering is already done in the getCallbacks service method
    // Remove this additional filtering that's causing the disconnect
    
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
  
  private groupCallbacksByAgent(callbacks: any[], idToName: Map<string, string>) {
    const agentMap: { [key: string]: { agent: string; count: number; conversions: number } } = {};
    
    callbacks.forEach(callback => {
      const raw = callback.created_by || callback.assigned_to || 'Unassigned'
      const agent = idToName.get(String(raw)) || String(raw)
      
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
  
  private calculateTopPerformingAgents(callbacks: any[], idToName: Map<string, string>) {
    const agentPerformance: { [key: string]: { totalCallbacks: number; conversions: number } } = {};
    
    callbacks.forEach(callback => {
      const raw = callback.created_by || callback.assigned_to || 'Unassigned'
      const agent = idToName.get(String(raw)) || String(raw)
      
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
  
  private calculateTopAgentsByResponseTime(callbacks: any[], idToName: Map<string, string>) {
    const agentTimes: { [agent: string]: number[] } = {}
    callbacks.forEach((cb) => {
      const raw = cb.created_by || cb.assigned_to || 'Unassigned'
      const agent = idToName.get(String(raw)) || String(raw)
      // Only consider callbacks that have been progressed (not still pending)
      if (!cb.created_at || !cb.updated_at || cb.status === 'pending') return
      const created = new Date(cb.created_at)
      const updated = new Date(cb.updated_at)
      const diffHours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60)
      if (!isNaN(diffHours) && diffHours >= 0) {
        if (!agentTimes[agent]) agentTimes[agent] = []
        agentTimes[agent].push(diffHours)
      }
    })

    const ranked = Object.entries(agentTimes).map(([agent, times]) => {
      const sorted = [...times].sort((a, b) => a - b)
      const avg = sorted.reduce((s, t) => s + t, 0) / sorted.length
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0
      return { agent, avgHours: avg, medianHours: median, count: times.length }
    })

    // Require a minimum handled count to avoid noise, sort by fastest average
    return ranked
      .filter((r) => r.count >= 3)
      .sort((a, b) => a.avgHours - b.avgHours)
      .slice(0, 10)
  }
  
  // Real-time callback metrics for live dashboard
  async getLiveCallbackMetrics(userRole?: string, userId?: string, userName?: string): Promise<{
    pendingCount: number;
    todayCallbacks: number;
    todayConversions: number;
    averageResponseTimeToday: number;
  }> {
    try {
      console.log('Fetching callbacks for live metrics:', { userRole, userId, userName });
      
      // For managers, fetch all callbacks without user filtering
      let callbacks;
      if (userRole === 'manager') {
        callbacks = await callbacksService.getCallbacks('manager');
      } else {
        callbacks = await callbacksService.getCallbacks(userRole, userId, userName);
      }
      
      console.log('Callbacks fetched for live metrics:', callbacks.length, callbacks);
      
      // If no callbacks, return zeros
      if (!callbacks || callbacks.length === 0) {
        console.log('No callbacks found for live metrics, returning zeros');
        return {
          pendingCount: 0,
          todayCallbacks: 0,
          todayConversions: 0,
          averageResponseTimeToday: 0
        };
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const todayCallbacks = callbacks.filter((c: any) => {
        const createdDate = c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : null;
        return createdDate === today;
      });
      
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
          const diffHours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
          return isNaN(diffHours) ? 0 : diffHours;
        })
        .filter(time => time > 0);
      
      const averageResponseTimeToday = responseTimes.length > 0 
        ? responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length 
        : 0;
      
      console.log('Live metrics calculated:', {
        pendingCount,
        todayCallbacks: todayCallbacks.length,
        todayConversions,
        averageResponseTimeToday
      });
      
      return {
        pendingCount,
        todayCallbacks: todayCallbacks.length,
        todayConversions,
        averageResponseTimeToday
      };
      
    } catch (error) {
      console.error('Error getting live callback metrics:', error);
      // Return zeros instead of throwing to prevent dashboard crashes
      return {
        pendingCount: 0,
        todayCallbacks: 0,
        todayConversions: 0,
        averageResponseTimeToday: 0
      };
    }
  }
}

export const callbackAnalyticsService = new CallbackAnalyticsService();
