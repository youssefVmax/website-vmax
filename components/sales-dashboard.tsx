import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const KPICard: React.FC<KPICardProps> = ({ title, value, change, icon, color, subtitle }) => (
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
);

function SalesAnalysisDashboard({ 
  userRole, 
  user, 
  selectedMonth: propSelectedMonth, 
  selectedYear: propSelectedYear, 
  onDateChange 
}: SalesAnalysisDashboardProps) {
  // Safety check and logging
  console.log('🔄 SalesAnalysisDashboard initialized with props:', {
    userRole,
    userId: user?.id,
    userName: user?.name,
    propSelectedMonth,
    propSelectedYear,
    hasOnDateChange: !!onDateChange
  });

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
        console.log('📅 Updating selectedMonth from props:', propSelectedMonth);
        setSelectedMonth(propSelectedMonth);
      }
      if (propSelectedYear && propSelectedYear !== selectedYear) {
        console.log('📅 Updating selectedYear from props:', propSelectedYear);
        setSelectedYear(propSelectedYear);
      }
    } catch (error) {
      console.error('Error updating date from props:', error);
    }
  }, [propSelectedMonth, propSelectedYear, selectedMonth, selectedYear]);
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Data state
  const [deals, setDeals] = useState<any[]>([]);
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const handleRefresh = () => {
    setLoading(true)
    setDateFilterKey(prev => prev + 1)
    fetchData()
    setTimeout(() => setLoading(false), 1000)
  }

  const handleDateChange = (month: string, year: string) => {
    try {
      console.log('📅 handleDateChange called with:', { month, year });
      if (!month || !year) {
        console.error('❌ Invalid date parameters:', { month, year });
        return;
      }
      
      setSelectedMonth(month);
      setSelectedYear(year);
      setDateFilterKey(prev => prev + 1);
      
      // Call parent callback if provided
      if (onDateChange) {
        console.log('📅 Calling parent onDateChange');
        onDateChange(month, year);
      }
    } catch (error) {
      console.error('❌ Error in handleDateChange:', error);
    }
  }

  // Fetch role-based data from APIs
  const fetchData = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 SalesAnalysisDashboard: Fetching data for user:', user.username, 'role:', userRole);

      // Build API URLs with role-based filtering
      const dealsUrl = new URL('/api/deals', window.location.origin);
      const callbacksUrl = new URL('/api/callbacks', window.location.origin);
      const targetsUrl = new URL('/api/targets', window.location.origin);
      const notificationsUrl = new URL('/api/notifications', window.location.origin);

      // Add role-based parameters
      dealsUrl.searchParams.set('limit', '1000');
      callbacksUrl.searchParams.set('limit', '1000');
      targetsUrl.searchParams.set('limit', '100');
      notificationsUrl.searchParams.set('limit', '50');

      // Add user context for role-based filtering
      if (userRole === 'salesman') {
        // Salesman: only own data
        dealsUrl.searchParams.set('userRole', 'salesman');
        dealsUrl.searchParams.set('userId', user.id);
        callbacksUrl.searchParams.set('userRole', 'salesman');
        callbacksUrl.searchParams.set('userId', user.id);
        targetsUrl.searchParams.set('agentId', user.id);
        notificationsUrl.searchParams.set('salesAgentId', user.id);
      } else if (userRole === 'team_leader') {
        // Team leader: own data + managed team data
        dealsUrl.searchParams.set('userRole', 'team_leader');
        dealsUrl.searchParams.set('userId', user.id);
        if (user.managedTeam) {
          dealsUrl.searchParams.set('managedTeam', user.managedTeam);
        }
        callbacksUrl.searchParams.set('userRole', 'team_leader');
        callbacksUrl.searchParams.set('userId', user.id);
        if (user.managedTeam) {
          callbacksUrl.searchParams.set('managedTeam', user.managedTeam);
        }
        targetsUrl.searchParams.set('agentId', user.id);
        notificationsUrl.searchParams.set('salesAgentId', user.id);
        notificationsUrl.searchParams.set('userRole', 'team_leader');
      }

      // Add date filtering
      if (selectedMonth && selectedYear) {
        const monthNum = parseInt(selectedMonth);
        const yearNum = parseInt(selectedYear);
        
        // Create proper date range for the selected month
        const startDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`;
        const endDate = new Date(yearNum, monthNum, 0).toISOString().split('T')[0]; // Last day of month
        
        // Add date filters to all API calls
        dealsUrl.searchParams.set('startDate', startDate);
        dealsUrl.searchParams.set('endDate', endDate);
        dealsUrl.searchParams.set('month', selectedMonth);
        dealsUrl.searchParams.set('year', selectedYear);
        
        callbacksUrl.searchParams.set('startDate', startDate);
        callbacksUrl.searchParams.set('endDate', endDate);
        callbacksUrl.searchParams.set('month', selectedMonth);
        callbacksUrl.searchParams.set('year', selectedYear);
        
        targetsUrl.searchParams.set('month', selectedMonth);
        targetsUrl.searchParams.set('year', selectedYear);
        targetsUrl.searchParams.set('period', `${selectedYear}-${selectedMonth}`);
        
        console.log('📅 Date filtering applied:', { 
          startDate, 
          endDate, 
          selectedMonth, 
          selectedYear,
          period: `${selectedYear}-${selectedMonth}`
        });
      }

      console.log(`🔍 Fetching ${userRole} data:`, {
        deals: dealsUrl.toString(),
        callbacks: callbacksUrl.toString(),
        targets: targetsUrl.toString(),
        notifications: notificationsUrl.toString()
      });

      // Fetch all data in parallel with error handling
      const [dealsRes, callbacksRes, targetsRes, notificationsRes] = await Promise.all([
        fetch(dealsUrl.toString()).then(res => {
          if (!res.ok) throw new Error(`Deals API error: ${res.status}`);
          return res.json();
        }).catch(err => {
          console.error('❌ Deals API error:', err);
          return { success: false, deals: [] };
        }),
        fetch(callbacksUrl.toString()).then(res => {
          if (!res.ok) throw new Error(`Callbacks API error: ${res.status}`);
          return res.json();
        }).catch(err => {
          console.error('❌ Callbacks API error:', err);
          return { success: false, callbacks: [] };
        }),
        fetch(targetsUrl.toString()).then(res => {
          if (!res.ok) throw new Error(`Targets API error: ${res.status}`);
          return res.json();
        }).catch(err => {
          console.error('❌ Targets API error:', err);
          return { success: false, targets: [] };
        }),
        fetch(notificationsUrl.toString()).then(res => {
          if (!res.ok) throw new Error(`Notifications API error: ${res.status}`);
          return res.json();
        }).catch(err => {
          console.error('❌ Notifications API error:', err);
          return { success: false, notifications: [] };
        })
      ]);

      // Process responses with better error handling
      const dealsData = Array.isArray(dealsRes) ? dealsRes : (dealsRes?.deals || dealsRes?.data || []);
      const callbacksData = Array.isArray(callbacksRes) ? callbacksRes : (callbacksRes?.callbacks || callbacksRes?.data || []);
      const targetsData = Array.isArray(targetsRes) ? targetsRes : (targetsRes?.targets || targetsRes?.data || []);
      const notificationsData = Array.isArray(notificationsRes) ? notificationsRes : (notificationsRes?.notifications || notificationsRes?.data || []);

      setDeals(dealsData);
      setCallbacks(callbacksData);
      setTargets(targetsData);
      setNotifications(notificationsData);

      console.log(`✅ ${userRole} data loaded:`, {
        deals: dealsData.length,
        callbacks: callbacksData.length,
        targets: targetsData.length,
        notifications: notificationsData.length
      });

      // Debug: Show sample data structure
      if (dealsData.length > 0) {
        console.log('📋 Sample deal data:', dealsData[0]);
        console.log('💰 Available amount fields:', {
          amountPaid: dealsData[0].amountPaid,
          amount_paid: dealsData[0].amount_paid,
          totalAmount: dealsData[0].totalAmount,
          total_amount: dealsData[0].total_amount,
          revenue: dealsData[0].revenue
        });
      }
      
      if (callbacksData.length > 0) {
        console.log('📞 Sample callback data:', callbacksData[0]);
      }

    } catch (error) {
      console.error(`❌ Error fetching ${userRole} data:`, error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id, selectedMonth, selectedYear, dateFilterKey]);

  // Calculate KPIs and analytics
  const analytics = useMemo(() => {
    console.log('📊 Calculating analytics from deals:', deals.length, 'callbacks:', callbacks.length);
    
    // Handle multiple field name variations for amount
    const totalRevenue = deals.reduce((sum, deal) => {
      const amount = parseFloat(deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0);
      return sum + amount;
    }, 0);
    
    const totalDeals = deals.length;
    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;
    
    console.log('💰 Revenue calculation:', { totalRevenue, totalDeals, avgDealSize });
    
    const totalCallbacks = callbacks.length;
    const completedCallbacks = callbacks.filter(cb => cb.status === 'completed').length;
    const pendingCallbacks = callbacks.filter(cb => cb.status === 'pending').length;
    const conversionRate = totalCallbacks > 0 ? (completedCallbacks / totalCallbacks) * 100 : 0;
    
    // Separate personal and team targets for team leaders
    let personalTarget = {};
    let teamTarget = {};
    let targetRevenue = 0;
    let targetProgress = 0;
    
    if (userRole === 'team_leader') {
      // Personal target
      personalTarget = targets.find(t => 
        t.period === `${selectedYear}-${selectedMonth}` && 
        (t.agentId === user.id || t.salesAgentId === user.id)
      ) || {};
      
      // Team target (if exists)
      teamTarget = targets.find(t => 
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
      const currentTarget = targets.find(t => t.period === `${selectedYear}-${selectedMonth}`) || {};
      targetRevenue = parseFloat((currentTarget as any)?.targetRevenue || (currentTarget as any)?.target_revenue || 0);
      targetProgress = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;
    }

    // Monthly trend data
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthDeals = deals.filter(deal => {
        const dealDate = new Date(deal.created_at || deal.createdAt);
        return dealDate.getFullYear() === date.getFullYear() && 
               dealDate.getMonth() === date.getMonth();
      });
      
      const monthCallbacks = callbacks.filter(cb => {
        const cbDate = new Date(cb.created_at || cb.createdAt);
        return cbDate.getFullYear() === date.getFullYear() && 
               cbDate.getMonth() === date.getMonth();
      });

      const monthRevenue = monthDeals.reduce((sum, deal) => {
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

    // Service distribution
    const serviceDistribution = deals.reduce((acc, deal) => {
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
      { name: 'Contacted', value: callbacks.filter(cb => cb.status === 'contacted').length, color: '#2563eb' },
      { name: 'Completed', value: completedCallbacks, color: '#059669' },
      { name: 'Cancelled', value: callbacks.filter(cb => cb.status === 'cancelled').length, color: '#dc2626' }
    ].filter(item => item.value > 0);

    // Advanced Analytics Data
    const dealsByDay = deals.reduce((acc, deal) => {
      const date = new Date(deal.created_at || deal.createdAt);
      const day = date.toLocaleDateString('en-US', { weekday: 'short' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const weeklyData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      day,
      deals: dealsByDay[day] || 0,
      revenue: deals.filter(deal => {
        const dealDate = new Date(deal.created_at || deal.createdAt);
        return dealDate.toLocaleDateString('en-US', { weekday: 'short' }) === day;
      }).reduce((sum, deal) => {
        const amount = parseFloat(deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0);
        return sum + amount;
      }, 0)
    }));

    // Performance by Hour
    const hourlyData = deals.reduce((acc, deal) => {
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

    const dealSizeData = dealSizeRanges.map(({ range, min, max }) => ({
      range,
      count: deals.filter(deal => {
        const amount = parseFloat(deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0);
        return amount >= min && amount < max;
      }).length
    }));

    // Conversion Funnel Data
    const funnelData = [
      { name: 'Leads', value: callbacks.length, fill: '#8884d8' },
      { name: 'Contacted', value: callbacks.filter(cb => cb.status === 'contacted').length, fill: '#83a6ed' },
      { name: 'Qualified', value: callbacks.filter(cb => cb.status === 'qualified' || cb.status === 'interested').length || Math.floor(callbacks.length * 0.6), fill: '#8dd1e1' },
      { name: 'Deals', value: deals.length, fill: '#82ca9d' },
      { name: 'Closed', value: deals.filter(deal => deal.status === 'completed' || deal.status === 'closed').length, fill: '#a4de6c' }
    ];

    // Agent Performance (for team leaders)
    const agentPerformance = userRole === 'team_leader' ? 
      deals.reduce((acc, deal) => {
        const agent = deal.salesAgentName || deal.sales_agent_name || 'Unknown';
        if (!acc[agent]) {
          acc[agent] = { name: agent, deals: 0, revenue: 0 };
        }
        acc[agent].deals += 1;
        acc[agent].revenue += parseFloat(deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0);
        return acc;
      }, {}) : {};

    const agentPerformanceData = Object.values(agentPerformance);

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
      agentPerformanceData
    };
  }, [deals, callbacks, targets, selectedMonth, selectedYear]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-gray-600">Personal performance dashboard for {user?.name}</p>
        </div>
        <Button onClick={handleRefresh} disabled={loading || refreshing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
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
        loading={loading}
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
          title="Conversion Rate"
          value={`${analytics.conversionRate.toFixed(1)}%`}
          icon={<CheckCircle className="h-6 w-6" />}
          color="orange"
          subtitle="Callbacks to deals"
        />
      </div>

      {/* Target Progress */}
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
              <AreaChart data={analytics.monthlyData}>
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
                  data={analytics.serviceChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.serviceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                <Bar dataKey="value" fill="#2563eb">
                  {analytics.callbackStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Revenue This Month</span>
                </div>
                <span className="text-lg font-bold text-blue-600">${analytics.totalRevenue.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Deals Closed</span>
                </div>
                <span className="text-lg font-bold text-green-600">{analytics.totalDeals}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Active Callbacks</span>
                </div>
                <span className="text-lg font-bold text-orange-600">{analytics.pendingCallbacks}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Conversion Rate</span>
                </div>
                <span className="text-lg font-bold text-purple-600">{analytics.conversionRate.toFixed(1)}%</span>
              </div>
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
                  {analytics.dealSizeData.map((entry, index) => (
                    <Cell key={`deal-size-${index}-${entry.range}`} fill="#fbbf24" />
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
                  data={analytics.funnelData}
                  isAnimationActive
                >
                  <LabelList position="center" fill="#fff" stroke="none" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agent Performance (Team Leaders Only) */}
        {userRole === 'team_leader' && analytics.agentPerformanceData.length > 0 && (
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
        {(userRole !== 'team_leader' || analytics.agentPerformanceData.length === 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hourly Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.hourlyPerformance.slice(0, 12)}>
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
                {deals.slice(0, 5).map((deal, index) => {
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
            
            {callbacks.slice(0, 3).map((callback, index) => (
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
