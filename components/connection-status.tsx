"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Activity,
  Server,
  Zap
} from "lucide-react"
import { useConnectionHealth } from "@/hooks/useConnectionHealth"

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function ConnectionStatus({ showDetails = false, className = "" }: ConnectionStatusProps) {
  const { 
    health, 
    stats, 
    loading, 
    error, 
    refreshHealth, 
    testUnifiedAPI, 
    testAnalyticsAPI, 
    isHealthy 
  } = useConnectionHealth();

  const [testing, setTesting] = useState<string | null>(null);

  const handleTestAPI = async (apiName: 'unified' | 'analytics') => {
    setTesting(apiName);
    try {
      if (apiName === 'unified') {
        await testUnifiedAPI();
      } else {
        await testAnalyticsAPI();
      }
    } finally {
      setTesting(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return 'bg-green-500';
      case 'unhealthy':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  if (!showDetails) {
    // Compact status indicator
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor(health?.status || 'error')} animate-pulse`} />
        <span className="text-sm text-muted-foreground">
          {loading ? 'Checking...' : isHealthy ? 'Connected' : 'Disconnected'}
        </span>
        {stats && (
          <Badge variant="outline" className="text-xs">
            {stats.healthPercentage}%
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <CardTitle className="text-lg">Connection Status</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshHealth}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          System health and API connectivity monitoring
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Overall Health */}
        {health && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="font-medium">Overall Health</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(health.status)}
                <Badge variant={isHealthy ? "default" : "destructive"}>
                  {health.status}
                </Badge>
              </div>
            </div>

            {stats && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>API Health</span>
                  <span>{stats.healthPercentage}%</span>
                </div>
                <Progress value={stats.healthPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats.active} active</span>
                  <span>{stats.errors} errors</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Database Status */}
        {health?.database && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="font-medium">Database</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(health.database.connected ? 'healthy' : 'error')}
                <Badge variant={health.database.connected ? "default" : "destructive"}>
                  {health.database.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Response time: {health.database.responseTime}
            </div>
          </div>
        )}

        {/* API Services */}
        {health?.services && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <span className="font-medium">API Services</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Unified Data API</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.services.unifiedData)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestAPI('unified')}
                    disabled={testing === 'unified'}
                  >
                    {testing === 'unified' ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Analytics API</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.services.analytics)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestAPI('analytics')}
                    disabled={testing === 'analytics'}
                  >
                    {testing === 'analytics' ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">User Management</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.services.userManagement)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Info */}
        {health?.system && (
          <div className="pt-3 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Uptime:</span>
                <div className="font-mono">
                  {Math.floor(health.system.uptime / 3600)}h {Math.floor((health.system.uptime % 3600) / 60)}m
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Platform:</span>
                <div className="font-mono">{health.system.platform}</div>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {health?.system?.timestamp && (
          <div className="text-xs text-muted-foreground text-center">
            Last updated: {new Date(health.system.timestamp).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
