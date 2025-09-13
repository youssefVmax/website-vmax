"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { callbacksService } from "@/lib/firebase-callbacks-service";

export default function NewCallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    customer_name: "",
    phone_number: "",
    email: "",
    first_call_date: new Date().toISOString().split("T")[0],
    first_call_time: new Date().toTimeString().slice(0, 5),
    callback_reason: "",
    callback_notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Not authenticated", description: "Please login first.", variant: "destructive" });
      return;
    }

    if (!form.customer_name || !form.phone_number || !form.email) {
      toast({ title: "Validation error", description: "Customer name, phone, and email are required.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer_name: form.customer_name,
        phone_number: form.phone_number,
        email: form.email,
        sales_agent: user.name,
        sales_team: user.team || "Unknown",
        first_call_date: form.first_call_date,
        first_call_time: form.first_call_time,
        callback_reason: form.callback_reason,
        callback_notes: form.callback_notes,
        status: "pending" as const,
        created_by: user.name,
        created_by_id: user.id,
        SalesAgentID: user.id || "",
      };

      const id = await callbacksService.addCallback(payload);
      toast({ title: "Callback created", description: `ID: ${id}` });
      router.push("/callbacks/manage");
    } catch (err) {
      console.error("Error creating callback", err);
      toast({ title: "Error", description: "Failed to create callback", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Create Callback</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input id="customer_name" name="customer_name" value={form.customer_name} onChange={handleChange} required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone *</Label>
                <Input id="phone_number" name="phone_number" value={form.phone_number} onChange={handleChange} required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_call_date">First Call Date *</Label>
                <Input id="first_call_date" name="first_call_date" type="date" value={form.first_call_date} onChange={handleChange} required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_call_time">First Call Time *</Label>
                <Input id="first_call_time" name="first_call_time" type="time" value={form.first_call_time} onChange={handleChange} required disabled={loading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="callback_reason">Callback Reason</Label>
              <Input id="callback_reason" name="callback_reason" value={form.callback_reason} onChange={handleChange} disabled={loading} placeholder="e.g., customer busy, needs time..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="callback_notes">Notes</Label>
              <Textarea id="callback_notes" name="callback_notes" value={form.callback_notes} onChange={handleChange} disabled={loading} rows={3} />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Create Callback"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
