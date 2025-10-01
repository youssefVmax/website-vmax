"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
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
  Activity,
  ChevronLeft,
  ChevronRight,
  Search
} from "lucide-react"
import { ManagerApiService } from "@/lib/api-service"
import { mysqlAnalyticsService } from "@/lib/mysql-analytics-service"
import { User } from '@/types/user'

interface TeamLeaderDashboardProps {
  user: User
  userRole: string
}

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function TeamLeaderPaginatedDashboard({ user, userRole }: TeamLeaderDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string>("all")
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [personalDealsAnalytics, setPersonalDealsAnalytics] = useState<any>(null)
  const [personalCallbacksAnalytics, setPersonalCallbacksAnalytics] = useState<any>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [activeTab, setActiveTab] = useState<"overview" | "team-deals" | "team-callbacks" | "my-deals" | "my-callbacks">("overview")
  
  // Pagination states
  const [teamDeals, setTeamDeals] = useState<any[]>([])
  const [teamCallbacks, setTeamCallbacks] = useState<any[]>([])
  const [myDeals, setMyDeals] = useState<any[]>([])
  const [myCallbacks, setMyCallbacks] = useState<any[]>([])
  
  const [teamDealsPagination, setTeamDealsPagination] = useState<PaginationState>({
    page: 1, limit: 25, total: 0, totalPages: 0
  })
  const [teamCallbacksPagination, setTeamCallbacksPagination] = useState<PaginationState>({
    page: 1, limit: 25, total: 0, totalPages: 0
  })
  const [myDealsPagination, setMyDealsPagination] = useState<PaginationState>({
    page: 1, limit: 25, total: 0, totalPages: 0
  })
  const [myCallbacksPagination, setMyCallbacksPagination] = useState<PaginationState>({
    page: 1, limit: 25, total: 0, totalPages: 0
  })

  // Search and filter states
  const [teamDealsSearch, setTeamDealsSearch] = useState("")
  const [teamCallbacksSearch, setTeamCallbacksSearch] = useState("")
  const [myDealsSearch, setMyDealsSearch] = useState("")
  const [myCallbacksSearch, setMyCallbacksSearch] = useState("")

  const [teamDealsStatus, setTeamDealsStatus] = useState("")
  const [teamCallbacksStatus, setTeamCallbacksStatus] = useState("")
  const [myDealsStatus, setMyDealsStatus] = useState("")
  const [myCallbacksStatus, setMyCallbacksStatus] = useState("")

  const managedTeam = user.managedTeam || user.team
  const apiService = new ManagerApiService()

  useEffect(() => {
    if (userRole === 'team_leader' && managedTeam) {
      loadInitialData()
    }
  }, [userRole, managedTeam])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Load analytics data
      await Promise.all([
        loadPersonalAnalytics(),
        loadTeamDeals(1),
        loadTeamCallbacks(1),
        loadMyDeals(1),
        loadMyCallbacks(1)
      ])

    } catch (error) {
      console.error('Error loading team leader data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPersonalAnalytics = async () => {
    try {
      const [salesKPIs, callbackKPIs] = await Promise.all([
        mysqlAnalyticsService.getSalesKPIs({ 
          userRole: 'salesman', 
          userId: user.id, 
          dateRange: selectedPeriod as any 
        }),
        mysqlAnalyticsService.getCallbackKPIs({ 
          userRole: 'salesman', 
          userId: user.id, 
          dateRange: selectedPeriod as any 
        })
      ])

      setPersonalDealsAnalytics({
        totalDeals: salesKPIs.totalDeals,
        totalSales: salesKPIs.totalRevenue,
        averageDealSize: salesKPIs.averageDealSize
      })

      setPersonalCallbacksAnalytics({
        totalCallbacks: callbackKPIs.totalCallbacks,
        pendingCallbacks: callbackKPIs.pendingCallbacks,
        completedCallbacks: callbackKPIs.completedCallbacks,
        convertedCallbacks: callbackKPIs.completedCallbacks
      })
    } catch (error) {
      console.error('Error loading personal analytics:', error)
    }
  }

  const loadTeamDeals = async (page: number) => {
    try {
      const response = await apiService.getDealsWithPagination({
        page,
        limit: teamDealsPagination.limit,
        search: teamDealsSearch,
        status: teamDealsStatus,
        team: managedTeam
      })

      setTeamDeals(response.deals)
      setTeamDealsPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      })
    } catch (error) {
      console.error('Error loading team deals:', error)
      setTeamDeals([])
    }
  }

  const loadTeamCallbacks = async (page: number) => {
    try {
      const response = await apiService.getCallbacksWithPagination({
        page,
        limit: teamCallbacksPagination.limit,
        search: teamCallbacksSearch,
        status: teamCallbacksStatus,
        team: managedTeam
      })

      setTeamCallbacks(response.callbacks)
      setTeamCallbacksPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      })
    } catch (error) {
      console.error('Error loading team callbacks:', error)
      setTeamCallbacks([])
    }
  }

  const loadMyDeals = async (page: number) => {
    try {
      const response = await apiService.getDealsWithPagination({
        page,
        limit: myDealsPagination.limit,
        search: myDealsSearch,
        status: myDealsStatus,
        agent: user.name
      })

      setMyDeals(response.deals)
      setMyDealsPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      })
    } catch (error) {
      console.error('Error loading my deals:', error)
      setMyDeals([])
    }
  }

  const loadMyCallbacks = async (page: number) => {
    try {
      const response = await apiService.getCallbacksWithPagination({
        page,
        limit: myCallbacksPagination.limit,
        search: myCallbacksSearch,
        status: myCallbacksStatus,
        agent: user.name
      })

      setMyCallbacks(response.callbacks)
      setMyCallbacksPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      })
    } catch (error) {
      console.error('Error loading my callbacks:', error)
      setMyCallbacks([])
    }
  }

  const handleUpdateDeal = async (dealId: string, updates: Partial<any>) => {
    try {
      // Use the regular API service for updates since ManagerApiService doesn't have updateDeal
      const { apiService: regularApiService } = await import('@/lib/api-service')
      await regularApiService.updateDeal(dealId, updates)
      // Refresh current page
      if (activeTab === 'my-deals') {
        await loadMyDeals(myDealsPagination.page)
      } else if (activeTab === 'team-deals') {
        await loadTeamDeals(teamDealsPagination.page)
      }
    } catch (error) {
      console.error('Failed to update deal:', error)
    }
  }

  const handleUpdateCallback = async (callbackId: string, updates: Partial<any>) => {
    try {
      await apiService.updateCallbackStatus(callbackId, updates.status)
      // Refresh current page
      if (activeTab === 'my-callbacks') {
        await loadMyCallbacks(myCallbacksPagination.page)
      } else if (activeTab === 'team-callbacks') {
        await loadTeamCallbacks(teamCallbacksPagination.page)
      }
    } catch (error) {
      console.error('Failed to update callback:', error)
    }
  }

  const PaginationControls = ({ pagination, onPageChange }: { 
    pagination: PaginationState, 
    onPageChange: (page: number) => void 
  }) => (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-muted-foreground">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-sm">
          Page {pagination.page} of {pagination.totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const SearchAndFilters = ({ 
    search, 
    onSearchChange, 
    status, 
    onStatusChange, 
    onApplyFilters 
  }: {
    search: string
    onSearchChange: (value: string) => void
    status: string
    onStatusChange: (value: string) => void
    onApplyFilters: () => void
  }) => (
    <div className="flex items-center space-x-4 mb-4">
      <div className="flex-1">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={onApplyFilters}>
        <Search className="h-4 w-4 mr-2" />
        Apply
      </Button>
    </div>
  )

  if (userRole !== 'team_leader') {
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

  if (!managedTeam) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-amber-600">Managed Team Not Assigned</CardTitle>
          <CardDescription className="text-center">
            Your account does not have a managed team assigned. Please contact a manager.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Leader Dashboard</h1>
          <p className="text-muted-foreground">
            {user.name} • Managing {managedTeam} team
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team-deals">Team Deals</TabsTrigger>
          <TabsTrigger value="team-callbacks">Team Callbacks</TabsTrigger>
          <TabsTrigger value="my-deals">My Deals</TabsTrigger>
          <TabsTrigger value="my-callbacks">My Callbacks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Personal Performance Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">My Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </TabsContent>

        <TabsContent value="team-deals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Deals</CardTitle>
              <CardDescription>All deals for {managedTeam} team</CardDescription>
            </CardHeader>
            <CardContent>
              <SearchAndFilters
                search={teamDealsSearch}
                onSearchChange={setTeamDealsSearch}
                status={teamDealsStatus}
                onStatusChange={setTeamDealsStatus}
                onApplyFilters={() => loadTeamDeals(1)}
              />
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamDeals.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.customer_name}</TableCell>
                      <TableCell>{deal.sales_agent}</TableCell>
                      <TableCell>
                        <Badge variant={deal.status === 'completed' ? 'default' : 'secondary'}>
                          {deal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(deal.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">${Number(deal.amount || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {teamDeals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No team deals found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              <div className="mt-4">
                <PaginationControls
                  pagination={teamDealsPagination}
                  onPageChange={loadTeamDeals}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-callbacks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Callbacks</CardTitle>
              <CardDescription>All callbacks for {managedTeam} team</CardDescription>
            </CardHeader>
            <CardContent>
              <SearchAndFilters
                search={teamCallbacksSearch}
                onSearchChange={setTeamCallbacksSearch}
                status={teamCallbacksStatus}
                onStatusChange={setTeamCallbacksStatus}
                onApplyFilters={() => loadTeamCallbacks(1)}
              />
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamCallbacks.map((callback) => (
                    <TableRow key={callback.id}>
                      <TableCell className="font-medium">{callback.customer_name}</TableCell>
                      <TableCell>{callback.created_by}</TableCell>
                      <TableCell>
                        <Badge variant={callback.status === 'completed' ? 'default' : callback.status === 'pending' ? 'secondary' : 'outline'}>
                          {callback.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={callback.priority === 'high' ? 'destructive' : callback.priority === 'medium' ? 'default' : 'secondary'}>
                          {callback.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(callback.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{callback.phone}</TableCell>
                    </TableRow>
                  ))}
                  {teamCallbacks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No team callbacks found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              <div className="mt-4">
                <PaginationControls
                  pagination={teamCallbacksPagination}
                  onPageChange={loadTeamCallbacks}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-deals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Deals (Editable)</CardTitle>
              <CardDescription>Edit status of your personal deals</CardDescription>
            </CardHeader>
            <CardContent>
              <SearchAndFilters
                search={myDealsSearch}
                onSearchChange={setMyDealsSearch}
                status={myDealsStatus}
                onStatusChange={setMyDealsStatus}
                onApplyFilters={() => loadMyDeals(1)}
              />
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myDeals.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.customer_name}</TableCell>
                      <TableCell>
                        <Select value={deal.status} onValueChange={(val) => handleUpdateDeal(deal.id, { status: val })}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={deal.stage} onValueChange={(val) => handleUpdateDeal(deal.id, { stage: val })}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="closed-won">Closed Won</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="proposal">Proposal</SelectItem>
                            <SelectItem value="negotiation">Negotiation</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{new Date(deal.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">${Number(deal.amount || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {myDeals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No personal deals found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              <div className="mt-4">
                <PaginationControls
                  pagination={myDealsPagination}
                  onPageChange={loadMyDeals}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-callbacks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Callbacks (Editable)</CardTitle>
              <CardDescription>Update your callback statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <SearchAndFilters
                search={myCallbacksSearch}
                onSearchChange={setMyCallbacksSearch}
                status={myCallbacksStatus}
                onStatusChange={setMyCallbacksStatus}
                onApplyFilters={() => loadMyCallbacks(1)}
              />
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myCallbacks.map((callback) => (
                    <TableRow key={callback.id}>
                      <TableCell className="font-medium">{callback.customer_name}</TableCell>
                      <TableCell>
                        <Select value={callback.status} onValueChange={(val) => handleUpdateCallback(callback.id, { status: val })}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={callback.priority === 'high' ? 'destructive' : callback.priority === 'medium' ? 'default' : 'secondary'}>
                          {callback.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(callback.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{callback.phone}</TableCell>
                    </TableRow>
                  ))}
                  {myCallbacks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No personal callbacks found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              <div className="mt-4">
                <PaginationControls
                  pagination={myCallbacksPagination}
                  onPageChange={loadMyCallbacks}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
