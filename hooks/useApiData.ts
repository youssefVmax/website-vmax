/**
 * Unified API Data Hook with Zero Caching and Aggressive Refresh
 * Uses the central config/api.ts for all requests with fresh data guarantee
 * NO CACHING - Always fetches fresh data with configurable intervals
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiMethods, ApiResponse } from '../config/api';
import { UserRole } from '../types/user';

export interface UseApiDataOptions {
  userRole?: UserRole;
  userId?: string;
  managedTeam?: string;
  autoLoad?: boolean;
  refreshInterval?: number; // in milliseconds, 0 to disable
  retryOnError?: boolean;
  maxRetries?: number;
}

export interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

// Minimal cache for deduplication only - VERY SHORT TTL
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 2000; // Only 2 seconds to prevent duplicate requests

function getCacheKey(endpoint: string, params?: Record<string, any>): string {
  const paramStr = params ? JSON.stringify(params) : '';
  const timestamp = Math.floor(Date.now() / 5000); // Change every 5 seconds to force fresh requests
  return `${endpoint}:${paramStr}:${timestamp}`;
}

function getCachedData<T>(cacheKey: string): T | null {
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    console.log('🔄 Using cached data (deduplication only)');
    return cached.data;
  }
  apiCache.delete(cacheKey);
  return null;
}

function setCachedData<T>(cacheKey: string, data: T, ttl: number = CACHE_TTL): void {
  // Clear old cache entries to prevent memory leaks
  if (apiCache.size > 50) {
    const oldestKey = apiCache.keys().next().value;
    if (oldestKey) {
      apiCache.delete(oldestKey);
    }
  }
  
  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

/**
 * Generic hook for API data fetching with caching
 */
export function useApiData<T = any>(
  fetchFunction: (params?: any) => Promise<ApiResponse<T>>,
  params?: Record<string, any>,
  options: UseApiDataOptions = {}
): UseApiDataResult<T> {
  const {
    autoLoad = true,
    refreshInterval = 30000, // 30 seconds default
    retryOnError = true,
    maxRetries = 3
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const retryCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Generate cache key
  const cacheKey = getCacheKey(fetchFunction.name, params);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!mountedRef.current) return;

    // Check cache first (skip cache on manual refresh)
    if (!isRetry) {
      const cachedData = getCachedData<T>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching data:', { function: fetchFunction.name, params, isRetry });
      
      const response = await fetchFunction(params);
      
      if (!mountedRef.current) return;

      if (response.success) {
        const responseData = response.data as T;
        setData(responseData);
        setLastUpdated(new Date());
        retryCountRef.current = 0;
        
        // Cache the successful response
        setCachedData(cacheKey, responseData);
        
        console.log('✅ Data fetched successfully:', { 
          function: fetchFunction.name, 
          dataType: typeof responseData,
          cached: true
        });
      } else {
        throw new Error(response.error || 'API request failed');
      }
    } catch (err) {
      if (!mountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ API fetch error:', { 
        function: fetchFunction.name, 
        error: errorMessage, 
        retryCount: retryCountRef.current 
      });

      // Retry logic
      if (retryOnError && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`🔄 Retrying in 2 seconds... (${retryCountRef.current}/${maxRetries})`);
        
        setTimeout(() => {
          if (mountedRef.current) {
            fetchData(true);
          }
        }, 2000 * retryCountRef.current); // Exponential backoff
        return;
      }

      setError(errorMessage);
      retryCountRef.current = 0;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFunction, params, cacheKey, retryOnError, maxRetries]);

  const refresh = useCallback(async () => {
    // Clear cache for this key to force fresh data
    apiCache.delete(cacheKey);
    await fetchData(true);
  }, [fetchData, cacheKey]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial load
  useEffect(() => {
    if (autoLoad) {
      fetchData();
    }
  }, [autoLoad, fetchData]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval > 0 && !loading) {
      intervalRef.current = setInterval(() => {
        if (!loading) {
          fetchData();
        }
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refreshInterval, loading, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    clearError
  };
}

/**
 * Specialized hooks for common data types
 */

export function useDashboardStats(options: UseApiDataOptions = {}) {
  const params = {
    userRole: options.userRole,
    userId: options.userId,
    managedTeam: options.managedTeam
  };

  return useApiData(
    apiMethods.getDashboardStats,
    params,
    { refreshInterval: 10000, ...options } // Refresh every 10 seconds
  );
}

export function useDeals(filters?: Record<string, any>, options: UseApiDataOptions = {}) {
  const params = {
    ...filters,
    userRole: options.userRole,
    userId: options.userId,
    managedTeam: options.managedTeam
  };

  return useApiData(
    apiMethods.getDeals,
    params,
    { refreshInterval: 15000, ...options } // Refresh every 15 seconds
  );
}

export function useCallbacks(filters?: Record<string, any>, options: UseApiDataOptions = {}) {
  const params = {
    ...filters,
    userRole: options.userRole,
    userId: options.userId,
    managedTeam: options.managedTeam
  };

  return useApiData(
    apiMethods.getCallbacks,
    params,
    { refreshInterval: 15000, ...options } // Refresh every 15 seconds
  );
}

export function useNotifications(filters?: Record<string, any>, options: UseApiDataOptions = {}) {
  const params = {
    ...filters,
    userRole: options.userRole,
    userId: options.userId
  };

  return useApiData(
    apiMethods.getNotifications,
    params,
    { refreshInterval: 5000, ...options } // Refresh every 5 seconds for notifications
  );
}

/**
 * Clear all cached data (useful for logout or role changes)
 */
export function clearApiCache(): void {
  apiCache.clear();
  console.log('🗑️ API cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: apiCache.size,
    keys: Array.from(apiCache.keys()),
    totalMemory: JSON.stringify(Array.from(apiCache.values())).length
  };
}
