import { useState, useEffect, useCallback } from 'react';
import { dealsService } from '@/lib/mysql-deals-service';
import { callbacksService } from '@/lib/mysql-callbacks-service';
import { targetsService } from '@/lib/mysql-targets-service';
import { unifiedDataService } from '@/lib/unified-data-service';
import directMySQLService from '@/lib/direct-mysql-service';
import { Deal, Callback, SalesTarget } from '@/lib/api-service';

export interface SalesDataHookReturn {
  deals: Deal[];
  callbacks: Callback[];
  targets: SalesTarget[];
  users: any[];
  loading: boolean;
  error: Error | null;
  refreshData: () => Promise<void>;
  analytics: {
    totalDeals: number;
    totalRevenue: number;
    pendingCallbacks: number;
    completedCallbacks: number;
    targetAchievement: number;
    totalUsers: number;
    activeUsers: number;
    salesmenCount: number;
    teamLeadersCount: number;
  };
}

export interface SalesDataFilters {
  userRole?: 'manager' | 'team_leader' | 'salesman';
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
    users: any[];
    loading: boolean;
    error: Error | null;
  }>({
    deals: [],
    callbacks: [],
    targets: [],
    users: [],
    loading: true,
    error: null
  });

  const [analytics, setAnalytics] = useState({
    totalDeals: 0,
    totalRevenue: 0,
    pendingCallbacks: 0,
    completedCallbacks: 0,
    targetAchievement: 0,
    totalUsers: 0,
    activeUsers: 0,
    salesmenCount: 0,
    teamLeadersCount: 0
  });

  const calculateAnalytics = useCallback((deals: Deal[], callbacks: Callback[], targets: SalesTarget[], users: any[]) => {
    // Ensure arrays are defined and fallback to empty arrays
    const safeDeals = deals || [];
    const safeCallbacks = callbacks || [];
    const safeTargets = targets || [];
    const safeUsers = users || [];
    
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

    // User analytics
    const totalUsers = safeUsers.length;
    const activeUsers = safeUsers.filter(u => u.is_active).length;
    const salesmenCount = safeUsers.filter(u => u.role === 'salesman').length;
    const teamLeadersCount = safeUsers.filter(u => u.role === 'team_leader').length;

    return {
      totalDeals,
      totalRevenue,
      pendingCallbacks,
      completedCallbacks,
      targetAchievement,
      totalUsers,
      activeUsers,
      salesmenCount,
      teamLeadersCount
    };
  }, [filters?.userId]);

  const loadData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      

      // Build filters for API calls
      const apiFilters: Record<string, string> = {};
      
      if (filters?.userRole === 'salesman' && filters?.userId) {
        apiFilters.salesAgentId = filters.userId;
        apiFilters.SalesAgentID = filters.userId;
        apiFilters.userRole = 'salesman';
        apiFilters.userId = filters.userId;
      } else if (filters?.userRole === 'team_leader' && filters?.managedTeam) {
        apiFilters.salesTeam = filters.managedTeam;
        apiFilters.sales_team = filters.managedTeam;
        apiFilters.userRole = 'team_leader';
        apiFilters.userId = filters.userId || '';
      } else if (filters?.userRole === 'manager') {
        apiFilters.userRole = 'manager';
        apiFilters.userId = filters.userId || '';
      }

      

      // Load data directly from APIs with better error handling
      const [dealsResult, callbacksResult, targetsResult, usersResult] = await Promise.all([
        fetch(`/api/deals?${new URLSearchParams({ limit: '1000', ...apiFilters }).toString()}`)
          .then(async res => {
            if (!res.ok) {
              console.warn(`⚠️ Deals API returned ${res.status}: ${res.statusText}`);
              return { success: true, deals: [], total: 0 };
            }
            const data = await res.json();
            return data.success !== false ? data : { success: true, deals: [], total: 0 };
          })
          .catch(err => {
            console.error('❌ Error loading deals:', err);
            return { success: true, deals: [], total: 0 };
          }),
        fetch(`/api/callbacks?${new URLSearchParams({ limit: '1000', ...apiFilters }).toString()}`)
          .then(async res => {
            if (!res.ok) {
              console.warn(`⚠️ Callbacks API returned ${res.status}: ${res.statusText}`);
              return { success: true, callbacks: [], total: 0 };
            }
            const data = await res.json();
            return data.success !== false ? data : { success: true, callbacks: [], total: 0 };
          })
          .catch(err => {
            console.error('❌ Error loading callbacks:', err);
            return { success: true, callbacks: [], total: 0 };
          }),
        fetch(`/api/targets?${new URLSearchParams({ limit: '1000', ...apiFilters }).toString()}`)
          .then(async res => {
            if (!res.ok) {
              console.warn(`⚠️ Targets API returned ${res.status}: ${res.statusText}`);
              return { success: true, targets: [], total: 0 };
            }
            const data = await res.json();
            return data.success !== false ? data : { success: true, targets: [], total: 0 };
          })
          .catch(err => {
            console.error('❌ Error loading targets:', err);
            return { success: true, targets: [], total: 0 };
          }),
        directMySQLService.getUsers({})
          .then(users => ({ success: true, users }))
          .catch(err => {
            console.error('❌ Error loading users:', err);
            return { success: true, users: [] };
          })
      ]);

      

      const deals = dealsResult.deals || [];
      const callbacks = callbacksResult.callbacks || [];
      const targets = targetsResult.targets || [];
      const users = usersResult.users || [];

      // Calculate analytics
      const analyticsData = calculateAnalytics(deals, callbacks, targets, users);

      setData({
        deals,
        callbacks,
        targets,
        users,
        loading: false,
        error: null
      });

      setAnalytics(analyticsData);

    } catch (error) {
      console.error('❌ useMySQLSalesData: Error loading data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
        users: [] // Ensure users is included
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

  // ✅ OPTIMIZATION: Removed auto-refresh polling listeners
  // Data now refreshes only on mount or manual refresh
  // This eliminates unnecessary re-renders and API calls

  return {
    deals: data.deals,
    callbacks: data.callbacks,
    targets: data.targets,
    users: data.users,
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
