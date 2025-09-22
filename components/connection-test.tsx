"use client"

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Database, Globe } from 'lucide-react'
import { API_CONFIG } from '@/lib/config'

interface ConnectionTestResult {
  status: string
  message: string
  timestamp: string
  server_info: any
  database_test: any
  api_endpoints_test: any[]
  frontend_integration: any
}

export default function ConnectionTest() {
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runConnectionTest = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Testing connection to:', `${API_CONFIG.BASE_URL}/api/connection-test.php`)
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/connection-test.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setTestResult(data)
      console.log('✅ Connection test successful:', data)
      
    } catch (err: any) {
      console.error('❌ Connection test failed:', err)
      setError(err.message || 'Connection test failed')
    } finally {
      setLoading(false)
    }
  }

  const testIndividualAPI = async (endpoint: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/${endpoint}`)
      return {
        endpoint,
        status: response.ok ? 'success' : 'failed',
        statusCode: response.status,
        statusText: response.statusText
      }
    } catch (err: any) {
      return {
        endpoint,
        status: 'error',
        error: err.message
      }
    }
  }

  const runQuickAPITests = async () => {
    setLoading(true)
    const endpoints = ['test-db-connection.php', 'deals-api.php', 'callbacks-api.php', 'users-api.php']
    
    const results = await Promise.all(
      endpoints.map(endpoint => testIndividualAPI(endpoint))
    )
    
    console.log('API Test Results:', results)
    setLoading(false)
  }

  useEffect(() => {
    // Auto-run test on component mount
    runConnectionTest()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'connected':
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variant = status === 'success' || status === 'connected' || status === 'ready' 
      ? 'default' 
      : status === 'error' || status === 'failed' 
      ? 'destructive' 
      : 'secondary'
    
    return <Badge variant={variant}>{status}</Badge>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🔗 Frontend-Backend Connection Test</h1>
          <p className="text-muted-foreground">
            Verify the connection between your Next.js frontend and PHP MySQL backend
          </p>
        </div>
        <div className="space-x-2">
          <Button onClick={runConnectionTest} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
            Test Connection
          </Button>
          <Button variant="outline" onClick={runQuickAPITests} disabled={loading}>
            <Globe className="h-4 w-4 mr-2" />
            Quick API Test
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center">
              <XCircle className="h-5 w-5 mr-2" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <div className="mt-4 p-3 bg-red-100 rounded">
              <p className="text-sm text-red-700">
                <strong>Troubleshooting:</strong>
              </p>
              <ul className="text-sm text-red-600 mt-2 space-y-1">
                <li>• Check if the backend server is running at {API_CONFIG.BASE_URL}</li>
                <li>• Verify CORS headers are properly configured</li>
                <li>• Ensure the API endpoint exists and is accessible</li>
                <li>• Check browser console for detailed error messages</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {testResult && (
        <div className="grid gap-6">
          {/* Overall Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {getStatusIcon(testResult.status)}
                <span className="ml-2">Connection Status</span>
                {getStatusBadge(testResult.status)}
              </CardTitle>
              <CardDescription>
                {testResult.message} - {testResult.timestamp}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium">Backend URL</p>
                  <p className="text-muted-foreground">{API_CONFIG.BASE_URL}</p>
                </div>
                <div>
                  <p className="font-medium">PHP Version</p>
                  <p className="text-muted-foreground">{testResult.server_info?.php_version}</p>
                </div>
                <div>
                  <p className="font-medium">Server</p>
                  <p className="text-muted-foreground">{testResult.server_info?.http_host}</p>
                </div>
                <div>
                  <p className="font-medium">Request Method</p>
                  <p className="text-muted-foreground">{testResult.server_info?.request_method}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Status */}
          {testResult.database_test && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {getStatusIcon(testResult.database_test.status)}
                  <span className="ml-2">Database Connection</span>
                  {getStatusBadge(testResult.database_test.status)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResult.database_test.status === 'connected' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Host</p>
                        <p className="text-muted-foreground">{testResult.database_test.host}</p>
                      </div>
                      <div>
                        <p className="font-medium">Database</p>
                        <p className="text-muted-foreground">{testResult.database_test.database}</p>
                      </div>
                      <div>
                        <p className="font-medium">MySQL Version</p>
                        <p className="text-muted-foreground">{testResult.database_test.server_version}</p>
                      </div>
                    </div>
                    
                    {testResult.database_test.tables && (
                      <div>
                        <p className="font-medium mb-2">Table Records:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(testResult.database_test.tables).map(([table, count]) => (
                            <div key={table} className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{table}</span>
                              <Badge variant="outline" className="text-xs">
                                {typeof count === 'number' ? count : count as string}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-600">
                    <p>Database connection failed: {testResult.database_test.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* API Endpoints Status */}
          {testResult.api_endpoints_test && (
            <Card>
              <CardHeader>
                <CardTitle>API Endpoints Status</CardTitle>
                <CardDescription>Status of all backend API endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testResult.api_endpoints_test.map((endpoint, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(endpoint.status)}
                        <div>
                          <p className="font-medium">{endpoint.endpoint}</p>
                          <p className="text-sm text-muted-foreground">{endpoint.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {endpoint.file_exists && (
                          <Badge variant="outline" className="text-xs">File OK</Badge>
                        )}
                        {getStatusBadge(endpoint.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Frontend Integration */}
          {testResult.frontend_integration && (
            <Card>
              <CardHeader>
                <CardTitle>Frontend Integration</CardTitle>
                <CardDescription>Configuration and test URLs for frontend development</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">CORS Headers</p>
                      <Badge variant="outline">{testResult.frontend_integration.cors_headers}</Badge>
                    </div>
                    <div>
                      <p className="font-medium">JSON Response</p>
                      <Badge variant="outline">{testResult.frontend_integration.json_response}</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium mb-2">Test URLs:</p>
                    <div className="space-y-2">
                      {Object.entries(testResult.frontend_integration.test_urls).map(([name, url]) => (
                        <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{name}</span>
                          <a 
                            href={url as string} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Test →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Frontend Base URL</p>
              <p className="text-muted-foreground">{API_CONFIG.BASE_URL}</p>
            </div>
            <div>
              <p className="font-medium">Environment</p>
              <p className="text-muted-foreground">{process.env.NODE_ENV || 'development'}</p>
            </div>
            <div>
              <p className="font-medium">API Timeout</p>
              <p className="text-muted-foreground">{API_CONFIG.TIMEOUT}ms</p>
            </div>
            <div>
              <p className="font-medium">Max Retries</p>
              <p className="text-muted-foreground">{API_CONFIG.RETRY.MAX_RETRIES}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
