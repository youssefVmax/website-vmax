import { requestManager } from './request-manager';

export interface UnifiedDataOptions {
  userRole: 'manager' | 'team_leader' | 'salesman';
  userId?: string;
  userName?: string;
  managedTeam?: string;
  dataTypes?: string[];
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

export class UnifiedDataService {
  private baseUrl = '/api/unified-data';
  private cache = new Map<string, { data: UnifiedDataResponse; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds cache
  private pendingRequests = new Map<string, Promise<UnifiedDataResponse>>();

  private getCacheKey(options: UnifiedDataOptions): string {
    return JSON.stringify({
      userRole: options.userRole,
      userId: options.userId,
      dataTypes: options.dataTypes?.sort(),
      managedTeam: options.managedTeam
    });
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  async fetchUnifiedData(options: UnifiedDataOptions): Promise<UnifiedDataResponse> {
    const cacheKey = this.getCacheKey(options);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('📋 UnifiedDataService: Returning cached data');
      return cached.data;
    }
    
    // Check if request is already pending
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      console.log('⏳ UnifiedDataService: Request already pending, waiting...');
      return pending;
    }

    
    // Create the request promise
    const requestPromise = this.performRequest(options, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  private async performRequest(options: UnifiedDataOptions, cacheKey: string): Promise<UnifiedDataResponse> {
    try {
      console.log('🔄 UnifiedDataService: Fetching unified data...', {
        userRole: options.userRole,
        userId: options.userId,
        dataTypes: options.dataTypes,
        managedTeam: options.managedTeam
      });
      
      const params = new URLSearchParams({
        userRole: options.userRole,
        ...(options.userId && { userId: options.userId }),
        ...(options.userName && { userName: options.userName }),
        ...(options.managedTeam && { managedTeam: options.managedTeam }),
        ...(options.dataTypes && { dataTypes: options.dataTypes.join(',') })
      });

      const response = await requestManager.fetch(`${this.baseUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ UnifiedDataService: API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result: UnifiedDataResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'API returned unsuccessful response');
      }
      
      // Cache the successful result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      console.log('✅ UnifiedDataService: Data fetched and cached successfully');
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
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((cached, key) => {
      if (!this.isCacheValid(cached.timestamp)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🗑️ UnifiedDataService: Cleaned ${keysToDelete.length} expired cache entries`);
    }
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
