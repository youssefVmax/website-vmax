"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  EyeOff
} from "lucide-react"
import { useUnifiedData } from "@/hooks/useUnifiedData"
import { apiService } from "@/lib/api-service"
import { teamLeaderApiService, TeamLeaderAnalytics } from "@/lib/team-leader-api-service"

interface TeamLeaderDashboardProps {
  user: any
  userRole: string
}

export default function EnhancedTeamLeaderDashboard({ user, userRole }: TeamLeaderDashboardProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [editingDeal, setEditingDeal] = useState<any>(null)
  const [editingCallback, setEditingCallback] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // API-based state management
  const [analytics, setAnalytics] = useState<TeamLeaderAnalytics | null>(null)
  const [teamDeals, setTeamDeals] = useState<any[]>([])
  const [teamCallbacks, setTeamCallbacks] = useState<any[]>([])
  const [personalDeals, setPersonalDeals] = useState<any[]>([])
  const [personalCallbacks, setPersonalCallbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data using team leader API service
  useEffect(() => {
    loadAllData()
  }, [user.id, user.managedTeam])

  const loadAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const managedTeam = user.managedTeam || user.team
      if (!managedTeam) {
        throw new Error('No managed team found for user')
      }

      // Load analytics and data in parallel
      const [analyticsData, teamDealsData, teamCallbacksData, personalDealsData, personalCallbacksData] = await Promise.all([
        teamLeaderApiService.getAnalytics(user.id, managedTeam),
        teamLeaderApiService.getTeamDeals(user.id, managedTeam, { limit: 50 }),
        teamLeaderApiService.getTeamCallbacks(user.id, managedTeam, { limit: 50 }),
        teamLeaderApiService.getPersonalDeals(user.id, managedTeam, { limit: 50 }),
        teamLeaderApiService.getPersonalCallbacks(user.id, managedTeam, { limit: 50 })
      ])

      setAnalytics(analyticsData)
      setTeamDeals(teamDealsData.data)
      setTeamCallbacks(teamCallbacksData.data)
      setPersonalDeals(personalDealsData.data)
      setPersonalCallbacks(personalCallbacksData.data)

    } catch (err) {
      console.error('Error loading team leader data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    loadAllData()
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="deals">
            <TabsList>
              <TabsTrigger value="deals">Team Deals ({teamDeals.length})</TabsTrigger>
              <TabsTrigger value="callbacks">Team Callbacks ({teamCallbacks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="deals">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Team Deals (Read-Only)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterData(teamData.deals, searchTerm, statusFilter).map((deal, index) => (
                        <TableRow key={deal.id || index}>
                          <TableCell>{deal.customerName || deal.customer_name}</TableCell>
                          <TableCell>{deal.salesAgentName || deal.sales_agent}</TableCell>
                          <TableCell>${(deal.amountPaid || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{deal.status}</Badge>
                          </TableCell>
                          <TableCell>{new Date(deal.signupDate || deal.created_at).toLocaleDateString()}</TableCell>
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
                    <Eye className="h-5 w-5 mr-2" />
                    Team Callbacks (Read-Only)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterData(teamData.callbacks, searchTerm, statusFilter).map((callback, index) => (
                        <TableRow key={callback.id || index}>
                          <TableCell>{callback.customerName || callback.customer_name}</TableCell>
                          <TableCell>{callback.salesAgentName || callback.sales_agent}</TableCell>
                          <TableCell>{callback.phoneNumber || callback.phone_number}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{callback.status}</Badge>
                          </TableCell>
                          <TableCell>{new Date(callback.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                    My Callbacks (Editable)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personalCallbacks.map((callback: any, index: number) => (
                        <TableRow key={callback.id || index}>
                          <TableCell>{callback.customerName || callback.customer_name}</TableCell>
                          <TableCell>{callback.phoneNumber || callback.phone_number}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{callback.status}</Badge>
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
                    </TableBody>
                  </Table>
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
