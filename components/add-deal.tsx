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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showDealAdded, showError } from "@/lib/sweetalert";
import { useAuth } from "@/hooks/useAuth";
import { User } from "@/lib/auth";
import { apiService, Deal, User as APIUser } from "@/lib/api-service";
import { useToast } from "@/hooks/use-toast";

export function AddDealPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [salesmanOptions, setSalesmanOptions] = useState<User[]>([]);
  const [allUserOptions, setAllUserOptions] = useState<User[]>([]);
  const isSalesman = user?.role === 'salesman'
  const [sales, setSales] = useState<Deal[]>([])

  // Load users and sales data from MySQL API only
  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, salesData] = await Promise.all([
          apiService.getUsers(),
          apiService.getDeals()
        ])
        
        const salesmen = usersData.filter(u => u.role === 'salesman')
        const teamLeaders = usersData.filter(u => u.role === 'team-leader')
        const managers = usersData.filter(u => u.role === 'manager')
        
        setSalesmanOptions(salesmen as User[])
        setAllUserOptions([...salesmen, ...teamLeaders, ...managers] as User[])
        setSales(salesData)
      } catch (error) {
        console.error('Failed to load data:', error)
        toast({
          title: "Error",
          description: "Failed to load users and sales data",
          variant: "destructive"
        })
      }
    }
    
    loadData()
  }, [toast])

  // Dynamic options from current data
  const teamOptions = useMemo(() => {
    const set = new Set<string>()
    ;(sales || []).forEach(s => { if (s.salesTeam) set.add(s.salesTeam) })
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
    // Fixed service options only
    return ["GOLD", "PREMIUM", "SILVER"]
  }, [])

  // Program and Duration options derived from MySQL data
  const programOptions = useMemo(() => {
    const set = new Set<string>()
    ;(sales || []).forEach(s => { 
      const prog = (s.productType || '').toString().toUpperCase()
      if (prog) set.add(prog)
    })
    // Ensure sensible defaults are present
    ;["IBO PLAYER","BOB PLAYER","IBO PRO","SMARTERS","IBOSS"].forEach(v => set.add(v))
    return Array.from(set).sort()
  }, [sales])

  const durationOptions = useMemo(() => {
    const set = new Set<string>()
    ;(sales || []).forEach(s => { 
      // Convert durationMonths to duration labels
      const months = s.durationMonths
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
    team: user?.team || "CS TEAM", // Auto-populate with user's team
    duration: "TWO YEAR",
    type_program: "IBO PLAYER",
    type_service: "SILVER",
    invoice: "",
    device_id: "",
    device_key: "",
    comment: "",
    no_user: "1",
    SalesAgentID: user?.id || "",
    ClosingAgentID: "",
    // Callback fields
    is_callback: false,
    first_call_date: new Date().toISOString().split('T')[0],
    first_call_time: new Date().toTimeString().slice(0, 5),
    callback_notes: "",
    callback_reason: "",
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("customer-info");

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
      // Validate required fields based on type
      if (formData.is_callback) {
        if (!formData.customer_name || !formData.email || !formData.phone) {
          showError("Missing Information", "Please fill in all required fields: Customer Name, Email, and Phone.");
          setLoading(false);
          return;
        }
      } else {
        if (!formData.customer_name || !formData.email || !formData.phone || !formData.amount) {
          showError("Missing Information", "Please fill in all required fields: Customer Name, Email, Phone, and Amount.");
          setLoading(false);
          return;
        }
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

      // Handle callback vs deal submission
      if (formData.is_callback) {
        // Save as callback
        const callbackData = {
          customer_name: formData.customer_name,
          phone_number: formData.phone,
          email: formData.email,
          sales_agent: formData.sales_agent,
          sales_team: formData.team,
          first_call_date: formData.first_call_date,
          first_call_time: formData.first_call_time,
          callback_notes: formData.callback_notes,
          callback_reason: formData.callback_reason,
          status: 'pending' as const,
          created_by: user?.name || 'Unknown',
          created_by_id: user?.id || '',
          SalesAgentID: formData.SalesAgentID || user?.id || '',
        };

        console.log('Creating callback:', callbackData);
        
        // Save callback using API service
        try {
          await apiService.createCallback({
            customerName: callbackData.customer_name,
            phoneNumber: callbackData.phone_number,
            email: callbackData.email,
            salesAgentName: callbackData.sales_agent,
            salesTeam: callbackData.sales_team,
            firstCallDate: callbackData.first_call_date,
            firstCallTime: callbackData.first_call_time,
            callbackNotes: callbackData.callback_notes,
            callbackReason: callbackData.callback_reason,
            status: 'pending',
            priority: 'medium',
            followUpRequired: true,
            createdBy: callbackData.created_by,
            createdById: callbackData.created_by_id,
            salesAgentId: callbackData.SalesAgentID
          });
          
          await showDealAdded(0, formData.customer_name, 'Callback scheduled successfully!');
          // Toast detailed notification for callback creation
          toast({
            title: "Callback scheduled",
            description: `Customer: ${formData.customer_name} | Phone: ${formData.phone} | First call: ${formData.first_call_date} ${formData.first_call_time} | Sales: ${formData.sales_agent}${formData.team ? ` (${formData.team})` : ''}`,
          });
        } catch (error) {
          console.error('Error saving callback:', error);
          showError("Error", "Failed to save callback. Please try again.");
          setLoading(false);
          return;
        }
      } else {
        // Create deal using MySQL API service
        console.log('Creating deal with MySQL API service');
        
        const result = await apiService.createDeal({
          customerName: formData.customer_name,
          email: formData.email,
          phoneNumber: formData.phone,
          country: 'Unknown',
          amountPaid: parseFloat(formData.amount) || 0,
          serviceTier: formData.type_service as 'Silver' | 'Gold' | 'Premium',
          salesAgentId: formData.SalesAgentID || user?.id || '',
          closingAgentId: formData.ClosingAgentID || user?.id || '',
          salesTeam: formData.team,
          stage: 'closed-won',
          status: 'active',
          priority: 'medium',
          signupDate: formData.date,
          durationYears: Math.floor(getDurationMonths(formData.duration) / 12),
          durationMonths: getDurationMonths(formData.duration),
          numberOfUsers: parseInt(formData.no_user) || 1,
          notes: formData.comment,
          createdBy: user?.name || 'Unknown'
        });
        console.log('Deal created successfully with ID:', result.id);

        await showDealAdded(parseFloat(formData.amount), formData.customer_name);
        // Toast detailed notification for deal creation
        toast({
          title: "Deal created",
          description: `Customer: ${formData.customer_name} | Amount: ${formData.amount} | Program: ${formData.type_program} | Duration: ${formData.duration} | Service: ${formData.type_service} | Sales: ${formData.sales_agent}${formData.team ? ` (${formData.team})` : ''}`,
        });
      }

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
        type_service: "SILVER",
        invoice: "",
        device_id: "",
        device_key: "",
        comment: "",
        no_user: "1",
        SalesAgentID: user?.id || "",
        ClosingAgentID: "",
        // Reset callback fields
        is_callback: false,
        first_call_date: new Date().toISOString().split('T')[0],
        first_call_time: new Date().toTimeString().slice(0, 5),
        callback_notes: "",
        callback_reason: "",
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="customer-info">Customer Information</TabsTrigger>
                <TabsTrigger value="deal-info" disabled={!formData.customer_name || !formData.phone || !formData.email}>Deal Information</TabsTrigger>
              </TabsList>
              
              <TabsContent value="customer-info" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Combobox
                  options={[...new Set((sales || []).map(s => s.customerName).filter(Boolean))].sort()}
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
                  options={[...new Set((sales || []).map(s => s.phoneNumber).filter(Boolean) as string[])].sort()}
                  value={formData.phone}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  placeholder="Select or type phone number"
                  searchPlaceholder="Search phone numbers..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address </Label>
                <Combobox
                  options={[...new Set((sales || []).map(s => s.email).filter(Boolean) as string[])].sort()}
                  value={formData.email}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                  placeholder="Select or type email address"
                  searchPlaceholder="Search emails..."
                  allowCustom={true}
                />
              </div>
                </div>

                {/* Callback/Deal Type Selection */}
                <div className="space-y-4 p-6 border-2 border-dashed border-cyan-400 rounded-lg bg-white/10 backdrop-blur-sm shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <input
                          type="checkbox"
                          id="is_callback"
                          checked={formData.is_callback}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, is_callback: e.target.checked }));
                            if (!e.target.checked) {
                              setActiveTab("deal-info");
                            }
                          }}
                          className="w-6 h-6 text-cyan-500 bg-slate-700 border-2 border-cyan-400 rounded focus:ring-cyan-500 focus:ring-2 cursor-pointer"
                        />
                      </div>
                      <Label htmlFor="is_callback" className="text-lg font-bold text-cyan-300 cursor-pointer select-none">
                        📞 Schedule Callback (Not a completed deal)
                      </Label>
                    </div>
                    <Badge 
                      variant={formData.is_callback ? "default" : "secondary"} 
                      className={`ml-2 px-3 py-1 text-sm font-semibold ${
                        formData.is_callback 
                          ? "bg-cyan-500 text-white" 
                          : "bg-slate-600 text-slate-200"
                      }`}
                    >
                      {formData.is_callback ? "🔔 Callback Mode" : "💰 Deal Mode"}
                    </Badge>
                  </div>
                  
                  <div className={`p-4 rounded-lg ${
                    formData.is_callback 
                      ? "bg-cyan-500/20 border border-cyan-400/30" 
                      : "bg-slate-700/30 border border-slate-500/30"
                  }`}>
                    <p className="text-sm font-medium text-white">
                      {formData.is_callback 
                        ? "📞 You're scheduling a callback for future follow-up with this customer"
                        : "💰 You're adding a completed deal with payment information"
                      }
                    </p>
                  </div>

                  {formData.is_callback && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_call_date">First Call Date *</Label>
                        <Input
                          type="date"
                          id="first_call_date"
                          name="first_call_date"
                          value={formData.first_call_date}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="first_call_time">First Call Time *</Label>
                        <Input
                          type="time"
                          id="first_call_time"
                          name="first_call_time"
                          value={formData.first_call_time}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="callback_reason">Callback Reason</Label>
                        <Select 
                          value={formData.callback_reason}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, callback_reason: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select callback reason" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer-busy">Customer was busy</SelectItem>
                            <SelectItem value="needs-time">Customer needs time to think</SelectItem>
                            <SelectItem value="technical-questions">Technical questions</SelectItem>
                            <SelectItem value="pricing-discussion">Pricing discussion needed</SelectItem>
                            <SelectItem value="decision-maker">Need to speak with decision maker</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="callback_notes">Callback Notes</Label>
                        <Textarea
                          id="callback_notes"
                          name="callback_notes"
                          value={formData.callback_notes}
                          onChange={handleChange}
                          rows={3}
                          placeholder="Notes about the call and what to discuss in the callback..."
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {!formData.is_callback && (
                  <div className="flex justify-end">
                    <Button 
                      type="button"
                      onClick={() => setActiveTab("deal-info")}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                      Continue to Deal Information
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="deal-info" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  options={[...new Set((sales || []).map(s => (s as any).username).filter(Boolean) as string[])].sort()}
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
                  <div className="flex items-center h-10 px-3 rounded-md border text-sm bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700">
                    <span className="text-red-600 dark:text-red-400">Sales Agent Selection Forbidden</span>
                    <Badge variant="destructive" className="ml-2">Restricted</Badge>
                  </div>
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
                <Select 
                  value={formData.type_program}
                  onValueChange={(value) => handleSelectChange("type_program", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program type" />
                  </SelectTrigger>
                  <SelectContent>
                    {programOptions.map((program) => (
                      <SelectItem key={program} value={program}>{program}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type_service">Type Service *</Label>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {serviceOptions.map((service) => (
                      <label key={service} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="type_service"
                          value={service}
                          checked={formData.type_service === service}
                          onChange={(e) => handleSelectChange("type_service", e.target.value)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-300">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice">Invoice Reference</Label>
                <Combobox
                  options={[...new Set((sales || []).map(s => (s as any).invoice).filter(Boolean) as string[])].sort()}
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
                  options={[...new Set((sales || []).map(s => (s as any).device_id).filter(Boolean) as string[])].sort()}
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
                  options={[...new Set((sales || []).map(s => (s as any).device_key).filter(Boolean) as string[])].sort()}
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
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-4">
              {activeTab === "deal-info" && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("customer-info")}
                >
                  Back to Customer Info
                </Button>
              )}
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                disabled={loading}
              >
                {loading ? (formData.is_callback ? "Scheduling Callback..." : "Adding Deal...") : (formData.is_callback ? "Schedule Callback" : "Add Deal")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}