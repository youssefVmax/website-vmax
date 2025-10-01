"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, ZAxis 
} from 'recharts'
import { 
  TrendingUp, DollarSign, Target, Download, BarChart3, Activity, RefreshCw,
  ChevronLeft, ChevronRight, Users, Phone
} from "lucide-react"
import { format as formatDate } from "date-fns"
import { unifiedAnalyticsService } from "@/lib/unified-analytics-service"
import { mysqlAnalyticsService } from "@/lib/mysql-analytics-service"

interface AdvancedAnalyticsProps {
  userRole: 'manager' | 'salesman' | 'team_leader'
  user: { full_name?: string; username?: string; id: string; managedTeam?: string }
}

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

  // Fetch team leader analytics directly from APIs
  const fetchTeamLeaderAnalytics = async () => {
    try {
      if (userRole !== 'team_leader' || !user.managedTeam) {
        console.log('⚠️ Not a team leader or no managed team')
        return null
      }

      console.log('🔄 Fetching team leader analytics from direct APIs')

      // Get analytics data
      const analyticsParams = new URLSearchParams({
        endpoint: 'dashboard-stats',
        user_role: userRole,
        user_id: user.id,
        managed_team: user.managedTeam || '',
        date_range: dateRange === '30' ? 'month' : dateRange === '7' ? 'week' : dateRange === '90' ? 'quarter' : 'all'
      })

      const analyticsUrl = `/api/analytics-api.php?${analyticsParams.toString()}`
      console.log('➡️ Calling analytics API:', analyticsUrl)
      const analyticsResponse = await fetch(analyticsUrl, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      })
      if (!analyticsResponse.ok) {
        throw new Error(`Analytics API failed: ${analyticsResponse.status}`)
      }

      const analyticsData = await analyticsResponse.json()
      if (!analyticsData.success) {
        throw new Error(`Analytics API error: ${analyticsData.error}`)
      }

      // Get charts data
      const chartsParams = new URLSearchParams({
        userRole,
        userId: user.id,
        managedTeam: user.managedTeam || '',
        chartType: 'all',
        dateRange
      })

      const chartsUrl = `/api/charts?${chartsParams.toString()}`
      console.log('➡️ Calling charts API:', chartsUrl)
      const chartsResponse = await fetch(chartsUrl, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      })

      let chartsData = { success: false, data: {} }
      if (chartsResponse.ok) {
        chartsData = await chartsResponse.json()
      } else {
        console.warn('⚠️ Charts API response not OK:', chartsResponse.status)
      }

      return {
        analytics: analyticsData,
        charts: chartsData.success ? chartsData.data : {}
      }
    } catch (error) {
      console.error('❌ Error fetching team leader analytics:', error)
      return null
    }
  }
  
  // Set analytics data from direct API response
  const setAnalyticsFromDirectAPI = (result: any) => {
    const { analytics: analyticsData, charts: chartsData } = result
    
    console.log('🔍 Charts data received:', {
      salesByAgent: chartsData.salesByAgent,
      salesByAgentLength: chartsData.salesByAgent?.length || 0,
      serviceTier: chartsData.serviceTier,
      serviceTierLength: chartsData.serviceTier?.length || 0
    })
    
    // Set dashboard stats
    setDashboardStats({
      total_revenue: analyticsData.total_revenue || 0,
      total_deals: analyticsData.total_deals || 0,
      avg_deal_size: analyticsData.avg_deal_size || 0,
      today_revenue: analyticsData.today_revenue || 0,
      total_callbacks: analyticsData.total_callbacks || 0,
      pending_callbacks: analyticsData.pending_callbacks || 0,
      completed_callbacks: analyticsData.completed_callbacks || 0,
    })
    
    // Set charts data
    setChartsData({
      salesTrend: (chartsData.salesTrend || []).map((d: any) => ({
        // charts API already returns a display-safe date string (e.g., 'Oct 1')
        date: d.date || '',
        revenue: Number(d.revenue || 0),
        deals: Number(d.deals || 0)
      })),
      salesByAgent: chartsData.salesByAgent || [],
      salesByTeam: chartsData.salesByTeam || [],
      serviceTier: chartsData.serviceTier || []
    })

    // Also keep a normalized analyticsData structure for useMemo consumers
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
        dailyTrend: (chartsData.salesTrend || []).map((d: any) => ({
          // Preserve API-provided date label to avoid invalid parsing
          date: d.date || '',
          sales: Number(d.revenue || 0)
        })),
        topAgents: (chartsData.salesByAgent || []).map((a: any) => ({ agent: a.agent, sales: Number(a.revenue || 0), deals: Number(a.deals || 0) })),
        teamDistribution: (chartsData.salesByTeam || []).map((t: any) => ({ team: t.team, sales: Number(t.revenue || 0) })),
        serviceDistribution: (chartsData.serviceTier || []).map((s: any) => ({ service: s.service, sales: Number(s.revenue || 0) }))
      }
    })
    
    // Set team sales comparison for team leader specific view
    if (chartsData.salesByAgent && chartsData.salesByAgent.length > 0) {
      console.log('📊 Setting team sales comparison from:', chartsData.salesByAgent)
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

  // Fetch data using unified analytics service
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Fetching analytics data for team leader', {
        userId: user.id,
        userRole,
        managedTeam: user.managedTeam,
        dateRange
      })

      // Use direct API calls for team leader analytics
      const analyticsResult = await fetchTeamLeaderAnalytics()
      
      if (!analyticsResult) {
        // Fallback to unified service
        const userContext = {
          id: user.id,
          name: user.full_name || user.username || '',
          username: user.username || '',
          role: userRole,
          managedTeam: user.managedTeam
        }
        
        const fallbackResult = await unifiedAnalyticsService.getAnalytics(userContext, dateRange === '30' ? 'month' : dateRange === '7' ? 'week' : dateRange === '90' ? 'quarter' : 'all')
        if (fallbackResult) {
          setAnalyticsFromUnified(fallbackResult)
          return
        }
      }

      if (analyticsResult) {
        console.log('✅ Team leader analytics loaded successfully:', analyticsResult)
        setAnalyticsFromDirectAPI(analyticsResult)

      } else {
        throw new Error('No analytics data received')
      }

    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }
  // Load data on mount and when parameters change
  useEffect(() => {
    fetchAnalyticsData()
  }, [userRole, user.id, user.managedTeam, dateRange])

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
      salesByTeam: charts.salesByTeam?.length || 0
    })

    return {
      totalRevenue: stats.total_revenue || overview.totalRevenue || 0,
      totalDeals: stats.total_deals || overview.totalDeals || 0,
      averageDealSize: stats.avg_deal_size || overview.averageDealSize || 0,
      revenueToday: stats.today_revenue || 0,
      dealsToday: stats.today_deals || 0,
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
      conversionRate: stats.conversion_rate || overview.conversionRate || 0
    }
  }, [dashboardStats, analyticsData, chartsData, dateRange, selectedTeam, selectedService])

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
              ? 'Your personal performance and team analytics'  
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
            <p className="text-muted-foreground">Detailed comparison of your team members' performance</p>
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
                <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold">${analytics.revenueToday.toLocaleString()}</p>
                <p className="text-xs text-orange-600">Live updates</p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
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
                    <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
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