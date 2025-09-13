"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { showSuccess, showError } from "@/lib/sweetalert";
import { Phone, Calendar, Clock, User, MessageSquare, CheckCircle, XCircle, Edit } from "lucide-react";
import { callbacksService } from "@/lib/firebase-callbacks-service";
import { dealsService } from "@/lib/firebase-deals-service";

interface Callback {
  id?: string;
  customer_name: string;
  phone_number: string;
  email: string;
  sales_agent: string;
  sales_team: string;
  first_call_date: string;
  first_call_time: string;
  callback_notes: string;
  callback_reason: string;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  created_by: string;
  created_by_id: string;
  SalesAgentID: string;
  created_at?: any;
  updated_at?: any;
  converted_to_deal?: boolean;
  converted_at?: string;
  converted_by?: string;
}

interface CallbacksManagementProps {
  userRole: string;
  user: any;
}

export function CallbacksManagement({ userRole, user }: CallbacksManagementProps) {
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCallback, setSelectedCallback] = useState<Callback | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Fetch callbacks using Firebase service with real-time updates
  const fetchCallbacks = async () => {
    try {
      setLoading(true);
      const data = await callbacksService.getCallbacks(userRole, user?.id, user?.name);
      setCallbacks(data);
    } catch (error) {
      console.error('Error fetching callbacks:', error);
      showError('Error', 'Failed to load callbacks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Set up real-time listener for callbacks
    const unsubscribe = callbacksService.onCallbacksChange(
      (updatedCallbacks) => {
        setCallbacks(updatedCallbacks);
        setLoading(false);
      },
      userRole,
      user?.id,
      user?.name
    );

    // Initial load
    fetchCallbacks();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userRole, user]);

  // Real-time listener for live updates
  useEffect(() => {
    const unsubscribe = callbacksService.onCallbacksChange(
      (updatedCallbacks) => {
        setCallbacks(updatedCallbacks);
      },
      userRole,
      user?.id,
      user?.name
    );

    return () => unsubscribe();
  }, [userRole, user?.id, user?.name]);

  // Update callback status using Firebase service
  const updateCallbackStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updates: any = {
        status: status as 'pending' | 'contacted' | 'completed' | 'cancelled',
        updated_by: user?.name || 'Unknown'
      };
      
      if (notes) {
        updates.callback_notes = notes;
      }
      
      await callbacksService.updateCallback(id, updates);
      showSuccess('Success', 'Callback updated successfully');
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

  if (loading) {
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
        
        <div className="flex items-center space-x-4">
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
          
          <Button onClick={fetchCallbacks} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Callbacks ({filteredCallbacks.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCallbacks.length === 0 ? (
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
                {filteredCallbacks.map((callback) => (
                  <TableRow key={callback.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{callback.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{callback.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Phone className="h-4 w-4" />
                        <span>{callback.phone_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {formatDateTime(callback.first_call_date, callback.first_call_time)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{callback.sales_agent}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">
                        {callback.callback_reason?.replace('-', ' ') || 'Not specified'}
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
                                <p className="text-sm">{callback.customer_name}</p>
                              </div>
                              <div>
                                <Label>Callback Notes</Label>
                                <p className="text-sm">{callback.callback_notes || 'No notes'}</p>
                              </div>
                              <div>
                                <Label>Created</Label>
                                <p className="text-sm">{new Date(callback.created_at).toLocaleString()}</p>
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
    comment: callback.callback_notes || ''
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

      // Create deal from callback
      const dealData = {
        customer_name: callback.customer_name,
        phone_number: callback.phone_number,
        email: callback.email,
        amount_paid: parseFloat(formData.amount),
        duration_months: getDurationMonths(formData.duration),
        sales_agent: callback.sales_agent,
        closing_agent: user?.name || '',
        sales_team: callback.sales_team,
        product_type: formData.type_program,
        service_tier: formData.type_service,
        signup_date: new Date().toISOString().split('T')[0],
        notes: `Converted from callback. Original notes: ${callback.callback_notes}. ${formData.comment}`,
        status: 'active' as const,
        stage: 'closed-won' as const,
        priority: 'medium' as const,
        SalesAgentID: callback.created_by_id || user?.id || '',
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

      // Create the deal using Firebase service
      await dealsService.createDeal(dealData, user);

      // Update callback status to completed using Firebase service
      await callbacksService.updateCallback(callback.id!, {
        status: 'completed' as const,
        converted_to_deal: true,
        converted_at: new Date().toISOString(),
        converted_by: user?.name || 'Unknown'
      });

      showSuccess('Success', 'Callback converted to deal successfully!');
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
