"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function TestPage() {
  const [dbStatus, setDbStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [dbMessage, setDbMessage] = useState('')
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [apiMessage, setApiMessage] = useState('')

  useEffect(() => {
    testConnections()
  }, [])

  const testConnections = async () => {
    // Test database connection
    try {
      setDbStatus('loading')
      const dbResponse = await fetch('/api/test-connection')
      const dbResult = await dbResponse.json()
      
      if (dbResult.success) {
        setDbStatus('success')
        setDbMessage(`Connected to ${dbResult.database_config?.host}:${dbResult.database_config?.port}`)
      } else {
        setDbStatus('error')
        setDbMessage(dbResult.message || 'Database connection failed')
      }
    } catch (error) {
      setDbStatus('error')
      setDbMessage('Failed to test database connection')
    }

    // Test API configuration
    try {
      setApiStatus('loading')
      const apiResponse = await fetch('/api/deals?limit=1')
      const apiResult = await apiResponse.json()
      
      if (apiResult.success !== false) {
        setApiStatus('success')
        setApiMessage('API endpoints are working correctly')
      } else {
        setApiStatus('error')
        setApiMessage('API test failed')
      }
    } catch (error) {
      setApiStatus('error')
      setApiMessage('Failed to test API endpoints')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">VMAX System Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(dbStatus)}
              <span>Database Connection</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Testing connection to MySQL database on vmaxcom.org
            </p>
            <p className={`text-sm ${dbStatus === 'success' ? 'text-green-600' : dbStatus === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
              {dbMessage || 'Testing connection...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(apiStatus)}
              <span>API Endpoints</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Testing Next.js API routes and role-based filtering
            </p>
            <p className={`text-sm ${apiStatus === 'success' ? 'text-green-600' : apiStatus === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
              {apiMessage || 'Testing API endpoints...'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Environment:</strong> {process.env.NODE_ENV || 'development'}
            </div>
            <div>
              <strong>Port:</strong> 3001
            </div>
            <div>
              <strong>Database Host:</strong> vmaxcom.org
            </div>
            <div>
              <strong>API Base URL:</strong> http://vmaxcom.org
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-4">
        <Button onClick={testConnections} disabled={dbStatus === 'loading' || apiStatus === 'loading'}>
          {(dbStatus === 'loading' || apiStatus === 'loading') ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Retest Connections'
          )}
        </Button>
        
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
