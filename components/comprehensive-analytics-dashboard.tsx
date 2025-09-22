"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Calendar, RefreshCw, Database, CheckCircle, AlertCircle, Activity, Award, Briefcase, UserCheck } from "lucide-react"
import { comprehensiveAnalyticsService, ComprehensiveAnalytics, AnalyticsFilters } from "@/lib/comprehensive-analytics-service"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']
const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f97316'
}

interface DashboardProps {
  userRole: 'manager' | 'team-leader' | 'salesman'
  userId?: string
  userName?: string
  userTeam?: string
  managedTeam?: string
}

export default function ComprehensiveAnalyticsDashboard({ userRole, userId, userName, userTeam, managedTeam }: DashboardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week')
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Comprehensive analytics data
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null)

  // Fetch comprehensive analytics data
  const fetchAnalyticsData = async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const filters: AnalyticsFilters = {
        userRole,
        userId,
        userName,
        managedTeam,
        dateRange,
        ...(userTeam && { team: userTeam })
      }

      console.log('🔄 Fetching comprehensive analytics with filters:', filters)
      
      const analyticsData = await comprehensiveAnalyticsService.fetchAllAnalytics(filters)
      
      setAnalytics(analyticsData)
      setLastUpdated(new Date())
      setError(null)
      
      console.log('✅ Analytics data loaded:', analyticsData)
      
    } catch (err) {
      console.error('❌ Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial load and refresh on filter changes
  useEffect(() => {
    fetchAnalyticsData()
  }, [userRole, userId, managedTeam, dateRange])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalyticsData(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [userRole, userId, managedTeam, dateRange])

  // Manual refresh
  const handleRefresh = () => {
    fetchAnalyticsData(true)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': case 'closed': case 'won': return 'bg-green-100 text-green-800'
      case 'pending': case 'in-progress': case 'negotiation': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': case 'lost': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading comprehensive analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const dashboardStats = analytics?.dashboardStats
  const teamAnalytics = analytics?.teamAnalytics || []
  const agentPerformance = analytics?.agentPerformance || []
  const deals = analytics?.deals || []
  const callbacks = analytics?.callbacks || []
  const healthStatus = analytics?.healthStatus

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and KPIs for {userRole === 'manager' ? 'all teams' : userRole === 'team-leader' ? `${managedTeam} team` : 'your performance'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(value: 'today' | 'week' | 'month') => setDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      {healthStatus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">API: {healthStatus.api_status}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Database: {healthStatus.database_status}</span>
              </div>
              {lastUpdated && (
                <div className="text-xs text-muted-foreground ml-auto">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardStats?.total_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Today: {formatCurrency(dashboardStats?.today_revenue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.total_deals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Today: {dashboardStats?.today_deals || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardStats?.avg_deal_size || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Per deal average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.conversion_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Callbacks to deals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Callback Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Callbacks</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.total_callbacks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Today: {dashboardStats?.today_callbacks || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{dashboardStats?.pending_callbacks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting follow-up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardStats?.completed_callbacks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.unique_agents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Contributing agents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dashboardStats?.monthly_trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke={CHART_COLORS.primary} 
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Deals Count Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Deals Trend</CardTitle>
                <CardDescription>Number of deals over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardStats?.monthly_trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="deals_count" 
                      stroke={CHART_COLORS.secondary} 
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Detailed performance analysis over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={dashboardStats?.monthly_trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1"
                    stroke={CHART_COLORS.primary} 
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="deals_count" 
                    stackId="2"
                    stroke={CHART_COLORS.secondary} 
                    fill={CHART_COLORS.secondary}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Team Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>Revenue by team</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sales_team" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                    <Bar dataKey="total_revenue" fill={CHART_COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Team Analytics Table */}
            <Card>
              <CardHeader>
                <CardTitle>Team Analytics</CardTitle>
                <CardDescription>Detailed team performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Deals</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Avg Deal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamAnalytics.map((team: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{team.sales_team}</TableCell>
                        <TableCell>{team.total_deals}</TableCell>
                        <TableCell>{formatCurrency(team.total_revenue)}</TableCell>
                        <TableCell>{formatCurrency(team.avg_deal_size)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>Top performing agents and their metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Deals</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Avg Deal</TableHead>
                    <TableHead>Callbacks</TableHead>
                    <TableHead>Conversion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentPerformance.map((agent: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{agent.sales_agent}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{agent.sales_team}</Badge>
                      </TableCell>
                      <TableCell>{agent.deals_count}</TableCell>
                      <TableCell>{formatCurrency(agent.revenue)}</TableCell>
                      <TableCell>{formatCurrency(agent.avg_deal_size)}</TableCell>
                      <TableCell>{agent.callbacks_count}</TableCell>
                      <TableCell>
                        <Badge className={agent.conversion_rate > 50 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {formatPercentage(agent.conversion_rate)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
