import { useState, useEffect, useCallback } from 'react';
import { unifiedAnalyticsService, type UserContext } from '@/lib/unified-analytics-service';
import { unifiedDataService } from '@/lib/unified-data-service';

interface EnhancedAnalyticsData {
  overview: {
    totalDeals: number;
    totalRevenue: number;
    averageDealSize: number;
    totalCallbacks: number;
    pendingCallbacks: number;
    completedCallbacks: number;
    conversionRate: number;
  };
  charts: {
    topAgents: Array<{ agent: string; sales: number; deals: number }>;
    serviceDistribution: Array<{ service: string; sales: number }>;
    teamDistribution: Array<{ team: string; sales: number }>;
    dailyTrend: Array<{ date: string; sales: number }>;
  };
  tables: {
    recentDeals: any[];
    recentCallbacks: any[];
  };
  targets: {
    total: number;
    achieved: number;
    progress: Array<{
      agent: string;
      target: number;
      current: number;
      percentage: number;
    }>;
  };
}

interface UseEnhancedAnalyticsProps {
  userRole: 'manager' | 'salesman' | 'team_leader';
  userId?: string;
  userName?: string;
  username?: string;
  managedTeam?: string;
  dateRange?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseEnhancedAnalyticsReturn {
  analytics: EnhancedAnalyticsData | null;
  loading: boolean;
  error: string | null;
  refreshAnalytics: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useEnhancedAnalytics({
  userRole,
  userId,
  userName,
  username,
  managedTeam,
  dateRange = 'all',
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}: UseEnhancedAnalyticsProps): UseEnhancedAnalyticsReturn {
  const [analytics, setAnalytics] = useState<EnhancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshAnalytics = useCallback(async () => {
    if (!userId || !userName) {
      console.warn('⚠️ useEnhancedAnalytics: Missing required user data');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 useEnhancedAnalytics: Fetching analytics...', {
        userRole,
        userId,
        userName,
        managedTeam,
        dateRange
      });

      const userContext: UserContext = {
        id: userId,
        name: userName,
        username: username || userName,
        role: userRole,
        managedTeam
      };

      // Try unified analytics service first
      let analyticsData;
      try {
        analyticsData = await unifiedAnalyticsService.getAnalytics(userContext, dateRange);
        console.log('✅ useEnhancedAnalytics: Analytics loaded from unified service', analyticsData);
      } catch (unifiedError) {
        console.warn('⚠️ useEnhancedAnalytics: Unified service failed, trying unified data service:', unifiedError);
        
        // Fallback to unified data service
        const unifiedDataResult = await unifiedDataService.getAnalyticsData(
          userRole, userId, userName, managedTeam, dateRange
        );
        
        if (unifiedDataResult.success && unifiedDataResult.data.analytics) {
          analyticsData = {
            overview: unifiedDataResult.data.analytics.overview,
            charts: {
              topAgents: [],
              serviceDistribution: [],
              teamDistribution: [],
              dailyTrend: []
            },
            tables: {
              recentDeals: unifiedDataResult.data.deals || [],
              recentCallbacks: unifiedDataResult.data.callbacks || []
            },
            targets: {
              total: 0,
              achieved: 0,
              progress: []
            }
          };
          console.log('✅ useEnhancedAnalytics: Analytics loaded from unified data service');
        } else {
          throw new Error('Both analytics services failed');
        }
      }
      
      setAnalytics(analyticsData);
      setLastUpdated(new Date());
      setError(null);

    } catch (err) {
      console.error('❌ useEnhancedAnalytics: Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      
      // Set empty analytics on error to prevent crashes
      setAnalytics({
        overview: {
          totalDeals: 0,
          totalRevenue: 0,
          averageDealSize: 0,
          totalCallbacks: 0,
          pendingCallbacks: 0,
          completedCallbacks: 0,
          conversionRate: 0
        },
        charts: {
          topAgents: [],
          serviceDistribution: [],
          teamDistribution: [],
          dailyTrend: []
        },
        tables: {
          recentDeals: [],
          recentCallbacks: []
        },
        targets: {
          total: 0,
          achieved: 0,
          progress: []
        }
      });
    } finally {
      setLoading(false);
    }
  }, [userRole, userId, userName, username, managedTeam, dateRange]);

  // Initial load
  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log('🔄 useEnhancedAnalytics: Auto-refreshing analytics...');
      refreshAnalytics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshAnalytics]);

  return {
    analytics,
    loading,
    error,
    refreshAnalytics,
    lastUpdated
  };
}

// Helper hook for quick KPIs only
export function useQuickKPIs({
  userRole,
  userId,
  userName,
  username,
  managedTeam,
  dateRange = 'all'
}: UseEnhancedAnalyticsProps) {
  const [kpis, setKpis] = useState({
    totalDeals: 0,
    totalRevenue: 0,
    averageDealSize: 0,
    totalCallbacks: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshKPIs = useCallback(async () => {
    if (!userId || !userName) return;

    try {
      setLoading(true);
      setError(null);

      const userContext: UserContext = {
        id: userId,
        name: userName,
        username: username || userName,
        role: userRole,
        managedTeam
      };

      const kpiData = await unifiedAnalyticsService.getQuickKPIs(userContext, dateRange);
      setKpis(kpiData);
      setError(null);

    } catch (err) {
      console.error('❌ useQuickKPIs: Error fetching KPIs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch KPIs');
    } finally {
      setLoading(false);
    }
  }, [userRole, userId, userName, username, managedTeam, dateRange]);

  useEffect(() => {
    refreshKPIs();
  }, [refreshKPIs]);

  return {
    kpis,
    loading,
    error,
    refreshKPIs
  };
}

export default useEnhancedAnalytics;
