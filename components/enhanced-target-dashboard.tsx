"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Target, Users, Edit, Trash2, BarChart3, TrendingUp, Filter, Search, Calendar, Award, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { targetsService } from "@/lib/firebase-targets-service"
import { Target as TargetType, TeamTarget } from "@/types/firebase"
import { DynamicTargetCreator } from "./dynamic-target-creator"

interface EnhancedTargetDashboardProps {
  userRole: 'manager' | 'salesman' | 'customer-service'
  user: { name: string; username: string; id: string; team?: string }
}

interface TargetWithProgress extends TargetType {
  currentSales: number
  currentDeals: number
  salesProgress: number
  dealsProgress: number
  status: 'on-track' | 'behind' | 'exceeded'
}

interface TeamTargetWithProgress extends TeamTarget {
  currentSales: number
  currentDeals: number
  salesProgress: number
  dealsProgress: number
  status: 'on-track' | 'behind' | 'exceeded'
}

export function EnhancedTargetDashboard({ userRole, user }: EnhancedTargetDashboardProps) {
  const { toast } = useToast()
  const [targets, setTargets] = useState<TargetWithProgress[]>([])
  const [teamTargets, setTeamTargets] = useState<TeamTargetWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [editingTarget, setEditingTarget] = useState<TargetWithProgress | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [periodFilter, setPeriodFilter] = useState<string>("all")
  const [teamFilter, setTeamFilter] = useState<string>("all")

  const isManager = userRole === 'manager'
  
  // Strict access control - only managers can manage targets
  const canManageTargets = userRole === 'manager'

  // Load data
  const loadData = async () => {
    try {
      setLoading(true)
      
      if (isManager) {
        const [targetsData, teamTargetsData] = await Promise.all([
          targetsService.getTargets(user.id, userRole),
          targetsService.getTeamTargets(user.id)
        ])
        
        // Load progress for individual targets
        const targetsWithProgress = await Promise.all(
          targetsData.map(async (target) => {
            const progress = await targetsService.getTargetProgress(target.agentId!, target.period)
            const salesProgress = target.monthlyTarget > 0 ? (progress.currentSales / target.monthlyTarget) * 100 : 0
            const dealsProgress = target.dealsTarget > 0 ? (progress.currentDeals / target.dealsTarget) * 100 : 0
            
            let status: 'on-track' | 'behind' | 'exceeded' = 'on-track'
            if (salesProgress >= 100 || dealsProgress >= 100) {
              status = 'exceeded'
            } else if (salesProgress < 70 && dealsProgress < 70) {
              status = 'behind'
            }

            return {
              ...target,
              currentSales: progress.currentSales,
              currentDeals: progress.currentDeals,
              salesProgress,
              dealsProgress,
              status
            }
          })
        )

        // Load progress for team targets (simplified for now)
        const teamTargetsWithProgress = teamTargetsData.map(teamTarget => ({
          ...teamTarget,
          currentSales: 0,
          currentDeals: 0,
          salesProgress: 0,
          dealsProgress: 0,
          status: 'on-track' as const
        }))
        
        setTargets(targetsWithProgress)
        setTeamTargets(teamTargetsWithProgress)
      } else {
        const targetsData = await targetsService.getTargets(user.id, userRole)
        
        const targetsWithProgress = await Promise.all(
          targetsData.map(async (target) => {
            const progress = await targetsService.getTargetProgress(user.id, target.period)
            const salesProgress = target.monthlyTarget > 0 ? (progress.currentSales / target.monthlyTarget) * 100 : 0
            const dealsProgress = target.dealsTarget > 0 ? (progress.currentDeals / target.dealsTarget) * 100 : 0
            
            let status: 'on-track' | 'behind' | 'exceeded' = 'on-track'
            if (salesProgress >= 100 || dealsProgress >= 100) {
              status = 'exceeded'
            } else if (salesProgress < 70 && dealsProgress < 70) {
              status = 'behind'
            }

            return {
              ...target,
              currentSales: progress.currentSales,
              currentDeals: progress.currentDeals,
              salesProgress,
              dealsProgress,
              status
            }
          })
        )
        
        setTargets(targetsWithProgress)
      }
    } catch (error) {
      console.error('Error loading targets:', error)
      toast({
        title: "Error",
        description: "Failed to load targets data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user.id, userRole, isManager])

  // Filter targets
  const filteredTargets = useMemo(() => {
    return targets.filter(target => {
      const matchesSearch = target.agentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           target.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || target.status === statusFilter
      const matchesPeriod = periodFilter === "all" || target.period === periodFilter
      const matchesTeam = teamFilter === "all" || target.agentName?.toLowerCase().includes(teamFilter.toLowerCase())
      
      return matchesSearch && matchesStatus && matchesPeriod && matchesTeam
    })
  }, [targets, searchQuery, statusFilter, periodFilter, teamFilter])

  // Get unique periods and teams for filters
  const availablePeriods = useMemo(() => {
    return Array.from(new Set(targets.map(t => t.period))).sort()
  }, [targets])

  const availableTeams = useMemo(() => {
    return Array.from(new Set(targets.map(t => t.agentName))).sort()
  }, [targets])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTargets = filteredTargets.length
    const exceededTargets = filteredTargets.filter(t => t.status === 'exceeded').length
    const onTrackTargets = filteredTargets.filter(t => t.status === 'on-track').length
    const behindTargets = filteredTargets.filter(t => t.status === 'behind').length
    const totalRevenue = filteredTargets.reduce((sum, t) => sum + t.currentSales, 0)
    const totalTargetRevenue = filteredTargets.reduce((sum, t) => sum + t.monthlyTarget, 0)
    const totalDeals = filteredTargets.reduce((sum, t) => sum + t.currentDeals, 0)
    const avgProgress = totalTargets > 0 ? filteredTargets.reduce((sum, t) => sum + t.salesProgress, 0) / totalTargets : 0

    return {
      totalTargets,
      exceededTargets,
      onTrackTargets,
      behindTargets,
      totalRevenue,
      totalTargetRevenue,
      totalDeals,
      avgProgress
    }
  }, [filteredTargets])

  const handleDeleteTarget = async (targetId: string) => {
    try {
      await targetsService.deleteTarget(targetId)
      setTargets(prev => prev.filter(t => t.id !== targetId))
      toast({
        title: "Target Deleted",
        description: "Target has been successfully deleted."
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete target.",
        variant: "destructive"
      })
    }
  }

  const handleUpdateTarget = async () => {
    if (!editingTarget) return

    try {
      await targetsService.updateTarget(editingTarget.id!, {
        monthlyTarget: editingTarget.monthlyTarget,
        dealsTarget: editingTarget.dealsTarget,
        period: editingTarget.period,
        description: editingTarget.description
      })
      
      await loadData() // Reload to get updated progress
      setEditingTarget(null)
      
      toast({
        title: "Target Updated",
        description: "Target has been successfully updated."
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update target.",
        variant: "destructive"
      })
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {isManager ? 'Target Management Dashboard' : 'My Sales Targets'}
          </h2>
          <p className="text-muted-foreground">
            {isManager 
              ? 'Comprehensive target management with real-time progress tracking'
              : 'Track your personal sales targets and performance'}
          </p>
        </div>

        {canManageTargets && (
          <DynamicTargetCreator 
            userRole={userRole} 
            user={user} 
            onTargetCreated={loadData}
          />
        )}
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Targets</p>
                <p className="text-2xl font-bold">{stats.totalTargets}</p>
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
                  ${stats.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  of ${stats.totalTargetRevenue.toLocaleString()}
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
                  {stats.avgProgress.toFixed(1)}%
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
                <div className="flex gap-1 mt-1">
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    {stats.exceededTargets} Exceeded
                  </Badge>
                  <Badge className="bg-red-100 text-red-800 text-xs">
                    {stats.behindTargets} Behind
                  </Badge>
                </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <div className="space-y-2">
              <Label>Team Member</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {availableTeams.map(member => (
                    <SelectItem key={member || 'unknown'} value={member || 'unknown'}>{member || 'Unknown'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTargets.map((target) => (
          <Card key={target.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{target.agentName}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {target.period}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(target.status)}>
                    {target.status.replace('-', ' ')}
                  </Badge>
                  {canManageTargets && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTarget(target)}
                        title="Edit Target (Manager Only)"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => target.id && handleDeleteTarget(target.id)}
                        title="Delete Target (Manager Only)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Revenue Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Revenue Target</span>
                  <span>${target.currentSales.toLocaleString()} / ${target.monthlyTarget.toLocaleString()}</span>
                </div>
                <Progress value={Math.min(target.salesProgress, 100)} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {target.salesProgress.toFixed(1)}% complete
                </p>
              </div>

              {/* Deals Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Deals Target</span>
                  <span>{target.currentDeals} / {target.dealsTarget}</span>
                </div>
                <Progress value={Math.min(target.dealsProgress, 100)} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {target.dealsProgress.toFixed(1)}% complete
                </p>
              </div>

              {/* Performance Indicators */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">
                    ${Math.round(target.currentSales / Math.max(target.currentDeals, 1)).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">
                    {Math.max(0, target.dealsTarget - target.currentDeals)}
                  </p>
                  <p className="text-xs text-muted-foreground">Deals to Go</p>
                </div>
              </div>

              {target.description && (
                <p className="text-sm text-muted-foreground border-t pt-2">
                  {target.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTargets.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No targets found</h3>
            <p className="text-muted-foreground mb-4">
              {targets.length === 0 
                ? "No targets have been created yet." 
                : "No targets match your current filters."}
            </p>
            {isManager && targets.length === 0 && (
              <DynamicTargetCreator 
                userRole={userRole} 
                user={user} 
                onTargetCreated={loadData}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Target Dialog */}
      {editingTarget && (
        <Dialog open={!!editingTarget} onOpenChange={() => setEditingTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Target for {editingTarget.agentName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Monthly Revenue Target ($)</Label>
                <Input
                  type="number"
                  value={editingTarget.monthlyTarget}
                  onChange={(e) => setEditingTarget(prev => prev ? {...prev, monthlyTarget: parseInt(e.target.value)} : null)}
                />
              </div>
              <div>
                <Label>Monthly Deals Target</Label>
                <Input
                  type="number"
                  value={editingTarget.dealsTarget}
                  onChange={(e) => setEditingTarget(prev => prev ? {...prev, dealsTarget: parseInt(e.target.value)} : null)}
                />
              </div>
              <div>
                <Label>Period</Label>
                <Select 
                  value={editingTarget.period} 
                  onValueChange={(value) => setEditingTarget(prev => prev ? {...prev, period: value} : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeriods.map(period => (
                      <SelectItem key={period} value={period}>{period}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={editingTarget.description || ''}
                  onChange={(e) => setEditingTarget(prev => prev ? {...prev, description: e.target.value} : null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditingTarget(null)}>Cancel</Button>
              <Button onClick={handleUpdateTarget}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
