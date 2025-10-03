"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Deal } from '@/lib/api-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ServerPagination } from '@/components/ui/server-pagination'
import { useServerPagination } from '@/hooks/useServerPagination'
import { useAuth } from '@/hooks/useAuth'
import { Search, Download, Filter, Eye, Calendar, DollarSign, Users, TrendingUp, RefreshCw, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

// Enhanced Deal type with both camelCase and snake_case fields for compatibility
type DealData = Deal & {
  closing_agent?: string;
  closing_agent_name?: string;
  closingAgentName?: string;
  durationYears?: number;
  numberOfUsers?: number;
  dealId?: string;
  serviceTier?: string;
  salesAgentId?: string;
  deviceKey?: string;
  deviceId?: string;
  invoiceLink?: string;
  createdBy?: string;
  programType?: string;
  program_type?: string;
  // Service feature flags
  is_ibo_player?: boolean | number;
  is_bob_player?: boolean | number;
  is_smarters?: boolean | number;
  is_ibo_pro?: boolean | number;
  is_iboss?: boolean | number;
}

// Helper function to get closing agent name from various field formats
const getClosingAgentName = (deal: DealData) => 
  deal?.closingAgentName || deal?.closing_agent || deal?.closing_agent_name || '';

// Helper function to get program type from deal data
const getProgramType = (deal: any) => {
  // First check if program_type is explicitly set
  if (deal.program_type && deal.program_type !== 'None Selected' && deal.program_type !== null) {
    return deal.program_type;
  }
  if (deal.programType && deal.programType !== 'None Selected' && deal.programType !== null) {
    return deal.programType;
  }
  
  // If not, calculate from boolean service feature fields
  if (deal.is_ibo_player === true || deal.is_ibo_player === 1) return 'IBO Player';
  if (deal.is_bob_player === true || deal.is_bob_player === 1) return 'BOB Player';
  if (deal.is_smarters === true || deal.is_smarters === 1) return 'Smarters';
  if (deal.is_ibo_pro === true || deal.is_ibo_pro === 1) return 'IBO Pro';
  if (deal.is_iboss === true || deal.is_iboss === 1) return 'IBOSS';
  
  // For legacy deals without any program type data, default to IBO Player
  // This provides a reasonable fallback for existing deals
  return 'IBO Player';
};

export default function DealsTablePage() {
  const [deals, setDeals] = useState<DealData[]>([])
  const [totalDeals, setTotalDeals] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  // Server pagination hook
  const [paginationState, paginationActions] = useServerPagination({
    initialPage: 1,
    initialItemsPerPage: 25,
  })

  const { currentPage: page, itemsPerPage: limit } = paginationState
  const { setCurrentPage: setPage, setItemsPerPage } = paginationActions

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search or filter changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return; // Wait for debounce
    paginationActions.goToFirstPage();
  }, [debouncedSearchTerm, statusFilter, stageFilter, teamFilter]);

  // Fetch deals with server-side pagination
  const fetchDeals = useCallback(async (
    page: number = paginationState.currentPage,
    limit: number = paginationState.itemsPerPage,
    search: string = debouncedSearchTerm,
    statusFilterParam: string = statusFilter,
    stageFilterParam: string = stageFilter,
    teamFilterParam: string = teamFilter
  ) => {
    try {
      paginationActions.setIsLoading(true)
      setError(null)
      
      // Build API parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      // Role-based scoping
      if (user?.role === 'team_leader') {
        params.set('userRole', 'team_leader')
        params.set('userId', String(user.id))
        if (user.managedTeam) {
          params.set('managedTeam', user.managedTeam)
        }
      } else if (user?.role === 'salesman') {
        params.set('userRole', 'salesman')
        params.set('userId', String(user.id))
      } else {
        params.set('userRole', 'manager')
        params.set('userId', String(user?.id || 'manager-001'))
      }
      
      // Add search if provided
      if (search.trim()) {
        params.append('search', search.trim())
      }
      
      // Add status filter if not 'all'
      if (statusFilterParam && statusFilterParam !== 'all') {
        params.append('status', statusFilterParam)
      }
      
      // Add stage filter if not 'all'
      if (stageFilterParam && stageFilterParam !== 'all') {
        params.append('stage', stageFilterParam)
      }
      
      // Add team filter only for manager; team leaders are locked to their managedTeam by API
      if (user?.role !== 'team_leader') {
        if (teamFilterParam && teamFilterParam !== 'all') {
          params.append('salesTeam', teamFilterParam)
        }
      }
      
      // Fetch from API - use localhost in development
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://vmaxcom.org';
      const apiUrl = `${baseUrl}/api/deals?${params.toString()}`;
      
      console.log('🔍 DealsTable: Fetching deals from:', apiUrl);
      console.log('🔍 DealsTable: Search params:', { search, statusFilterParam, stageFilterParam, teamFilterParam });
      
      const response = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch deals')
      }
      
      // Debug: Log the first deal to see the data structure
      if (result.deals && result.deals.length > 0) {
        console.log('🔍 DealsTable: Sample deal data structure:', {
          program_type: result.deals[0].program_type,
          is_ibo_player: result.deals[0].is_ibo_player,
          is_bob_player: result.deals[0].is_bob_player,
          is_smarters: result.deals[0].is_smarters,
          is_ibo_pro: result.deals[0].is_ibo_pro,
          is_iboss: result.deals[0].is_iboss,
          customer_name: result.deals[0].customer_name
        })
      }
      
      // Normalize deals data - prioritize database field formats (snake_case)
      const normalizedDeals = (result.deals || []).map((deal: any) => ({
        // Core identifiers
        id: deal.id ?? `deal-${Math.random()}`,
        dealId: deal.DealID ?? deal.dealId ?? deal.id?.slice(-8),
        
        // Customer Information
        customerName: deal.customer_name ?? deal.customerName ?? 'Unknown Customer',
        email: deal.email ?? '',
        phoneNumber: deal.phone_number ?? deal.phoneNumber ?? '',
        country: deal.country ?? '',
        customCountry: deal.custom_country ?? deal.customCountry ?? '',
        
        // Deal Information
        amountPaid: deal.amount_paid ?? deal.amountPaid ?? 0,
        serviceTier: deal.service_tier ?? deal.serviceTier ?? 'Silver',
        // Use helper function to get program type
        programType: getProgramType(deal),
        signupDate: deal.signup_date ?? deal.signupDate ?? '',
        endDate: deal.end_date ?? deal.endDate ?? '',
        durationYears: deal.duration_years ?? deal.durationYears ?? 0,
        durationMonths: deal.duration_months ?? deal.durationMonths ?? 12,
        numberOfUsers: deal.number_of_users ?? deal.numberOfUsers ?? 1,
        productType: deal.product_type ?? deal.productType ?? '',
        
        // Calculated Fields
        paidPerMonth: deal.paid_per_month ?? deal.paidPerMonth ?? 0,
        paidPerDay: deal.paid_per_day ?? deal.paidPerDay ?? 0,
        daysRemaining: deal.days_remaining ?? deal.daysRemaining ?? 0,
        dataMonth: deal.data_month ?? deal.dataMonth ?? 0,
        dataYear: deal.data_year ?? deal.dataYear ?? 0,
        endYear: deal.end_year ?? deal.endYear ?? 0,
        
        // Agent Information
        salesAgentId: deal.SalesAgentID ?? deal.salesAgentId ?? '',
        salesAgentName: deal.sales_agent_name ?? deal.sales_agent ?? deal.salesAgentName ?? 'Unknown Agent',
        closingAgentId: deal.ClosingAgentID ?? deal.closingAgentId ?? '',
        closingAgentName: deal.closing_agent_name ?? deal.closing_agent ?? deal.closingAgentName ?? '',
        salesTeam: deal.sales_team ?? deal.salesTeam ?? 'Unknown Team',
        
        // Service Features
        isIboPlayer: deal.is_ibo_player ?? deal.isIboPlayer ?? false,
        isBobPlayer: deal.is_bob_player ?? deal.isBobPlayer ?? false,
        isSmarters: deal.is_smarters ?? deal.isSmarters ?? false,
        isIboPro: deal.is_ibo_pro ?? deal.isIboPro ?? false,
        isIboss: deal.is_iboss ?? deal.isIboss ?? false,
        
        // Additional Information
        deviceKey: deal.device_key ?? deal.deviceKey ?? '',
        deviceId: deal.device_id ?? deal.deviceId ?? '',
        invoiceLink: deal.invoice_link ?? deal.invoiceLink ?? 'Website',
        notes: deal.notes ?? '',
        
        // Status Information
        stage: deal.stage ?? 'prospect',
        status: deal.status ?? 'active',
        priority: deal.priority ?? 'medium',
        
        // Metadata
        createdBy: deal.created_by ?? deal.createdBy ?? '',
        createdAt: deal.created_at ?? deal.createdAt ?? '',
        updatedAt: deal.updated_at ?? deal.updatedAt ?? '',
      }))
      
      // Debug: Log the first normalized deal to see what we're displaying
      if (normalizedDeals.length > 0) {
        console.log('🔍 DealsTable: Sample normalized deal:', {
          programType: normalizedDeals[0].programType,
          is_ibo_player: result.deals[0]?.is_ibo_player,
          is_bob_player: result.deals[0]?.is_bob_player,
          program_type_field: result.deals[0]?.program_type,
          salesAgentName: normalizedDeals[0].salesAgentName,
          closingAgentName: normalizedDeals[0].closingAgentName
        })
      }
      
      setDeals(normalizedDeals)
      setTotalDeals(result.total || 0)
      paginationActions.setTotalItems(result.total || 0)
      
    } catch (error) {
      console.error('❌ Error fetching deals:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch deals')
      setDeals([])
      setTotalDeals(0)
      paginationActions.setTotalItems(0)
    } finally {
      paginationActions.setIsLoading(false)
    }
  }, [paginationState.currentPage, paginationState.itemsPerPage, debouncedSearchTerm, statusFilter, stageFilter, teamFilter, paginationActions])

  // Fetch deals with debouncing for search
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      // Debounce search - already handled by debouncedSearchTerm
      fetchDeals()
    } else {
      // Immediate fetch for non-search changes
      fetchDeals()
    }
  }, [fetchDeals])


  const exportToCSV = () => {
    const headers = [
      'Deal ID', 'Customer Name', 'Email', 'Phone', 'Country', 'Signup Date',
      'Amount Paid', 'Duration (Months)', 'Duration (Years)', 'Service Tier', 'Program Type', 'Number of Users',
      'Sales Agent', 'Sales Agent ID', 'Closing Agent', 'Closing Agent ID', 'Sales Team',
      'Device Key', 'Device ID', 'Invoice Link', 'Notes',
      'Status', 'Stage', 'Priority', 'Created At', 'Created By'
    ]

    const csvData = deals.map(deal => [
      deal.dealId || '',
      deal.customerName,
      deal.email,
      deal.phoneNumber,
      deal.country,
      deal.signupDate,
      deal.amountPaid,
      deal.durationMonths,
      deal.durationYears || 0,
      deal.serviceTier,
      deal.programType || 'None Selected',
      deal.numberOfUsers || 1,
      deal.salesAgentName,
      deal.salesAgentId || '',
      getClosingAgentName(deal),
      deal.closingAgentId || '',
      deal.salesTeam,
      deal.deviceKey || '',
      deal.deviceId || '',
      deal.invoiceLink || '',
      deal.notes || '',
      deal.status,
      deal.stage,
      deal.priority,
      deal.createdAt ? format(new Date(deal.createdAt), 'yyyy-MM-dd HH:mm:ss') : '',
      deal.createdBy || ''
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

  // Calculate summary statistics (current page only)
  const pageDealsCount = deals.length
  const totalRevenue = deals.reduce((sum, deal) => sum + (Number(deal.amountPaid) || 0), 0)
  const averageDealSize = pageDealsCount > 0 ? totalRevenue / pageDealsCount : 0
  const uniqueAgents = new Set(deals.map(deal => deal.salesAgentName)).size

  if (paginationState.isLoading && deals.length === 0) {
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
            <div className="text-2xl font-bold">{paginationState.totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total in system</p>
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
          <CardTitle>Deals ({totalDeals.toLocaleString()})</CardTitle>
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
                  <TableHead>Service</TableHead>
                  <TableHead>Program Type</TableHead>
                  <TableHead>Sales Agent</TableHead>
                  <TableHead>Closing Agent</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
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
                      {(deal.durationYears || 0) > 0 && (
                        <div className="text-xs text-muted-foreground">({deal.durationYears} years)</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{deal.serviceTier}</div>
                      {(deal.numberOfUsers || 1) > 1 && (
                        <div className="text-xs text-muted-foreground">{deal.numberOfUsers} users</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{deal.programType || 'None Selected'}</div>
                      <div className="text-xs text-muted-foreground">
                        {deal.programType === 'IBO Player' && '🎯 IBO'}
                        {deal.programType === 'BOB Player' && '🎮 BOB'}
                        {deal.programType === 'Smarters' && '📱 Smart'}
                        {deal.programType === 'IBO Pro' && '⭐ Pro'}
                        {deal.programType === 'IBOSS' && '👑 Boss'}
                        {!deal.programType || deal.programType === 'None Selected' && '❌ None'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{deal.salesAgentName}</div>
                      <div className="text-xs text-muted-foreground">ID: {deal.salesAgentId || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{deal.closingAgentName || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">ID: {deal.closingAgentId || 'N/A'}</div>
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

          {/* Pagination */}
          {!paginationState.isLoading && deals.length > 0 && (
            <div className="mt-6">
              <ServerPagination
                currentPage={paginationState.currentPage}
                totalPages={Math.max(1, Math.ceil(totalDeals / paginationState.itemsPerPage))}
                totalItems={totalDeals}
                itemsPerPage={paginationState.itemsPerPage}
                onPageChange={paginationActions.goToPage}
                onItemsPerPageChange={paginationActions.setItemsPerPage}
                isLoading={paginationState.isLoading}
                className="justify-center"
              />
            </div>
          )}

          {deals.length === 0 && !paginationState.isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No deals found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
