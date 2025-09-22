import { useState, useEffect, useCallback } from 'react';
import { dealsService } from '@/lib/mysql-deals-service';
import { callbacksService } from '@/lib/mysql-callbacks-service';
import { targetsService } from '@/lib/mysql-targets-service';
import { unifiedDataService } from '@/lib/unified-data-service';
import { Deal, Callback, SalesTarget } from '@/lib/api-service';

export interface SalesDataHookReturn {
  deals: Deal[];
  callbacks: Callback[];
  targets: SalesTarget[];
  loading: boolean;
  error: Error | null;
  refreshData: () => Promise<void>;
  analytics: {
    totalDeals: number;
    totalRevenue: number;
    pendingCallbacks: number;
    completedCallbacks: number;
    targetAchievement: number;
  };
}

export interface SalesDataFilters {
  userRole?: 'manager' | 'team-leader' | 'salesman';
  userId?: string;
  userName?: string;
  managedTeam?: string;
  period?: string;
}

/**
 * Custom hook for fetching and managing sales data from MySQL
 * Replaces useFirebaseSalesData with MySQL implementation
 */
export function useMySQLSalesData(filters?: SalesDataFilters): SalesDataHookReturn {
  const [data, setData] = useState<{
    deals: Deal[];
    callbacks: Callback[];
    targets: SalesTarget[];
    loading: boolean;
    error: Error | null;
  }>({
    deals: [],
    callbacks: [],
    targets: [],
    loading: true,
    error: null
  });

  const [analytics, setAnalytics] = useState({
    totalDeals: 0,
    totalRevenue: 0,
    pendingCallbacks: 0,
    completedCallbacks: 0,
    targetAchievement: 0
  });

  const calculateAnalytics = useCallback((deals: Deal[], callbacks: Callback[], targets: SalesTarget[]) => {
    // Ensure arrays are defined and fallback to empty arrays
    const safeDeals = deals || [];
    const safeCallbacks = callbacks || [];
    const safeTargets = targets || [];
    
    const totalDeals = safeDeals.length;
    const totalRevenue = safeDeals.reduce((sum, deal) => sum + (deal.amountPaid || 0), 0);
    const pendingCallbacks = safeCallbacks.filter(cb => cb.status === 'pending').length;
    const completedCallbacks = safeCallbacks.filter(cb => cb.status === 'completed').length;
    
    // Calculate target achievement
    let targetAchievement = 0;
    if (safeTargets.length > 0 && filters?.userId) {
      const userTarget = safeTargets.find(t => t.salesAgentId === filters.userId);
      if (userTarget && userTarget.targetAmount > 0) {
        targetAchievement = (totalRevenue / userTarget.targetAmount) * 100;
      }
    }

    return {
      totalDeals,
      totalRevenue,
      pendingCallbacks,
      completedCallbacks,
      targetAchievement
    };
  }, [filters?.userId]);

  const loadData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      console.log('🔄 useMySQLSalesData: Loading data via unified service');

      // Try unified data service first for better performance
      try {
        const unifiedResult = await unifiedDataService.getDashboardData(
          filters?.userRole || 'manager',
          filters?.userId,
          filters?.userName,
          filters?.managedTeam
        );

        if (unifiedResult.success) {
          console.log('✅ useMySQLSalesData: Data loaded from unified service');
          
          // Ensure we have arrays (fallback to empty arrays if undefined)
          const deals = Array.isArray(unifiedResult.data.deals) ? unifiedResult.data.deals : [];
          const callbacks = Array.isArray(unifiedResult.data.callbacks) ? unifiedResult.data.callbacks : [];
          const targets = Array.isArray(unifiedResult.data.targets) ? unifiedResult.data.targets : [];

          // Calculate analytics
          const analyticsData = calculateAnalytics(deals, callbacks, targets);

          setData({
            deals,
            callbacks,
            targets,
            loading: false,
            error: null
          });

          setAnalytics(analyticsData);
          return; // Success, exit early
        }
      } catch (unifiedError) {
        console.warn('⚠️ useMySQLSalesData: Unified service failed, falling back to individual services:', unifiedError);
      }

      // Fallback to individual services if unified service fails
      const dealFilters = {
        userRole: filters?.userRole,
        userId: filters?.userId,
        managedTeam: filters?.managedTeam
      };

      const callbackFilters = {
        userRole: filters?.userRole,
        userId: filters?.userId,
        userName: filters?.userName,
        managedTeam: filters?.managedTeam
      };

      const targetFilters = {
        agentId: filters?.userId,
        period: filters?.period,
        managedTeam: filters?.managedTeam
      };

      // Fetch data in parallel using individual services
      const [dealsResponse, callbacksResponse, targetsResponse] = await Promise.all([
        dealsService.getDeals(dealFilters.userRole, dealFilters.userId, dealFilters.managedTeam),
        callbacksService.getCallbacks(callbackFilters.userRole, callbackFilters.userId, callbackFilters.userName, callbackFilters.managedTeam),
        targetsService.getTargets(targetFilters)
      ]);

      // Ensure we have arrays (fallback to empty arrays if undefined)
      const deals = Array.isArray(dealsResponse) ? dealsResponse : [];
      const callbacks = Array.isArray(callbacksResponse) ? callbacksResponse : [];
      const targets = Array.isArray(targetsResponse) ? targetsResponse : [];

      // Calculate analytics
      const analyticsData = calculateAnalytics(deals, callbacks, targets);

      setData({
        deals,
        callbacks,
        targets,
        loading: false,
        error: null
      });

      setAnalytics(analyticsData);

    } catch (error) {
      console.error('Error loading sales data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error as Error
      }));
    }
  }, [filters?.userRole, filters?.userId, filters?.userName, filters?.managedTeam, filters?.period, calculateAnalytics]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up real-time listeners for data changes
  useEffect(() => {
    const unsubscribeDeals = dealsService.onDealsChange(
      (newDeals) => {
        setData(prev => {
          const newAnalytics = calculateAnalytics(newDeals, prev.callbacks, prev.targets);
          setAnalytics(newAnalytics);
          return { ...prev, deals: newDeals };
        });
      },
      filters?.userRole,
      filters?.userId,
      filters?.managedTeam
    );

    const unsubscribeCallbacks = callbacksService.onCallbacksChange(
      (newCallbacks) => {
        setData(prev => {
          const newAnalytics = calculateAnalytics(prev.deals, newCallbacks, prev.targets);
          setAnalytics(newAnalytics);
          return { ...prev, callbacks: newCallbacks };
        });
      },
      filters?.userRole,
      filters?.userId,
      filters?.userName,
      filters?.managedTeam
    );

    // Cleanup listeners on unmount
    return () => {
      unsubscribeDeals();
      unsubscribeCallbacks();
    };
  }, [filters?.userRole, filters?.userId, filters?.userName, filters?.managedTeam, calculateAnalytics]);

  return {
    deals: data.deals,
    callbacks: data.callbacks,
    targets: data.targets,
    loading: data.loading,
    error: data.error,
    refreshData,
    analytics
  };
}

/**
 * Backward compatibility alias for existing components
 * @deprecated Use useMySQLSalesData instead
 */
export const useFirebaseSalesData = useMySQLSalesData;

export default useMySQLSalesData;
