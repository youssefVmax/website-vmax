import { apiService, Deal } from './api-service';
import { databaseService } from './mysql-database-service';

export interface DealsService {
  createDeal: (dealData: any, user: any) => Promise<string>;
  updateDeal: (id: string, updates: Partial<Deal>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
  getDeals: (userRole?: string, userId?: string, managedTeam?: string) => Promise<Deal[]>;
  getDealById: (id: string) => Promise<Deal | null>;
  getDealsByAgent: (agentId: string) => Promise<Deal[]>;
  getDealsByTeam: (team: string) => Promise<Deal[]>;
  getTeamDealsAnalytics: (team: string) => Promise<any>;
  getDealsAnalytics: (filters?: any) => Promise<any>;
  onDealsChange: (callback: (deals: Deal[]) => void, userRole?: string, userId?: string, managedTeam?: string) => () => void;
}

class MySQLDealsService implements DealsService {
  private listeners: { [key: string]: (deals: Deal[]) => void } = {};
  private pollInterval: NodeJS.Timeout | null = null;

  async createDeal(dealData: any, user: any): Promise<string> {
    try {
      const dealPayload = {
        customerName: dealData.customer_name || dealData.customerName,
        email: dealData.email,
        phoneNumber: dealData.phone_number || dealData.phoneNumber,
        country: dealData.country,
        customCountry: dealData.custom_country || dealData.customCountry,
        amountPaid: dealData.amount_paid || dealData.amountPaid || 0,
        serviceTier: dealData.service_tier || dealData.serviceTier || 'Silver',
        salesAgentId: dealData.SalesAgentID || dealData.salesAgentId || user?.id,
        salesAgentName: user?.name,
        salesTeam: dealData.sales_team || dealData.salesTeam || user?.team,
        stage: dealData.stage || 'prospect',
        status: dealData.status || 'active',
        priority: dealData.priority || 'medium',
        signupDate: dealData.signup_date || dealData.signupDate || new Date().toISOString().split('T')[0],
        endDate: dealData.end_date || dealData.endDate,
        durationYears: dealData.duration_years || dealData.durationYears,
        durationMonths: dealData.duration_months || dealData.durationMonths,
        numberOfUsers: dealData.number_of_users || dealData.numberOfUsers,
        notes: dealData.notes,
        createdBy: user?.name || 'Unknown',
        createdById: user?.id
      };

      // Use enhanced database service with full tracking
      const dealId = await databaseService.createDealWithTracking(dealPayload, user);
      
      // Trigger listeners
      this.notifyListeners();
      
      return dealId;
    } catch (error) {
      console.error('Error creating deal:', error);
      throw error;
    }
  }

  async updateDeal(id: string, updates: Partial<Deal>, updatedBy?: any): Promise<void> {
    try {
      // Get old deal for history tracking
      const oldDeals = await apiService.getDeals({ id });
      const oldDeal = oldDeals.length > 0 ? oldDeals[0] : null;

      await apiService.updateDeal(id, updates);

      // Log deal history if significant changes
      if (oldDeal && updatedBy) {
        await databaseService.logDealHistory({
          deal_id: id,
          changed_by: updatedBy.id,
          change_type: 'UPDATE',
          old_stage: oldDeal.stage,
          new_stage: updates.stage,
          old_amount: oldDeal.amountPaid,
          new_amount: updates.amountPaid,
          notes: `Updated by ${updatedBy.name}`
        });

        // Log activity
        await databaseService.logActivity({
          user_id: updatedBy.id,
          action: 'UPDATE',
          entity_type: 'deal',
          entity_id: id,
          old_values: oldDeal,
          new_values: updates
        });

        // Update team metrics
        await databaseService.updateTeamMetrics(oldDeal.salesTeam);
      }
      
      // Trigger listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Error updating deal:', error);
      throw error;
    }
  }

  async deleteDeal(id: string): Promise<void> {
    try {
      await apiService.deleteDeal(id);
      
      // Trigger listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Error deleting deal:', error);
      throw error;
    }
  }

  async getDealsByAgent(agentId: string): Promise<Deal[]> {
    try {
      const deals = await apiService.getDeals({ salesAgentId: agentId });
      return deals;
    } catch (error) {
      console.error('Error fetching deals by agent:', error);
      return [];
    }
  }

  async getDealsByTeam(team: string): Promise<Deal[]> {
    try {
      const deals = await apiService.getDeals({ salesTeam: team });
      return deals;
    } catch (error) {
      console.error('Error fetching deals by team:', error);
      return [];
    }
  }

