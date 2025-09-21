"use client"

import React, { useState, useEffect } from 'react'
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

  useEffect(() => {
    filterAndSortCallbacks()
  }, [callbacks, searchTerm, statusFilter, teamFilter, sortBy, sortOrder])

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
    let filtered = [...callbacks]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(callback =>
        callback.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        callback.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        callback.phone_number.includes(searchTerm) ||
        callback.sales_agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
        callback.callback_reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        callback.callback_notes.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(callback => callback.status === statusFilter)
    }

    // Apply team filter
    if (teamFilter !== 'all') {
      filtered = filtered.filter(callback => callback.sales_team === teamFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Callback]
      let bValue: any = b[sortBy as keyof Callback]

      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'first_call_date') {
        if (sortBy === 'created_at') {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        } else {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        }
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
  const convertedCallbacks = filteredCallbacks.filter(cb => cb.converted_to_deal).length
  const uniqueAgents = new Set(filteredCallbacks.map(cb => cb.sales_agent)).size
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
              {callbacks.length} total in database
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
                {filteredCallbacks.map((callback) => (
                  <TableRow key={callback.id}>
                    <TableCell>
                      <div className="font-medium">{callback.customer_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div>{callback.email}</div>
                        <div className="text-muted-foreground">{callback.phone_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{callback.sales_agent}</div>
                      <div className="text-xs text-muted-foreground">
                        by {callback.created_by}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{callback.sales_team}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="font-medium">
                          {format(new Date(callback.first_call_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-muted-foreground">{callback.first_call_time}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs max-w-[150px] truncate" title={callback.callback_reason}>
                        {callback.callback_reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(callback.status)} className="gap-1">
                        <span>{getStatusIcon(callback.status)}</span>
                        {callback.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs max-w-[200px] truncate" title={callback.callback_notes}>
                        {callback.callback_notes || 'No notes'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {callback.converted_to_deal ? (
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
                      {callback.created_at ? format(new Date(callback.created_at), 'MMM dd, yyyy') : 'N/A'}
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
