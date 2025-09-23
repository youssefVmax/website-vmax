"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Target, TrendingUp, BarChart3, RefreshCw, Award, Search, Filter, Calendar, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUnifiedData } from "@/hooks/useUnifiedData"

interface EnhancedTargetDashboardProps {
  userRole: 'manager' | 'salesman' | 'team-leader'
  user: { name: string; username: string; id: string; team?: string }
}

export function EnhancedTargetDashboard({ userRole, user }: EnhancedTargetDashboardProps) {
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
    const totalTargetRevenue = targets.reduce((sum: number, target: any) => {
      const amount = typeof target.targetAmount === 'string' 
        ? parseFloat(target.targetAmount) || 0 
        : Number(target.targetAmount) || 0;
      return sum + amount;
    }, 0);
    
    const currentRevenue = targets.reduce((sum: number, target: any) => {
      const amount = typeof target.currentAmount === 'string' 
        ? parseFloat(target.currentAmount) || 0 
        : Number(target.currentAmount) || 0;
      return sum + amount;
    }, 0);
    
    const avgProgress = totalTargets > 0 ? targets.reduce((sum: number, target: any) => {
      const targetAmount = typeof target.targetAmount === 'string' 
        ? parseFloat(target.targetAmount) || 0 
        : Number(target.targetAmount) || 0;
      const currentAmount = typeof target.currentAmount === 'string' 
        ? parseFloat(target.currentAmount) || 0 
        : Number(target.currentAmount) || 0;
      const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
      return sum + progress;
    }, 0) / totalTargets : 0;
    
    const exceededTargets = targets.filter((target: any) => {
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
    return (data.targets || []).filter((target: any) => {
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
    return Array.from(new Set((data.targets || []).map((t: any) => `${t.month} ${t.year}`))).sort()
  }, [data.targets]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeded': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'on-track': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'behind': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p>Loading targets...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading Targets</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {userRole === 'manager' ? 'Target Management Dashboard' : 'My Sales Targets'}
          </h2>
          <p className="text-muted-foreground">
            {userRole === 'manager' 
              ? 'Comprehensive target management with real-time progress tracking'
              : 'Track your personal sales targets and performance'}
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Statistics Overview */}
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
                  ${(targetStats.currentRevenue || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  of ${(targetStats.totalTargetRevenue || 0).toLocaleString()}
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
                  {(targetStats.avgProgress || 0).toFixed(1)}%
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
                <p className="text-sm font-medium text-muted-foreground">Exceeded Targets</p>
                <p className="text-2xl font-bold text-purple-600">
                  {targetStats.exceededTargets}
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search targets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="exceeded">Exceeded</SelectItem>
                  <SelectItem value="on-track">On Track</SelectItem>
                  <SelectItem value="behind">Behind</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {availablePeriods.map(period => (
                    <SelectItem key={period} value={period}>{period}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTargets.map((target: any, index: number) => {
          // Calculate progress and status
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

          return (
            <Card key={target.id || index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{target.salesAgentName || target.agentName || 'Unknown Agent'}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {target.month} {target.year}
                    </div>
                  </div>
                  <Badge className={getStatusColor(status)}>
                    {status.replace('-', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Revenue Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Revenue Target</span>
                    <span>${currentAmount.toLocaleString()} / ${targetAmount.toLocaleString()}</span>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress.toFixed(1)}% complete
                  </p>
                </div>

                {/* Additional target info if available */}
                {target.targetDeals && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Deals Target</span>
                      <span>{target.currentDeals || 0} / {target.targetDeals}</span>
                    </div>
                    <Progress 
                      value={Math.min(((target.currentDeals || 0) / target.targetDeals) * 100, 100)} 
                      className="h-2" 
                    />
                  </div>
                )}

                {/* Performance Indicators */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">
                      {progress >= 100 ? '✓' : `${(100 - progress).toFixed(0)}%`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {progress >= 100 ? 'Complete' : 'Remaining'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">
                      ${Math.round(targetAmount - currentAmount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">To Target</p>
                  </div>
                </div>

                {target.description && (
                  <p className="text-sm text-muted-foreground border-t pt-2">
                    {target.description}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredTargets.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No targets found</h3>
            <p className="text-muted-foreground mb-4">
              {data.targets.length === 0 
                ? "No targets have been created yet." 
                : "No targets match your current filters."}
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
