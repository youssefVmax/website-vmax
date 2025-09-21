"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Activity,
  Users,
  FileText,
  Phone,
  Target,
  Settings
} from "lucide-react"
import { dataValidator } from "@/lib/mysql-data-validator"

interface SystemHealthMonitorProps {
  userRole: string
}

export default function SystemHealthMonitor({ userRole }: SystemHealthMonitorProps) {
  const [healthReport, setHealthReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const runHealthCheck = async () => {
    setLoading(true)
    try {
      const report = await dataValidator.generateHealthReport()
      setHealthReport(report)
      setLastCheck(new Date())
    } catch (error) {
      console.error('Health check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runHealthCheck()
  }, [])

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (userRole !== 'manager') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Access Restricted</CardTitle>
          <CardDescription>
            System health monitoring is only available to managers.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">System Health Monitor</h2>
          <Button disabled>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Running Health Check...
          </Button>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Database className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
              <p className="mt-4 text-gray-600">Checking system health...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health Monitor</h2>
          <p className="text-muted-foreground">
            Last checked: {lastCheck?.toLocaleString() || 'Never'}
          </p>
        </div>
        <Button onClick={runHealthCheck} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={`border-2 ${getHealthColor(healthReport?.overall)}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getHealthIcon(healthReport?.overall)}
            System Status: {healthReport?.overall?.toUpperCase()}
          </CardTitle>
          <CardDescription>
            Overall system health assessment
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {healthReport?.database?.connected ? (
                  <span className="text-green-600">Connected</span>
                ) : (
                  <span className="text-red-600">Disconnected</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Connection Status</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {healthReport?.database?.tables?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Tables Available</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {healthReport?.database?.indexes?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Indexes Active</p>
            </div>
          </div>

          {healthReport?.database?.errors?.length > 0 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Database Issues</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {healthReport.database.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Data Integrity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Data Integrity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                healthReport?.dataIntegrity?.orphanedDeals > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {healthReport?.dataIntegrity?.orphanedDeals || 0}
              </div>
              <p className="text-sm text-muted-foreground">Orphaned Deals</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                healthReport?.dataIntegrity?.orphanedCallbacks > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {healthReport?.dataIntegrity?.orphanedCallbacks || 0}
              </div>
              <p className="text-sm text-muted-foreground">Orphaned Callbacks</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                healthReport?.dataIntegrity?.missingUsers?.length > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {healthReport?.dataIntegrity?.missingUsers?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Missing Users</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                healthReport?.dataIntegrity?.inconsistentTeams?.length > 0 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {healthReport?.dataIntegrity?.inconsistentTeams?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Team Inconsistencies</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {healthReport?.recommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthReport.recommendations.map((recommendation: string, index: number) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Tables Status */}
      <Card>
        <CardHeader>
          <CardTitle>Database Tables Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { name: 'users', icon: Users },
              { name: 'deals', icon: FileText },
              { name: 'callbacks', icon: Phone },
              { name: 'targets', icon: Target },
              { name: 'notifications', icon: Activity },
              { name: 'settings', icon: Settings },
              { name: 'activity_log', icon: FileText },
              { name: 'team_metrics', icon: Activity }
            ].map(({ name, icon: Icon }) => (
              <div key={name} className="flex items-center gap-2 p-2 rounded border">
                <Icon className="h-4 w-4" />
                <span className="text-sm">{name}</span>
                <Badge variant={
                  healthReport?.database?.tables?.includes(name) ? 'default' : 'destructive'
                }>
                  {healthReport?.database?.tables?.includes(name) ? 'OK' : 'Missing'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
