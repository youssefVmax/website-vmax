"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ServerPagination } from "@/components/ui/server-pagination";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Phone, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Save,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { callbacksService } from "@/lib/mysql-callbacks-service";
import { ManagerApiService } from "@/lib/api-service";

interface CallbackRow {
  id: string;
  customer_name: string;
  phone_number: string;
  email: string;
  sales_agent: string;
  sales_team: string;
  first_call_date: string;
  first_call_time: string;
  callback_notes?: string;
  callback_reason?: string;
  status: "pending" | "contacted" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high";
  scheduled_date?: string;
  scheduled_time?: string;
  last_contact_date?: string;
  next_follow_up?: string;
  created_by: string;
  created_by_id: string;
  SalesAgentID: string;
  created_at?: any;
  updated_at?: any;
}

const statusColors: Record<CallbackRow["status"], string> = {
  pending: "bg-yellow-500",
  contacted: "bg-blue-600",
  completed: "bg-green-600",
  cancelled: "bg-gray-600",
};

const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export default function ManageCallbacksPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([]);
  const [editingCallback, setEditingCallback] = useState<CallbackRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<CallbackRow>>({});

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CallbackRow["status"]>("all");
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [historyForPhone, setHistoryForPhone] = useState<string | null>(null)

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  })

  const managerApiService = new ManagerApiService()

  // Calculate effective limit based on user role
  const effectiveLimit = user?.role === 'team_leader' ? 1000 :  // Load up to 1000 callbacks for team leaders
                        user?.role === 'manager' ? 5000 :       // Load up to 5000 callbacks for managers
                        user?.role === 'salesman' ? 1000 :       // Load up to 1000 callbacks for salesmen
                        (pagination?.limit || 25);             // Default for others

  // Derived analytics for manager view (read-only insights)
  const phoneStats = useMemo(() => {
    const map = new Map<string, { count: number; lastUpdatedAt?: Date; agents: Set<string>; dates: Date[] }>()
    const safeCallbacks = Array.isArray(callbacks) ? callbacks : [];
    safeCallbacks.forEach((c) => {
      const key = c.phone_number || 'unknown'
      if (!map.has(key)) map.set(key, { count: 0, agents: new Set<string>(), dates: [] })
      const rec = map.get(key)!
      rec.count += 1
      if (c.updated_at) {
        const dt = new Date(c.updated_at as any)
        rec.lastUpdatedAt = !rec.lastUpdatedAt || dt > rec.lastUpdatedAt ? dt : rec.lastUpdatedAt
        rec.dates.push(dt)
      }
      if (c.sales_agent) rec.agents.add(c.sales_agent)
    })
    return map
  }, [callbacks])

  const updatesByAgent = useMemo(() => {
    const map = new Map<string, number>()
    const safeCallbacks = Array.isArray(callbacks) ? callbacks : [];
    safeCallbacks.forEach((c) => {
      const updater = (c as any).updated_by || c.sales_agent || 'Unknown'
      map.set(updater, (map.get(updater) || 0) + 1)
    })
    return map
  }, [callbacks])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load callbacks with pagination (for team leaders, load all on first page)
  const loadCallbacks = async (page: number) => {
    
    try {
      setLoading(true);
      
      const params: any = {
        page: user?.role === 'team_leader' ? 1 : page,  // Always load page 1 for team leaders
        limit: effectiveLimit,
        search: debouncedSearch.trim(),
        status: statusFilter === 'all' ? '' : statusFilter,
        // CRITICAL: provide role context so API applies correct filtering
        userRole: user?.role || '',
        userId: user?.id || '',
      };

      // Optional hints for some views (backend primarily uses userRole/userId)
      if (user?.role === 'team_leader' && (user as any)?.managedTeam) {
        params.team = (user as any).managedTeam;
        params.managedTeam = (user as any).managedTeam;
      }

      // Add additional filters
      if (agentFilter !== 'all') {
        params.agent = agentFilter;
      }

      const response = await managerApiService.getCallbacksWithPagination(params);
      
      // The direct service may return either:
      // 1) an object: { callbacks, total, page, limit, success, ... }
      // 2) an array of callbacks (no pagination metadata)
      const callbacksData: CallbackRow[] = Array.isArray(response)
        ? response
        : (response?.callbacks ?? []);

      // Derive safe pagination info
      const pageFromApi = !Array.isArray(response) ? (response?.page ?? params.page ?? 1) : (params.page ?? 1);
      const limitFromApi = !Array.isArray(response) ? (response?.limit ?? params.limit ?? 25) : (params.limit ?? 25);
      const totalFromApi = !Array.isArray(response) ? (response?.total ?? callbacksData.length) : callbacksData.length;
      const totalPagesFromApi = Math.max(1, Math.ceil(totalFromApi / Math.max(1, limitFromApi)));

      setCallbacks(callbacksData);
      setPagination({
        page: pageFromApi,
        limit: limitFromApi,
        total: totalFromApi,
        totalPages: totalPagesFromApi,
      });
    } catch (error) {
      console.error('Error loading callbacks:', error);
      toast({
        title: "Error",
        description: "Failed to load callbacks",
        variant: "destructive",
      });
      setCallbacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCallbacks(1);
    }
  }, [user]);

  // Reload when filters or debounced search change
  useEffect(() => {
    if (user) {
      loadCallbacks(1);
    }
  }, [debouncedSearch, statusFilter, agentFilter, user]);

  // Reset to first page when filters change
  const resetToFirstPage = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Pagination Controls Component (only show for non-team leaders)
  const PaginationControls = () => {
    // Don't show pagination for team leaders since they load all callbacks on one page
    if (user?.role === 'team_leader') {
      return (
        <div className="flex items-center justify-center px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing all {pagination.total} callbacks for your team
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCallbacks(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCallbacks(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const updateStatus = async (row: CallbackRow, next: "pending" | "contacted" | "completed" | "cancelled") => {
    try {
      // Pass user context for role-based permissions
      const userContext = {
        userRole: user?.role,
        userId: user?.id,
        managedTeam: user?.managedTeam
      };

      await callbacksService.updateCallback(row.id, { status: next as any }, user, userContext);
      toast({ title: "Updated", description: `Callback marked as ${next}` });
      // Refresh current page (for team leaders, always refresh page 1)
      loadCallbacks(user?.role === 'team_leader' ? 1 : (pagination?.page || 1));
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update callback status",
        variant: "destructive",
      });
    }
  };

  const handleEditCallback = (callback: CallbackRow) => {
    setEditingCallback(callback);
    setEditForm({
      customer_name: callback.customer_name,
      phone_number: callback.phone_number,
      email: callback.email,
      status: callback.status,
      priority: callback.priority,
      scheduled_date: callback.scheduled_date,
      scheduled_time: callback.scheduled_time,
      callback_notes: callback.callback_notes,
      callback_reason: callback.callback_reason,
    });
  };

  const handleScheduleFollowUp = async (callback: CallbackRow) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const followUpDate = tomorrow.toISOString().split('T')[0];
    
    try {
      // Pass user context for role-based permissions
      const userContext = {
        userRole: user?.role,
        userId: user?.id,
        managedTeam: user?.managedTeam
      };

      await callbacksService.updateCallback(callback.id, {
        status: "pending" as const,
        callbackNotes: `${callback.callback_notes || ''}\n\nFollow-up scheduled for ${followUpDate}`.trim()
      }, user, userContext);
      toast({
        title: "Follow-up Scheduled",
        description: `Follow-up scheduled for ${followUpDate}`,
      });
      // Refresh current page (for team leaders, always refresh page 1)
      loadCallbacks(user?.role === 'team_leader' ? 1 : (pagination?.page || 1));
    } catch (error) {
      console.error("Error scheduling follow-up:", error);
      toast({
        title: "Error",
        description: "Failed to schedule follow-up",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCallback = async () => {
    if (!editingCallback || !editForm) return;

    try {
      console.log('🔄 handleUpdateCallback - Starting update for callback:', editingCallback.id);
      console.log('📋 Raw editForm data:', editForm);
      
      // Keep snake_case properties to match database table structure
      const apiUpdates: any = {};
      
      if (editForm.customer_name !== undefined) apiUpdates.customer_name = editForm.customer_name;
      if (editForm.phone_number !== undefined) apiUpdates.phone_number = editForm.phone_number;
      if (editForm.email !== undefined) apiUpdates.email = editForm.email;
      if (editForm.status !== undefined) apiUpdates.status = editForm.status;
      if (editForm.priority !== undefined) apiUpdates.priority = editForm.priority;
      if (editForm.scheduled_date !== undefined) apiUpdates.scheduled_date = editForm.scheduled_date;
      if (editForm.scheduled_time !== undefined) apiUpdates.scheduled_time = editForm.scheduled_time;
      if (editForm.callback_notes !== undefined) apiUpdates.callback_notes = editForm.callback_notes;
      if (editForm.callback_reason !== undefined) apiUpdates.callback_reason = editForm.callback_reason;

      // Pass user context for role-based permissions
      const userContext = {
        userRole: user?.role,
        userId: user?.id,
        managedTeam: user?.managedTeam
      };
      console.log('🚀 Calling callbacksService.updateCallback with:', { id: editingCallback.id, updates: apiUpdates, user, userContext });

      await callbacksService.updateCallback(editingCallback.id, apiUpdates, user, userContext);
      console.log('✅ Callback update completed successfully');
      setEditingCallback(null);
      setEditForm({});
      toast({
        title: "Success",
        description: "Callback updated successfully",
      });
      // Refresh current page (for team leaders, always refresh page 1)
      loadCallbacks(user?.role === 'team_leader' ? 1 : (pagination?.page || 1));
    } catch (error) {
      console.error('❌ Error updating callback:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast({
        title: "Error",
        description: "Failed to update callback",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: "pending" | "contacted" | "completed" | "cancelled") => {
    try {
      // Pass user context for role-based permissions
      const userContext = {
        userRole: user?.role,
        userId: user?.id,
        managedTeam: user?.managedTeam
      };

      await callbacksService.updateCallback(id, { status: newStatus as any }, user, userContext);
      toast({
        title: "Success",
        description: `Callback status updated to ${newStatus}`,
      });
      // Refresh current page (for team leaders, always refresh page 1)
      loadCallbacks(user?.role === 'team_leader' ? 1 : (pagination?.page || 1));
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update callback status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCallback = async (callback: CallbackRow) => {
    try {
      // Pass user context for role-based permissions
      const userContext = {
        userRole: user?.role,
        userId: user?.id,
        managedTeam: user?.managedTeam
      };

      await callbacksService.deleteCallback(callback.id, userContext);
      toast({
        title: "Success",
        description: "Callback deleted successfully",
      });
      // Refresh current page (for team leaders, always refresh page 1)
      loadCallbacks(user?.role === 'team_leader' ? 1 : (pagination?.page || 1));
    } catch (error) {
      console.error("Error deleting callback:", error);
      toast({
        title: "Error",
        description: "Failed to delete callback",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {user?.role === 'manager' ? 'Callbacks Overview' : 'Manage Callbacks'} - {pagination.total} Total
            {pagination.total >= effectiveLimit && 
              <span className="text-sm text-muted-foreground ml-2">
                (fetched {pagination.total} callbacks)
              </span>
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customer, email, phone, or agent..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-72 pl-8 pr-8"
                />
                {loading && debouncedSearch !== search && (
                  <div className="absolute right-2 top-2.5">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {/* Quick filter: Agent - Only show for managers */}
              {user?.role === 'manager' && (
                <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v)}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Filter by agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All agents</SelectItem>
                    {Array.from(new Set(callbacks.map(c => c.sales_agent).filter(Boolean))).sort().map(a => (
                      <SelectItem key={a} value={a as string}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {user?.role === 'manager' && (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border">
                <div className="font-semibold mb-2">Updates by Agent (count)</div>
                <div className="space-y-1 max-h-48 overflow-auto pr-1">
                  {Array.from(updatesByAgent.entries()).sort((a,b)=>b[1]-a[1]).map(([agent, cnt]) => (
                    <div key={agent} className="flex justify-between text-sm">
                      <span className="truncate pr-2">{agent}</span>
                      <span className="font-medium">{cnt}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="font-semibold mb-2">Most Contacted Phones (by callbacks)</div>
                <div className="space-y-1 max-h-48 overflow-auto pr-1">
                  {Array.from(phoneStats.entries()).sort((a,b)=>b[1].count-a[1].count).slice(0,10).map(([phone, stat]) => (
                    <div key={phone} className="flex justify-between text-sm">
                      <span className="truncate pr-2">{phone}</span>
                      <span className="font-medium">{stat.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Agent</th>
                  <th className="py-2 pr-4">Scheduled</th>
                  <th className="py-2 pr-4">Last Updated</th>
                  <th className="py-2 pr-4">Same Phone Cnt</th>
                  <th className="py-2 pr-4">Priority</th>
                  <th className="py-2 pr-4">Status</th>
                  {(user?.role === 'salesman' || user?.role === 'team_leader') && (
                    <th className="py-2 pr-4 text-right">Actions</th>
                  )}
                  <th className="py-2 pr-0 text-right">History</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">Loading callbacks…</td>
                  </tr>
                ) : callbacks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">No callbacks found</td>
                  </tr>
                ) : (
                  callbacks.map((c: CallbackRow) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{c.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{c.callback_reason || "—"}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium">{c.phone_number || "—"}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div>{c.email || "—"}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div>{c.sales_agent}</div>
                        <div className="text-xs text-muted-foreground">{c.sales_team}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{c.scheduled_date || c.first_call_date}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{c.scheduled_time || c.first_call_time}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {c.updated_at ? new Date(c.updated_at as any).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 pr-4" title={(() => { const s = phoneStats.get(c.phone_number || 'unknown'); return s?.dates?.map(d=> new Date(d).toLocaleString()).join(', ') || '' })()}>
                        {(() => { const s = phoneStats.get(c.phone_number || 'unknown'); return s?.count || 1 })()}x
                      </td>
                      <td className="py-3 pr-4">
                        {c.priority && (
                          <Badge variant="outline" className={priorityColors[c.priority]}>
                            {c.priority}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={statusColors[c.status]}>{c.status}</Badge>
                      </td>
                      {/* Show actions for salesman (own callbacks) and team_leader (own + team callbacks) */}
                      {((user?.role === 'salesman' && c.SalesAgentID === user?.id) || 
                        (user?.role === 'team_leader' && (c.SalesAgentID === user?.id || c.sales_team === user?.managedTeam))) && (
                      <td className="py-3 pr-0 text-right">
                        <div className="flex gap-1 justify-end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-amber-200 text-amber-700 hover:text-amber-800 shadow-sm hover:shadow-md transition-all duration-200"
                                onClick={() => handleEditCallback(c)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Callback</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit-phone">
                                    <Phone className="h-4 w-4 inline mr-2" />
                                    Phone Number
                                  </Label>
                                  <Input
                                    id="edit-phone"
                                    value={editForm.phone_number || ""}
                                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-email">
                                    <Mail className="h-4 w-4 inline mr-2" />
                                    Email
                                  </Label>
                                  <Input
                                    id="edit-email"
                                    type="email"
                                    value={editForm.email || ""}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-status">Status</Label>
                                  <Select
                                    value={editForm.status || ""}
                                    onValueChange={(value) => setEditForm({ ...editForm, status: value as CallbackRow["status"] })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="contacted">Contacted</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="edit-priority">Priority</Label>
                                  <Select
                                    value={editForm.priority || ""}
                                    onValueChange={(value) => setEditForm({ ...editForm, priority: value as "low" | "medium" | "high" })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="low">Low</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label htmlFor="edit-scheduled-date">
                                      <Calendar className="h-4 w-4 inline mr-2" />
                                      Scheduled Date
                                    </Label>
                                    <Input
                                      id="edit-scheduled-date"
                                      type="date"
                                      value={editForm.scheduled_date || ""}
                                      onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-scheduled-time">
                                      <Clock className="h-4 w-4 inline mr-2" />
                                      Scheduled Time
                                    </Label>
                                    <Input
                                      id="edit-scheduled-time"
                                      type="time"
                                      value={editForm.scheduled_time || ""}
                                      onChange={(e) => setEditForm({ ...editForm, scheduled_time: e.target.value })}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="edit-notes">
                                    <MessageSquare className="h-4 w-4 inline mr-2" />
                                    Notes
                                  </Label>
                                  <Textarea
                                    id="edit-notes"
                                    value={editForm.callback_notes || ""}
                                    onChange={(e) => setEditForm({ ...editForm, callback_notes: e.target.value })}
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button variant="outline" onClick={() => setEditingCallback(null)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleUpdateCallback}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          {c.status === "pending" && (
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
                              onClick={() => updateStatus(c, "contacted")}
                            >
                              <Phone className="h-4 w-4 mr-1" />
                              Contact
                            </Button>
                          )}
                          {c.status === "contacted" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 border-purple-200 text-purple-700 hover:text-purple-800 shadow-sm hover:shadow-md transition-all duration-200"
                              onClick={() => handleScheduleFollowUp(c)}
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Follow-up
                            </Button>
                          )}
                          {c.status === "contacted" && (
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
                              onClick={() => updateStatus(c, "completed")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                          {c.status !== "cancelled" && c.status !== "completed" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 border-gray-200 text-gray-700 hover:text-gray-800 shadow-sm hover:shadow-md transition-all duration-200"
                              onClick={() => updateStatus(c, "cancelled")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
                            onClick={() => handleDeleteCallback(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      )}
                      <td className="py-3 pr-0 text-right">
                        <Dialog open={historyForPhone === (c.phone_number || '')} onOpenChange={(open) => setHistoryForPhone(open ? (c.phone_number || '') : null)}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 hover:text-blue-800 shadow-sm hover:shadow-md transition-all duration-200"
                              onClick={() => setHistoryForPhone(c.phone_number || '')}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              History
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-600" />
                                Callback Timeline for {c.phone_number}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="max-h-[70vh] overflow-auto">
                              <div className="space-y-6 p-4">
                                {(() => {
                                  // Define timeline event interface
                                  interface TimelineEvent {
                                    id: string;
                                    type: 'initial' | 'status_update' | 'followup' | 'final';
                                    date: Date;
                                    callback: any;
                                    title: string;
                                    description: string;
                                    status: CallbackRow["status"]; // Use same status type as CallbackRow
                                    isFirst?: boolean;
                                    isScheduled?: boolean;
                                  }
                                  
                                  // Get all callbacks for this phone number
                                  const phoneCallbacks = callbacks.filter(x => (x.phone_number || '') === (c.phone_number || ''));
                                  
                                  // Create timeline events for each callback
                                  const timelineEvents: TimelineEvent[] = [];
                                  
                                  // Track unique events to avoid duplicates
                                  const addedEvents = new Set();
                                  
                                  phoneCallbacks.forEach((callback, callbackIdx) => {
                                    // Initial call/creation event
                                    const createdDate = callback.created_at ? new Date(callback.created_at as any) : (callback.first_call_date ? new Date(callback.first_call_date) : null);
                                    if (createdDate) {
                                      const eventKey = `${callback.id}-created-${createdDate.getTime()}`;
                                      if (!addedEvents.has(eventKey)) {
                                        timelineEvents.push({
                                          id: eventKey,
                                          type: 'initial',
                                          date: createdDate,
                                          callback,
                                          title: callbackIdx === 0 ? 'First Call' : 'New Callback',
                                          description: `Callback created by ${callback.sales_agent}`,
                                          status: 'pending',
                                          isFirst: callbackIdx === 0
                                        });
                                        addedEvents.add(eventKey);
                                      }
                                    }
                                    
                                    // Status update events - only if different from creation
                                    if (callback.status === 'contacted' && callback.updated_at) {
                                      const contactedDate = new Date(callback.updated_at as any);
                                      if (contactedDate && createdDate && contactedDate.getTime() !== createdDate.getTime()) {
                                        const eventKey = `${callback.id}-contacted-${contactedDate.getTime()}`;
                                        if (!addedEvents.has(eventKey)) {
                                          timelineEvents.push({
                                            id: eventKey,
                                            type: 'status_update',
                                            date: contactedDate,
                                            callback,
                                            title: 'Customer Contacted',
                                            description: `Customer contacted by ${(callback as any).updated_by || callback.sales_agent}`,
                                            status: 'contacted'
                                          });
                                          addedEvents.add(eventKey);
                                        }
                                      }
                                    }
                                    
                                    // Follow-up scheduled events - only unique ones
                                    if (callback.scheduled_date && callback.scheduled_time) {
                                      const scheduledDateTime = new Date(`${callback.scheduled_date}T${callback.scheduled_time}`);
                                      const eventKey = `followup-${callback.scheduled_date}-${callback.scheduled_time}-${callback.sales_agent}`;
                                      if (!addedEvents.has(eventKey)) {
                                        timelineEvents.push({
                                          id: `${callback.id}-followup-${scheduledDateTime.getTime()}`,
                                          type: 'followup',
                                          date: scheduledDateTime,
                                          callback,
                                          title: 'Follow-up Scheduled',
                                          description: `Follow-up appointment scheduled by ${callback.sales_agent}`,
                                          status: 'pending',
                                          isScheduled: true
                                        });
                                        addedEvents.add(eventKey);
                                      }
                                    }
                                    
                                    // Completion/cancellation events
                                    if ((callback.status === 'completed' || callback.status === 'cancelled') && callback.updated_at) {
                                      const finalDate = new Date(callback.updated_at as any);
                                      if (createdDate && finalDate.getTime() !== createdDate.getTime()) {
                                        const eventKey = `${callback.id}-final-${callback.status}-${finalDate.getTime()}`;
                                        if (!addedEvents.has(eventKey)) {
                                          timelineEvents.push({
                                            id: eventKey,
                                            type: 'final',
                                            date: finalDate,
                                            callback,
                                            title: callback.status === 'completed' ? 'Callback Completed' : 'Callback Cancelled',
                                            description: `Callback ${callback.status} by ${(callback as any).updated_by || callback.sales_agent}`,
                                            status: callback.status
                                          });
                                          addedEvents.add(eventKey);
                                        }
                                      }
                                    }
                                  });
                                  
                                  // Sort all events chronologically
                                  timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
                                  
                                  return timelineEvents.map((event, idx) => {
                                    const isLast = idx === timelineEvents.length - 1;
                                    const statusColor = statusColors[event.status] || 'bg-gray-500';
                                    const isFuture = event.date > new Date();
                                    
                                    return (
                                      <div key={event.id} className="relative">
                                        {/* Timeline line */}
                                        {!isLast && (
                                          <div className={`absolute left-6 top-16 w-0.5 h-20 ${isFuture ? 'bg-gradient-to-b from-gray-300 to-gray-200 border-dashed' : 'bg-gradient-to-b from-blue-300 to-blue-200'}`}></div>
                                        )}
                                        
                                        {/* Timeline item */}
                                        <div className="flex items-start gap-4">
                                          {/* Timeline dot */}
                                          <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${statusColor} flex items-center justify-center shadow-lg ${isFuture ? 'opacity-60 border-2 border-dashed border-gray-400' : ''}`}>
                                            {event.type === 'initial' && <Phone className="h-6 w-6 text-white" />}
                                            {event.type === 'status_update' && event.status === 'contacted' && <MessageSquare className="h-6 w-6 text-white" />}
                                            {event.type === 'followup' && <Calendar className="h-6 w-6 text-white" />}
                                            {event.type === 'final' && event.status === 'completed' && <CheckCircle className="h-6 w-6 text-white" />}
                                            {event.type === 'final' && event.status === 'cancelled' && <XCircle className="h-6 w-6 text-white" />}
                                          </div>
                                          
                                          {/* Content card */}
                                          <div className={`flex-1 border rounded-lg shadow-sm p-4 hover:shadow-md transition-all duration-200 ${isFuture ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'}`}>
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-gray-900">{event.title}</h4>
                                                {event.isFirst && (
                                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Initial Contact
                                                  </Badge>
                                                )}
                                                {event.isScheduled && (
                                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    Scheduled
                                                  </Badge>
                                                )}
                                                {isFuture && (
                                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                                    Upcoming
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900">
                                                  {event.date.toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  {event.date.toLocaleTimeString()}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            <p className="text-sm text-gray-700 mb-3">{event.description}</p>
                                            
                                            <div className="grid grid-cols-3 gap-4 text-xs">
                                              <div>
                                                <div className="font-medium text-gray-600">Agent</div>
                                                <div className="text-gray-900">{event.callback.sales_agent}</div>
                                              </div>
                                              <div>
                                                <div className="font-medium text-gray-600">Team</div>
                                                <div className="text-gray-900">{event.callback.sales_team || '—'}</div>
                                              </div>
                                              <div>
                                                <div className="font-medium text-gray-600">Status</div>
                                                <Badge className={`${statusColor} text-white text-xs`}>
                                                  {event.status.toUpperCase()}
                                                </Badge>
                                              </div>
                                            </div>
                                            
                                            {event.callback.callback_reason && (
                                              <div className="mt-3 pt-3 border-t border-gray-100">
                                                <div className="text-xs font-medium text-gray-600 mb-1">Reason</div>
                                                <div className="text-xs text-gray-800">{event.callback.callback_reason}</div>
                                              </div>
                                            )}
                                            
                                            {event.callback.callback_notes && (
                                              <div className="mt-3 pt-3 border-t border-gray-100">
                                                <div className="text-xs font-medium text-gray-600 mb-1">Notes</div>
                                                <div className="text-xs text-gray-800 bg-gray-50 p-2 rounded text-left">{event.callback.callback_notes}</div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                                
                                {callbacks.filter(x => (x.phone_number || '') === (c.phone_number || '')).length === 0 && (
                                  <div className="text-center py-8 text-gray-500">
                                    <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No callback history found for this phone number.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <PaginationControls />
        </CardContent>
      </Card>
    </div>
  );
}

