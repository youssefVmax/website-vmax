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
import { targetsService } from "@/lib/mysql-targets-service"

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

        // Fetch all users directly from Next.js API (same source as Users page)
        const res = await fetch(`/api/users?limit=1000`, {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        })
        const json = await res.json()
        const users = json?.users || []

        // Filter to sales-facing roles and to the two known teams
        const allowedTeams = new Set(['ALI ASHRAF', 'CS TEAM'])
        const members: TeamMember[] = (users || [])
          .filter((u: any) => u && (u.role === 'salesman' || u.role === 'team_leader'))
          .map((u: any) => ({
            id: (u.id ?? '').toString() || (u.username ?? u.email ?? 'unknown'),
            name: u.name || u.username || u.email || 'Unknown User',
            username: u.username || u.email || u.name || (u.id ?? '').toString(),
            team: allowedTeams.has(u.team) ? u.team : (u.team ? u.team : 'Unknown'),
            role: u.role || 'salesman'
          }))

        setAllMembers(members)

        // Group members by team
        const teamsMap = new Map<string, TeamMember[]>()
        members.forEach(member => {
          const teamName = allowedTeams.has(member.team) ? member.team : 'Unknown'
          if (!teamsMap.has(teamName)) teamsMap.set(teamName, [])
          teamsMap.get(teamName)!.push(member)
        })

        // Only show the two supported teams explicitly; group others under 'Unknown'
        let teamsData: Team[] = Array.from(teamsMap.entries())
          .filter(([teamName]) => teamName === 'ALI ASHRAF' || teamName === 'CS TEAM' || teamName === 'Unknown')
          .map(([teamName, teamMembers]) => ({
            id: (teamName || 'unknown').toLowerCase().replace(/\s+/g, '-'),
            name: teamName || 'Unknown',
            members: teamMembers
          }))

        // Ensure the two known teams are always present even if empty, to allow selection
        const ensureTeam = (name: string) => {
          if (!teamsData.find(t => t.name === name)) {
            teamsData.push({ id: name.toLowerCase().replace(/\s+/g, '-'), name, members: [] })
          }
        }
        ensureTeam('ALI ASHRAF')
        ensureTeam('CS TEAM')
        // Keep Unknown last
        teamsData = [
          ...teamsData.filter(t => t.name === 'ALI ASHRAF' || t.name === 'CS TEAM'),
          ...teamsData.filter(t => t.name !== 'ALI ASHRAF' && t.name !== 'CS TEAM')
        ]

        setTeams(teamsData)
      } catch (error) {
        console.error('Error loading data:', error)
        toast({ title: 'Error', description: 'Failed to load team data', variant: 'destructive' })
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [isManager, isOpen, toast])

  // Generate period options (current month and future months only)
  const generatePeriodOptions = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-based

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const periods: string[] = []
    const years = [currentYear, currentYear + 1, currentYear + 2] // Current year + 2 future years

    years.forEach(year => {
      months.forEach((month, monthIndex) => {
        // For current year, only include current month and future months
        if (year === currentYear && monthIndex < currentMonth) {
          return // Skip past months in current year
        }
        // For future years, include all months
        periods.push(`${month} ${year}`)
      })
    })

    return periods
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
    // Ignore header rows injected into SelectContent
    if (memberId.startsWith('__header_')) return;
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
          salesAgentId: formData.selectedMemberId,
          salesAgentName: formData.selectedMemberName,
          salesTeam: '', // Will be filled based on agent
          targetAmount: parseInt(formData.monthlyTarget),
          targetDeals: parseInt(formData.dealsTarget),
          currentAmount: 0,
          currentDeals: 0,
          month: formData.period.split(' ')[0],
          year: parseInt(formData.period.split(' ')[1]),
          agentId: formData.selectedMemberId,
          agentName: formData.selectedMemberName,
          monthlyTarget: parseInt(formData.monthlyTarget),
          dealsTarget: parseInt(formData.dealsTarget),
          period: formData.period,
          description: formData.description,
          managerId: user.id,
          managerName: user.name,
          type: 'individual' as const
        }

        await targetsService.createTarget(targetData)
        
        toast({
          title: "Individual Target Created",
          description: `Target created for ${formData.selectedMemberName}`
        })
      } else {
        // Create team target
        const teamTargetData = {
          salesAgentId: user.id,
          salesAgentName: `Team: ${formData.selectedTeamName}`,
          salesTeam: formData.selectedTeamName,
          targetAmount: parseInt(formData.monthlyTarget),
          targetDeals: parseInt(formData.dealsTarget),
          currentAmount: 0,
          currentDeals: 0,
          month: formData.period.split(' ')[0],
          year: parseInt(formData.period.split(' ')[1]),
          agentId: user.id,
          agentName: `Team: ${formData.selectedTeamName}`,
          monthlyTarget: parseInt(formData.monthlyTarget),
          dealsTarget: parseInt(formData.dealsTarget),
          period: formData.period,
          description: `Team target: ${formData.description}`,
          managerId: user.id,
          managerName: user.name,
          members: formData.teamMembers,
          type: 'team' as const
        }

        // For team targets, we need to create individual targets for each member
        const individualTargets = formData.teamMembers.map(memberId => {
          const member = allMembers.find(m => m.id === memberId)
          return {
            salesAgentId: memberId,
            salesAgentName: member?.name || 'Unknown',
            salesTeam: formData.selectedTeamName,
            targetAmount: Math.floor(parseInt(formData.monthlyTarget) / formData.teamMembers.length),
            targetDeals: Math.floor(parseInt(formData.dealsTarget) / formData.teamMembers.length),
            currentAmount: 0,
            currentDeals: 0,
            month: formData.period.split(' ')[0],
            year: parseInt(formData.period.split(' ')[1]),
            agentId: memberId,
            agentName: member?.name || 'Unknown',
            monthlyTarget: Math.floor(parseInt(formData.monthlyTarget) / formData.teamMembers.length),
            dealsTarget: Math.floor(parseInt(formData.dealsTarget) / formData.teamMembers.length),
            period: formData.period,
            description: `Team target: ${formData.description}`,
            managerId: user.id,
            managerName: user.name,
            type: 'individual' as const
          }
        })

        // Create all individual targets
        await Promise.all(individualTargets.map(target => targetsService.createTarget(target)))

        toast({
          title: "Team Target Created",
          description: `Team target created for ${formData.selectedTeamName} with ${individualTargets.length} individual targets.`
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
      
      <DialogContent aria-describedby="target-dialog-description" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create Sales Target
          </DialogTitle>
          <DialogDescription id="target-dialog-description">
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
                  {teams.flatMap(team => [
                    (
                      <SelectItem key={`${team.id}-header`} value={`__header_${team.id}`} disabled>
                        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground w-full text-left">
                          {team.name} Team
                        </div>
                      </SelectItem>
                    ),
                    ...team.members.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {member.team}
                          </Badge>
                          {member.name}
                        </div>
                      </SelectItem>
                    ))
                  ])}
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
