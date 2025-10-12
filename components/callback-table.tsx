"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Callback } from '@/lib/api-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ServerPagination } from '@/components/ui/server-pagination'
import { useServerPagination } from '@/hooks/useServerPagination'
import { useAuth } from '@/hooks/useAuth'
import { Search, Download, Filter, Phone, Calendar, Users, Clock, RefreshCw, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export default function CallbacksTablePage() {
  const [callbacks, setCallbacks] = useState<Callback[]>([])
  const [totalCallbacks, setTotalCallbacks] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Server pagination hook
  const [paginationState, paginationActions] = useServerPagination({
    initialPage: 1,
    initialItemsPerPage: 25,
    onPageChange: (page, itemsPerPage) => {
      fetchCallbacks(page, itemsPerPage, debouncedSearchTerm, statusFilter, teamFilter);
    }
  });

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
  }, [debouncedSearchTerm, statusFilter, teamFilter]);

  // Fetch callbacks with server-side pagination
  const fetchCallbacks = useCallback(async (
    page: number = paginationState.currentPage,
    limit: number = paginationState.itemsPerPage,
    search: string = debouncedSearchTerm,
    statusFilterParam: string = statusFilter,
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
      
      // Add team filter only for manager; team leaders are locked to their managedTeam by API
      if (user?.role !== 'team_leader') {
        if (teamFilterParam && teamFilterParam !== 'all') {
          params.append('salesTeam', teamFilterParam)
        }
      }
      
      // Fetch from API
      const response = await fetch(`/api/callbacks?${params.toString()}`, {
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
        throw new Error(result.error || 'Failed to fetch callbacks')
      }
      
      // Normalize callbacks data
      const normalizedCallbacks = (result.callbacks || []).map((cb: any) => ({
        id: cb.id ?? `callback-${Math.random()}`,
        customerName: cb.customerName ?? cb.customer_name ?? 'Unknown Customer',
        phoneNumber: cb.phoneNumber ?? cb.phone_number ?? '',
        email: cb.email ?? '',
        salesAgentId: cb.salesAgentId ?? cb.SalesAgentID ?? '',
        salesAgentName: cb.salesAgentName ?? cb.sales_agent ?? 'Unknown Agent',
        salesTeam: cb.salesTeam ?? cb.sales_team ?? 'Unknown Team',
        firstCallDate: cb.firstCallDate ?? cb.first_call_date ?? '',
        firstCallTime: cb.firstCallTime ?? cb.first_call_time ?? '',
        scheduledDate: cb.scheduledDate ?? cb.scheduled_date ?? '',
        scheduledTime: cb.scheduledTime ?? cb.scheduled_time ?? '',
        status: cb.status ?? 'pending',
        priority: cb.priority ?? 'medium',
        callbackReason: cb.callbackReason ?? cb.callback_reason ?? '',
        callbackNotes: cb.callbackNotes ?? cb.callback_notes ?? '',
        followUpRequired: cb.followUpRequired ?? cb.follow_up_required ?? false,
        createdBy: cb.createdBy ?? cb.created_by ?? '',
        createdById: cb.createdById ?? cb.created_by_id ?? '',
        createdAt: cb.createdAt ?? cb.created_at ?? '',
        updatedAt: cb.updatedAt ?? cb.updated_at ?? '',
        convertedToDeal: cb.converted_to_deal ?? cb.convertedToDeal ?? false,
      }))
      
      setCallbacks(normalizedCallbacks)
      setTotalCallbacks(result.total || 0)
      paginationActions.setTotalItems(result.total || 0)
      
    } catch (error) {
      console.error('❌ Error fetching callbacks:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch callbacks')
      setCallbacks([])
      setTotalCallbacks(0)
      paginationActions.setTotalItems(0)
    } finally {
      paginationActions.setIsLoading(false)
    }
  }, [paginationState.currentPage, paginationState.itemsPerPage, debouncedSearchTerm, statusFilter, teamFilter, paginationActions])

  useEffect(() => {
    fetchCallbacks()
  }, [fetchCallbacks])


  const exportToCSV = () => {
    const headers = [
      'Customer Name', 'Phone Number', 'Email', 'Sales Agent', 'Sales Team',
      'First Call Date', 'First Call Time', 'Callback Reason', 'Callback Notes',
      'Status', 'Created By', 'Created At', 'Converted to Deal'
    ]

    const csvData = callbacks.map(callback => [
      callback.customerName || '',
      callback.phoneNumber || '',
      callback.email || '',
      callback.salesAgentName || '',
      callback.salesTeam || '',
      callback.firstCallDate || '',
      callback.firstCallTime || '',
      callback.callbackReason || '',
      callback.callbackNotes || '',
      callback.status || '',
      callback.createdBy || '',
      callback.createdAt ? format(new Date(callback.createdAt), 'yyyy-MM-dd HH:mm:ss') : '',
      callback.converted_to_deal ? 'Yes' : 'No'
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `callbacks_export_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary'
      case 'contacted': return 'default'
      case 'completed': return 'default'
      case 'cancelled': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'contacted': return '📞'
      case 'completed': return '✅'
      case 'cancelled': return '❌'
      default: return '❓'
    }
  }

  // Calculate summary statistics from current page data
  const pendingCallbacks = callbacks.filter(cb => cb.status === 'pending').length
  const completedCallbacks = callbacks.filter(cb => cb.status === 'completed').length
  const convertedCallbacks = callbacks.filter(cb => cb.converted_to_deal).length
  const uniqueAgents = new Set(callbacks.map(cb => cb.salesAgentName)).size
  const conversionRate = callbacks.length > 0 ? (convertedCallbacks / callbacks.length) * 100 : 0

  if (paginationState.isLoading && callbacks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading callbacks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Callbacks</h1>
          <p className="text-muted-foreground">
            Comprehensive view of all callbacks from all salesmen
          </p>
          {error && (
            <p className="text-red-500 text-sm mt-1">
              ⚠️ {error}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchCallbacks()} 
            variant="outline" 
            className="gap-2"
            disabled={paginationState.isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${paginationState.isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={exportToCSV} 
            className="gap-2"
            disabled={callbacks.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV ({callbacks.length})
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Callbacks</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCallbacks}</div>
            <p className="text-xs text-muted-foreground">
              Total in system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCallbacks}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting contact
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCallbacks}</div>
            <p className="text-xs text-muted-foreground">
              Successfully contacted
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {convertedCallbacks} converted to deals
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search callbacks..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {user?.role === 'team_leader' ? (
              <div className="h-10 flex items-center px-3 rounded-md border text-sm bg-muted">
                <span className="capitalize">Team: {user?.managedTeam || user?.team || user?.team_name || 'N/A'}</span>
                <Badge variant="secondary" className="ml-2">Locked</Badge>
              </div>
            ) : (
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
            )}
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
                <SelectItem value="first_call_date-desc">Call Date (Latest)</SelectItem>
                <SelectItem value="first_call_date-asc">Call Date (Earliest)</SelectItem>
                <SelectItem value="customer_name-asc">Customer A-Z</SelectItem>
                <SelectItem value="customer_name-desc">Customer Z-A</SelectItem>
                <SelectItem value="sales_agent-asc">Agent A-Z</SelectItem>
                <SelectItem value="sales_agent-desc">Agent Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Callbacks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Callbacks ({callbacks.length})</CardTitle>
          <CardDescription>
            All callbacks from salesmen with complete information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Sales Agent</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Scheduled Call</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Converted</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callbacks.map((cb) => (
                  <TableRow key={cb.id}>
                    <TableCell>
                      <div className="font-medium">{cb.customerName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div>{cb.email}</div>
                        <div className="text-muted-foreground">{cb.phoneNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{cb.salesAgentName}</div>
                      <div className="text-xs text-muted-foreground">
                        by {cb.createdBy}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{cb.salesTeam}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="font-medium">
                          {cb.firstCallDate ? format(new Date(cb.firstCallDate), 'MMM dd, yyyy') : 'N/A'}
                        </div>
                        <div className="text-muted-foreground">{cb.firstCallTime}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs max-w-[150px] truncate" title={cb.callbackReason}>
                        {cb.callbackReason}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(cb.status)} className="gap-1">
                        <span>{getStatusIcon(cb.status)}</span>
                        {cb.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs max-w-[200px] truncate" title={cb.callbackNotes}>
                        {cb.callbackNotes || 'No notes'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cb.converted_to_deal ? (
                        <Badge variant="default" className="gap-1">
                          ✅ Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          ❌ No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {cb.createdAt ? format(new Date(cb.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {!paginationState.isLoading && callbacks.length > 0 && (
            <div className="mt-6">
              <ServerPagination
                currentPage={paginationState.currentPage}
                totalPages={paginationState.totalPages}
                totalItems={paginationState.totalItems}
                itemsPerPage={paginationState.itemsPerPage}
                onPageChange={paginationActions.goToPage}
                onItemsPerPageChange={paginationActions.setItemsPerPage}
                isLoading={paginationState.isLoading}
                className="justify-center"
              />
            </div>
          )}
          
          {callbacks.length === 0 && !paginationState.isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No callbacks found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
