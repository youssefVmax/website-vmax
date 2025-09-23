"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target, TrendingUp, BarChart3, RefreshCw, Award } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUnifiedData } from "@/hooks/useUnifiedData"

interface FixedTargetDashboardProps {
  userRole: 'manager' | 'salesman' | 'customer-service'
  user: { name: string; username: string; id: string; team?: string }
}

export function FixedTargetDashboard({ userRole, user }: FixedTargetDashboardProps) {
  const { toast } = useToast()
  
  // Use unified data service with manual refresh
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

  const handleRefresh = async () => {
    try {
      await refresh()
      toast({
        title: "Success",
        description: "Data refreshed successfully!",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      })
    }
  }

  // Calculate target-specific KPIs with safe number conversion
  const targetStats = {
    totalTargets: data.targets.length,
    totalTargetRevenue: data.targets.reduce((sum, target) => {
      const amount = typeof target.targetAmount === 'string' 
        ? parseFloat(target.targetAmount) || 0 
        : Number(target.targetAmount) || 0;
      return sum + amount;
    }, 0),
    currentRevenue: data.targets.reduce((sum, target) => {
      const amount = typeof target.currentAmount === 'string' 
        ? parseFloat(target.currentAmount) || 0 
        : Number(target.currentAmount) || 0;
      return sum + amount;
    }, 0),
    avgProgress: data.targets.length > 0 ? data.targets.reduce((sum, target) => {
      const targetAmount = typeof target.targetAmount === 'string' 
        ? parseFloat(target.targetAmount) || 0 
        : Number(target.targetAmount) || 0;
      const currentAmount = typeof target.currentAmount === 'string' 
        ? parseFloat(target.currentAmount) || 0 
        : Number(target.currentAmount) || 0;
      const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
      return sum + progress;
    }, 0) / data.targets.length : 0,
    exceededTargets: data.targets.filter(target => {
      const targetAmount = typeof target.targetAmount === 'string' 
        ? parseFloat(target.targetAmount) || 0 
        : Number(target.targetAmount) || 0;
      const currentAmount = typeof target.currentAmount === 'string' 
        ? parseFloat(target.currentAmount) || 0 
        : Number(target.currentAmount) || 0;
      return currentAmount >= targetAmount;
    }).length
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Target Management</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Target Management</h2>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="text-lg font-semibold">Error Loading Data</p>
              <p className="text-sm mt-2">{error}</p>
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
          <h2 className="text-3xl font-bold tracking-tight">Target Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage sales targets and progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={handleRefresh} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Overview - FIXED */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Targets</p>
                <p className="text-2xl font-bold">{targetStats.totalTargets}</p>
              </div>
              <Target className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue Progress</p>
                <p className="text-2xl font-bold text-green-600">
                  ${Math.round(targetStats.currentRevenue).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  of ${Math.round(targetStats.totalTargetRevenue).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(targetStats.avgProgress * 10) / 10}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Performance</p>
                <p className="text-2xl font-bold text-purple-600">
                  {targetStats.exceededTargets} Exceeded
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Targets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.targets.map((target, index) => {
          const targetAmount = typeof target.targetAmount === 'string' 
            ? parseFloat(target.targetAmount) || 0 
            : Number(target.targetAmount) || 0;
          const currentAmount = typeof target.currentAmount === 'string' 
            ? parseFloat(target.currentAmount) || 0 
            : Number(target.currentAmount) || 0;
          const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
          
          let status = 'on-track';
          let statusColor = 'bg-blue-500';
          if (progress >= 100) {
            status = 'exceeded';
            statusColor = 'bg-green-500';
          } else if (progress < 70) {
            status = 'behind';
            statusColor = 'bg-red-500';
          }

          return (
            <Card key={target.id || index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {target.salesAgentName || target.agentName || 'Unknown Agent'}
                  </CardTitle>
                  <Badge variant="secondary" className={`text-white ${statusColor}`}>
                    {status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Revenue Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Revenue Target</span>
                    <span className="text-sm text-muted-foreground">
                      ${Math.round(currentAmount).toLocaleString()} / ${Math.round(targetAmount).toLocaleString()}
                    </span>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(progress * 10) / 10}% complete
                  </p>
                </div>

                {/* Deals Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Deals Target</span>
                    <span className="text-sm text-muted-foreground">
                      {target.currentDeals || 0} / {target.targetDeals || 0}
                    </span>
                  </div>
                  <Progress 
                    value={target.targetDeals > 0 ? Math.min((target.currentDeals / target.targetDeals) * 100, 100) : 0} 
                    className="h-2" 
                  />
                </div>

                {/* Period */}
                <div className="text-xs text-muted-foreground">
                  Period: {target.month} {target.year}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {data.targets.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Targets Found</h3>
            <p className="text-muted-foreground mb-4">
              No sales targets have been created yet.
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <pre className="bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify({
                targetsCount: data.targets.length,
                dealsCount: data.deals.length,
                callbacksCount: data.callbacks.length,
                targetStats,
                sampleTarget: data.targets[0]
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default FixedTargetDashboard
