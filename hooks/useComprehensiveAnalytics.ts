import { useState, useEffect, useCallback } from 'react'
import { comprehensiveAnalyticsService, ComprehensiveAnalytics, AnalyticsFilters } from '@/lib/comprehensive-analytics-service'

interface UseComprehensiveAnalyticsOptions {
  userRole: 'manager' | 'team-leader' | 'salesman'
  userId?: string
  userName?: string
  managedTeam?: string
  team?: string
  dateRange?: 'today' | 'week' | 'month'
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseComprehensiveAnalyticsReturn {
  analytics: ComprehensiveAnalytics | null
  loading: boolean
  error: string | null
  refreshing: boolean
  lastUpdated: Date | null
  refresh: () => Promise<void>
  setDateRange: (range: 'today' | 'week' | 'month') => void
  healthStatus: {
    api_status: string
    database_status: string
    last_check: string
  } | null
}

export function useComprehensiveAnalytics(options: UseComprehensiveAnalyticsOptions): UseComprehensiveAnalyticsReturn {
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>(options.dateRange || 'week')

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const filters: AnalyticsFilters = {
        userRole: options.userRole,
        userId: options.userId,
        userName: options.userName,
        managedTeam: options.managedTeam,
        dateRange,
        ...(options.team && { team: options.team })
      }

      console.log('🔄 useComprehensiveAnalytics: Fetching data with filters:', filters)

      const data = await comprehensiveAnalyticsService.fetchAllAnalytics(filters)
      
      setAnalytics(data)
      setLastUpdated(new Date())
      setError(null)

      console.log('✅ useComprehensiveAnalytics: Data fetched successfully')

    } catch (err) {
      console.error('❌ useComprehensiveAnalytics: Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [options.userRole, options.userId, options.userName, options.managedTeam, options.team, dateRange])

  // Initial fetch
  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Auto-refresh setup
  useEffect(() => {
    if (!options.autoRefresh) return

    const interval = setInterval(() => {
      fetchAnalytics(true)
    }, options.refreshInterval || 30000)

    return () => clearInterval(interval)
  }, [fetchAnalytics, options.autoRefresh, options.refreshInterval])

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchAnalytics(true)
  }, [fetchAnalytics])

  return {
    analytics,
    loading,
    error,
    refreshing,
    lastUpdated,
    refresh,
    setDateRange,
    healthStatus: analytics?.healthStatus || null
  }
}

// Specialized hooks for different user roles
export function useManagerAnalytics(options: Omit<UseComprehensiveAnalyticsOptions, 'userRole'>) {
  return useComprehensiveAnalytics({
    ...options,
    userRole: 'manager'
  })
}

export function useTeamLeaderAnalytics(options: Omit<UseComprehensiveAnalyticsOptions, 'userRole'> & { managedTeam: string }) {
  return useComprehensiveAnalytics({
    ...options,
    userRole: 'team-leader'
  })
}

export function useSalesmanAnalytics(options: Omit<UseComprehensiveAnalyticsOptions, 'userRole'> & { userId: string }) {
  return useComprehensiveAnalytics({
    ...options,
    userRole: 'salesman'
  })
}

export default useComprehensiveAnalytics
