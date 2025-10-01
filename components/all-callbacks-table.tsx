"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Download, Filter, Phone, Calendar, Users, Clock, RefreshCw, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface Callback {
  id: string
  customerName?: string
  customer_name?: string
  phoneNumber?: string
  phone_number?: string
  email?: string
  salesAgentName?: string
  sales_agent_name?: string
  salesTeam?: string
  sales_team?: string
  firstCallDate?: string
  first_call_date?: string
  firstCallTime?: string
  first_call_time?: string
  callbackReason?: string
  callback_reason?: string
  callbackNotes?: string
  callback_notes?: string
  status?: string
  createdBy?: string
  created_by?: string
  createdAt?: string
  created_at?: string
  convertedToDeal?: boolean
  converted_to_deal?: boolean
}

export default function AllCallbacksTable() {
  const [callbacks, setCallbacks] = useState<Callback[]>([])
  const [filteredCallbacks, setFilteredCallbacks] = useState<Callback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchCallbacks()
  }, [])

  // Normalize all callbacks to a consistent camelCase view model
  const normalizedCallbacks = useMemo(() => {
    return callbacks.map((cb: any) => ({
      id: cb.id,
      customerName: cb.customerName ?? cb.customer_name ?? '',
      phoneNumber: cb.phoneNumber ?? cb.phone_number ?? '',
      email: cb.email ?? '',
      salesAgentName: cb.salesAgentName ?? cb.sales_agent_name ?? cb.sales_agent ?? '',
      salesTeam: cb.salesTeam ?? cb.sales_team ?? '',
      firstCallDate: cb.firstCallDate ?? cb.first_call_date ?? '',
      firstCallTime: cb.firstCallTime ?? cb.first_call_time ?? '',
      callbackReason: cb.callbackReason ?? cb.callback_reason ?? '',
      callbackNotes: cb.callbackNotes ?? cb.callback_notes ?? '',
      status: cb.status ?? 'pending',
      createdBy: cb.createdBy ?? cb.created_by ?? '',
      createdAt: cb.createdAt ?? cb.created_at ?? '',
      convertedToDeal: cb.converted_to_deal ?? cb.convertedToDeal ?? false,
    }))
  }, [callbacks])

  useEffect(() => {
    filterAndSortCallbacks()
  }, [normalizedCallbacks, searchTerm, statusFilter, teamFilter, sortBy, sortOrder])

  const fetchCallbacks = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Fetching all callbacks from API...')
      
      // Fetch all callbacks using the Next.js API route
      const response = await fetch('/api/callbacks?limit=1000')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('✅ Callbacks API response:', result)
      
      if (result.success && Array.isArray(result.callbacks)) {
        setCallbacks(result.callbacks)
        console.log(`📊 Loaded ${result.callbacks.length} callbacks`)
      } else {
        console.warn('⚠️ Invalid callbacks response:', result)
        setCallbacks([])
        setError('Invalid response format from server')
      }
    } catch (error) {
      console.error('❌ Error fetching callbacks:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch callbacks')
      setCallbacks([])
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortCallbacks = () => {
    let filtered = [...normalizedCallbacks]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(cb =>
        (cb.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cb.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cb.phoneNumber || '').includes(searchTerm) ||
        (cb.salesAgentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cb.callbackReason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cb.callbackNotes || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(cb => cb.status === statusFilter)
    }

    // Apply team filter
    if (teamFilter !== 'all') {
      filtered = filtered.filter(cb => cb.salesTeam === teamFilter)
    }

    // Apply sorting
    filtered.sort((a: any, b: any) => {
      let aValue: any
      let bValue: any

      // map sortBy to normalized keys
      const mapField = (field: string) => {
        switch (field) {
          case 'created_at': return 'createdAt'
          case 'first_call_date': return 'firstCallDate'
          case 'customer_name': return 'customerName'
          case 'sales_agent': return 'salesAgentName'
          default: return field
        }
      }

      const key = mapField(sortBy)
      aValue = a[key]
      bValue = b[key]

      if (key === 'createdAt' || key === 'firstCallDate') {
        aValue = new Date(aValue || 0).getTime()
        bValue = new Date(bValue || 0).getTime()
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = (bValue || '').toLowerCase()
      }
      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1)
    })

    setFilteredCallbacks(filtered)
  }

  const exportToCSV = () => {
    if (filteredCallbacks.length === 0) return

    const headers = [
      'Customer Name', 'Phone Number', 'Email', 'Sales Agent', 'Sales Team',
      'First Call Date', 'First Call Time', 'Callback Reason', 'Callback Notes',
      'Status', 'Created By', 'Created At', 'Converted to Deal'
    ]

    const csvData = filteredCallbacks.map(callback => [
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
      callback.convertedToDeal ? 'Yes' : 'No'
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `all_callbacks_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`)
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

  // Calculate summary statistics
  const totalCallbacks = filteredCallbacks.length
  const pendingCallbacks = filteredCallbacks.filter(cb => cb.status === 'pending').length
  const completedCallbacks = filteredCallbacks.filter(cb => cb.status === 'completed').length
  const convertedCallbacks = filteredCallbacks.filter(cb => cb.convertedToDeal).length
  const uniqueAgents = new Set(filteredCallbacks.map(cb => cb.salesAgentName)).size
  const conversionRate = totalCallbacks > 0 ? (convertedCallbacks / totalCallbacks) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading all callbacks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Callbacks Table</h1>
          <p className="text-muted-foreground">
            Complete view of all callbacks from all salesmen ({normalizedCallbacks.length} total)
          </p>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchCallbacks} 
            variant="outline" 
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={exportToCSV} 
            className="gap-2"
            disabled={filteredCallbacks.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV ({filteredCallbacks.length})
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
              {normalizedCallbacks.length} total in database
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
          <CardTitle>Callbacks ({filteredCallbacks.length})</CardTitle>
          <CardDescription>
            All callbacks from salesmen with complete information and export functionality
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
                {filteredCallbacks.map((cb) => (
                  <TableRow key={cb.id}>
                    <TableCell>
                      <div className="font-medium">{cb.customerName || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div>{cb.email || 'N/A'}</div>
                        <div className="text-muted-foreground">{cb.phoneNumber || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{cb.salesAgentName || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">
                        by {cb.createdBy || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{cb.salesTeam || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="font-medium">
                          {cb.firstCallDate ? format(new Date(cb.firstCallDate), 'MMM dd, yyyy') : 'N/A'}
                        </div>
                        <div className="text-muted-foreground">{cb.firstCallTime || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs max-w-[150px] truncate" title={cb.callbackReason}>
                        {cb.callbackReason || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(cb.status || 'pending')} className="gap-1">
                        <span>{getStatusIcon(cb.status || 'pending')}</span>
                        {cb.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs max-w-[200px] truncate" title={cb.callbackNotes}>
                        {cb.callbackNotes || 'No notes'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cb.convertedToDeal ? (
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
          {filteredCallbacks.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {error ? 'Failed to load callbacks. Please try refreshing.' : 'No callbacks found matching your criteria.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
