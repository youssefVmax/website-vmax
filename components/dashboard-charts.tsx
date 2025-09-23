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
import { chartsService, type ChartsData, type ChartsFilters, formatCurrency, formatNumber } from '@/lib/charts-service';

interface DashboardChartsProps {
  userRole: 'manager' | 'salesman' | 'team-leader';
  user: { 
    id: string; 
    name: string; 
    username: string;
    team?: string;
    managedTeam?: string;
  };
}

export function DashboardCharts({ userRole, user }: DashboardChartsProps) {
  const { toast } = useToast();
  const [chartsData, setChartsData] = useState<ChartsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30');
  const [refreshing, setRefreshing] = useState(false);

  const filters: ChartsFilters = useMemo(() => ({
    userRole,
    userId: user.id,
    managedTeam: user.managedTeam,
    dateRange
  }), [userRole, user.id, user.managedTeam, dateRange]);

  const loadChartsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 DashboardCharts: Loading charts data...', filters);
      
      const data = await chartsService.getChartsData(filters);
      setChartsData(data);
      
      console.log('✅ DashboardCharts: Charts data loaded successfully');
    } catch (err) {
      console.error('❌ DashboardCharts: Error loading charts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load charts');
      toast({
        title: "Error",
        description: "Failed to load chart data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChartsData();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Charts data refreshed successfully"
    });
  };

  useEffect(() => {
    loadChartsData();
  }, [filters]);

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
                ? formatCurrency(entry.value) 
                : formatNumber(entry.value)}
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
            {data.name.includes('Status') ? `${data.value} deals` : formatCurrency(data.value)}
          </p>
          {data.payload.percentage && (
            <p className="text-sm text-gray-500">{data.payload.percentage}%</p>
          )}
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
          <Button onClick={loadChartsData} variant="outline">
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
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-600">
            {userRole === 'manager' 
              ? 'System-wide analytics and performance metrics'
              : userRole === 'team-leader'
              ? `Team ${user.managedTeam} + Personal analytics`
              : 'Your personal performance analytics'
            }
          </p>
        </div>
        <div className="flex items-center gap-4">
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
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {chartsData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Deals</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatNumber(chartsData.summary.total_deals)}
                  </p>
                </div>
                <div className="p-3 bg-blue-500 rounded-full">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(chartsData.summary.total_revenue)}
                  </p>
                </div>
                <div className="p-3 bg-green-500 rounded-full">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Avg Deal Size</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {formatCurrency(chartsData.summary.avg_deal_size)}
                  </p>
                </div>
                <div className="p-3 bg-amber-500 rounded-full">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Active Agents</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatNumber(chartsData.summary.unique_agents)}
                  </p>
                </div>
                <div className="p-3 bg-purple-500 rounded-full">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales Trend Chart */}
        {chartsData.salesTrend && chartsData.salesTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Sales Trend
              </CardTitle>
              <CardDescription>Daily sales performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartsData.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="deals" fill="#3B82F6" name="Deals" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Sales by Agent Chart */}
        {chartsData.salesByAgent && chartsData.salesByAgent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Sales by Agent
              </CardTitle>
              <CardDescription>Top performing sales agents</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartsData.salesByAgent.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="agent" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Sales by Team Pie Chart */}
        {chartsData.salesByTeam && chartsData.salesByTeam.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2" />
                Sales by Team
              </CardTitle>
              <CardDescription>Revenue distribution across teams</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartsData.salesByTeam}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ team, percentage }) => `${team} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                    nameKey="team"
                  >
                    {chartsData.salesByTeam.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Deal Status Distribution */}
        {chartsData.dealStatus && chartsData.dealStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Deal Status
              </CardTitle>
              <CardDescription>Distribution of deal statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartsData.dealStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percentage }) => `${status} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                  >
                    {chartsData.dealStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Monthly Revenue Comparison */}
        {chartsData.monthlyRevenue && chartsData.monthlyRevenue.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Monthly Revenue
              </CardTitle>
              <CardDescription>Revenue comparison by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartsData.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Callback Performance */}
        {chartsData.callbackPerformance && chartsData.callbackPerformance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Callback Performance
              </CardTitle>
              <CardDescription>Callback completion trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartsData.callbackPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="total" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Total" />
                  <Area type="monotone" dataKey="completed" stackId="2" stroke="#10B981" fill="#10B981" name="Completed" />
                  <Area type="monotone" dataKey="pending" stackId="3" stroke="#F59E0B" fill="#F59E0B" name="Pending" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
