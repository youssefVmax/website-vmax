"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Target, Users, Plus, Edit, Trash2, BarChart3, TrendingUp, Calendar, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"

interface DynamicTargetCreatorProps {
  userRole: 'manager' | 'salesman' | 'customer-service'
  user: { name: string; username: string; id: string; team?: string }
  onTargetCreated?: () => void
}

interface TeamMember {
  id: string
  name: string
  username: string
  team: string
  role: string
}

interface Team {
  id: string
  name: string
  members: TeamMember[]
}

export function DynamicTargetCreator({ userRole, user, onTargetCreated }: DynamicTargetCreatorProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [targetType, setTargetType] = useState<'individual' | 'team'>('individual')
  const [teams, setTeams] = useState<Team[]>([])
  const [allMembers, setAllMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    // Common fields
    monthlyTarget: '',
    dealsTarget: '',
    period: 'January 2025',
    description: '',
    
    // Individual target fields
    selectedMemberId: '',
    selectedMemberName: '',
    selectedMemberTeam: '',
    
    // Team target fields
    selectedTeamId: '',
    selectedTeamName: '',
    teamMembers: [] as string[],
    
    // Advanced options
    autoDistribute: true,
    notifyMembers: true,
    startDate: '',
    endDate: ''
  })

  const isManager = userRole === 'manager'

  // Load teams and members data
  useEffect(() => {
    const loadData = async () => {
      if (!isManager || !isOpen) return
      
      try {
        setLoadingData(true)
        
        // Get all salesmen
        const salesmen = await apiService.getUsers({ role: 'salesman' })
        const members: TeamMember[] = salesmen.map((user: any) => ({
          id: user.id,
          name: user.name || user.username,
          username: user.username,
          team: user.team || 'Unknown',
          role: user.role
        }))
        
        setAllMembers(members)
        
        // Group members by team
        const teamsMap = new Map<string, TeamMember[]>()
        members.forEach(member => {
          if (!teamsMap.has(member.team)) {
            teamsMap.set(member.team, [])
          }
          teamsMap.get(member.team)!.push(member)
        })
        
        const teamsData: Team[] = Array.from(teamsMap.entries()).map(([teamName, teamMembers]) => ({
          id: teamName.toLowerCase().replace(/\s+/g, '-'),
          name: teamName,
          members: teamMembers
        }))
        
        setTeams(teamsData)
      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          title: "Error",
          description: "Failed to load team data",
          variant: "destructive"
        })
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [isManager, isOpen, toast])

  // Generate period options
  const generatePeriodOptions = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const currentYear = new Date().getFullYear()
    const years = [currentYear, currentYear + 1]
    
    const options: string[] = []
    years.forEach(year => {
      months.forEach(month => {
        options.push(`${month} ${year}`)
      })
    })
    
    return options
  }

  const resetForm = () => {
    setFormData({
      monthlyTarget: '',
      dealsTarget: '',
      period: 'January 2025',
      description: '',
      selectedMemberId: '',
      selectedMemberName: '',
      selectedMemberTeam: '',
      selectedTeamId: '',
      selectedTeamName: '',
      teamMembers: [],
      autoDistribute: true,
      notifyMembers: true,
      startDate: '',
      endDate: ''
    })
    setTargetType('individual')
  }

  const handleMemberSelect = (memberId: string) => {
    const member = allMembers.find(m => m.id === memberId)
    if (member) {
      setFormData(prev => ({
        ...prev,
        selectedMemberId: memberId,
        selectedMemberName: member.name,
        selectedMemberTeam: member.team
      }))
    }
  }

  const handleTeamSelect = (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (team) {
      setFormData(prev => ({
        ...prev,
        selectedTeamId: teamId,
        selectedTeamName: team.name,
        teamMembers: team.members.map(m => m.id)
      }))
    }
  }

  const validateForm = () => {
    if (!formData.monthlyTarget || !formData.dealsTarget) {
      toast({
        title: "Missing Information",
        description: "Please fill in monthly target and deals target.",
        variant: "destructive"
      })
      return false
    }

    if (targetType === 'individual' && !formData.selectedMemberId) {
      toast({
        title: "Missing Information",
        description: "Please select a team member.",
        variant: "destructive"
      })
      return false
    }

    if (targetType === 'team' && !formData.selectedTeamId) {
      toast({
        title: "Missing Information",
        description: "Please select a team.",
        variant: "destructive"
      })
      return false
    }

    return true
  }

  const handleCreateTarget = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)

      if (targetType === 'individual') {
        // Create individual target
        const targetData = {
          type: 'individual' as const,
          agentId: formData.selectedMemberId,
          agentName: formData.selectedMemberName,
          monthlyTarget: parseInt(formData.monthlyTarget),
          dealsTarget: parseInt(formData.dealsTarget),
          period: formData.period,
          description: formData.description,
          managerId: user.id,
          managerName: user.name
        }

        await apiService.createTarget(targetData)
        
        toast({
          title: "Individual Target Created",
          description: `Target created for ${formData.selectedMemberName}`
        })
      } else {
        // Create team target
        const teamTargetData = {
          teamId: formData.selectedTeamId,
          teamName: formData.selectedTeamName,
          monthlyTarget: parseInt(formData.monthlyTarget),
          dealsTarget: parseInt(formData.dealsTarget),
          period: formData.period,
          description: formData.description,
          managerId: user.id,
          managerName: user.name,
          members: formData.teamMembers
        }

        const createdTeamTarget = await apiService.createTeamTarget(teamTargetData)
        
        // Optionally create individual targets for team members
        if (formData.autoDistribute) {
          await apiService.createIndividualTargetsFromTeamTarget(createdTeamTarget)
        }

        toast({
          title: "Team Target Created",
          description: `Team target created for ${formData.selectedTeamName}${formData.autoDistribute ? ' with individual targets distributed' : ''}`
        })
      }

      resetForm()
      setIsOpen(false)
      onTargetCreated?.()
    } catch (error) {
      console.error('Error creating target:', error)
      toast({
        title: "Error",
        description: "Failed to create target. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Strict access control - only managers can create targets
  if (userRole !== 'manager') {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          Create Target
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create Sales Target
          </DialogTitle>
          <DialogDescription>
            Set targets for individual team members or entire teams with automatic distribution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Target Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Target Type</Label>
            <RadioGroup
              value={targetType}
              onValueChange={(value: 'individual' | 'team') => setTargetType(value)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Individual Target
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="team" />
                <Label htmlFor="team" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Team Target
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Selection Section */}
          {targetType === 'individual' ? (
            <div className="space-y-3">
              <Label>Select Team Member</Label>
              <Select 
                value={formData.selectedMemberId} 
                onValueChange={handleMemberSelect}
                disabled={loadingData}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingData ? "Loading team members..." : "Select team member"} />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <div key={team.id}>
                      <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground bg-muted/50">
                        {team.name} Team
                      </div>
                      {team.members.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {member.team}
                            </Badge>
                            {member.name}
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              {formData.selectedMemberName && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm flex items-center">
                    <span className="font-medium">Selected:</span> 
                    <span className="ml-1">{formData.selectedMemberName}</span>
                    <Badge variant="secondary" className="ml-2">
                      {formData.selectedMemberTeam}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Select Team</Label>
              <Select 
                value={formData.selectedTeamId} 
                onValueChange={handleTeamSelect}
                disabled={loadingData}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingData ? "Loading teams..." : "Select team"} />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{team.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {team.members.length} members
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.selectedTeamName && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">
                    Selected Team: {formData.selectedTeamName}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {teams.find(t => t.id === formData.selectedTeamId)?.members.map(member => (
                      <Badge key={member.id} variant="secondary" className="text-xs">
                        {member.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Target Values */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Revenue Target ($)</Label>
              <Input
                type="number"
                value={formData.monthlyTarget}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyTarget: e.target.value }))}
                placeholder={targetType === 'team' ? "100000" : "15000"}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Deals Target</Label>
              <Input
                type="number"
                value={formData.dealsTarget}
                onChange={(e) => setFormData(prev => ({ ...prev, dealsTarget: e.target.value }))}
                placeholder={targetType === 'team' ? "150" : "20"}
              />
            </div>
          </div>

          {/* Period Selection */}
          <div className="space-y-2">
            <Label>Period</Label>
            <Select 
              value={formData.period} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, period: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generatePeriodOptions().map(period => (
                  <SelectItem key={period} value={period}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {period}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={targetType === 'team' 
                ? "Team objectives and goals for this period..." 
                : "Individual goals and expectations..."}
              rows={3}
            />
          </div>

          {/* Advanced Options for Team Targets */}
          {targetType === 'team' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Advanced Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Auto-distribute to members</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically create individual targets for each team member
                    </p>
                  </div>
                  <Switch
                    checked={formData.autoDistribute}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoDistribute: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Notify team members</Label>
                    <p className="text-xs text-muted-foreground">
                      Send notifications to team members about their new targets
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifyMembers}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifyMembers: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {(formData.monthlyTarget && formData.dealsTarget) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Target Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Revenue Target</p>
                    <p className="text-lg font-bold text-green-600">
                      ${parseInt(formData.monthlyTarget || '0').toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deals Target</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formData.dealsTarget}
                    </p>
                  </div>
                  {targetType === 'team' && formData.teamMembers.length > 0 && formData.autoDistribute && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Per Member Revenue</p>
                        <p className="text-sm font-medium">
                          ${Math.floor(parseInt(formData.monthlyTarget || '0') / formData.teamMembers.length).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Per Member Deals</p>
                        <p className="text-sm font-medium">
                          {Math.floor(parseInt(formData.dealsTarget || '0') / formData.teamMembers.length)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button 
            onClick={handleCreateTarget} 
            disabled={loading || loadingData}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            {loading ? "Creating..." : `Create ${targetType === 'team' ? 'Team' : 'Individual'} Target`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
