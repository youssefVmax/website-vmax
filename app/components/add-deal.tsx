// components/add-deal-page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/use-notifications";
import type { Notification } from "@/types/notification";
import { USERS } from "@/lib/auth";

export function AddDealPage({ onDealAdded }: { onDealAdded?: () => void }) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const userRole = user?.role ?? "manager";
  const salesmanOptions = USERS.filter(u => u.role === 'salesman');
  const csOptions = USERS.filter(u => u.role === 'customer-service');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_name: "",
    phone: "",
    email: "",
    amount: "",
    username: "",
    address: "",
    sales_agent: user?.name ?? "",
    closing_agent: "",
    team: "CS TEAM",
    duration: "TWO YEAR",
    type_program: "IBO PLAYER",
    type_service: "SLIVER",
    invoice: "",
    device_id: "",
    device_key: "",
    comment: "",
    no_user: "1",
    SalesAgentID: user?.id || "",
    ClosingAgentID: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'sales_agent') {
      const selected = salesmanOptions.find(u => u.id === value);
      setFormData(prev => ({
        ...prev,
        sales_agent: selected?.name || prev.sales_agent,
        SalesAgentID: selected?.id || prev.SalesAgentID,
        sales_agent_norm: (selected?.name || prev.sales_agent).toLowerCase(),
      }));
      return;
    }
    if (name === 'closing_agent') {
      const selected = csOptions.find(u => u.id === value);
      setFormData(prev => ({
        ...prev,
        closing_agent: selected?.name || prev.closing_agent,
        ClosingAgentID: selected?.id || prev.ClosingAgentID,
        closing_agent_norm: (selected?.name || prev.closing_agent).toLowerCase(),
      }));
      return;
    }
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

      // Generate agent IDs based on names
      const generateId = (prefix: string) => {
        const randomString = Math.random().toString(36).slice(2, 10)
        return `${prefix}-${randomString}`
      }

      const newDeal = {
        ...formData,
        date: new Date().toISOString().split('T')[0],
        amount: parseFloat(formData.amount) || 0,
        no_user: parseInt(formData.no_user) || 1,
        DealID: dealId,
        SalesAgentID: formData.SalesAgentID || user?.id || generateId('agent'),
        ClosingAgentID: formData.ClosingAgentID || generateId('agent'),
        sales_agent_norm: formData.sales_agent.toLowerCase(),
        closing_agent_norm: formData.closing_agent.toLowerCase(),
      };

      // Persist to CSV via API
      const saveRes = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeal),
      });
      if (!saveRes.ok) throw new Error('Failed to save deal');
      
      // Show success message
      toast({
        title: "Deal Added Successfully",
        description: `Deal ${dealId} has been created and assigned.`,
      });

      // Notify manager (valid ID) about the new deal
      const managerNotification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
        title: 'New Deal Created',
        message: `${user?.name ?? 'Unknown'} created a new deal ${dealId} for ${formData.customer_name}.`,
        type: 'deal',
        priority: 'medium',
        from: user?.id ?? 'system',
        to: ['manager-001'],
        dealId,
        dealName: formData.customer_name,
        dealValue: parseFloat(formData.amount),
        dealStage: 'new',
      };
      addNotification(managerNotification);

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        customer_name: "",
        phone: "",
        email: "",
        amount: "",
        username: "",
        address: "",
        sales_agent: user?.name ?? "",
        closing_agent: "",
        team: "CS TEAM",
        duration: "TWO YEAR",
        type_program: "IBO PLAYER",
        type_service: "SLIVER",
        invoice: "",
        device_id: "",
        device_key: "",
        comment: "",
        no_user: "1",
        SalesAgentID: user?.id || "",
        ClosingAgentID: "",
      });

      // Call the onDealAdded callback to refresh the deals list
      if (onDealAdded) onDealAdded();
    } catch (error) {
      console.error('Error adding deal:', error);

      // Create error notification
      const errorNotification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
        title: 'Failed to Add Deal',
        message: `Failed to add deal for ${formData.customer_name}. Please try again.`,
        type: 'error',
        priority: 'high',
        from: 'System',
        to: [userRole === 'manager' ? 'MANAGER' : (user?.name ?? 'Unknown')],
      };
      addNotification(errorNotification);

      toast({
        title: "Error",
        description: "Failed to add deal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Add New Deal
        </h2>
      </div>

      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Deal Information</CardTitle>
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sales_agent">Sales Agent *</Label>
                {userRole === 'manager' ? (
                  <Select 
                    value={formData.SalesAgentID || ''}
                    onValueChange={(v) => handleSelectChange('sales_agent', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesmanOptions.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id="sales_agent" name="sales_agent" value={formData.sales_agent} disabled />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="closing_agent">Closing Agent *</Label>
                <Select 
                  value={formData.ClosingAgentID || ''}
                  onValueChange={(v) => handleSelectChange('closing_agent', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select closing agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {csOptions.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team">Team *</Label>
                <Select 
                  value={formData.team} 
                  onValueChange={(value) => handleSelectChange("team", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CS TEAM">CS TEAM</SelectItem>
                    <SelectItem value="ALI ASHRAF">ALI ASHRAF</SelectItem>
                    <SelectItem value="SAIF MOHAMED">SAIF MOHAMED</SelectItem>
                    <SelectItem value="OTHER">OTHER</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration *</Label>
                <Select 
                  value={formData.duration} 
                  onValueChange={(value) => handleSelectChange("duration", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YEAR">YEAR</SelectItem>
                    <SelectItem value="TWO YEAR">TWO YEAR</SelectItem>
                    <SelectItem value="2y+6m">2y+6m</SelectItem>
                    <SelectItem value="2y+5m">2y+5m</SelectItem>
                    <SelectItem value="2y+4m">2y+4m</SelectItem>
                    <SelectItem value="2y+3m">2y+3m</SelectItem>
                    <SelectItem value="2y+2m">2y+2m</SelectItem>
                    <SelectItem value="2y+1m">2y+1m</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type_program">Type Program *</Label>
                <Select 
                  value={formData.type_program} 
                  onValueChange={(value) => handleSelectChange("type_program", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IBO PLAYER">IBO PLAYER</SelectItem>
                    <SelectItem value="BOB PLAYER">BOB PLAYER</SelectItem>
                    <SelectItem value="IBO PRO">IBO PRO</SelectItem>
                    <SelectItem value="SMARTERS">SMARTERS</SelectItem>
                    <SelectItem value="IBOSS">IBOSS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type_service">Type Service *</Label>
                <Select 
                  value={formData.type_service} 
                  onValueChange={(value) => handleSelectChange("type_service", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SLIVER">SLIVER</SelectItem>
                    <SelectItem value="GOLD">GOLD</SelectItem>
                    <SelectItem value="PERMIUM">PERMIUM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice">Invoice Reference</Label>
                <Input
                  id="invoice"
                  name="invoice"
                  value={formData.invoice}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="device_id">Device ID</Label>
                <Input
                  id="device_id"
                  name="device_id"
                  value={formData.device_id}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="device_key">Device Key</Label>
                <Input
                  id="device_key"
                  name="device_key"
                  value={formData.device_key}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="no_user">Number of Users *</Label>
                <Input
                  id="no_user"
                  name="no_user"
                  type="number"
                  value={formData.no_user}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="comment">Comments</Label>
                <Textarea
                  id="comment"
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                disabled={loading}
              >
                {loading ? "Adding Deal..." : "Add Deal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}