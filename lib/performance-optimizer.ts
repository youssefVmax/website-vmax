/**
 * Performance Optimizer for reducing API calls and improving loading times
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Get cached data or fetch if expired
   */
  async getCachedData<T>(
    key: string,
    fetchFn: () => Promise<T>,
    cacheTime: number = 120000 // 2 minutes default
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    // Return cached data if still valid
    if (cached && now < cached.expiry) {
      console.log(`📋 Cache hit for ${key}`);
      return cached.data;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Request already pending for ${key}`);
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    console.log(`🔄 Cache miss for ${key}, fetching...`);
    const requestPromise = fetchFn().then(data => {
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: now,
        expiry: now + cacheTime
      });

      // Remove from pending requests
      this.pendingRequests.delete(key);
      
      console.log(`✅ Cached ${key} for ${cacheTime / 1000}s`);
      return data;
    }).catch(error => {
      // Remove from pending requests on error
      this.pendingRequests.delete(key);
      throw error;
    });

    // Store pending request
    this.pendingRequests.set(key, requestPromise);
    
    return requestPromise;
  }

  /**
   * Invalidate cache entry
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Invalidated cache for ${key}`);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('🧹 Cleared all cache');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Batch multiple API calls
   */
  async batchRequests<T>(
    requests: Array<() => Promise<T>>,
    batchSize: number = 3,
    delay: number = 100
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map(req => req()));
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results[i + index] = result.value;
        } else {
          console.error(`Batch request ${i + index} failed:`, result.reason);
          results[i + index] = null as any;
        }
      });

      // Add delay between batches to prevent overwhelming the server
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Export utility functions
export const createCacheKey = (...parts: (string | number | undefined)[]): string => {
  return parts.filter(Boolean).join(':');
};

export const withCache = <T>(
  key: string,
  fetchFn: () => Promise<T>,
  cacheTime?: number
): Promise<T> => {
  return performanceOptimizer.getCachedData(key, fetchFn, cacheTime);
};
