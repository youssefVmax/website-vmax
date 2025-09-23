"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, TrendingUp, BarChart3, RefreshCw, Award, Plus, Search, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUnifiedData } from "@/hooks/useUnifiedData"

interface EnhancedTargetDashboardProps {
  userRole: 'manager' | 'salesman' | 'team-leader'
  user: { name: string; username: string; id: string; team?: string }
}

export function EnhancedTargetDashboardClean({ userRole, user }: EnhancedTargetDashboardProps) {
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

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [periodFilter, setPeriodFilter] = useState<string>("all")

  // Manual refresh handler
  const handleRefresh = async () => {
    try {
      await refresh()
      toast({
        title: "Success",
        description: "Target data refreshed successfully!",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to refresh target data",
        variant: "destructive"
      })
    }
  }

  // Calculate target statistics with safe number conversion
  const targetStats = useMemo(() => {
    const targets = data.targets || [];
    
    const totalTargets = targets.length;
    const totalTargetRevenue = targets.reduce((sum, target) => {
      const amount = typeof target.targetAmount === 'string' 
        ? parseFloat(target.targetAmount) || 0 
        : Number(target.targetAmount) || 0;
      return sum + amount;
    }, 0);
    
    const currentRevenue = targets.reduce((sum, target) => {
      const amount = typeof target.currentAmount === 'string' 
        ? parseFloat(target.currentAmount) || 0 
        : Number(target.currentAmount) || 0;
      return sum + amount;
    }, 0);
    
    const avgProgress = totalTargets > 0 ? targets.reduce((sum, target) => {
      const targetAmount = typeof target.targetAmount === 'string' 
        ? parseFloat(target.targetAmount) || 0 
        : Number(target.targetAmount) || 0;
      const currentAmount = typeof target.currentAmount === 'string' 
        ? parseFloat(target.currentAmount) || 0 
        : Number(target.currentAmount) || 0;
      const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
      return sum + progress;
    }, 0) / totalTargets : 0;
    
    const exceededTargets = targets.filter(target => {
      const targetAmount = typeof target.targetAmount === 'string' 
        ? parseFloat(target.targetAmount) || 0 
        : Number(target.targetAmount) || 0;
      const currentAmount = typeof target.currentAmount === 'string' 
        ? parseFloat(target.currentAmount) || 0 
        : Number(target.currentAmount) || 0;
      return currentAmount >= targetAmount;
    }).length;

    return {
      totalTargets,
      totalTargetRevenue: Math.round(totalTargetRevenue),
      currentRevenue: Math.round(currentRevenue),
      avgProgress: Math.round(avgProgress * 10) / 10,
      exceededTargets
    };
  }, [data.targets]);

  // Filter targets
  const filteredTargets = useMemo(() => {
    return (data.targets || []).filter(target => {
      const matchesSearch = target.salesAgentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           target.id?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPeriod = periodFilter === "all" || `${target.month} ${target.year}` === periodFilter
      
      // Calculate status for filtering
      const targetAmount = typeof target.targetAmount === 'string' 
        ? parseFloat(target.targetAmount) || 0 
        : Number(target.targetAmount) || 0;
      const currentAmount = typeof target.currentAmount === 'string' 
        ? parseFloat(target.currentAmount) || 0 
        : Number(target.currentAmount) || 0;
      const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
      
      let status = 'on-track';
      if (progress >= 100) {
        status = 'exceeded';
      } else if (progress < 70) {
        status = 'behind';
      }
      
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      
      return matchesSearch && matchesStatus && matchesPeriod;
    })
  }, [data.targets, searchQuery, statusFilter, periodFilter]);

  // Get unique periods for filters
  const availablePeriods = useMemo(() => {
    return Array.from(new Set((data.targets || []).map(t => `${t.month} ${t.year}`))).sort()
  }, [data.targets]);

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
                  ${targetStats.currentRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  of ${targetStats.totalTargetRevenue.toLocaleString()}
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
                  {targetStats.avgProgress}%
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search targets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="exceeded">Exceeded</SelectItem>
            <SelectItem value="on-track">On Track</SelectItem>
            <SelectItem value="behind">Behind</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            {availablePeriods.map(period => (
              <SelectItem key={period} value={period}>{period}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Targets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTargets.map((target, index) => {
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
                    {target.salesAgentName || 'Unknown Agent'}
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
      {filteredTargets.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Targets Found</h3>
            <p className="text-muted-foreground mb-4">
              {(data.targets || []).length === 0 
                ? "No sales targets have been created yet."
                : "No targets match your current filters."
              }
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
            <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify({
                userRole,
                userId: user.id,
                targetsCount: data.targets?.length || 0,
                dealsCount: data.deals?.length || 0,
                callbacksCount: data.callbacks?.length || 0,
                targetStats,
                sampleTarget: data.targets?.[0],
                error,
                loading
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EnhancedTargetDashboardClean
