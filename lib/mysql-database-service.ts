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
    // Temporarily disabled - activity_log API endpoint does not exist
    // TODO: Create /api/activity_log endpoint when needed
    return;

    try {
      const payload = {
        id: `activity_${Date.now()}`,
        ...activityData,
        ip_address: '127.0.0.1',
        user_agent: 'VMAX System',
        created_at: new Date().toISOString()
      };

      // TODO: Implement activity_log API endpoint
      // Skip API call until endpoint is implemented
      console.log(`📋 Activity log:`, payload);
      // await apiService.makeRequest('activity_log', { ... });
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

      // TODO: Implement deal_history API endpoint
      // Skip API call until endpoint is implemented
      console.log(`📊 Deal history log:`, payload);
      // await apiService.makeRequest('deal_history', { ... });
    } catch (error) {
      console.warn('Failed to log deal history:', error);
    }
  }

  // Callback history tracking - Disabled until API endpoint is implemented
  async logCallbackHistory(historyData: {
    callback_id: string;
    changed_by: string;
    change_type: string;
    old_status?: string;
    new_status?: string;
    old_scheduled_date?: string;
    new_scheduled_date?: string;
    notes?: string;
  }): Promise<void> {
    try {
      console.log(`📝 Callback history log requested:`, {
        callback_id: historyData.callback_id,
        changed_by: historyData.changed_by,
        change_type: historyData.change_type,
        timestamp: new Date().toISOString()
      });

      // TODO: Implement callback_history API endpoint
      // Skip API call until endpoint is implemented
      // await apiService.makeRequest('callback_history', { ... });
      
    } catch (error) {
      console.warn('Failed to log callback history:', error);
      // Don't throw - this is optional functionality
    }
  }

  // Update team metrics (optional) - Disabled until API endpoint is implemented
  async updateTeamMetrics(teamName?: string): Promise<void> {
    if (!teamName) return;

    try {
      console.log(`📊 Team metrics update requested for team: ${teamName}`);
      
      // Get team stats for metrics calculation (when API is ready)
      const [deals] = await Promise.all([
        apiService.getDeals({ salesTeam: teamName }).catch(() => [])
      ]);

      const totalDeals = deals?.length || 0;
      const totalRevenue = deals?.reduce((sum, deal) => sum + (deal.amountPaid || deal.amount || 0), 0) || 0;
      const avgDealValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;

      console.log(`📈 Team ${teamName} metrics:`, {
        totalDeals,
        totalRevenue,
        avgDealValue
      });

      // Skip API call until endpoint is implemented
      // await apiService.makeRequest('team_metrics', { ... });
      
    } catch (error) {
      console.warn('Failed to calculate team metrics:', error);
      // Don't throw - this is optional functionality
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
