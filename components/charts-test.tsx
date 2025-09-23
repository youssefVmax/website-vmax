"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { RefreshCw, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { chartsService } from '@/lib/charts-service';

interface ChartsTestProps {
  userRole: 'manager' | 'salesman' | 'team-leader';
  user: { 
    id: string; 
    name: string; 
    managedTeam?: string;
  };
}

export function ChartsTest({ userRole, user }: ChartsTestProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testData, setTestData] = useState<any>(null);

  const testCharts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🧪 Testing charts with user:', { userRole, userId: user.id, managedTeam: user.managedTeam });
      
      const data = await chartsService.getChartsData({
        userRole,
        userId: user.id,
        managedTeam: user.managedTeam,
        dateRange: '30'
      });
      
      setTestData(data);
      console.log('✅ Charts test successful:', data);
    } catch (err) {
      console.error('❌ Charts test failed:', err);
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testCharts();
  }, [userRole, user.id, user.managedTeam]);

  // Sample data for testing charts rendering
  const sampleData = [
    { name: 'Jan', sales: 4000, deals: 24 },
    { name: 'Feb', sales: 3000, deals: 18 },
    { name: 'Mar', sales: 5000, deals: 30 },
    { name: 'Apr', sales: 4500, deals: 27 },
    { name: 'May', sales: 6000, deals: 36 }
  ];

  const pieData = [
    { name: 'Team A', value: 400, color: '#3B82F6' },
    { name: 'Team B', value: 300, color: '#10B981' },
    { name: 'Team C', value: 200, color: '#F59E0B' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Charts Test</h2>
          <p className="text-gray-600">Testing chart functionality and data loading</p>
        </div>
        <Button onClick={testCharts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Test Charts
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* API Test Results */}
      {testData && (
        <Card>
          <CardHeader>
            <CardTitle>API Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {testData.summary?.total_deals || 0}
                </div>
                <div className="text-sm text-gray-600">Total Deals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${(testData.summary?.total_revenue || 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {testData.salesTrend?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Trend Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {testData.salesByAgent?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Agents</div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Sales Trend Data: {testData.salesTrend ? 'Available' : 'Not Available'}</p>
              <p>Sales by Agent: {testData.salesByAgent ? 'Available' : 'Not Available'}</p>
              <p>Sales by Team: {testData.salesByTeam ? 'Available' : 'Not Available'}</p>
              <p>Deal Status: {testData.dealStatus ? 'Available' : 'Not Available'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bar Chart Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Bar Chart Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={testData?.salesTrend || sampleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Line Chart Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={testData?.salesTrend || sampleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="deals" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2" />
              Pie Chart Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={testData?.salesByTeam || pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                  nameKey="team"
                  label={({ team, revenue }) => `${team}: $${revenue}`}
                >
                  {(testData?.salesByTeam || pieData).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || ['#3B82F6', '#10B981', '#F59E0B'][index % 3]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agent Performance Test */}
        {testData?.salesByAgent && (
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={testData.salesByAgent.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="agent" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Raw Data Display */}
      {testData && (
        <Card>
          <CardHeader>
            <CardTitle>Raw Data (First 3 items each)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              {testData.salesTrend && (
                <div>
                  <h4 className="font-semibold">Sales Trend:</h4>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(testData.salesTrend.slice(0, 3), null, 2)}
                  </pre>
                </div>
              )}
              
              {testData.salesByAgent && (
                <div>
                  <h4 className="font-semibold">Sales by Agent:</h4>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(testData.salesByAgent.slice(0, 3), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
