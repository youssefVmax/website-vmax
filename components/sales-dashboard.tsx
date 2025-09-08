import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, ZAxis } from 'recharts';
import { TrendingUp, DollarSign, Users, Target, Calendar, Award, UserCheck, BarChart3 } from 'lucide-react';
import { useSalesData } from '@/hooks/useSalesData';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7300'];

interface DealData {
  date: Date;
  amount: number;
  salesAgent: string;
  closingAgent: string;
  service: string;
  program: string;
  team: string;
  duration: string;
  customer_name: string;
  [key: string]: any; // For other CSV fields
}

interface SalesAnalysisDashboardProps {
  userRole: 'manager' | 'salesman' | 'customer-service';
  user: { id: string; name: string; username: string };
}

interface AnalyticsData {
  totalSales: number;
  totalDeals: number;
  averageDealSize: number;
  salesByAgent: Array<{ agent: string; sales: number; deals: number }>;
  salesByService: Array<{ service: string; sales: number }>;
  salesByTeam: Array<{ team: string; sales: number }>;
  salesByProgram: Array<{ program: string; sales: number }>;
  dailyTrend: Array<{ date: string; sales: number }>;
  topAgents: Array<{ agent: string; sales: number; deals: number }>;
  recentDeals: DealData[];
  filteredData: DealData[];
  userAnalysisData: any;
}

