"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { callbacksService } from "@/lib/firebase-callbacks-service";
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
  RefreshCw
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([]);
  const [editingCallback, setEditingCallback] = useState<CallbackRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<CallbackRow>>({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CallbackRow["status"]>("all");

  useEffect(() => {
    if (!user) return;
    const unsub = callbacksService.onCallbacksChange(
      (list) => {
        setCallbacks(list as unknown as CallbackRow[]);
        setLoading(false);
      },
      user.role,
      user.id,
      user.name
    );
    return () => {
      try { (unsub as any)?.(); } catch {}
    };
  }, [user]);

  const filtered = useMemo(() => {
    let list = callbacks;
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.customer_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone_number?.toLowerCase().includes(q) ||
          c.sales_agent?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [callbacks, statusFilter, search]);

  const updateStatus = async (row: CallbackRow, next: CallbackRow["status"]) => {
    try {
      await callbacksService.updateCallback(row.id, { status: next });
      toast({ title: "Updated", description: `Callback marked as ${next}` });
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
      await callbacksService.updateCallback(callback.id, {
        status: "pending" as const,
        callback_notes: `${callback.callback_notes || ''}\n\nFollow-up scheduled for ${followUpDate}`.trim()
      });
      toast({
        title: "Follow-up Scheduled",
        description: `Follow-up scheduled for ${followUpDate}`,
      });
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
      await callbacksService.updateCallback(editingCallback.id, editForm);
      setEditingCallback(null);
      setEditForm({});
      toast({
        title: "Success",
        description: "Callback updated successfully",
      });
    } catch (error) {
      console.error("Error updating callback:", error);
      toast({
        title: "Error",
        description: "Failed to update callback",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: CallbackRow["status"]) => {
    try {
      await callbacksService.updateCallback(id, { status: newStatus });
      toast({
        title: "Success",
        description: `Callback status updated to ${newStatus}`,
      });
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
      await callbacksService.deleteCallback(callback.id);
      toast({
        title: "Success",
        description: "Callback deleted successfully",
      });
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
          <CardTitle>Manage Callbacks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Search customer, email, phone, or agent..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-72"
              />
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
            </div>
            <div className="flex gap-2">
              <Button onClick={() => (window.location.href = "/callbacks/new")}>New Callback</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Agent</th>
                  <th className="py-2 pr-4">Scheduled</th>
                  <th className="py-2 pr-4">Priority</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">Loading callbacks…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">No callbacks found</td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{c.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{c.callback_reason || "—"}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div>{c.email}</div>
                        <div className="text-xs text-muted-foreground">{c.phone_number}</div>
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
                        {c.priority && (
                          <Badge variant="outline" className={priorityColors[c.priority]}>
                            {c.priority}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={statusColors[c.status]}>{c.status}</Badge>
                      </td>
                      <td className="py-3 pr-0 text-right">
                        <div className="flex gap-2 justify-end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => handleEditCallback(c)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Callback</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit-customer-name">
                                    <User className="h-4 w-4 inline mr-2" />
                                    Customer Name
                                  </Label>
                                  <Input
                                    id="edit-customer-name"
                                    value={editForm.customer_name || ""}
                                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                                  />
                                </div>
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
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => handleScheduleFollowUp(c)}
                            disabled={c.status === "completed" || c.status === "cancelled"}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Follow-up
                          </Button>
                          {c.status === "pending" && (
                            <Button variant="default" size="sm" onClick={() => updateStatus(c, "contacted")}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Contacted
                            </Button>
                          )}
                          {c.status === "contacted" && (
                            <Button variant="default" size="sm" onClick={() => updateStatus(c, "completed")}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                          {c.status !== "cancelled" && c.status !== "completed" && (
                            <Button variant="outline" size="sm" onClick={() => updateStatus(c, "cancelled")}>
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteCallback(c)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
