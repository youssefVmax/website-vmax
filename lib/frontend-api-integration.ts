/**
 * Frontend API Integration Helper
 * Ensures all frontend components have proper API connections
 */

import { unifiedApiService } from './unified-api-service';
import { unifiedAnalyticsService } from './unified-analytics-service';

// Helper function to convert IntegrationConfig to UserContext
function integrationConfigToUserContext(config: IntegrationConfig) {
  return {
    id: config.userId,
    name: config.userName,
    username: config.userName, // Use userName as username
    role: config.userRole,
    managedTeam: config.managedTeam
  };
}

export interface IntegrationConfig {
  userRole: 'manager' | 'team_leader' | 'salesman';
  userId: string;
  userName: string;
  managedTeam?: string;
}

export interface ComponentDataNeeds {
  deals?: boolean;
  callbacks?: boolean;
  targets?: boolean;
  notifications?: boolean;
  analytics?: boolean;
  users?: boolean;
}

/**
 * Frontend API Integration Service
 * Provides unified data access for all frontend components
 */
export class FrontendApiIntegration {
  private config: IntegrationConfig | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Initialize the integration with user context
   */
  initialize(config: IntegrationConfig): void {
    this.config = config;
    console.log('🔧 FrontendApiIntegration: Initialized for', config.userRole, config.userName);
  }

  /**
   * Get all data needed for a component
   */
  async getComponentData(needs: ComponentDataNeeds): Promise<{
    deals: any[];
    callbacks: any[];
    targets: any[];
    notifications: any[];
    analytics: any;
    users: any[];
    loading: boolean;
    error: string | null;
  }> {
    if (!this.config) {
      throw new Error('FrontendApiIntegration not initialized. Call initialize() first.');
    }

    const result = {
      deals: [] as any[],
      callbacks: [] as any[],
      targets: [] as any[],
      notifications: [] as any[],
      analytics: {} as any,
      users: [] as any[],
      loading: false,
      error: null as string | null
    };

    try {
      result.loading = true;

      // Build filters based on user role
      const filters = this.buildFilters();

      // Fetch requested data in parallel
      const promises: Promise<any>[] = [];

      if (needs.deals) {
        promises.push(
          this.getCachedData('deals', () => unifiedApiService.getDeals(filters))
            .then(data => { result.deals = data; })
            .catch(error => console.error('Error fetching deals:', error))
        );
      }

      if (needs.callbacks) {
        promises.push(
          this.getCachedData('callbacks', () => unifiedApiService.getCallbacks(filters))
            .then(data => { result.callbacks = data; })
            .catch(error => console.error('Error fetching callbacks:', error))
        );
      }

      if (needs.targets) {
        promises.push(
          this.getCachedData('targets', () => unifiedApiService.getTargets(filters))
            .then(data => { result.targets = data; })
            .catch(error => console.error('Error fetching targets:', error))
        );
      }

      if (needs.notifications) {
        promises.push(
          this.getCachedData('notifications', () => unifiedApiService.getNotifications(filters))
            .then(data => { result.notifications = data; })
            .catch(error => console.error('Error fetching notifications:', error))
        );
      }

      if (needs.analytics) {
        promises.push(
          this.getCachedData('analytics', () => unifiedAnalyticsService.getAnalytics(integrationConfigToUserContext(this.config!)))
            .then(data => { result.analytics = data; })
            .catch(error => console.error('Error fetching analytics:', error))
        );
      }

      if (needs.users && this.config.userRole === 'manager') {
        promises.push(
          this.getCachedData('users', () => unifiedApiService.getUsers(filters))
            .then(data => { result.users = data; })
            .catch(error => console.error('Error fetching users:', error))
        );
      }

      // Wait for all requests to complete
      await Promise.all(promises);

      result.loading = false;
      return result;

    } catch (error) {
      result.loading = false;
      result.error = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ FrontendApiIntegration: Error fetching component data:', error);
      return result;
    }
  }

  /**
   * Get data for dashboard components
   */
  async getDashboardData(): Promise<{
    kpis: any;
    chartData: any;
    recentDeals: any[];
    recentCallbacks: any[];
    notifications: any[];
    loading: boolean;
    error: string | null;
  }> {
    if (!this.config) {
      throw new Error('FrontendApiIntegration not initialized');
    }

    try {
      const [kpis, chartData, deals, callbacks, notifications] = await Promise.all([
        unifiedAnalyticsService.getQuickKPIs(integrationConfigToUserContext(this.config)),
        unifiedAnalyticsService.getChartData(integrationConfigToUserContext(this.config)),
        unifiedApiService.getDeals({ ...this.buildFilters(), limit: '10' }),
        unifiedApiService.getCallbacks({ ...this.buildFilters(), limit: '10' }),
        unifiedApiService.getNotifications({ ...this.buildFilters(), limit: '5' })
      ]);

      return {
        kpis,
        chartData,
        recentDeals: deals,
        recentCallbacks: callbacks,
        notifications,
        loading: false,
        error: null
      };
    } catch (error) {
      console.error('❌ FrontendApiIntegration: Dashboard data error:', error);
      return {
        kpis: {},
        chartData: {},
        recentDeals: [],
        recentCallbacks: [],
        notifications: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data'
      };
    }
  }

