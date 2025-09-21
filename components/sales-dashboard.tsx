import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, ZAxis } from 'recharts';
import { TrendingUp, DollarSign, Users, Target, Calendar, Award, UserCheck, BarChart3, Phone, Clock } from 'lucide-react';
import { useMySQLSalesData } from "@/hooks/useMySQLSalesData";
import { callbackAnalyticsService } from '@/lib/callback-analytics-service';
import CallbackKPIDashboard from './callback-kpi-dashboard';

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
  userRole: 'manager' | 'salesman' | 'team-leader';
  user: { id: string; name: string; username: string; managedTeam?: string };
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
  const [activeTab, setActiveTab] = useState('sales');
  const [callbackMetrics, setCallbackMetrics] = useState<any>(null);

  // Use live data with real-time updates via SSE
  const { deals, callbacks, targets, loading, error, refreshData, analytics: hookAnalytics } = useMySQLSalesData({ 
    userRole: userRole, 
    userId: user?.id, 
    userName: user?.name,
    managedTeam: user?.managedTeam
  });

  // Load callback metrics for quick overview with real-time updates
  useEffect(() => {
    if (!user) return;
    
    const loadCallbackMetrics = async () => {
      try {
        console.log('Loading callback metrics for:', { userRole, userId: user.id, userName: user.name });
        const metrics = await callbackAnalyticsService.getLiveCallbackMetrics(userRole, user.id, user.name);
        console.log('Callback metrics loaded:', metrics);
        setCallbackMetrics(metrics);
      } catch (err) {
        console.error('Failed to load callback metrics:', err);
      }
    };

    // Initial load
    loadCallbackMetrics();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadCallbackMetrics, 30000);

    return () => clearInterval(interval);
  }, [user, userRole]);

  // Normalize to DealData for charts/KPIs
  const salesData: DealData[] = (deals || []).map((row: any) => ({
    ...row,
    date: new Date(row.signupDate || row.createdAt),
    amount: typeof row.amountPaid === 'number' ? row.amountPaid : parseFloat(String(row.amountPaid)) || 0,
    salesAgent: row.salesAgentName?.toLowerCase?.() || '',
    closingAgent: row.closingAgentName?.toLowerCase?.() || '',
    service: row.serviceTier || 'Unknown',
    program: row.serviceTier || 'Unknown',
    team: row.salesTeam || 'Unknown',
    duration: `${row.durationMonths || ''}`,
    customer_name: row.customerName || 'Unknown',
  }));

  // Calculate metrics based on role
  const computedAnalytics = useMemo<AnalyticsData | null>(() => {
    if (!salesData.length) return null;

    let filteredData = salesData;
    
    // Filter data based on user role
    if (userRole === 'salesman' && user) {
      const agentName = user.name.toLowerCase();
      filteredData = salesData.filter(deal => 
        (deal.salesAgent?.toLowerCase() === agentName) || 
        (deal.closingAgent?.toLowerCase() === agentName)
      );
    } else if (userRole === 'team-leader' && user?.managedTeam) {
      // Team leaders see their team's data + their own deals
      filteredData = salesData.filter(deal => 
        deal.team === user.managedTeam || 
        deal.salesAgent?.toLowerCase() === user.name.toLowerCase() ||
        deal.closingAgent?.toLowerCase() === user.name.toLowerCase()
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
      // Sales by agent - use closing agent for salesman role, sales agent for others
      const agentName = userRole === 'salesman' ? (deal.closingAgent || 'Unknown') : (deal.salesAgent || 'Unknown');
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
          <button onClick={refreshData} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const hasData = !!computedAnalytics && computedAnalytics.totalDeals > 0;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
          <TabsTrigger value="callbacks">Callback Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sales" className="space-y-6">
      {/* When no sales data, show an empty state but keep tabs visible */}
      {!hasData ? (
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
      ) : (
        <>
      {/* Real-time Status Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Sales Analytics</h2>
          <p className="text-sm text-muted-foreground">
            {userRole === 'manager' 
              ? `Team performance • ${computedAnalytics.totalDeals} deals • $${computedAnalytics.totalSales.toLocaleString()}`
              : userRole === 'team-leader'
              ? `Team ${user?.managedTeam} + Personal • ${computedAnalytics.totalDeals} deals • $${computedAnalytics.totalSales.toLocaleString()}`
              : `Your performance • ${computedAnalytics.totalDeals} deals • $${computedAnalytics.totalSales.toLocaleString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Live Data
        </div>
      </div>

      {/* Key Metrics - Removed as requested */}

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
                <LineChart data={computedAnalytics.dailyTrend}>
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

      {/* Top Agents - Manager Only */}
      {userRole === 'manager' && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={computedAnalytics.topAgents.slice(0, 8)} layout="horizontal">
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
      )}
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
                    data={computedAnalytics.salesByService}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="sales"
                    nameKey="service"
                    label={(entry: any) => `${entry.service}: ${((entry.sales / computedAnalytics.totalSales) * 100 || 0).toFixed(0)}%`}
                  >
                    {computedAnalytics.salesByService.map((_, index) => (
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
                <BarChart data={computedAnalytics.salesByTeam}>
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
                <BarChart data={computedAnalytics.userAnalysisData}>
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

        {/* Revenue by Agent */}
        <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-gray-700 to-gray-900 rounded-lg mr-3">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {userRole === 'salesman' ? 'Revenue by Closing Agent' : 'Revenue by Sales Agent'}
                    </h3>
                    <p className="text-sm text-gray-300 mt-1">
                      Performance breakdown by {userRole === 'salesman' ? 'closing agents' : 'sales agents'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {computedAnalytics.salesByAgent.length}
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">
                    {userRole === 'salesman' ? 'Closing Agents' : 'Sales Agents'}
                  </div>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={computedAnalytics.salesByAgent.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="agent" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    fontSize={12}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    fontSize={12}
                    stroke="#9ca3af"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'sales') return [`$${Number(value).toLocaleString()}`, 'Revenue'];
                      if (name === 'deals') return [value, 'Deals Count'];
                      return [value, name];
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                      color: '#f3f4f6'
                    }}
                  />
                  <Bar 
                    dataKey="sales" 
                    fill="url(#blackGradient)" 
                    radius={[4, 4, 0, 0]}
                    stroke="#000000"
                    strokeWidth={1}
                  />
                  <defs>
                    <linearGradient id="blackGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#374151" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#111827" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-600 shadow-sm">
                <div className="text-lg font-semibold text-white">
                  ${computedAnalytics.salesByAgent.reduce((sum, agent) => sum + agent.sales, 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Total Revenue</div>
              </div>
              <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-600 shadow-sm">
                <div className="text-lg font-semibold text-emerald-400">
                  {computedAnalytics.salesByAgent.reduce((sum, agent) => sum + agent.deals, 0)}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Total Deals</div>
              </div>
              <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-600 shadow-sm">
                <div className="text-lg font-semibold text-amber-400">
                  ${Math.round(computedAnalytics.salesByAgent.reduce((sum, agent) => sum + agent.sales, 0) / Math.max(computedAnalytics.salesByAgent.reduce((sum, agent) => sum + agent.deals, 0), 1)).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Avg Deal Size</div>
              </div>
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
                  <th className="text-left py-2">Team</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {computedAnalytics.recentDeals.map((deal, index) => (
                  <tr key={index} className="border-b hover:bg-blue-50/50 transition-colors duration-200">
                    <td className="py-2">{deal.date.toLocaleDateString()}</td>
                    <td className="py-2">{deal.customer_name}</td>
                    <td className="py-2 font-semibold">${deal.amount}</td>
                    <td className="py-2">{deal.service}</td>
                    <td className="py-2 capitalize">{deal.salesAgent}</td>
                    <td className="py-2">{deal.team || 'Unknown'}</td>
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
                  {computedAnalytics.topAgents.map((agent, index) => (
                    <tr key={index} className="border-b hover:bg-blue-50/50 transition-colors duration-200">
                      <td className="py-2 capitalize font-medium">{agent.agent}</td>
                      <td className="py-2 font-semibold">${agent.sales.toLocaleString()}</td>
                      <td className="py-2">{agent.deals}</td>
                      <td className="py-2">${(agent.sales / agent.deals).toFixed(0)}</td>
                      <td className="py-2">
                        <div className="flex items-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(agent.sales / computedAnalytics.topAgents[0].sales) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">
                            {((agent.sales / computedAnalytics.topAgents[0].sales) * 100).toFixed(0)}%
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
        </>
      )}
        </TabsContent>
        
        <TabsContent value="callbacks" className="space-y-6">
          <CallbackKPIDashboard userRole={userRole} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SalesAnalysisDashboard;