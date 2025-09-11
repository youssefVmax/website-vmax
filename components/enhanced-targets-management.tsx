"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Target, Users, Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { targetsService } from "@/lib/firebase-targets-service"
import { Target as TargetType, TeamTarget } from "@/types/firebase"

interface EnhancedTargetsProps {
  userRole: 'manager' | 'salesman' | 'customer-service'
  user: { name: string; username: string; id: string }
}

export function EnhancedTargetsManagement({ userRole, user }: EnhancedTargetsProps) {
  const { toast } = useToast()
  const [targets, setTargets] = useState<TargetType[]>([])
  const [teamTargets, setTeamTargets] = useState<TeamTarget[]>([])
  const [teams, setTeams] = useState<Array<{id: string, name: string, members: Array<{id: string, name: string}>}>>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("individual")
  const [targetProgress, setTargetProgress] = useState<Record<string, {currentSales: number, currentDeals: number}>>({})
  const [editingTarget, setEditingTarget] = useState<TargetType | null>(null)

  // Generate dynamic periods (months and years)
  const generatePeriods = () => {
    const currentYear = new Date().getFullYear()
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const years = [currentYear, currentYear + 1, currentYear + 2] // Current year + 2 future years
    
    const periods = []
    for (const year of years) {
      for (const month of months) {
        periods.push(`${month} ${year}`)
      }
    }
    return periods
  }

  const availablePeriods = generatePeriods()
  const currentPeriod = `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`

  const [newIndividualTarget, setNewIndividualTarget] = useState({
    agentId: '',
    agentName: '',
    monthlyTarget: '',
    dealsTarget: '',
    period: currentPeriod,
    description: ''
  })

  const [newTeamTarget, setNewTeamTarget] = useState({
    teamId: '',
    teamName: '',
    monthlyTarget: '',
    dealsTarget: '',
    period: currentPeriod,
    description: '',
    members: [] as string[]
  })

  const isManager = userRole === 'manager'

  // Load data and progress
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        if (isManager) {
          const [targetsData, teamTargetsData, teamsData] = await Promise.all([
            targetsService.getTargets(user.id, userRole),
            targetsService.getTeamTargets(user.id),
            targetsService.getTeamsWithMembers()
          ])
          
          setTargets(targetsData)
          setTeamTargets(teamTargetsData)
          setTeams(teamsData)

          // Load progress for all targets
          const progressData: Record<string, {currentSales: number, currentDeals: number}> = {}
          for (const target of targetsData) {
            if (target.agentId) {
              const progress = await targetsService.getTargetProgress(target.agentId, target.period)
              progressData[target.id!] = {
                currentSales: progress.currentSales,
                currentDeals: progress.currentDeals
              }
            }
          }
          setTargetProgress(progressData)
        } else {
          const targetsData = await targetsService.getTargets(user.id, userRole)
          setTargets(targetsData)

          // Load progress for user's targets
          const progressData: Record<string, {currentSales: number, currentDeals: number}> = {}
          for (const target of targetsData) {
            const progress = await targetsService.getTargetProgress(user.id, target.period)
            progressData[target.id!] = {
              currentSales: progress.currentSales,
              currentDeals: progress.currentDeals
            }
          }
          setTargetProgress(progressData)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load targets data",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user.id, userRole, isManager, toast])

  // Delete target
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

  // Delete team target
  const handleDeleteTeamTarget = async (targetId: string) => {
    try {
      await targetsService.deleteTeamTarget(targetId)
      setTeamTargets(prev => prev.filter(t => t.id !== targetId))
      toast({
        title: "Team Target Deleted",
        description: "Team target has been successfully deleted."
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete team target.",
        variant: "destructive"
      })
    }
  }

  // Update target
  const handleUpdateTarget = async () => {
    if (!editingTarget) return

    try {
      const updatedTarget = await targetsService.updateTarget(editingTarget.id!, {
        monthlyTarget: editingTarget.monthlyTarget,
        dealsTarget: editingTarget.dealsTarget,
        period: editingTarget.period,
        description: editingTarget.description
      })
      
      setTargets(prev => prev.map(t => t.id === editingTarget.id ? updatedTarget : t))
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

  // Create individual target
  const handleCreateIndividualTarget = async () => {
    if (!newIndividualTarget.agentId || !newIndividualTarget.monthlyTarget || !newIndividualTarget.dealsTarget) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    try {
      const targetData = {
        type: 'individual' as const,
        agentId: newIndividualTarget.agentId,
        agentName: newIndividualTarget.agentName,
        monthlyTarget: parseInt(newIndividualTarget.monthlyTarget),
        dealsTarget: parseInt(newIndividualTarget.dealsTarget),
        period: newIndividualTarget.period,
        description: newIndividualTarget.description,
        managerId: user.id,
        managerName: user.name
      }

      const createdTarget = await targetsService.addTarget(targetData)
      setTargets(prev => [...prev, createdTarget])
      setNewIndividualTarget({
        agentId: '',
        agentName: '',
        monthlyTarget: '',
        dealsTarget: '',
        period: currentPeriod,
        description: ''
      })

      toast({
        title: "Target Created",
        description: `Individual target created for ${createdTarget.agentName}.`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not create individual target.",
        variant: "destructive"
      })
    }
  }

  // Create team target
  const handleCreateTeamTarget = async () => {
    if (!newTeamTarget.teamId || !newTeamTarget.monthlyTarget || !newTeamTarget.dealsTarget) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    try {
      const selectedTeam = teams.find(t => t.id === newTeamTarget.teamId)
      if (!selectedTeam) return

      const teamTargetData = {
        teamId: newTeamTarget.teamId,
        teamName: selectedTeam.name,
        monthlyTarget: parseInt(newTeamTarget.monthlyTarget),
        dealsTarget: parseInt(newTeamTarget.dealsTarget),
        period: newTeamTarget.period,
        description: newTeamTarget.description,
        managerId: user.id,
        managerName: user.name,
        members: selectedTeam.members.map(m => m.id)
      }

      const createdTeamTarget = await targetsService.addTeamTarget(teamTargetData)
      setTeamTargets(prev => [...prev, createdTeamTarget])

      // Optionally create individual targets for team members
      const individualTargets = await targetsService.createIndividualTargetsFromTeamTarget(createdTeamTarget)
      setTargets(prev => [...prev, ...individualTargets])
      setNewTeamTarget({
        teamId: '',
        teamName: '',
        monthlyTarget: '',
        dealsTarget: '',
        period: currentPeriod,
        description: '',
        members: []
      })

      toast({
        title: "Team Target Created",
        description: `Team target created for ${createdTeamTarget.teamName} with individual targets for ${individualTargets.length} members.`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not create team target.",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading targets...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {isManager ? 'Target Management Dashboard' : 'My Sales Targets'}
          </h2>
          <p className="text-muted-foreground">
            {isManager 
              ? 'Create and monitor sales targets for teams and individual members'
              : 'Track your personal sales targets and progress'}
          </p>
        </div>
        
        {/* Quick Action Buttons for Managers */}
        {isManager && (
          <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg">
                  <Target className="h-4 w-4 mr-2" />
                  Set Individual Target
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Create Individual Target</DialogTitle>
                  <p className="text-sm text-muted-foreground">Set a sales target for a specific team member</p>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Select Team Member *</Label>
                    <Select value={newIndividualTarget.agentId} onValueChange={(value) => {
                      const allMembers = teams.flatMap(team => team.members)
                      const member = allMembers.find(m => m.id === value)
                      if (member) {
                        setNewIndividualTarget(prev => ({
                          ...prev,
                          agentId: value,
                          agentName: member.name
                        }))
                      }
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a team member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <div key={team.id}>
                            <div className="px-2 py-1 text-sm font-medium text-muted-foreground bg-muted/50">
                              {team.name} Team
                            </div>
                            {team.members.map(member => (
                              <SelectItem key={member.id} value={member.id} className="pl-6">
                                {member.name}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium">Revenue Target ($) *</Label>
                      <Input
                        type="number"
                        value={newIndividualTarget.monthlyTarget}
                        onChange={(e) => setNewIndividualTarget(prev => ({ ...prev, monthlyTarget: e.target.value }))}
                        placeholder="15,000"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Deals Target *</Label>
                      <Input
                        type="number"
                        value={newIndividualTarget.dealsTarget}
                        onChange={(e) => setNewIndividualTarget(prev => ({ ...prev, dealsTarget: e.target.value }))}
                        placeholder="20"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Target Period *</Label>
                    <Select value={newIndividualTarget.period} onValueChange={(value) => 
                      setNewIndividualTarget(prev => ({ ...prev, period: value }))
                    }>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePeriods.map(period => (
                          <SelectItem key={period} value={period}>
                            {period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Description (Optional)</Label>
                    <Textarea
                      value={newIndividualTarget.description}
                      onChange={(e) => setNewIndividualTarget(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Add notes about this target..."
                      className="mt-1 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleCreateIndividualTarget} className="bg-gradient-to-r from-cyan-500 to-blue-500">
                    Create Individual Target
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg">
                  <Users className="h-4 w-4 mr-2" />
                  Set Team Target
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Create Team Target</DialogTitle>
                  <p className="text-sm text-muted-foreground">Set a collective sales target for an entire team</p>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Select Team *</Label>
                    <Select value={newTeamTarget.teamId} onValueChange={(value) => {
                      const team = teams.find(t => t.id === value)
                      if (team) {
                        setNewTeamTarget(prev => ({
                          ...prev,
                          teamId: value,
                          teamName: team.name,
                          members: team.members.map(m => m.id)
                        }))
                      }
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a team..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{team.name}</span>
                              <Badge variant="secondary" className="ml-2">
                                {team.members.length} members
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium">Team Revenue Target ($) *</Label>
                      <Input
                        type="number"
                        value={newTeamTarget.monthlyTarget}
                        onChange={(e) => setNewTeamTarget(prev => ({ ...prev, monthlyTarget: e.target.value }))}
                        placeholder="100,000"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Team Deals Target *</Label>
                      <Input
                        type="number"
                        value={newTeamTarget.dealsTarget}
                        onChange={(e) => setNewTeamTarget(prev => ({ ...prev, dealsTarget: e.target.value }))}
                        placeholder="150"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Target Period *</Label>
                    <Select value={newTeamTarget.period} onValueChange={(value) => 
                      setNewTeamTarget(prev => ({ ...prev, period: value }))
                    }>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePeriods.map(period => (
                          <SelectItem key={period} value={period}>
                            {period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {newTeamTarget.teamId && (
                    <div>
                      <Label className="text-sm font-medium">Team Members</Label>
                      <div className="mt-2 p-3 bg-muted/50 rounded-md">
                        <div className="flex flex-wrap gap-1">
                          {teams.find(t => t.id === newTeamTarget.teamId)?.members.map(member => (
                            <Badge key={member.id} variant="secondary" className="text-xs">
                              {member.name}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Individual targets will be automatically created for each member
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium">Description (Optional)</Label>
                    <Textarea
                      value={newTeamTarget.description}
                      onChange={(e) => setNewTeamTarget(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Team goals and objectives..."
                      className="mt-1 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleCreateTeamTarget} className="bg-gradient-to-r from-purple-500 to-pink-500">
                    Create Team Target
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {isManager ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual">Individual Targets</TabsTrigger>
            <TabsTrigger value="team">Team Targets</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-6">
            {/* Individual Targets Management */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Individual Targets</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-500">
                    <Plus className="h-4 w-4 mr-2" />
                    Set Individual Target
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Individual Target</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Select Team Member</Label>
                      <Select value={newIndividualTarget.agentId} onValueChange={(value) => {
                        const allMembers = teams.flatMap(team => team.members)
                        const member = allMembers.find(m => m.id === value)
                        if (member) {
                          setNewIndividualTarget(prev => ({
                            ...prev,
                            agentId: value,
                            agentName: member.name
                          }))
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map(team => (
                            <div key={team.id}>
                              <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                                {team.name}
                              </div>
                              {team.members.map(member => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Monthly Revenue Target ($)</Label>
                      <Input
                        type="number"
                        value={newIndividualTarget.monthlyTarget}
                        onChange={(e) => setNewIndividualTarget(prev => ({ ...prev, monthlyTarget: e.target.value }))}
                        placeholder="15000"
                      />
                    </div>

                    <div>
                      <Label>Monthly Deals Target</Label>
                      <Input
                        type="number"
                        value={newIndividualTarget.dealsTarget}
                        onChange={(e) => setNewIndividualTarget(prev => ({ ...prev, dealsTarget: e.target.value }))}
                        placeholder="20"
                      />
                    </div>

                    <div>
                      <Label>Period</Label>
                      <Select value={newIndividualTarget.period} onValueChange={(value) => 
                        setNewIndividualTarget(prev => ({ ...prev, period: value }))
                      }>
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

                    <div>
                      <Label>Description (Optional)</Label>
                      <Textarea
                        value={newIndividualTarget.description}
                        onChange={(e) => setNewIndividualTarget(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Additional notes about this target..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleCreateIndividualTarget}>
                      Create Target
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Individual Targets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {targets.filter(t => t.type === 'individual').map((target) => {
                const progress = targetProgress[target.id!] || { currentSales: 0, currentDeals: 0 }
                const salesProgress = target.monthlyTarget > 0 ? (progress.currentSales / target.monthlyTarget) * 100 : 0
                const dealsProgress = target.dealsTarget > 0 ? (progress.currentDeals / target.dealsTarget) * 100 : 0
                
                return (
                  <Card key={target.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{target.agentName}</CardTitle>
                          <CardDescription>{target.period}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Individual</Badge>
                          {isManager && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingTarget(target)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTarget(target.id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Revenue Target</span>
                          <span>${progress.currentSales.toLocaleString()} / ${target.monthlyTarget.toLocaleString()}</span>
                        </div>
                        <Progress value={Math.min(salesProgress, 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {salesProgress.toFixed(1)}% complete
                        </p>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Deals Target</span>
                          <span>{progress.currentDeals} / {target.dealsTarget}</span>
                        </div>
                        <Progress value={Math.min(dealsProgress, 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {dealsProgress.toFixed(1)}% complete
                        </p>
                      </div>
                      {target.description && (
                        <p className="text-sm text-muted-foreground">{target.description}</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            {/* Team Targets Management */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Team Targets</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                    <Users className="h-4 w-4 mr-2" />
                    Set Team Target
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Team Target</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Select Team</Label>
                      <Select value={newTeamTarget.teamId} onValueChange={(value) => {
                        const team = teams.find(t => t.id === value)
                        if (team) {
                          setNewTeamTarget(prev => ({
                            ...prev,
                            teamId: value,
                            teamName: team.name,
                            members: team.members.map(m => m.id)
                          }))
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map(team => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name} ({team.members.length} members)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Team Monthly Revenue Target ($)</Label>
                      <Input
                        type="number"
                        value={newTeamTarget.monthlyTarget}
                        onChange={(e) => setNewTeamTarget(prev => ({ ...prev, monthlyTarget: e.target.value }))}
                        placeholder="100000"
                      />
                    </div>

                    <div>
                      <Label>Team Monthly Deals Target</Label>
                      <Input
                        type="number"
                        value={newTeamTarget.dealsTarget}
                        onChange={(e) => setNewTeamTarget(prev => ({ ...prev, dealsTarget: e.target.value }))}
                        placeholder="150"
                      />
                    </div>

                    <div>
                      <Label>Period</Label>
                      <Select value={newTeamTarget.period} onValueChange={(value) => 
                        setNewTeamTarget(prev => ({ ...prev, period: value }))
                      }>
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

                    <div>
                      <Label>Description (Optional)</Label>
                      <Textarea
                        value={newTeamTarget.description}
                        onChange={(e) => setNewTeamTarget(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Team goals and objectives..."
                      />
                    </div>

                    {newTeamTarget.teamId && (
                      <div>
                        <Label>Team Members</Label>
                        <div className="mt-2 space-y-1">
                          {teams.find(t => t.id === newTeamTarget.teamId)?.members.map(member => (
                            <Badge key={member.id} variant="secondary">
                              {member.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleCreateTeamTarget}>
                      Create Team Target
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Team Targets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teamTargets.map((teamTarget) => (
                <Card key={teamTarget.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{teamTarget.teamName}</CardTitle>
                        <CardDescription>{teamTarget.period}</CardDescription>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">Team</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Team Revenue Target</span>
                        <span>${teamTarget.monthlyTarget.toLocaleString()}</span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Team Deals Target</span>
                        <span>{teamTarget.dealsTarget}</span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Team Members ({teamTarget.members.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {teams.find(t => t.id === teamTarget.teamId)?.members.slice(0, 3).map(member => (
                          <Badge key={member.id} variant="outline" className="text-xs">
                            {member.name}
                          </Badge>
                        ))}
                        {teamTarget.members.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{teamTarget.members.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    {teamTarget.description && (
                      <p className="text-sm text-muted-foreground">{teamTarget.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        // Salesman view - show only their targets
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {targets.map((target) => (
            <Card key={target.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">My Target</CardTitle>
                    <CardDescription>{target.period}</CardDescription>
                  </div>
                  <Badge variant="outline">
                    {target.type === 'individual' ? 'Individual' : 'Team'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Revenue Target</span>
                    <span>${target.monthlyTarget.toLocaleString()}</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Deals Target</span>
                    <span>{target.dealsTarget}</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
                {target.description && (
                  <p className="text-sm text-muted-foreground">{target.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Individual Target Dialog */}
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
                    <SelectItem value="January 2025">January 2025</SelectItem>
                    <SelectItem value="February 2025">February 2025</SelectItem>
                    <SelectItem value="March 2025">March 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
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
