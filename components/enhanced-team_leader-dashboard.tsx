"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DateFilter } from "@/components/ui/date-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
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
  Edit,
  Save,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Search
} from "lucide-react"
import { useUnifiedData } from "@/hooks/useUnifiedData"
import { apiService } from "@/lib/api-service"
import { teamLeaderApiService, TeamLeaderAnalytics } from "@/lib/team_leader-api-service"
import { ManagerApiService } from "@/lib/api-service"

interface TeamLeaderDashboardProps {
  user: any
  userRole: string
}

export default function EnhancedTeamLeaderDashboard({ user, userRole }: TeamLeaderDashboardProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  // Control inner tab within Team Data section (deals | callbacks)
  const [teamDataTab, setTeamDataTab] = useState<'deals'|'callbacks'>('deals')
  const [editingDeal, setEditingDeal] = useState<any>(null)
  const [editingCallback, setEditingCallback] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Date filter state (default to Sep 2025)
  const [selectedMonth, setSelectedMonth] = useState('09')
  const [selectedYear, setSelectedYear] = useState('2025')
  const [dateFilterKey, setDateFilterKey] = useState(0)
  
  // API-based state management
  const [analytics, setAnalytics] = useState<TeamLeaderAnalytics | null>(null)
  const [teamDeals, setTeamDeals] = useState<any[]>([])
  const [teamDealsPagination, setTeamDealsPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 })
  const [teamDealsSort, setTeamDealsSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'created_at', order: 'desc' })
  // Map of userId -> userName for resolving unknown agent names
  const [usersMap, setUsersMap] = useState<Record<string, string>>({})
  const [teamCallbacks, setTeamCallbacks] = useState<any[]>([])
  const [personalDeals, setPersonalDeals] = useState<any[]>([])
  const [personalCallbacks, setPersonalCallbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination states for callbacks
  const [teamCallbacksPagination, setTeamCallbacksPagination] = useState({
    page: 1, 
    limit: 25, 
    total: 0, 
    totalPages: 0
  })
  const [personalCallbacksPagination, setPersonalCallbacksPagination] = useState({
    page: 1, 
    limit: 25, 
    total: 0, 
    totalPages: 0
  })

  // Load data using team leader API service
  useEffect(() => {
    loadAllData()
  }, [user.id, user.managedTeam])

  const managerApiService = new ManagerApiService()

  // Load Team Deals (server-side pagination with month/year filters)
  const loadTeamDeals = async (page: number) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(teamDealsPagination.limit),
        userRole: 'team_leader',
        userId: String(user.id),
        month: String(parseInt(selectedMonth, 10)),
        year: String(parseInt(selectedYear, 10)),
      })
      if (searchTerm.trim()) params.append('search', searchTerm.trim())
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)

      const res = await fetch(`/api/deals?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } })
      const json = await res.json()
      const list = Array.isArray(json.deals) ? json.deals : []
      setTeamDeals(list)
      const total = Number(json.total || 0)
      const limit = Number(json.limit || teamDealsPagination.limit)
      setTeamDealsPagination({
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit)))
      })

      // Resolve any missing agent names by fetching user profiles for IDs not in usersMap
      const idsToResolve = new Set<string>()
      for (const d of list) {
        const id = d?.salesAgentId || d?.SalesAgentID || d?.createdById || d?.created_by_id
        if (id && !usersMap[String(id)]) idsToResolve.add(String(id))
      }
      if (idsToResolve.size > 0) {
        const entries = await Promise.all(
          Array.from(idsToResolve).map(async (uid) => {
            try {
              const u = await apiService.getUserById(uid)
              return [uid, (u?.name || u?.username || uid) as string] as const
            } catch {
              return [uid, uid] as const
            }
          })
        )
        const nextMap = { ...usersMap }
        for (const [uid, name] of entries) nextMap[uid] = name
        setUsersMap(nextMap)
      }
    } catch (e) {
      console.error('Error loading team deals:', e)
      setTeamDeals([])
      setTeamDealsPagination((p) => ({ ...p, total: 0, totalPages: 1 }))
    }
  }

  const loadAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const managedTeam = user.managedTeam || user.team
      if (!managedTeam) {
        throw new Error('No managed team found for user')
      }

      // Load analytics and data in parallel
      const [analyticsData, teamDealsData, personalDealsData, teamUsers] = await Promise.all([
        teamLeaderApiService.getAnalytics(user.id, managedTeam),
        teamLeaderApiService.getTeamDeals(user.id, managedTeam, { limit: 5 }),
        teamLeaderApiService.getPersonalDeals(user.id, managedTeam, { limit: 50 }),
        apiService.getUsers({ team: managedTeam })
      ])

      setAnalytics(analyticsData)
      setTeamDeals(teamDealsData.data)
      setPersonalDeals(personalDealsData.data)
      // Build users map for fast lookups
      const map: Record<string, string> = {}
      ;(teamUsers || []).forEach((u: any) => {
        if (u?.id) map[String(u.id)] = u.name || u.username || String(u.id)
      })
      setUsersMap(map)

      // Load paginated sections
      await loadTeamDeals(1)
      await loadTeamCallbacks(1)
      await loadPersonalCallbacks(1)

    } catch (err) {
      console.error('Error loading team leader data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadTeamCallbacks = async (page: number) => {
    try {
      const managedTeam = user.managedTeam || user.team
      const response = await managerApiService.getCallbacksWithPagination({
        page,
        limit: teamCallbacksPagination.limit,
        search: searchTerm,
        status: statusFilter,
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

  const loadPersonalCallbacks = async (page: number) => {
    try {
      const response = await managerApiService.getCallbacksWithPagination({
        page,
        limit: personalCallbacksPagination.limit,
        search: searchTerm,
        status: statusFilter,
        agent: user.name
      })

      setPersonalCallbacks(response.callbacks)
      setPersonalCallbacksPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      })
    } catch (error) {
      console.error('Error loading personal callbacks:', error)
      setPersonalCallbacks([])
    }
  }

  const refresh = () => {
    loadAllData()
  }

  // Pagination Controls Component
  const PaginationControls = ({ 
    pagination, 
    onPageChange 
  }: { 
    pagination: any, 
    onPageChange: (page: number) => void 
  }) => (
    <div className="flex items-center justify-between px-2 py-4">
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

  // Resolve the display name for the sales agent of a deal
  const getAgentName = (deal: any): string => {
    const explicit = deal.sales_agent_name || deal.sales_agent || deal.salesAgentName
    if (explicit) return String(explicit)
    const byCreator = deal.created_by || deal.createdByName
    if (byCreator) return String(byCreator)
    const id = deal.salesAgentId || deal.SalesAgentID || deal.createdById || deal.created_by_id
    if (id && usersMap[String(id)]) return usersMap[String(id)]
    return 'Unknown'
  }

  // Filter functions
  const filterData = (items: any[], searchTerm: string, statusFilter: string) => {
    return items.filter(item => {
      const matchesSearch = !searchTerm || 
        (item.customerName || item.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.salesAgentName || item.sales_agent || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }

  // Update deal function
  const updateDeal = async (dealId: string, updates: any) => {
    try {
      await apiService.updateDeal(dealId, updates)
      toast({ title: "Success", description: "Deal updated successfully" })
      refresh()
      setEditingDeal(null)
    } catch (error) {
      toast({ title: "Error", description: "Failed to update deal", variant: "destructive" })
    }
  }

  // Update callback function
  const updateCallback = async (callbackId: string, updates: any) => {
    try {
      await apiService.updateCallback(callbackId, updates)
      toast({ title: "Success", description: "Callback updated successfully" })
      refresh()
      setEditingCallback(null)
    } catch (error) {
      toast({ title: "Error", description: "Failed to update callback", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Loading team leader dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">Error loading dashboard: {error}</p>
          <Button onClick={refresh}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Leader Dashboard</h1>
          <p className="text-muted-foreground">
            Managing team: {user.managedTeam || user.team}
          </p>
        </div>
        <Button onClick={refresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => { setActiveTab('team-data'); setTeamDataTab('deals') }}
              className="gap-2"
            >
              <Eye className="h-4 w-4" /> View All Deals
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setActiveTab('team-data'); setTeamDataTab('callbacks') }}
              className="gap-2"
            >
              <Phone className="h-4 w-4" /> Manage Callbacks
            </Button>
            <Button
              variant="default"
              onClick={() => {
                // Navigate to global Data Center tab
                try { window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'datacenter' })) } catch {}
              }}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" /> Data Center
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Callback KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Team Callbacks</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {teamCallbacksPagination.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              All team callbacks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Callbacks</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {personalCallbacksPagination.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Personal callbacks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Callbacks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {teamCallbacks.filter(cb => cb.status === 'pending').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {teamCallbacks.filter(cb => 
                cb.status === 'completed' && 
                new Date(cb.created_at).toDateString() === new Date().toDateString()
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Today's completions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics?.team?.analytics?.totalDeals || 0}
                </div>
                <div className="text-sm text-muted-foreground">Team Deals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${(analytics?.team?.analytics?.totalRevenue || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Team Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics?.team?.analytics?.totalCallbacks || 0}
                </div>
                <div className="text-sm text-muted-foreground">Team Callbacks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(analytics?.team?.analytics?.conversionRate || 0).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Conversion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              My Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics?.personal?.analytics?.totalDeals || 0}
                </div>
                <div className="text-sm text-muted-foreground">My Deals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${(analytics?.personal?.analytics?.totalRevenue || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">My Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics?.personal?.analytics?.totalCallbacks || 0}
                </div>
                <div className="text-sm text-muted-foreground">My Callbacks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(analytics?.personal?.analytics?.conversionRate || 0).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">My Conversion</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team-data">Team Data (View Only)</TabsTrigger>
          <TabsTrigger value="my-data">My Data (Editable)</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Team Deals */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Team Deals</CardTitle>
                <CardDescription>Latest deals from your team (read-only)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teamDeals.slice(0, 5).map((deal: any, index: number) => (
                    <div key={deal.id || index} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <div className="font-medium">{deal.customerName || deal.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{deal.salesAgentName || deal.sales_agent}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          ${(deal.amountPaid || 0).toLocaleString()}
                        </div>
                        <Badge variant="outline">{deal.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {teamDeals.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No team deals found</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Personal Deals */}
            <Card>
              <CardHeader>
                <CardTitle>My Recent Deals</CardTitle>
                <CardDescription>Your latest deals (editable)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {personalDeals.slice(0, 5).map((deal: any, index: number) => (
                    <div key={deal.id || index} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <div className="font-medium">{deal.customerName || deal.customer_name}</div>
                        <div className="text-sm text-muted-foreground">Your deal</div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div className="font-medium text-green-600">
                            ${(deal.amountPaid || 0).toLocaleString()}
                          </div>
                          <Badge variant="outline">{deal.status}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingDeal(deal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {personalDeals.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No personal deals found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Data Tab (Read-only) */}
        <TabsContent value="team-data" className="space-y-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search team data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {/* Sort */}
            <Select value={`${teamDealsSort.field}-${teamDealsSort.order}`} onValueChange={(value) => {
              const [field, order] = value.split('-')
              setTeamDealsSort({ field, order: (order as 'asc' | 'desc') })
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="amount_paid-desc">Highest Amount</SelectItem>
                <SelectItem value="amount_paid-asc">Lowest Amount</SelectItem>
                <SelectItem value="customer_name-asc">Customer A-Z</SelectItem>
                <SelectItem value="customer_name-desc">Customer Z-A</SelectItem>
                <SelectItem value="sales_agent-asc">Agent A-Z</SelectItem>
                <SelectItem value="sales_agent-desc">Agent Z-A</SelectItem>
              </SelectContent>
            </Select>
            {/* Month */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Year */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {['2024','2025','2026'].map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => loadTeamDeals(1)} className="gap-2">
              <Search className="h-4 w-4" /> Apply
            </Button>
            {/* Rows per page */}
            <Select
              value={String(teamDealsPagination.limit)}
              onValueChange={(v) => {
                const newLimit = Number(v) || 25
                setTeamDealsPagination((p) => ({ ...p, limit: newLimit }))
                loadTeamDeals(1)
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {[10,25,50,100].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={teamDataTab} onValueChange={(v)=> setTeamDataTab(v as 'deals'|'callbacks')}>
            <TabsList>
              <TabsTrigger value="deals">Team Deals ({teamDealsPagination.total})</TabsTrigger>
              <TabsTrigger value="callbacks">Team Callbacks ({teamCallbacks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="deals">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" /> Team Deals (Read-Only)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {([...teamDeals].sort((a: any, b: any) => {
                        const field = teamDealsSort.field
                        const order = teamDealsSort.order === 'asc' ? 1 : -1
                        const getVal = (d: any) => {
                          switch (field) {
                            case 'amount_paid': return Number(d.amount_paid ?? d.amountPaid ?? 0)
                            case 'customer_name': return String(d.customer_name ?? d.customerName ?? '').toLowerCase()
                            case 'sales_agent': return String(getAgentName(d)).toLowerCase()
                            case 'created_at': default: {
                              const raw = d.created_at ?? d.signup_date ?? d.signupDate
                              return raw ? new Date(raw).getTime() : 0
                            }
                          }
                        }
                        const av = getVal(a)
                        const bv = getVal(b)
                        if (av < bv) return -1 * order
                        if (av > bv) return 1 * order
                        return 0
                      })).map((deal: any, index: number) => (
                        <TableRow key={deal.id || index}>
                          <TableCell>{deal.customer_name || deal.customerName}</TableCell>
                          <TableCell>{getAgentName(deal)}</TableCell>
                          <TableCell><Badge variant="outline">{deal.sales_team || deal.salesTeam}</Badge></TableCell>
                          <TableCell>${Number(deal.amount_paid ?? deal.amountPaid ?? 0).toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline">{deal.status || 'active'}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{deal.stage || 'prospect'}</Badge></TableCell>
                          <TableCell>{new Date(deal.signup_date ?? deal.signupDate ?? deal.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                      {teamDeals.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No team deals found for the selected month/year
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  <PaginationControls
                    pagination={teamDealsPagination}
                    onPageChange={loadTeamDeals}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="callbacks">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Team Callbacks (Read-Only) - {teamCallbacksPagination.total} Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Controls */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search callbacks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => loadTeamCallbacks(1)}>
                      <Search className="h-4 w-4 mr-2" />
                      Apply
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamCallbacks.map((callback, index) => (
                        <TableRow key={callback.id || index}>
                          <TableCell className="font-medium">
                            {callback.customerName || callback.customer_name}
                          </TableCell>
                          <TableCell>{callback.salesAgentName || callback.sales_agent || callback.created_by}</TableCell>
                          <TableCell>{callback.phoneNumber || callback.phone_number || callback.phone}</TableCell>
                          <TableCell>
                            <Badge variant={
                              callback.status === 'completed' ? 'default' : 
                              callback.status === 'pending' ? 'secondary' : 'outline'
                            }>
                              {callback.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              callback.priority === 'high' ? 'destructive' : 
                              callback.priority === 'medium' ? 'default' : 'secondary'
                            }>
                              {callback.priority || 'normal'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(callback.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                      {teamCallbacks.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No team callbacks found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  <PaginationControls
                    pagination={teamCallbacksPagination}
                    onPageChange={loadTeamCallbacks}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* My Data Tab (Editable) */}
        <TabsContent value="my-data" className="space-y-6">
          <Tabs defaultValue="deals">
            <TabsList>
              <TabsTrigger value="deals">My Deals ({personalDeals.length})</TabsTrigger>
              <TabsTrigger value="callbacks">My Callbacks ({personalCallbacks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="deals">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit className="h-5 w-5 mr-2" />
                    My Deals (Editable)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personalDeals.map((deal: any, index: number) => (
                        <TableRow key={deal.id || index}>
                          <TableCell>{deal.customerName || deal.customer_name}</TableCell>
                          <TableCell>${(deal.amountPaid || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{deal.status}</Badge>
                          </TableCell>
                          <TableCell>{new Date(deal.signupDate || deal.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingDeal(deal)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="callbacks">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit className="h-5 w-5 mr-2" />
                    My Callbacks (Editable) - {personalCallbacksPagination.total} Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Controls */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search my callbacks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => loadPersonalCallbacks(1)}>
                      <Search className="h-4 w-4 mr-2" />
                      Apply
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personalCallbacks.map((callback: any, index: number) => (
                        <TableRow key={callback.id || index}>
                          <TableCell className="font-medium">
                            {callback.customerName || callback.customer_name}
                          </TableCell>
                          <TableCell>{callback.phoneNumber || callback.phone_number || callback.phone}</TableCell>
                          <TableCell>
                            <Badge variant={
                              callback.status === 'completed' ? 'default' : 
                              callback.status === 'pending' ? 'secondary' : 'outline'
                            }>
                              {callback.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              callback.priority === 'high' ? 'destructive' : 
                              callback.priority === 'medium' ? 'default' : 'secondary'
                            }>
                              {callback.priority || 'normal'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(callback.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingCallback(callback)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {personalCallbacks.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No personal callbacks found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  <PaginationControls
                    pagination={personalCallbacksPagination}
                    onPageChange={loadPersonalCallbacks}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team vs Personal Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Deals</span>
                    <div className="flex gap-4">
                      <span className="text-blue-600">Team: {analytics?.team?.analytics?.totalDeals || 0}</span>
                      <span className="text-green-600">Personal: {analytics?.personal?.analytics?.totalDeals || 0}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Revenue</span>
                    <div className="flex gap-4">
                      <span className="text-blue-600">Team: ${(analytics?.team?.analytics?.totalRevenue || 0).toLocaleString()}</span>
                      <span className="text-green-600">Personal: ${(analytics?.personal?.analytics?.totalRevenue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Avg Deal Size</span>
                    <div className="flex gap-4">
                      <span className="text-blue-600">Team: ${(analytics?.team?.analytics?.avgDealSize || 0).toLocaleString()}</span>
                      <span className="text-green-600">Personal: ${(analytics?.personal?.analytics?.avgDealSize || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Conversion Rate</span>
                    <div className="flex gap-4">
                      <span className="text-blue-600">Team: {(analytics?.team?.analytics?.conversionRate || 0).toFixed(1)}%</span>
                      <span className="text-green-600">Personal: {(analytics?.personal?.analytics?.conversionRate || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {analytics && analytics.personal?.analytics && analytics.team?.analytics ? 
                        (((analytics.personal.analytics.totalRevenue || 0) / ((analytics.team.analytics.totalRevenue || 0) + (analytics.personal.analytics.totalRevenue || 0))) * 100).toFixed(1) 
                        : '0'}%
                    </div>
                    <div className="text-sm text-muted-foreground">Your contribution to team revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-secondary">
                      {analytics && analytics.personal?.analytics && analytics.team?.analytics ? 
                        (((analytics.personal.analytics.totalDeals || 0) / ((analytics.team.analytics.totalDeals || 0) + (analytics.personal.analytics.totalDeals || 0))) * 100).toFixed(1) 
                        : '0'}%
                    </div>
                    <div className="text-sm text-muted-foreground">Your contribution to team deals</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Deal Dialog */}
      {editingDeal && (
        <Dialog open={!!editingDeal} onOpenChange={() => setEditingDeal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Deal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={editingDeal.status}
                  onValueChange={(value) => setEditingDeal({...editingDeal, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={editingDeal.amountPaid || editingDeal.amount_paid || 0}
                  onChange={(e) => setEditingDeal({...editingDeal, amountPaid: parseFloat(e.target.value)})}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingDeal(null)}>
                  Cancel
                </Button>
                <Button onClick={() => updateDeal(editingDeal.id, editingDeal)}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Callback Dialog */}
      {editingCallback && (
        <Dialog open={!!editingCallback} onOpenChange={() => setEditingCallback(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Callback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={editingCallback.status}
                  onValueChange={(value) => setEditingCallback({...editingCallback, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editingCallback.callback_notes || ''}
                  onChange={(e) => setEditingCallback({...editingCallback, callback_notes: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingCallback(null)}>
                  Cancel
                </Button>
                <Button onClick={() => updateCallback(editingCallback.id, editingCallback)}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
