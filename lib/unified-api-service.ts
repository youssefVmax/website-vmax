/**
 * Unified API Service - Single source of truth for all API calls
 * Fixes all frontend-backend connections and reduces excessive API calls
 */

export class UnifiedApiService {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_TTL = 30000; // 30 seconds cache
  
  constructor() {
    console.log('🔧 UnifiedApiService: Initialized with caching');
  }

  /**
   * Make cached API request - prevents excessive calls
   */
  private async cachedRequest(
    url: string, 
    options: RequestInit = {}, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<any> {
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`📦 UnifiedApiService: Using cached data for ${url}`);
      return cached.data;
    }

    try {
      console.log(`🔄 UnifiedApiService: Making fresh API call to ${url}`);
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl
      });

      return data;
    } catch (error) {
      console.error(`❌ UnifiedApiService: Error calling ${url}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache manually (for refresh functionality)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ UnifiedApiService: Cache cleared');
  }

  /**
   * Get all deals with proper data conversion
   */
  async getDeals(filters: Record<string, string> = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        limit: '1000',
        ...filters
      });
      
      const result = await this.cachedRequest(`/api/deals?${params.toString()}`);
      
      // Handle different response formats
      let deals = [];
      if (result.success && result.deals) {
        deals = result.deals;
      } else if (Array.isArray(result)) {
        deals = result;
      } else if (result.data && Array.isArray(result.data)) {
        deals = result.data;
      }

      return deals.map((deal: any) => ({
        ...deal,
        id: deal.id || deal.DealID,
        dealId: deal.dealId || deal.DealID || deal.id,
        customerName: deal.customerName || deal.customer_name,
        salesAgentName: deal.salesAgentName || deal.sales_agent,
        closingAgentName: deal.closingAgentName || deal.closing_agent,
        amountPaid: this.safeNumber(deal.amountPaid || deal.amount_paid || deal.amount),
        amount: this.safeNumber(deal.amount || deal.amountPaid || deal.amount_paid),
        totalAmount: this.safeNumber(deal.totalAmount || deal.total_amount),
        durationMonths: this.safeNumber(deal.durationMonths || deal.duration_months, 'int'),
        serviceTier: deal.serviceTier || deal.service_tier,
        salesTeam: deal.salesTeam || deal.sales_team,
        signupDate: deal.signupDate || deal.signup_date || deal.created_at,
        createdAt: deal.createdAt || deal.created_at,
        updatedAt: deal.updatedAt || deal.updated_at
      }));
    } catch (error) {
      console.error('❌ UnifiedApiService: Error fetching deals:', error);
      return [];
    }
  }

  /**
   * Get all callbacks with proper data conversion
   */
  async getCallbacks(filters: Record<string, string> = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        limit: '1000',
        ...filters
      });
      
      const result = await this.cachedRequest(`/api/callbacks?${params.toString()}`);
      
      let callbacks = [];
      if (result.success && result.callbacks) {
        callbacks = result.callbacks;
      } else if (Array.isArray(result)) {
        callbacks = result;
      } else if (result.data && Array.isArray(result.data)) {
        callbacks = result.data;
      }
      
      return callbacks.map((callback: any) => ({
        ...callback,
        customerName: callback.customerName || callback.customer_name,
        phoneNumber: callback.phoneNumber || callback.phone_number,
        salesAgentName: callback.salesAgentName || callback.sales_agent,
        salesTeam: callback.salesTeam || callback.sales_team,
        status: callback.status || 'pending',
        firstCallDate: callback.firstCallDate || callback.first_call_date,
        firstCallTime: callback.firstCallTime || callback.first_call_time,
        scheduledDate: callback.scheduledDate || callback.scheduled_date,
        scheduledTime: callback.scheduledTime || callback.scheduled_time,
        callbackNotes: callback.callbackNotes || callback.callback_notes || [],
        callbackReason: callback.callbackReason || callback.callback_reason,
        createdAt: callback.createdAt || callback.created_at,
        updatedAt: callback.updatedAt || callback.updated_at
      }));
    } catch (error) {
      console.error('❌ UnifiedApiService: Error fetching callbacks:', error);
      return [];
    }
  }

  /**
   * Get dashboard analytics with proper data conversion
   */
  async getDashboardStats(filters: Record<string, string> = {}): Promise<any> {
    const params = new URLSearchParams({
      userRole: filters.userRole || 'manager',
      userId: filters.userId || '',
      managedTeam: filters.managedTeam || '',
      dateRange: filters.dateRange || 'today'
    });
    
    const result = await this.cachedRequest(`/api/analytics-api.php?${params.toString()}`);
    
    if (!result.success) {
      throw new Error('Failed to fetch dashboard stats');
    }

    // Ensure all numeric values are properly converted
    return {
      ...result,
      total_deals: this.safeNumber(result.total_deals, 'int'),
      total_revenue: this.safeNumber(result.total_revenue),
      avg_deal_size: this.safeNumber(result.avg_deal_size),
      unique_agents: this.safeNumber(result.unique_agents, 'int'),
      today_deals: this.safeNumber(result.today_deals, 'int'),
      today_revenue: this.safeNumber(result.today_revenue),
      total_callbacks: this.safeNumber(result.total_callbacks, 'int'),
      pending_callbacks: this.safeNumber(result.pending_callbacks, 'int'),
      completed_callbacks: this.safeNumber(result.completed_callbacks, 'int'),
      cancelled_callbacks: this.safeNumber(result.cancelled_callbacks, 'int'),
    };
  }

  /**
   * Get notifications with proper error handling
   */
  async getNotifications(filters: Record<string, string> = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        limit: '100',
        ...filters
      });
      
      const result = await this.cachedRequest(`/api/notifications?${params.toString()}`);
      
      // Handle different response formats
      let notifications = [];
      if (result.success && result.notifications) {
        notifications = result.notifications;
      } else if (Array.isArray(result)) {
        notifications = result;
      } else if (result.data && Array.isArray(result.data)) {
        notifications = result.data;
      }
      
      return notifications.map((notification: any) => ({
        ...notification,
        to: Array.isArray(notification.to) ? notification.to : 
             (typeof notification.to === 'string' ? JSON.parse(notification.to || '[]') : []),
        timestamp: notification.timestamp || notification.created_at,
        isRead: Boolean(notification.isRead || notification.is_read),
        createdAt: notification.createdAt || notification.created_at
      }));
    } catch (error) {
      console.error('❌ UnifiedApiService: Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Safe number conversion to prevent binary string corruption
   */
  private safeNumber(value: any, type: 'int' | 'float' = 'float'): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    // Handle binary string corruption
    if (typeof value === 'string' && /^[01]+$/.test(value) && value.length > 10) {
      console.warn('⚠️ Detected binary string, converting to 0:', value);
      return 0;
    }
    
    const num = type === 'int' ? parseInt(String(value)) : parseFloat(String(value));
    return isNaN(num) ? 0 : num;
  }

  /**
   * Create new deal
   */
  async createDeal(dealData: any): Promise<string> {
    const result = await fetch('/api/deals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dealData),
    });

    if (!result.ok) {
      throw new Error(`Failed to create deal: ${result.statusText}`);
    }

    const data = await result.json();
    this.clearCache(); // Clear cache after mutation
    return data.id;
  }

  /**
   * Update deal
   */
  async updateDeal(id: string, updates: any): Promise<void> {
    const result = await fetch(`/api/deals?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!result.ok) {
      throw new Error(`Failed to update deal: ${result.statusText}`);
    }

    this.clearCache(); // Clear cache after mutation
  }

  /**
   * Delete deal
   */
  async deleteDeal(id: string): Promise<void> {
    const result = await fetch(`/api/deals?id=${id}`, {
      method: 'DELETE',
    });

    if (!result.ok) {
      throw new Error(`Failed to delete deal: ${result.statusText}`);
    }

    this.clearCache(); // Clear cache after mutation
  }

  /**
   * Create new callback
   */
  async createCallback(callbackData: any): Promise<string> {
    const result = await fetch('/api/callbacks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callbackData),
    });

    if (!result.ok) {
      throw new Error(`Failed to create callback: ${result.statusText}`);
    }

    const data = await result.json();
    this.clearCache(); // Clear cache after mutation
    return data.id;
  }

  /**
   * Update callback
   */
  async updateCallback(id: string, updates: any): Promise<void> {
    const result = await fetch(`/api/callbacks?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!result.ok) {
      throw new Error(`Failed to update callback: ${result.statusText}`);
    }

    this.clearCache(); // Clear cache after mutation
  }

  /**
   * Delete callback
   */
  async deleteCallback(id: string): Promise<void> {
    const result = await fetch(`/api/callbacks?id=${id}`, {
      method: 'DELETE',
    });

    if (!result.ok) {
      throw new Error(`Failed to delete callback: ${result.statusText}`);
    }

    this.clearCache(); // Clear cache after mutation
  }

  /**
   * Create new target
   */
  async createTarget(targetData: any): Promise<string> {
    const result = await fetch('/api/targets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(targetData),
    });

    if (!result.ok) {
      throw new Error(`Failed to create target: ${result.statusText}`);
    }

    const data = await result.json();
    this.clearCache(); // Clear cache after mutation
    return data.id;
  }

  /**
   * Update target
   */
  async updateTarget(id: string, updates: any): Promise<void> {
    const result = await fetch(`/api/targets?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!result.ok) {
      throw new Error(`Failed to update target: ${result.statusText}`);
    }

    this.clearCache(); // Clear cache after mutation
  }

  /**
   * Delete target
   */
  async deleteTarget(id: string): Promise<void> {
    const result = await fetch(`/api/targets?id=${id}`, {
      method: 'DELETE',
    });

    if (!result.ok) {
      throw new Error(`Failed to delete target: ${result.statusText}`);
    }

    this.clearCache(); // Clear cache after mutation
  }

  /**
   * Get targets with proper error handling
   */
  async getTargets(filters: Record<string, string> = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        limit: '1000',
        ...filters
      });
      
      const result = await this.cachedRequest(`/api/targets?${params.toString()}`);
      
      // Handle different response formats
      let targets = [];
      if (result.success && result.targets) {
        targets = result.targets;
      } else if (Array.isArray(result)) {
        targets = result;
      } else if (result.data && Array.isArray(result.data)) {
        targets = result.data;
      }
      
      return targets.map((target: any) => ({
        ...target,
        targetAmount: target.targetAmount || target.target_amount || target.monthlyTarget || 0,
        targetDeals: target.targetDeals || target.target_deals || target.dealsTarget || 0,
        currentAmount: target.currentAmount || target.current_amount || 0,
        currentDeals: target.currentDeals || target.current_deals || 0,
        agentId: target.agentId || target.agent_id || target.salesAgentId || '',
        agentName: target.agentName || target.agent_name || target.salesAgentName || '',
        period: target.period || `${target.month} ${target.year}` || '',
        createdAt: target.createdAt || target.created_at,
        updatedAt: target.updatedAt || target.updated_at
      }));
    } catch (error) {
      console.error('❌ UnifiedApiService: Error fetching targets:', error);
      return [];
    }
  }

  /**
   * Get users with role-based filtering
   */
  async getUsers(filters: Record<string, string> = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        limit: '1000',
        ...filters
      });
      
      // Try unified-data endpoint first, then fall back to /api/users on error or empty
      let usersResult: any = null;
      try {
        usersResult = await this.cachedRequest(`/api/unified-data?dataTypes=users&${params.toString()}`);
      } catch (e) {
        console.warn('⚠️ unifiedApiService.getUsers: unified-data failed, falling back to /api/users');
      }

      // Parse unified-data format
      let users: any[] = [];
      if (usersResult && usersResult.success && usersResult.data && Array.isArray(usersResult.data.users)) {
        users = usersResult.data.users;
      } else if (Array.isArray(usersResult)) {
        users = usersResult;
      }

      // Fallback to direct users API if unified-data is empty
      if (!users || users.length === 0) {
        const usersDirect = await this.cachedRequest(`/api/users?${params.toString()}`);
        if (usersDirect && usersDirect.success && Array.isArray(usersDirect.users)) {
          users = usersDirect.users;
        } else if (Array.isArray(usersDirect)) {
          users = usersDirect;
        } else {
          users = [];
        }
      }
      
      return users.map((user: any) => ({
        ...user,
        managedTeam: user.managedTeam || user.managed_team,
        createdAt: user.createdAt || user.created_at,
        updatedAt: user.updatedAt || user.updated_at
      }));
    } catch (error) {
      console.error('❌ UnifiedApiService: Error fetching users:', error);
      return [];
    }
  }

  /**
   * Test API connectivity
   */
  async testConnectivity(): Promise<{
    deals: boolean;
    callbacks: boolean;
    targets: boolean;
    notifications: boolean;
    analytics: boolean;
  }> {
    const results = {
      deals: false,
      callbacks: false,
      targets: false,
      notifications: false,
      analytics: false
    };

    try {
      // Test deals API
      const dealsResponse = await fetch('/api/deals?limit=1');
      results.deals = dealsResponse.ok;
    } catch (error) {
      console.warn('❌ Deals API test failed:', error);
    }

    try {
      // Test callbacks API
      const callbacksResponse = await fetch('/api/callbacks?limit=1');
      results.callbacks = callbacksResponse.ok;
    } catch (error) {
      console.warn('❌ Callbacks API test failed:', error);
    }

    try {
      // Test targets API
      const targetsResponse = await fetch('/api/targets?limit=1');
      results.targets = targetsResponse.ok;
    } catch (error) {
      console.warn('❌ Targets API test failed:', error);
    }

    try {
      // Test notifications API
      const notificationsResponse = await fetch('/api/notifications?limit=1');
      results.notifications = notificationsResponse.ok;
    } catch (error) {
      console.warn('❌ Notifications API test failed:', error);
    }

    try {
      // Test analytics API
      const analyticsResponse = await fetch('/api/analytics');
      results.analytics = analyticsResponse.ok;
    } catch (error) {
      console.warn('❌ Analytics API test failed:', error);
    }

    console.log('🔍 API Connectivity Test Results:', results);
    return results;
  }

  /**
   * Manual refresh - clears cache and refetches data
   */
  async refresh(): Promise<void> {
    console.log('🔄 UnifiedApiService: Manual refresh triggered');
    this.clearCache();
  }
}

// Export singleton instance
export const unifiedApiService = new UnifiedApiService();
export default unifiedApiService;
