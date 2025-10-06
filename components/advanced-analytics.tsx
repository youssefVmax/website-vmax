"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { BarChart3, TrendingUp, RefreshCw, Download, Users, Phone, ChevronLeft, ChevronRight, Target, Activity, DollarSign } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, ZAxis } from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { unifiedAnalyticsService } from '@/lib/unified-analytics-service'
import { formatDate } from 'date-fns'

// Define props interface
interface AdvancedAnalyticsProps {
  userRole: 'manager' | 'salesman' | 'team_leader';
  user: {
    id: string;
    username?: string;
    full_name?: string;
    managedTeam?: string;
  };
}

// Helper function to format dates robustly
const formatChartDate = (dateValue: any): string => {
  if (!dateValue) return new Date().toLocaleDateString();

  try {
    // Handle different date formats
    let date: Date;

    if (typeof dateValue === 'string') {
      // Handle common date formats
      if (dateValue.includes('T') || dateValue.includes('-')) {
        date = new Date(dateValue);
      } else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Handle YYYY-MM-DD format
        date = new Date(dateValue + 'T00:00:00');
      } else {
        // Try parsing as timestamp
        const timestamp = parseInt(dateValue);
        if (!isNaN(timestamp)) {
          // Handle both seconds and milliseconds timestamps
          date = new Date(timestamp > 1e10 ? timestamp : timestamp * 1000);
        } else {
          return new Date().toLocaleDateString();
        }
      }
    } else if (typeof dateValue === 'number') {
      // Handle both seconds and milliseconds timestamps
      date = new Date(dateValue > 1e10 ? dateValue : dateValue * 1000);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      return 'Invalid Date';
    }
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    // Format as month day (e.g., "Jan 15")
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Date formatting error:', error, dateValue);
    return 'Invalid Date';
  }
};

