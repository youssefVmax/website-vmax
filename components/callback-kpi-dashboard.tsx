"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw, Filter
} from 'lucide-react';
import { callbackAnalyticsService, CallbackKPIs, CallbackFilters } from '@/lib/callback-analytics-service';
import { callbacksService } from '@/lib/firebase-callbacks-service';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface CallbackKPIDashboardProps {
  userRole: 'manager' | 'salesman' | 'customer-service';
  user: { id: string; name: string; username: string };
}

export default function CallbackKPIDashboard({ userRole, user }: CallbackKPIDashboardProps) {
  const [kpis, setKpis] = useState<CallbackKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CallbackFilters>({
    userRole,
    userId: user.id
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadKPIs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await callbackAnalyticsService.getCallbackKPIs(filters);
      setKpis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load callback KPIs');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadKPIs();
    setRefreshing(false);
  };

  useEffect(() => {
    loadKPIs();
  }, [filters]);

  // Auto-refresh every 30 seconds for live data
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time listener for live updates
  useEffect(() => {
    const unsubscribe = callbacksService.onCallbacksChange(
      () => {
        // Refresh KPIs when callbacks change
        loadKPIs();
      },
      userRole,
      user.id,
      user.name
    );

    return () => unsubscribe();
  }, [userRole, user.id, user.name]);

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
          <h2 className="text-2xl font-bold">Callback Analytics</h2>
          <p className="text-sm text-muted-foreground">
            {userRole === 'manager' 
              ? `Team callback performance • ${kpis.totalCallbacks} total callbacks`
              : userRole === 'salesman'
              ? `Your callback performance • ${kpis.totalCallbacks} callbacks`
              : `Support callback metrics • ${kpis.totalCallbacks} interactions`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live Data
          </div>
          <Button 
            onClick={refreshData} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Callbacks</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.totalCallbacks}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {kpis.pendingCallbacks} pending
                </p>
              </div>
              <Phone className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {kpis.completedCallbacks} completed
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatResponseTime(kpis.averageResponseTime)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Median: {formatResponseTime(kpis.responseTimeMetrics.medianHours)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Callbacks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpis.pendingCallbacks + kpis.contactedCallbacks}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Need attention
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
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
                  <Bar dataKey="count" fill="#8884d8" />
                  <Bar dataKey="conversions" fill="#82ca9d" />
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

      {/* Response Time Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {formatResponseTime(kpis.responseTimeMetrics.averageHours)}
              </p>
              <p className="text-sm text-gray-600">Average</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatResponseTime(kpis.responseTimeMetrics.medianHours)}
              </p>
              <p className="text-sm text-gray-600">Median</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {formatResponseTime(kpis.responseTimeMetrics.fastest)}
              </p>
              <p className="text-sm text-gray-600">Fastest</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {formatResponseTime(kpis.responseTimeMetrics.slowest)}
              </p>
              <p className="text-sm text-gray-600">Slowest</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
