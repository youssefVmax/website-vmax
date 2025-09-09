import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, ComposedChart, ReferenceLine,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calendar, Filter, Download, 
  DollarSign, Target, Users, Award, BarChart3, Activity
} from 'lucide-react';
import { useFirebaseSalesData } from "@/hooks/useFirebaseSalesData";

const COLORS = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1', '#84cc16', '#f97316'];

interface EnhancedAnalyticsProps {
  userRole: 'manager' | 'salesman' | 'customer-service';
  user: { id: string; name: string; username: string };
}

interface TimeSeriesData {
  date: string;
  sales: number;
  deals: number;
  avgDealSize: number;
  cumulativeSales: number;
}

interface PerformanceMetrics {
  currentPeriod: number;
  previousPeriod: number;
  growth: number;
  trend: 'up' | 'down' | 'stable';
}

function EnhancedAnalytics({ userRole, user }: EnhancedAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('30d');
  const [chartType, setChartType] = useState('line');
  const [selectedMetric, setSelectedMetric] = useState('sales');
  
  const { sales, loading, error } = useFirebaseSalesData(userRole, user?.id, user?.name);

  // Process data for time-series analysis
  const timeSeriesData = useMemo(() => {
    if (!sales?.length) return [];

    const now = new Date();
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Filter data by time range and user role
    let filteredSales = sales.filter((sale: any) => {
      const saleDate = new Date(sale.date);
      return saleDate >= startDate;
    });

    if (userRole === 'salesman' && user) {
      const agentName = user.name.toLowerCase();
      filteredSales = filteredSales.filter((sale: any) => 
        sale.sales_agent?.toLowerCase() === agentName || 
        sale.closing_agent?.toLowerCase() === agentName
      );
    }

    // Group by date
    const dailyData: { [key: string]: { sales: number; deals: number; amounts: number[] } } = {};
    
    filteredSales.forEach((sale: any) => {
      const dateStr = new Date(sale.date).toISOString().split('T')[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { sales: 0, deals: 0, amounts: [] };
      }
      const amount = parseFloat(sale.amount) || 0;
      dailyData[dateStr].sales += amount;
      dailyData[dateStr].deals += 1;
      dailyData[dateStr].amounts.push(amount);
    });

    // Convert to time series with cumulative data
    let cumulativeSales = 0;
    const result: TimeSeriesData[] = [];
    
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const dayData = dailyData[dateStr] || { sales: 0, deals: 0, amounts: [] };
      
      cumulativeSales += dayData.sales;
      const avgDealSize = dayData.deals > 0 ? dayData.sales / dayData.deals : 0;
      
      result.push({
        date: dateStr,
        sales: dayData.sales,
        deals: dayData.deals,
        avgDealSize,
        cumulativeSales
      });
    }

    return result;
  }, [sales, timeRange, userRole, user]);

  // Calculate performance metrics
  const performanceMetrics = useMemo((): PerformanceMetrics => {
    if (!timeSeriesData.length) return { currentPeriod: 0, previousPeriod: 0, growth: 0, trend: 'stable' };

    const midPoint = Math.floor(timeSeriesData.length / 2);
    const firstHalf = timeSeriesData.slice(0, midPoint);
    const secondHalf = timeSeriesData.slice(midPoint);

    const firstHalfTotal = firstHalf.reduce((sum, day) => sum + day.sales, 0);
    const secondHalfTotal = secondHalf.reduce((sum, day) => sum + day.sales, 0);

    const growth = firstHalfTotal > 0 ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100 : 0;
    const trend = growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable';

    return {
      currentPeriod: secondHalfTotal,
      previousPeriod: firstHalfTotal,
      growth,
      trend
    };
  }, [timeSeriesData]);

  // Enhanced metric cards with animations
  const MetricCard = ({ title, value, icon: Icon, trend, change, color = 'blue' }: {
    title: string;
    value: string;
    icon: any;
    trend: 'up' | 'down' | 'stable';
    change: string;
    color?: string;
  }) => {
    const colorClasses = {
      blue: 'from-blue-500/10 to-cyan-500/10 border-blue-200/50',
      green: 'from-emerald-500/10 to-green-500/10 border-emerald-200/50',
      purple: 'from-purple-500/10 to-violet-500/10 border-purple-200/50',
      orange: 'from-orange-500/10 to-amber-500/10 border-orange-200/50'
    };

    return (
      <Card className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:scale-105 group relative overflow-hidden`}>
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${color === 'blue' ? 'from-blue-500 to-cyan-500' : color === 'green' ? 'from-emerald-500 to-green-500' : color === 'purple' ? 'from-purple-500 to-violet-500' : 'from-orange-500 to-amber-500'}`}></div>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                {value}
              </p>
              <div className="flex items-center space-x-2">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  trend === 'up' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                  trend === 'down' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                  'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                }`}>
                  {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : trend === 'down' ? <TrendingDown className="w-3 h-3 mr-1" /> : <Activity className="w-3 h-3 mr-1" />}
                  {change}
                </div>
              </div>
            </div>
            <div className={`p-3 rounded-full bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`h-8 w-8 ${color === 'blue' ? 'text-blue-600' : color === 'green' ? 'text-emerald-600' : color === 'purple' ? 'text-purple-600' : 'text-orange-600'}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-80 bg-muted rounded"></div>
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
          <p className="text-red-600 mb-4">Error loading analytics data</p>
          <Button variant="outline">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const totalSales = timeSeriesData.reduce((sum, day) => sum + day.sales, 0);
  const totalDeals = timeSeriesData.reduce((sum, day) => sum + day.deals, 0);
  const avgDealSize = totalDeals > 0 ? totalSales / totalDeals : 0;
  const peakDay = timeSeriesData.reduce((max, day) => day.sales > max.sales ? day : max, timeSeriesData[0] || { sales: 0 });

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Enhanced Analytics
          </h2>
          <p className="text-muted-foreground">Interactive time-series analysis and performance insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="area">Area Chart</SelectItem>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="composed">Combined</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Enhanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`$${totalSales.toLocaleString()}`}
          icon={DollarSign}
          trend={performanceMetrics.trend}
          change={`${performanceMetrics.growth.toFixed(1)}%`}
          color="blue"
        />
        <MetricCard
          title="Total Deals"
          value={totalDeals.toString()}
          icon={Target}
          trend={performanceMetrics.trend}
          change={`${Math.abs(performanceMetrics.growth).toFixed(1)}%`}
          color="green"
        />
        <MetricCard
          title="Avg Deal Size"
          value={`$${avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={TrendingUp}
          trend={performanceMetrics.trend}
          change={`${performanceMetrics.growth.toFixed(1)}%`}
          color="purple"
        />
        <MetricCard
          title="Peak Day Sales"
          value={`$${peakDay?.sales?.toLocaleString() || '0'}`}
          icon={Award}
          trend="up"
          change={new Date(peakDay?.date || '').toLocaleDateString()}
          color="orange"
        />
      </div>

      {/* Interactive Time-Series Chart */}
      <Card className="bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Sales Performance Over Time
            </CardTitle>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Daily Sales</SelectItem>
                <SelectItem value="deals">Daily Deals</SelectItem>
                <SelectItem value="avgDealSize">Avg Deal Size</SelectItem>
                <SelectItem value="cumulativeSales">Cumulative Sales</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' && (
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [
                      selectedMetric === 'sales' || selectedMetric === 'cumulativeSales' ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString(),
                      name === 'sales' ? 'Sales' : name === 'deals' ? 'Deals' : name === 'avgDealSize' ? 'Avg Deal Size' : 'Cumulative Sales'
                    ]}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={selectedMetric} 
                    stroke="#06b6d4" 
                    strokeWidth={3}
                    dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#06b6d4', strokeWidth: 2 }}
                  />
                </LineChart>
              )}
              
              {chartType === 'area' && (
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [
                      selectedMetric === 'sales' || selectedMetric === 'cumulativeSales' ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString(),
                      selectedMetric === 'sales' ? 'Sales' : selectedMetric === 'deals' ? 'Deals' : selectedMetric === 'avgDealSize' ? 'Avg Deal Size' : 'Cumulative Sales'
                    ]}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={selectedMetric} 
                    stroke="#06b6d4" 
                    fill="url(#colorGradient)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              )}
              
              {chartType === 'bar' && (
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [
                      selectedMetric === 'sales' || selectedMetric === 'cumulativeSales' ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString(),
                      selectedMetric === 'sales' ? 'Sales' : selectedMetric === 'deals' ? 'Deals' : selectedMetric === 'avgDealSize' ? 'Avg Deal Size' : 'Cumulative Sales'
                    ]}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Bar dataKey={selectedMetric} fill="#06b6d4" radius={[2, 2, 0, 0]} />
                </BarChart>
              )}
              
              {chartType === 'composed' && (
                <ComposedChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'sales' || name === 'cumulativeSales' ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString(),
                      name === 'sales' ? 'Sales' : name === 'deals' ? 'Deals' : name === 'avgDealSize' ? 'Avg Deal Size' : 'Cumulative Sales'
                    ]}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Bar yAxisId="left" dataKey="sales" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="deals" stroke="#10b981" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulativeSales" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EnhancedAnalytics;