export function AdvancedAnalytics({ userRole, user }: AdvancedAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dashboardStats, setDashboardStats] = useState<any>({})
  const [chartsData, setChartsData] = useState<any>({ salesTrend: [], salesByAgent: [], salesByTeam: [], serviceTier: [] })
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [teamSalesComparison, setTeamSalesComparison] = useState<any[]>([])
  const [callbacksComparison, setCallbacksComparison] = useState<any[]>([])
  
  // Pagination states for team leader tables
  const [salesPage, setSalesPage] = useState(1)
  const [callbacksPage, setCallbacksPage] = useState(1)
  const itemsPerPage = 5
  const [dateRange, setDateRange] = useState('30') // days
  const [selectedTeam, setSelectedTeam] = useState("all")
  const [selectedService, setSelectedService] = useState("all")
  const [viewType, setViewType] = useState<'revenue' | 'deals' | 'performance'>('revenue')

  // Fetch salesman analytics directly from APIs
  const fetchSalesmanAnalytics = async () => {
    try {
      if (userRole !== 'salesman') {
        console.log('⚠️ Not a salesman user')
        return null
      }

      setLoading(true)
      setError(null)
      console.log('🔄 Fetching salesman analytics for user:', user.id)

      // Dynamic base URL for localhost development; same-origin in production to avoid CORS
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : '';

      // Get dashboard stats with salesman filtering
      const dashboardParams = new URLSearchParams({
        userRole,
        userId: user.id,
        dateRange
      })

      const dashboardUrl = `${baseUrl}/api/dashboard-stats?${dashboardParams.toString()}`
      console.log('➡️ Calling dashboard stats API for salesman:', dashboardUrl)
      const dashboardResponse = await fetch(dashboardUrl, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      let dashboardData = { success: false, data: {} }
      if (dashboardResponse.ok) {
        const responseData = await dashboardResponse.json()
        dashboardData = {
          success: responseData.success || true,
          data: responseData.data || responseData // Handle both wrapped and direct response formats
        }
        console.log('✅ Dashboard API response:', dashboardData)
      } else {
        console.warn('⚠️ Dashboard API response not OK:', dashboardResponse.status)
      }

      // Sequential call - wait to avoid resource issues
      await new Promise(resolve => setTimeout(resolve, 500))

      // Get charts data with salesman filtering
      const chartsParams = new URLSearchParams({
        userRole,
        userId: user.id,
        chartType: 'all',
        dateRange
      })

      const chartsUrl = `${baseUrl}/api/charts?${chartsParams.toString()}`
      console.log('➡️ Calling charts API for salesman:', chartsUrl)
      const chartsResponse = await fetch(chartsUrl, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      let chartsData = { success: false, data: {} }
      if (chartsResponse.ok) {
        const responseData = await chartsResponse.json()
        chartsData = {
          success: responseData.success || true,
          data: responseData.data || responseData // Handle both wrapped and direct response formats
        }
        console.log('✅ Charts API response:', chartsData)
      } else {
        console.warn('⚠️ Charts API response not OK:', chartsResponse.status)
      }

      // Sequential call - wait to avoid resource issues
      await new Promise(resolve => setTimeout(resolve, 500))

      // Fetch salesman deals data for detailed analysis
      const dealsParams = new URLSearchParams({
        userRole,
        userId: user.id,
        dateRange,
        limit: '200'
      })

      const dealsUrl = `${baseUrl}/api/deals?${dealsParams.toString()}`
      console.log('➡️ Calling deals API for salesman:', dealsUrl)
      const dealsResponse = await fetch(dealsUrl, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000) // 15 second timeout for larger data
      })

      let dealsData = { success: false, deals: [] }
      if (dealsResponse.ok) {
        const responseData = await dealsResponse.json()
        dealsData = {
          success: responseData.success || true,
          deals: responseData.deals || responseData.data || [] // Handle different response formats
        }
        console.log('✅ Deals API response:', { count: dealsData.deals.length })
      } else {
        console.warn('⚠️ Deals API response not OK:', dealsResponse.status)
      }

      // Process the data similar to team leader logic
      const processedData = {
        dashboardStats: dashboardData.success ? dashboardData.data : {},
        chartsData: chartsData.success ? chartsData.data : {},
        dealsData: dealsData.success ? dealsData.deals : []
      }

      console.log('📊 Salesman analytics data processed:', processedData)
      return processedData

    } catch (error) {
      console.error('❌ Error fetching salesman analytics:', error)
      setError(`Failed to load salesman analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Fetch team leader analytics directly from APIs
  const fetchTeamLeaderAnalytics = async () => {
    try {
      if (userRole !== 'team_leader' || !user.managedTeam) {
        console.log('⚠️ Not a team leader or no managed team')
        return null
      }

      setLoading(true)
      setError(null)
      console.log('🔄 Fetching team leader analytics for:', user.managedTeam)

      // Dynamic base URL for localhost development; same-origin in production
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : '';

      // Get dashboard stats with team leader filtering
      const dashboardParams = new URLSearchParams({
        userRole,
        userId: user.id,
        managedTeam: user.managedTeam || '',
        dateRange
      })

      const dashboardUrl = `${baseUrl}/api/dashboard-stats?${dashboardParams.toString()}`
      console.log('➡️ Calling dashboard stats API for team leader:', dashboardUrl)
      const dashboardResponse = await fetch(dashboardUrl, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      let dashboardData = { success: false, data: {} }
      if (dashboardResponse.ok) {
        const responseData = await dashboardResponse.json()
        dashboardData = {
          success: responseData.success || true,
          data: responseData.data || responseData // Handle both wrapped and direct response formats
        }
        console.log('✅ Team Leader Dashboard API response:', dashboardData)
      } else {
        console.warn('⚠️ Dashboard API response not OK:', dashboardResponse.status)
      }

      // Sequential call - wait to avoid resource issues
      await new Promise(resolve => setTimeout(resolve, 500))

      // Get charts data with team leader filtering
      const chartsParams = new URLSearchParams({
        userRole,
        userId: user.id,
        managedTeam: user.managedTeam || '',
        chartType: 'all',
        dateRange
      })

      const chartsUrl = `${baseUrl}/api/charts?${chartsParams.toString()}`
      console.log('➡️ Calling charts API for team leader:', chartsUrl)
      const chartsResponse = await fetch(chartsUrl, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      let chartsData = { success: false, data: {} }
      if (chartsResponse.ok) {
        const responseData = await chartsResponse.json()
        chartsData = {
          success: responseData.success || true,
          data: responseData.data || responseData // Handle both wrapped and direct response formats
        }
        console.log('✅ Team Leader Charts API response:', chartsData)
      } else {
        console.warn('⚠️ Charts API response not OK:', chartsResponse.status)
      }

      // Sequential call - wait to avoid resource issues
      await new Promise(resolve => setTimeout(resolve, 500))

      // Fetch team member deals data for detailed analysis (sequential, reduced limit)
      const dealsParams = new URLSearchParams({
        userRole,
        userId: user.id,
        managedTeam: user.managedTeam || '',
        dateRange,
        limit: '200' // Reduced from 1000 to prevent resource issues
      })

      const dealsUrl = `${baseUrl}/api/deals?${dealsParams.toString()}`
      console.log('➡️ Calling deals API for team leader:', dealsUrl)
      const dealsResponse = await fetch(dealsUrl, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000) // 15 second timeout for larger data
      })

      let dealsData = { success: false, deals: [] }
      if (dealsResponse.ok) {
        const responseData = await dealsResponse.json()
        dealsData = {
          success: responseData.success || true,
          deals: responseData.deals || responseData.data || [] // Handle different response formats
        }
        console.log('✅ Team Leader Deals API response:', { count: dealsData.deals.length })
      } else {
        console.warn('⚠️ Deals API response not OK:', dealsResponse.status)
      }

      // Fetch team member callbacks data (sequential, reduced limit)
      const callbacksParams = new URLSearchParams({
        userRole,
        userId: user.id,
        managedTeam: user.managedTeam || '',
        dateRange,
        limit: '200' // Reduced from 1000 to prevent resource issues
      })

      const callbacksUrl = `${baseUrl}/api/callbacks?${callbacksParams.toString()}`
      console.log('➡️ Calling callbacks API for team leader:', callbacksUrl)
      const callbacksResponse = await fetch(callbacksUrl, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000) // 15 second timeout for larger data
      })

      let callbacksData = { success: false, callbacks: [] }
      if (callbacksResponse.ok) {
        const responseData = await callbacksResponse.json()
        callbacksData = {
          success: responseData.success || true,
          callbacks: responseData.callbacks || responseData.data || [] // Handle different response formats
        }
        console.log('✅ Team Leader Callbacks API response:', { count: callbacksData.callbacks.length })
      } else {
        console.warn('⚠️ Callbacks API response not OK:', callbacksResponse.status)
      }

      // Process the data similar to salesman logic
      const processedData = {
        dashboardStats: dashboardData.success ? dashboardData.data : {},
        chartsData: chartsData.success ? chartsData.data : {},
        dealsData: dealsData.success ? dealsData.deals : [],
        callbacksData: callbacksData.success ? callbacksData.callbacks : []
      }

      console.log('📊 Team Leader analytics data processed:', processedData)
      return processedData
    } catch (error) {
      console.error('❌ Error fetching team leader analytics:', error)
      return null
    }
  }

  // Fetch manager analytics directly from APIs
  const fetchManagerAnalytics = async () => {
    try {
      if (userRole !== 'manager') {
        console.log('⚠️ Not a manager user')
        return null
      }

      setLoading(true)
      setError(null)
      console.log('🔄 Fetching manager analytics for all teams')

      // Dynamic base URL for localhost development; same-origin in production
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : '';

      // Get dashboard stats with manager filtering (no user/team restrictions)
      const dashboardParams = new URLSearchParams({
        userRole,
        dateRange
      })

      const dashboardUrl = `${baseUrl}/api/dashboard-stats?${dashboardParams.toString()}`
      console.log('➡️ Calling dashboard stats API for manager:', dashboardUrl)
      const dashboardResponse = await fetch(dashboardUrl, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      let dashboardData = { success: false, data: {} }
      if (dashboardResponse.ok) {
        const responseData = await dashboardResponse.json()
        dashboardData = {
          success: responseData.success || true,
          data: responseData.data || responseData // Handle both wrapped and direct response formats
        }
        console.log('✅ Manager Dashboard API response:', dashboardData)
      } else {
        console.warn('⚠️ Dashboard API response not OK:', dashboardResponse.status)
      }

      // Sequential call - wait to avoid resource issues
      await new Promise(resolve => setTimeout(resolve, 500))

      // Get charts data with manager filtering (all teams)
      const chartsParams = new URLSearchParams({
        userRole,
        chartType: 'all',
        dateRange
      })

      const chartsUrl = `${baseUrl}/api/charts?${chartsParams.toString()}`
      console.log('➡️ Calling charts API for manager:', chartsUrl)
      const chartsResponse = await fetch(chartsUrl, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      let chartsData = { success: false, data: {} }
      if (chartsResponse.ok) {
        const responseData = await chartsResponse.json()
        chartsData = {
          success: responseData.success || true,
          data: responseData.data || responseData // Handle both wrapped and direct response formats
        }
        console.log('✅ Manager Charts API response:', chartsData)
      } else {
        console.warn('⚠️ Charts API response not OK:', chartsResponse.status)
      }

      // Get deals data for manager (all deals)
      const dealsParams = new URLSearchParams({
        userRole,
        limit: '1000', // Get more data for analytics
        dateRange
      })

      const dealsUrl = `${baseUrl}/api/deals?${dealsParams.toString()}`
      console.log('➡️ Calling deals API for manager:', dealsUrl)
      const dealsResponse = await fetch(dealsUrl, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000) // 15 second timeout for larger data
      })

      let dealsData = { success: false, deals: [] }
      if (dealsResponse.ok) {
        const responseData = await dealsResponse.json()
        dealsData = {
          success: responseData.success || true,
          deals: responseData.deals || responseData.data || [] // Handle different response formats
        }
        console.log('✅ Manager Deals API response:', { count: dealsData.deals.length })
      } else {
        console.warn('⚠️ Deals API response not OK:', dealsResponse.status)
      }

      // Get callbacks data for manager (all callbacks)
      const callbacksParams = new URLSearchParams({
        userRole,
        limit: '1000',
        dateRange
      })

      const callbacksUrl = `${baseUrl}/api/callbacks?${callbacksParams.toString()}`
      console.log('➡️ Calling callbacks API for manager:', callbacksUrl)
      const callbacksResponse = await fetch(callbacksUrl, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000) // 15 second timeout for larger data
      })

      let callbacksData = { success: false, callbacks: [] }
      if (callbacksResponse.ok) {
        const responseData = await callbacksResponse.json()
        callbacksData = {
          success: responseData.success || true,
          callbacks: responseData.callbacks || responseData.data || [] // Handle different response formats
        }
        console.log('✅ Manager Callbacks API response:', { count: callbacksData.callbacks.length })
      } else {
        console.warn('⚠️ Callbacks API response not OK:', callbacksResponse.status)
      }

      // Process the data similar to other roles
      const processedData = {
        dashboardStats: dashboardData.success ? dashboardData.data : {},
        chartsData: chartsData.success ? chartsData.data : {},
        dealsData: dealsData.success ? dealsData.deals : [],
        callbacksData: callbacksData.success ? callbacksData.callbacks : []
      }

      console.log('📊 Manager analytics data processed:', processedData)
      return processedData
    } catch (error) {
      console.error('❌ Error fetching manager analytics:', error)
      return null
    }
  }
  
  // Set analytics data from direct API response
  const setAnalyticsFromDirectAPI = (result: any) => {
    console.log('🔍 Processing analytics result:', result)
    
    // Safely extract data with fallbacks
    const analyticsData = result?.analytics || {}
    const chartsData = result?.charts || {}
    const dealsData = result?.deals || []
    const callbacksData = result?.callbacks || []
    
    console.log('🔍 Charts data received:', {
      salesByAgent: chartsData.salesByAgent,
      salesByAgentLength: chartsData.salesByAgent?.length || 0,
      serviceTier: chartsData.serviceTier,
      serviceTierLength: chartsData.serviceTier?.length || 0,
      dealsCount: dealsData?.length || 0,
      callbacksCount: callbacksData?.length || 0
    })
    
    // Set dashboard stats with proper null checks
    const safeAnalyticsData = analyticsData || {};
    setDashboardStats({
      total_revenue: safeAnalyticsData.total_revenue || safeAnalyticsData.revenue || 0,
      total_deals: safeAnalyticsData.total_deals || safeAnalyticsData.deals || 0,
      avg_deal_size: safeAnalyticsData.avg_deal_size || safeAnalyticsData.avgDealSize || 0,
      today_revenue: safeAnalyticsData.today_revenue || safeAnalyticsData.todayRevenue || 0,
      total_callbacks: safeAnalyticsData.total_callbacks || safeAnalyticsData.callbacks || 0,
      pending_callbacks: safeAnalyticsData.pending_callbacks || safeAnalyticsData.pendingCallbacks || 0,
      completed_callbacks: safeAnalyticsData.completed_callbacks || safeAnalyticsData.completedCallbacks || 0,
      conversion_rate: safeAnalyticsData.conversion_rate || safeAnalyticsData.conversionRate || 0
    })
    
    setChartsData((prevChartsData: any) => {
      console.log('📊 Setting charts data:', {
        salesTrend: chartsData.salesTrend?.length || 0,
        salesByAgent: chartsData.salesByAgent?.length || 0,
        salesByTeam: chartsData.salesByTeam?.length || 0,
        serviceTier: chartsData.serviceTier?.length || 0,
        salesTrendSample: chartsData.salesTrend?.[0],
        salesByAgentSample: chartsData.salesByAgent?.[0]
      })
      return {
        salesTrend: (chartsData.salesTrend || []).map((d: any) => {
          // Fix date formatting - ensure valid date strings
          let dateString = d.date || '';
          if (typeof dateString === 'string' && dateString.includes('-')) {
            try {
              const date = new Date(dateString);
              if (!isNaN(date.getTime())) {
                dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }
            } catch (e) {
              dateString = 'Invalid Date';
            }
          } else if (dateString === '' || dateString === null || dateString === undefined) {
            dateString = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
          return {
            date: dateString,
            revenue: Number(d.revenue || 0),
            deals: Number(d.deals || 0),
            conversionRate: Number(d.conversion_rate || 0)
          }
        }),
        salesByAgent: chartsData.salesByAgent || [],
        salesByTeam: chartsData.salesByTeam || [],
        serviceTier: chartsData.serviceTier || []
      }
    })

    setAnalyticsData({
      overview: {
        totalDeals: Number(analyticsData.total_deals || 0),
        totalRevenue: Number(analyticsData.total_revenue || 0),
        averageDealSize: Number(analyticsData.avg_deal_size || 0),
        totalCallbacks: Number(analyticsData.total_callbacks || 0),
        pendingCallbacks: Number(analyticsData.pending_callbacks || 0),
        completedCallbacks: Number(analyticsData.completed_callbacks || 0),
        conversionRate: Number(analyticsData.conversion_rate || 0)
      },
      charts: {
        dailyTrend: (chartsData.salesTrend || []).map((d: any) => {
          // Ensure proper date formatting for analytics
          let dateString = d.date || '';
          if (typeof dateString === 'string' && dateString.includes('-')) {
            try {
              const date = new Date(dateString);
              if (!isNaN(date.getTime())) {
                dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }
            } catch (e) {
              dateString = 'Invalid Date';
            }
          }
          return {
            date: dateString,
            sales: Number(d.revenue || 0)
          }
        }),
        topAgents: (chartsData.salesByAgent || []).map((a: any) => ({ agent: a.agent, sales: Number(a.revenue || 0), deals: Number(a.deals || 0) })),
        teamDistribution: (chartsData.salesByTeam || []).map((t: any) => ({ team: t.team, sales: Number(t.revenue || 0) })),
        serviceDistribution: (chartsData.serviceTier || []).map((s: any) => ({ service: s.service, sales: Number(s.revenue || 0) }))
      }
    })
    
    // Process team member data from deals and callbacks for team leader view
    if (userRole === 'team_leader' && dealsData && Array.isArray(dealsData)) {
      // Group deals by agent to create team sales comparison
      const agentStats = new Map()
      
      dealsData.forEach((deal: any) => {
        const agentId = deal.SalesAgentID || deal.sales_agent || 'Unknown'
        const agentName = deal.sales_agent || deal.SalesAgentID || 'Unknown Agent'
        const amount = Number(deal.amount_paid || 0)
        const serviceTier = deal.service_tier || deal.product_type || 'Unknown'
        
        if (!agentStats.has(agentId)) {
          agentStats.set(agentId, {
            agent: agentName,
            revenue: 0,
            deals: 0,
            agent_revenue: 0,
            agent_deals: 0,
            serviceTier: serviceTier
          })
        }
        
        const stats = agentStats.get(agentId)
        stats.revenue += amount
        stats.deals += 1
        stats.agent_revenue += amount
        stats.agent_deals += 1
      })
      
      const teamSalesData = Array.from(agentStats.values())
      console.log('📊 Setting team sales comparison from deals data:', teamSalesData)
      setTeamSalesComparison(teamSalesData)
      
      // Process callbacks data for team comparison
      if (callbacksData && Array.isArray(callbacksData)) {
        const callbackStats = new Map()
        
        callbacksData.forEach((callback: any) => {
          const agentId = callback.SalesAgentID || callback.sales_agent || 'Unknown'
          const agentName = callback.sales_agent || callback.SalesAgentID || 'Unknown Agent'
          
          if (!callbackStats.has(agentId)) {
            callbackStats.set(agentId, {
              agent: agentName,
              count: 0,
              callbacks: 0,
              conversions: 0
            })
          }
          
          const stats = callbackStats.get(agentId)
          stats.count += 1
          stats.callbacks += 1
          if (callback.status === 'completed') {
            stats.conversions += 1
          }
        })
        
        const callbacksComparisonData = Array.from(callbackStats.values())
        console.log('📞 Setting callbacks comparison from callbacks data:', callbacksComparisonData)
        setCallbacksComparison(callbacksComparisonData)
      }
    } else {
      // Fallback to charts data if available
      if (chartsData.salesByAgent && chartsData.salesByAgent.length > 0) {
        console.log('📊 Setting team sales comparison from charts data:', chartsData.salesByAgent)
        setTeamSalesComparison(chartsData.salesByAgent.map((item: any) => ({
          agent: item.agent || 'Unknown Agent',
          revenue: Number(item.revenue || 0),
          deals: Number(item.deals || 0),
          agent_revenue: Number(item.revenue || 0),
          agent_deals: Number(item.deals || 0)
        })))
      } else {
        console.warn('⚠️ No salesByAgent data available for team comparison')
        setTeamSalesComparison([])
      }
    }
    
    // Always process service tier data from deals for team leaders to ensure data is available
    if (userRole === 'team_leader' && dealsData && Array.isArray(dealsData)) {
      console.log('🔄 Processing service tier data from team leader deals...');
      const serviceStats = new Map()
      
      dealsData.forEach((deal: any) => {
        const serviceTier = deal.service_tier || deal.serviceTier || deal.product_type || deal.service_type || 'Unknown'
        const amount = Number(deal.amount_paid || deal.amountPaid || 0)
        
        if (!serviceStats.has(serviceTier)) {
          serviceStats.set(serviceTier, {
            service: serviceTier,
            revenue: 0,
            deals: 0
          })
        }
        
        const stats = serviceStats.get(serviceTier)
        stats.revenue += amount
        stats.deals += 1
      })
      
      const serviceTierData = Array.from(serviceStats.values())
      console.log('📊 Team leader service tier data calculated:', serviceTierData)
      
      // Update chartsData with service tier data
      setChartsData((prev: any) => ({
        ...prev,
        serviceTier: serviceTierData
      }))
    }
    
    setLastUpdated(new Date())
  }
  
  // Set analytics data from unified service response
  const setAnalyticsFromUnified = (analyticsResult: any) => {
    // Set dashboard stats
    setDashboardStats({
      total_revenue: analyticsResult.overview.totalRevenue,
      total_deals: analyticsResult.overview.totalDeals,
      avg_deal_size: analyticsResult.overview.averageDealSize,
      today_revenue: analyticsResult.overview.todayRevenue || 0,
      total_callbacks: analyticsResult.overview.totalCallbacks,
      pending_callbacks: analyticsResult.overview.pendingCallbacks,
      completed_callbacks: analyticsResult.overview.completedCallbacks,
      conversion_rate: analyticsResult.overview.conversionRate
    })

    // Set charts data - use charts API for detailed trend data
    setChartsData({
      salesTrend: analyticsResult.charts.dailyTrend.map((item: any) => ({
        date: item.date,
        revenue: item.sales,
        deals: 0 // Monthly trends don't have daily deal counts
      })),
      salesByAgent: analyticsResult.charts.topAgents.map((item: any) => ({
        agent: item.agent,
        revenue: item.sales,
        deals: item.deals,
        avgDealSize: item.deals > 0 ? item.sales / item.deals : 0,
        totalRevenue: item.sales
      })),
      salesByTeam: analyticsResult.charts.teamDistribution.map((item: any) => ({
        team: item.team,
        revenue: item.sales,
        deals: 0 // Team data doesn't include deal counts from this API
      })),
      serviceTier: analyticsResult.charts.serviceDistribution.map((item: any) => ({
        service: item.service,
        revenue: item.sales,
        deals: 0 // Service data not provided by analytics API
      }))
    })

    console.log('📊 Charts data set:', {
      salesTrend: analyticsResult.charts.dailyTrend.length,
      salesByAgent: analyticsResult.charts.topAgents.length,
      salesByTeam: analyticsResult.charts.teamDistribution.length
    })
    
    setLastUpdated(new Date())
  }

  // Process salesman analytics data from direct API
  const setAnalyticsFromSalesmanAPI = (analyticsResult: any) => {
    console.log('🔄 Processing salesman analytics data:', analyticsResult)
    
    // Extract data from the result
    const dashboardData = analyticsResult.dashboardStats || {}
    const chartsApiData = analyticsResult.chartsData || {}
    const dealsData = analyticsResult.dealsData || []
    
    console.log('📊 Salesman data breakdown:', {
      dashboardKeys: Object.keys(dashboardData),
      chartsKeys: Object.keys(chartsApiData),
      dealsCount: dealsData.length
    })
    
    // Set dashboard stats with proper field mapping
    setDashboardStats({
      total_revenue: dashboardData.total_revenue || dashboardData.revenue || 0,
      total_deals: dashboardData.total_deals || dashboardData.deals || 0,
      avg_deal_size: dashboardData.avg_deal_size || dashboardData.avgDealSize || 0,
      today_revenue: dashboardData.today_revenue || dashboardData.todayRevenue || 0,
      total_callbacks: dashboardData.total_callbacks || dashboardData.callbacks || 0,
      pending_callbacks: dashboardData.pending_callbacks || dashboardData.pendingCallbacks || 0,
      completed_callbacks: dashboardData.completed_callbacks || dashboardData.completedCallbacks || 0,
      conversion_rate: dashboardData.conversion_rate || dashboardData.conversionRate || 0
    })
    
    // Process deals data for service distribution and other calculations
    console.log('📊 Processing salesman deals for charts:', dealsData.length)
    
    // Calculate service distribution from deals
    const serviceStats = new Map()
    const agentStats = new Map()
    const dailyStats = new Map()
    
    dealsData.forEach((deal: any) => {
      const serviceTier = deal.service_tier || deal.serviceTier || deal.product_type || 'Unknown'
      const amount = Number(deal.amount_paid || deal.amountPaid || 0)
      const agent = deal.sales_agent_name || deal.sales_agent || deal.SalesAgentID || 'Me'
      
      // Service tier stats
      if (!serviceStats.has(serviceTier)) {
        serviceStats.set(serviceTier, {
          service: serviceTier,
          revenue: 0,
          deals: 0
        })
      }
      const serviceData = serviceStats.get(serviceTier)
      serviceData.revenue += amount
      serviceData.deals += 1
      
      // Agent stats (for salesman, this will mostly be themselves)
      if (!agentStats.has(agent)) {
        agentStats.set(agent, {
          agent: agent,
          revenue: 0,
          deals: 0
        })
      }
      const agentData = agentStats.get(agent)
      agentData.revenue += amount
      agentData.deals += 1
      
      // Daily trend stats
      const dateStr = deal.created_at ? new Date(deal.created_at).toISOString().split('T')[0] : 
                     deal.signup_date ? new Date(deal.signup_date).toISOString().split('T')[0] : 
                     new Date().toISOString().split('T')[0]
      
      if (!dailyStats.has(dateStr)) {
        dailyStats.set(dateStr, {
          date: dateStr,
          revenue: 0,
          deals: 0
        })
      }
      const dailyData = dailyStats.get(dateStr)
      dailyData.revenue += amount
      dailyData.deals += 1
    })
    
    const serviceTierData = Array.from(serviceStats.values())
    const salesByAgentData = Array.from(agentStats.values())
    const salesTrendData = Array.from(dailyStats.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        ...item,
        date: formatChartDate(item.date)
      }))
    
    console.log('📊 Calculated chart data for salesman:', {
      serviceTier: serviceTierData.length,
      salesByAgent: salesByAgentData.length,
      salesTrend: salesTrendData.length
    })
    
    // Set charts data with calculated distributions
    setChartsData({
      salesTrend: salesTrendData,
      salesByAgent: salesByAgentData,
      salesByTeam: chartsApiData.salesByTeam || [],
      serviceTier: serviceTierData
    })
    
    // Set analytics data for the useMemo hook
    setAnalyticsData({
      overview: {
        totalRevenue: dealsData.reduce((sum: number, deal: any) => sum + Number(deal.amount_paid || deal.amountPaid || 0), 0),
        totalDeals: dealsData.length,
        averageDealSize: dealsData.length > 0 ? dealsData.reduce((sum: number, deal: any) => sum + Number(deal.amount_paid || deal.amountPaid || 0), 0) / dealsData.length : 0,
        totalCallbacks: dashboardData.total_callbacks || dashboardData.callbacks || 0,
        pendingCallbacks: dashboardData.pending_callbacks || dashboardData.pendingCallbacks || 0,
        completedCallbacks: dashboardData.completed_callbacks || dashboardData.completedCallbacks || 0,
        conversionRate: dashboardData.conversion_rate || dashboardData.conversionRate || 0
      },
      charts: {
        dailyTrend: salesTrendData,
        topAgents: salesByAgentData,
        teamDistribution: chartsApiData.salesByTeam || [],
        serviceDistribution: serviceTierData
      }
    })
    
    setLastUpdated(new Date())
  }

  // Process team leader analytics data from direct API
  const setAnalyticsFromTeamLeaderAPI = (analyticsResult: any) => {
    console.log('🔄 Processing team leader analytics data:', analyticsResult)
    
    // Extract data from the result
    const dashboardData = analyticsResult.dashboardStats || {}
    const chartsApiData = analyticsResult.chartsData || {}
    const dealsData = analyticsResult.dealsData || []
    const callbacksData = analyticsResult.callbacksData || []
    
    console.log('📊 Team Leader data breakdown:', {
      dashboardKeys: Object.keys(dashboardData),
      chartsKeys: Object.keys(chartsApiData),
      dealsCount: dealsData.length,
      callbacksCount: callbacksData.length,
      sampleDeal: dealsData[0],
      sampleCallback: callbacksData[0]
    })
    
    // Set dashboard stats with proper field mapping
    setDashboardStats({
      total_revenue: dashboardData.total_revenue || dashboardData.revenue || 0,
      total_deals: dashboardData.total_deals || dashboardData.deals || 0,
      avg_deal_size: dashboardData.avg_deal_size || dashboardData.avgDealSize || 0,
      today_revenue: dashboardData.today_revenue || dashboardData.todayRevenue || 0,
      total_callbacks: dashboardData.total_callbacks || dashboardData.callbacks || 0,
      pending_callbacks: dashboardData.pending_callbacks || dashboardData.pendingCallbacks || 0,
      completed_callbacks: dashboardData.completed_callbacks || dashboardData.completedCallbacks || 0,
      conversion_rate: dashboardData.conversion_rate || dashboardData.conversionRate || 0
    })
    
    // Process deals data for service distribution and other calculations
    console.log('📊 Processing team leader deals for charts:', dealsData.length)
    
    // Calculate service distribution from deals
    const serviceStats = new Map()
    const agentStats = new Map()
    const teamStats = new Map()
    const dailyStats = new Map()
    
    dealsData.forEach((deal: any) => {
      const serviceTier = deal.service_tier || deal.serviceTier || deal.product_type || 'Unknown'
      const amount = Number(deal.amount_paid || deal.amountPaid || 0)
      const agent = deal.sales_agent || deal.created_by || deal.sales_agent_name || 'Unknown Agent'
      const team = deal.sales_team || 'Unknown Team'
      
      // Service tier stats
      if (!serviceStats.has(serviceTier)) {
        serviceStats.set(serviceTier, {
          service: serviceTier,
          revenue: 0,
          deals: 0
        })
      }
      const serviceData = serviceStats.get(serviceTier)
      serviceData.revenue += amount
      serviceData.deals += 1
      
      // Agent stats
      if (!agentStats.has(agent)) {
        agentStats.set(agent, {
          agent: agent,
          revenue: 0,
          deals: 0
        })
      }
      const agentData = agentStats.get(agent)
      agentData.revenue += amount
      agentData.deals += 1
      
      // Team stats
      if (!teamStats.has(team)) {
        teamStats.set(team, {
          team: team,
          revenue: 0,
          deals: 0
        })
      }
      const teamData = teamStats.get(team)
      teamData.revenue += amount
      teamData.deals += 1
      
      // Daily trend stats
      const dateStr = deal.created_at ? new Date(deal.created_at).toISOString().split('T')[0] : 
                     deal.signup_date ? new Date(deal.signup_date).toISOString().split('T')[0] : 
                     new Date().toISOString().split('T')[0]
      
      if (!dailyStats.has(dateStr)) {
        dailyStats.set(dateStr, {
          date: dateStr,
          revenue: 0,
          deals: 0
        })
      }
      const dailyData = dailyStats.get(dateStr)
      dailyData.revenue += amount
      dailyData.deals += 1
    })
    
    const serviceTierData = Array.from(serviceStats.values())
    const salesByAgentData = Array.from(agentStats.values()).sort((a, b) => b.revenue - a.revenue)
    const salesByTeamData = Array.from(teamStats.values()).sort((a, b) => b.revenue - a.revenue)
    const salesTrendData = Array.from(dailyStats.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        ...item,
        date: formatChartDate(item.date)
      }))
    
    console.log('📊 Calculated chart data for team leader:', {
      serviceTier: serviceTierData.length,
      salesByAgent: salesByAgentData.length,
      salesByTeam: salesByTeamData.length,
      salesTrend: salesTrendData.length
    })
    
    // Set charts data with calculated distributions
    setChartsData({
      salesTrend: salesTrendData,
      salesByAgent: salesByAgentData,
      salesByTeam: salesByTeamData,
      serviceTier: serviceTierData
    })
    
    // Set team sales comparison data for team leader specific components
    setTeamSalesComparison(salesByAgentData)
    
    // Process callbacks data for team leader callbacks comparison
    const callbacksStats = new Map()
    callbacksData.forEach((callback: any) => {
      // Prioritize sales_agent field which contains the actual name
      const agent = callback.sales_agent || callback.created_by || callback.sales_agent_name || 'Unknown Agent'
      
      if (!callbacksStats.has(agent)) {
        callbacksStats.set(agent, {
          agent: agent,
          count: 0,
          callbacks: 0,
          conversions: 0
        })
      }
      
      const agentCallbacks = callbacksStats.get(agent)
      agentCallbacks.count += 1
      agentCallbacks.callbacks += 1
      
      // Count conversions (completed callbacks)
      if (callback.status === 'completed' || callback.status === 'converted') {
        agentCallbacks.conversions += 1
      }
    })
    
    const callbacksComparisonData = Array.from(callbacksStats.values()).sort((a, b) => b.callbacks - a.callbacks)
    setCallbacksComparison(callbacksComparisonData)
    
    // Set analytics data for the useMemo hook
    setAnalyticsData({
      overview: {
        totalRevenue: dealsData.reduce((sum: number, deal: any) => sum + Number(deal.amount_paid || deal.amountPaid || 0), 0),
        totalDeals: dealsData.length,
        averageDealSize: dealsData.length > 0 ? dealsData.reduce((sum: number, deal: any) => sum + Number(deal.amount_paid || deal.amountPaid || 0), 0) / dealsData.length : 0,
        totalCallbacks: callbacksData.length,
        pendingCallbacks: callbacksData.filter((cb: any) => cb.status === 'pending').length,
        completedCallbacks: callbacksData.filter((cb: any) => cb.status === 'completed').length,
        conversionRate: callbacksData.length > 0 ? (callbacksData.filter((cb: any) => cb.status === 'completed').length / callbacksData.length) * 100 : 0
      },
      charts: {
        dailyTrend: salesTrendData,
        topAgents: salesByAgentData,
        teamDistribution: salesByTeamData,
        serviceDistribution: serviceTierData
      }
    })
    
    setLastUpdated(new Date())
  }

  // Process manager analytics data from direct API
  const setAnalyticsFromManagerAPI = (analyticsResult: any) => {
    console.log('🔄 Processing manager analytics data:', analyticsResult)
    
    // Extract data from the result
    const dashboardData = analyticsResult.dashboardStats || {}
    const chartsApiData = analyticsResult.chartsData || {}
    const dealsData = analyticsResult.dealsData || []
    const callbacksData = analyticsResult.callbacksData || []
    
    console.log('📊 Manager data breakdown:', {
      dashboardKeys: Object.keys(dashboardData),
      chartsKeys: Object.keys(chartsApiData),
      dealsCount: dealsData.length,
      callbacksCount: callbacksData.length
    })
    
    // Set dashboard stats with proper field mapping
    setDashboardStats({
      total_revenue: dashboardData.total_revenue || dashboardData.revenue || 0,
      total_deals: dashboardData.total_deals || dashboardData.deals || 0,
      avg_deal_size: dashboardData.avg_deal_size || dashboardData.avgDealSize || 0,
      today_revenue: dashboardData.today_revenue || dashboardData.todayRevenue || 0,
      total_callbacks: dashboardData.total_callbacks || dashboardData.callbacks || 0,
      pending_callbacks: dashboardData.pending_callbacks || dashboardData.pendingCallbacks || 0,
      completed_callbacks: dashboardData.completed_callbacks || dashboardData.completedCallbacks || 0,
      conversion_rate: dashboardData.conversion_rate || dashboardData.conversionRate || 0
    })
    
    // Process deals data for service distribution and other calculations
    console.log('📊 Processing manager deals for charts:', dealsData.length)
    
    // Calculate service distribution from all deals
    const serviceStats = new Map()
    const agentStats = new Map()
    const teamStats = new Map()
    const dailyStats = new Map()
    
    dealsData.forEach((deal: any) => {
      const serviceTier = deal.service_tier || deal.serviceTier || deal.product_type || 'Unknown'
      const amount = Number(deal.amount_paid || deal.amountPaid || 0)
      const agent = deal.sales_agent_name || deal.sales_agent || deal.SalesAgentID || 'Unknown Agent'
      const team = deal.sales_team || 'Unknown Team'
      
      // Service tier stats
      if (!serviceStats.has(serviceTier)) {
        serviceStats.set(serviceTier, {
          service: serviceTier,
          revenue: 0,
          deals: 0
        })
      }
      const serviceData = serviceStats.get(serviceTier)
      serviceData.revenue += amount
      serviceData.deals += 1
      
      // Agent stats (system-wide for managers)
      if (!agentStats.has(agent)) {
        agentStats.set(agent, {
          agent: agent,
          revenue: 0,
          deals: 0
        })
      }
      const agentData = agentStats.get(agent)
      agentData.revenue += amount
      agentData.deals += 1
      
      // Team stats (system-wide for managers)
      if (!teamStats.has(team)) {
        teamStats.set(team, {
          team: team,
          revenue: 0,
          deals: 0
        })
      }
      const teamData = teamStats.get(team)
      teamData.revenue += amount
      teamData.deals += 1
      
      // Daily trend stats
      const dateStr = deal.created_at ? new Date(deal.created_at).toISOString().split('T')[0] : 
                     deal.signup_date ? new Date(deal.signup_date).toISOString().split('T')[0] : 
                     new Date().toISOString().split('T')[0]
      
      if (!dailyStats.has(dateStr)) {
        dailyStats.set(dateStr, {
          date: dateStr,
          revenue: 0,
          deals: 0
        })
      }
      const dailyData = dailyStats.get(dateStr)
      dailyData.revenue += amount
      dailyData.deals += 1
    })
    
    const serviceTierData = Array.from(serviceStats.values()).sort((a, b) => b.revenue - a.revenue)
    const salesByAgentData = Array.from(agentStats.values()).sort((a, b) => b.revenue - a.revenue)
    const salesByTeamData = Array.from(teamStats.values()).sort((a, b) => b.revenue - a.revenue)
    const salesTrendData = Array.from(dailyStats.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        ...item,
        date: formatChartDate(item.date)
      }))
    
    console.log('📊 Calculated chart data for manager:', {
      serviceTier: serviceTierData.length,
      salesByAgent: salesByAgentData.length,
      salesByTeam: salesByTeamData.length,
      salesTrend: salesTrendData.length
    })
    
    // Set charts data with calculated distributions
    setChartsData({
      salesTrend: salesTrendData,
      salesByAgent: salesByAgentData,
      salesByTeam: salesByTeamData,
      serviceTier: serviceTierData
    })
    
    // Set analytics data for the useMemo hook
    setAnalyticsData({
      overview: {
        totalRevenue: dealsData.reduce((sum: number, deal: any) => sum + Number(deal.amount_paid || deal.amountPaid || 0), 0),
        totalDeals: dealsData.length,
        averageDealSize: dealsData.length > 0 ? dealsData.reduce((sum: number, deal: any) => sum + Number(deal.amount_paid || deal.amountPaid || 0), 0) / dealsData.length : 0,
        totalCallbacks: callbacksData.length,
        pendingCallbacks: callbacksData.filter((cb: any) => cb.status === 'pending').length,
        completedCallbacks: callbacksData.filter((cb: any) => cb.status === 'completed').length,
        conversionRate: callbacksData.length > 0 ? (callbacksData.filter((cb: any) => cb.status === 'completed').length / callbacksData.length) * 100 : 0
      },
      charts: {
        dailyTrend: salesTrendData,
        topAgents: salesByAgentData,
        teamDistribution: salesByTeamData,
        serviceDistribution: serviceTierData
      }
    })
    
    setLastUpdated(new Date())
  }

  // Fetch data using unified analytics service
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Fetching analytics data for user', {
        userId: user.id,
        userRole,
        managedTeam: user.managedTeam,
        dateRange
      })
      // Use appropriate API calls based on user role
      let analyticsResult = null
      if (userRole === 'salesman') {
        analyticsResult = await fetchSalesmanAnalytics()
      } else if (userRole === 'team_leader') {
        analyticsResult = await fetchTeamLeaderAnalytics()
      } else if (userRole === 'manager') {
        analyticsResult = await fetchManagerAnalytics()
      } else {
        console.log('⚠️ Unknown user role:', userRole)
      }
      
      if (!analyticsResult) {
        // Direct APIs failed, try direct API calls as fallback
        console.log('⚠️ Role-specific APIs failed, trying direct API calls...')
        
        try {
          const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
            ? 'http://localhost:3001' 
            : '';

          // Build parameters based on role
          const params = new URLSearchParams({ dateRange })
          if (userRole === 'salesman') {
            params.set('userRole', 'salesman')
            params.set('userId', user.id)
          } else if (userRole === 'team_leader') {
            params.set('userRole', 'team_leader')
            params.set('userId', user.id)
            if (user.managedTeam) params.set('managedTeam', user.managedTeam)
          } else if (userRole === 'manager') {
            params.set('userRole', 'manager')
          }

          // Fetch dashboard stats
          const dashboardResponse = await fetch(`${baseUrl}/api/dashboard-stats?${params.toString()}`)
          const dashboardData = dashboardResponse.ok ? await dashboardResponse.json() : { success: false }

          // Fetch deals data
          const dealsResponse = await fetch(`${baseUrl}/api/deals?${params.toString()}&limit=1000`)
          const dealsData = dealsResponse.ok ? await dealsResponse.json() : { success: false }

          if (dashboardData.success || dealsData.success) {
            // Process the fallback data
            const fallbackResult = {
              analytics: dashboardData.success ? dashboardData.data : {},
              charts: { salesTrend: [], salesByAgent: [], salesByTeam: [], serviceTier: [] },
              deals: dealsData.success ? dealsData.deals : [],
              callbacks: []
            }

            // Calculate basic analytics from deals if dashboard stats failed
            if (!dashboardData.success && dealsData.success && dealsData.deals) {
              const deals = dealsData.deals
              const totalRevenue = deals.reduce((sum: number, deal: any) => sum + Number(deal.amount_paid || deal.amountPaid || 0), 0)
              const totalDeals = deals.length
              
              fallbackResult.analytics = {
                total_revenue: totalRevenue,
                total_deals: totalDeals,
                avg_deal_size: totalDeals > 0 ? totalRevenue / totalDeals : 0,
                today_revenue: 0,
                today_deals: 0,
                total_callbacks: 0,
                pending_callbacks: 0,
                completed_callbacks: 0,
                conversion_rate: 0
              }
            }

            setAnalyticsFromDirectAPI(fallbackResult)
            return
          }
        } catch (fallbackError) {
          console.error('❌ Fallback API calls also failed:', fallbackError)
        }

        // If all else fails, try unified service
        console.log('⚠️ Trying unified analytics service as last resort...')
        const userContext = {
          id: user.id,
          name: user.full_name || user.username || '',
          username: user.username || '',
          role: userRole,
          managedTeam: user.managedTeam
        }
        
        const unifiedResult = await unifiedAnalyticsService.getAnalytics(userContext, dateRange === '30' ? 'month' : dateRange === '7' ? 'week' : dateRange === '90' ? 'quarter' : 'all')
        if (unifiedResult) {
          setAnalyticsFromUnified(unifiedResult)
          return
        }
        
        // Set empty data instead of throwing error
        console.warn('⚠️ All analytics services failed, setting empty data')
        setDashboardStats({})
        setChartsData({ salesTrend: [], salesByAgent: [], salesByTeam: [], serviceTier: [] })
        setAnalyticsData(null)
        return
      }

      if (analyticsResult) {
        console.log('✅ Analytics loaded successfully for', userRole, ':', analyticsResult)
        try {
          if (userRole === 'salesman') {
            setAnalyticsFromSalesmanAPI(analyticsResult)
          } else if (userRole === 'team_leader') {
            setAnalyticsFromTeamLeaderAPI(analyticsResult)
          } else if (userRole === 'manager') {
            setAnalyticsFromManagerAPI(analyticsResult)
          }
        } catch (processingError) {
          console.error('❌ Error processing analytics data:', processingError)
          setError('Error processing analytics data: ' + (processingError instanceof Error ? processingError.message : 'Unknown error'))
        }
      }

    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }
  // Load data on mount and refresh every 2 minutes
  // Only refetch when user changes, not on every filter change
  useEffect(() => {
    fetchAnalyticsData()
    const interval = setInterval(fetchAnalyticsData, 120000) // 2 minutes
    return () => clearInterval(interval)
  }, [user?.id, userRole]) // Removed frequent changing dependencies
  
  // Separate effect for filter changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user?.id) {
        fetchAnalyticsData()
      }
    }, 1000) // 1 second debounce
    
    return () => clearTimeout(timeoutId)
  }, [dateRange, selectedTeam, selectedService])

  // Refresh function
  const refresh = () => {
    fetchAnalyticsData()
  }

  const analytics = useMemo(() => {
    if (!dashboardStats && !analyticsData && !chartsData) {
      return {
        totalRevenue: 0,
        totalDeals: 0,
        averageDealSize: 0,
        revenueToday: 0,
        dealsToday: 0,
        revenueThisWeek: 0,
        dealsThisWeek: 0,
        dailyTrend: [],
        topAgents: [],
        teamPerformance: [],
        servicePerformance: [],
        performanceCorrelation: [],
        filteredDeals: [],
        totalCallbacks: 0,
        pendingCallbacks: 0,
        completedCallbacks: 0,
        conversionRate: 0
      };
    }

    // Combine data from different sources
    const stats = dashboardStats || {}
    const charts = chartsData || {}
    const overview = analyticsData?.overview || {}

    console.log('🔍 Analytics useMemo - charts data:', {
      salesTrend: charts.salesTrend?.length || 0,
      salesByAgent: charts.salesByAgent?.length || 0,
      serviceTier: charts.serviceTier?.length || 0,
      salesByTeam: charts.salesByTeam?.length || 0,
      salesTrendSample: charts.salesTrend?.slice(0, 2),
      salesByAgentSample: charts.salesByAgent?.slice(0, 2),
      serviceTierSample: charts.serviceTier?.slice(0, 2)
    })
    
    console.log('🎯 Service Performance for', userRole, ':', charts.serviceTier)
    console.log('📊 Dashboard Stats:', stats)
    console.log('📊 Overview Data:', overview)

    return {
      totalRevenue: stats.total_revenue || overview.totalRevenue || 0,
      totalDeals: stats.total_deals || overview.totalDeals || 0,
      averageDealSize: stats.avg_deal_size || overview.averageDealSize || 0,
      revenueToday: stats.today_revenue || stats.todayRevenue || 0,
      dealsToday: stats.today_deals || stats.todayDeals || 0,
      revenueThisWeek: 0, // Can be calculated from charts data if needed
      dealsThisWeek: 0,
      dailyTrend: charts.salesTrend || [],
      topAgents: charts.salesByAgent || [],
      teamPerformance: charts.salesByTeam || [],
      servicePerformance: charts.serviceTier || [],
      performanceCorrelation: (charts.salesByAgent || []).map((item: any) => ({
        deals: item.deals || 0,
        avgDealSize: item.avgDealSize || (item.deals > 0 ? item.revenue / item.deals : 0),
        totalRevenue: item.totalRevenue || item.revenue || 0,
        agent: item.agent // Include agent name for tooltips
      })),
      filteredDeals: [],
      totalCallbacks: stats.total_callbacks || overview.totalCallbacks || 0,
      pendingCallbacks: stats.pending_callbacks || overview.pendingCallbacks || 0,
      completedCallbacks: stats.completed_callbacks || overview.completedCallbacks || 0,
      conversionRate: (stats.conversion_rate || overview.conversionRate || 0) / (stats.conversion_rate > 1 ? 100 : 1) // Handle percentage vs decimal
    }
  }, [dashboardStats, analyticsData, chartsData, dateRange, selectedTeam, selectedService, userRole])

  // Export function
  const handleExport = () => {
    if (!analytics) return
    
    const csvData = [
      ['Metric', 'Value'],
      ['Total Revenue', `$${analytics.totalRevenue.toLocaleString()}`],
      ['Total Deals', analytics.totalDeals.toString()],
      ['Average Deal Size', `$${Math.round(analytics.averageDealSize).toLocaleString()}`],
      ['Today Revenue', `$${analytics.revenueToday.toLocaleString()}`],
      ['Today Deals', analytics.dealsToday.toString()]
    ]
    
    const csv = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics_${formatDate(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        <span className="ml-3 text-muted-foreground">
          Loading analytics data...
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-destructive">
          Error loading analytics: {error || 'Unknown error'}
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No data available</h3>
          <p className="text-muted-foreground">No sales data found for the selected criteria</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Advanced Analytics
          </h2>
          <p className="text-muted-foreground">
            {userRole === 'manager' 
              ? 'Comprehensive analytics across all teams and agents'
              : userRole === 'team_leader'
                ? `Your personal performance and team analytics for ${user.managedTeam || 'your team'}` 
                : 'Detailed analysis of your sales performance'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Real-time Data{lastUpdated ? ` • ${formatDate(lastUpdated, 'HH:mm:ss')}` : ''}
          </Badge>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {userRole === 'manager' && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {userRole === 'manager' && (
              <>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Team</Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      <SelectItem value="ALI ASHRAF">ALI ASHRAF</SelectItem>
                      <SelectItem value="CS TEAM">CS TEAM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Service</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Basic">Basic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label className="text-sm font-medium mb-2 block">View Type</Label>
              <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="deals">Deals</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {userRole === 'team_leader' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">Team Performance Analysis</h3>
            <p className="text-muted-foreground">Detailed comparison of your team members' performance for {user.managedTeam || 'your team'}</p>
          </div>
          
          {/* Team Overview Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Team Revenue Trend
                </CardTitle>
                <CardDescription>Daily revenue performance for {user.managedTeam || 'your team'}</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.dailyTrend && analytics.dailyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No trend data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Agent Performance
                </CardTitle>
                <CardDescription>Revenue distribution by team member</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topAgents && analytics.topAgents.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.topAgents.slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="agent" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No agent performance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Members Sales Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Team Sales Performance
                </CardTitle>
                <CardDescription>Revenue and deals comparison by team member</CardDescription>
              </CardHeader>
              <CardContent>
                {!teamSalesComparison || teamSalesComparison.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No team sales data available</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Debug: Length = {teamSalesComparison?.length || 0}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {teamSalesComparison
                        .slice((salesPage - 1) * itemsPerPage, salesPage * itemsPerPage)
                        .map((row: any, idx: number) => {
                          const agent = row.agent || row.SalesAgentID || 'Unknown'
                          const revenue = row.revenue || row.agent_revenue || 0
                          const deals = row.deals || row.agent_deals || 0
                          const avg = deals > 0 ? revenue / deals : 0
                          const maxRevenue = Math.max(...teamSalesComparison.map(r => r.revenue || r.agent_revenue || 0))
                          const performance = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0
                          
                          return (
                            <div key={idx} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                                    {agent.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-medium capitalize">{agent}</h4>
                                    <p className="text-sm text-muted-foreground">{deals} deals closed</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-green-600">${Number(revenue).toLocaleString()}</p>
                                  <p className="text-sm text-muted-foreground">Avg: ${Math.round(avg).toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Performance</span>
                                  <span className="font-medium">{performance.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${Math.min(performance, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                    
                    {/* Sales Pagination */}
                    {teamSalesComparison.length > itemsPerPage && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Showing {((salesPage - 1) * itemsPerPage) + 1} to {Math.min(salesPage * itemsPerPage, teamSalesComparison.length)} of {teamSalesComparison.length} members
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                            disabled={salesPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm font-medium">
                            {salesPage} of {Math.ceil(teamSalesComparison.length / itemsPerPage)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSalesPage(p => Math.min(Math.ceil(teamSalesComparison.length / itemsPerPage), p + 1))}
                            disabled={salesPage >= Math.ceil(teamSalesComparison.length / itemsPerPage)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Callbacks Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-purple-500" />
                  Callbacks Performance
                </CardTitle>
                <CardDescription>Callback activity and conversion rates by team member</CardDescription>
              </CardHeader>
              <CardContent>
                {callbacksComparison.length === 0 ? (
                  <div className="text-center py-8">
                    <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No callback data available</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {callbacksComparison
                        .slice((callbacksPage - 1) * itemsPerPage, callbacksPage * itemsPerPage)
                        .map((row: any, idx: number) => {
                          const agent = row.agent || 'Unknown'
                          const callbacks = row.count || row.callbacks || 0
                          const conversions = row.conversions || 0
                          const conversionRate = callbacks > 0 ? (conversions / callbacks) * 100 : 0
                          
                          return (
                            <div key={idx} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                                    {agent.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-medium capitalize">{agent}</h4>
                                    <p className="text-sm text-muted-foreground">{callbacks} total callbacks</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-purple-600">{conversions}</p>
                                  <p className="text-sm text-muted-foreground">conversions</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Conversion Rate</span>
                                  <span className="font-medium">{conversionRate.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${Math.min(conversionRate, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                    
                    {/* Callbacks Pagination */}
                    {callbacksComparison.length > itemsPerPage && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Showing {((callbacksPage - 1) * itemsPerPage) + 1} to {Math.min(callbacksPage * itemsPerPage, callbacksComparison.length)} of {callbacksComparison.length} members
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCallbacksPage(p => Math.max(1, p - 1))}
                            disabled={callbacksPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm font-medium">
                            {callbacksPage} of {Math.ceil(callbacksComparison.length / itemsPerPage)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCallbacksPage(p => Math.min(Math.ceil(callbacksComparison.length / itemsPerPage), p + 1))}
                            disabled={callbacksPage >= Math.ceil(callbacksComparison.length / itemsPerPage)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Service Tier Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  Service Tier Distribution
                </CardTitle>
                <CardDescription>Revenue breakdown by service type for {user.managedTeam || 'your team'}</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  console.log('🎯 Service Tier Distribution - analytics.servicePerformance:', analytics.servicePerformance);
                  console.log('🎯 Service Tier Distribution - chartsData.serviceTier:', chartsData?.serviceTier);
                  return null;
                })()}
                {chartsData?.serviceTier && chartsData.serviceTier.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartsData.serviceTier}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ service, revenue }) => `${service}: $${Number(revenue).toLocaleString()}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {chartsData.serviceTier.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No service tier data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Correlation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-500" />
                  Deal Size vs Volume
                </CardTitle>
                <CardDescription>Agent performance correlation for {user.managedTeam || 'your team'}</CardDescription>
              </CardHeader>
              <CardContent>
                {chartsData?.salesByAgent && chartsData.salesByAgent.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={chartsData.salesByAgent.map((item: any) => ({
                      deals: item.deals || 0,
                      avgDealSize: item.deals > 0 ? (item.revenue || 0) / item.deals : 0,
                      totalRevenue: item.revenue || 0,
                      agent: item.agent || 'Unknown'
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="deals" name="Deals" />
                      <YAxis dataKey="avgDealSize" name="Avg Deal Size" />
                      <ZAxis dataKey="totalRevenue" range={[50, 400]} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'Avg Deal Size') return [`$${Number(value).toLocaleString()}`, name]
                          return [value, name]
                        }}
                        labelFormatter={(label, payload) => {
                          const data = payload?.[0]?.payload
                          return data?.agent ? `Agent: ${data.agent}` : 'Agent Performance'
                        }}
                      />
                      <Scatter name="Performance" dataKey="avgDealSize" fill="#f59e0b" />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No correlation data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${analytics.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-green-600">Selected period</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Deals</p>
                <p className="text-2xl font-bold">{analytics.totalDeals}</p>
                <p className="text-xs text-blue-600">Closed deals</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Deal Size</p>
                <p className="text-2xl font-bold">${Math.round(analytics.averageDealSize).toLocaleString()}</p>
                <p className="text-xs text-purple-600">Per deal</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{userRole === 'salesman' ? 'My' : 'Team'} Conversion Rate</p>
                <p className="text-2xl font-bold">{analytics.conversionRate > 1 ? analytics.conversionRate.toFixed(1) : (analytics.conversionRate * 100).toFixed(1)}%</p>
                <p className="text-xs text-purple-600">Callback conversions</p>
              </div>
              <Phone className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section for All Roles */}
      {userRole !== 'team_leader' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
              <CardDescription>Revenue performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.dailyTrend && analytics.dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No trend data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>Highest revenue generators</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topAgents && analytics.topAgents.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.topAgents.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="agent" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No performance data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Original Charts for backward compatibility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              {viewType === 'revenue' ? 'Revenue Trend' : 
               viewType === 'deals' ? 'Deals Trend' : 'Performance Trend'}
            </CardTitle>
            <CardDescription>
              Daily {viewType} over the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {viewType === 'performance' ? (
                  <AreaChart data={analytics.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="deals" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  </AreaChart>
                ) : (
                  <LineChart data={analytics.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [
                      viewType === 'revenue' ? `$${value}` : value,
                      viewType === 'revenue' ? 'Revenue' : 'Deals'
                    ]} />
                    <Line 
                      type="monotone" 
                      dataKey={viewType === 'revenue' ? 'revenue' : 'deals'} 
                      stroke="#8884d8" 
                      strokeWidth={2} 
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              {userRole === 'manager' ? 'Team Performance' : 'Service Distribution'}
            </CardTitle>
            <CardDescription>
              {userRole === 'manager' 
                ? 'Revenue distribution across teams'
                : 'Your sales by service type'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const pieData = userRole === 'manager' ? analytics.teamPerformance : analytics.servicePerformance;
              console.log('🔍 Pie Chart Data:', {
                userRole,
                pieDataLength: pieData?.length || 0,
                pieData: pieData
              });
              return null;
            })()}
            <div className="h-[300px]">
              {(userRole === 'manager' ? analytics.teamPerformance : analytics.servicePerformance).length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No service data available</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Debug: Length = {(userRole === 'manager' ? analytics.teamPerformance : analytics.servicePerformance).length}
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userRole === 'manager' ? analytics.teamPerformance : analytics.servicePerformance}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                    nameKey={userRole === 'manager' ? 'team' : 'service'}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(2)}%`}
                  >
                    {(userRole === 'manager' ? analytics.teamPerformance : analytics.servicePerformance).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analysis */}
      {userRole === 'manager' && analytics.topAgents.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Agents</CardTitle>
              <CardDescription>Ranked by total revenue in selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.topAgents.slice(0, 8)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="agent" type="category" width={100} />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          {/* Performance Correlation */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Correlation</CardTitle>
              <CardDescription>Relationship between deal count and average deal size</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="deals" name="Deals" />
                    <YAxis type="number" dataKey="avgDealSize" name="Avg Deal Size" />
                    <ZAxis type="number" dataKey="totalRevenue" range={[50, 400]} />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'deals') return [value, 'Number of Deals']
                      if (name === 'avgDealSize') return [`$${Math.round(Number(value))}`, 'Avg Deal Size']
                      if (name === 'totalRevenue') return [`$${value}`, 'Total Revenue']
                      return [value, name]
                    }} />
                    <Scatter name="Agents" data={analytics.performanceCorrelation} fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {userRole === 'manager' ? 'Agent Performance Details' : 'Service Performance Details'}
          </CardTitle>
          <CardDescription>
            Detailed breakdown of {viewType} performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">
                    {userRole === 'manager' ? 'Agent' : 'Service'}
                  </th>
                  <th className="text-left py-2">Revenue</th>
                  <th className="text-left py-2">Deals</th>
                  <th className="text-left py-2">Avg Deal Size</th>
                  <th className="text-left py-2">Performance</th>
                </tr>
              </thead>
              <tbody>
                {userRole === 'manager' ? (
                  analytics.topAgents.map((item: any, index: number) => {
                    const name = item.agent || item.SalesAgentID || 'Unknown'
                    const revenue = item.revenue || item.agent_revenue || 0
                    const deals = item.deals || item.agent_deals || 0
                    const avgDeal = deals > 0 ? revenue / deals : 0
                    const maxRevenue = analytics.topAgents[0]?.revenue || analytics.topAgents[0]?.agent_revenue || 1
                    const performance = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0

                    return (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 font-medium capitalize text-cyan-700">
                          {name}
                        </td>
                        <td className="py-3 font-semibold">${revenue.toLocaleString()}</td>
                        <td className="py-3">{deals}</td>
                        <td className="py-3">${Math.round(avgDeal).toLocaleString()}</td>
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(performance, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {performance.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  analytics.servicePerformance.map((item: any, index: number) => {
                    const name = item.service || 'Unknown'
                    const revenue = item.revenue || 0
                    const deals = item.deals || 0
                    const avgDeal = deals > 0 ? revenue / deals : 0
                    const maxRevenue = analytics.servicePerformance[0]?.revenue || 1
                    const performance = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0

                    return (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 font-medium capitalize">{name}</td>
                        <td className="py-3 font-semibold">${revenue.toLocaleString()}</td>
                        <td className="py-3">{deals}</td>
                        <td className="py-3">${Math.round(avgDeal).toLocaleString()}</td>
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(performance, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {performance.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdvancedAnalytics
