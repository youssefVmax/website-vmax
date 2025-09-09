// components/add-deal-page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { showDealAdded, showError, showLoading } from "@/lib/sweetalert";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/use-notifications";
import { User, getUsersByRole } from "@/lib/auth";
import { useFirebaseSalesData } from "@/hooks/useFirebaseSalesData";
import { notificationService } from "@/lib/firebase-services";

export function AddDealPage() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [salesmanOptions, setSalesmanOptions] = useState<User[]>([]);
  const [allUserOptions, setAllUserOptions] = useState<User[]>([]);
  const isSalesman = user?.role === 'salesman'
  const { sales, addSale } = useFirebaseSalesData(user?.role || 'manager', user?.id, user?.name)

  // Load users from Firebase
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const salesmen = await getUsersByRole('salesman');
        const customerService = await getUsersByRole('customer-service');
        const managers = await getUsersByRole('manager');
        
        setSalesmanOptions(salesmen);
        setAllUserOptions([...salesmen, ...customerService, ...managers]);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    
    loadUsers();
  }, []);

  // Dynamic options from current data
  const teamOptions = useMemo(() => {
    const set = new Set<string>()
    ;(sales || []).forEach(s => { if (s.team) set.add(s.team) })
    // Ensure current defaults exist
    set.add("CS TEAM")
    set.add("ALI ASHRAF")
    set.add("SAIF MOHAMED")
    set.add("OTHER")
    // Add user's team if available
    if (user?.team) set.add(user.team)
    return Array.from(set).sort()
  }, [sales, user?.team])

  const serviceOptions = useMemo(() => {
    const set = new Set<string>()
    ;(sales || []).forEach(s => { if (s.type_service) set.add(s.type_service) })
    // Ensure current defaults exist
    ;["SLIVER","GOLD","PERMIUM"].forEach(v => set.add(v))
    return Array.from(set).sort()
  }, [sales])

  // Program and Duration options derived from Firebase data
  const programOptions = useMemo(() => {
    const set = new Set<string>()
    ;(sales || []).forEach(s => { 
      const prog = (s.type_program || '').toString().toUpperCase()
      if (prog) set.add(prog)
    })
    // Ensure sensible defaults are present
    ;["IBO PLAYER","BOB PLAYER","IBO PRO","SMARTERS","IBOSS"].forEach(v => set.add(v))
    return Array.from(set).sort()
  }, [sales])

  const durationOptions = useMemo(() => {
    const set = new Set<string>()
    ;(sales || []).forEach(s => { 
      // Convert duration_months to duration labels
      const months = s.duration_months
      let durLabel = ''
      if (months === 12) durLabel = 'YEAR'
      else if (months === 24) durLabel = 'TWO YEAR'
      else if (months === 30) durLabel = '2Y+6M'
      else if (months === 29) durLabel = '2Y+5M'
      else if (months === 28) durLabel = '2Y+4M'
      else if (months === 27) durLabel = '2Y+3M'
      else if (months === 26) durLabel = '2Y+2M'
      else if (months === 25) durLabel = '2Y+1M'
      if (durLabel) set.add(durLabel)
    })
    // Ensure sensible defaults are present
    ;["YEAR","TWO YEAR","2Y+6M","2Y+5M","2Y+4M","2Y+3M","2Y+2M","2Y+1M"].forEach(v => set.add(v))
    return Array.from(set).sort()
  }, [sales])
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_name: "",
    phone: "",
    email: "",
    amount: "",
    username: "",
    sales_agent: user?.name || "",
    closing_agent: "",
    team: user?.team || "Un Known", // Auto-populate with user's team
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
    // For agent selectors, also set corresponding IDs
    if (name === 'sales_agent') {
      const selected = salesmanOptions.find((u: User) => u.id === value)
      setFormData(prev => ({
        ...prev,
        sales_agent: selected?.name || prev.sales_agent,
        SalesAgentID: selected?.id || prev.SalesAgentID,
        sales_agent_norm: (selected?.name || prev.sales_agent).toLowerCase(),
        team: selected?.team || prev.team,
      }))
      return
    }
    if (name === 'closing_agent') {
      const selected = allUserOptions.find((u: User) => u.id === value)
      setFormData(prev => ({
        ...prev,
        closing_agent: selected?.name || prev.closing_agent,
        ClosingAgentID: selected?.id || prev.ClosingAgentID,
        closing_agent_norm: (selected?.name || prev.closing_agent).toLowerCase(),
      }))
      return
    }
    // Guard dynamic lists
    if (name === 'team') {
      if (!teamOptions.includes(value)) return
    }
    if (name === 'type_service') {
      if (!serviceOptions.includes(value)) return
    }
    if (name === 'type_program') {
      const v = value.toUpperCase()
      if (!programOptions.includes(v)) return
      value = v
    }
    if (name === 'duration') {
      const v = value.toUpperCase()
      if (!durationOptions.includes(v)) return
      value = v
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Skip validation for dynamic fields since we allow custom values

      const timestamp = new Date().getTime();
      const random = Math.floor(Math.random() * 1000);
      const dealId = `Deal-${timestamp.toString().slice(-4)}${random.toString().padStart(3, '0')}`;

      const generateId = (prefix: string) => {
        const randomString = Math.random().toString(36).slice(2, 10);
        return `${prefix}-${randomString}`;
      };

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

      // Save to Firebase directly
      await addSale(newDeal);

      // Create notification for managers using Firebase service directly
      await notificationService.addNotification({
        title: 'New Deal Created',
        message: `${user?.name || 'Unknown'} created new deal ${dealId} for ${formData.customer_name} worth $${formData.amount}`,
        type: 'deal',
        priority: 'medium',
        from: user?.name || 'System',
        userRole: 'manager',
        isRead: false,
        dealId: dealId,
        dealName: formData.customer_name,
        dealValue: parseFloat(formData.amount) || 0,
        actionRequired: false
      });

      // Update salesman's target progress
      try {
        await fetch('/api/targets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: user?.id,
            dealAmount: parseFloat(formData.amount) || 0
          })
        });
      } catch (targetError) {
        console.warn('Failed to update target progress:', targetError);
        // Don't fail the deal creation if target update fails
      }

      await showDealAdded(parseFloat(formData.amount), formData.customer_name);

      setFormData({
        date: new Date().toISOString().split('T')[0],
        customer_name: "",
        phone: "",
        email: "",
        amount: "",
        username: "",
        sales_agent: user?.name || "",
        closing_agent: "",
        team: user?.team || "CS TEAM",
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
    } catch (error) {
      console.error('Error adding deal:', error);

      showError("Missing Information", "Please fill in all required fields");
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
                <Combobox
                  options={[...new Set((sales || []).map(s => s.customer_name).filter(Boolean))].sort()}
                  value={formData.customer_name}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, customer_name: value }))}
                  placeholder="Select or type customer name"
                  searchPlaceholder="Search customers..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Combobox
                  options={[...new Set((sales || []).map(s => s.phone).filter(Boolean))].sort()}
                  value={formData.phone}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  placeholder="Select or type phone number"
                  searchPlaceholder="Search phone numbers..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Combobox
                  options={[...new Set((sales || []).map(s => s.email).filter(Boolean))].sort()}
                  value={formData.email}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                  placeholder="Select or type email address"
                  searchPlaceholder="Search emails..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($) *</Label>
                <Combobox
                  options={[...new Set((sales || []).map(s => s.amount?.toString()).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b))}
                  value={formData.amount}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
                  placeholder="Select or type amount"
                  searchPlaceholder="Search amounts..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Combobox
                  options={[...new Set((sales || []).map(s => s.username).filter(Boolean))].sort()}
                  value={formData.username}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, username: value }))}
                  placeholder="Select or type username"
                  searchPlaceholder="Search usernames..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sales_agent">Sales Agent *</Label>
                {isSalesman ? (
                  <div className="flex items-center h-10 px-3 rounded-md border text-sm bg-muted">
                    <span className="capitalize">{formData.sales_agent || user?.name}</span>
                    <Badge variant="secondary" className="ml-2">Auto-filled</Badge>
                  </div>
                ) : (
                  <Select 
                    value={formData.SalesAgentID || ''}
                    onValueChange={(v) => handleSelectChange('sales_agent', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesmanOptions.map((a: User) => (
                        <SelectItem key={a.id} value={a.id}>{a.name} - {a.team}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    {allUserOptions.map((a: User) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} - {a.role} - {a.team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team">Team *</Label>
                {isSalesman ? (
                  <div className="flex items-center h-10 px-3 rounded-md border text-sm bg-muted">
                    <span className="capitalize">{formData.team || user?.team}</span>
                    <Badge variant="secondary" className="ml-2">Auto-filled</Badge>
                  </div>
                ) : (
                  <Combobox
                    options={teamOptions}
                    value={formData.team}
                    onValueChange={(value) => handleSelectChange("team", value)}
                    placeholder="Select or type team name"
                    searchPlaceholder="Search teams..."
                    allowCustom={true}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration *</Label>
                <Combobox
                  options={durationOptions}
                  value={formData.duration}
                  onValueChange={(value) => handleSelectChange("duration", value)}
                  placeholder="Select or type duration"
                  searchPlaceholder="Search durations..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type_program">Type Program *</Label>
                <Combobox
                  options={programOptions}
                  value={formData.type_program}
                  onValueChange={(value) => handleSelectChange("type_program", value)}
                  placeholder="Select or type program type"
                  searchPlaceholder="Search programs..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type_service">Type Service *</Label>
                <Combobox
                  options={serviceOptions}
                  value={formData.type_service}
                  onValueChange={(value) => handleSelectChange("type_service", value)}
                  placeholder="Select or type service type"
                  searchPlaceholder="Search services..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice">Invoice Reference</Label>
                <Combobox
                  options={[...new Set((sales || []).map(s => s.invoice).filter(Boolean))].sort()}
                  value={formData.invoice}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, invoice: value }))}
                  placeholder="Select or type invoice reference"
                  searchPlaceholder="Search invoices..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="device_id">Device ID</Label>
                <Combobox
                  options={[...new Set((sales || []).map(s => s.device_id).filter(Boolean))].sort()}
                  value={formData.device_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, device_id: value }))}
                  placeholder="Select or type device ID"
                  searchPlaceholder="Search device IDs..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="device_key">Device Key</Label>
                <Combobox
                  options={[...new Set((sales || []).map(s => s.device_key).filter(Boolean))].sort()}
                  value={formData.device_key}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, device_key: value }))}
                  placeholder="Select or type device key"
                  searchPlaceholder="Search device keys..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="no_user">Number of Users *</Label>
                <Combobox
                  options={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
                  value={formData.no_user}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, no_user: value }))}
                  placeholder="Select or type number of users"
                  searchPlaceholder="Search user count..."
                  allowCustom={true}
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