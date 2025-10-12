import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  RefreshCw, TrendingUp, DollarSign, Target, Users, Calendar, BarChart3, 
  UserCheck, Award, Eye, Phone, CheckCircle, Clock, Star, Trophy, 
  ArrowUpRight, ArrowDownRight, Activity, Zap, TrendingDown
} from "lucide-react"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { useSWRDashboardData } from '@/hooks/useSWRData'

// Professional color palette (only professional style)
const COLORS = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0891b2',
  chart: ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#9333ea', '#ea580c']
};

// Professional styling only
const PROFESSIONAL_STYLE = {
  cardBg: 'bg-slate-50',
  cardHover: 'hover:bg-slate-100',
  border: 'border-slate-200',
  accent: 'bg-blue-50'
};

interface User {
  id: string;
  name: string;
  username: string;
  role: 'manager' | 'salesman' | 'team_leader';
  managedTeam?: string;
}

interface ProfessionalDashboardProps {
  userRole: 'manager' | 'salesman' | 'team_leader';
  user: User;
}

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, icon, color, subtitle }) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <div className={`text-${color}-600`}>
            {icon}
          </div>
        </div>
      </div>
      {change !== undefined && (
        <div className="mt-4 flex items-center">
          {change >= 0 ? (
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          )}
          <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(change)}%
          </span>
          <span className="text-sm text-gray-500 ml-2">vs last month</span>
        </div>
      )}
    </CardContent>
  </Card>
);

