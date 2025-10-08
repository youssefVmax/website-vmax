"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RefreshCw, TrendingUp, Users, Target, DollarSign, Phone } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { User } from '@/types/user'

interface Deal {
  id: string
  amountPaid?: number
  amount_paid?: number
  totalAmount?: number
  total_amount?: number
  revenue?: number
  SalesAgentID?: string
  sales_agent?: string
}

interface Callback {
  id: string
  amountPaid?: number
  amount_paid?: number
  totalAmount?: number
  total_amount?: number
  revenue?: number
  SalesAgentID?: string
  sales_agent?: string
  salesAgentId?: string
  created_by_id?: string
  created_at?: string
  first_call_date?: string
  scheduled_date?: string
}

interface Target {
  id: string
  agentId?: string
  salesAgentId?: string
  agentName?: string
  period: string
  monthlyTarget?: number
  targetRevenue?: number
  target_revenue?: number
  targetAmount?: number
}

interface SalesmanPerformance {
  userId: string
  name: string
  team: string
  totalDeals: number
  totalAmount: number
  totalCallbacks: number
  targetRevenue: number
  targetProgress: number
}

interface TeamPerformanceDashboardProps {
  user: User
}

const MONTHS = [
  { value: '2025-09', label: 'September 2025' },
  { value: '2025-10', label: 'October 2025' },
  { value: '2025-11', label: 'November 2025' },
  { value: '2025-12', label: 'December 2025' },
  { value: '2026-01', label: 'January 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-07', label: 'July 2026' },
  { value: '2026-08', label: 'August 2026' },
]

