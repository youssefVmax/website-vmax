"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { 
  TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, 
  RefreshCw, Calendar, Users, DollarSign, Target, Award, Phone
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useMySQLSalesData } from '@/hooks/useMySQLSalesData';

interface ComprehensiveAnalyticsProps {
  userRole: 'manager' | 'salesman' | 'team_leader';
  userId?: string;
  userName?: string;
  userTeam?: string;
  managedTeam?: string;
}

export function EnhancedComprehensiveAnalytics({ 
  userRole, 
  userId, 
  userName, 
  userTeam,
  managedTeam 
}: ComprehensiveAnalyticsProps) {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Use MySQL data hook for comprehensive analytics
  const { 
    deals, 
    callbacks, 
    loading, 
    error, 
    refreshData 
  } = useMySQLSalesData({
    userRole: userRole || 'salesman',
    userId: userId || '',
    userName: userName || '',
    managedTeam: managedTeam || userTeam
  });

  // Process comprehensive analytics data
  const analyticsData = useMemo(() => {
    const dealsData = deals || [];
    const callbacksData = callbacks || [];
    
    // Revenue trends (monthly)
    const revenueTrends = deals.reduce((acc: any[], deal) => {
      const date = new Date(deal.createdAt || Date.now());
      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const amount = typeof deal.amount_paid === 'string' ? parseFloat(deal.amount_paid) : (deal.amount_paid || 0);
      
      const existing = acc.find(item => item.month === monthYear);
      if (existing) {
        existing.revenue += amount;
        existing.deals += 1;
      } else {
        acc.push({ month: monthYear, revenue: amount, deals: 1 });
      }
      return acc;
    }, []).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()).slice(-12);

    // Top agents performance
    const topAgents = deals.reduce((acc: any[], deal) => {
      const agent = deal.salesAgentName || 'Unknown Agent';
      const amount = typeof deal.amount_paid === 'string' ? parseFloat(deal.amount_paid) : (deal.amount_paid || 0);
      
      const existing = acc.find(item => item.agent === agent);
      if (existing) {
        existing.revenue += amount;
        existing.deals += 1;
        existing.avgDeal = existing.revenue / existing.deals;
      } else {
        acc.push({ agent, revenue: amount, deals: 1, avgDeal: amount });
      }
      return acc;
    }, []).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Service distribution
    const serviceDistribution = deals.reduce((acc: any[], deal) => {
      const service = deal.service_tier || deal.serviceTier || 'Unknown';
      const amount = typeof deal.amount_paid === 'string' ? parseFloat(deal.amount_paid) : (deal.amount_paid || 0);
      
      const existing = acc.find(item => item.service === service);
      if (existing) {
        existing.revenue += amount;
        existing.deals += 1;
      } else {
        acc.push({ service, revenue: amount, deals: 1 });
      }
      return acc;
    }, []);

    // Callback conversion analysis
    const callbackConversion = callbacks.reduce((acc: any[], callback) => {
      const status = callback.status || 'pending';
      const existing = acc.find(item => item.status === status);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ status, count: 1 });
      }
      return acc;
    }, []);

    // Team performance (manager only)
    const teamPerformance = userRole === 'manager' ? deals.reduce((acc: any[], deal) => {
      const team = deal.salesTeam || deal.salesTeam || 'Unknown Team';
      const amount = typeof deal.amount_paid === 'string' ? parseFloat(deal.amount_paid) : (deal.amount_paid || 0);
      
      const existing = acc.find(item => item.team === team);
      if (existing) {
        existing.revenue += amount;
        existing.deals += 1;
        existing.avgDeal = existing.revenue / existing.deals;
      } else {
        acc.push({ team, revenue: amount, deals: 1, avgDeal: amount });
      }
      return acc;
    }, []).sort((a, b) => b.revenue - a.revenue) : [];

    return {
      revenueTrends,
      topAgents,
      serviceDistribution,
      callbackConversion,
      teamPerformance
    };
  }, [deals, callbacks, userRole]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setLastUpdated(new Date());
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Analytics data refreshed successfully"
    });
  };

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

  // Custom tooltip
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-200 rounded"></div>
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
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">Error loading analytics: {error?.message || 'Unknown error'}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = (deals || []).reduce((sum, deal) => sum + (typeof deal.amount_paid === 'string' ? parseFloat(deal.amount_paid) : (deal.amount_paid || 0)), 0);
  const totalDeals = deals?.length || 0;
  const totalCallbacks = callbacks?.length || 0;
  const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Comprehensive Analytics</h2>
          <p className="text-muted-foreground">
            Complete business intelligence dashboard for {userRole === 'manager' ? 'all teams' : 'your performance'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
          </Badge>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Deals</p>
                <p className="text-2xl font-bold">{totalDeals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Deal Size</p>
                <p className="text-2xl font-bold">${avgDealSize.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Callbacks</p>
                <p className="text-2xl font-bold">{totalCallbacks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Revenue Trends */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Revenue Trends
                </CardTitle>
                <CardDescription>Monthly revenue and deal count over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Revenue ($)" />
                    <Line yAxisId="right" type="monotone" dataKey="deals" stroke="#10B981" strokeWidth={2} name="Deals" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-green-600" />
                  Service Distribution
                </CardTitle>
                <CardDescription>Revenue by service tier</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.serviceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                      nameKey="service"
                    >
                      {analyticsData.serviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Callback Conversion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-red-600" />
                  Callback Status
                </CardTitle>
                <CardDescription>Callback completion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.callbackConversion}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="status"
                    >
                      {analyticsData.callbackConversion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top Agents */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-purple-600" />
                  Top Performing Agents
                </CardTitle>
                <CardDescription>Agent performance by revenue and deals</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.topAgents} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="agent" type="category" width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8B5CF6" name="Revenue ($)" />
                    <Bar dataKey="deals" fill="#10B981" name="Deals" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Team Performance (Manager only) */}
            {userRole === 'manager' && analyticsData.teamPerformance.length > 0 && (
              <Card className="col-span-full">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-indigo-600" />
                    Team Performance
                  </CardTitle>
                  <CardDescription>Performance comparison across teams</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.teamPerformance}>
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnhancedComprehensiveAnalytics;
