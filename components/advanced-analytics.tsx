"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, ZAxis } from 'recharts'
import { TrendingUp, DollarSign, Users, Target, Calendar, Download, Filter, BarChart3, PieChart as PieChartIcon, Activity, Award } from "lucide-react"
import { useMySQLSalesData } from "@/hooks/useMySQLSalesData"
import { Deal } from "@/lib/api-service"
import { addDays, format } from "date-fns"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface AdvancedAnalyticsProps {
  userRole: 'manager' | 'salesman' | 'team-leader'
  user: { name: string; username: string; id: string; managedTeam?: string }
}

export function AdvancedAnalytics({ userRole, user }: AdvancedAnalyticsProps) {
  const { deals, loading, error, refreshData } = useMySQLSalesData({ 
    userRole, 
    userId: user.id, 
    userName: user.name,
    managedTeam: user.managedTeam
  })
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date()
  })
  const [selectedTeam, setSelectedTeam] = useState("all")
  const [selectedService, setSelectedService] = useState("all")
  const [viewType, setViewType] = useState<'revenue' | 'deals' | 'performance'>('revenue')

  // Update last updated timestamp whenever deals stream changes
  useEffect(() => {
    if (deals && deals.length >= 0) {
      setLastUpdated(new Date())
    }
  }, [deals])

  const analytics = useMemo(() => {
    if (!deals || deals.length === 0) return null

    // Filter by date range
    const filteredDeals = deals.filter(deal => {
      const dealDate = new Date(deal.signupDate || deal.createdAt || new Date())
      return dealDate >= dateRange.from && dealDate <= dateRange.to
    })

    // Further filter by team and service
    const finalFilteredDeals = filteredDeals.filter(deal => {
      const teamMatch = selectedTeam === "all" || deal.salesTeam === selectedTeam
      const serviceMatch = selectedService === "all" || deal.serviceTier === selectedService
      return teamMatch && serviceMatch
    })

    // Calculate metrics
    const totalRevenue = finalFilteredDeals.reduce((sum, deal) => sum + (deal.amountPaid || 0), 0)
    const totalDeals = finalFilteredDeals.length
    const averageDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0

    // Time-based KPIs
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const startOfWeek = (() => {
      const d = new Date()
      const day = d.getDay() || 7 // Monday=1..Sunday=7
      d.setHours(0,0,0,0)
      d.setDate(d.getDate() - (day - 1))
      return d
    })()

    let revenueToday = 0, dealsToday = 0
    let revenueThisWeek = 0, dealsThisWeek = 0
    for (const deal of finalFilteredDeals) {
      const dealDate = new Date(deal.signupDate || deal.createdAt || new Date())
      if (format(dealDate, 'yyyy-MM-dd') === todayStr) {
        revenueToday += deal.amountPaid || 0
        dealsToday += 1
      }
      if (dealDate >= startOfWeek && dealDate <= dateRange.to) {
        revenueThisWeek += deal.amountPaid || 0
        dealsThisWeek += 1
      }
    }

    // Daily trend
    const dailyData = finalFilteredDeals.reduce((acc, deal) => {
      const date = format(new Date(deal.signupDate || deal.createdAt || new Date()), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, deals: 0 }
      }
      acc[date].revenue += deal.amountPaid || 0
      acc[date].deals += 1
      return acc
    }, {} as Record<string, { date: string; revenue: number; deals: number }>)

    const dailyTrend = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Revenue by agent
    const revenueByAgent = finalFilteredDeals.reduce((acc, deal) => {
      const agent = deal.salesAgentName || 'Unknown'
      acc[agent] = (acc[agent] || 0) + (deal.amountPaid || 0)
      return acc
    }, {} as Record<string, number>)

    // Revenue by team
    const teamData = finalFilteredDeals.reduce((acc, deal) => {
      const team = deal.salesTeam || 'Unknown'
      if (!acc[team]) {
        acc[team] = { team, revenue: 0, deals: 0 }
      }
      acc[team].revenue += deal.amountPaid || 0
      acc[team].deals += 1
      return acc
    }, {} as Record<string, { team: string; revenue: number; deals: number }>)

    const teamPerformance = Object.values(teamData).sort((a, b) => b.revenue - a.revenue)

    // Revenue by service
    const revenueByService = finalFilteredDeals.reduce((acc, deal) => {
      const service = deal.serviceTier || 'Other'
      acc[service] = (acc[service] || 0) + (deal.amountPaid || 0)
      return acc
    }, {} as Record<string, number>)

    const serviceData = finalFilteredDeals.reduce((acc, deal) => {
      const service = deal.serviceTier || 'Other'
      if (!acc[service]) {
        acc[service] = { service, revenue: 0, deals: 0 }
      }
      acc[service].revenue += deal.amountPaid || 0
      acc[service].deals += 1
      return acc
    }, {} as Record<string, { service: string; revenue: number; deals: number }>)

    const servicePerformance = Object.values(serviceData).sort((a, b) => b.revenue - a.revenue)

    // Top agents
    const topAgents = Object.entries(revenueByAgent)
      .map(([agent, revenue]) => ({
        agent,
        revenue,
        deals: finalFilteredDeals.filter(deal => 
          deal.salesAgentName === agent
        ).length,
        avgDealSize: revenue / Math.max(1, finalFilteredDeals.filter(deal => 
          deal.salesAgentName === agent
        ).length)
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Performance correlation (deal size vs deals count)
    const performanceCorrelation = topAgents.map(agent => ({
      agent: agent.agent,
      deals: agent.deals,
      avgDealSize: agent.avgDealSize,
      totalRevenue: agent.revenue
    }))

    return {
      totalRevenue,
      totalDeals,
      averageDealSize,
      dailyTrend,
      topAgents,
      teamPerformance,
      servicePerformance,
      performanceCorrelation,
      filteredDeals: finalFilteredDeals,
      revenueToday,
      dealsToday,
      revenueThisWeek,
      dealsThisWeek,
    }
  }, [deals, dateRange, selectedTeam, selectedService])

  // Export filtered detailed rows as CSV (Excel-compatible)
  const handleExport = () => {
    if (!analytics) return
    const rows = analytics.filteredDeals
    const headers = [
      'signupDate','customerName','amountPaid','salesAgentName','closingAgentName','salesTeam','serviceTier','dealId'
    ]
    const csv = [headers.join(',')]
    for (const deal of rows) {
      const line = [
        deal.signupDate || deal.createdAt || '',
        deal.customerName?.replaceAll('"', '""') ?? '',
        String(deal.amountPaid ?? ''),
        deal.salesAgentName ?? '',
        deal.closingAgentName ?? '',
        deal.salesTeam ?? '',
        deal.serviceTier ?? '',
        deal.dealId ?? ''
      ].map(v => /[",\n]/.test(String(v)) ? `"${String(v)}"` : String(v)).join(',')
      csv.push(line)
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-destructive">
          Error loading analytics: {error.message}
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

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
              : 'Detailed analysis of your sales performance'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Real-time Data{lastUpdated ? ` • ${format(lastUpdated, 'HH:mm:ss')}` : ''}
          </Badge>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">Date Range</Label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
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
                      {Array.from(new Set(deals.map(d => d.salesTeam).filter(Boolean))).map(team => (
                        <SelectItem key={team} value={team!}>{team}</SelectItem>
                      ))}
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
                      {Array.from(new Set(deals.map(d => d.serviceTier).filter(Boolean))).map(svc => (
                        <SelectItem key={svc} value={svc}>{svc}</SelectItem>
                      ))}
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
                <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold capitalize">
                  {analytics.topAgents[0]?.agent || 'N/A'}
                </p>
                <p className="text-xs text-orange-600">
                  ${analytics.topAgents[0]?.revenue.toLocaleString() || '0'}
                </p>
              </div>
              <Award className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue Today</p>
                <p className="text-2xl font-bold">${analytics.revenueToday.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Live from stream</p>
              </div>
              <Activity className="h-8 w-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deals Today</p>
                <p className="text-2xl font-bold">{analytics.dealsToday}</p>
                <p className="text-xs text-muted-foreground">Live from stream</p>
              </div>
              <Users className="h-8 w-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue This Week</p>
                <p className="text-2xl font-bold">${analytics.revenueThisWeek.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Mon - Today</p>
              </div>
              <BarChart3 className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deals This Week</p>
                <p className="text-2xl font-bold">{analytics.dealsThisWeek}</p>
                <p className="text-xs text-muted-foreground">Mon - Today</p>
              </div>
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
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
            <div className="h-[300px]">
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
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {(userRole === 'manager' ? analytics.teamPerformance : analytics.servicePerformance).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analysis */}
      {userRole === 'manager' && (
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
                  analytics.topAgents.map((item, index) => {
                    const name = item.agent
                    const revenue = item.revenue
                    const deals = item.deals
                    const avgDeal = revenue / deals
                    const maxRevenue = analytics.topAgents[0]?.revenue || 1
                    const performance = (revenue / maxRevenue) * 100

                    return (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 font-medium capitalize text-cyan-700 hover:underline">
                          <Link href={`/agents/${encodeURIComponent(name)}`}>{name}</Link>
                        </td>
                        <td className="py-3 font-semibold">${revenue.toLocaleString()}</td>
                        <td className="py-3">{deals}</td>
                        <td className="py-3">${Math.round(avgDeal).toLocaleString()}</td>
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" 
                                style={{ width: `${performance}%` }}
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
                  analytics.servicePerformance.map((item, index) => {
                    const name = item.service
                    const revenue = item.revenue
                    const deals = item.deals
                    const avgDeal = revenue / deals
                    const maxRevenue = analytics.servicePerformance[0]?.revenue || 1
                    const performance = (revenue / maxRevenue) * 100

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
                                style={{ width: `${performance}%` }}
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

// Simple date range picker component
function DatePickerWithRange({ 
  date, 
  onDateChange 
}: { 
  date: { from: Date; to: Date }; 
  onDateChange: (range: { from: Date; to: Date }) => void 
}) {
  return (
    <div className="flex gap-2">
      <Input
        type="date"
        value={format(date.from, 'yyyy-MM-dd')}
        onChange={(e) => onDateChange({ ...date, from: new Date(e.target.value) })}
      />
      <span className="flex items-center text-muted-foreground">to</span>
      <Input
        type="date"
        value={format(date.to, 'yyyy-MM-dd')}
        onChange={(e) => onDateChange({ ...date, to: new Date(e.target.value) })}
      />
    </div>
  )
}

export default AdvancedAnalytics