function ProfessionalAnalyticsDashboard({ userRole, user }: ProfessionalDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  // ✅ SWR: Use SWR hook for data fetching
  const { 
    deals = [], 
    callbacks = [], 
    targets = [], 
    notifications = [], 
    isLoading, 
    error: swrError,
    refresh 
  } = useSWRDashboardData({
    userRole,
    userId: user?.id,
    managedTeam: user?.managedTeam
  });

  const [error, setError] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState<'professional'>('professional');

  // ✅ SWR: Data fetching handled by SWR hook above
  // All data automatically fetched and cached by SWR

  // Calculate comprehensive KPIs based on role
  const dashboardKPIs = useMemo(() => {
    const totalDeals = deals?.length || 0;
    const totalRevenue = deals?.reduce((sum: number, deal: any) => sum + (parseFloat(deal.amount_paid) || 0), 0) || 0;
    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;
    const totalCallbacks = callbacks?.length || 0;
    const completedCallbacks = callbacks?.filter((cb: any) => cb.status === 'completed')?.length || 0;
    const pendingCallbacks = callbacks?.filter((cb: any) => cb.status === 'pending')?.length || 0;
    const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;

    // Today's metrics
    const today = new Date().toISOString().split('T')[0];
    const todayDeals = deals?.filter((deal: any) => {
      const dealDate = new Date(deal.signup_date || deal.created_at).toISOString().split('T')[0];
      return dealDate === today;
    })?.length || 0;

    const todayRevenue = deals?.filter((deal: any) => {
      const dealDate = new Date(deal.signup_date || deal.created_at).toISOString().split('T')[0];
      return dealDate === today;
    })?.reduce((sum: number, deal: any) => sum + (parseFloat(deal.amount_paid) || 0), 0) || 0;

    // This month's metrics
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyDeals = deals?.filter((deal: any) => {
      const dealMonth = new Date(deal.signup_date || deal.created_at).toISOString().slice(0, 7);
      return dealMonth === thisMonth;
    })?.length || 0;

    const monthlyRevenue = deals?.filter((deal: any) => {
      const dealMonth = new Date(deal.signup_date || deal.created_at).toISOString().slice(0, 7);
      return dealMonth === thisMonth;
    })?.reduce((sum: number, deal: any) => sum + (parseFloat(deal.amount_paid) || 0), 0) || 0;

    // Top performing agents (for managers and team leaders) - now with targets integration
    const agentPerformance = deals?.reduce((acc: any, deal: any) => {
      const agent = deal.sales_agent || deal.salesAgent || 'Unknown';
      if (!acc[agent]) {
        acc[agent] = { deals: 0, revenue: 0 };
      }
      acc[agent].deals += 1;
      acc[agent].revenue += parseFloat(deal.amount_paid) || 0;
      return acc;
    }, {}) || {};

    // Include team leaders who have targets but might not have direct deals
    const currentMonthYear = `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`;
    if (targets && targets.length > 0) {
      targets.forEach((target: any) => {
        if (target.period === currentMonthYear) {
          const agentName = target.agentName || target.salesAgentName || 'Unknown';
          if (!agentPerformance[agentName]) {
            agentPerformance[agentName] = { deals: 0, revenue: 0 };
          }
          // Keep existing deal data if it exists
        }
      });
    }

    // Add targets data to agent performance
    const agentsWithTargets = Object.keys(agentPerformance).map(agentName => {
      const performance = agentPerformance[agentName];
      
      // Find matching target for this agent (current month)
      const currentMonthYear = `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`;
      const agentTarget = targets?.find((target: any) => {
        const targetAgentName = target.agentName || target.salesAgentName || '';
        const targetPeriod = target.period || '';
        return targetAgentName.toLowerCase() === agentName.toLowerCase() && 
               targetPeriod === currentMonthYear;
      });

      const monthlyTarget = agentTarget ? (agentTarget.monthlyTarget || agentTarget.targetAmount || 0) : 0;
      const dealsTarget = agentTarget ? (agentTarget.dealsTarget || agentTarget.targetDeals || 0) : 0;
      
      // Calculate progress
      const revenueProgress = monthlyTarget > 0 ? (performance.revenue / monthlyTarget) * 100 : 0;
      const dealsProgress = dealsTarget > 0 ? (performance.deals / dealsTarget) * 100 : 0;

      return {
        agent: agentName,
        deals: performance.deals,
        revenue: performance.revenue,
        monthlyTarget,
        dealsTarget,
        revenueProgress,
        dealsProgress,
        hasTarget: !!agentTarget
      };
    });

    const topAgents = agentsWithTargets
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Team performance (for managers)
    const teamPerformance = deals?.reduce((acc: any, deal: any) => {
      const team = deal.sales_team || deal.team || 'Unknown';
      if (!acc[team]) {
        acc[team] = { deals: 0, revenue: 0, agents: {} };
      }
      acc[team].deals += 1;
      acc[team].revenue += parseFloat(deal.amount_paid) || 0;
      
      // Track agents per team
      const agent = deal.sales_agent || deal.salesAgent || 'Unknown';
      if (!acc[team].agents[agent]) {
        acc[team].agents[agent] = { deals: 0, revenue: 0 };
      }
      acc[team].agents[agent].deals += 1;
      acc[team].agents[agent].revenue += parseFloat(deal.amount_paid) || 0;
      
      return acc;
    }, {}) || {};

    const topTeams = Object.entries(teamPerformance)
      .map(([team, data]: [string, any]) => ({ team, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate top agent for each team
    const teamTopAgents = Object.entries(teamPerformance)
      .map(([team, data]: [string, any]) => {
        const agents = Object.entries(data.agents)
          .map(([agent, stats]: [string, any]) => ({ agent, ...stats }))
          .sort((a, b) => b.revenue - a.revenue);
        return {
          team,
          topAgent: agents[0] || { agent: 'No agents', deals: 0, revenue: 0 },
          totalAgents: agents.length
        };
      })
      .sort((a, b) => b.topAgent.revenue - a.topAgent.revenue);

    return {
      totalDeals,
      totalRevenue,
      avgDealSize,
      totalCallbacks,
      completedCallbacks,
      pendingCallbacks,
      conversionRate,
      todayDeals,
      todayRevenue,
      monthlyDeals,
      monthlyRevenue,
      topAgents,
      topTeams,
      teamTopAgents
    };
  }, [deals, callbacks, targets]);

  // Daily trend data for charts
  const dailyTrendData = useMemo(() => {
    if (!deals?.length) return [];

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const dayDeals = deals.filter((deal: any) => {
        const dealDate = new Date(deal.signup_date || deal.created_at).toISOString().split('T')[0];
        return dealDate === date;
      });

      const dayRevenue = dayDeals.reduce((sum: number, deal: any) => sum + (parseFloat(deal.amount_paid) || 0), 0);

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        deals: dayDeals.length,
        revenue: dayRevenue
      };
    });
  }, [deals]);

  // Service distribution for pie chart
  const serviceDistribution = useMemo(() => {
    if (!deals?.length) return [];

    const serviceData = deals.reduce((acc: any, deal: any) => {
      const service = deal.service_tier || deal.product_type || 'Unknown';
      if (!acc[service]) {
        acc[service] = { service, count: 0, revenue: 0 };
      }
      acc[service].count += 1;
      acc[service].revenue += parseFloat(deal.amount_paid) || 0;
      return acc;
    }, {});

    return Object.values(serviceData).sort((a: any, b: any) => b.revenue - a.revenue);
  }, [deals]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // ✅ SWR: Use SWR's refresh function
      await refresh();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Get role-specific title and description
  const getRoleInfo = () => {
    switch (userRole) {
      case 'manager':
        return {
          title: 'Manager Dashboard',
          description: 'Complete overview of all teams, agents, and performance metrics',
          scope: 'All Teams & Agents'
        };
      case 'team_leader':
        return {
          title: 'Team Leader Dashboard',
          description: `Managing ${user?.managedTeam || 'Team'} + Personal Performance`,
          scope: `${user?.managedTeam || 'Team'} + Personal`
        };
      case 'salesman':
        return {
          title: 'Sales Dashboard',
          description: 'Your personal performance and deal analytics',
          scope: 'Personal Performance'
        };
      default:
        return {
          title: 'Dashboard',
          description: 'Sales analytics and performance metrics',
          scope: 'Overview'
        };
    }
  };

  const roleInfo = getRoleInfo();

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{roleInfo.title}</h1>
            <p className="text-gray-600">{roleInfo.description}</p>
          </div>
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <BarChart3 className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h3>
          <p className="text-gray-600 mb-4">Unable to fetch {roleInfo.scope.toLowerCase()} data</p>
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Retrying...' : 'Try Again'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{roleInfo.title}</h1>
          <p className="text-gray-600">{roleInfo.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {roleInfo.scope}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live Data
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Total Revenue"
              value={`$${dashboardKPIs.totalRevenue.toLocaleString()}`}
              change={12.5}
              icon={<DollarSign className="h-6 w-6" />}
              color="blue"
              subtitle={`${dashboardKPIs.totalDeals} deals closed`}
            />
            <KPICard
              title="Monthly Revenue"
              value={`$${dashboardKPIs.monthlyRevenue.toLocaleString()}`}
              change={8.2}
              icon={<TrendingUp className="h-6 w-6" />}
              color="green"
              subtitle={`${dashboardKPIs.monthlyDeals} deals this month`}
            />
            <KPICard
              title="Average Deal Size"
              value={`$${dashboardKPIs.avgDealSize.toLocaleString()}`}
              change={-2.1}
              icon={<Target className="h-6 w-6" />}
              color="purple"
              subtitle="Per deal average"
            />
            <KPICard
              title="Conversion Rate"
              value={`${dashboardKPIs.conversionRate.toFixed(1)}%`}
              change={5.3}
              icon={<CheckCircle className="h-6 w-6" />}
              color="orange"
              subtitle={`${dashboardKPIs.completedCallbacks}/${dashboardKPIs.totalCallbacks} callbacks`}
            />
          </div>

          {/* Today's Performance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Today's Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Deals Closed</span>
                    <span className="font-semibold">{dashboardKPIs.todayDeals}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Revenue</span>
                    <span className="font-semibold">${dashboardKPIs.todayRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Callbacks</span>
                    <span className="font-semibold">{dashboardKPIs.pendingCallbacks}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    View All Deals
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Manage Callbacks
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Deal closed - $5,000</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">New callback scheduled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-600">Follow-up required</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales Trend (Last 30 Days)</CardTitle>
                <CardDescription>Revenue and deal count over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stackId="1" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} />
                    <Area type="monotone" dataKey="deals" stackId="2" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Service Distribution</CardTitle>
                <CardDescription>Revenue by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={serviceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ service, percent }) => `${service} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {serviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          {(userRole === 'manager' || userRole === 'team_leader') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Top Performing {userRole === 'manager' ? 'Agents' : 'Team Members'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardKPIs.topAgents.map((agent, index) => (
                    <div key={agent.agent} className={`flex items-center justify-between p-3 ${PROFESSIONAL_STYLE.cardBg} ${PROFESSIONAL_STYLE.cardHover} rounded-lg transition-colors`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{agent.agent}</p>
                          <p className="text-sm text-gray-600">{agent.deals} deals</p>
                          {agent.hasTarget && (
                            <p className="text-xs text-blue-600">
                              Target: ${agent.monthlyTarget?.toLocaleString()} ({agent.revenueProgress?.toFixed(0)}% complete)
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${agent.revenue.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">${(agent.revenue / agent.deals).toLocaleString()} avg</p>
                        {agent.hasTarget && (
                          <div className="mt-1">
                            <div className="w-20 bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-blue-500 h-1 rounded-full"
                                style={{ width: `${Math.min(agent.revenueProgress || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Deals</span>
                    <span className="font-semibold">{dashboardKPIs.totalDeals}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Conversion Rate</span>
                    <span className="font-semibold">{dashboardKPIs.conversionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Deal Size</span>
                    <span className="font-semibold">${dashboardKPIs.avgDealSize.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Monthly Target</span>
                    <span className="font-semibold text-green-600">85% Complete</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Deals Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Deals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deals?.slice(0, 5).map((deal: any, index: number) => (
                    <div key={deal.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{deal.customer_name || 'Unknown Customer'}</p>
                        <p className="text-sm text-gray-600">{deal.sales_agent || 'Unknown Agent'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${parseFloat(deal.amount_paid || 0).toLocaleString()}</p>
                        <Badge variant={deal.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {deal.status || 'Active'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agent Performance Dashboard */}
          {(userRole === 'manager' || userRole === 'team_leader') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Agent Performance Dashboard
                </CardTitle>
                <CardDescription>
                  Current month targets and actual performance for all agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {targets && targets.length > 0 ? (
                    targets
                      .filter((target: any) => {
                        // Filter to current month targets only
                        const currentMonthYear = `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`;
                        return target.period === currentMonthYear;
                      })
                      .map((target: any, index: number) => {
                        // Find actual performance for this agent
                        const agentDeals = deals?.filter((deal: any) => {
                          const agentName = deal.sales_agent || deal.salesAgent || '';
                          const targetAgentName = target.agentName || target.salesAgentName || '';
                          return agentName.toLowerCase() === targetAgentName.toLowerCase();
                        }) || [];

                        const actualRevenue = agentDeals.reduce((sum: number, deal: any) => 
                          sum + (parseFloat(deal.amount_paid) || 0), 0);
                        const actualDeals = agentDeals.length;

                        const monthlyTarget = target.monthlyTarget || target.targetAmount || 0;
                        const dealsTarget = target.dealsTarget || target.targetDeals || 0;

                        const revenueProgress = monthlyTarget > 0 ? (actualRevenue / monthlyTarget) * 100 : 0;
                        const dealsProgress = dealsTarget > 0 ? (actualDeals / dealsTarget) * 100 : 0;

                        // Get user role from the target data or determine from context
                        const isTeamLeader = target.userRole === 'team_leader' || 
                                           (userRole === 'team_leader' && target.agentId === user.id);

                        return (
                          <div key={target.id || index} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-semibold">{target.agentName || target.salesAgentName || 'Unknown Agent'}</h4>
                                <p className="text-sm text-gray-600">{target.period}</p>
                                {isTeamLeader && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    Team Leader
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                Individual Target
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* Revenue Progress */}
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Revenue</span>
                                  <span className="font-medium">${actualRevenue.toLocaleString()} / ${monthlyTarget.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      revenueProgress >= 100 ? 'bg-green-500' : 
                                      revenueProgress >= 75 ? 'bg-blue-500' : 
                                      revenueProgress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(revenueProgress, 100)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-600">{revenueProgress.toFixed(1)}% complete</p>
                              </div>

                              {/* Deals Progress */}
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Deals</span>
                                  <span className="font-medium">{actualDeals} / {dealsTarget}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      dealsProgress >= 100 ? 'bg-green-500' : 
                                      dealsProgress >= 75 ? 'bg-blue-500' : 
                                      dealsProgress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(dealsProgress, 100)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-600">{dealsProgress.toFixed(1)}% complete</p>
                              </div>
                            </div>

                            {target.description && (
                              <p className="text-sm text-gray-600 border-t pt-2">
                                {target.description}
                              </p>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Targets Set</h3>
                      <p className="text-gray-600 mb-4">
                        No targets have been created for the current month yet.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'team-targets' }))}
                      >
                        Create Targets
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Teams Tab */}
        {userRole === 'manager' && (
          <TabsContent value="teams" className="space-y-6">
            {/* Team Performance Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Team Performance Comparison
                  </CardTitle>
                  <CardDescription>Revenue and deals by team</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardKPIs.topTeams}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="team" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'revenue' ? `$${value.toLocaleString()}` : value,
                          name === 'revenue' ? 'Revenue' : 'Deals'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill={COLORS.primary} name="Revenue" />
                      <Bar dataKey="deals" fill={COLORS.success} name="Deals" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    Team Rankings
                  </CardTitle>
                  <CardDescription>Teams ranked by total revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardKPIs.topTeams.map((team, index) => (
                      <div key={team.team} className={`flex items-center justify-between p-3 ${PROFESSIONAL_STYLE.cardBg} ${PROFESSIONAL_STYLE.cardHover} rounded-lg transition-colors`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-black">{team.team}</p>
                            <p className="text-sm text-gray-600">{team.deals} deals</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${team.revenue.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">${(team.revenue / team.deals).toLocaleString()} avg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Agent for Each Team */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Top Agent for Each Team
                </CardTitle>
                <CardDescription>Leading performer in each team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardKPIs.teamTopAgents.map((teamData) => (
                    <div key={teamData.team} className={`p-4 ${PROFESSIONAL_STYLE.border} rounded-lg ${PROFESSIONAL_STYLE.accent} transition-all duration-200 hover:shadow-md`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{teamData.team}</h4>
                        <Badge variant="outline" className="text-xs">
                          {teamData.totalAgents} agents
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Star className="h-3 w-3 text-white" />
                          </div>
                          <span className="font-medium">{teamData.topAgent.agent}</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>{teamData.topAgent.deals} deals closed</p>
                          <p className="font-semibold text-green-600">${teamData.topAgent.revenue.toLocaleString()} revenue</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}

export default ProfessionalAnalyticsDashboard;
