/**
 * Custom SWR Hooks for VMAX Sales System
 * 
 * ✅ PHASE 3: SWR-based data fetching hooks
 * Replaces manual fetch calls with optimized SWR caching
 */

import useSWR from 'swr';
import { swrFetcher, getSwrConfigForRole } from '@/lib/swr-config';

interface UseDealsOptions {
  userRole?: string;
  userId?: string;
  managedTeam?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  agent?: string;      // ✅ For agent filtering
  team?: string;       // ✅ For team filtering
  month?: string;      // ✅ For month filtering
}

/**
 * Fetch deals with SWR caching
 */
export function useSWRDeals(options: UseDealsOptions = {}) {
  const params = new URLSearchParams();
  
  if (options.userRole) params.set('userRole', options.userRole);
  if (options.userId) params.set('userId', options.userId);
  if (options.managedTeam) params.set('managedTeam', options.managedTeam);
  if (options.status) params.set('status', options.status);
  if (options.search) params.set('search', options.search);
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  
  const url = `/api/deals?${params.toString()}`;
  const config = getSwrConfigForRole(options.userRole);
  
  const { data, error, isLoading, mutate } = useSWR(url, swrFetcher, config);
  
  return {
    deals: data?.deals || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Fetch callbacks with SWR caching
 */
export function useSWRCallbacks(options: UseDealsOptions = {}) {
  const params = new URLSearchParams();
  
  if (options.userRole) params.set('userRole', options.userRole);
  if (options.userId) params.set('userId', options.userId);
  if (options.managedTeam) params.set('managedTeam', options.managedTeam);
  if (options.status) params.set('status', options.status);
  if (options.search) params.set('search', options.search);
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.agent) params.set('agent', options.agent);        // ✅ Agent filter
  if (options.team) params.set('team', options.team);           // ✅ Team filter
  if (options.month) params.set('month', options.month);        // ✅ Month filter
  
  const url = `/api/callbacks?${params.toString()}`;
  const config = getSwrConfigForRole(options.userRole);
  
  const { data, error, isLoading, mutate } = useSWR(url, swrFetcher, config);
  
  return {
    callbacks: data?.callbacks || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Fetch targets with SWR caching
 */
export function useSWRTargets(options: UseDealsOptions = {}) {
  const params = new URLSearchParams();
  
  if (options.userRole) params.set('userRole', options.userRole);
  if (options.userId) params.set('userId', options.userId);
  
  const url = `/api/targets?${params.toString()}`;
  const config = getSwrConfigForRole(options.userRole);
  
  const { data, error, isLoading, mutate } = useSWR(url, swrFetcher, config);
  
  return {
    targets: data?.targets || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Fetch notifications with SWR caching
 */
export function useSWRNotifications(userId?: string, userRole?: string) {
  const params = new URLSearchParams();
  
  if (userId) params.set('userId', userId);
  if (userRole) params.set('userRole', userRole);
  
  const url = `/api/notifications?${params.toString()}`;
  const config = getSwrConfigForRole(userRole);
  
  const { data, error, isLoading, mutate } = useSWR(
    userId ? url : null, // Don't fetch if no userId
    swrFetcher,
    config
  );
  
  return {
    notifications: data?.notifications || [],
    unreadCount: data?.notifications?.filter((n: any) => !n.isRead).length || 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Fetch users with SWR caching
 */
export function useSWRUsers() {
  const url = '/api/users?limit=1000';
  
  const { data, error, isLoading, mutate } = useSWR(url, swrFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000, // 5 minutes - users don't change often
  });
  
  return {
    users: data?.users || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Fetch dashboard stats with SWR caching
 */
export function useSWRDashboardStats(options: UseDealsOptions = {}) {
  const params = new URLSearchParams();
  
  if (options.userRole) params.set('userRole', options.userRole);
  if (options.userId) params.set('userId', options.userId);
  if (options.managedTeam) params.set('managedTeam', options.managedTeam);
  
  const url = `/api/dashboard-stats?${params.toString()}`;
  const config = getSwrConfigForRole(options.userRole);
  
  const { data, error, isLoading, mutate } = useSWR(url, swrFetcher, config);
  
  return {
    stats: data || {},
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Batch fetch all dashboard data with SWR
 * Uses parallel SWR hooks for optimal performance
 */
export function useSWRDashboardData(options: UseDealsOptions = {}) {
  const deals = useSWRDeals(options);
  const callbacks = useSWRCallbacks(options);
  const targets = useSWRTargets(options);
  const notifications = useSWRNotifications(options.userId, options.userRole);
  
  const isLoading = deals.isLoading || callbacks.isLoading || targets.isLoading || notifications.isLoading;
  const error = deals.error || callbacks.error || targets.error || notifications.error;
  
  return {
    deals: deals.deals,
    callbacks: callbacks.callbacks,
    targets: targets.targets,
    notifications: notifications.notifications,
    isLoading,
    error,
    refresh: () => {
      deals.refresh();
      callbacks.refresh();
      targets.refresh();
      notifications.refresh();
    },
  };
}
