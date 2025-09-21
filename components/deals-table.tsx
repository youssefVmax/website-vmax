"use client"

import React, { useState, useEffect } from 'react'
import { dealsService } from '@/lib/mysql-deals-service'
import { Deal } from '@/lib/api-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Download, Filter, Eye, Calendar, DollarSign, Users, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

export default function DealsTablePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchDeals()
  }, [])

  useEffect(() => {
    filterAndSortDeals()
  }, [deals, searchTerm, statusFilter, stageFilter, teamFilter, sortBy, sortOrder])

  const fetchDeals = async () => {
    try {
      setLoading(true)
      const allDeals = await dealsService.getDeals()
      setDeals(allDeals)
    } catch (error) {
      console.error('Error fetching deals:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortDeals = () => {
    let filtered = [...deals]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(deal =>
        deal.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.phoneNumber?.includes(searchTerm) ||
        deal.salesAgentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.closingAgentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.country?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(deal => deal.status === statusFilter)
    }

    // Apply stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter(deal => deal.stage === stageFilter)
    }

    // Apply team filter
    if (teamFilter !== 'all') {
      filtered = filtered.filter(deal => deal.salesTeam === teamFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Deal]
      let bValue: any = b[sortBy as keyof Deal]

      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'signup_date') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      // Handle numeric sorting
      if (sortBy === 'amount_paid' || sortBy === 'duration_months') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      }

      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredDeals(filtered)
  }

  const exportToCSV = () => {
    const headers = [
      'Deal ID', 'Customer Name', 'Email', 'Phone', 'Country', 'Signup Date',
      'Amount Paid', 'Duration (Months)', 'Service Tier', 'Sales Agent',
      'Closing Agent', 'Sales Team', 'Status', 'Stage', 'Priority', 'Created At'
    ]

    const csvData = filteredDeals.map(deal => [
      deal.dealId || '',
      deal.customerName,
      deal.email,
      deal.phoneNumber,
      deal.country,
      deal.signupDate,
      deal.amountPaid,
      deal.durationMonths,
      deal.serviceTier,
      deal.salesAgentName,
      deal.closingAgentName,
      deal.salesTeam,
      deal.status,
      deal.stage,
      deal.priority,
      deal.createdAt ? format(new Date(deal.createdAt), 'yyyy-MM-dd HH:mm:ss') : ''
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `deals_export_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'completed': return 'secondary'
      case 'cancelled': return 'destructive'
      case 'inactive': return 'outline'
      default: return 'default'
    }
  }

  const getStageBadgeVariant = (stage: string) => {
    switch (stage) {
      case 'closed-won': return 'default'
      case 'closed-lost': return 'destructive'
      case 'negotiation': return 'secondary'
      case 'proposal': return 'outline'
      default: return 'outline'
    }
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  // Calculate summary statistics
  const totalDeals = filteredDeals.length
  const totalRevenue = filteredDeals.reduce((sum, deal) => sum + deal.amountPaid, 0)
  const averageDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0
  const uniqueAgents = new Set(filteredDeals.map(deal => deal.salesAgentName)).size

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading deals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Deals</h1>
          <p className="text-muted-foreground">
            Comprehensive view of all deals from all salesmen
          </p>
        </div>
        <Button onClick={exportToCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeals}</div>
            <p className="text-xs text-muted-foreground">
              {deals.length} total in database
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From filtered deals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Deal Size</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageDealSize.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Per deal average
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueAgents}</div>
            <p className="text-xs text-muted-foreground">
              Unique sales agents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed-won">Closed Won</SelectItem>
                <SelectItem value="closed-lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="ALI ASHRAF">ALI ASHRAF</SelectItem>
                <SelectItem value="CS TEAM">CS TEAM</SelectItem>
              </SelectContent>
            </Select>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-')
              setSortBy(field)
              setSortOrder(order as 'asc' | 'desc')
            }}>
              <SelectTrigger>
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
          </div>
        </CardContent>
      </Card>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deals ({filteredDeals.length})</CardTitle>
          <CardDescription>
            All deals from salesmen with complete information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Sales Agent</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-mono text-xs">
                      {deal.dealId || deal.id?.slice(-8)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{deal.customerName}</div>
                        <div className="text-xs text-muted-foreground">{deal.country}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>{deal.email}</div>
                        <div className="text-muted-foreground">{deal.phoneNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${deal.amountPaid.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{deal.serviceTier}</div>
                    </TableCell>
                    <TableCell>
                      <div>{deal.durationMonths} months</div>
                      {deal.durationYears && (
                        <div className="text-xs text-muted-foreground">({deal.durationYears} years)</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{deal.salesAgentName}</div>
                        <div className="text-xs text-muted-foreground">{deal.closingAgentName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{deal.salesTeam}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(deal.status)}>
                        {deal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStageBadgeVariant(deal.stage)}>
                        {deal.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadgeVariant(deal.priority)}>
                        {deal.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {deal.createdAt ? format(new Date(deal.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredDeals.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No deals found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
