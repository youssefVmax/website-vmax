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
    const params = new URLSearchParams({
      limit: '1000',
      ...filters
    });
    
    const result = await this.cachedRequest(`/api/deals?${params.toString()}`);
    const deals = result.success ? (result.deals || []) : [];
    
    // Ensure numeric conversion to prevent binary string issues
    return deals.map((deal: any) => ({
      ...deal,
      amountPaid: this.safeNumber(deal.amountPaid || deal.amount_paid),
      amount: this.safeNumber(deal.amount || deal.amountPaid),
      totalAmount: this.safeNumber(deal.totalAmount || deal.total_amount),
      durationMonths: this.safeNumber(deal.durationMonths || deal.duration_months, 'int'),
    }));
  }

  /**
   * Get all callbacks with proper data conversion
   */
  async getCallbacks(filters: Record<string, string> = {}): Promise<any[]> {
    const params = new URLSearchParams({
      limit: '1000',
      ...filters
    });
    
    const result = await this.cachedRequest(`/api/callbacks?${params.toString()}`);
    const callbacks = result.success ? (result.callbacks || []) : [];
    
    return callbacks.map((callback: any) => ({
      ...callback,
      priority: callback.priority || 'medium',
      status: callback.status || 'pending',
    }));
  }

  /**
   * Get all targets with proper data conversion
   */
  async getTargets(filters: Record<string, string> = {}): Promise<any[]> {
    const params = new URLSearchParams({
      limit: '1000',
      ...filters
    });
    
    const result = await this.cachedRequest(`/api/targets?${params.toString()}`);
    const targets = result.success ? (result.targets || []) : [];
    
    // Fix the binary string issue in targets
    return targets.map((target: any) => ({
      ...target,
      targetAmount: this.safeNumber(target.targetAmount || target.monthlyTarget),
      currentAmount: this.safeNumber(target.currentAmount || target.currentSales),
      targetDeals: this.safeNumber(target.targetDeals || target.dealsTarget, 'int'),
      currentDeals: this.safeNumber(target.currentDeals, 'int'),
    }));
  }

  /**
   * Get dashboard analytics with proper data conversion
   */
  async getDashboardStats(filters: Record<string, string> = {}): Promise<any> {
    const params = new URLSearchParams({
      endpoint: 'dashboard-stats',
      ...filters
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
   * Get notifications
   */
  async getNotifications(filters: Record<string, string> = {}): Promise<any[]> {
    const params = new URLSearchParams({
      limit: '100',
      ...filters
    });
    
    const result = await this.cachedRequest(`/api/notifications?${params.toString()}`);
    return result.success ? (result.notifications || []) : [];
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
