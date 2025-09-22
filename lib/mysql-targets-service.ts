import { directMySQLService } from './direct-mysql-service';
import { SalesTarget } from './api-service';

export interface TargetsService {
  createTarget: (targetData: Omit<SalesTarget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTarget: (id: string, updates: Partial<SalesTarget>) => Promise<void>;
  deleteTarget: (id: string) => Promise<void>;
  getTargets: (filters?: any) => Promise<SalesTarget[]>;
  getTargetById: (id: string) => Promise<SalesTarget | null>;
  getTargetProgress: (targetId: string) => Promise<any>;
  onTargetsChange: (callback: (targets: SalesTarget[]) => void, filters?: any) => () => void;
}

class MySQLTargetsService implements TargetsService {
  private listeners: { [key: string]: (targets: SalesTarget[]) => void } = {};
  private pollInterval: NodeJS.Timeout | null = null;

  async createTarget(targetData: Omit<SalesTarget, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const result = await directMySQLService.makeDirectRequest('targets', {
        method: 'POST',
        body: JSON.stringify(targetData)
      });
      
      // Trigger listeners
      this.notifyListeners();
      
      return result.id;
    } catch (error) {
      console.error('Error creating target:', error);
      throw error;
    }
  }

  async updateTarget(id: string, updates: Partial<SalesTarget>): Promise<void> {
    try {
      await directMySQLService.makeDirectRequest(`targets?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      // Trigger listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Error updating target:', error);
      throw error;
    }
  }

  async deleteTarget(id: string): Promise<void> {
    try {
      await directMySQLService.makeDirectRequest(`targets?id=${id}`, {
        method: 'DELETE'
      });
      
      // Trigger listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Error deleting target:', error);
      throw error;
    }
  }

  async getTargets(filters?: any): Promise<SalesTarget[]> {
    try {
      const queryFilters: Record<string, string> = {};
      
      if (filters?.agentId) {
        queryFilters.agentId = filters.agentId;
      }
      
      if (filters?.period) {
        queryFilters.period = filters.period;
      }
      
      const response = await directMySQLService.getTargets(filters);
      const targets = Array.isArray(response) ? response : (response.targets || []);
      return targets;
    } catch (error) {
      console.error('Error fetching targets:', error);
      return [];
    }
  }

  async getTargetById(id: string): Promise<SalesTarget | null> {
    try {
      const targets = await directMySQLService.getTargets({ id });
      return targets.length > 0 ? targets[0] : null;
    } catch (error) {
      console.error('Error fetching target by ID:', error);
      return null;
    }
  }

  async getTargetProgress(targetId: string): Promise<any> {
    try {
      const target = await this.getTargetById(targetId);
      if (!target) {
        throw new Error('Target not found');
      }

      // Get deals for this agent in the target period
      const deals = await directMySQLService.getDeals({
        salesAgentId: target.agentId,
        // Note: You might want to add period filtering in the API
      });

      // Calculate progress
      const currentRevenue = deals.reduce((sum, deal) => sum + (deal.amountPaid || 0), 0);
      const currentDeals = deals.length;
      
      const revenueProgress = target.monthlyTarget > 0 ? (currentRevenue / target.monthlyTarget) * 100 : 0;
      const dealsProgress = target.dealsTarget > 0 ? (currentDeals / target.dealsTarget) * 100 : 0;
      
      const remainingRevenue = Math.max(0, target.monthlyTarget - currentRevenue);
      const remainingDeals = Math.max(0, target.dealsTarget - currentDeals);
      
      return {
        targetId: target.id,
        agentId: target.agentId,
        agentName: target.agentName,
        period: target.period,
        monthlyTarget: target.monthlyTarget,
        dealsTarget: target.dealsTarget,
        currentRevenue,
        currentDeals,
        revenueProgress,
        dealsProgress,
        remainingRevenue,
        remainingDeals,
        isRevenueTargetMet: revenueProgress >= 100,
        isDealsTargetMet: dealsProgress >= 100,
        deals,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating target progress:', error);
      throw error;
    }
  }

  onTargetsChange(
    callback: (targets: SalesTarget[]) => void,
    filters?: any
  ): () => void {
    const listenerId = `${JSON.stringify(filters || {})}_${Date.now()}`;
    
    this.listeners[listenerId] = callback;
    
    // Start polling if not already started
    if (!this.pollInterval) {
      this.startPolling();
    }
    
    // Initial data fetch
    this.getTargets(filters).then(callback);
    
    // Return unsubscribe function
    return () => {
      delete this.listeners[listenerId];
      
      // Stop polling if no listeners
      if (Object.keys(this.listeners).length === 0 && this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    };
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.notifyListeners();
    }, 60000); // Poll every minute for targets
  }

  private async notifyListeners(): Promise<void> {
    for (const [listenerId, callback] of Object.entries(this.listeners)) {
      try {
        const filters = JSON.parse(listenerId.split('_')[0]);
        const targets = await this.getTargets(filters);
        callback(targets);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    }
  }

  // Additional analytics methods
  async getTeamTargetsAnalytics(managerId: string, period?: string): Promise<any> {
    try {
      const filters: any = { managerId };
      if (period) filters.period = period;
      
      const targets = await this.getTargets(filters);
      
      const analytics = await Promise.all(
        targets.map(target => this.getTargetProgress(target.id))
      );
      
      const totalTargetRevenue = targets.reduce((sum, target) => sum + target.monthlyTarget, 0);
      const totalTargetDeals = targets.reduce((sum, target) => sum + target.dealsTarget, 0);
      const totalCurrentRevenue = analytics.reduce((sum, progress) => sum + progress.currentRevenue, 0);
      const totalCurrentDeals = analytics.reduce((sum, progress) => sum + progress.currentDeals, 0);
      
      const overallRevenueProgress = totalTargetRevenue > 0 ? (totalCurrentRevenue / totalTargetRevenue) * 100 : 0;
      const overallDealsProgress = totalTargetDeals > 0 ? (totalCurrentDeals / totalTargetDeals) * 100 : 0;
      
      const agentsOnTrack = analytics.filter(progress => 
        progress.revenueProgress >= 80 && progress.dealsProgress >= 80
      ).length;
      
      const agentsAtRisk = analytics.filter(progress => 
        progress.revenueProgress < 50 || progress.dealsProgress < 50
      ).length;
      
      return {
        totalTargets: targets.length,
        totalTargetRevenue,
        totalTargetDeals,
        totalCurrentRevenue,
        totalCurrentDeals,
        overallRevenueProgress,
        overallDealsProgress,
        agentsOnTrack,
        agentsAtRisk,
        individualProgress: analytics,
        targets
      };
    } catch (error) {
      console.error('Error fetching team targets analytics:', error);
      throw error;
    }
  }

  async getAgentTargetHistory(agentId: string): Promise<any> {
    try {
      const targets = await this.getTargets({ agentId });
      
      const history = await Promise.all(
        targets.map(async (target) => {
          const progress = await this.getTargetProgress(target.id);
          return {
            ...target,
            progress
          };
        })
      );
      
      // Sort by period (most recent first)
      history.sort((a, b) => b.period.localeCompare(a.period));
      
      return {
        agentId,
        totalTargets: history.length,
        averageRevenueAchievement: history.length > 0 
          ? history.reduce((sum, h) => sum + h.progress.revenueProgress, 0) / history.length 
          : 0,
        averageDealsAchievement: history.length > 0 
          ? history.reduce((sum, h) => sum + h.progress.dealsProgress, 0) / history.length 
          : 0,
        targetsHistory: history
      };
    } catch (error) {
      console.error('Error fetching agent target history:', error);
      throw error;
    }
  }
}

export const targetsService = new MySQLTargetsService();

// Utility functions for target management
export const TargetUtils = {
  calculateProgressPercentage: (current: number, target: number): number => {
    return target > 0 ? Math.min((current / target) * 100, 100) : 0;
  },
  
  getProgressColor: (percentage: number): string => {
    if (percentage >= 100) return '#10B981'; // Green
    if (percentage >= 80) return '#3B82F6';  // Blue
    if (percentage >= 50) return '#F59E0B';  // Yellow
    return '#EF4444'; // Red
  },
  
  getProgressStatus: (percentage: number): string => {
    if (percentage >= 100) return 'Achieved';
    if (percentage >= 80) return 'On Track';
    if (percentage >= 50) return 'Behind';
    return 'At Risk';
  },
  
  formatTargetPeriod: (period: string): string => {
    // Assuming period format is "YYYY-MM" or "Month YYYY"
    try {
      if (period.includes('-')) {
        const [year, month] = period.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      }
      return period;
    } catch {
      return period;
    }
  },
  
  isTargetActive: (period: string): boolean => {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    return period === currentMonth || period.includes(new Date().getFullYear().toString());
  }
};
