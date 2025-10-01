"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ServerPagination } from "@/components/ui/server-pagination";
import { useServerPagination } from "@/hooks/useServerPagination";
import { showSuccess, showError, showCallbackAdded, showDealAdded } from "@/lib/sweetalert";
import { Phone, Calendar, Clock, User, MessageSquare, CheckCircle, XCircle, Edit, Search, Loader2 } from "lucide-react";
import { apiService, Callback as APICallback } from "@/lib/api-service";

// View model we will use consistently with camelCase fields
interface Callback {
  id?: string;
  customerName: string;
  phoneNumber: string;
  email: string;
  salesAgentName: string;
  salesTeam: string;
  firstCallDate: string;
  firstCallTime: string;
  callbackNotes: string;
  callbackReason: string;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  createdBy: string;
  createdById: string;
  salesAgentId: string;
  createdAt?: string;
  updatedAt?: string;
  convertedToDeal?: boolean;
  convertedAt?: string;
  convertedBy?: string;
}

interface CallbacksManagementProps {
  userRole: string;
  user: any;
}

export function CallbacksManagement({ userRole, user }: CallbacksManagementProps) {
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [totalCallbacks, setTotalCallbacks] = useState(0);
  const [selectedCallback, setSelectedCallback] = useState<Callback | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Server pagination hook
  const [paginationState, paginationActions] = useServerPagination({
    initialPage: 1,
    initialItemsPerPage: 25,
    onPageChange: (page, itemsPerPage) => {
      fetchCallbacks(page, itemsPerPage, debouncedSearchTerm, filter);
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
  }, [debouncedSearchTerm, filter]);

  // Fetch callbacks with pagination
  const fetchCallbacks = useCallback(async (
    page: number = paginationState.currentPage,
    limit: number = paginationState.itemsPerPage,
    search: string = debouncedSearchTerm,
    statusFilter: string = filter
  ) => {
    try {
      paginationActions.setIsLoading(true);
      
      // Build API parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        userRole,
        userId: user?.id || ''
      });
      
      // Add search if provided
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      // Add status filter if not 'all'
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      // Role-based filtering
      if (userRole === 'salesman') {
        params.append('salesAgentId', user?.id);
      } else if (userRole === 'team_leader' && user?.managedTeam) {
        params.append('salesTeam', user.managedTeam);
      }
      
      // Fetch from API
      const response = await fetch(`/api/callbacks?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch callbacks');
      }
      
      // Normalize to camelCase view model
      const convertedData: Callback[] = (result.callbacks || []).map((cb: any) => ({
        id: cb.id,
        customerName: cb.customerName ?? cb.customer_name ?? '',
        phoneNumber: cb.phoneNumber ?? cb.phone_number ?? '',
        email: cb.email ?? '',
        salesAgentName: cb.salesAgentName ?? cb.sales_agent ?? '',
        salesTeam: cb.salesTeam ?? cb.sales_team ?? '',
        firstCallDate: cb.firstCallDate ?? cb.first_call_date ?? '',
        firstCallTime: cb.firstCallTime ?? cb.first_call_time ?? '',
        callbackNotes: cb.callbackNotes ?? cb.callback_notes ?? '',
        callbackReason: cb.callbackReason ?? cb.callback_reason ?? '',
        status: cb.status,
        createdBy: cb.createdBy ?? cb.created_by ?? '',
        createdById: cb.createdById ?? cb.created_by_id ?? '',
        salesAgentId: cb.salesAgentId ?? cb.SalesAgentID ?? '',
        createdAt: cb.createdAt ?? cb.created_at ?? '',
        updatedAt: cb.updatedAt ?? cb.updated_at ?? '',
        convertedToDeal: cb.converted_to_deal ?? cb.convertedToDeal ?? false,
        convertedAt: cb.converted_at ?? cb.convertedAt ?? undefined,
        convertedBy: cb.converted_by ?? cb.convertedBy ?? undefined,
      }));
      
      setCallbacks(convertedData);
      setTotalCallbacks(result.total || 0);
      paginationActions.setTotalItems(result.total || 0);
      
    } catch (error) {
      console.error('Error fetching callbacks:', error);
      showError('Error', 'Failed to load callbacks');
      setCallbacks([]);
      setTotalCallbacks(0);
      paginationActions.setTotalItems(0);
    } finally {
      paginationActions.setIsLoading(false);
    }
  }, [userRole, user?.id, user?.managedTeam, paginationState.currentPage, paginationState.itemsPerPage, debouncedSearchTerm, filter, paginationActions]);

  useEffect(() => {
    if (!user) return;
    fetchCallbacks();
  }, [fetchCallbacks]);


  // Update callback status using API service
  const updateCallbackStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updates: any = {
        status: status as 'pending' | 'contacted' | 'completed' | 'cancelled'
      };
      
      if (notes) {
        updates.callbackNotes = notes;
      }
      
      await apiService.updateCallback(id, updates);
      await showCallbackAdded(
        callbacks.find(c => c.id === id)?.customerName || 'Customer',
        new Date().toLocaleDateString(),
        'Callback updated successfully!'
      );
      fetchCallbacks();
    } catch (error) {
      console.error('Error updating callback:', error);
      showError('Error', 'Failed to update callback');
    }
  };

  // Convert callback to deal
  const convertToDeal = (callback: Callback) => {
    setSelectedCallback(callback);
    setIsConvertDialogOpen(true);
  };

  // Filter callbacks
  const filteredCallbacks = callbacks.filter(callback => {
    if (filter === 'all') return true;
    return callback.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      contacted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDateTime = (date: string, time: string) => {
    try {
      const dateObj = new Date(`${date}T${time}`);
      return dateObj.toLocaleString();
    } catch {
      return `${date} ${time}`;
    }
  };

  if (paginationState.isLoading && callbacks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Callbacks Management
          </h2>
          <p className="text-muted-foreground">
            Manage customer callbacks and follow-ups
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search callbacks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Status Filter */}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Callbacks</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Refresh Button */}
          <Button 
            onClick={() => fetchCallbacks()} 
            variant="outline"
            disabled={paginationState.isLoading}
          >
            {paginationState.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Callbacks ({totalCallbacks.toLocaleString()})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paginationState.isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading callbacks...</p>
            </div>
          ) : callbacks.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No callbacks found</h3>
              <p className="text-muted-foreground">
                {filter === 'all' ? 'No callbacks have been scheduled yet.' : `No ${filter} callbacks found.`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Sales Agent</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callbacks.map((callback) => (
                  <TableRow key={callback.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{callback.customerName}</div>
                        <div className="text-sm text-muted-foreground">{callback.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Phone className="h-4 w-4" />
                        <span>{callback.phoneNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {formatDateTime(callback.firstCallDate, callback.firstCallTime)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{callback.salesAgentName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">
                        {callback.callbackReason?.replace('-', ' ') || 'Not specified'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(callback.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {callback.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => callback.id && updateCallbackStatus(callback.id, 'contacted')}
                            >
                              Mark Contacted
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => convertToDeal(callback)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Convert to Deal
                            </Button>
                          </>
                        )}
                        {callback.status === 'contacted' && (
                          <Button
                            size="sm"
                            onClick={() => convertToDeal(callback)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Convert to Deal
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Callback Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Customer</Label>
                                <p className="text-sm">{callback.customerName}</p>
                              </div>
                              <div>
                                <Label>Callback Notes</Label>
                                <p className="text-sm">{callback.callbackNotes || 'No notes'}</p>
                              </div>
                              <div>
                                <Label>Created</Label>
                                <p className="text-sm">{callback.createdAt ? new Date(callback.createdAt).toLocaleString() : 'N/A'}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
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
        </CardContent>
      </Card>

      {/* Convert to Deal Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Convert Callback to Deal</DialogTitle>
          </DialogHeader>
          {selectedCallback && (
            <ConvertToDealForm 
              callback={selectedCallback}
              user={user}
              onSuccess={() => {
                setIsConvertDialogOpen(false);
                fetchCallbacks();
              }}
              onCancel={() => setIsConvertDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Convert to Deal Form Component
function ConvertToDealForm({ 
  callback, 
  user, 
  onSuccess, 
  onCancel 
}: { 
  callback: Callback; 
  user: any; 
  onSuccess: () => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    amount: '',
    username: '',
    duration: 'TWO YEAR',
    type_program: 'IBO PLAYER',
    type_service: 'SILVER',
    invoice: '',
    device_id: '',
    device_key: '',
    no_user: '1',
    comment: callback.callbackNotes || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.amount || !formData.username) {
        showError('Missing Information', 'Please fill in Amount and Username');
        setLoading(false);
        return;
      }

      // Convert duration to months
      const getDurationMonths = (duration: string) => {
        switch (duration.toUpperCase()) {
          case 'YEAR': return 12;
          case 'TWO YEAR': return 24;
          case '2Y+6M': return 30;
          case '2Y+5M': return 29;
          case '2Y+4M': return 28;
          case '2Y+3M': return 27;
          case '2Y+2M': return 26;
          case '2Y+1M': return 25;
          default: return 12;
        }
      };

      // Create deal from callback (snake_case for backend mapping)
      const dealData = {
        customer_name: callback.customerName,
        phone_number: callback.phoneNumber,
        email: callback.email,
        amount_paid: parseFloat(formData.amount),
        duration_months: getDurationMonths(formData.duration),
        sales_agent: callback.salesAgentName,
        closing_agent: user?.name || '',
        sales_team: callback.salesTeam,
        product_type: formData.type_program,
        service_tier: formData.type_service,
        signup_date: new Date().toISOString().split('T')[0],
        notes: `Converted from callback. Original notes: ${callback.callbackNotes}. ${formData.comment}`,
        status: 'active' as const,
        stage: 'closed-won' as const,
        priority: 'medium' as const,
        SalesAgentID: callback.createdById || user?.id || '',
        ClosingAgentID: user?.id || '',
        created_by: user?.name || 'Unknown',
        created_by_id: user?.id || '',
        username: formData.username,
        invoice: formData.invoice,
        device_id: formData.device_id,
        device_key: formData.device_key,
        no_user: parseInt(formData.no_user) || 1,
        converted_from_callback: callback.id
      };

      // Create the deal using API service (MySQL)
      await apiService.createDeal(dealData);

      // Update callback status to completed using API service (MySQL)
      await apiService.updateCallback(callback.id!, {
        status: 'completed' as const,
        converted_to_deal: true,
        converted_at: new Date().toISOString(),
        converted_by: user?.name || 'Unknown'
      });

      await showDealAdded(
        parseFloat(formData.amount),
        callback.customerName || 'Customer',
        'Callback converted to deal successfully!'
      );
      onSuccess();
    } catch (error) {
      console.error('Error converting callback to deal:', error);
      showError('Error', 'Failed to convert callback to deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount ($) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Select value={formData.duration} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="YEAR">1 Year</SelectItem>
              <SelectItem value="TWO YEAR">2 Years</SelectItem>
              <SelectItem value="2Y+6M">2Y + 6M</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="type_service">Service Type</Label>
          <Select value={formData.type_service} onValueChange={(value) => setFormData(prev => ({ ...prev, type_service: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GOLD">Gold</SelectItem>
              <SelectItem value="PREMIUM">Premium</SelectItem>
              <SelectItem value="SILVER">Silver</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="comment">Additional Notes</Label>
        <Textarea
          id="comment"
          value={formData.comment}
          onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
          rows={3}
        />
      </div>
      
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Converting...' : 'Convert to Deal'}
        </Button>
      </div>
    </form>
  );
}
