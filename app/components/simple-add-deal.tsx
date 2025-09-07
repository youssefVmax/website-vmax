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

export function SimpleAddDeal() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    customer_name: "",
    phone: "",
    email: "",
    amount: "",
    sales_agent: "",
    closing_agent: "",
    comment: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate a new DealID
      const timestamp = new Date().getTime();
      const random = Math.floor(Math.random() * 1000);
      const dealId = `Deal-${timestamp.toString().slice(-4)}${random.toString().padStart(3, '0')}`;

      const dealData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        dealId,
        date: new Date().toISOString(),
      };

      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dealData),
      });

      if (!response.ok) {
        throw new Error('Failed to add deal');
      }

      // Show success message
      toast({
        title: "Deal added successfully!",
        description: `Deal ID: ${dealId} has been created.`,
      });

      // Fire a notification to the manager
      try {
        const notifyPayload = {
          title: "New Deal Added",
          message: `${user?.name || 'A salesman'} added a deal of $${(dealData.amount || 0).toLocaleString()}`,
          type: "deal",
          priority: "medium",
          from: user?.id || "unknown",
          to: ["manager-001"],
          dealId,
          dealName: formData.customer_name,
          dealValue: dealData.amount,
          isManagerMessage: false,
          actionRequired: false,
        } as any;
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notifyPayload),
        });
      } catch (e) {
        console.warn('Failed to notify manager about new deal', e);
      }

      // Refresh the current route to refetch data and update the dashboard
      router.refresh();

      // Redirect to the dashboard page after a short delay
      setTimeout(() => {
        router.push('/dashboard');
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
              <Label htmlFor="customer_name">Customer Name</Label>
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
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales_agent">Sales Agent</Label>
              <Input
                id="sales_agent"
                name="sales_agent"
                value={formData.sales_agent}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="closing_agent">Closing Agent</Label>
              <Input
                id="closing_agent"
                name="closing_agent"
                value={formData.closing_agent}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comments</Label>
            <Textarea
              id="comment"
              name="comment"
              value={formData.comment}
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