function SalesAnalysisDashboard({ userRole, user }: SalesAnalysisDashboardProps) {
  // Use live data with real-time updates via SSE
  const { sales, loading, error, refresh } = useSalesData(userRole, user?.id, user?.name);

  // Normalize to DealData for charts/KPIs
  const salesData: DealData[] = (sales || []).map((row: any) => ({
    ...row,
    date: new Date(row.date),
    amount: typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount)) || 0,
    salesAgent: row.sales_agent_norm?.toLowerCase?.() || row.sales_agent?.toLowerCase?.() || '',
    closingAgent: row.closing_agent_norm?.toLowerCase?.() || row.closing_agent?.toLowerCase?.() || '',
    service: row.type_service || row.service_tier || 'Unknown',
    program: row.product_type || row.service_tier || 'Unknown',
    team: row.team || row.sales_team || 'Unknown',
    duration: row.duration || `${row.duration_months || ''}`,
    customer_name: row.customer_name || 'Unknown',
  }));

  // Calculate metrics based on role
  const analytics = useMemo<AnalyticsData | null>(() => {
    if (!salesData.length) return null;

    let filteredData = salesData;
    
    // Filter data based on user role
    if (userRole === 'salesman' && user) {
      const agentName = user.name.toLowerCase();
      filteredData = salesData.filter(deal => 
        (deal.salesAgent?.toLowerCase() === agentName) || 
        (deal.closingAgent?.toLowerCase() === agentName)
      );
    }

    const totalSales = filteredData.reduce((sum, deal) => sum + (deal.amount || 0), 0);
    const totalDeals = filteredData.length;
    const averageDealSize = totalDeals > 0 ? totalSales / totalDeals : 0;

    // Initialize typed objects for aggregations
    const salesByAgent: { [key: string]: { agent: string; sales: number; deals: number } } = {};
    const salesByService: { [key: string]: { service: string; sales: number } } = {};
    const salesByTeam: { [key: string]: { team: string; sales: number } } = {};
    const salesByProgram: { [key: string]: { program: string; sales: number } } = {};
    const dailyTrend: { [key: string]: { date: string; sales: number } } = {};

    // Process data for aggregations
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

      // Sales by team
      const team = deal.team || 'Unknown';
      if (!salesByTeam[team]) {
        salesByTeam[team] = { team, sales: 0 };
      }
      salesByTeam[team].sales += deal.amount || 0;

      // Sales by program
      const program = deal.program || 'Unknown';
      if (!salesByProgram[program]) {
        salesByProgram[program] = { program, sales: 0 };
      }
      salesByProgram[program].sales += deal.amount || 0;

      // Daily trend
      const dateStr = deal.date?.toISOString().split('T')[0] || 'Unknown';
      if (!dailyTrend[dateStr]) {
        dailyTrend[dateStr] = { date: dateStr, sales: 0 };
      }
      dailyTrend[dateStr].sales += deal.amount || 0;
    });

    // Convert to arrays and sort
    const sortedAgents = Object.values(salesByAgent)
      .sort((a, b) => b.sales - a.sales);
      
    const sortedServices = Object.values(salesByService)
      .sort((a, b) => b.sales - a.sales);
      
    const sortedTeams = Object.values(salesByTeam)
      .sort((a, b) => b.sales - a.sales);
      
    const sortedPrograms = Object.values(salesByProgram)
      .sort((a, b) => b.sales - a.sales);
      
    const sortedDailyTrend = Object.values(dailyTrend)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get top 10 agents for the table
    const topAgents = sortedAgents.slice(0, 10).map(agent => ({
      agent: agent.agent,
      sales: agent.sales,
      deals: agent.deals
    }));
    
    // Get recent deals (last 10)
    const recentDeals = [...filteredData]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // User analysis data
    const userAnalysisData = [
      { name: 'Deals Closed', value: totalDeals },
      { name: 'Total Sales', value: totalSales },
      { name: 'Avg. Deal Size', value: Math.round(averageDealSize) },
      { name: 'Top Service', value: sortedServices[0]?.service || 'N/A' },
    ];

    return {
      totalSales,
      totalDeals,
      averageDealSize,
      salesByAgent: sortedAgents,
      salesByService: sortedServices,
      salesByTeam: sortedTeams,
      salesByProgram: sortedPrograms,
      dailyTrend: sortedDailyTrend,
      topAgents,
      recentDeals,
      filteredData,
      userAnalysisData
    };
  }, [salesData, userRole, user]);

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
          <p className="text-red-600">Error loading data: {error.message}</p>
          <button onClick={refresh} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics || analytics.totalDeals === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600 mb-4">No deals found. Start by adding your first deal!</p>
          <div className="text-sm text-gray-500">
            <p>• Total Sales: $0.00</p>
            <p>• Total Deals: 0</p>
            <p>• Average Deal Size: $0.00</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Status Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Sales Analytics</h2>
          <p className="text-sm text-muted-foreground">
            {userRole === 'manager' 
              ? `Team performance • ${analytics.totalDeals} deals • $${analytics.totalSales.toLocaleString()}`
              : userRole === 'salesman'
              ? `Your performance • ${analytics.totalDeals} deals • $${analytics.totalSales.toLocaleString()}`
              : `Support metrics • ${analytics.totalDeals} interactions`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Live Data
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">${analytics.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deals</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalDeals}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Deal</p>
                <p className="text-2xl font-bold text-gray-900">${Number(analytics.averageDealSize).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Agent Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${analytics.topAgents[0]?.sales?.toLocaleString() || '0'}
                </p>
              </div>
              <Award className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Sales']} />
                  <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Agents */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topAgents.slice(0, 8)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="agent" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(value) => [`$${value}`, 'Sales']} />
                  <Bar dataKey="sales" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales by Service */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
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
                    label={(entry: any) => `${entry.service}: ${((entry.sales / analytics.totalSales) * 100 || 0).toFixed(0)}%`}
                  >
                    {analytics.salesByService.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Sales']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Team */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.salesByTeam}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="team" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Sales']} />
                  <Bar dataKey="sales" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Count Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center">
                <UserCheck className="mr-2 h-5 w-5" />
                User Count Distribution
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.userAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'value') return [value, 'Count'];
                    return [value, name];
                  }} />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by User Count */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Revenue by User Count
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={analytics.userAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="name" name="Users" />
                  <YAxis type="number" dataKey="value" name="Revenue" />
                  <ZAxis type="number" dataKey="name" name="Deals" range={[50, 300]} />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'name') return [value, 'Users per Deal'];
                    if (name === 'value') return [`$${value}`, 'Total Revenue'];
                    return [value, name];
                  }} />
                  <Scatter name="Deals" fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Service</th>
                  <th className="text-left py-2">Sales Agent</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentDeals.map((deal, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2">{deal.date.toLocaleDateString()}</td>
                    <td className="py-2">{deal.customer_name}</td>
                    <td className="py-2 font-semibold">${deal.amount}</td>
                    <td className="py-2">{deal.service}</td>
                    <td className="py-2 capitalize">{deal.salesAgent}</td>
                    <td className="py-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance Table (Manager only) */}
      {userRole === 'manager' && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Agent Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Agent</th>
                    <th className="text-left py-2">Total Sales</th>
                    <th className="text-left py-2">Deals Count</th>
                    <th className="text-left py-2">Average Deal</th>
                    <th className="text-left py-2">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topAgents.map((agent, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2 capitalize font-medium">{agent.agent}</td>
                      <td className="py-2 font-semibold">${agent.sales.toLocaleString()}</td>
                      <td className="py-2">{agent.deals}</td>
                      <td className="py-2">${(agent.sales / agent.deals).toFixed(0)}</td>
                      <td className="py-2">
                        <div className="flex items-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(agent.sales / analytics.topAgents[0].sales) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">
                            {((agent.sales / analytics.topAgents[0].sales) * 100).toFixed(0)}%
                          </span>
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
    </div>
  );
}

export default SalesAnalysisDashboard;