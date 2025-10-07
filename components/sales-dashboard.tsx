import React, { useState, useEffect, useMemo } from 'react';
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
  const [users, setUsers] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setDateFilterKey(prev => prev + 1);
      await fetchData();
    } catch (error) {
      console.error('❌ Error during refresh:', error);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
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

  // Add debouncing to prevent rapid API calls
  const [fetchTimeout, setFetchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch role-based data from APIs with staggered requests to avoid debouncing
  const fetchData = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 SalesAnalysisDashboard: Fetching data for user:', user.username, 'role:', userRole);

      // Build API URLs with role-based filtering
      const dealsUrl = new URL('/api/deals', window.location.origin);
      const callbacksUrl = new URL('/api/callbacks', window.location.origin);
      const targetsUrl = new URL('/api/targets', window.location.origin);
      const notificationsUrl = new URL('/api/notifications', window.location.origin);
      const usersUrl = new URL('/api/users', window.location.origin);

      // Add role-based parameters
      dealsUrl.searchParams.set('limit', '1000');
      callbacksUrl.searchParams.set('limit', '1000');
      targetsUrl.searchParams.set('limit', '100');
      notificationsUrl.searchParams.set('limit', '50');
      usersUrl.searchParams.set('limit', '1000'); // Get all users for callback creator analysis

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

      console.log(`🔍 Fetching ${userRole} data with staggered requests to avoid debouncing...`);

      // Helper function to fetch with retry logic
      const fetchWithRetry = async (url: string, name: string, maxRetries = 2) => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            console.log(`📊 Fetching ${name} data... (attempt ${attempt + 1}/${maxRetries + 1})`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!res.ok) throw new Error(`${name} API error: ${res.status}`);
            const data = await res.json();
            console.log(`✅ ${name} data fetched successfully`);
            return data;
          } catch (err) {
            console.error(`❌ ${name} API error (attempt ${attempt + 1}):`, err);
            if (attempt === maxRetries) {
              console.error(`❌ ${name} API failed after ${maxRetries + 1} attempts`);
              return { success: false, [name.toLowerCase()]: [] };
            }
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      };

      // Fetch data sequentially with small delays to avoid debouncing
      // Start with deals (most important for salesman dashboard)
      const dealsRes = await fetchWithRetry(dealsUrl.toString(), 'deals');

      // Smaller delay to prevent debouncing but improve speed
      await new Promise(resolve => setTimeout(resolve, 150));

      const callbacksRes = await fetchWithRetry(callbacksUrl.toString(), 'callbacks');

      // Smaller delay to prevent debouncing but improve speed
      await new Promise(resolve => setTimeout(resolve, 150));

      const targetsRes = await fetchWithRetry(targetsUrl.toString(), 'targets');

      // Smaller delay to prevent debouncing but improve speed
      await new Promise(resolve => setTimeout(resolve, 150));

      const notificationsRes = await fetchWithRetry(notificationsUrl.toString(), 'notifications');

      // Smaller delay to prevent debouncing but improve speed
      await new Promise(resolve => setTimeout(resolve, 150));

      const usersRes = await fetchWithRetry(usersUrl.toString(), 'users');

      // Smaller delay to prevent debouncing but improve speed
      await new Promise(resolve => setTimeout(resolve, 150));

      // Fetch callback creators data from dedicated endpoint
      const callbackCreatorsUrl = new URL('/api/callback-creators', window.location.origin);
      callbackCreatorsUrl.searchParams.set('userRole', userRole);
      callbackCreatorsUrl.searchParams.set('userId', user.id);
      if (user.managedTeam) {
        callbackCreatorsUrl.searchParams.set('managedTeam', user.managedTeam);
      }
      callbackCreatorsUrl.searchParams.set('limit', '3'); // Top 3 creators

      const callbackCreatorsRes = await fetchWithRetry(callbackCreatorsUrl.toString(), 'callback-creators');

      // Process responses with better error handling
      const dealsData = Array.isArray(dealsRes) ? dealsRes : (dealsRes?.deals || dealsRes?.data || []);
      const callbacksData = Array.isArray(callbacksRes) ? callbacksRes : (callbacksRes?.callbacks || callbacksRes?.data || []);
      const targetsData = Array.isArray(targetsRes) ? targetsRes : (targetsRes?.targets || targetsRes?.data || []);
      const notificationsData = Array.isArray(notificationsRes) ? notificationsRes : (notificationsRes?.notifications || notificationsRes?.data || []);
      const usersData = Array.isArray(usersRes) ? usersRes : (usersRes?.users || usersRes?.data || []);
      const callbackCreatorsApiData = callbackCreatorsRes?.success ? callbackCreatorsRes.data : null;

      setDeals(dealsData);
      setCallbacks(callbacksData);
      setTargets(targetsData);
      setNotifications(notificationsData);
      setUsers(usersData);
      setAnalyticsData(callbackCreatorsApiData);

      console.log(`✅ ${userRole} data loaded successfully:`, {
        deals: dealsData.length,
        callbacks: callbacksData.length,
        targets: targetsData.length,
        notifications: notificationsData.length,
        users: usersData.length
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
        console.log('📞 Available callback fields:', {
          SalesAgentID: callbacksData[0].SalesAgentID,
          salesAgentId: callbacksData[0].salesAgentId,
          created_by_id: callbacksData[0].created_by_id,
          sales_agent: callbacksData[0].sales_agent,
          salesAgentName: callbacksData[0].salesAgentName,
          agent_name: callbacksData[0].agent_name
        });
      }

      if (usersData.length > 0) {
        console.log('👤 Sample user data:', usersData[0]);
        console.log('👤 Available user fields:', {
          id: usersData[0].id,
          name: usersData[0].name,
          username: usersData[0].username,
          full_name: usersData[0].full_name,
          team: usersData[0].team,
          team_name: usersData[0].team_name,
          role: usersData[0].role
        });
      }

    } catch (error) {
      console.error(`❌ Error fetching ${userRole} data:`, error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load data on component mount and when filters change with debouncing
  useEffect(() => {
    if (user?.id) {
      // Clear any existing timeout
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
      }
      
      // Set a new timeout to debounce rapid filter changes
      const timeout = setTimeout(() => {
        console.log('🔄 Debounced data fetch triggered');
        fetchData();
      }, 300); // 300ms debounce for faster response
      
      setFetchTimeout(timeout);
      
      // Cleanup timeout on unmount
      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }
  }, [user?.id, selectedMonth, selectedYear, dateFilterKey]);

  // Calculate KPIs and analytics
  const analytics = useMemo(() => {
    console.log('📊 Calculating analytics from deals:', deals.length, 'callbacks:', callbacks.length, 'users:', users.length);
    
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

    const dealSizeData = dealSizeRanges.map(({ range, min, max }, index) => ({
      range: range || `Range ${index + 1}`, // Ensure range is never null/undefined and unique
      count: deals.filter(deal => {
        const amount = parseFloat(deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0);
        return amount >= min && (max === Infinity ? true : amount < max);
      }).length,
      id: `deal-size-${index}` // Add unique identifier
    })).filter(item => item.range && typeof item.count === 'number' && !isNaN(item.count)); // Filter out any invalid entries

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

    // Top Callback Creators - Join callbacks with users data
    const callbackCreatorMap = new Map();
    
    // First, create a user lookup map for faster access
    const userLookup = new Map();
    users.forEach(user => {
      userLookup.set(user.id, user);
      // Also map by username for additional matching
      if (user.username) {
        userLookup.set(user.username, user);
      }
    });

    console.log('👥 User lookup created with', userLookup.size, 'users');
    console.log('📞 Processing', callbacks.length, 'callbacks for creator analysis');
    
    callbacks.forEach(callback => {
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
          user = Array.from(userLookup.values()).find(u => 
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
      // Top callback creators data - use API data if available, otherwise calculate locally
      topCallbackCreators: analyticsData?.topCallbackCreators || topCallbackCreators
    };
  }, [deals, callbacks, targets, users, selectedMonth, selectedYear, refreshing, analyticsData]);

  // Check if data is ready and stable for chart rendering
  const isDataReady = !refreshing && deals.length >= 0 && callbacks.length >= 0;

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
              <BarChart data={analytics.callbackStatusData} key="callback-status-chart">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" key="callback-status-bar">
                  {analytics.callbackStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
              <ComposedChart data={analytics.weeklyData} key="weekly-performance-chart">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => [
                  name === 'deals' ? `${value} deals` : `$${value.toLocaleString()}`,
                  name === 'deals' ? 'Deals' : 'Revenue'
                ]} />
                <Legend />
                <Bar yAxisId="left" dataKey="deals" fill="#8884d8" name="Deals" key="weekly-deals-bar" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={3} name="Revenue" key="weekly-revenue-line" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Callback Analytics Dashboard */}
        <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Phone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Callback Analytics
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Real-time callback performance and conversion tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {refreshing ? (
              <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-2"></div>
                  <p>Loading callback analytics...</p>
                </div>
              </div>
            ) : isDataReady && analytics.topCallbackCreators && analytics.topCallbackCreators.length > 0 ? (
              <div className="space-y-6">
                {/* Top 3 Callback Creators */}
                <div>
                  <h4 className="text-sm font-medium text-black dark:text-gray-200 mb-4 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Top 3 Callback Creators
                  </h4>
                  <div className="space-y-3">
                    {analytics.topCallbackCreators.map((creator: any, index: number) => (
                      <div 
                        key={creator.agentId} 
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          index === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50' :
                          index === 1 ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700/50' :
                          'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-500 text-white' :
                            'bg-orange-500 text-white'
                          }`}>
                            {creator.rank}
                          </div>
                          <div>
                            <p className="font-medium text-black dark:text-gray-200 text-base">{creator.userName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {creator.userTeam} • {creator.userRole}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-black dark:text-gray-200">
                            {creator.callbackCount}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {creator.successRate}% success
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <Phone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No callback data available</p>
                  <p className="text-sm mt-1">Callback analytics will appear here once data is available</p>
                </div>
              </div>
            )}
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
                <BarChart data={analytics.agentPerformanceData} key="agent-performance-chart">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => [
                    name === 'deals' ? `${value} deals` : `$${value.toLocaleString()}`,
                    name === 'deals' ? 'Deals' : 'Revenue'
                  ]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="deals" fill="#8884d8" name="Deals" key="agent-deals-bar" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue" key="agent-revenue-bar" />
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
