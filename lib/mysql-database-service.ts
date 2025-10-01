import { apiService } from './api-service';

/**
 * MySQL Database Service - Ensures all operations use proper MySQL tables
 */
export class MySQLDatabaseService {
  private static instance: MySQLDatabaseService;

  public static getInstance(): MySQLDatabaseService {
    if (!MySQLDatabaseService.instance) {
      MySQLDatabaseService.instance = new MySQLDatabaseService();
    }
    return MySQLDatabaseService.instance;
  }

  // Activity logging for audit trail
  async logActivity(activityData: {
    user_id?: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    old_values?: any;
    new_values?: any;
  }): Promise<void> {
    try {
      const payload = {
        id: `activity_${Date.now()}`,
        ...activityData,
        ip_address: '127.0.0.1',
        user_agent: 'VMAX System',
        created_at: new Date().toISOString()
      };
      
      // Store in activity_log table
      await apiService.makeRequest('activity_log', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.warn('Failed to log activity:', error);
    }
  }

  // Deal history tracking
  async logDealHistory(historyData: {
    deal_id: string;
    changed_by?: string;
    change_type: string;
    old_stage?: string;
    new_stage?: string;
    old_amount?: number;
    new_amount?: number;
    notes?: string;
  }): Promise<void> {
    try {
      const payload = {
        id: `deal_history_${Date.now()}`,
        ...historyData,
        created_at: new Date().toISOString()
      };
      
      await apiService.makeRequest('deal_history', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.warn('Failed to log deal history:', error);
    }
  }

  // Callback history tracking
  async logCallbackHistory(historyData: {
    callback_id: string;
    changed_by?: string;
    change_type: string;
    old_status?: string;
    new_status?: string;
    old_scheduled_date?: string;
    new_scheduled_date?: string;
    notes?: string;
  }): Promise<void> {
    try {
      const payload = {
        id: `callback_history_${Date.now()}`,
        ...historyData,
        created_at: new Date().toISOString()
      };
      
      await apiService.makeRequest('callback_history', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.warn('Failed to log callback history:', error);
    }
  }

  // Team metrics calculation and storage
  async updateTeamMetrics(teamName?: string): Promise<void> {
    if (!teamName) return;

    try {
      const period = new Date().toISOString().substring(0, 7); // YYYY-MM
      
      // Get team deals and callbacks
      const [deals, callbacks] = await Promise.all([
        apiService.getDeals({ sales_team: teamName }),
        apiService.getCallbacks({ sales_team: teamName })
      ]);

      const totalDeals = deals.length;
      const totalRevenue = deals.reduce((sum, deal) => sum + (deal.amountPaid || 0), 0);
      const totalCallbacks = callbacks.length;
      const completedCallbacks = callbacks.filter(c => c.status === 'completed').length;
      const avgDealValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;
      const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;

      const metricsPayload = {
        id: `metrics_${teamName}_${period}`,
        team_name: teamName,
        period,
        total_deals: totalDeals,
        total_revenue: totalRevenue,
        total_callbacks: totalCallbacks,
        completed_callbacks: completedCallbacks,
        avg_deal_value: avgDealValue,
        conversion_rate: conversionRate,
        updated_at: new Date().toISOString()
      };

      await apiService.makeRequest('team_metrics', {
        method: 'POST',
        body: JSON.stringify(metricsPayload)
      });
    } catch (error) {
      console.warn('Failed to update team metrics:', error);
    }
  }

  // Enhanced deal creation with full tracking
  async createDealWithTracking(dealData: any, createdBy: any): Promise<string> {
    const dealId = await apiService.createDeal(dealData);
    
    // Log activity (optional - don't fail if this fails)
    try {
      await this.logActivity({
        user_id: createdBy?.id,
        action: 'CREATE',
        entity_type: 'deal',
        entity_id: dealId.id,
        new_values: dealData
      });
    } catch (error) {
      console.warn('Failed to log deal activity:', error);
    }

    // Update team metrics (optional - don't fail if this fails)
    try {
      await this.updateTeamMetrics(dealData.salesTeam || createdBy?.team);
    } catch (error) {
      console.warn('Failed to update team metrics after deal creation:', error);
    }
    
    return dealId.id;
  }

  // Enhanced callback creation with full tracking
  async createCallbackWithTracking(callbackData: any, createdBy: any): Promise<string> {
    const callbackId = await apiService.createCallback(callbackData);
    
    // Log activity (optional - don't fail if this fails)
    try {
      await this.logActivity({
        user_id: createdBy?.id,
        action: 'CREATE',
        entity_type: 'callback',
        entity_id: callbackId.id,
        new_values: callbackData
      });
    } catch (error) {
      console.warn('Failed to log callback activity:', error);
    }

    // Update team metrics (optional - don't fail if this fails)
    try {
      await this.updateTeamMetrics(callbackData.salesTeam || createdBy?.team);
    } catch (error) {
      console.warn('Failed to update team metrics after callback creation:', error);
    }
    
    return callbackId.id;
  }
}

export const databaseService = MySQLDatabaseService.getInstance();
