"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Calendar, Filter, Download, Upload, Plus, Search, Eye, Edit, Trash2, Award, Activity, Briefcase, UserCheck } from "lucide-react"
import { userAnalyticsService, UserPerformanceMetrics, TeamAnalytics, CompanyAnalytics } from "@/lib/firebase-user-analytics-service"
import { dealsService, Deal } from "@/lib/firebase-deals-service"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

interface DashboardProps {
  userRole: string
  userId?: string
  userName?: string
  userTeam?: string
}

export default function ComprehensiveAnalyticsDashboard({ userRole, userId, userName, userTeam }: DashboardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  
  // Analytics data
  const [companyAnalytics, setCompanyAnalytics] = useState<CompanyAnalytics | null>(null)
  const [userMetrics, setUserMetrics] = useState<UserPerformanceMetrics | null>(null)
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics | null>(null)
  const [leaderboard, setLeaderboard] = useState<UserPerformanceMetrics[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  
  // Filters
  const [dateFilter, setDateFilter] = useState("all")
  const [teamFilter, setTeamFilter] = useState("all")
  const [serviceFilter, setServiceFilter] = useState("all")

  useEffect(() => {
    loadAnalyticsData()
  }, [userId, userTeam, userRole])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load company analytics (for managers)
      if (userRole === 'manager') {
        const companyData = await userAnalyticsService.getCompanyAnalytics()
        setCompanyAnalytics(companyData)
        
        const leaderboardData = await userAnalyticsService.getUserLeaderboard(10)
        setLeaderboard(leaderboardData)
        
        const allDeals = await dealsService.getAllDeals()
        setDeals(allDeals)
      }

      // Load user-specific metrics
      if (userId) {
        const userMetricsData = await userAnalyticsService.getUserPerformanceMetrics(userId)
        setUserMetrics(userMetricsData)
        
        if (userRole !== 'manager') {
          const userDeals = await dealsService.getDealsByAgent(userId)
          setDeals(userDeals)
        }
      }

      // Load team analytics
      if (userTeam) {
        const teamData = await userAnalyticsService.getTeamAnalytics(userTeam)
        setTeamAnalytics(teamData)
      }

    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'active': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'refunded': 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStageColor = (stage: string) => {
    const colors = {
      'lead': 'bg-purple-100 text-purple-800',
      'qualified': 'bg-blue-100 text-blue-800',
      'proposal': 'bg-orange-100 text-orange-800',
      'negotiation': 'bg-yellow-100 text-yellow-800',
      'closed-won': 'bg-green-100 text-green-800',
      'closed-lost': 'bg-red-100 text-red-800'
    }
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-destructive">
          Error loading analytics: {error}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">
            {userRole === 'manager' ? 'Company-wide analytics and performance metrics' : 'Your performance metrics and deals'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userRole === 'manager' && companyAnalytics && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(companyAnalytics.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  +12.5% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{companyAnalytics.totalDeals}</div>
                <p className="text-xs text-muted-foreground">
                  +8.2% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{companyAnalytics.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {companyAnalytics.totalUsers} total users
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(companyAnalytics.conversionRate)}</div>
                <p className="text-xs text-muted-foreground">
                  +2.1% from last month
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {userRole !== 'manager' && userMetrics && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(userMetrics.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatPercentage(userMetrics.growthRate)} growth
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Deals</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userMetrics.totalDeals}</div>
                <p className="text-xs text-muted-foreground">
                  {userMetrics.dealsThisMonth} this month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Rank</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">#{userMetrics.performanceRank}</div>
                <p className="text-xs text-muted-foreground">
                  In your team
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(userMetrics.commissionEarned || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  Total earned
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          {userRole === 'manager' && <TabsTrigger value="teams">Teams</TabsTrigger>}
          {userRole === 'manager' && <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>}
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={userRole === 'manager' ? companyAnalytics?.monthlyGrowth : userMetrics?.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Deal Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Deal Status Distribution</CardTitle>
                <CardDescription>Current status of all deals</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(userRole === 'manager' ? companyAnalytics?.dealsByPriority || {} : userMetrics?.dealsByStatus || {}).map(([key, value]) => ({ name: key, value }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(userRole === 'manager' ? companyAnalytics?.dealsByPriority || {} : userMetrics?.dealsByStatus || {}).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Deals</CardTitle>
              <CardDescription>Latest deals and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.slice(0, 10).map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell className="font-medium">{deal.customer_name}</TableCell>
                        <TableCell>{formatCurrency(deal.amount_paid)}</TableCell>
                        <TableCell>{deal.service_tier}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(deal.status || 'pending')}>
                            {deal.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStageColor(deal.stage || 'lead')}>
                            {deal.stage || 'lead'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(deal.signup_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab (Manager only) */}
        {userRole === 'manager' && (
          <TabsContent value="teams" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {companyAnalytics?.topTeams.map((team) => (
                <Card key={team.team}>
                  <CardHeader>
                    <CardTitle>{team.team} Team</CardTitle>
                    <CardDescription>{team.deals} deals • {formatCurrency(team.revenue)} revenue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Performance</span>
                        <span className="text-sm text-muted-foreground">{formatCurrency(team.revenue)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((team.revenue / (companyAnalytics?.totalRevenue || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Leaderboard Tab (Manager only) */}
        {userRole === 'manager' && (
          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Ranking by total revenue generated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboard.map((performer, index) => (
                    <div key={performer.userId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{performer.userName}</p>
                          <p className="text-sm text-muted-foreground">{performer.team}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(performer.totalRevenue)}</p>
                        <p className="text-sm text-muted-foreground">{performer.totalDeals} deals</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Service Performance</CardTitle>
                <CardDescription>Revenue by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userRole === 'manager' 
                    ? Object.entries(companyAnalytics?.serviceAnalytics || {}).map(([key, value]) => ({ 
                        name: key, 
                        revenue: value.revenue 
                      }))
                    : (userMetrics?.topServices || []).map(service => ({
                        name: service.service,
                        revenue: service.revenue
                      }))
                  }>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Deals Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Deals Trend</CardTitle>
                <CardDescription>Number of deals closed per month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userRole === 'manager' ? companyAnalytics?.monthlyGrowth : userMetrics?.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="deals" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