  async getTeamDealsAnalytics(team: string): Promise<any> {
    try {
      const deals = await this.getDealsByTeam(team);
      
      const totalDeals = deals.length;
      const totalSales = deals.reduce((sum, deal) => sum + (deal.amountPaid || 0), 0);
      const averageDealSize = totalDeals > 0 ? totalSales / totalDeals : 0;
      
      // Agent breakdown
      const agentBreakdown = deals.reduce((acc, deal) => {
        const agent = deal.salesAgentName || 'Unknown';
        if (!acc[agent]) {
          acc[agent] = { deals: 0, sales: 0, avgDeal: 0 };
        }
        acc[agent].deals += 1;
        acc[agent].sales += deal.amountPaid || 0;
        acc[agent].avgDeal = acc[agent].sales / acc[agent].deals;
        return acc;
      }, {} as Record<string, { deals: number; sales: number; avgDeal: number }>);
      
      return {
        totalDeals,
        totalSales,
        averageDealSize,
        agentBreakdown
      };
    } catch (error) {
      console.error('Error fetching team deals analytics:', error);
      throw error;
    }
  }

  async getDeals(userRole?: string, userId?: string, managedTeam?: string): Promise<Deal[]> {
    try {
      const filters: Record<string, string> = {};
      
      if (userRole === 'salesman' && userId) {
        filters.salesAgentId = userId;
      } else if (userRole === 'team-leader' && managedTeam) {
        filters.salesTeam = managedTeam;
      }
      // Managers can see all deals (no filters)
      
      const deals = await apiService.getDeals(filters);
      return deals;
    } catch (error) {
      console.error('Error fetching deals:', error);
      return [];
    }
  }

  async getDealById(id: string): Promise<Deal | null> {
    try {
      const deals = await apiService.getDeals({ id });
      return deals.length > 0 ? deals[0] : null;
    } catch (error) {
      console.error('Error fetching deal by ID:', error);
      return null;
    }
  }

  async getDealsAnalytics(filters?: any): Promise<any> {
    try {
      const deals = await this.getDeals(filters?.userRole, filters?.userId, filters?.managedTeam);
      
      const totalDeals = deals.length;
      const totalRevenue = deals.reduce((sum, deal) => sum + (deal.amountPaid || 0), 0);
      const avgDealValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;
      
      // Group by stage
      const dealsByStage = deals.reduce((acc, deal) => {
        const stage = deal.stage || 'unknown';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Group by month
      const dealsByMonth = deals.reduce((acc, deal) => {
        const month = deal.createdAt ? new Date(deal.createdAt).toISOString().substring(0, 7) : 'unknown';
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Top performers
      const agentPerformance = deals.reduce((acc, deal) => {
        const agent = deal.salesAgentName || 'Unknown';
        if (!acc[agent]) {
          acc[agent] = { deals: 0, revenue: 0 };
        }
        acc[agent].deals += 1;
        acc[agent].revenue += deal.amountPaid || 0;
        return acc;
      }, {} as Record<string, { deals: number; revenue: number }>);
      
      return {
        totalDeals,
        totalRevenue,
        avgDealValue,
        dealsByStage,
        dealsByMonth,
        agentPerformance,
        deals
      };
    } catch (error) {
      console.error('Error fetching deals analytics:', error);
      throw error;
    }
  }

  onDealsChange(
    callback: (deals: Deal[]) => void,
    userRole?: string,
    userId?: string,
    managedTeam?: string
  ): () => void {
    const listenerId = `${userRole || 'all'}_${userId || 'all'}_${managedTeam || 'all'}_${Date.now()}`;
    
    this.listeners[listenerId] = callback;
    
    // Start polling if not already started
    if (!this.pollInterval) {
      this.startPolling();
    }
    
    // Initial data fetch
    this.getDeals(userRole, userId, managedTeam).then(callback);
    
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
    }, 30000); // Poll every 30 seconds
  }

  private async notifyListeners(): Promise<void> {
    for (const [listenerId, callback] of Object.entries(this.listeners)) {
      try {
        const [userRole, userId, managedTeam] = listenerId.split('_');
        const deals = await this.getDeals(
          userRole !== 'all' ? userRole : undefined,
          userId !== 'all' ? userId : undefined,
          managedTeam !== 'all' ? managedTeam : undefined
        );
        callback(deals);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    }
  }
}

export const dealsService = new MySQLDealsService();

// Utility functions for deal management
export const DealUtils = {
  calculateDealValue: (deal: Deal): number => {
    return deal.amountPaid || 0;
  },
  
  getDealStageColor: (stage: string): string => {
    const colors: Record<string, string> = {
      'prospect': '#6B7280',
      'qualified': '#3B82F6',
      'proposal': '#F59E0B',
      'negotiation': '#EF4444',
      'closed-won': '#10B981',
      'closed-lost': '#6B7280'
    };
    return colors[stage] || '#6B7280';
  },
  
  formatDealAmount: (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  },
  
  getDealProgress: (stage: string): number => {
    const progress: Record<string, number> = {
      'prospect': 20,
      'qualified': 40,
      'proposal': 60,
      'negotiation': 80,
      'closed-won': 100,
      'closed-lost': 0
    };
    return progress[stage] || 0;
  }
};
