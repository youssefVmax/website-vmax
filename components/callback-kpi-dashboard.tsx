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
import { unifiedDataService } from '@/lib/unified-data-service'
import { mysqlAnalyticsService, CallbackKPIs, CallbackFilters } from '@/lib/mysql-analytics-service'
import { nextjsAnalyticsService } from '@/lib/nextjs-analytics-service'
import { callbacksService } from '@/lib/mysql-callbacks-service'
import { dealsService } from '@/lib/mysql-deals-service'
import { targetsService } from '@/lib/mysql-targets-service'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface CallbackKPIDashboardProps {
  userRole: 'manager' | 'salesman' | 'team-leader';
  user: { 
    id: string; 
    name: string; 
    username: string;
    team?: string;
    managedTeam?: string;
  };
}

export default function CallbackKPIDashboard({ userRole, user }: CallbackKPIDashboardProps) {
  const { toast } = useToast();
  const [kpis, setKpis] = useState<CallbackKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CallbackFilters>({
    userRole,
    userId: user.id
  });
  const [refreshing, setRefreshing] = useState(false);
  // Manager-only revenue by user count + team comparisons
  const [teamAnalysis, setTeamAnalysis] = useState<{
    perTeam: Array<{
      team: string;
      members: number;
      deals: number;
      revenue: number;
      revenuePerUser: number;
      targetRevenue?: number;
      targetDeals?: number;
      performanceRevenuePct?: number;
      performanceDealsPct?: number;
      trend?: Array<{ x: number; y: number }>;
    }>;
  } | null>(null)
  const [timeframe, setTimeframe] = useState<'30d' | 'month' | 'ytd'>('30d')
  const [sortKey, setSortKey] = useState<'team' | 'members' | 'deals' | 'revenue' | 'revenuePerUser' | 'performanceRevenuePct' | 'performanceDealsPct'>('revenuePerUser')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Get the user's team for filtering
  const getUserTeam = useCallback(() => {
    // For team leaders, use their managed team
    if (userRole === 'team-leader' && user.managedTeam) {
      return user.managedTeam;
    }
    // For other users, use their assigned team
    return user.team || '';
  }, [user, userRole]);

  // Test function to use Next.js analytics instead of PHP
  const testNextJSAnalytics = async () => {
    try {
      console.log('🔄 CallbackKPIDashboard: Testing Next.js analytics...');
      const analytics = await nextjsAnalyticsService.getDashboardStats(userRole, user.id, 'today');
      console.log('✅ CallbackKPIDashboard: Next.js analytics result:', analytics);
      
      // Also test the test-analytics endpoint
      const testResponse = await fetch('/api/test-analytics?userRole=manager&dateRange=today');
      const testData = await testResponse.json();
      console.log('✅ CallbackKPIDashboard: Test analytics result:', testData);
      
      toast({
        title: "Analytics Test Complete",
        description: `Next.js Analytics: ${analytics.total_deals} deals, ${analytics.total_callbacks} callbacks. Check console for details.`,
      });
    } catch (error) {
      console.error('❌ CallbackKPIDashboard: Test failed:', error);
      toast({
        title: "Analytics Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const loadKPIs = useCallback(async () => {
    setLoading(true);
    try {
      const userTeam = getUserTeam();
      console.log('🔄 CallbackKPIDashboard: Loading KPIs with user info:', { 
        id: user.id, 
        name: user.name, 
        role: userRole,
        team: userTeam
      });
      
      // Try unified data service first for better performance
      try {
        const dashboardData = await unifiedDataService.getDashboardData(
          userRole,
          user.id,
          user.name,
          user.managedTeam || user.team
        );
        
        if (dashboardData.success && dashboardData.data.callbacks) {
          console.log('✅ CallbackKPIDashboard: Data loaded from unified service');
          
          const callbacks = dashboardData.data.callbacks;
          const deals = dashboardData.data.deals || [];
          
          // Calculate KPIs from the data
          const totalCallbacks = callbacks.length;
          const pendingCallbacks = callbacks.filter(cb => cb.status === 'pending').length;
          const completedCallbacks = callbacks.filter(cb => cb.status === 'completed').length;
          const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;
          
          // Calculate response times from actual data
          const responseTimes = callbacks
            .filter(cb => cb.firstCallDate && cb.created_at)
            .map(cb => {
              const created = new Date(cb.created_at);
              const firstCall = new Date(cb.firstCallDate);
              return Math.abs(firstCall.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
            })
            .filter(time => !isNaN(time) && time >= 0);
          
          const avgResponseTime = responseTimes.length > 0 
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
            : 0;
          
          // Group callbacks by status
          const statusDistribution = [
            { name: 'Pending', value: pendingCallbacks, color: '#FF8042' },
            { name: 'Contacted', value: callbacks.filter(cb => cb.status === 'contacted').length, color: '#FFBB28' },
            { name: 'Completed', value: completedCallbacks, color: '#00C49F' }
          ];
          
          // Daily trend (last 30 days)
          const dailyTrend = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            const dateStr = date.toISOString().split('T')[0];
            const dayCallbacks = callbacks.filter(cb => 
              cb.created_at && cb.created_at.startsWith(dateStr)
            ).length;
            return {
              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              callbacks: dayCallbacks
            };
          });
          
          // Agent performance
          const agentPerformance = callbacks.reduce((acc, cb) => {
            const agent = cb.salesAgentName || cb.salesAgentId || cb.SalesAgentID || 'Unknown';
            if (!acc[agent]) {
              acc[agent] = { agent, callbacks: 0, completed: 0 };
            }
            acc[agent].callbacks++;
            if (cb.status === 'completed') {
              acc[agent].completed++;
            }
            return acc;
          }, {} as Record<string, { agent: string; callbacks: number; completed: number }>);
          
          const topAgents = Object.values(agentPerformance)
            .map((agentData) => {
              const data = agentData as { agent: string; callbacks: number; completed: number };
              return {
                agent: data.agent,
                callbacks: data.callbacks,
                completed: data.completed,
                conversionRate: data.callbacks > 0 ? (data.completed / data.callbacks) * 100 : 0
              };
            })
            .sort((a, b) => b.conversionRate - a.conversionRate)
            .slice(0, 10);
          
          const calculatedKPIs: any = {
            totalCallbacks,
            pendingCallbacks,
            completedCallbacks,
            conversionRate,
            averageResponseTime: avgResponseTime,
            statusDistribution,
            dailyTrend,
            monthlyTrend: [], // Will be calculated if needed
            topAgents,
            recentCallbacks: callbacks.slice(0, 10),
            responseTimeAnalysis: {
              average: avgResponseTime,
              median: avgResponseTime,
              fastest: 0.5,
              slowest: 8.0
            }
          };
          
          setKpis(calculatedKPIs);
          setError(null);
          return;
        }
      } catch (unifiedError) {
        console.warn('⚠️ CallbackKPIDashboard: Unified service failed, falling back to analytics service:', unifiedError);
      }
      
      // Fallback to original analytics service
      const filters: CallbackFilters = {};
      
      if (userRole === 'manager') {
        filters.userRole = 'manager';
      } else if (userRole === 'team-leader' && userTeam) {
        filters.userRole = 'team-leader';
        filters.team = userTeam;
      } else {
        filters.userRole = userRole as any;
        filters.userId = user.id;
        filters.userName = user.name;
      }
      
      console.log('🔄 CallbackKPIDashboard: Using fallback analytics service with filters:', filters);
      
      const data = await mysqlAnalyticsService.getCallbackKPIs(filters);
      console.log('✅ CallbackKPIDashboard: KPIs loaded from analytics service:', data);
      setKpis(data);
      setError(null);
    } catch (error) {
      console.error('❌ CallbackKPIDashboard: Error loading callback KPIs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load callback data');
    } finally {
      setLoading(false);
    }
  }, [userRole, user.id, user.name, getUserTeam]);

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await loadKPIs();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs, user.team, user.managedTeam]);

  // Auto-refresh every 30 seconds for live data
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time listener for live updates
  useEffect(() => {
    const team = getUserTeam();
    const unsubscribe = callbacksService.onCallbacksChange(
      (callbacks) => {
        // Update state with new callbacks
        console.log('Received real-time callbacks update:', callbacks.length);
      },
      userRole,
      userRole === 'manager' || userRole === 'team-leader' ? undefined : user.id,
      userRole === 'manager' || userRole === 'team-leader' ? undefined : user.name,
      userRole === 'team-leader' ? team : undefined
    );

    return () => unsubscribe();
  }, [userRole, user.id, user.name, getUserTeam]);

  // Load manager analysis: revenue by user count and team performance
  useEffect(() => {
    if (userRole !== 'manager') return
    const load = async () => {
      try {
        const [deals, teamTargets] = await Promise.all([
          dealsService.getDeals(),
          targetsService.getTargets({ managerId: user.id })
        ])

        // Build members per team map from deals
        const membersByTeam = new Map<string, number>()
        // For now, we'll calculate team members from deals data

        // Filter deals by timeframe
        const now = new Date()
        let start: Date
        if (timeframe === '30d') {
          start = new Date(now)
          start.setDate(start.getDate() - 30)
        } else if (timeframe === 'month') {
          start = new Date(now.getFullYear(), now.getMonth(), 1)
        } else {
          start = new Date(now.getFullYear(), 0, 1)
        }

        const inRangeDeals = deals.filter(d => {
          const dateStr = d.signupDate || (d as any).date
          const dt = dateStr ? new Date(dateStr) : (d as any).created_at ? new Date((d as any).created_at) : null
          if (!dt || isNaN(dt.getTime())) return false
          return dt >= start && dt <= now
        })

        // Aggregate deals by team
        const map = new Map<string, { team: string; members: number; deals: number; revenue: number }>()
        // Track distinct active agents per team from deals (fallback when users list misses them)
        const distinctAgentsPerTeam = new Map<string, Set<string>>()
        const getMembersCount = (teamName: string): number => {
          // Exact match
          const exact = membersByTeam.get(teamName)
          if (typeof exact === 'number') return exact
          // Case-insensitive match
          const match = Array.from(membersByTeam.entries()).find(([k]) => k.toLowerCase() === teamName.toLowerCase())
          if (match) return match[1]
          return 0
        }

        inRangeDeals.forEach(d => {
          const team = d.salesTeam || 'Unknown'
          if (!map.has(team)) map.set(team, { team, members: 0, deals: 0, revenue: 0 })
          const rec = map.get(team)!
          rec.deals += 1
          rec.revenue += Number(d.amountPaid || 0)
          const agentId = (d as any).SalesAgentID || (d as any).sales_agent_id || d.salesAgentName
          if (!distinctAgentsPerTeam.has(team)) distinctAgentsPerTeam.set(team, new Set<string>())
          if (agentId) distinctAgentsPerTeam.get(team)!.add(String(agentId))
        })

        // Fill members count using users list, falling back to distinct agents in data
        map.forEach((rec, team) => {
          const fromUsers = getMembersCount(team)
          const fromDeals = distinctAgentsPerTeam.get(team)?.size || 0
          rec.members = Math.max(fromUsers, fromDeals)
        })

        // Targets by team (latest period per team)
        const targetsByTeam = new Map<string, { revenue?: number; deals?: number }>()
        teamTargets.forEach(t => {
          const prev = targetsByTeam.get(t.agentName) || {}
          targetsByTeam.set(t.agentName, { revenue: t.monthlyTarget ?? prev.revenue, deals: t.dealsTarget ?? prev.deals })
        })

        // Build sparkline trends per team
        const buildTrend = (team: string): Array<{ x: number; y: number }> => {
          const points: Array<{ x: number; y: number }> = []
          if (timeframe === 'ytd') {
            // Monthly buckets Jan..current
            for (let m = 0; m <= now.getMonth(); m++) {
              const monthStart = new Date(now.getFullYear(), m, 1)
              const monthEnd = new Date(now.getFullYear(), m + 1, 0)
              const sum = inRangeDeals
                .filter(d => (d.salesTeam || 'Unknown') === team)
                .filter(d => {
                  const dt = new Date(d.signupDate || (d as any).date)
                  return dt >= monthStart && dt <= monthEnd
                })
                .reduce((s, d) => s + Number(d.amountPaid || 0), 0)
              points.push({ x: m + 1, y: sum })
            }
          } else {
            // Weekly buckets, last 4-8 weeks depending on range
            const weeks = timeframe === '30d' ? 4 : 6
            for (let w = weeks - 1; w >= 0; w--) {
              const bucketEnd = new Date(now)
              bucketEnd.setDate(bucketEnd.getDate() - (w * 7))
              const bucketStart = new Date(bucketEnd)
              bucketStart.setDate(bucketEnd.getDate() - 6)
              const sum = inRangeDeals
                .filter(d => (d.salesTeam || 'Unknown') === team)
                .filter(d => {
                  const dt = new Date(d.signupDate || (d as any).date)
                  return dt >= bucketStart && dt <= bucketEnd
                })
                .reduce((s, d) => s + Number(d.amountPaid || 0), 0)
              const idx = weeks - w
              points.push({ x: idx, y: sum })
            }
          }
          return points
        }

        let perTeam = Array.from(map.values()).map(row => {
          const targets = targetsByTeam.get(row.team) || {}
          const revenuePerUser = row.members > 0 ? row.revenue / row.members : row.revenue
          const performanceRevenuePct = targets.revenue && targets.revenue > 0 ? (row.revenue / targets.revenue) * 100 : undefined
          const performanceDealsPct = targets.deals && targets.deals > 0 ? (row.deals / targets.deals) * 100 : undefined
          return {
            team: row.team,
            members: row.members,
            deals: row.deals,
            revenue: Math.round(row.revenue),
            revenuePerUser: Math.round(revenuePerUser),
            targetRevenue: targets.revenue,
            targetDeals: targets.deals,
            performanceRevenuePct: performanceRevenuePct,
            performanceDealsPct: performanceDealsPct,
            trend: buildTrend(row.team),
          }
        })

        // Sorting
        perTeam.sort((a, b) => {
          const dir = sortDir === 'asc' ? 1 : -1
          const av = (a as any)[sortKey] ?? 0
          const bv = (b as any)[sortKey] ?? 0
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
          return String(av).localeCompare(String(bv)) * dir
        })

        setTeamAnalysis({ perTeam })
      } catch (e) {
        console.error('Failed to load team analysis', e)
        setTeamAnalysis(null)
      }
    }
    load()
  }, [userRole, user.id, timeframe, sortKey, sortDir])

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

  if (loading) {
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
          <p className="text-red-600">Error loading callback KPIs: {error}</p>
          <Button onClick={refreshData} className="mt-2">
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
          <Button onClick={refreshData}>
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
              : userRole === 'team-leader'
              ? `Team callback performance • ${kpis?.totalCallbacks || 0} team callbacks`
              : userRole === 'salesman'
              ? `Your callback performance • ${kpis?.totalCallbacks || 0} callbacks`
              : `Support callback metrics • ${kpis?.totalCallbacks || 0} interactions`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={testNextJSAnalytics}
            variant="outline"
            size="sm"
          >
            Test Next.js Analytics
          </Button>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live Data
          </div>
          <Button onClick={refreshData} disabled={refreshing}>
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
                <p className="text-3xl font-bold text-blue-900">{kpis.totalCallbacks}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {kpis.pendingCallbacks} pending
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
                  {kpis?.callbacksByAgent?.length > 0 && kpis?.recentCallbacks?.length > 0 
                    ? kpis.recentCallbacks[0]?.customer_name || 'No customers'
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
                    {kpis.callbacksByAgent.length > 0 
                      ? kpis.callbacksByAgent[0]?.agent || 'No agents'
                      : 'No agents'}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    {kpis.callbacksByAgent.length > 0 
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
                  {kpis.pendingCallbacks + kpis.contactedCallbacks}
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
                    data={kpis.callbacksByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                    label={(entry: any) => `${entry.status}: ${entry.percentage.toFixed(0)}%`}
                  >
                    {kpis.callbacksByStatus.map((_, index) => (
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
                <AreaChart data={kpis.dailyCallbackTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value, name) => [value, name === 'callbacks' ? 'Callbacks' : 'Conversions']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="callbacks" 
                    stackId="1"
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="conversions" 
                    stackId="2"
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    fillOpacity={0.8}
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
                <BarChart data={kpis.callbacksByAgent.slice(0, 8)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="agent" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Callbacks' : 'Conversions']} />
                  <Bar key="callbacks" dataKey="count" fill="#8884d8" name="Callbacks" />
                  <Bar key="conversions" dataKey="conversions" fill="#82ca9d" name="Conversions" />
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
                <LineChart data={kpis.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    }}
                    formatter={(value, name) => [value, name === 'callbacks' ? 'Callbacks' : 'Conversions']}
                  />
                  <Line type="monotone" dataKey="callbacks" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="conversions" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Agents (Manager Only) */}
      {userRole === 'manager' && kpis.topPerformingAgents.length > 0 && (
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
                  {kpis.topPerformingAgents.map((agent, index) => (
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
                {kpis.recentCallbacks.map((callback, index) => (
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
                      {teamAnalysis.perTeam.map((row, idx) => (
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
