'use client';

import React, { useState, useEffect } from 'react';
import { managerApiService } from '@/lib/api-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, Filter, Download, Eye, ChevronLeft, ChevronRight, Phone, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Callback {
  id: string;
  customer_name: string;
  email: string;
  phone_number: string;
  status: string;
  sales_agent: string;
  sales_team: string;
  created_at: string;
  first_call_date: string;
  first_call_time: string;
  scheduled_date: string;
  scheduled_time: string;
  priority: string;
  callback_reason: string;
  callback_notes: string;
  follow_up_required: boolean;
  SalesAgentID: string;
  created_by: string;
  updated_at: string;
}

interface CallbackStats {
  total_callbacks: number;
  pending_callbacks: number;
  contacted_callbacks: number;
  completed_callbacks: number;
  today_callbacks: number;
  scheduled_today: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
}

interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export default function ManagerCallbacksPage() {
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [stats, setStats] = useState<CallbackStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCallback, setSelectedCallback] = useState<Callback | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    sales_agent: '',
    priority: '',
    date_from: '',
    date_to: '',
    month: '',
    scheduled_from: '',
    scheduled_to: '',
    page: 1,
    limit: 25
  });

  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [scheduledFrom, setScheduledFrom] = useState<Date>();
  const [scheduledTo, setScheduledTo] = useState<Date>();

  const fetchCallbacks = async () => {
    setLoading(true);
    try {
      const data = await managerApiService.getCallbacksWithPagination(filters);
      
      if (data.success) {
        setCallbacks(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching callbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await managerApiService.getCallbackStats(filters);
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateCallbackStatus = async (callbackId: string, newStatus: string) => {
    setUpdatingStatus(callbackId);
    try {
      const data = await managerApiService.updateCallbackStatus(callbackId, newStatus);
      
      if (data.success) {
        // Update the callback in the local state
        setCallbacks(prev => prev.map(callback => 
          callback.id === callbackId 
            ? { ...callback, status: newStatus, updated_at: new Date().toISOString() }
            : callback
        ));
        
        // Refresh stats
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating callback status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  useEffect(() => {
    fetchCallbacks();
    fetchStats();
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    setFilters(prev => ({ 
      ...prev, 
      date_from: date ? format(date, 'yyyy-MM-dd') : '',
      page: 1 
    }));
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    setFilters(prev => ({ 
      ...prev, 
      date_to: date ? format(date, 'yyyy-MM-dd') : '',
      page: 1 
    }));
  };

  const handleScheduledFromChange = (date: Date | undefined) => {
    setScheduledFrom(date);
    setFilters(prev => ({ 
      ...prev, 
      scheduled_from: date ? format(date, 'yyyy-MM-dd') : '',
      page: 1 
    }));
  };

  const handleScheduledToChange = (date: Date | undefined) => {
    setScheduledTo(date);
    setFilters(prev => ({ 
      ...prev, 
      scheduled_to: date ? format(date, 'yyyy-MM-dd') : '',
      page: 1 
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      sales_agent: '',
      priority: '',
      date_from: '',
      date_to: '',
      month: '',
      scheduled_from: '',
      scheduled_to: '',
      page: 1,
      limit: 25
    });
    setDateFrom(undefined);
    setDateTo(undefined);
    setScheduledFrom(undefined);
    setScheduledTo(undefined);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    if (!dateString) return 'N/A';
    const date = formatDate(dateString);
    return timeString ? `${date} at ${timeString}` : date;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Callbacks Management</h1>
          <p className="text-gray-600">Manage and monitor all callbacks</p>
        </div>
        <Button className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total_callbacks}</div>
              <div className="text-sm text-gray-600">Total Callbacks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_callbacks}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.contacted_callbacks}</div>
              <div className="text-sm text-gray-600">Contacted</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.completed_callbacks}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.today_callbacks}</div>
              <div className="text-sm text-gray-600">Today's Callbacks</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Priority Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.high_priority}</div>
              <div className="text-sm text-gray-600">High Priority</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.medium_priority}</div>
              <div className="text-sm text-gray-600">Medium Priority</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.low_priority}</div>
              <div className="text-sm text-gray-600">Low Priority</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.scheduled_today}</div>
              <div className="text-sm text-gray-600">Scheduled Today</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search callbacks..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Sales Agent"
              value={filters.sales_agent}
              onChange={(e) => handleFilterChange('sales_agent', e.target.value)}
            />

            <Input
              type="month"
              placeholder="Month"
              value={filters.month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "Created From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={handleDateFromChange} initialFocus />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "Created To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={handleDateToChange} initialFocus />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !scheduledFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledFrom ? format(scheduledFrom, "PPP") : "Scheduled From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={scheduledFrom} onSelect={handleScheduledFromChange} initialFocus />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !scheduledTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledTo ? format(scheduledTo, "PPP") : "Scheduled To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={scheduledTo} onSelect={handleScheduledToChange} initialFocus />
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Callbacks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Callbacks ({pagination?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Customer</th>
                      <th className="text-left p-2">Contact</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Priority</th>
                      <th className="text-left p-2">Agent</th>
                      <th className="text-left p-2">Scheduled</th>
                      <th className="text-left p-2">Created</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callbacks.map((callback) => (
                      <tr key={callback.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{callback.customer_name}</div>
                            {callback.callback_reason && (
                              <div className="text-sm text-gray-600">{callback.callback_reason}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {callback.phone_number}
                            </div>
                            {callback.email && (
                              <div className="text-gray-600">{callback.email}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <Select
                            value={callback.status}
                            onValueChange={(value) => updateCallbackStatus(callback.id, value)}
                            disabled={updatingStatus === callback.id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue>
                                <Badge className={getStatusBadgeColor(callback.status)}>
                                  {callback.status}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Badge className={getPriorityBadgeColor(callback.priority)}>
                            {callback.priority}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {callback.sales_agent}
                            </div>
                            <div className="text-sm text-gray-600">{callback.sales_team}</div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(callback.scheduled_date, callback.scheduled_time)}
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            {formatDate(callback.created_at)}
                          </div>
                        </td>
                        <td className="p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCallback(callback)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                    {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={!pagination.has_prev}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.current_page} of {pagination.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={!pagination.has_next}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Callback Details Modal */}
      {selectedCallback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Callback Details</h2>
              <Button variant="outline" onClick={() => setSelectedCallback(null)}>
                Close
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-medium">Customer Name:</label>
                <p>{selectedCallback.customer_name}</p>
              </div>
              <div>
                <label className="font-medium">Phone Number:</label>
                <p>{selectedCallback.phone_number}</p>
              </div>
              <div>
                <label className="font-medium">Email:</label>
                <p>{selectedCallback.email || 'N/A'}</p>
              </div>
              <div>
                <label className="font-medium">Status:</label>
                <Badge className={getStatusBadgeColor(selectedCallback.status)}>
                  {selectedCallback.status}
                </Badge>
              </div>
              <div>
                <label className="font-medium">Priority:</label>
                <Badge className={getPriorityBadgeColor(selectedCallback.priority)}>
                  {selectedCallback.priority}
                </Badge>
              </div>
              <div>
                <label className="font-medium">Sales Agent:</label>
                <p>{selectedCallback.sales_agent}</p>
              </div>
              <div>
                <label className="font-medium">Sales Team:</label>
                <p>{selectedCallback.sales_team}</p>
              </div>
              <div>
                <label className="font-medium">Created By:</label>
                <p>{selectedCallback.created_by}</p>
              </div>
              <div>
                <label className="font-medium">First Call Date:</label>
                <p>{formatDateTime(selectedCallback.first_call_date, selectedCallback.first_call_time)}</p>
              </div>
              <div>
                <label className="font-medium">Scheduled Date:</label>
                <p>{formatDateTime(selectedCallback.scheduled_date, selectedCallback.scheduled_time)}</p>
              </div>
              <div>
                <label className="font-medium">Created:</label>
                <p>{formatDate(selectedCallback.created_at)}</p>
              </div>
              <div>
                <label className="font-medium">Last Updated:</label>
                <p>{formatDate(selectedCallback.updated_at)}</p>
              </div>
              {selectedCallback.callback_reason && (
                <div className="md:col-span-2">
                  <label className="font-medium">Callback Reason:</label>
                  <p>{selectedCallback.callback_reason}</p>
                </div>
              )}
              {selectedCallback.callback_notes && (
                <div className="md:col-span-2">
                  <label className="font-medium">Notes:</label>
                  <p>{selectedCallback.callback_notes}</p>
                </div>
              )}
              <div>
                <label className="font-medium">Follow-up Required:</label>
                <p>{selectedCallback.follow_up_required ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
