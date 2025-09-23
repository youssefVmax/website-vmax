"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { apiService, Callback } from '@/lib/api-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Download, Filter, Phone, Calendar, Users, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function CallbacksTablePage() {
  const [callbacks, setCallbacks] = useState<Callback[]>([])
  const [filteredCallbacks, setFilteredCallbacks] = useState<Callback[]>([])
  const [loading, setLoading] = useState(true)
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
      salesAgentName: cb.salesAgentName ?? cb.sales_agent ?? '',
      salesTeam: cb.salesTeam ?? cb.sales_team ?? '',
      firstCallDate: cb.firstCallDate ?? cb.first_call_date ?? '',
      firstCallTime: cb.firstCallTime ?? cb.first_call_time ?? '',
      callbackReason: cb.callbackReason ?? cb.callback_reason ?? '',
      callbackNotes: cb.callbackNotes ?? cb.callback_notes ?? '',
      status: cb.status,
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
      const data = await apiService.getCallbacks()
      setCallbacks(data)
    } catch (error) {
      console.error('Error fetching callbacks:', error)
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
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1)
    })

    setFilteredCallbacks(filtered)
  }

  const exportToCSV = () => {
    const headers = [
      'Customer Name', 'Phone Number', 'Email', 'Sales Agent', 'Sales Team',
      'First Call Date', 'First Call Time', 'Callback Reason', 'Callback Notes',
      'Status', 'Created By', 'Created At', 'Converted to Deal'
    ]

    const csvData = filteredCallbacks.map(callback => [
      callback.customer_name,
      callback.phone_number,
      callback.email,
      callback.sales_agent,
      callback.sales_team,
      callback.first_call_date,
      callback.first_call_time,
      callback.callback_reason,
      callback.callback_notes,
      callback.status,
      callback.created_by,
      callback.created_at ? format(new Date(callback.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
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
        </div>
        <Button onClick={exportToCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
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
                {filteredCallbacks.map((cb) => (
                  <TableRow key={cb.id}>
                    <TableCell>
                      <div className="font-medium">{callback.customer_name}</div>
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
          {filteredCallbacks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No callbacks found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
