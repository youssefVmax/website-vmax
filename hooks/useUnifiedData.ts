/**
 * Unified Data Hook - Replaces all individual data hooks
 * Provides manual refresh instead of auto-polling
 */

import { useState, useEffect, useCallback } from 'react';
import { unifiedApiService } from '@/lib/unified-api-service';

interface UseUnifiedDataOptions {
  userRole?: string;
  userId?: string;
  userName?: string;
  managedTeam?: string;
  dataTypes?: string[]; // Default: ['deals', 'callbacks', 'targets', 'notifications']
  autoLoad?: boolean; // Default: true
}

interface UnifiedData {
  deals: any[];
  callbacks: any[];
  targets: any[];
  notifications: any[];
  analytics: any;
}

export function useUnifiedData(options: UseUnifiedDataOptions = {}) {
  const {
    userRole = 'manager',
    userId,
    userName,
    managedTeam,
    dataTypes = ['deals', 'callbacks', 'targets', 'notifications'], // Default data types
    autoLoad = true
  } = options;

  const [data, setData] = useState<UnifiedData>({
    deals: [],
    callbacks: [],
    targets: [],
    notifications: [],
    analytics: {}
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Load all data from APIs
   */
  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    if (loading) return; // Prevent multiple simultaneous calls

    try {
      setLoading(true);
      setError(null);

      if (forceRefresh) {
        await unifiedApiService.refresh();
      }

      console.log('🔄 useUnifiedData: Loading data for', { userRole, userId, managedTeam });

      // Build filters based on user role
      const filters: Record<string, string> = {};
      
      if (userRole === 'salesman' && userId) {
        filters.salesAgentId = userId;
        filters.SalesAgentID = userId; // For callbacks
        filters.userRole = 'salesman';
        filters.userId = userId;
      } else if (userRole === 'team_leader' && managedTeam) {
        filters.salesTeam = managedTeam;
        filters.sales_team = managedTeam; // For callbacks
        filters.userRole = 'team_leader';
        filters.userId = userId || '';
      } else if (userRole === 'manager') {
        filters.userRole = 'manager';
        filters.userId = userId || '';
      }
      // Manager gets all data (no additional filters needed)

      // Load all data in parallel
      const [deals, callbacks, targets, notifications, analytics] = await Promise.all([
        dataTypes.includes('deals') ? unifiedApiService.getDeals(filters).catch(err => {
          console.error('Error loading deals:', err);
          return [];
        }) : Promise.resolve([]),
        dataTypes.includes('callbacks') ? unifiedApiService.getCallbacks(filters).catch(err => {
          console.error('Error loading callbacks:', err);
          return [];
        }) : Promise.resolve([]),
        dataTypes.includes('targets') ? unifiedApiService.getTargets(filters).catch(err => {
          console.error('Error loading targets:', err);
          return [];
        }) : Promise.resolve([]),
        dataTypes.includes('notifications') ? unifiedApiService.getNotifications({ ...filters, userId: userId || '' }).catch(err => {
          console.error('Error loading notifications:', err);
          return [];
        }) : Promise.resolve([]),
        unifiedApiService.getDashboardStats(filters).catch(err => {
          console.error('Error loading analytics:', err);
          return {};
        })
      ]);

      console.log('✅ useUnifiedData: Data loaded successfully', {
        deals: Array.isArray(deals) ? deals.length : 0,
        callbacks: Array.isArray(callbacks) ? callbacks.length : 0,
        targets: Array.isArray(targets) ? targets.length : 0,
        notifications: Array.isArray(notifications) ? notifications.length : 0,
        analytics: analytics?.total_deals || 'N/A'
      });

      setData({
        deals: Array.isArray(deals) ? deals : [],
        callbacks: Array.isArray(callbacks) ? callbacks : [],
        targets: Array.isArray(targets) ? targets : [],
        notifications: Array.isArray(notifications) ? notifications : [],
        analytics: analytics || {}
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error('❌ useUnifiedData: Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [userRole, userId, managedTeam, dataTypes]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    console.log('🔄 useUnifiedData: Manual refresh triggered');
    await loadData(true);
  }, [loadData]);

  /**
   * Get filtered data based on user role
   */
  const getFilteredData = useCallback(() => {
    const safeDeals = Array.isArray(data.deals) ? data.deals : [];
    const safeCallbacks = Array.isArray(data.callbacks) ? data.callbacks : [];
    const safeTargets = Array.isArray(data.targets) ? data.targets : [];
    const safeNotifications = Array.isArray(data.notifications) ? data.notifications : [];
    
    if (userRole === 'salesman' && userId) {
      return {
        deals: safeDeals.filter(d => d.SalesAgentID === userId || d.salesAgentId === userId),
        callbacks: safeCallbacks.filter(c => c.SalesAgentID === userId || c.salesAgentId === userId),
        targets: safeTargets.filter(t => t.agentId === userId || t.salesAgentId === userId),
        notifications: safeNotifications.filter(n => n.salesAgentId === userId || n.userId === userId),
        analytics: data.analytics || {}
      };
    } else if (userRole === 'team_leader' && managedTeam) {
      return {
        deals: safeDeals.filter(d => 
          d.salesTeam === managedTeam || 
          d.sales_team === managedTeam ||
          d.SalesAgentID === userId ||
          d.salesAgentId === userId
        ),
        callbacks: safeCallbacks.filter(c => 
          c.salesTeam === managedTeam || 
          c.sales_team === managedTeam ||
          c.SalesAgentID === userId ||
          c.salesAgentId === userId
        ),
        targets: safeTargets.filter(t => 
          t.managerId === userId ||
          t.agentId === userId ||
          t.salesAgentId === userId
        ),
        notifications: safeNotifications,
        analytics: data.analytics || {}
      };
    }
    
    // Manager gets all data
    return {
      deals: safeDeals,
      callbacks: safeCallbacks,
      targets: safeTargets,
      notifications: safeNotifications,
      analytics: data.analytics || {}
    };
  }, [data, userRole, userId, managedTeam]);

  /**
   * Calculate KPIs from current data
   */
  const calculateKPIs = useCallback(() => {
    const filteredData = getFilteredData();
    const { deals, callbacks, targets } = filteredData;

    const totalDeals = deals.length;
    const totalRevenue = deals.reduce((sum, deal) => sum + (deal.amountPaid || 0), 0);
    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

    const totalCallbacks = callbacks.length;
    const pendingCallbacks = callbacks.filter(c => c.status === 'pending').length;
    const completedCallbacks = callbacks.filter(c => c.status === 'completed').length;
    const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;

    const totalTargets = targets.length;
    const totalTargetRevenue = targets.reduce((sum, target) => sum + (target.targetAmount || 0), 0);
    const currentTargetRevenue = targets.reduce((sum, target) => sum + (target.currentAmount || 0), 0);
    const avgTargetProgress = totalTargets > 0 ? (currentTargetRevenue / totalTargetRevenue) * 100 : 0;

    return {
      deals: {
        total: totalDeals,
        revenue: totalRevenue,
        avgSize: avgDealSize
      },
      callbacks: {
        total: totalCallbacks,
        pending: pendingCallbacks,
        completed: completedCallbacks,
        conversionRate
      },
      targets: {
        total: totalTargets,
        targetRevenue: totalTargetRevenue,
        currentRevenue: currentTargetRevenue,
        avgProgress: avgTargetProgress
      }
    };
  }, [getFilteredData]);

  // Auto-load data on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData]);

  return {
    // Data
    data: getFilteredData(),
    rawData: data,
    kpis: calculateKPIs(),
    
    // State
    loading,
    error,
    lastUpdated,
    
    // Actions
    refresh,
    loadData: () => loadData(false),
    
    // Utilities
    clearError: () => setError(null)
  };
}

export default useUnifiedData;
