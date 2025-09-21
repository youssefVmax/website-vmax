import { useState, useEffect, useCallback } from 'react';
import { dealsService } from '@/lib/mysql-deals-service';
import { callbacksService } from '@/lib/mysql-callbacks-service';
import { targetsService } from '@/lib/mysql-targets-service';
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
    const totalDeals = deals.length;
    const totalRevenue = deals.reduce((sum, deal) => sum + (deal.amountPaid || 0), 0);
    const pendingCallbacks = callbacks.filter(cb => cb.status === 'pending').length;
    const completedCallbacks = callbacks.filter(cb => cb.status === 'completed').length;
    
    // Calculate target achievement
    let targetAchievement = 0;
    if (targets.length > 0 && filters?.userId) {
      const userTarget = targets.find(t => t.agentId === filters.userId);
      if (userTarget && userTarget.monthlyTarget > 0) {
        targetAchievement = (totalRevenue / userTarget.monthlyTarget) * 100;
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

      // Prepare filters for each service
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

      // Fetch data in parallel
      const [deals, callbacks, targets] = await Promise.all([
        dealsService.getDeals(dealFilters.userRole, dealFilters.userId, dealFilters.managedTeam),
        callbacksService.getCallbacks(callbackFilters.userRole, callbackFilters.userId, callbackFilters.userName, callbackFilters.managedTeam),
        targetsService.getTargets(targetFilters)
      ]);

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
