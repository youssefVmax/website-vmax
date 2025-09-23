"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, RefreshCw, Database, Server, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUnifiedData } from "@/hooks/useUnifiedData"
import { unifiedApiService } from "@/lib/unified-api-service"

interface ApiConnectionTestProps {
  userRole: 'manager' | 'salesman' | 'team-leader'
  user: { name: string; username: string; id: string; team?: string }
}

export function ApiConnectionTest({ userRole, user }: ApiConnectionTestProps) {
  const { toast } = useToast()
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [testing, setTesting] = useState(false)

  // Use unified data service
  const {
    data,
    kpis,
    loading,
    error,
    lastUpdated,
    refresh
  } = useUnifiedData({
    userRole,
    userId: user.id,
    userName: user.name,
    managedTeam: user.team,
    autoLoad: true
  })

  const runApiTests = async () => {
    setTesting(true)
    const results: Record<string, any> = {}

    try {
      // Test 1: Direct API endpoints
      console.log('🧪 Testing direct API endpoints...')
      
      // Test deals API
      try {
        const dealsResponse = await fetch('/api/deals?limit=5')
        const dealsData = await dealsResponse.json()
        results.deals = {
          status: dealsResponse.ok ? 'success' : 'error',
          data: dealsData,
          count: dealsData.deals?.length || 0,
          message: dealsResponse.ok ? 'Connected' : 'Failed'
        }
      } catch (error) {
        results.deals = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }

      // Test callbacks API
      try {
        const callbacksResponse = await fetch('/api/callbacks?limit=5')
        const callbacksData = await callbacksResponse.json()
        results.callbacks = {
          status: callbacksResponse.ok ? 'success' : 'error',
          data: callbacksData,
          count: callbacksData.callbacks?.length || 0,
          message: callbacksResponse.ok ? 'Connected' : 'Failed'
        }
      } catch (error) {
        results.callbacks = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }

      // Test targets API
      try {
        const targetsResponse = await fetch('/api/targets?limit=5')
        const targetsData = await targetsResponse.json()
        results.targets = {
          status: targetsResponse.ok ? 'success' : 'error',
          data: targetsData,
          count: targetsData.targets?.length || 0,
          message: targetsResponse.ok ? 'Connected' : 'Failed'
        }
      } catch (error) {
        results.targets = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }

      // Test analytics API
      try {
        const analyticsResponse = await fetch('/api/analytics-api.php?endpoint=dashboard-stats')
        const analyticsData = await analyticsResponse.json()
        results.analytics = {
          status: analyticsResponse.ok ? 'success' : 'error',
          data: analyticsData,
          message: analyticsResponse.ok ? 'Connected' : 'Failed'
        }
      } catch (error) {
        results.analytics = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }

      // Test 2: Unified API Service
      try {
        const unifiedDeals = await unifiedApiService.getDeals({ limit: '5' })
        results.unifiedService = {
          status: 'success',
          dealsCount: unifiedDeals.length,
          message: 'Unified service working'
        }
      } catch (error) {
        results.unifiedService = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unified service failed'
        }
      }

      // Test 3: Hook data
      results.hookData = {
        status: error ? 'error' : 'success',
        dealsCount: data.deals?.length || 0,
        callbacksCount: data.callbacks?.length || 0,
        targetsCount: data.targets?.length || 0,
        loading,
        error,
        message: error ? 'Hook has errors' : 'Hook working'
      }

      setTestResults(results)
      
      toast({
        title: "API Tests Complete",
        description: "Check the results below for connection status",
        variant: "default"
      })

    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <RefreshCw className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Connected</Badge>
      case 'error':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">API Connection Test</h2>
          <p className="text-muted-foreground">
            Test all API connections and data flow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={runApiTests} disabled={testing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Run Tests'}
          </Button>
        </div>
      </div>

      {/* Current Data Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deals Loaded</p>
                <p className="text-2xl font-bold">{data.deals?.length || 0}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Callbacks Loaded</p>
                <p className="text-2xl font-bold">{data.callbacks?.length || 0}</p>
              </div>
              <Server className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Targets Loaded</p>
                <p className="text-2xl font-bold">{data.targets?.length || 0}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hook Status</p>
                <p className="text-2xl font-bold">{loading ? 'Loading' : error ? 'Error' : 'OK'}</p>
              </div>
              {getStatusIcon(error ? 'error' : 'success')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {Object.keys(testResults).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Test Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(testResults).map(([testName, result]) => (
              <Card key={testName}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize">
                      {testName.replace(/([A-Z])/g, ' $1').trim()}
                    </CardTitle>
                    {getStatusBadge(result.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="text-sm">{result.message}</span>
                  </div>
                  
                  {result.count !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      Records: {result.count}
                    </p>
                  )}
                  
                  {result.dealsCount !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      Deals: {result.dealsCount}, Callbacks: {result.callbacksCount}, Targets: {result.targetsCount}
                    </p>
                  )}
                  
                  {result.loading !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      Loading: {result.loading ? 'Yes' : 'No'}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Raw Data Preview */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Raw Data Preview (Dev Only)</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Hook Data:</h4>
                <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify({
                    deals: data.deals?.slice(0, 2),
                    callbacks: data.callbacks?.slice(0, 2),
                    targets: data.targets?.slice(0, 2),
                    loading,
                    error
                  }, null, 2)}
                </pre>
              </div>
              
              {Object.keys(testResults).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Test Results:</h4>
                  <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ApiConnectionTest
