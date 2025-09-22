"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Database, Activity, Target, Phone } from 'lucide-react';
import { unifiedAnalyticsService, type UserContext } from '@/lib/unified-analytics-service';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  data?: any;
}

export default function AnalyticsConnectionTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'success' | 'error' | 'warning' | 'pending'>('pending');

  const mockUser: UserContext = {
    id: 'manager-001',
    name: 'System Manager',
    username: 'manager',
    role: 'manager'
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const results: TestResult[] = [];

    // Test 1: Database Connection
    try {
      console.log('🔍 Testing database connection...');
      const response = await fetch('/api/analytics-test');
      const data = await response.json();
      
      if (data.success) {
        results.push({
          name: 'Database Connection',
          status: 'success',
          message: 'MySQL database connection successful',
          data: data.data
        });
      } else {
        results.push({
          name: 'Database Connection',
          status: 'error',
          message: data.error || 'Database connection failed'
        });
      }
    } catch (error) {
      results.push({
        name: 'Database Connection',
        status: 'error',
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Test 2: Analytics API Endpoint
    try {
      console.log('🔍 Testing analytics API endpoint...');
      const response = await fetch('/api/analytics?userRole=manager');
      const data = await response.json();
      
      if (data.success) {
        results.push({
          name: 'Analytics API',
          status: 'success',
          message: `Analytics API working - Found ${data.data.deals?.length || 0} deals, ${data.data.callbacks?.length || 0} callbacks`,
          data: {
            deals: data.data.deals?.length || 0,
            callbacks: data.data.callbacks?.length || 0,
            targets: data.data.targets?.length || 0
          }
        });
      } else {
        results.push({
          name: 'Analytics API',
          status: 'error',
          message: data.error || 'Analytics API failed'
        });
      }
    } catch (error) {
      results.push({
        name: 'Analytics API',
        status: 'error',
        message: `Analytics API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Test 3: Unified Analytics Service
    try {
      console.log('🔍 Testing unified analytics service...');
      const analytics = await unifiedAnalyticsService.getAnalytics(mockUser);
      
      if (analytics && analytics.overview) {
        results.push({
          name: 'Unified Analytics Service',
          status: 'success',
          message: `Service working - ${analytics.overview.totalDeals} deals, ${analytics.overview.totalCallbacks} callbacks`,
          data: analytics.overview
        });
      } else {
        results.push({
          name: 'Unified Analytics Service',
          status: 'warning',
          message: 'Service returned empty data - check data sources'
        });
      }
    } catch (error) {
      results.push({
        name: 'Unified Analytics Service',
        status: 'error',
        message: `Service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Test 4: Quick KPIs
    try {
      console.log('🔍 Testing quick KPIs...');
      const kpis = await unifiedAnalyticsService.getQuickKPIs(mockUser);
      
      results.push({
        name: 'Quick KPIs',
        status: 'success',
        message: `KPIs loaded - Revenue: $${kpis.totalRevenue.toLocaleString()}, Deals: ${kpis.totalDeals}`,
        data: kpis
      });
    } catch (error) {
      results.push({
        name: 'Quick KPIs',
        status: 'error',
        message: `KPIs test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Test 5: Chart Data
    try {
      console.log('🔍 Testing chart data...');
      const chartData = await unifiedAnalyticsService.getChartData(mockUser);
      
      results.push({
        name: 'Chart Data',
        status: 'success',
        message: `Chart data loaded - ${chartData.topAgents.length} agents, ${chartData.dailyTrend.length} trend points`,
        data: {
          topAgents: chartData.topAgents.length,
          dailyTrend: chartData.dailyTrend.length,
          serviceDistribution: chartData.serviceDistribution.length,
          teamDistribution: chartData.teamDistribution.length
        }
      });
    } catch (error) {
      results.push({
        name: 'Chart Data',
        status: 'error',
        message: `Chart data test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    setTestResults(results);
    
    // Determine overall status
    const hasErrors = results.some(r => r.status === 'error');
    const hasWarnings = results.some(r => r.status === 'warning');
    
    if (hasErrors) {
      setOverallStatus('error');
    } else if (hasWarnings) {
      setOverallStatus('warning');
    } else {
      setOverallStatus('success');
    }
    
    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default: return <RefreshCw className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Analytics Connection Test
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Testing all analytics components and data connections
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(overallStatus)}
              <Button 
                onClick={runTests} 
                disabled={isRunning}
                size="sm"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Run Tests
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{result.name}</h4>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer">View Details</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
            
            {testResults.length === 0 && !isRunning && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Run Tests" to start the connection test</p>
              </div>
            )}
            
            {isRunning && (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
                <p className="text-muted-foreground">Running connection tests...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Status Overview */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Database</p>
                  <p className="text-xs text-muted-foreground">
                    {testResults.find(r => r.name === 'Database Connection')?.status === 'success' ? 'Connected' : 'Failed'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Analytics API</p>
                  <p className="text-xs text-muted-foreground">
                    {testResults.find(r => r.name === 'Analytics API')?.status === 'success' ? 'Working' : 'Failed'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">KPI Service</p>
                  <p className="text-xs text-muted-foreground">
                    {testResults.find(r => r.name === 'Quick KPIs')?.status === 'success' ? 'Working' : 'Failed'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Chart Data</p>
                  <p className="text-xs text-muted-foreground">
                    {testResults.find(r => r.name === 'Chart Data')?.status === 'success' ? 'Working' : 'Failed'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
