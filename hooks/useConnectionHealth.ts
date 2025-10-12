import { useState, useEffect, useCallback } from 'react';
import { connectionManager } from '@/lib/connection-manager';

interface ConnectionHealth {
  status: 'healthy' | 'unhealthy' | 'error';
  database: {
    connected: boolean;
    responseTime: string;
    pool: any;
  };
  system: {
    uptime: number;
    memory: any;
    version: string;
    platform: string;
    timestamp: string;
  };
  services: {
    unifiedData: string;
    analytics: string;
    userManagement: string;
  };
}

interface ConnectionStats {
  total: number;
  active: number;
  errors: number;
  healthPercentage: number;
  endpoints: any[];
}

interface UseConnectionHealthReturn {
  health: ConnectionHealth | null;
  stats: ConnectionStats | null;
  loading: boolean;
  error: string | null;
  refreshHealth: () => Promise<void>;
  testUnifiedAPI: () => Promise<boolean>;
  testAnalyticsAPI: () => Promise<boolean>;
  isHealthy: boolean;
}

export function useConnectionHealth(): UseConnectionHealthReturn {
  const [health, setHealth] = useState<ConnectionHealth | null>(null);
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if system is healthy
  const isHealthy = health?.status === 'healthy' && health?.database?.connected;

  // Refresh health data
  const refreshHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 useConnectionHealth: Refreshing health data...');
      
      // Get health and stats
      const [healthData] = await Promise.all([
        connectionManager.checkSystemHealth(),
        connectionManager.refreshAllConnections()
      ]);
      
      const statsData = connectionManager.getConnectionStats();
      
      setHealth(healthData);
      setStats(statsData);
      
      console.log('✅ useConnectionHealth: Health data refreshed');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh health data';
      console.error('❌ useConnectionHealth: Error refreshing health:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Test unified data API
  const testUnifiedAPI = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔍 useConnectionHealth: Testing unified API...');
      const result = await connectionManager.testUnifiedDataAPI();
      
      // Refresh stats after test
      const statsData = connectionManager.getConnectionStats();
      setStats(statsData);
      
      return result;
    } catch (err) {
      console.error('❌ useConnectionHealth: Error testing unified API:', err);
      return false;
    }
  }, []);

  // Test analytics API
  const testAnalyticsAPI = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔍 useConnectionHealth: Testing analytics API...');
      const result = await connectionManager.testAnalyticsAPI();
      
      // Refresh stats after test
      const statsData = connectionManager.getConnectionStats();
      setStats(statsData);
      
      return result;
    } catch (err) {
      console.error('❌ useConnectionHealth: Error testing analytics API:', err);
      return false;
    }
  }, []);

  // Set up health monitoring
  useEffect(() => {
    console.log('🔄 useConnectionHealth: Setting up health monitoring...');
    
    // Initial health check
    refreshHealth();
    
    // Listen for health changes
    const unsubscribe = connectionManager.addHealthListener((healthData) => {
      console.log('📡 useConnectionHealth: Health update received:', healthData.status);
      setHealth(healthData);
      
      // Update stats when health changes
      const statsData = connectionManager.getConnectionStats();
      setStats(statsData);
    });
    
    // Cleanup
    return () => {
      console.log('🔄 useConnectionHealth: Cleaning up health monitoring...');
      unsubscribe();
    };
  }, [refreshHealth]);

  // ✅ OPTIMIZATION: Removed auto-refresh polling
  // Health now refreshes only on mount or manual refresh
  // Reduces unnecessary API calls by 720 requests/day

  return {
    health,
    stats,
    loading,
    error,
    refreshHealth,
    testUnifiedAPI,
    testAnalyticsAPI,
    isHealthy
  };
}
