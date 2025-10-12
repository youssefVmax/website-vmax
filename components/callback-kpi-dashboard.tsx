"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  Phone, PhoneCall, Clock, TrendingUp, Users, CheckCircle, 
  XCircle, AlertCircle, Calendar, Target, Award, Activity,
  RefreshCw, Filter, User
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast"
import { useSWRDashboardData } from '@/hooks/useSWRData'

// Types for callback KPIs
interface CallbackKPIs {
  totalCallbacks: number;
  pendingCallbacks: number;
  completedCallbacks: number;
  conversionRate: number;
  avgResponseTime: number;
  topAgents: Array<{ agent: string; callbacks: number; conversion: number; }>;
  callbacksByAgent?: Array<{ agent: string; count: number; }>;
  recentCallbacks?: Array<any>;
  statusDistribution?: Array<{ name: string; value: number; color?: string; }>;
  dailyTrend?: Array<{ date: string; callbacks: number; }>;
  monthlyTrend?: Array<{ month: string; callbacks: number; }>;
  topPerformingAgents?: Array<{ agent: string; callbacks: number; conversion: number; }>;
  contactedCallbacks?: number;
}

interface CallbackFilters {
  userRole: string;
  userId: string;
  managedTeam?: string;
  dateRange: string;
  status?: string;
  team?: string;
  userName?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface CallbackKPIDashboardProps {
  userRole: 'manager' | 'salesman' | 'team_leader';
  user: { 
    id: string; 
    name: string; 
    team?: string;
    managedTeam?: string;
  };
}

export function CallbackKPIDashboard({ 
  userRole, 
  user 
}: CallbackKPIDashboardProps) {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  // Add missing state variables for manager analysis
  const [timeframe, setTimeframe] = useState('30d');
  const [sortKey, setSortKey] = useState('team');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [teamAnalysis, setTeamAnalysis] = useState<{ perTeam: any[] } | null>(null);

  // ✅ SWR: Use SWR hook for callback analytics
  const { deals = [], callbacks = [], isLoading, error, refresh } = useSWRDashboardData({
    userRole,
    userId: user.id,
    managedTeam: user.managedTeam
  });

  // Calculate KPIs from the data
  const kpis = useMemo(() => {
    if (!callbacks || callbacks.length === 0) {
      return {
        totalCallbacks: 0,
        pendingCallbacks: 0,
        completedCallbacks: 0,
        conversionRate: 0,
        avgResponseTime: 0,
        topAgents: []
      };
    }

    const totalCallbacks = callbacks.length;
    const completedCallbacks = callbacks.filter((cb: any) => cb.status === 'completed').length;
    const pendingCallbacks = callbacks.filter((cb: any) => cb.status === 'pending').length;
    const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;

    // Calculate agent performance
    const agentPerformance = callbacks.reduce((acc: any, callback: any) => {
      const agent = callback.sales_agent || callback.salesAgent || 'Unknown';
      if (!acc[agent]) {
        acc[agent] = { callbacks: 0, completed: 0 };
      }
      acc[agent].callbacks += 1;
      if (callback.status === 'completed') {
        acc[agent].completed += 1;
      }
      return acc;
    }, {});

    const topAgents = Object.entries(agentPerformance)
      .map(([agent, data]: [string, any]) => ({
        agent,
        callbacks: data.callbacks,
        conversion: data.callbacks > 0 ? (data.completed / data.callbacks) * 100 : 0
      }))
      .sort((a, b) => b.conversion - a.conversion)
      .slice(0, 5);

    // Calculate additional data for charts
    const statusDistribution = [
      { name: 'Pending', value: pendingCallbacks, color: '#FF8042' },
      { name: 'Contacted', value: callbacks.filter((cb: any) => cb.status === 'contacted').length, color: '#FFBB28' },
      { name: 'Completed', value: completedCallbacks, color: '#00C49F' }
    ];

    // Daily trend (last 30 days)
    const dailyTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dateStr = date.toISOString().split('T')[0];
      const dayCallbacks = callbacks.filter((cb: any) => {
        const cbDate = new Date(cb.created_at || cb.createdAt).toISOString().split('T')[0];
        return cbDate === dateStr;
      }).length;
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        callbacks: dayCallbacks
      };
    });

