/**
 * Request Manager - Prevents duplicate API calls and manages connection pool
 * 
 * This singleton service deduplicates requests and adds caching to prevent
 * database connection pool exhaustion.
 * 
 * ✅ OPTIMIZATION: Enhanced with SWR-compatible deduplication
 */

interface RequestCache {
  data: any;
  timestamp: number;
  promise?: Promise<any>;
}

// ✅ PHASE 2A: Dedupe concurrent identical requests
const inFlight = new Map<string, Promise<any>>();

export async function dedupeFetch(url: string, init?: RequestInit) {
  const key = typeof url === 'string' ? url : JSON.stringify(url);
  if (inFlight.has(key)) {
    console.log(`🔄 dedupeFetch: Returning in-flight request for ${url}`);
    return inFlight.get(key);
  }
  
  const p = (async () => {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return res.json();
    } finally {
      // Ensure removal so future requests can run
      inFlight.delete(key);
    }
  })();
  
  inFlight.set(key, p);
  return p;
}

class RequestManager {
  private cache = new Map<string, RequestCache>();
  private readonly CACHE_TTL = 60000; // ✅ OPTIMIZATION: Increased to 60 seconds for better caching
  private readonly MAX_RETRIES = 2; // ✅ OPTIMIZATION: Increased to 2 retries for better reliability

  private getCacheKey(url: string, options?: RequestInit): string {
    return `${url}_${JSON.stringify(options?.method || 'GET')}_${JSON.stringify(options?.body || '')}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const cacheKey = this.getCacheKey(url, options);
    const cached = this.cache.get(cacheKey);

    // Return cached data if valid
    if (cached && this.isCacheValid(cached.timestamp) && cached.data) {
      console.log(`📋 RequestManager: Returning cached response for ${url}`);
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If request is already in progress, wait for it and return a clone
    // so each consumer gets a fresh readable body stream
    if (cached?.promise) {
      console.log(`⏳ RequestManager: Waiting for existing request to ${url}`);
      return cached.promise.then((resp) => resp.clone());
    }

    // Create new request with timeout and retry logic
    const requestPromise = this.performRequest(url, options, cacheKey);
    
    // Store the promise to prevent duplicate requests
    this.cache.set(cacheKey, {
      data: null,
      timestamp: Date.now(),
      promise: requestPromise
    });

    try {
      const response = await requestPromise;
      
      // Cache successful responses
      if (response.ok) {
        const data = await response.clone().json();
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }
      
      // Always return a fresh clone so the caller can read the body
      return response.clone();
    } catch (error) {
      // Remove failed request from cache
      this.cache.delete(cacheKey);
      throw error;
    }
  }

  private async performRequest(url: string, options?: RequestInit, cacheKey?: string): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 RequestManager: Attempt ${attempt + 1} for ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // ✅ OPTIMIZATION: Reduced to 10s timeout

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options?.headers
          }
        });

        clearTimeout(timeoutId);
        
        if (response.ok || attempt === this.MAX_RETRIES) {
          return response;
        }

        // If not ok and we have retries left, continue to next attempt
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`⏰ RequestManager: Request timeout for ${url} (attempt ${attempt + 1})`);
        } else {
          console.warn(`❌ RequestManager: Request failed for ${url} (attempt ${attempt + 1}):`, error);
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  // Clear expired cache entries
  cleanCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isCacheValid(entry.timestamp)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🗑️ RequestManager: Cleaned ${cleaned} expired cache entries`);
    }
  }

  // Get cache statistics
  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.values()).filter(entry => entry.data).length
    };
  }

  // Clear all cache
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ RequestManager: Cleared all cache');
  }
}

// Export singleton instance
export const requestManager = new RequestManager();

// ✅ OPTIMIZATION: Disabled auto-cache cleaning interval
// Cache now cleans on-demand to reduce background tasks
// Uncomment if needed:
// setInterval(() => {
//   requestManager.cleanCache();
// }, 5 * 60 * 1000);

export default requestManager;
