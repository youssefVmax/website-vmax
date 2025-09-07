"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import NotificationsManager from "@/components/notifications-manager"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Target, TrendingUp, Calendar, Award, Edit, Plus, Users, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSalesData } from "@/hooks/useSalesData"

interface SalesTarget {
  id: string
  agentId: string
  agentName: string
  team: string
  monthlyTarget: number
  currentSales: number
  dealsTarget: number
  currentDeals: number
  period: string
  status: 'on-track' | 'behind' | 'exceeded'
}

interface SalesTargetsProps {
  userRole: 'manager' | 'salesman' | 'customer-service'
  user: { name: string; username: string; id: string }
}

export function SalesTargets({ userRole, user }: SalesTargetsProps) {
  const { toast } = useToast()
  const { sales } = useSalesData(userRole, user.id, user.name)
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [newTarget, setNewTarget] = useState({
    agentId: '',
    agentName: '',
    team: '',
    monthlyTarget: '',
    dealsTarget: '',
    period: 'January 2025'
  })

  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null)

  const isManager = userRole === 'manager'

  // Fetch targets from API and poll for real-time updates
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const res = await fetch('/api/targets')
        if (!res.ok) throw new Error('Failed to fetch targets')
        const data = await res.json()
        setTargets(data)
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not load sales targets.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTargets() // Initial fetch

    const interval = setInterval(fetchTargets, 30000) // Poll every 30 seconds

    return () => clearInterval(interval) // Cleanup on unmount
  }, [toast])

  // Filter and process targets based on user role and sales data
  const processedTargets: SalesTarget[] = useMemo(() => {
    const targetsToProcess = userRole === 'salesman' 
      ? targets.filter(t => t.agentName.toLowerCase() === user.name.toLowerCase() || t.agentId === user.id)
      : targets;

    if (!sales) {
      return targetsToProcess.map(t => ({ ...t, currentSales: 0, currentDeals: 0, status: 'behind' }));
    }

    return targetsToProcess.map(target => {
      const agentSales = sales.filter(sale => 
        sale.sales_agent_norm?.toLowerCase() === target.agentName.toLowerCase() ||
        sale.SalesAgentID === target.agentId
      );
      
      const currentSales = agentSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
      const currentDeals = agentSales.length;
      
      const salesProgress = target.monthlyTarget > 0 ? (currentSales / target.monthlyTarget) * 100 : 0;
      const dealsProgress = target.dealsTarget > 0 ? (currentDeals / target.dealsTarget) * 100 : 0;
      
      let status: 'on-track' | 'behind' | 'exceeded' = 'on-track';
      if (salesProgress >= 100 || dealsProgress >= 100) {
        status = 'exceeded';
      } else if (salesProgress < 70 && dealsProgress < 70) {
        status = 'behind';
      }

      return {
        ...target,
        currentSales,
        currentDeals,
        status
      };
    });
  }, [sales, targets, userRole, user.name, user.id]);

  const salesAgents = useMemo(() => {
    if (!sales) return []
    const agents = sales.reduce((acc, sale) => {
      const agentName = sale.sales_agent_norm || sale.sales_agent
      const agentId = sale.SalesAgentID
      if (agentName && agentId && !acc.some(a => a.id === agentId)) {
        acc.push({ id: agentId, name: agentName, team: sale.team || 'Unknown' })
      }
      return acc
    }, [] as { id: string, name: string, team: string }[])
    return agents.sort((a, b) => a.name.localeCompare(b.name))
  }, [sales])

  const handleCreateTarget = async () => {
    if (!newTarget.agentId || !newTarget.monthlyTarget || !newTarget.dealsTarget) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    const selectedAgent = salesAgents.find(a => a.id === newTarget.agentId)
    if (!selectedAgent) return

    const payload = {
      agentId: newTarget.agentId,
      agentName: selectedAgent.name,
      team: selectedAgent.team,
      monthlyTarget: parseInt(newTarget.monthlyTarget),
      dealsTarget: parseInt(newTarget.dealsTarget),
      period: newTarget.period,
    }

    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to create target')
      
      const createdTarget = await res.json()
      setTargets(prev => [...prev, createdTarget])
      setNewTarget({ agentId: '', agentName: '', team: '', monthlyTarget: '', dealsTarget: '', period: 'January 2025' })
      
      toast({
        title: "Target Created",
        description: `Sales target created for ${createdTarget.agentName}.`
      })
      document.getElementById('close-create-dialog')?.click()
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not create sales target.",
        variant: "destructive"
      })
    }
  }

  const handleUpdateTarget = async () => {
    if (!editingTarget) return

    try {
        const res = await fetch('/api/targets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editingTarget.id,
                monthlyTarget: editingTarget.monthlyTarget,
                dealsTarget: editingTarget.dealsTarget,
                period: editingTarget.period
            })
        })
        if (!res.ok) throw new Error('Failed to update target')

        const updatedTarget = await res.json()
        setTargets(prev => 
            prev.map(target => 
                target.id === updatedTarget.id ? { ...target, ...updatedTarget } : target
            )
        )
        
        setEditingTarget(null)
        toast({
            title: "Target Updated",
            description: "Sales target has been updated successfully."
        })
    } catch (error) {
        toast({
            title: "Error",
            description: "Could not update sales target.",
            variant: "destructive"
        })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeded': return 'bg-green-100 text-green-800'
      case 'on-track': return 'bg-blue-100 text-blue-800'
      case 'behind': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }


  if (isLoading) {
    return <div>Loading targets...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {isManager ? 'Team Sales Targets' : 'My Sales Targets'}
          </h2>
          <p className="text-muted-foreground">
            {isManager 
              ? 'Set and monitor sales targets for your team members'
              : 'Track your personal sales targets and progress'}
          </p>
        </div>

      {/* Manager Notifications Panel */}
      {isManager && (
        <NotificationsManager />
      )}
        {isManager && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Set New Target
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Sales Target</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="agent">Sales Agent</Label>
                  <Select value={newTarget.agentId} onValueChange={(value) => setNewTarget(prev => ({ ...prev, agentId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesAgents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="monthly-target">Monthly Revenue Target ($)</Label>
                  <Input
                    id="monthly-target"
                    type="number"
                    value={newTarget.monthlyTarget}
                    onChange={(e) => setNewTarget(prev => ({ ...prev, monthlyTarget: e.target.value }))}
                    placeholder="15000"
                  />
                </div>

                <div>
                  <Label htmlFor="deals-target">Monthly Deals Target</Label>
                  <Input
                    id="deals-target"
                    type="number"
                    value={newTarget.dealsTarget}
                    onChange={(e) => setNewTarget(prev => ({ ...prev, dealsTarget: e.target.value }))}
                    placeholder="20"
                  />
                </div>

                <div>
                  <Label htmlFor="period">Period</Label>
                  <Select value={newTarget.period} onValueChange={(value) => setNewTarget(prev => ({ ...prev, period: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="January 2025">January 2025</SelectItem>
                      <SelectItem value="February 2025">February 2025</SelectItem>
                      <SelectItem value="March 2025">March 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button id="close-create-dialog" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreateTarget}>
                  Create Target
                </Button>
              </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Targets Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {processedTargets.map((target) => {
          const salesProgress = (target.currentSales / target.monthlyTarget) * 100
          const dealsProgress = (target.currentDeals / target.dealsTarget) * 100

          return (
            <Card key={target.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg capitalize">{target.agentName}</CardTitle>
                    <CardDescription>
                      <Badge variant="outline">{target.team}</Badge>
                      <span className="ml-2 text-xs">{target.period}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(target.status)}>
                      {target.status.replace('-', ' ')}
                    </Badge>
                    {isManager && (
                      <Dialog>
                        <DialogTrigger asChild>
                           <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setEditingTarget(target)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Sales Target for {editingTarget?.agentName}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="edit-monthly-target">Monthly Revenue Target ($)</Label>
                                    <Input
                                        id="edit-monthly-target"
                                        type="number"
                                        value={editingTarget?.monthlyTarget || ''}
                                        onChange={(e) => setEditingTarget(prev => prev ? { ...prev, monthlyTarget: parseInt(e.target.value) } : null)}
                                        placeholder="15000"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-deals-target">Monthly Deals Target</Label>
                                    <Input
                                        id="edit-deals-target"
                                        type="number"
                                        value={editingTarget?.dealsTarget || ''}
                                        onChange={(e) => setEditingTarget(prev => prev ? { ...prev, dealsTarget: parseInt(e.target.value) } : null)}
                                        placeholder="20"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-period">Period</Label>
                                    <Select 
                                        value={editingTarget?.period || ''} 
                                        onValueChange={(value) => setEditingTarget(prev => prev ? { ...prev, period: value } : null)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="January 2025">January 2025</SelectItem>
                                            <SelectItem value="February 2025">February 2025</SelectItem>
                                            <SelectItem value="March 2025">March 2025</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="ghost" onClick={() => setEditingTarget(null)}>Cancel</Button>
                                </DialogClose>
                                <Button onClick={handleUpdateTarget}>Save Changes</Button>
                            </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Revenue Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Revenue Target</span>
                    <span className="text-sm text-muted-foreground">
                      ${target.currentSales.toLocaleString()} / ${target.monthlyTarget.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={Math.min(salesProgress, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {salesProgress.toFixed(1)}% complete
                  </p>
                </div>

                {/* Deals Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Deals Target</span>
                    <span className="text-sm text-muted-foreground">
                      {target.currentDeals} / {target.dealsTarget}
                    </span>
                  </div>
                  <Progress value={Math.min(dealsProgress, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {dealsProgress.toFixed(1)}% complete
                  </p>
                </div>

                {/* Performance Indicators */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      ${Math.round(target.currentSales / Math.max(target.currentDeals, 1)).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {target.dealsTarget - target.currentDeals > 0 ? target.dealsTarget - target.currentDeals : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Deals to Go</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Team Performance Summary (Manager Only) */}
      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Team Performance Summary
            </CardTitle>
            <CardDescription>Overall team performance against targets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {targets.filter(t => t.status === 'exceeded').length}
                </p>
                <p className="text-sm text-muted-foreground">Agents Exceeding Targets</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {targets.filter(t => t.status === 'on-track').length}
                </p>
                <p className="text-sm text-muted-foreground">Agents On Track</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {targets.filter(t => t.status === 'behind').length}
                </p>
                <p className="text-sm text-muted-foreground">Agents Behind Target</p>
              </div>
            </div>

            <div className="space-y-3">
              {[...new Set(processedTargets.map(t => t.team))].map(team => {
                const teamTargets = targets.filter(t => t.team === team)
                const teamRevenue = teamTargets.reduce((sum, t) => sum + t.currentSales, 0)
                const teamTarget = teamTargets.reduce((sum, t) => sum + t.monthlyTarget, 0)
                const teamProgress = teamTarget > 0 ? (teamRevenue / teamTarget) * 100 : 0

                return (
                  <div key={team} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{team}</h4>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${teamRevenue.toLocaleString()} / ${teamTarget.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {teamTargets.length} agents
                        </p>
                      </div>
                    </div>
                    <Progress value={Math.min(teamProgress, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {teamProgress.toFixed(1)}% of team target
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Performance (Salesman View) */}
      {!isManager && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              My Performance
            </CardTitle>
            <CardDescription>Your current performance against targets</CardDescription>
          </CardHeader>
          <CardContent>
            {processedTargets.length > 0 ? (
              <div className="space-y-6">
                {processedTargets.map(target => {
                  const salesProgress = (target.currentSales / target.monthlyTarget) * 100
                  const dealsProgress = (target.currentDeals / target.dealsTarget) * 100

                  return (
                    <div key={target.id} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <h4 className="font-medium">Revenue Progress</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Current: ${target.currentSales.toLocaleString()}</span>
                              <span>Target: ${target.monthlyTarget.toLocaleString()}</span>
                            </div>
                            <Progress value={Math.min(salesProgress, 100)} className="h-3" />
                            <p className="text-xs text-muted-foreground">
                              {salesProgress.toFixed(1)}% complete
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Deals Progress</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Current: {target.currentDeals}</span>
                              <span>Target: {target.dealsTarget}</span>
                            </div>
                            <Progress value={Math.min(dealsProgress, 100)} className="h-3" />
                            <p className="text-xs text-muted-foreground">
                              {dealsProgress.toFixed(1)}% complete
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <p className="text-xl font-bold text-green-600">
                            ${Math.round(target.currentSales / Math.max(target.currentDeals, 1)).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-blue-600">
                            {target.dealsTarget - target.currentDeals}
                          </p>
                          <p className="text-xs text-muted-foreground">Deals Remaining</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-purple-600">
                            ${(target.monthlyTarget - target.currentSales).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Revenue Remaining</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-orange-600">
                            {Math.round((target.monthlyTarget - target.currentSales) / Math.max(target.dealsTarget - target.currentDeals, 1))}
                          </p>
                          <p className="text-xs text-muted-foreground">Avg Needed/Deal</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No targets set</h3>
                <p className="text-muted-foreground">Contact your manager to set up sales targets</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  )
}