    // Monthly trend (last 12 months)
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      const monthStr = date.toISOString().slice(0, 7);
      const monthCallbacks = callbacks.filter((cb: any) => {
        const cbMonth = new Date(cb.created_at || cb.createdAt).toISOString().slice(0, 7);
        return cbMonth === monthStr;
      }).length;
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        callbacks: monthCallbacks
      };
    });

    return {
      totalCallbacks,
      pendingCallbacks,
      completedCallbacks,
      contactedCallbacks: callbacks.filter((cb: any) => cb.status === 'contacted').length,
      conversionRate,
      avgResponseTime: 24, // Placeholder - would need timestamp analysis
      topAgents,
      callbacksByAgent: topAgents.map(agent => ({ agent: agent.agent, count: agent.callbacks })),
      recentCallbacks: callbacks.slice(0, 10),
      statusDistribution,
      dailyTrend,
      monthlyTrend,
      topPerformingAgents: topAgents
    };
  }, [callbacks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // ✅ SWR: Use SWR's refresh function
      await refresh();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }

  // Get the user's team for filtering
  const getUserTeam = useCallback(() => {
    // For team leaders, use their managed team
    if (userRole === 'team_leader' && user.managedTeam) {
      return user.managedTeam;
    }
    // For other users, use their assigned team
    return user.team || '';
  }, [user, userRole]);

  // Data is automatically loaded by the useMySQLSalesData hook

  useEffect(() => {
    if (userRole !== 'manager') return

    // Use deals data from the hook instead of calling services
    const load = async () => {
      try {
        const dealsData = deals || [];

        // Basic team analysis using available data
        const teamMap = new Map<string, { team: string; deals: number; revenue: number }>()

        dealsData.forEach((d: any) => {
          const team = d.salesTeam  || 'Unknown'
          if (!teamMap.has(team)) teamMap.set(team, { team, deals: 0, revenue: 0 })
          const rec = teamMap.get(team)!
          rec.deals += 1
          rec.revenue += Number(d.amountPaid || 0)
        })

        const perTeam = Array.from(teamMap.values()).map(row => ({
          team: row.team,
          members: 1,
          deals: row.deals,
          revenue: Math.round(row.revenue),
          revenuePerUser: Math.round(row.revenue),
          targetRevenue: undefined,
          targetDeals: undefined,
          performanceRevenuePct: undefined,
          performanceDealsPct: undefined,
          trend: [] // Placeholder - would need historical data
        }))

        setTeamAnalysis({ perTeam })
      } catch (e) {
        console.error('Failed to load team analysis', e)
        setTeamAnalysis(null)
      }
    }

    if (deals && deals.length > 0) {
      load()
    }
  }, [userRole, deals])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatResponseTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading callback KPIs: {error?.message || 'Unknown error'}</p>
          <Button onClick={handleRefresh} className="mt-2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600 mb-4">No callback data available</p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Live Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Callback Analytics</h2>
          <p className="text-sm text-muted-foreground">
            {userRole === 'manager' 
              ? `Team callback performance • ${kpis?.totalCallbacks || 0} total callbacks`
              : userRole === 'team_leader'
              ? `Team callback performance • ${kpis?.totalCallbacks || 0} team callbacks`
              : userRole === 'salesman'
              ? `Your callback performance • ${kpis?.totalCallbacks || 0} callbacks`
              : `Support callback metrics • ${kpis?.totalCallbacks || 0} interactions`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live Data
          </div>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Callbacks</p>
                <p className="text-3xl font-bold text-blue-900">{kpis?.totalCallbacks || 0}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {kpis?.pendingCallbacks || 0} pending
                </p>
              </div>
              <div className="p-3 bg-blue-500 rounded-full">
                <Phone className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Top Customer</p>
                <p className="text-2xl font-bold text-green-900 truncate max-w-[150px]">
                  {(kpis?.callbacksByAgent && kpis.callbacksByAgent.length > 0 && kpis?.recentCallbacks && kpis.recentCallbacks.length > 0) 
                    ? kpis.recentCallbacks[0]?.customerName || 'No customers'
                    : 'No customers'}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Most recent callback
                </p>
              </div>
              <div className="p-3 bg-green-500 rounded-full">
                <User className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

{userRole === 'manager' && (
          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Top Salesman</p>
                  <p className="text-2xl font-bold text-purple-900 truncate max-w-[150px]">
                    {(kpis?.callbacksByAgent && kpis.callbacksByAgent.length > 0) 
                      ? kpis.callbacksByAgent[0]?.agent || 'No agents'
                      : 'No agents'}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    {(kpis?.callbacksByAgent && kpis.callbacksByAgent.length > 0) 
                      ? `${kpis.callbacksByAgent[0]?.count || 0} callbacks`
                      : '0 callbacks'}
                  </p>
                </div>
                <div className="p-3 bg-purple-500 rounded-full">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Active Callbacks</p>
                <p className="text-3xl font-bold text-orange-900">
                  {(kpis?.pendingCallbacks || 0) + (kpis?.contactedCallbacks || 0)}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Need attention
                </p>
              </div>
              <div className="p-3 bg-orange-500 rounded-full">
                <Activity className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution and Daily Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Callback Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Callback Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kpis.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={(entry: any) => `${entry.name}: ${(entry.value / kpis.totalCallbacks * 100).toFixed(0)}%`}
                  >
                    {kpis?.statusDistribution?.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} callbacks`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Callback Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Callback Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis?.dailyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value, name) => [value, 'Callbacks']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="callbacks" 
                    stackId="1"
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance and Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Callbacks by Agent */}
        <Card>
          <CardHeader>
            <CardTitle>Callbacks by Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis?.callbacksByAgent?.slice(0, 8) || []} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="agent" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(value, name) => [value, 'Callbacks']} />
                  <Bar key="callbacks" dataKey="count" fill="#8884d8" name="Callbacks" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Callback Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(kpis?.monthlyTrend && kpis.monthlyTrend.length > 0 ? kpis.monthlyTrend : kpis?.dailyTrend?.slice(-12)) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (typeof value === 'string' && value.includes('-')) {
                        const [year, month] = value.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }
                      return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => {
                      if (typeof value === 'string' && value.includes('-')) {
                        const [year, month] = value.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      }
                      return new Date(value).toLocaleDateString();
                    }}
                    formatter={(value, name) => [value, 'Callbacks']}
                  />
                  <Line type="monotone" dataKey="callbacks" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Agents (Manager Only) */}
      {userRole === 'manager' && kpis?.topPerformingAgents && kpis.topPerformingAgents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Agents (Conversion Rate)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Agent</th>
                    <th className="text-left py-2">Total Callbacks</th>
                    <th className="text-left py-2">Conversion Rate</th>
                    <th className="text-left py-2">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis?.topPerformingAgents?.map((agent: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-blue-50/50 transition-colors duration-200">
                      <td className="py-2 font-medium">{agent.agent}</td>
                      <td className="py-2">{agent.totalCallbacks}</td>
                      <td className="py-2 font-semibold">{agent.conversionRate.toFixed(1)}%</td>
                      <td className="py-2">
                        <div className="flex items-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${agent.conversionRate}%` }}
                            ></div>
                          </div>
                          {index === 0 && <Award className="w-4 h-4 text-yellow-500 ml-2" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Callbacks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Callbacks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Phone</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Created</th>
                  <th className="text-left py-2">Agent</th>
                  <th className="text-left py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {kpis?.recentCallbacks?.map((callback: any, index: number) => (
                  <tr key={index} className="border-b hover:bg-blue-50/50 transition-colors duration-200">
                    <td className="py-2 font-medium">{callback.customer_name}</td>
                    <td className="py-2">{callback.phone_number}</td>
                    <td className="py-2">
                      <Badge className={getStatusColor(callback.status)}>
                        {callback.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {new Date(callback.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">{callback.created_by || 'Unassigned'}</td>
                    <td className="py-2 max-w-xs truncate">
                      {callback.notes || 'No notes'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Manager: Revenue by User Count + Team Performance */}
      {userRole === 'manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Revenue by User Count (Per Team)</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant={timeframe === '30d' ? 'default' : 'outline'} size="sm" onClick={() => setTimeframe('30d')}>Last 30d</Button>
                  <Button variant={timeframe === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setTimeframe('month')}>This Month</Button>
                  <Button variant={timeframe === 'ytd' ? 'default' : 'outline'} size="sm" onClick={() => setTimeframe('ytd')}>YTD</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teamAnalysis?.perTeam && teamAnalysis.perTeam.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamAnalysis.perTeam}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="team" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue / User']} />
                      <Bar dataKey="revenuePerUser" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No team/deal data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Deals vs Revenue vs Targets</CardTitle>
            </CardHeader>
            <CardContent>
              {teamAnalysis?.perTeam && teamAnalysis.perTeam.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 cursor-pointer" onClick={() => { setSortKey('team'); setSortDir(sortKey==='team' && sortDir==='asc' ? 'desc' : 'asc') }}>Team</th>
                        <th className="text-left py-2 cursor-pointer" onClick={() => { setSortKey('members'); setSortDir(sortKey==='members' && sortDir==='asc' ? 'desc' : 'asc') }}>Members</th>
                        <th className="text-left py-2 cursor-pointer" onClick={() => { setSortKey('deals'); setSortDir(sortKey==='deals' && sortDir==='asc' ? 'desc' : 'asc') }}>Deals</th>
                        <th className="text-left py-2 cursor-pointer" onClick={() => { setSortKey('revenue'); setSortDir(sortKey==='revenue' && sortDir==='asc' ? 'desc' : 'asc') }}>Revenue</th>
                        <th className="text-left py-2 cursor-pointer" onClick={() => { setSortKey('revenuePerUser'); setSortDir(sortKey==='revenuePerUser' && sortDir==='asc' ? 'desc' : 'asc') }}>Rev/User</th>
                        <th className="text-left py-2">Target (Rev)</th>
                        <th className="text-left py-2">Target (Deals)</th>
                        <th className="text-left py-2 cursor-pointer" onClick={() => { setSortKey('performanceRevenuePct'); setSortDir(sortKey==='performanceRevenuePct' && sortDir==='asc' ? 'desc' : 'asc') }}>Perf (Rev)</th>
                        <th className="text-left py-2 cursor-pointer" onClick={() => { setSortKey('performanceDealsPct'); setSortDir(sortKey==='performanceDealsPct' && sortDir==='asc' ? 'desc' : 'asc') }}>Perf (Deals)</th>
                        <th className="text-left py-2">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamAnalysis.perTeam.map((row: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-blue-50/50 transition-colors duration-200">
                          <td className="py-2 font-medium">{row.team}</td>
                          <td className="py-2">{row.members}</td>
                          <td className="py-2">{row.deals}</td>
                          <td className="py-2">${""}{row.revenue.toLocaleString()}</td>
                          <td className="py-2">${""}{row.revenuePerUser.toLocaleString()}</td>
                          <td className="py-2">{row.targetRevenue ? `$${row.targetRevenue.toLocaleString()}` : '—'}</td>
                          <td className="py-2">{row.targetDeals ?? '—'}</td>
                          <td className="py-2">
                            {row.performanceRevenuePct !== undefined ? (
                              <span className={row.performanceRevenuePct >= 100 ? 'text-green-600 font-semibold' : 'text-orange-600 font-medium'}>
                                {row.performanceRevenuePct.toFixed(0)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-2">
                            {row.performanceDealsPct !== undefined ? (
                              <span className={row.performanceDealsPct >= 100 ? 'text-green-600 font-semibold' : 'text-orange-600 font-medium'}>
                                {row.performanceDealsPct.toFixed(0)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-2">
                            {row.trend && row.trend.length > 0 ? (
                              <div className="w-28 h-10">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={row.trend}>
                                    <Line type="monotone" dataKey="y" stroke="#10b981" strokeWidth={2} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No team/deal data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
