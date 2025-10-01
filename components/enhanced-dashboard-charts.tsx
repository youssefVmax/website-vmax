"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { 
  TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, 
  RefreshCw, Calendar, Users, DollarSign, Target
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useUnifiedData } from '@/hooks/useUnifiedData';

interface DashboardChartsProps {
  userRole: 'manager' | 'salesman' | 'team_leader';
  user: { 
    id: string; 
    name?: string; 
    username: string;
    full_name?: string;
    team?: string;
    team_name?: string;
    managedTeam?: string;
  };
}

export function EnhancedDashboardCharts({ userRole, user }: DashboardChartsProps) {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('30');
  const [refreshing, setRefreshing] = useState(false);

  // Use unified data hook for consistent data fetching
  const {
    data,
    kpis,
    loading,
    error,
    lastUpdated,
    refresh
  } = useUnifiedData({
    userRole: userRole,
    userId: user.id,
    userName: user.full_name || user.name || user.username,
    managedTeam: user.managedTeam || user.team_name,
    autoLoad: true
  });

  // Process data for charts
  const chartData = useMemo(() => {
    const deals = data.deals || [];
    const callbacks = data.callbacks || [];
    
    // Sales trend data (last 30 days)
    const salesTrend = deals.reduce((acc: any[], deal) => {
      const date = new Date(deal.created_at || deal.createdAt || Date.now());
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const amount = typeof deal.amount_paid === 'string' ? parseFloat(deal.amount_paid) : (deal.amount_paid || 0);
      
      const existing = acc.find(item => item.date === dateStr);
      if (existing) {
        existing.deals += 1;
        existing.revenue += amount;
      } else {
        acc.push({ date: dateStr, deals: 1, revenue: amount });
      }
      return acc;
    }, []).slice(-30);

    // Sales by agent
    const salesByAgent = deals.reduce((acc: any[], deal) => {
      const agent = deal.sales_agent || deal.salesAgentName || 'Unknown Agent';
      const amount = typeof deal.amount_paid === 'string' ? parseFloat(deal.amount_paid) : (deal.amount_paid || 0);
      
      const existing = acc.find(item => item.agent === agent);
      if (existing) {
        existing.deals += 1;
        existing.revenue += amount;
      } else {
        acc.push({ agent, deals: 1, revenue: amount });
      }
      return acc;
    }, []).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Sales by team
    const salesByTeam = deals.reduce((acc: any[], deal) => {
      const team = deal.sales_team || deal.salesTeam || 'Unknown Team';
      const amount = typeof deal.amount_paid === 'string' ? parseFloat(deal.amount_paid) : (deal.amount_paid || 0);
      
      const existing = acc.find(item => item.team === team);
      if (existing) {
        existing.deals += 1;
        existing.revenue += amount;
      } else {
        acc.push({ team, deals: 1, revenue: amount });
      }
      return acc;
    }, []).sort((a, b) => b.revenue - a.revenue);

    // Deal status distribution
    const dealStatus = deals.reduce((acc: any[], deal) => {
      const status = deal.status || 'active';
      const existing = acc.find(item => item.status === status);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ status, count: 1 });
      }
      return acc;
    }, []);

    // Service tier distribution
    const serviceTier = deals.reduce((acc: any[], deal) => {
      const service = deal.service_tier || deal.serviceTier || 'Unknown';
      const amount = typeof deal.amount_paid === 'string' ? parseFloat(deal.amount_paid) : (deal.amount_paid || 0);
      
      const existing = acc.find(item => item.service === service);
      if (existing) {
        existing.deals += 1;
        existing.revenue += amount;
      } else {
        acc.push({ service, deals: 1, revenue: amount });
      }
      return acc;
    }, []);

    // Callback performance
    const callbackPerformance = callbacks.reduce((acc: any[], callback) => {
      const date = new Date(callback.created_at || callback.createdAt || Date.now());
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const existing = acc.find(item => item.date === dateStr);
      if (existing) {
        existing.total += 1;
        if (callback.status === 'completed') existing.completed += 1;
        if (callback.status === 'pending') existing.pending += 1;
      } else {
        acc.push({ 
          date: dateStr, 
          total: 1, 
          completed: callback.status === 'completed' ? 1 : 0,
          pending: callback.status === 'pending' ? 1 : 0
        });
      }
      return acc;
    }, []).slice(-30);

    return {
      salesTrend,
      salesByAgent,
      salesByTeam,
      dealStatus,
      serviceTier,
      callbackPerformance
    };
  }, [data]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Charts data refreshed successfully"
    });
  };

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

  // Custom tooltip components
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Revenue') || entry.name.includes('revenue') 
                ? `$${entry.value.toLocaleString()}` 
                : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.name.includes('Status') ? `${data.value} deals` : `$${data.value.toLocaleString()}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">Error loading charts: {error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">Interactive Charts</h2>
          <Badge variant="outline">
            {data.deals?.length || 0} Deals • {data.callbacks?.length || 0} Callbacks
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Sales Trend Chart */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Sales Trend
            </CardTitle>
            <CardDescription>Daily sales performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area yAxisId="right" type="monotone" dataKey="revenue" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Revenue ($)" />
                <Bar yAxisId="left" dataKey="deals" fill="#10B981" name="Deals" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deal Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2 text-green-600" />
              Deal Status
            </CardTitle>
            <CardDescription>Distribution of deal statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.dealStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                >
                  {chartData.dealStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Agent */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              Sales by Agent
            </CardTitle>
            <CardDescription>Top performing sales agents</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.salesByAgent} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="agent" type="category" width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenue" fill="#8B5CF6" name="Revenue ($)" />
                <Bar dataKey="deals" fill="#10B981" name="Deals" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-orange-600" />
              Service Tiers
            </CardTitle>
            <CardDescription>Revenue by service tier</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.serviceTier}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                  nameKey="service"
                >
                  {chartData.serviceTier.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Team (Manager only) */}
        {userRole === 'manager' && (
          <Card className="col-span-full lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-indigo-600" />
                Sales by Team
              </CardTitle>
              <CardDescription>Team performance comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.salesByTeam}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="team" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#6366F1" name="Revenue ($)" />
                  <Bar dataKey="deals" fill="#10B981" name="Deals" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Callback Performance */}
        <Card className={userRole === 'manager' ? '' : 'col-span-full lg:col-span-2'}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-red-600" />
              Callback Performance
            </CardTitle>
            <CardDescription>Daily callback completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.callbackPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#EF4444" strokeWidth={2} name="Total Callbacks" />
                <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name="Completed" />
                <Line type="monotone" dataKey="pending" stroke="#F59E0B" strokeWidth={2} name="Pending" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ${(data.deals || []).reduce((sum, deal) => sum + (typeof deal.amount_paid === 'string' ? parseFloat(deal.amount_paid) : (deal.amount_paid || 0)), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Deals</p>
                <p className="text-2xl font-bold">{data.deals?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Deal Size</p>
                <p className="text-2xl font-bold">
                  ${data.deals?.length ? ((data.deals || []).reduce((sum, deal) => sum + (typeof deal.amount_paid === 'string' ? parseFloat(deal.amount_paid) : (deal.amount_paid || 0)), 0) / data.deals.length).toFixed(0) : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Callbacks</p>
                <p className="text-2xl font-bold">{data.callbacks?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default EnhancedDashboardCharts;
