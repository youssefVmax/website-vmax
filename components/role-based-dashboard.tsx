"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Phone, 
  Target,
  BarChart3,
  Award,
  Activity
} from "lucide-react"
import EditableDataTable from "./editable-data-table"
import EnhancedTeamLeaderDashboard from "./enhanced-team-leader-dashboard"
import { User } from "@/lib/auth"
import { API_CONFIG } from "@/lib/config"

interface RoleBasedDashboardProps {
  user: User
}

interface AnalyticsData {
  totalDeals: number
  totalRevenue: number
  totalCallbacks: number
  avgDealSize: number
  conversionRate: number
  teamMembers?: number
}

export default function RoleBasedDashboard({ user }: RoleBasedDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalDeals: 0,
    totalRevenue: 0,
    totalCallbacks: 0,
    avgDealSize: 0,
    conversionRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [user])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (user.role !== 'manager') {
        params.append('user_id', user.id.toString())
      }
      if (user.team_name && user.role === 'team-leader') {
        params.append('team', user.team_name)
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/analytics-api.php?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setAnalytics(result.data)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Define column configurations for different data types
  const dealsColumns = [
    { key: 'id', label: 'ID', editable: false },
    { key: 'customer_name', label: 'Customer', type: 'text' as const },
    { key: 'deal_value', label: 'Value', type: 'number' as const },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select' as const,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'closed_won', label: 'Closed Won' },
        { value: 'closed_lost', label: 'Closed Lost' }
      ]
    },
    { 
      key: 'stage', 
      label: 'Stage', 
      type: 'select' as const,
      options: [
        { value: 'lead', label: 'Lead' },
        { value: 'qualified', label: 'Qualified' },
        { value: 'proposal', label: 'Proposal' },
        { value: 'negotiation', label: 'Negotiation' },
        { value: 'closed', label: 'Closed' }
      ]
    },
    { key: 'sales_agent_name', label: 'Agent', editable: false },
    { key: 'created_at', label: 'Created', type: 'date' as const, editable: false }
  ]

  const callbacksColumns = [
    { key: 'id', label: 'ID', editable: false },
    { key: 'customer_name', label: 'Customer', type: 'text' as const },
    { key: 'phone_number', label: 'Phone', type: 'text' as const },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select' as const,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    },
    { 
      key: 'priority', 
      label: 'Priority', 
      type: 'select' as const,
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' }
      ]
    },
    { key: 'notes', label: 'Notes', type: 'textarea' as const },
    { key: 'scheduled_date', label: 'Scheduled', type: 'date' as const },
    { key: 'sales_agent_name', label: 'Agent', editable: false }
  ]

  const dealsFilters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'closed_won', label: 'Closed Won' },
        { value: 'closed_lost', label: 'Closed Lost' }
      ]
    },
    {
      key: 'stage',
      label: 'Stage',
      type: 'select' as const,
      options: [
        { value: 'lead', label: 'Lead' },
        { value: 'qualified', label: 'Qualified' },
        { value: 'proposal', label: 'Proposal' },
        { value: 'negotiation', label: 'Negotiation' },
        { value: 'closed', label: 'Closed' }
      ]
    }
  ]

  const callbacksFilters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select' as const,
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' }
      ]
    }
  ]

  // Determine permissions based on role
  const canEditOwnData = user.role === 'salesman' || user.role === 'team-leader'
  const canViewTeamData = user.role === 'team-leader' || user.role === 'manager'
  const canViewAllData = user.role === 'manager'
  const canCreateData = true // All roles can create

  const renderAnalyticsCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.totalDeals}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${analytics.totalRevenue.toLocaleString()}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Callbacks</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.totalCallbacks}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${analytics.avgDealSize.toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Manager Dashboard - Full access to all data
  if (user.role === 'manager') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manager Dashboard</h1>
            <p className="text-gray-600">Complete system overview and management</p>
          </div>
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            Manager
          </Badge>
        </div>

        {renderAnalyticsCards()}

        <Tabs defaultValue="all-deals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all-deals">All Deals</TabsTrigger>
            <TabsTrigger value="all-callbacks">All Callbacks</TabsTrigger>
            <TabsTrigger value="team-performance">Team Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="all-deals">
            <EditableDataTable
              title="All Deals"
              description="Complete overview of all deals in the system"
              endpoint="deals-api.php"
              columns={dealsColumns}
              filters={dealsFilters}
              canEdit={true}
              canDelete={true}
              canCreate={true}
              userRole={user.role}
              userId={user.id.toString()}
            />
          </TabsContent>

          <TabsContent value="all-callbacks">
            <EditableDataTable
              title="All Callbacks"
              description="Complete overview of all callbacks in the system"
              endpoint="callbacks-api.php"
              columns={callbacksColumns}
              filters={callbacksFilters}
              canEdit={true}
              canDelete={true}
              canCreate={true}
              userRole={user.role}
              userId={user.id.toString()}
            />
          </TabsContent>

          <TabsContent value="team-performance">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Analytics</CardTitle>
                <CardDescription>
                  Detailed team performance metrics and comparisons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-8">
                  Team performance analytics coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Team Leader Dashboard - Personal + Team data
  if (user.role === 'team-leader') {
    return <EnhancedTeamLeaderDashboard user={user} userRole={user.role} />
  }

  // Salesman Dashboard - Personal data only
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Dashboard</h1>
          <p className="text-gray-600">Your personal performance and activities</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700">
          Salesman
        </Badge>
      </div>

      {renderAnalyticsCards()}

      <Tabs defaultValue="my-deals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-deals">My Deals</TabsTrigger>
          <TabsTrigger value="my-callbacks">My Callbacks</TabsTrigger>
          <TabsTrigger value="my-performance">My Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="my-deals">
          <EditableDataTable
            title="My Deals"
            description="Your personal deals - fully editable"
            endpoint="deals-api.php"
            columns={dealsColumns}
            filters={dealsFilters}
            canEdit={true}
            canDelete={true}
            canCreate={true}
            userRole={user.role}
            userId={user.id.toString()}
          />
        </TabsContent>

        <TabsContent value="my-callbacks">
          <EditableDataTable
            title="My Callbacks"
            description="Your personal callbacks - fully editable"
            endpoint="callbacks-api.php"
            columns={callbacksColumns}
            filters={callbacksFilters}
            canEdit={true}
            canDelete={true}
            canCreate={true}
            userRole={user.role}
            userId={user.id.toString()}
          />
        </TabsContent>

        <TabsContent value="my-performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>
                Your personal performance metrics and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Conversion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {analytics.conversionRate.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Target</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      ${(analytics.totalRevenue * 1.2).toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Target for next month
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
