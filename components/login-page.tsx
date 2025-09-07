import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Users, Target } from 'lucide-react';

interface DealData {
  date: Date;
  amount: number;
  salesAgent: string;
  closingAgent: string;
  service: string;
  program: string;
  team: string;
  duration: string;
  [key: string]: any;
}

interface AnalyticsData {
  totalSales: number;
  totalDeals: number;
  averageDealSize: number;
  salesByAgent: { agent: string; sales: number; deals: number }[];
  salesByService: { service: string; sales: number }[];
  dailyTrend: { date: string; sales: number }[];
  recentDeals: DealData[];
}

interface User {
  name?: string;
  username?: string;
  [key: string]: any;
}

interface SalesAnalysisDashboardProps {
  userRole: 'manager' | 'salesman' | 'customer-service';
  user?: User;
}

export function SalesAnalysisDashboard({ 
  userRole, 
  user = { name: 'User', username: 'user' } 
}: SalesAnalysisDashboardProps) {
  const [salesData, setSalesData] = useState<DealData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load sales data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/sales');
        if (!response.ok) {
          throw new Error(`Failed to fetch sales data (status ${response.status})`);
        }

        const sales = await response.json();

        const processedData: DealData[] = (sales as any[]).map((row: any) => {
          // Safely parse the date
          let dateValue: Date;
          try {
            const rawDate = row.date ?? '';
            dateValue = rawDate ? new Date(rawDate) : new Date();
            if (isNaN(dateValue.getTime())) {
              dateValue = new Date();
            }
          } catch (e) {
            dateValue = new Date();
          }

          const salesAgentNorm = (row.sales_agent_norm ?? row.sales_agent ?? '').toString();
          const closingAgentNorm = (row.closing_agent_norm ?? row.closing_agent ?? '').toString();

          return {
            ...row,
            date: dateValue,
            amount: typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount)) || 0,
            salesAgent: salesAgentNorm.toLowerCase(),
            closingAgent: closingAgentNorm.toLowerCase(),
            service: (row.type_service ?? 'Unknown') as string,
            program: (row.type_program ?? 'Unknown') as string,
            team: (row.team ?? 'Unknown') as string,
            duration: (row.duration ?? 'Unknown') as string,
          };
        });

        setSalesData(processedData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading sales data:', err);
        setError('Failed to load sales data from API.');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate analytics
  const analytics = useMemo<AnalyticsData | null>(() => {
    if (!salesData.length) return null;

    let filteredData = salesData;
    
    if (userRole === 'salesman' && user?.name) {
      const agentName = user.name.toLowerCase();
      filteredData = salesData.filter(deal => 
        (deal.salesAgent?.toLowerCase() === agentName) || 
        (deal.closingAgent?.toLowerCase() === agentName)
      );
    }

    const totalSales = filteredData.reduce((sum, deal) => sum + (deal.amount || 0), 0);
    const totalDeals = filteredData.length;
    const averageDealSize = totalDeals > 0 ? totalSales / totalDeals : 0;

    // Process data for aggregations
    const salesByAgent: Record<string, { agent: string; sales: number; deals: number }> = {};
    const salesByService: Record<string, { service: string; sales: number }> = {};
    const dailyTrend: Record<string, { date: string; sales: number }> = {};

    filteredData.forEach(deal => {
      // Sales by agent
      const agentName = deal.salesAgent || 'Unknown';
      if (!salesByAgent[agentName]) {
        salesByAgent[agentName] = { agent: agentName, sales: 0, deals: 0 };
      }
      salesByAgent[agentName].sales += deal.amount || 0;
      salesByAgent[agentName].deals += 1;

      // Sales by service
      const service = deal.service || 'Unknown';
      if (!salesByService[service]) {
        salesByService[service] = { service, sales: 0 };
      }
      salesByService[service].sales += deal.amount || 0;

      // Daily trend - handle invalid dates
      try {
        const date = deal.date;
        if (date && !isNaN(date.getTime())) {
          const dateStr = date.toISOString().split('T')[0];
          if (!dailyTrend[dateStr]) {
            dailyTrend[dateStr] = { date: dateStr, sales: 0 };
          }
          dailyTrend[dateStr].sales += deal.amount || 0;
        }
      } catch (e) {
        console.warn('Invalid date in record:', deal);
      }
    });

    // Sort and format data
    const sortedAgents = Object.values(salesByAgent).sort((a, b) => b.sales - a.sales);
    const sortedServices = Object.values(salesByService).sort((a, b) => b.sales - a.sales);
    const sortedDailyTrend = Object.values(dailyTrend)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get recent deals
    const recentDeals = [...filteredData]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);

    return {
      totalSales,
      totalDeals,
      averageDealSize,
      salesByAgent: sortedAgents,
      salesByService: sortedServices,
      dailyTrend: sortedDailyTrend,
      recentDeals
    };
  }, [salesData, userRole, user]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p>Loading sales data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state
  if (!analytics) {
    return (
      <div className="flex items-center justify-center p-6">
        <Card>
          <CardContent className="p-6">
            <p>No sales data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="text-muted-foreground">
              {userRole === 'manager' 
                ? 'Here\'s an overview of your team\'s performance.'
                : 'Here\'s your sales performance overview.'}
            </p>
          </div>
        </div>

        {/* Metrics cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.totalSales.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+20.1% from last month</p>
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalDeals.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+12.5% from last month</p>
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Deal Size</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${Math.round(analytics.averageDealSize).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+6.8% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Sales Trend */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sales by Service */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Sales by Service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.salesByService}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="sales"
                      nameKey="service"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.salesByService.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${(index * 360) / analytics.salesByService.length}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value}`, 'Sales']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SalesAnalysisDashboard;