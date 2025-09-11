"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { dealsService } from "@/lib/firebase-deals-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SimpleAddDeal() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    customer_name: "",
    phone_number: "",
    email: "",
    amount_paid: 0,
    duration_months: 12,
    sales_agent: user?.name || "",
    closing_agent: user?.name || "",
    sales_team: user?.team || "",
    product_type: "IPTV Premium",
    service_tier: "Gold",
    country: "",
    signup_date: new Date().toISOString().split('T')[0],
    notes: "",
    status: "active" as const,
    stage: "closed-won" as const,
    priority: "medium" as const,
    is_ibo_player: false,
    is_bob_player: false,
    is_smarters: false,
    is_ibo_pro: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'amount_paid') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (name === 'duration_months') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 12 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.customer_name || !formData.email || !formData.phone_number || !formData.amount_paid) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields: Customer Name, Email, Phone, and Amount.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Use Firebase deals service for proper integration
      const dealData = {
        ...formData,
        SalesAgentID: user?.id || '',
        ClosingAgentID: user?.id || '',
        created_by: user?.name || 'Unknown',
        created_by_id: user?.id || ''
      };

      console.log('Creating deal with Firebase service:', dealData);
      const dealId = await dealsService.createDeal(dealData, user);
      console.log('Deal created successfully with ID:', dealId);

      // Show success message
      toast({
        title: "Deal added successfully!",
        description: `Deal for "${formData.customer_name}" has been created with automatic notifications.`,
      });

      // Reset form
      setFormData({
        customer_name: "",
        phone_number: "",
        email: "",
        amount_paid: 0,
        duration_months: 12,
        sales_agent: user?.name || "",
        closing_agent: user?.name || "",
        sales_team: user?.team || "",
        product_type: "IPTV Premium",
        service_tier: "Gold",
        country: "",
        signup_date: new Date().toISOString().split('T')[0],
        notes: "",
        status: "active" as const,
        stage: "closed-won" as const,
        priority: "medium" as const,
        is_ibo_player: false,
        is_bob_player: false,
        is_smarters: false,
        is_ibo_pro: false
      });

      // Refresh and redirect
      router.refresh();
      setTimeout(() => {
        router.push('/');
      }, 1500);

    } catch (error) {
      console.error('Error adding deal:', error);
      toast({
        title: "Error",
        description: "There was an error adding the deal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Add New Deal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number *</Label>
              <Input
                id="phone_number"
                name="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount Paid ($) *</Label>
              <Input
                id="amount_paid"
                name="amount_paid"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount_paid}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_months">Duration (Months) *</Label>
              <Input
                id="duration_months"
                name="duration_months"
                type="number"
                min="1"
                value={formData.duration_months}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_type">Product Type *</Label>
              <Select value={formData.product_type} onValueChange={(value) => handleSelectChange('product_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IPTV Premium">IPTV Premium</SelectItem>
                  <SelectItem value="IPTV Standard">IPTV Standard</SelectItem>
                  <SelectItem value="IPTV Basic">IPTV Basic</SelectItem>
                  <SelectItem value="Sports Package">Sports Package</SelectItem>
                  <SelectItem value="Movie Package">Movie Package</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_tier">Service Tier *</Label>
              <Select value={formData.service_tier} onValueChange={(value) => handleSelectChange('service_tier', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales_agent">Sales Agent</Label>
              <Input
                id="sales_agent"
                name="sales_agent"
                value={formData.sales_agent}
                onChange={handleChange}
                disabled={true}
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="closing_agent">Closing Agent</Label>
              <Input
                id="closing_agent"
                name="closing_agent"
                value={formData.closing_agent}
                onChange={handleChange}
                disabled={true}
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Deal"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
