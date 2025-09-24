"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { callbacksService } from "@/lib/mysql-callbacks-service";
import { showCallbackAdded, showError } from "@/lib/sweetalert";
import { 
  Calendar, 
  Clock, 
  Phone, 
  User, 
  Mail, 
  MessageSquare, 
  Save,
  ArrowLeft,
  AlertCircle
} from "lucide-react";

type FormState = {
  customer_name: string;
  phone_number: string;
  email: string;
  first_call_date: string;
  first_call_time: string;
  callback_reason: string;
  callback_notes: string;
  priority: "low" | "medium" | "high";
  scheduled_date: string;
  scheduled_time: string;
  follow_up_required: boolean;
};

export default function NewCallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<FormState>({
    customer_name: "",
    phone_number: "",
    email: "",
    first_call_date: new Date().toISOString().split("T")[0],
    first_call_time: new Date().toTimeString().slice(0, 5),
    callback_reason: "",
    callback_notes: "",
    priority: "medium",
    scheduled_date: "",
    scheduled_time: "",
    follow_up_required: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev: FormState) => ({ ...prev, [name]: value }));
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
        customerName: form.customer_name,
        phoneNumber: form.phone_number,
        email: form.email,
        salesAgentId: user.id || "",
        salesAgentName: user.name,
        salesTeam: user.team || "Unknown",
        firstCallDate: form.first_call_date,
        firstCallTime: form.first_call_time,
        callbackReason: form.callback_reason,
        callbackNotes: form.callback_notes,
        priority: form.priority,
        scheduledDate: form.scheduled_date,
        scheduledTime: form.scheduled_time,
        followUpRequired: form.follow_up_required,
        status: "pending" as const,
        createdBy: user.name,
        createdById: user.id,
      };

      const id = await callbacksService.addCallback(payload);
      console.log('Callback created with ID:', id, 'Payload:', payload);
      
      // Show enhanced SweetAlert notification
      await showCallbackAdded(
        form.customer_name,
        `${form.first_call_date} ${form.first_call_time}`,
        'Callback scheduled successfully!'
      );
      
      // Also show toast for additional details
      toast({ 
        title: "✅ Callback Created Successfully!",
        description: `Customer: ${form.customer_name} | Phone: ${form.phone_number}`,
        duration: 3000
      });
      
      // Don't navigate - stay on the form to allow creating more callbacks
      
      // Reset form after successful submission
      setForm({
        customer_name: "",
        phone_number: "",
        email: "",
        first_call_date: "",
        first_call_time: "",
        callback_reason: "",
        callback_notes: "",
        priority: "medium",
        scheduled_date: "",
        scheduled_time: "",
        follow_up_required: false
      });
    } catch (err) {
      console.error("Error creating callback", err);
      toast({ title: "Error", description: "Failed to create callback", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create New Callback</h1>
            <p className="text-sm text-muted-foreground">Schedule a callback for customer follow-up</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Customer Information */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Name *
                </Label>
                <Input 
                  id="customer_name" 
                  name="customer_name" 
                  value={form.customer_name} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter customer full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number *
                </Label>
                <Input 
                  id="phone_number" 
                  name="phone_number" 
                  value={form.phone_number} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address *
                </Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="customer@example.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Details */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Call Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_call_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  First Call Date *
                </Label>
                <Input 
                  id="first_call_date" 
                  name="first_call_date" 
                  type="date" 
                  value={form.first_call_date} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_call_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  First Call Time *
                </Label>
                <Input 
                  id="first_call_time" 
                  name="first_call_time" 
                  type="time" 
                  value={form.first_call_time} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select value={form.priority} onValueChange={(value: "low" | "medium" | "high") => setForm((prev) => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Low Priority
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Medium Priority
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        High Priority
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="callback_reason" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Callback Reason
                </Label>
                <Input 
                  id="callback_reason" 
                  name="callback_reason" 
                  value={form.callback_reason} 
                  onChange={handleChange} 
                  disabled={loading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., customer busy, needs time to decide..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Schedule Callback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Scheduled Date
                </Label>
                <Input 
                  id="scheduled_date" 
                  name="scheduled_date" 
                  type="date" 
                  value={form.scheduled_date} 
                  onChange={handleChange} 
                  disabled={loading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="callback_notes">Notes & Comments</Label>
              <Textarea 
                id="callback_notes" 
                name="callback_notes" 
                value={form.callback_notes} 
                onChange={handleChange} 
                disabled={loading} 
                rows={4}
                className="transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Add any additional notes, customer preferences, or important details..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Callback
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
