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
import { CalendarIcon, Search, Filter, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Deal {
  id: string;
  customer_name: string;
  email: string;
  phone_number: string;
  amount_paid: number;
  status: string;
  sales_agent: string;
  sales_team: string;
  created_at: string;
  signup_date: string;
  end_date: string;
  service_tier: string;
  country: string;
  priority: string;
  stage: string;
  duration_months: number;
  notes: string;
}

interface DealStats {
  total_deals: number;
  total_revenue: number;
  avg_deal_value: number;
  active_deals: number;
  closed_deals: number;
  today_deals: number;
}

interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export default function ManagerDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState<DealStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    sales_agent: '',
    date_from: '',
    date_to: '',
    month: '',
    amount_min: '',
    amount_max: '',
    page: 1,
    limit: 25
  });

  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const data = await managerApiService.getDealsWithPagination(filters);
      
      if (data.success) {
        setDeals(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await managerApiService.getDealStats(filters);
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchDeals();
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

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      sales_agent: '',
      date_from: '',
      date_to: '',
      month: '',
      amount_min: '',
      amount_max: '',
      page: 1,
      limit: 25
    });
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed-won': return 'bg-blue-100 text-blue-800';
      case 'closed-lost': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Deals Management</h1>
          <p className="text-gray-600">Manage and monitor all deals</p>
        </div>
        <Button className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total_deals}</div>
              <div className="text-sm text-gray-600">Total Deals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.total_revenue)}
              </div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.avg_deal_value)}
              </div>
              <div className="text-sm text-gray-600">Avg Deal Value</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.active_deals}</div>
              <div className="text-sm text-gray-600">Active Deals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.closed_deals}</div>
              <div className="text-sm text-gray-600">Closed Deals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.today_deals}</div>
              <div className="text-sm text-gray-600">Today's Deals</div>
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
                placeholder="Search deals..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed-won">Closed Won</SelectItem>
                <SelectItem value="closed-lost">Closed Lost</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
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
                  {dateFrom ? format(dateFrom, "PPP") : "Date From"}
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
                  {dateTo ? format(dateTo, "PPP") : "Date To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={handleDateToChange} initialFocus />
              </PopoverContent>
            </Popover>

            <Input
              type="number"
              placeholder="Min Amount"
              value={filters.amount_min}
              onChange={(e) => handleFilterChange('amount_min', e.target.value)}
            />

            <Input
              type="number"
              placeholder="Max Amount"
              value={filters.amount_max}
              onChange={(e) => handleFilterChange('amount_max', e.target.value)}
            />

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deals ({pagination?.total || 0})</CardTitle>
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
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Agent</th>
                      <th className="text-left p-2">Created</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((deal) => (
                      <tr key={deal.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{deal.customer_name}</div>
                            <div className="text-sm text-gray-600">{deal.country}</div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            <div>{deal.email}</div>
                            <div className="text-gray-600">{deal.phone_number}</div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="font-medium">{formatCurrency(deal.amount_paid)}</div>
                          <div className="text-sm text-gray-600">{deal.service_tier}</div>
                        </td>
                        <td className="p-2">
                          <Badge className={getStatusBadgeColor(deal.status)}>
                            {deal.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{deal.sales_agent}</div>
                            <div className="text-sm text-gray-600">{deal.sales_team}</div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            {formatDate(deal.created_at)}
                          </div>
                        </td>
                        <td className="p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDeal(deal)}
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

      {/* Deal Details Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Deal Details</h2>
              <Button variant="outline" onClick={() => setSelectedDeal(null)}>
                Close
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-medium">Customer Name:</label>
                <p>{selectedDeal.customer_name}</p>
              </div>
              <div>
                <label className="font-medium">Email:</label>
                <p>{selectedDeal.email}</p>
              </div>
              <div>
                <label className="font-medium">Phone:</label>
                <p>{selectedDeal.phone_number}</p>
              </div>
              <div>
                <label className="font-medium">Amount:</label>
                <p>{formatCurrency(selectedDeal.amount_paid)}</p>
              </div>
              <div>
                <label className="font-medium">Status:</label>
                <Badge className={getStatusBadgeColor(selectedDeal.status)}>
                  {selectedDeal.status}
                </Badge>
              </div>
              <div>
                <label className="font-medium">Sales Agent:</label>
                <p>{selectedDeal.sales_agent}</p>
              </div>
              <div>
                <label className="font-medium">Sales Team:</label>
                <p>{selectedDeal.sales_team}</p>
              </div>
              <div>
                <label className="font-medium">Service Tier:</label>
                <p>{selectedDeal.service_tier}</p>
              </div>
              <div>
                <label className="font-medium">Country:</label>
                <p>{selectedDeal.country}</p>
              </div>
              <div>
                <label className="font-medium">Duration:</label>
                <p>{selectedDeal.duration_months} months</p>
              </div>
              <div>
                <label className="font-medium">Created:</label>
                <p>{formatDate(selectedDeal.created_at)}</p>
              </div>
              <div>
                <label className="font-medium">Signup Date:</label>
                <p>{formatDate(selectedDeal.signup_date)}</p>
              </div>
              {selectedDeal.end_date && (
                <div>
                  <label className="font-medium">End Date:</label>
                  <p>{formatDate(selectedDeal.end_date)}</p>
                </div>
              )}
              {selectedDeal.notes && (
                <div className="md:col-span-2">
                  <label className="font-medium">Notes:</label>
                  <p>{selectedDeal.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