export default function TeamPerformanceDashboard({ user }: TeamPerformanceDashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState('2025-09')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [callbacks, setCallbacks] = useState<Callback[]>([])
  const [targets, setTargets] = useState<Target[]>([])

  // Fetch all data for the selected month
  const fetchData = async () => {
    try {
      setLoading(true)

      const [month, year] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

      console.log('🔄 TeamPerformanceDashboard: Fetching data for', { selectedMonth, startDate, endDate })

      // Fetch users - filter by role appropriately
      const usersParams = new URLSearchParams({
        limit: '1000'
      })
      const usersResponse = await fetch('/api/users?limit=1000')
      const usersData = await usersResponse.json()
      const allUsers = Array.isArray(usersData) ? usersData : (usersData.users || [])

      // Filter users based on role
      let filteredUsers = allUsers.filter((u: any) => u.role === 'salesman')
      if (user.role === 'team_leader') {
        // Team leaders only see their team
        filteredUsers = filteredUsers.filter((u: any) =>
          u.team === user.managedTeam || u.team_name === user.managedTeam
        )
      }
      // Managers see all salesmen

      setUsers(filteredUsers)

      // Fetch deals with proper parameters
      const dealsParams = new URLSearchParams({
        limit: '1000',
        userRole: user.role,
        userId: user.id
      })

      if (user.role === 'team_leader' && user.managedTeam) {
        dealsParams.append('managedTeam', user.managedTeam)
      }

      console.log('🔍 Fetching deals with params:', Object.fromEntries(dealsParams.entries()))
      const dealsResponse = await fetch(`/api/deals?${dealsParams.toString()}`)
      console.log('🔍 Deals response status:', dealsResponse.status)
      const dealsData = await dealsResponse.json()
      console.log('🔍 Raw deals response:', dealsData)
      const allDeals = Array.isArray(dealsData) ? dealsData : (dealsData.deals || [])
      console.log('📊 Processed deals:', allDeals.length, 'items')

      // Don't filter by month for now - fetch all deals and filter client-side
      const deals = allDeals

      // Fetch callbacks with proper parameters - temporarily remove role filtering to see all callbacks
      const callbacksParams = new URLSearchParams({
        limit: '1000'
        // Temporarily remove role-based filtering to see all callbacks
        // userRole: user.role,
        // userId: user.id
      })

      // Temporarily remove managed team filtering
      // if (user.role === 'team_leader' && user.managedTeam) {
      //   callbacksParams.append('managedTeam', user.managedTeam)
      // }

      console.log('🔍 Fetching callbacks with params:', Object.fromEntries(callbacksParams.entries()))
      let callbacksResponse, callbacksData, allCallbacks

      try {
        callbacksResponse = await fetch(`/api/callbacks?${callbacksParams.toString()}`)
        console.log('🔍 Callbacks response status:', callbacksResponse.status)

        if (!callbacksResponse.ok) {
          console.error('❌ Callbacks API error:', callbacksResponse.status, callbacksResponse.statusText)
          throw new Error(`Callbacks API returned ${callbacksResponse.status}`)
        }

        callbacksData = await callbacksResponse.json()
        console.log('🔍 Raw callbacks response:', callbacksData)
        allCallbacks = Array.isArray(callbacksData) ? callbacksData : (callbacksData.callbacks || [])
        console.log('📊 Processed callbacks:', allCallbacks.length, 'items')
      } catch (fetchError) {
        console.error('❌ Failed to fetch callbacks:', fetchError)
        allCallbacks = [] // Set empty array on error
      }

      // Show first few callbacks for debugging
      if (allCallbacks.length > 0) {
        console.log('📞 Sample callbacks:', allCallbacks.slice(0, 3).map((cb: any) => ({
          id: cb.id,
          SalesAgentID: cb.SalesAgentID,
          sales_agent: cb.sales_agent,
          status: cb.status,
          created_at: cb.created_at
        })))
      }

      // Filter callbacks by current user - match by ID or name
      let callbacks = allCallbacks
      if (allCallbacks.length > 0) {
        // First, let's see what callbacks exist for debugging
        const userCallbacks = allCallbacks.filter((callback: any) => {
          return callback.SalesAgentID === user.id ||
                 callback.created_by_id === user.id ||
                 callback.sales_agent === user.name ||
                 callback.sales_agent === user.username ||
                 callback.created_by === user.name ||
                 callback.created_by === user.username
        })

        console.log(`🔍 User ${user.name} (${user.id}) - Found ${userCallbacks.length} callbacks by direct match`)

        // Let's also check if there are callbacks that should belong to this user but aren't being matched
        const allUserCallbacks = allCallbacks.filter((callback: any) => {
          // Check for case-insensitive name matches and partial matches
          const nameMatch = callback.sales_agent?.toLowerCase()?.includes(user.name?.toLowerCase()) ||
                           callback.created_by?.toLowerCase()?.includes(user.name?.toLowerCase()) ||
                           callback.sales_agent?.toLowerCase()?.includes(user.username?.toLowerCase()) ||
                           callback.created_by?.toLowerCase()?.includes(user.username?.toLowerCase())

          const idMatch = callback.SalesAgentID === user.id || callback.created_by_id === user.id

          return nameMatch || idMatch
        })

        if (allUserCallbacks.length !== userCallbacks.length) {
          console.log(`⚠️ Found ${allUserCallbacks.length} callbacks with loose matching vs ${userCallbacks.length} with strict matching`)
          console.log('📋 Callbacks that might belong to user:', allUserCallbacks.slice(0, 5).map((cb: any) => ({
            id: cb.id,
            SalesAgentID: cb.SalesAgentID,
            sales_agent: cb.sales_agent,
            created_by: cb.created_by
          })))
        }

        // For manager view, show all callbacks, for others only their own
        if (user.role === 'manager') {
          callbacks = allCallbacks // Show all callbacks for managers
          console.log(`👑 Manager view: Showing all ${allCallbacks.length} callbacks`)
        } else if (user.role === 'team_leader') {
          // For team leader, show callbacks from their team
          callbacks = allCallbacks.filter((callback: any) => {
            // Find if this callback belongs to someone in the team leader's team
            const callbackUser = users.find(u => u.id === callback.SalesAgentID ||
                                                u.id === callback.created_by_id ||
                                                u.name === callback.sales_agent ||
                                                u.username === callback.sales_agent)
            return callbackUser && callbackUser.team_name === user.managedTeam
          })
          console.log(`👨‍💼 Team leader view (${user.managedTeam}): Showing ${callbacks.length} callbacks from team`)
        } else {
          // For sales agents, show only their own callbacks - use loose matching for now
          callbacks = allUserCallbacks
          console.log(`👤 Sales agent view: Showing ${callbacks.length} personal callbacks (using loose matching)`)
        }

        console.log(`📊 Final filtered callbacks (${user.role}):`, callbacks.length, 'items from', allCallbacks.length, 'total')
      }

      console.log('📊 Final callbacks after filtering:', callbacks.length, 'items')

      // Fetch targets for the selected period
      const targetsParams = new URLSearchParams({
        limit: '1000',
        period: selectedMonth
      })

      console.log('🔍 Fetching targets with params:', Object.fromEntries(targetsParams.entries()))
      const targetsResponse = await fetch(`/api/targets?${targetsParams.toString()}`)
      console.log('🔍 Targets response status:', targetsResponse.status)
      const targetsData = await targetsResponse.json()
      console.log('🔍 Raw targets response:', targetsData)
      const allTargets = Array.isArray(targetsData) ? targetsData : (targetsData.targets || [])
      console.log('📊 Processed targets:', allTargets.length, 'items')

      setDeals(deals)
      setCallbacks(callbacks)
      setTargets(allTargets)

      console.log('✅ TeamPerformanceDashboard: Data fetched', {
        users: filteredUsers.length,
        deals: deals.length,
        callbacks: callbacks.length,
        targets: allTargets.length
      })

      // TEMPORARY: Add sample data if no real data exists
      if (filteredUsers.length > 0 && deals.length === 0 && callbacks.length === 0) {
        console.log('⚠️ No real data found, adding sample data for demonstration')

        // Create dates in the selected month for sample data
        const [month, year] = selectedMonth.split('-')
        const sampleDate = new Date(parseInt(year), parseInt(month) - 1, Math.floor(Math.random() * 28) + 1)
      }

    } catch (error) {
      console.error('❌ TeamPerformanceDashboard: Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth, user])

  // Calculate performance data
  const performanceData = useMemo(() => {
    // Initialize with users - create a more robust mapping
    const salesmanMap = new Map<string, SalesmanPerformance>()
    const userIdToName = new Map<string, { name: string, team: string }>()

    users.forEach(user => {
      const userId = user.id?.toString() || user.username || ''
      const teamName = user.team_name || user.team || 'Unknown Team'

      salesmanMap.set(userId, {
        userId,
        name: user.name || user.username || 'Unknown',
        team: teamName,
        totalDeals: 0,
        totalAmount: 0,
        totalCallbacks: 0,
        targetRevenue: 0,
        targetProgress: 0
      })

      userIdToName.set(userId, { name: user.name || user.username || 'Unknown', team: teamName })
      console.log(`👤 Added user: ${userId} (${user.name || user.username})`)
    })

    console.log('📋 Total users mapped:', salesmanMap.size)
    console.log('🔑 User ID keys:', Array.from(salesmanMap.keys()))

    // Add deals data
    deals.forEach(deal => {
      const agentId = (deal.SalesAgentID || deal.sales_agent || '')?.toString()
      const amount = deal.amountPaid || deal.amount_paid || deal.totalAmount || deal.total_amount || deal.revenue || 0

      // Try multiple matching strategies
      let performance = salesmanMap.get(agentId)
      if (!performance) {
        // Try matching by username if ID doesn't work
        const dealAgentName = deal.sales_agent || deal.SalesAgentID
        for (const [userId, perf] of salesmanMap.entries()) {
          if (perf.name === dealAgentName || userId === dealAgentName) {
            performance = perf
            break
          }
        }
      }

      if (performance) {
        performance.totalDeals += 1
        performance.totalAmount += Number(amount)
        console.log(`✅ Deal matched: ${agentId} (${deal.sales_agent || deal.SalesAgentID}) - Amount: ${amount}`)
      } else {
        console.log(`❌ Deal NOT matched: ${agentId} (${deal.sales_agent || deal.SalesAgentID}) - Available users:`, Array.from(salesmanMap.keys()))
      }
    })

    // Add callbacks data
    callbacks.forEach(callback => {
      const agentId = (callback.SalesAgentID || callback.salesAgentId || callback.sales_agent || callback.created_by_id || '')?.toString()

      // Try multiple matching strategies
      let performance = salesmanMap.get(agentId)
      if (!performance) {
        // Try matching by username if ID doesn't work
        const callbackAgentName = callback.sales_agent || callback.SalesAgentID
        for (const [userId, perf] of salesmanMap.entries()) {
          if (perf.name === callbackAgentName || userId === callbackAgentName) {
            performance = perf
            break
          }
        }
      }

      if (performance) {
        performance.totalCallbacks += 1
        console.log(`✅ Callback matched: ${agentId} (${callback.sales_agent || callback.SalesAgentID})`)
      } else {
        console.log(`❌ Callback NOT matched: ${agentId} (${callback.sales_agent || callback.SalesAgentID}) - Available users:`, Array.from(salesmanMap.keys()))
      }
    })

    // Add targets data - handle different target field names
    targets.forEach(target => {
      const agentId = (target.agentId || target.salesAgentId || '')?.toString()
      const targetAmount = target.monthlyTarget || target.targetRevenue || target.target_revenue || target.targetAmount || 0

      // Try multiple matching strategies
      let performance = salesmanMap.get(agentId)
      if (!performance) {
        // Try matching by agent name if ID doesn't work
        const targetAgentName = target.agentName || target.salesAgentId
        for (const [userId, perf] of salesmanMap.entries()) {
          if (perf.name === targetAgentName || userId === targetAgentName) {
            performance = perf
            break
          }
        }
      }

      if (performance) {
        performance.targetRevenue = Number(targetAmount)
        console.log(`✅ Target matched: ${agentId} - Amount: ${targetAmount}`)
      } else {
        console.log(`❌ Target NOT matched: ${agentId} - Available users:`, Array.from(salesmanMap.keys()))
      }
    })

    // Calculate target progress
    salesmanMap.forEach((performance: SalesmanPerformance) => {
      if (performance.targetRevenue > 0) {
        performance.targetProgress = (performance.totalAmount / performance.targetRevenue) * 100
      }
    })

    // Debug: Log final performance results
    console.log('📊 Final performance data:', Array.from(salesmanMap.values()).map((p: SalesmanPerformance) => ({
      name: p.name,
      userId: p.userId,
      totalDeals: p.totalDeals,
      totalAmount: p.totalAmount,
      totalCallbacks: p.totalCallbacks,
      targetRevenue: p.targetRevenue
    })))

    return Array.from(salesmanMap.values())
  }, [users, deals, callbacks, targets])

  // Group by teams for manager view
  const teamGroups = useMemo(() => {
    const groups: Record<string, SalesmanPerformance[]> = {}

    performanceData.forEach((performance: SalesmanPerformance) => {
      const team = performance.team
      if (!groups[team]) {
        groups[team] = []
      }
      groups[team].push(performance)
    })

    // Sort within each team by total amount descending
    Object.keys(groups).forEach(team => {
      groups[team].sort((a, b) => b.totalAmount - a.totalAmount)
    })

    return groups
  }, [performanceData])

  const renderPerformanceTable = (performances: SalesmanPerformance[], teamName?: string) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {teamName ? `${teamName} Team Performance` : 'Team Performance'}
          <Badge variant="outline">{performances.length} Salesmen</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Salesman</TableHead>
              <TableHead className="text-right">Total Deals</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Total Callbacks</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performances.map((performance) => (
              <TableRow key={performance.userId}>
                <TableCell className="font-medium">{performance.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Target className="h-4 w-4 text-blue-600" />
                    {performance.totalDeals}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    ${performance.totalAmount.toLocaleString()}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Phone className="h-4 w-4 text-orange-600" />
                    {performance.totalCallbacks}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  ${performance.targetRevenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(performance.targetProgress, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {performance.targetProgress.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user.role === 'manager' ? 'All Teams Performance' : 'Team Performance Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            Performance metrics for salesmen in {user.role === 'manager' ? 'all teams' : 'your team'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black dark:text-gray-200">Total Salesmen</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black dark:text-gray-200">Total Deals</p>
                <p className="text-2xl font-bold">{deals.length}</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black dark:text-gray-200">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ${performanceData.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black dark:text-gray-200">Total Callbacks</p>
                <p className="text-2xl font-bold">{callbacks.length}</p>
              </div>
              <Phone className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Tables */}
      {user.role === 'manager' ? (
        // Manager view: separate tables for each team
        Object.entries(teamGroups).map(([teamName, teamPerformances]) => (
          <div key={teamName}>
            {renderPerformanceTable(teamPerformances, teamName)}
          </div>
        ))
      ) : (
        // Team leader view: single table for their team
        renderPerformanceTable(performanceData, user.managedTeam)
      )}

      {/* Empty state */}
      {performanceData.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Performance Data</h3>
            <p className="text-muted-foreground">
              No salesmen performance data available for the selected month.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