  /**
   * Create a new deal
   */
  async createDeal(dealData: any): Promise<string> {
    if (!this.config) {
      throw new Error('FrontendApiIntegration not initialized');
    }

    // Add user context to deal data
    const enrichedData = {
      ...dealData,
      salesAgentId: this.config.userId,
      salesAgentName: this.config.userName,
      salesTeam: this.config.managedTeam || 'GENERAL',
      createdBy: this.config.userId,
      createdById: this.config.userId
    };

    const dealId = await unifiedApiService.createDeal(enrichedData);
    this.clearCache(); // Clear cache after mutation
    return dealId;
  }

  /**
   * Create a new callback
   */
  async createCallback(callbackData: any): Promise<string> {
    if (!this.config) {
      throw new Error('FrontendApiIntegration not initialized');
    }

    // Add user context to callback data
    const enrichedData = {
      ...callbackData,
      salesAgentId: this.config.userId,
      salesAgentName: this.config.userName,
      salesTeam: this.config.managedTeam || 'GENERAL',
      createdBy: this.config.userId,
      createdById: this.config.userId
    };

    const callbackId = await unifiedApiService.createCallback(enrichedData);
    this.clearCache(); // Clear cache after mutation
    return callbackId;
  }

  /**
   * Update a deal (with permission check)
   */
  async updateDeal(dealId: string, updates: any): Promise<void> {
    if (!this.config) {
      throw new Error('FrontendApiIntegration not initialized');
    }

    // Add update metadata
    const enrichedUpdates = {
      ...updates,
      updatedBy: this.config.userId,
      updatedAt: new Date().toISOString()
    };

    await unifiedApiService.updateDeal(dealId, enrichedUpdates);
    this.clearCache(); // Clear cache after mutation
  }

  /**
   * Update a callback (with permission check)
   */
  async updateCallback(callbackId: string, updates: any): Promise<void> {
    if (!this.config) {
      throw new Error('FrontendApiIntegration not initialized');
    }

    // Add update metadata
    const enrichedUpdates = {
      ...updates,
      updatedBy: this.config.userId,
      updatedAt: new Date().toISOString()
    };

    await unifiedApiService.updateCallback(callbackId, enrichedUpdates);
    this.clearCache(); // Clear cache after mutation
  }

  /**
   * Delete a deal (with permission check)
   */
  async deleteDeal(dealId: string): Promise<void> {
    if (!this.config) {
      throw new Error('FrontendApiIntegration not initialized');
    }

    // Only managers and team leaders can delete deals
    if (this.config.userRole === 'salesman') {
      throw new Error('Insufficient permissions to delete deals');
    }

    await unifiedApiService.deleteDeal(dealId);
    this.clearCache(); // Clear cache after mutation
  }

  /**
   * Delete a callback (with permission check)
   */
  async deleteCallback(callbackId: string): Promise<void> {
    if (!this.config) {
      throw new Error('FrontendApiIntegration not initialized');
    }

    // Only managers and team leaders can delete callbacks
    if (this.config.userRole === 'salesman') {
      throw new Error('Insufficient permissions to delete callbacks');
    }

    await unifiedApiService.deleteCallback(callbackId);
    this.clearCache(); // Clear cache after mutation
  }

  /**
   * Refresh all data
   */
  async refresh(): Promise<void> {
    this.clearCache();
    await unifiedApiService.refresh();
    console.log('🔄 FrontendApiIntegration: Data refreshed');
  }

  /**
   * Build filters based on user role and context
   */
  private buildFilters(): Record<string, string> {
    if (!this.config) return {};

    const filters: Record<string, string> = {
      userRole: this.config.userRole,
      userId: this.config.userId
    };

    if (this.config.userRole === 'salesman') {
      // Salesmen see only their own data
      filters.salesAgentId = this.config.userId;
      filters.SalesAgentID = this.config.userId; // For callbacks
    } else if (this.config.userRole === 'team_leader' && this.config.managedTeam) {
      // Team leaders see their team's data + their own
      filters.salesTeam = this.config.managedTeam;
      filters.sales_team = this.config.managedTeam; // For callbacks
      filters.managedTeam = this.config.managedTeam;
    }
    // Managers see all data (no additional filters)

    return filters;
  }

  /**
   * Get cached data or fetch fresh data
   */
  private async getCachedData<T>(key: string, fetchFunction: () => Promise<T>): Promise<T> {
    const cacheKey = `${key}_${this.config?.userId}_${this.config?.userRole}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const data = await fetchFunction();
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Clear cache
   */
  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current user configuration
   */
  getConfig(): IntegrationConfig | null {
    return this.config;
  }
}

// Export singleton instance
export const frontendApiIntegration = new FrontendApiIntegration();
export default frontendApiIntegration;
