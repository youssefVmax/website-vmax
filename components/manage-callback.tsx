"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { callbacksService } from "@/lib/firebase-callbacks-service";

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

export default function ManageCallbacksPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([]);

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
    } catch (e) {
      console.error("Update callback status error", e);
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const remove = async (row: CallbackRow) => {
    try {
      await callbacksService.deleteCallback(row.id);
      toast({ title: "Deleted", description: `Removed ${row.customer_name}` });
    } catch (e) {
      console.error("Delete callback error", e);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
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
                  <th className="py-2 pr-4">First Call</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">Loading callbacks…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">No callbacks found</td>
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
                        <div>{c.first_call_date}</div>
                        <div className="text-xs text-muted-foreground">{c.first_call_time}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={statusColors[c.status]}>{c.status}</Badge>
                      </td>
                      <td className="py-3 pr-0 text-right">
                        <div className="flex gap-2 justify-end">
                          {c.status !== "contacted" && (
                            <Button variant="secondary" size="sm" onClick={() => updateStatus(c, "contacted")}>Mark Contacted</Button>
                          )}
                          {c.status !== "completed" && (
                            <Button variant="secondary" size="sm" onClick={() => updateStatus(c, "completed")}>Complete</Button>
                          )}
                          {c.status !== "cancelled" && (
                            <Button variant="outline" size="sm" onClick={() => updateStatus(c, "cancelled")}>Cancel</Button>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => remove(c)}>Delete</Button>
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
