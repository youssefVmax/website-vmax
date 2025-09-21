"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  User as UserIcon,
  DollarSign, 
  TrendingUp, 
  Phone, 
  Target,
  BarChart3,
  Filter,
  Calendar,
  Award,
  Activity
} from "lucide-react"
import { dealsService } from "@/lib/mysql-deals-service"
import { callbacksService } from "@/lib/mysql-callbacks-service"
import { userService } from "@/lib/mysql-services"
import { useMySQLSalesData } from "@/hooks/useMySQLSalesData"
import { User } from "@/lib/auth"

interface TeamLeaderDashboardProps {
  user: User
  userRole: string
}

export default function TeamLeaderDashboard({ user, userRole }: TeamLeaderDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string>("all")
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [dealsAnalytics, setDealsAnalytics] = useState<any>(null)
  const [callbacksAnalytics, setCallbacksAnalytics] = useState<any>(null)
  const [personalDealsAnalytics, setPersonalDealsAnalytics] = useState<any>(null)
  const [personalCallbacksAnalytics, setPersonalCallbacksAnalytics] = useState<any>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [activeTab, setActiveTab] = useState<"overview" | "manage">("overview")
  const [teamDeals, setTeamDeals] = useState<any[]>([])
  const [teamCallbacks, setTeamCallbacks] = useState<any[]>([])
  const [myDeals, setMyDeals] = useState<any[]>([])
  const [myCallbacks, setMyCallbacks] = useState<any[]>([])
  const [viewCallback, setViewCallback] = useState<any>(null)

  const managedTeam = user.managedTeam || user.team

  useEffect(() => {
    if (userRole === 'team-leader' && managedTeam) {
      loadTeamData()
    }
  }, [userRole, managedTeam])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      
      // Load team members
      const allUsers = await userService.getUsersByRole('salesman')
      const members = allUsers.filter(u => u.team === managedTeam)
      setTeamMembers(members)

      // Load PERSONAL analytics (team leader's own performance)
      if (user.id) {
        const personalDeals = await dealsService.getDealsByAgent(user.id)
        setMyDeals(personalDeals)
        const personalDealsData = {
          totalDeals: personalDeals.length,
          totalSales: personalDeals.reduce((sum, deal) => sum + (deal.amountPaid || 0), 0),
          averageDealSize: personalDeals.length > 0 ? personalDeals.reduce((sum, deal) => sum + (deal.amountPaid || 0), 0) / personalDeals.length : 0
        }
        setPersonalDealsAnalytics(personalDealsData)

        // Personal callbacks analytics
        const personalCallbacks = await callbacksService.getCallbacks('salesman', user.id, user.name)
        setMyCallbacks(personalCallbacks)
        const personalCallbacksData = {
          totalCallbacks: personalCallbacks.length,
          pendingCallbacks: personalCallbacks.filter(c => c.status === 'pending').length,
          completedCallbacks: personalCallbacks.filter(c => c.status === 'completed').length,
          convertedCallbacks: personalCallbacks.filter(c => c.converted_to_deal).length
        }
        setPersonalCallbacksAnalytics(personalCallbacksData)
      }

      // Load TEAM analytics
      if (managedTeam) {
        const dealsData = await dealsService.getTeamDealsAnalytics(managedTeam)
        setDealsAnalytics(dealsData)

        // Load callbacks analytics
        const callbacksData = await callbacksService.getTeamCallbackAnalytics(managedTeam)
        setCallbacksAnalytics(callbacksData)

        // Read-only tables: fetch lists
        try {
          const [listDeals, listCallbacks] = await Promise.all([
            dealsService.getDealsByTeam(managedTeam),
            callbacksService.getCallbacksByTeam(managedTeam)
          ])
          setTeamDeals(listDeals)
          setTeamCallbacks(listCallbacks)
        } catch (e) {
          console.warn('Failed to load team lists', e)
          setTeamDeals([])
          setTeamCallbacks([])
        }
      }

    } catch (error) {
      console.error('Error loading team data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredAgentData = () => {
    if (!dealsAnalytics || !callbacksAnalytics) return []
    
    const agentData = []
    const allAgents = new Set([
      ...Object.keys(dealsAnalytics.agentBreakdown),
      ...Object.keys(callbacksAnalytics.agentBreakdown)
    ])

    for (const agentName of allAgents) {
      const deals = dealsAnalytics.agentBreakdown[agentName] || { deals: 0, sales: 0, avgDeal: 0 }
      const callbacks = callbacksAnalytics.agentBreakdown[agentName] || { total: 0, pending: 0, completed: 0, converted: 0 }
      
      agentData.push({
        name: agentName,
        deals: deals.deals,
        sales: deals.sales,
        avgDeal: deals.avgDeal,
        callbacks: callbacks.total,
        pendingCallbacks: callbacks.pending,
        completedCallbacks: callbacks.completed,
        convertedCallbacks: callbacks.converted,
        conversionRate: callbacks.total > 0 ? (callbacks.converted / callbacks.total) * 100 : 0
      })
    }

    if (selectedAgent !== "all") {
      return agentData.filter(agent => agent.name === selectedAgent)
    }

    return agentData.sort((a, b) => b.sales - a.sales)
  }

  if (userRole !== 'team-leader') {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-red-600">Access Restricted</CardTitle>
          <CardDescription className="text-center">
            This dashboard is only available to team leaders.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Guardrail: managedTeam not set
  if (!managedTeam) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-amber-600">Managed Team Not Assigned</CardTitle>
          <CardDescription className="text-center">
            Your account does not have a managed team assigned. Please contact a manager to set your managed team. No data can be displayed until then.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading team dashboard...</p>
        </div>
      </div>
    )
  }

  const filteredData = getFilteredAgentData()

  // Handlers for inline edits on personal lists
  const handleUpdateDeal = async (dealId: string, updates: Partial<any>) => {
    try {
      await dealsService.updateDeal(dealId, updates)
      // refresh local list
      setMyDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...updates } : d))
    } catch (e) {
      console.error('Failed to update deal', e)
    }
  }

  const handleUpdateCallback = async (callbackId: string, updates: Partial<any>) => {
    try {
      await callbacksService.updateCallback(callbackId, updates)
      setMyCallbacks(prev => prev.map(c => c.id === callbackId ? { ...c, ...updates } : c))
    } catch (e) {
      console.error('Failed to update callback', e)
    }
  }

  const handleDeleteDeal = async (dealId: string) => {
    try {
      await dealsService.deleteDeal(dealId)
      setMyDeals(prev => prev.filter(d => d.id !== dealId))
    } catch (e) {
      console.error('Failed to delete deal', e)
    }
  }

  const handleDeleteCallback = async (callbackId: string) => {
    try {
      await callbacksService.deleteCallback(callbackId)
      setMyCallbacks(prev => prev.filter(c => c.id !== callbackId))
    } catch (e) {
      console.error('Failed to delete callback', e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Leader Dashboard</h1>
          <p className="text-muted-foreground">
            {user.name} • Managing {managedTeam} team • {teamMembers.length} members
          </p>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="manage">Deals & Callbacks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Personal Performance Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">My Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Personal Deals Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Deals</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {personalDealsAnalytics?.totalDeals || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                ${(personalDealsAnalytics?.totalSales || 0).toLocaleString()} total sales
              </p>
            </CardContent>
          </Card>

          {/* Personal Callbacks Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Callbacks</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {personalCallbacksAnalytics?.totalCallbacks || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {personalCallbacksAnalytics?.pendingCallbacks || 0} pending
              </p>
            </CardContent>
          </Card>

          {/* Personal Average Deal Size */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Avg Deal</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(personalDealsAnalytics?.averageDealSize || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Personal performance
              </p>
            </CardContent>
          </Card>
            </div>
          </div>

          {/* Team Management Section */}
          <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Team Management</h2>
        
        {/* Team Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${dealsAnalytics?.totalSales?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {dealsAnalytics?.totalDeals || 0} deals closed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Callbacks</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {callbacksAnalytics?.totalCallbacks || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {callbacksAnalytics?.pendingCallbacks || 0} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMembers.length}</div>
              <p className="text-xs text-muted-foreground">
                Active salesmen
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${dealsAnalytics?.averageDealSize?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Team average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>Individual team member metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Deals</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Avg Deal</TableHead>
                  <TableHead>Callbacks</TableHead>
                  <TableHead>Conversion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((agent) => (
                  <TableRow key={agent.name}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>{agent.deals}</TableCell>
                    <TableCell>${agent.sales.toLocaleString()}</TableCell>
                    <TableCell>${agent.avgDeal.toLocaleString()}</TableCell>
                    <TableCell>{agent.callbacks}</TableCell>
                    <TableCell>
                      <Badge variant={agent.conversionRate > 50 ? "default" : "secondary"}>
                        {agent.conversionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
          </div>

          {/* Read-only Team Lists: Deals and Callbacks side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Deals (Read-only)</CardTitle>
            <CardDescription>Showing recent deals for {managedTeam}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Closer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamDeals.slice(0, 20).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.customer_name}</TableCell>
                    <TableCell>{d.sales_agent}</TableCell>
                    <TableCell>{d.closing_agent}</TableCell>
                    <TableCell>{d.signup_date}</TableCell>
                    <TableCell className="text-right">${Number(d.amount_paid || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {teamDeals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No deals found for this team.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Callbacks (Read-only)</CardTitle>
            <CardDescription>Showing recent callbacks for {managedTeam}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamCallbacks.slice(0, 20).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.customer_name}</TableCell>
                    <TableCell>{c.sales_agent}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'completed' ? 'default' : c.status === 'pending' ? 'secondary' : 'outline'}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleString()}</TableCell>
                    <TableCell>{c.phone_number}</TableCell>
                  </TableRow>
                ))}
                {teamCallbacks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No callbacks found for this team.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          {/* Team lists (read-only) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Deals</CardTitle>
                <CardDescription>All recent deals for {managedTeam}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Closer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamDeals.slice(0, 50).map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.customer_name}</TableCell>
                        <TableCell>{d.sales_agent}</TableCell>
                        <TableCell>{d.closing_agent}</TableCell>
                        <TableCell>{d.signup_date}</TableCell>
                        <TableCell className="text-right">${Number(d.amount_paid || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {teamDeals.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">No team deals.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Callbacks</CardTitle>
                <CardDescription>All recent callbacks for {managedTeam}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamCallbacks.slice(0, 50).map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.customer_name}</TableCell>
                        <TableCell>{c.sales_agent}</TableCell>
                        <TableCell><Badge variant={c.status === 'completed' ? 'default' : c.status === 'pending' ? 'secondary' : 'outline'}>{c.status}</Badge></TableCell>
                        <TableCell>{new Date(c.created_at).toLocaleString()}</TableCell>
                        <TableCell>{c.phone_number}</TableCell>
                      </TableRow>
                    ))}
                    {teamCallbacks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">No team callbacks.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Personal lists (editable) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>My Deals (Editable)</CardTitle>
                <CardDescription>Edit status/stage of your deals</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myDeals.slice(0, 50).map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.customer_name}</TableCell>
                        <TableCell>
                          <Select value={d.status} onValueChange={(val) => handleUpdateDeal(d.id, { status: val as any })}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">active</SelectItem>
                              <SelectItem value="completed">completed</SelectItem>
                              <SelectItem value="cancelled">cancelled</SelectItem>
                              <SelectItem value="inactive">inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={d.stage} onValueChange={(val) => handleUpdateDeal(d.id, { stage: val as any })}>
                            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="closed-won">closed-won</SelectItem>
                              <SelectItem value="lead">lead</SelectItem>
                              <SelectItem value="qualified">qualified</SelectItem>
                              <SelectItem value="proposal">proposal</SelectItem>
                              <SelectItem value="negotiation">negotiation</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">${Number(d.amount_paid || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {myDeals.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">No personal deals found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
      <CardHeader>
        <CardTitle>My Callbacks (Editable)</CardTitle>
        <CardDescription>Update your callback statuses</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myCallbacks.slice(0, 50).map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.customer_name}</TableCell>
                <TableCell>
                  <Select value={c.status} onValueChange={(val) => handleUpdateCallback(c.id, { status: val as any })}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">pending</SelectItem>
                      <SelectItem value="completed">completed</SelectItem>
                      <SelectItem value="cancelled">cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{new Date(c.created_at).toLocaleString()}</TableCell>
                <TableCell>{c.phone_number}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setViewCallback(c)}>View</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteCallback(c.id)}>Delete</Button>
                    <Button variant="ghost" size="sm" onClick={() => setViewCallback(c)}>History</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {myCallbacks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No personal callbacks found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
