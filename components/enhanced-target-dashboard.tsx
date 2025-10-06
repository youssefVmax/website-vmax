"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Target, TrendingUp, BarChart3, Calendar, AlertCircle, RefreshCw, 
  CheckCircle, Filter, Search, Award, DollarSign, Users
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { targetsService } from "@/lib/mysql-targets-service"
import { Progress } from "@radix-ui/react-progress"

interface EnhancedTargetDashboardProps {
  userRole: 'manager' | 'salesman' | 'team_leader'
  user: { name: string; username: string; id: string; team?: string; managedTeam?: string }
}

export function EnhancedTargetDashboard({ userRole, user }: EnhancedTargetDashboardProps) {
  const { toast } = useToast()
  
  // State for targets data
  const [targets, setTargets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load targets data
  const loadTargets = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log(`🔄 Loading targets for ${userRole}:`, user.username);

      let targetsData: any[] = []

      // Build API URL with role-based filtering
      const targetsUrl = new URL('/api/targets', window.location.origin);
      targetsUrl.searchParams.set('limit', '100');

      if (userRole === 'manager') {
        // Managers see all targets
        targetsUrl.searchParams.set('userRole', 'manager');
        targetsUrl.searchParams.set('userId', user.id);
      } else if (userRole === 'team_leader') {
        // Team leaders see their own targets + managed team targets
        targetsUrl.searchParams.set('userRole', 'team_leader');
        targetsUrl.searchParams.set('userId', user.id);
        if (user.managedTeam) {
          targetsUrl.searchParams.set('managedTeam', user.managedTeam);
        }
      } else if (userRole === 'salesman') {
        // Salesmen see only their own targets
        targetsUrl.searchParams.set('userRole', 'salesman');
        targetsUrl.searchParams.set('userId', user.id);
        targetsUrl.searchParams.set('agentId', user.id);
      }

      console.log('🔍 Fetching targets:', targetsUrl.toString());

      // Fetch targets from API
      const response = await fetch(targetsUrl.toString());
      if (!response.ok) {
        throw new Error(`Targets API error: ${response.status}`);
      }
      
      const result = await response.json();
      targetsData = Array.isArray(result) ? result : (result?.targets || result?.data || []);

      console.log(`✅ Targets loaded for ${userRole}:`, targetsData.length);

      // Set targets with default progress values
      const targetsWithDefaultProgress = targetsData.map((target: any) => ({
        ...target,
        currentAmount: 0, // Will be calculated later
        currentDeals: 0,
        currentRevenue: 0,
        progress: 0,
        dealsProgress: 0,
        month: target.period?.split(' ')[0] || '',
        year: target.period?.split(' ')[1] || '',
        salesAgentName: target.agentName || target.salesAgentName || 'Unknown'
      }));

      // Separate personal and team targets for team leaders
      if (userRole === 'team_leader') {
        const personalTargets = targetsWithDefaultProgress.filter(target => 
          target.agentId === user.id || target.salesAgentId === user.id
        );
        const teamTargets = targetsWithDefaultProgress.filter(target => 
          target.salesTeam === user.managedTeam && target.agentId !== user.id
        );
        
        console.log('📊 Team Leader Targets:', {
          personal: personalTargets.length,
          team: teamTargets.length,
          managedTeam: user.managedTeam
        });
        
        setTargets([...personalTargets, ...teamTargets]);
      } else {
        setTargets(targetsWithDefaultProgress);
      }

    } catch (err) {
      console.error('Error loading targets:', err)
      setError('Failed to load targets')
    } finally {
      setLoading(false)
    }
  }

  // Calculate target analytics
  const targetAnalytics = useMemo(() => {
    if (!targets.length) return { personal: [], team: [] };
    
    if (userRole === 'team_leader') {
      const personalTargets = targets.filter(target => 
        target.agentId === user.id || target.salesAgentId === user.id
      );
      const teamTargets = targets.filter(target => 
        target.salesTeam === user.managedTeam && target.agentId !== user.id
      );
      
      return { personal: personalTargets, team: teamTargets };
    }
    
    return { personal: targets, team: [] };
  }, [targets, userRole, user.id, user.managedTeam]);

  // Load progress data function (simplified)
  const loadProgressData = async (targetsData: any[]) => {
    try {
      // Load progress for each target with a delay to avoid overwhelming the API
      const targetsWithProgress = await Promise.all(
        targetsData.map(async (target: any, index: number) => {
          try {
            // Add small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, index * 100))

            const progress = await targetsService.getTargetProgress(target.id)
            return {
              ...target,
              currentAmount: progress.currentRevenue || 0,
              currentDeals: progress.currentDeals || 0,
              currentRevenue: progress.currentRevenue || 0,
              progress: progress.revenueProgress || 0,
              dealsProgress: progress.dealsProgress || 0,
              month: target.period?.split(' ')[0] || '',
              year: target.period?.split(' ')[1] || '',
              salesAgentName: target.agentName || target.salesAgentName
            }
          } catch (error) {
            console.error('Error fetching progress for target:', target.id, error)
            // Return target with default progress values
            return {
              ...target,
              currentAmount: 0,
              currentDeals: 0,
              currentRevenue: 0,
              progress: 0,
              dealsProgress: 0,
              month: target.period?.split(' ')[0] || '',
              year: target.period?.split(' ')[1] || '',
              salesAgentName: target.agentName || target.salesAgentName
            }
          }
        })
      )

      // Update targets with progress data
      setTargets(targetsWithProgress)
    } catch (error) {
      console.error('Error loading progress data:', error)
      // Keep existing targets data even if progress loading fails
    }
  }

  // Load data on component mount and set up auto-refresh
  useEffect(() => {
    loadTargets()
    
    // Set up auto-refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing targets data...')
      loadTargets()
    }, 30000) // 30 seconds

    // Cleanup interval on unmount
    return () => {
      clearInterval(refreshInterval)
    }
  }, [user.id, userRole, user.managedTeam])

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [periodFilter, setPeriodFilter] = useState<string>("all")

  // Manual refresh handler
  const handleRefresh = async () => {
    try {
      await loadTargets()
      toast({
        title: "Success",
        description: "Targets data refreshed successfully"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh targets data",
        variant: "destructive"
      })
    }
  }

  // Calculate target statistics with real progress data
  const targetStats = useMemo(() => {
    const targetsData = targets || [];
    
    const totalTargets = targetsData.length;
    const totalTargetRevenue = targetsData.reduce((sum: number, target: any) => {
      const amount = typeof target.monthlyTarget === 'string' 
        ? parseFloat(target.monthlyTarget) || 0 
        : Number(target.monthlyTarget) || 0;
      return sum + amount;
    }, 0);
    
    // Calculate current revenue from actual progress data
    const currentRevenue = targetsData.reduce((sum: number, target: any) => {
      const current = typeof target.currentAmount === 'string'
        ? parseFloat(target.currentAmount) || 0
        : Number(target.currentAmount) || 0;
      return sum + current;
    }, 0);
    
    // Calculate average progress
    const totalProgress = targetsData.reduce((sum: number, target: any) => {
      const progress = typeof target.progress === 'string' 
        ? parseFloat(target.progress) || 0 
        : Number(target.progress) || 0;
      return sum + progress;
    }, 0);
    const avgProgress = totalProgress / targetsData.length || 0;
    
    // Calculate exceeded targets
    const exceededTargets = targetsData.filter(target => {
      const progress = typeof target.progress === 'string' 
        ? parseFloat(target.progress) || 0 
        : Number(target.progress) || 0;
      return progress >= 100;
    }).length;
    
    console.log('📊 Target Stats Calculated:', {
      totalTargets,
      totalTargetRevenue: Math.round(totalTargetRevenue),
      currentRevenue: Math.round(currentRevenue),
      avgProgress: Math.round(avgProgress * 10) / 10,
      exceededTargets
    });
    
    return {
      totalTargets,
      totalTargetRevenue: Math.round(totalTargetRevenue),
      currentRevenue: Math.round(currentRevenue),
      avgProgress: Math.round(avgProgress * 10) / 10,
      exceededTargets
    };
  }, [targets]);

  // Filter targets
  const filteredTargets = useMemo(() => {
    return (targets || []).filter((target: any) => {
      const matchesSearch = target.agentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             target.id?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPeriod = periodFilter === "all" || target.period === periodFilter
      
      // For now, assume all targets are active
      const status = 'active';
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      
      return matchesSearch && matchesStatus && matchesPeriod;
    })
  }, [targets, searchQuery, statusFilter, periodFilter]);

  // Get unique periods for filters
  const availablePeriods = useMemo(() => {
    return Array.from(new Set((targets || []).map((t: any) => t.period))).filter(Boolean).sort()
  }, [targets]);

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
              : userRole === 'team_leader'
              ? 'Track your individual targets and team performance'
              : 'Track your personal sales targets and performance'}
          </p>
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
          const targetAmount = typeof target.monthlyTarget === 'string' 
            ? parseFloat(target.monthlyTarget) || 0 
            : Number(target.monthlyTarget) || 0;
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

          const isTeamTarget = target.salesTeam === user.managedTeam && target.agentId !== user.id;
          const isOwnTarget = target.agentId === user.id;

          return (
            <Card key={target.id || index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{target.salesAgentName || target.agentName || 'Unknown Agent'}</CardTitle>
                    {isTeamTarget && (
                      <div className="flex items-center gap-1 text-sm text-blue-600">
                        <Users className="h-4 w-4" />
                        Team Member Target
                      </div>
                    )}
                    {isOwnTarget && (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <Target className="h-4 w-4" />
                        Your Personal Target
                      </div>
                    )}
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
              {userRole === 'team_leader'
                ? "No personal or team member targets have been created yet."
                : targets.length === 0 
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
