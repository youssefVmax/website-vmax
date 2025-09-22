interface UnifiedDataOptions {
  userRole: 'manager' | 'salesman' | 'team-leader';
  userId?: string;
  userName?: string;
  managedTeam?: string;
  dataTypes: string[];
  dateRange?: string;
  limit?: number;
  offset?: number;
}

interface UnifiedDataResponse {
  success: boolean;
  data: {
    deals?: any[];
    callbacks?: any[];
    targets?: any[];
    notifications?: any[];
    users?: any[];
    analytics?: any;
  };
  metadata?: any;
  error?: string;
}

class UnifiedDataService {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_TTL = 30000; // 30 seconds cache

  /**
   * Fetch all required data in a single API call
   */
  async fetchUnifiedData(options: UnifiedDataOptions): Promise<UnifiedDataResponse> {
    const cacheKey = this.generateCacheKey(options);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('🚀 UnifiedDataService: Using cached data for', options.dataTypes);
      return cached;
    }

    try {
      console.log('🔄 UnifiedDataService: Fetching unified data:', options);

      const params = new URLSearchParams({
        userRole: options.userRole,
        dataTypes: options.dataTypes.join(','),
        dateRange: options.dateRange || 'all',
        limit: (options.limit || 100).toString(),
        offset: (options.offset || 0).toString()
      });

      if (options.userId) params.append('userId', options.userId);
      if (options.userName) params.append('userName', options.userName);
      if (options.managedTeam) params.append('managedTeam', options.managedTeam);

      const response = await fetch(`/api/unified-data?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: UnifiedDataResponse = await response.json();
      
      if (result.success) {
        // Cache the successful result
        this.setCache(cacheKey, result, this.DEFAULT_TTL);
        console.log('✅ UnifiedDataService: Data fetched successfully');
      }

      return result;
    } catch (error) {
      console.error('❌ UnifiedDataService: Error fetching data:', error);
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get deals data
   */
  async getDeals(userRole: string, userId?: string, userName?: string, managedTeam?: string): Promise<any[]> {
    const result = await this.fetchUnifiedData({
      userRole: userRole as any,
      userId,
      userName,
      managedTeam,
      dataTypes: ['deals']
    });

    return result.data.deals || [];
  }

  /**
   * Get callbacks data
   */
  async getCallbacks(userRole: string, userId?: string, userName?: string, managedTeam?: string): Promise<any[]> {
    const result = await this.fetchUnifiedData({
      userRole: userRole as any,
      userId,
      userName,
      managedTeam,
      dataTypes: ['callbacks']
    });

    return result.data.callbacks || [];
  }

  /**
   * Get targets data
   */
  async getTargets(userRole: string, userId?: string, userName?: string, managedTeam?: string): Promise<any[]> {
    const result = await this.fetchUnifiedData({
      userRole: userRole as any,
      userId,
      userName,
      managedTeam,
      dataTypes: ['targets']
    });

    return result.data.targets || [];
  }

  /**
   * Get notifications data
   */
  async getNotifications(userRole: string, userId?: string, userName?: string, managedTeam?: string): Promise<any[]> {
    const result = await this.fetchUnifiedData({
      userRole: userRole as any,
      userId,
      userName,
      managedTeam,
      dataTypes: ['notifications']
    });

    return result.data.notifications || [];
  }

  /**
   * Get users data (manager only)
   */
  async getUsers(): Promise<any[]> {
    const result = await this.fetchUnifiedData({
      userRole: 'manager',
      dataTypes: ['users']
    });

    return result.data.users || [];
  }

  /**
   * Get complete dashboard data (deals, callbacks, targets, notifications)
   */
  async getDashboardData(userRole: string, userId?: string, userName?: string, managedTeam?: string): Promise<UnifiedDataResponse> {
    return this.fetchUnifiedData({
      userRole: userRole as any,
      userId,
      userName,
      managedTeam,
      dataTypes: ['deals', 'callbacks', 'targets', 'notifications']
    });
  }

  /**
   * Get analytics data with deals and callbacks
   */
  async getAnalyticsData(userRole: string, userId?: string, userName?: string, managedTeam?: string, dateRange?: string): Promise<UnifiedDataResponse> {
    return this.fetchUnifiedData({
      userRole: userRole as any,
      userId,
      userName,
      managedTeam,
      dataTypes: ['deals', 'callbacks'],
      dateRange
    });
  }

  /**
   * Clear cache for specific user or all cache
   */
  clearCache(userRole?: string, userId?: string): void {
    if (userRole && userId) {
      // Clear cache for specific user
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.includes(`${userRole}-${userId}`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log('🗑️ UnifiedDataService: Cleared cache for user:', userId);
    } else {
      // Clear all cache
      this.cache.clear();
      console.log('🗑️ UnifiedDataService: Cleared all cache');
    }
  }

  /**
   * Generate cache key from options
   */
  private generateCacheKey(options: UnifiedDataOptions): string {
    return `${options.userRole}-${options.userId || 'all'}-${options.dataTypes.sort().join(',')}-${options.dateRange || 'all'}-${options.limit || 100}-${options.offset || 0}`;
  }

  /**
   * Get data from cache if not expired
   */
  private getFromCache(key: string): UnifiedDataResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  /**
   * Set data in cache with TTL
   */
  private setCache(key: string, data: UnifiedDataResponse, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const unifiedDataService = new UnifiedDataService();
export default unifiedDataService;
