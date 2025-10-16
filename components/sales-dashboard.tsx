import React, { useState, useEffect, useMemo } from 'react';
import { useSWRDashboardData } from '@/hooks/useSWRData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateFilter } from '@/components/ui/date-filter';
import { 
  DollarSign, Target, Phone, CheckCircle, Clock, TrendingUp, 
  BarChart3, PieChart, Activity, Award, Calendar, RefreshCw,
  ArrowUpRight, ArrowDownRight, Users, Star, Trophy
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
  ComposedChart, Scatter, ScatterChart, ZAxis, RadialBarChart, RadialBar, FunnelChart, Funnel, LabelList
} from 'recharts';

interface User {
  id: string;
  name: string;
  username: string;
  role: 'manager' | 'salesman' | 'team_leader';
  managedTeam?: string;
}

interface SalesAnalysisDashboardProps {
  userRole: 'manager' | 'salesman' | 'team_leader';
  user: User;
  selectedMonth?: string;
  selectedYear?: string;
  onDateChange?: (month: string, year: string) => void;
}

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

// ✅ OPTIMIZATION: Memoized KPI card to prevent unnecessary re-renders
const KPICard: React.FC<KPICardProps> = React.memo(({ title, value, change, icon, color, subtitle }) => (
  <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
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
));

KPICard.displayName = 'KPICard';

