/**
 * SWR Global Configuration
 * 
 * ✅ PHASE 3: SWR integration for better caching and revalidation
 */

import { SWRConfiguration } from 'swr';
import { dedupeFetch } from './request-manager';

// Custom fetcher that uses dedupeFetch
export const swrFetcher = async (url: string) => {
  console.log(`🔄 SWR Fetcher: ${url}`);
  return dedupeFetch(url);
};

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
  // Use custom fetcher with deduplication
  fetcher: swrFetcher,
  
  // Revalidation settings
  revalidateOnFocus: false, // Don't refetch when window regains focus
  revalidateOnReconnect: true, // Refetch when reconnecting to network
  revalidateIfStale: true, // Revalidate if data is stale
  
  // Cache settings
  dedupingInterval: 2000, // Dedupe requests within 2 seconds
  focusThrottleInterval: 5000, // Throttle focus revalidation to 5 seconds
  
  // Error retry settings
  errorRetryCount: 2, // Retry failed requests 2 times
  errorRetryInterval: 5000, // Wait 5 seconds between retries
  shouldRetryOnError: true,
  
  // Loading delay
  loadingTimeout: 3000, // Show loading state after 3 seconds
  
  // Keep previous data while revalidating
  keepPreviousData: true,
  
  // Success/Error callbacks
  onSuccess: (data, key, config) => {
    console.log(`✅ SWR Success: ${key}`);
  },
  onError: (err, key, config) => {
    console.error(`❌ SWR Error: ${key}`, err);
  },
  
  // Fallback data
  fallback: {},
};

// Role-specific SWR configurations
export const managerSwrConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 120000, // Refresh every 2 minutes for managers (system-wide data)
};

export const teamLeaderSwrConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 90000, // Refresh every 90 seconds for team leaders (team data)
};

export const salesmanSwrConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 60000, // Refresh every 60 seconds for salesmen (personal data)
};

// Helper to get role-specific config
export function getSwrConfigForRole(role?: string): SWRConfiguration {
  switch (role) {
    case 'manager':
      return managerSwrConfig;
    case 'team_leader':
      return teamLeaderSwrConfig;
    case 'salesman':
      return salesmanSwrConfig;
    default:
      return swrConfig;
  }
}