function SalesAnalysisDashboard({ 
  userRole, 
  user, 
  selectedMonth: propSelectedMonth, 
  selectedYear: propSelectedYear, 
  onDateChange 
}: SalesAnalysisDashboardProps) {
  // Safety check and logging

  // Date filter state - use props if provided, otherwise default
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(() => {
    try {
      return propSelectedMonth || String(currentDate.getMonth() + 1).padStart(2, '0');
    } catch (error) {
      console.error('Error initializing selectedMonth:', error);
      return String(new Date().getMonth() + 1).padStart(2, '0');
    }
  })
  const [selectedYear, setSelectedYear] = useState(() => {
    try {
      return propSelectedYear || currentDate.getFullYear().toString();
    } catch (error) {
      console.error('Error initializing selectedYear:', error);
      return new Date().getFullYear().toString();
    }
  })
  const [dateFilterKey, setDateFilterKey] = useState(0)

  // Update local state when props change
  useEffect(() => {
    try {
      if (propSelectedMonth && propSelectedMonth !== selectedMonth) {
        setSelectedMonth(propSelectedMonth);
      }
      if (propSelectedYear && propSelectedYear !== selectedYear) {
        setSelectedYear(propSelectedYear);
      }
    } catch (error) {
      console.error('Error updating date from props:', error);
    }
  }, [propSelectedMonth, propSelectedYear]);
  // ✅ SWR: Replace manual state with SWR hooks
  const { 
    deals = [], 
    callbacks = [], 
    targets = [], 
    notifications = [], 
    isLoading, 
    error,
    refresh 
  } = useSWRDashboardData({
    userRole,
    userId: user?.id,
    managedTeam: user?.managedTeam
  });

  const [users, setUsers] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCallbacksCount, setTotalCallbacksCount] = useState<number | null>(null);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setDateFilterKey(prev => prev + 1);
      // ✅ SWR: Use SWR's refresh function
      await refresh();
    } catch (error) {
      console.error('❌ Error during refresh:', error);
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadTotalCallbacks = async () => {
      try {
        if (!userRole || !user?.id) return;

        const params = new URLSearchParams({
          userRole,
          userId: user.id,
          limit: '1',
          page: '1'
        });

        if (user?.managedTeam) {
          params.set('managedTeam', user.managedTeam);
        }

        if (selectedMonth && selectedYear) {
          params.set('month', `${selectedYear}-${selectedMonth}`);
        }

        const response = await fetch(`/api/callbacks?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load callbacks total: ${response.status}`);
        }

        const data = await response.json();
        if (!cancelled) {
          // Use systemTotal for KPI display (actual system-wide count), fallback to total (filtered count)
          const apiTotal = typeof data?.systemTotal === 'number' ? data.systemTotal : 
                          typeof data?.total === 'number' ? data.total : 
                          Array.isArray(data?.callbacks) ? data.callbacks.length : null;
          setTotalCallbacksCount(apiTotal);
        }
      } catch (error) {
        if ((error as any)?.name !== 'AbortError') {
          console.error('❌ Error fetching total callbacks:', error);
        }
        if (!cancelled) {
          setTotalCallbacksCount(null);
        }
      }
    };

    loadTotalCallbacks();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [userRole, user?.id, user?.managedTeam, selectedMonth, selectedYear, refreshing]);

  const handleDateChange = (month: string, year: string) => {
    try {
      if (!month || !year) {
        console.error('❌ Invalid date parameters:', { month, year });
        return;
      }
      
      setSelectedMonth(month);
      setSelectedYear(year);
      setDateFilterKey(prev => prev + 1);
      
      // Call parent callback if provided
      if (onDateChange) {
        onDateChange(month, year);
      }
    } catch (error) {
      console.error('❌ Error in handleDateChange:', error);
    }
  }

  // ✅ SWR: Fetch users separately (not included in SWR dashboard hook)
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users?limit=1000');
        const data = await res.json();
        setUsers(data?.users || []);
      } catch (error) {
        console.error('❌ Error loading users:', error);
      }
    }
    fetchUsers();
  }, []);

  // Calculate KPIs and analytics
  const analytics = useMemo(() => {
    
    // Handle multiple field name variations for amount
    const totalRevenue = deals.reduce((sum: number, deal: any) => {
      const amount = parseFloat(deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0);
      return sum + amount;
    }, 0);
    
    const totalDeals = deals.length;
    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;
    
    const totalCallbacks = callbacks.length;
    const completedCallbacks = callbacks.filter((cb: any) => cb.status === 'completed').length;
    const pendingCallbacks = callbacks.filter((cb: any) => cb.status === 'pending').length;
    const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;
    
    // Separate personal and team targets for team leaders
    let personalTarget = {};
    let teamTarget = {};
    let targetRevenue = 0;
    let targetProgress = 0;
    
    if (userRole === 'team_leader') {
      // Personal target
      personalTarget = targets.find((t: any) => 
        t.period === `${selectedYear}-${selectedMonth}` && 
        (t.agentId === user.id || t.salesAgentId === user.id)
      ) || {};
      
      // Team target (if exists)
      teamTarget = targets.find((t: any) => 
        t.period === `${selectedYear}-${selectedMonth}` && 
        t.salesTeam === user.managedTeam &&
        t.agentId !== user.id
      ) || {};
      
      const personalTargetRevenue = parseFloat((personalTarget as any)?.targetRevenue || (personalTarget as any)?.target_revenue || 0);
      const teamTargetRevenue = parseFloat((teamTarget as any)?.targetRevenue || (teamTarget as any)?.target_revenue || 0);
      
      // Use personal target for progress calculation
      targetRevenue = personalTargetRevenue;
      targetProgress = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;
    } else {
      // For managers and salesmen, use regular target logic
      const currentTarget = targets.find((t: any) => t.period === `${selectedYear}-${selectedMonth}`) || {};
      targetRevenue = parseFloat((currentTarget as any)?.targetRevenue || (currentTarget as any)?.target_revenue || 0);
      targetProgress = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;
    }

    // Monthly trend data
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthDeals = deals.filter((deal: any) => {
        const dealDate = new Date(deal.created_at || deal.createdAt);
        return dealDate.getFullYear() === date.getFullYear() && 
               dealDate.getMonth() === date.getMonth();
      });
      
      const monthCallbacks = callbacks.filter((cb: any) => {
        const cbDate = new Date(cb.created_at || cb.createdAt);
        return cbDate.getFullYear() === date.getFullYear() && 
               cbDate.getMonth() === date.getMonth();
      });

      const monthRevenue = monthDeals.reduce((sum: number, deal: any) => {
        const amount = parseFloat(deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0);
        return sum + amount;
      }, 0);

      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        revenue: monthRevenue,
        deals: monthDeals.length,
        callbacks: monthCallbacks.length
      });
    }

    // Daily callback timeline for selected month
    const dailyCallbackData = [];
    const selectedDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
    const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, day);
      const dayCallbacks = callbacks.filter((cb: any) => {
        const cbDate = new Date(cb.created_at || cb.createdAt);
        return cbDate.getFullYear() === date.getFullYear() && 
               cbDate.getMonth() === date.getMonth() &&
               cbDate.getDate() === date.getDate();
      });
      
      dailyCallbackData.push({
        day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date.toISOString().split('T')[0],
        callbacks: dayCallbacks.length,
        pending: dayCallbacks.filter((cb: any) => cb.status === 'pending').length,
        contacted: dayCallbacks.filter((cb: any) => cb.status === 'contacted').length,
        completed: dayCallbacks.filter((cb: any) => cb.status === 'completed').length,
        cancelled: dayCallbacks.filter((cb: any) => cb.status === 'cancelled').length
      });
    }

    // Service distribution
    const serviceDistribution = deals.reduce((acc: any, deal: any) => {
      const service = deal.serviceTier || deal.service_tier || 'Unknown';
      acc[service] = (acc[service] || 0) + 1;
      return acc;
    }, {});

    const serviceChartData = Object.entries(serviceDistribution).map(([name, value]) => ({
      name,
      value,
      percentage: totalDeals > 0 ? ((value as number) / totalDeals * 100).toFixed(1) : '0'
    }));

    // Status distribution for callbacks
    const callbackStatusData = [
      { name: 'Pending', value: pendingCallbacks, color: '#d97706' },
      { name: 'Contacted', value: callbacks.filter((cb: any) => cb.status === 'contacted').length, color: '#2563eb' },
      { name: 'Completed', value: completedCallbacks, color: '#059669' },
      { name: 'Cancelled', value: callbacks.filter((cb: any) => cb.status === 'cancelled').length, color: '#dc2626' }
    ].filter((item: any) => item.value > 0);

    // Advanced Analytics Data
    const dealsByDay = deals.reduce((acc: any, deal: any) => {
      const date = new Date(deal.created_at || deal.createdAt);
      const day = date.toLocaleDateString('en-US', { weekday: 'short' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const weeklyData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      day,
      deals: dealsByDay[day] || 0,
      revenue: deals.filter((deal: any) => {
        const dealDate = new Date(deal.created_at || deal.createdAt);
        return dealDate.toLocaleDateString('en-US', { weekday: 'short' }) === day;
      }).reduce((sum: number, deal: any) => {
        const amount = parseFloat(deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0);
        return sum + amount;
      }, 0)
    }));

    // Performance by Hour
    const hourlyData = deals.reduce((acc: any, deal: any) => {
      const hour = new Date(deal.created_at || deal.createdAt).getHours();
      const timeSlot = `${hour}:00`;
      acc[timeSlot] = (acc[timeSlot] || 0) + 1;
      return acc;
    }, {});

    const hourlyPerformance = Object.entries(hourlyData).map(([time, count]) => ({
      time,
      deals: count,
      efficiency: Math.min(100, (count as number) * 10) // Mock efficiency score
    }));

    // Deal Size Distribution
    const dealSizeRanges = [
      { range: '$0-1K', min: 0, max: 1000 },
      { range: '$1K-5K', min: 1000, max: 5000 },
      { range: '$5K-10K', min: 5000, max: 10000 },
      { range: '$10K-25K', min: 10000, max: 25000 },
      { range: '$25K+', min: 25000, max: Infinity }
    ];

    const dealSizeData = dealSizeRanges.map(({ range, min, max }, index) => ({
      range: range || `Range ${index + 1}`, // Ensure range is never null/undefined and unique
      count: deals.filter((deal: any) => {
        const amount = parseFloat(deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0);
        return amount >= min && (max === Infinity ? true : amount < max);
      }).length,
      id: `deal-size-${index}` // Add unique identifier
    })).filter((item: any) => item.range && typeof item.count === 'number' && !isNaN(item.count)); // Filter out any invalid entries

    // Conversion Funnel Data
    const funnelData = [
      { name: 'Leads', value: callbacks.length, fill: '#8884d8' },
      { name: 'Contacted', value: callbacks.filter((cb: any) => cb.status === 'contacted').length, fill: '#83a6ed' },
      { name: 'Qualified', value: callbacks.filter((cb: any) => cb.status === 'qualified' || cb.status === 'interested').length || Math.floor(callbacks.length * 0.6), fill: '#8dd1e1' },
      { name: 'Deals', value: deals.length, fill: '#82ca9d' },
      { name: 'Closed', value: deals.filter((deal: any) => deal.status === 'completed' || deal.status === 'closed').length, fill: '#a4de6c' }
    ];

    // Agent Performance (for team leaders)
    const agentPerformance = userRole === 'team_leader' ? 
      deals.reduce((acc: any, deal: any) => {
        const agent = deal.salesAgentName || deal.sales_agent_name || 'Unknown';
        if (!acc[agent]) {
          acc[agent] = { name: agent, deals: 0, revenue: 0 };
        }
        acc[agent].deals += 1;
        acc[agent].revenue += parseFloat(deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0);
        return acc;
      }, {}) : {};

    const agentPerformanceData = Object.values(agentPerformance);

    // Top Callback Creators - Join callbacks with users data
    const callbackCreatorMap = new Map();
    
    // First, create a user lookup map for faster access
    const userLookup = new Map();
    users.forEach((user: any) => {
      userLookup.set(user.id, user);
      // Also map by username for additional matching
      if (user.username) {
        userLookup.set(user.username, user);
      }
    });

    
    callbacks.forEach((callback: any) => {
      // Try multiple field variations for agent ID
      const agentId = callback.SalesAgentID || callback.salesAgentId || callback.created_by_id || callback.sales_agent_id;
      const agentName = callback.sales_agent || callback.salesAgentName || callback.agent_name;
      
      if (agentId || agentName) {
        // Try to find user by ID first, then by name
        let user = null;
        if (agentId) {
          user = userLookup.get(agentId) || userLookup.get(agentId.toString());
        }
        if (!user && agentName) {
          // Try to find user by name matching
          user = Array.from(userLookup.values()).find((u: any) => 
            u.name === agentName || u.username === agentName || u.full_name === agentName
          );
        }

        const creatorKey = agentId || agentName || 'unknown';
        
        if (!callbackCreatorMap.has(creatorKey)) {
          callbackCreatorMap.set(creatorKey, {
            agentId: creatorKey,
            callbackCount: 0,
            completedCallbacks: 0,
            pendingCallbacks: 0,
            userName: user ? (user.name || user.full_name || user.username || 'Unknown User') : (agentName || 'Unknown User'),
            userTeam: user ? (user.team || user.team_name || 'Unknown Team') : 'Unknown Team',
            userRole: user ? (user.role || 'Unknown Role') : 'Unknown Role'
          });
        }
        
        const creator = callbackCreatorMap.get(creatorKey);
        creator.callbackCount += 1;
        
        if (callback.status === 'completed') {
          creator.completedCallbacks += 1;
        } else if (callback.status === 'pending') {
          creator.pendingCallbacks += 1;
        }
      }
    });

    // Get top 3 callback creators sorted by total callback count
    const topCallbackCreators = Array.from(callbackCreatorMap.values())
      .sort((a, b) => b.callbackCount - a.callbackCount)
      .slice(0, 3)
      .map((creator, index) => ({
        ...creator,
        rank: index + 1,
        successRate: creator.callbackCount > 0 ? ((creator.completedCallbacks / creator.callbackCount) * 100).toFixed(1) : '0.0'
      }));


    return {
      totalRevenue,
      totalDeals,
      avgDealSize,
      totalCallbacks,
      completedCallbacks,
      pendingCallbacks,
      conversionRate,
      targetRevenue,
      targetProgress,
      monthlyData,
      serviceChartData,
      callbackStatusData,
      // Team leader specific data
      personalTarget,
      teamTarget,
      hasTeamTarget: userRole === 'team_leader' && Object.keys(teamTarget).length > 0,
      // Advanced analytics data
      weeklyData,
      hourlyPerformance,
      dealSizeData,
      funnelData,
      agentPerformanceData,
      // Daily callback timeline data
      dailyCallbackData,
      // Top callback creators data - use API data if available, otherwise calculate locally
      topCallbackCreators: analyticsData?.topCallbackCreators || topCallbackCreators
    };
  }, [deals, callbacks, targets, users, selectedMonth, selectedYear, refreshing, analyticsData]);

  // Check if data is ready and stable for chart rendering
  const isDataReady = !refreshing && deals.length >= 0 && callbacks.length >= 0;

  const totalCallbacksDisplay = totalCallbacksCount ?? analytics.totalCallbacks;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-gray-600">Personal performance dashboard for {user?.name}</p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading || refreshing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${(isLoading || refreshing) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Date Filter */}
      <DateFilter
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={(month) => handleDateChange(month, selectedYear)}
        onYearChange={(year) => handleDateChange(selectedMonth, year)}
        onRefresh={handleRefresh}
        loading={isLoading}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={`$${analytics.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6" />}
          color="blue"
          subtitle="This month"
        />
        <KPICard
          title="Total Deals"
          value={analytics.totalDeals}
          icon={<Target className="h-6 w-6" />}
          color="green"
          subtitle="Closed deals"
        />
        <KPICard
          title="Average Deal Size"
          value={`$${analytics.avgDealSize.toLocaleString()}`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="purple"
          subtitle="Per deal"
        />
        <KPICard
          title="Total Callbacks"
          value={totalCallbacksDisplay}
          icon={<Phone className="h-6 w-6" />}
          color="orange"
          subtitle="All recorded callbacks"
        />
      </div>

      {/* Target Progress - Hidden for managers */}
      {userRole !== 'manager' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {userRole === 'team_leader' ? 'Personal & Team Targets' : 'Target Progress'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Personal Target (always shown) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {userRole === 'team_leader' ? 'My Personal Target' : 'Monthly Target'}
                  </span>
                  <span className="text-sm text-gray-600">${analytics.targetRevenue.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(analytics.targetProgress, 100)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress: {analytics.targetProgress.toFixed(1)}%</span>
                  <span className="font-medium">${analytics.totalRevenue.toLocaleString()} / ${analytics.targetRevenue.toLocaleString()}</span>
                </div>
              </div>

              {/* Team Target (only for team leaders if exists) */}
              {analytics.hasTeamTarget && (
                <>
                  <hr className="border-gray-200" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-purple-700">
                        Team Target ({user.managedTeam})
                      </span>
                      <span className="text-sm text-purple-600">
                        ${parseFloat((analytics.teamTarget as any)?.targetRevenue || (analytics.teamTarget as any)?.target_revenue || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-purple-100 rounded-full h-3">
                      <div 
                        className="bg-purple-600 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(50, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-600">Team Progress: 50.0%</span>
                      <span className="font-medium text-purple-700">
                        $0 / ${parseFloat((analytics.teamTarget as any)?.targetRevenue || (analytics.teamTarget as any)?.target_revenue || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.monthlyData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'revenue' ? `$${value.toLocaleString()}` : value,
                  name === 'revenue' ? 'Revenue' : name === 'deals' ? 'Deals' : 'Callbacks'
                ]} />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
                <Area type="monotone" dataKey="deals" stackId="2" stroke="#059669" fill="#059669" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Service Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={analytics.serviceChartData || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(analytics.serviceChartData || []).map((entry, index) => (
                    <Cell key={`service-cell-${index}-${entry?.name || 'unknown'}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Callback Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Callback Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.callbackStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {analytics.callbackStatusData.map((entry, index) => (
                    <Cell key={`callback-status-${index}-${entry.name}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Revenue This Month */}
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/50 hover:shadow-md transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                        <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black dark:text-gray-200">Revenue This Month</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ${analytics.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deals Closed */}
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700/50 hover:shadow-md transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg">
                        <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black dark:text-gray-200">Deals Closed</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {analytics.totalDeals}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Callbacks */}
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700/50 hover:shadow-md transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-800/50 rounded-lg">
                        <Phone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black dark:text-gray-200">Active Callbacks</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {analytics.pendingCallbacks}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Conversion Rate */}
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700/50 hover:shadow-md transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black dark:text-gray-200">Conversion Rate</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {analytics.conversionRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Weekly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={analytics.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => [
                  name === 'deals' ? `${value} deals` : `$${value.toLocaleString()}`,
                  name === 'deals' ? 'Deals' : 'Revenue'
                ]} />
                <Legend />
                <Bar yAxisId="left" dataKey="deals" fill="#8884d8" name="Deals" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={3} name="Revenue" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deal Size Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Deal Size Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.dealSizeData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="range" type="category" width={80} />
                <Tooltip formatter={(value) => [`${value} deals`, 'Count']} />
                <Bar dataKey="count" fill="#fbbf24">
                  {analytics.dealSizeData?.map((entry: any, index: number) => (
                    <Cell key={`cell-${entry.id || entry.range}-${index}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel and Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sales Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <FunnelChart>
                <Tooltip formatter={(value, name) => [`${value}`, name]} />
                <Funnel
                  dataKey="value"
                  data={analytics.funnelData || []}
                  isAnimationActive
                >
                  <LabelList position="center" fill="#fff" stroke="none" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agent Performance (Team Leaders Only) */}
        {userRole === 'team_leader' && (analytics.agentPerformanceData || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Agent Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.agentPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => [
                    name === 'deals' ? `${value} deals` : `$${value.toLocaleString()}`,
                    name === 'deals' ? 'Deals' : 'Revenue'
                  ]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="deals" fill="#8884d8" name="Deals" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Hourly Performance (if not team leader or no agent data) */}
        {(userRole !== 'team_leader' || (analytics.agentPerformanceData || []).length === 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hourly Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={(analytics.hourlyPerformance || []).slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    name === 'deals' ? `${value} deals` : `${value}% efficiency`,
                    name === 'deals' ? 'Deals' : 'Efficiency'
                  ]} />
                  <Legend />
                  <Area type="monotone" dataKey="deals" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="efficiency" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.4} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Deals and callbacks will appear here</p>
              </div>
            ) : (
              <>
                {deals.slice(0, 5).map((deal: any, index: number) => {
              const customerName = deal.customerName || deal.customer_name || deal.clientName || deal.client_name || 'Unknown Customer';
              const amount = parseFloat(deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0);
              const status = deal.status || deal.dealStatus || deal.deal_status || 'completed';
              const statusColor = status === 'completed' ? 'green' : status === 'pending' ? 'yellow' : 'blue';
              
              return (
                <div key={deal.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 bg-${statusColor}-500 rounded-full`}></div>
                    <div>
                      <p className="font-medium">{customerName}</p>
                      <p className="text-sm text-gray-600">
                        {amount > 0 ? `Deal closed - $${amount.toLocaleString()}` : 'Deal in progress'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-${statusColor}-600 border-${statusColor}-600`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>
              );
            })}
            
            {callbacks.slice(0, 3).map((callback: any, index: number) => (
              <div key={callback.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    callback.status === 'completed' ? 'bg-green-500' : 
                    callback.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></div>
                  <div>
                    <p className="font-medium">{callback.customerName || callback.customer_name}</p>
                    <p className="text-sm text-gray-600">Callback - {callback.status}</p>
                  </div>
                </div>
                <Badge variant="outline" className={
                  callback.status === 'completed' ? 'text-green-600 border-green-600' :
                  callback.status === 'pending' ? 'text-yellow-600 border-yellow-600' :
                  'text-blue-600 border-blue-600'
                }>
                  {callback.status}
                </Badge>
              </div>
            ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SalesAnalysisDashboard;
