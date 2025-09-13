"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { userService } from "@/lib/firebase-user-service";
import { Badge } from "@/components/ui/badge";
import { callbacksService } from "@/lib/firebase-callbacks-service";

export function SimpleAddDeal() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [salesmenUsers, setSalesmenUsers] = useState<Array<{id: string, name: string, username: string}>>([]);
  
  const [formData, setFormData] = useState({
    customer_name: "",
    phone_number: "",
    email: "",
    amount_paid: 0,
    duration_months: 0,
    duration_years: 1,
    number_of_users: 1,
    sales_agent: user?.name || "",
    closing_agent: user?.name || "",
    closing_agent_id: user?.id || "",
    sales_team: user?.team || "",
    country: "",
    signup_date: new Date().toISOString().split('T')[0],
    notes: "",
    status: "active" as const,
    stage: "closed-won" as const,
    priority: "medium" as const,
    service_feature: "" as string, // Single selection for service features
    is_ibo_player: false,
    is_bob_player: false,
    is_smarters: false,
    is_ibo_pro: false,
    is_iboss: false,
    // Callback fields
    is_callback: false,
    first_call_date: new Date().toISOString().split('T')[0],
    first_call_time: new Date().toTimeString().slice(0, 5),
    callback_notes: "",
    callback_reason: ""
  });

  // Load salesmen users on component mount
  useEffect(() => {
    const loadSalesmen = async () => {
      try {
        const users = await userService.getUsersByRole('salesman');
        setSalesmenUsers(users.map(u => ({ id: u.id, name: u.name, username: u.username })));
      } catch (error) {
        console.error('Error loading salesmen:', error);
      }
    };
    loadSalesmen();
  }, []);

  // Calculate derived values
  const totalDurationMonths = formData.duration_years * 12 + formData.duration_months;
  const endDate = new Date(formData.signup_date);
  endDate.setMonth(endDate.getMonth() + totalDurationMonths);
  
  const paidPerMonth = totalDurationMonths > 0 ? formData.amount_paid / totalDurationMonths : 0;
  const paidPerDay = paidPerMonth / 30.44; // Average days per month
  
  const today = new Date();
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'amount_paid') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (name === 'duration_months') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else if (name === 'duration_years') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 1 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'number_of_users' || name === 'duration_months' || name === 'duration_years') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle service feature checkbox selection (only one can be selected)
  const handleServiceFeatureChange = (feature: string, checked: boolean) => {
    if (checked) {
      // Reset all service features and set only the selected one
      setFormData(prev => ({
        ...prev,
        service_feature: feature,
        is_ibo_player: feature === 'ibo_player',
        is_bob_player: feature === 'bob_player', 
        is_smarters: feature === 'smarters',
        is_ibo_pro: feature === 'ibo_pro',
        is_iboss: feature === 'iboss'
      }));
    } else {
      // If unchecking, clear all selections
      setFormData(prev => ({
        ...prev,
        service_feature: '',
        is_ibo_player: false,
        is_bob_player: false,
        is_smarters: false,
        is_ibo_pro: false,
        is_iboss: false
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.is_callback) {
        // Validate callback fields
        if (!formData.customer_name || !formData.email || !formData.phone_number || !formData.first_call_date || !formData.first_call_time) {
          toast({
            title: "Validation Error",
            description: "Please fill in all required callback fields: Customer Name, Email, Phone, Call Date, and Call Time.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Create callback
        const callbackData = {
          customer_name: formData.customer_name,
          phone_number: formData.phone_number,
          email: formData.email,
          sales_agent: user?.name || 'Unknown',
          sales_team: user?.team || 'Unknown',
          first_call_date: formData.first_call_date,
          first_call_time: formData.first_call_time,
          callback_reason: formData.callback_reason,
          callback_notes: formData.callback_notes,
          status: 'pending' as const,
          created_by: user?.name || 'Unknown',
          created_by_id: user?.id || '',
          SalesAgentID: user?.id || ''
        };

        console.log('Creating callback with Firebase service:', callbackData);
        const callbackId = await callbacksService.addCallback(callbackData);
        console.log('Callback created successfully with ID:', callbackId);

        toast({
          title: "Callback scheduled successfully!",
          description: `Callback for "${formData.customer_name}" has been scheduled for ${formData.first_call_date} at ${formData.first_call_time}.`,
        });
      } else {
        // Validate deal fields
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

        toast({
          title: "Deal added successfully!",
          description: `Deal for "${formData.customer_name}" has been created with automatic notifications.`,
        });
      }

      // Reset form
      setFormData({
        customer_name: "",
        phone_number: "",
        email: "",
        amount_paid: 0,
        duration_months: 0,
        duration_years: 1,
        number_of_users: 1,
        sales_agent: user?.name || "",
        closing_agent: user?.name || "",
        closing_agent_id: user?.id || "",
        sales_team: user?.team || "",
        country: "",
        signup_date: new Date().toISOString().split('T')[0],
        notes: "",
        status: "active" as const,
        stage: "closed-won" as const,
        priority: "medium" as const,
        service_feature: "",
        is_ibo_player: false,
        is_bob_player: false,
        is_smarters: false,
        is_ibo_pro: false,
        is_iboss: false,
        is_callback: false,
        first_call_date: new Date().toISOString().split('T')[0],
        first_call_time: new Date().toTimeString().slice(0, 5),
        callback_notes: "",
        callback_reason: ""
      });

      // Refresh and redirect
      router.refresh();
      setTimeout(() => {
        router.push('/');
      }, 1500);

    } catch (error) {
      console.error('Error adding deal/callback:', error);
      toast({
        title: "Error",
        description: "There was an error processing your request. Please try again.",
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
              <Label htmlFor="number_of_users">Number of Users *</Label>
              <Select value={formData.number_of_users.toString()} onValueChange={(value) => handleSelectChange('number_of_users', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select number of users" />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,15,20,25,30,50,100].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'User' : 'Users'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_months">Duration (Months) *</Label>
              <Select value={formData.duration_months.toString()} onValueChange={(value) => handleSelectChange('duration_months', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select months" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 13}, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>{i} {i === 1 ? 'Month' : 'Months'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_years">Duration (Years) *</Label>
              <Select value={formData.duration_years.toString()} onValueChange={(value) => handleSelectChange('duration_years', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select years" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 10}, (_, i) => i + 1).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year} {year === 1 ? 'Year' : 'Years'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales_agent">Sales Agent *</Label>
              <Input
                id="sales_agent"
                name="sales_agent"
                value={formData.sales_agent}
                onChange={handleChange}
                disabled={true}
                className="bg-muted font-medium"
                placeholder="Cannot be changed"
              />
              <p className="text-xs text-muted-foreground">Agent Information - Cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="closing_agent">Closing Agent *</Label>
              <Select 
                value={formData.closing_agent_id} 
                onValueChange={(value) => {
                  const selectedUser = salesmenUsers.find(u => u.id === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    closing_agent_id: value,
                    closing_agent: selectedUser?.name || ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select closing agent" />
                </SelectTrigger>
                <SelectContent>
                  {salesmenUsers.map(salesman => (
                    <SelectItem key={salesman.id} value={salesman.id}>
                      {salesman.name} {salesman.id === user?.id ? '(You)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Callback/Deal Type Selection - Enhanced Design */}
          <div className="mb-8 p-8 border-2 border-dashed border-cyan-400 rounded-xl bg-gradient-to-br from-cyan-50/10 to-blue-50/10 backdrop-blur-sm shadow-xl">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">📋 Choose Action Type</h3>
              <p className="text-sm text-gray-600">Select whether you want to create a completed deal or schedule a callback</p>
            </div>
            
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-4 bg-white rounded-full p-2 shadow-lg border border-cyan-200">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="is_callback"
                    checked={formData.is_callback}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, is_callback: e.target.checked }));
                    }}
                    className="w-8 h-8 text-cyan-500 bg-white border-3 border-cyan-400 rounded-lg focus:ring-cyan-500 focus:ring-4 cursor-pointer shadow-md"
                  />
                </div>
                <Label htmlFor="is_callback" className="text-lg font-bold text-gray-800 cursor-pointer select-none px-4 py-2 rounded-full transition-all duration-200 hover:bg-cyan-50">
                  📞 Schedule Callback (Not a completed deal)
                </Label>
              </div>
            </div>
            
            <div className="flex justify-center mb-4">
              <Badge 
                variant={formData.is_callback ? "default" : "secondary"} 
                className={`px-6 py-2 text-base font-bold rounded-full transition-all duration-300 ${
                  formData.is_callback 
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg transform scale-105" 
                    : "bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md"
                }`}
              >
                {formData.is_callback ? "🔔 Callback Mode" : "💰 Deal Mode"}
              </Badge>
            </div>
            
            <div className={`p-6 rounded-xl transition-all duration-300 ${
              formData.is_callback 
                ? "bg-gradient-to-r from-cyan-100 to-blue-100 border-2 border-cyan-300 shadow-lg" 
                : "bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-300 shadow-md"
            }`}>
              <p className={`text-center font-medium ${
                formData.is_callback ? "text-cyan-800" : "text-gray-700"
              }`}>
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Service Features Section - Only show if not callback */}
          {!formData.is_callback && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">🛠️ Service Features</h3>
            <p className="text-sm text-purple-700 mb-4">Select one service feature (only one can be selected at a time):</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-purple-100 hover:border-purple-300 transition-colors">
                <Checkbox
                  id="ibo_player"
                  checked={formData.is_ibo_player}
                  onCheckedChange={(checked) => handleServiceFeatureChange('ibo_player', checked as boolean)}
                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="ibo_player" className="text-sm font-medium cursor-pointer">
                  IBO Player
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-purple-100 hover:border-purple-300 transition-colors">
                <Checkbox
                  id="bob_player"
                  checked={formData.is_bob_player}
                  onCheckedChange={(checked) => handleServiceFeatureChange('bob_player', checked as boolean)}
                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="bob_player" className="text-sm font-medium cursor-pointer">
                  BOB Player
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-purple-100 hover:border-purple-300 transition-colors">
                <Checkbox
                  id="smarters"
                  checked={formData.is_smarters}
                  onCheckedChange={(checked) => handleServiceFeatureChange('smarters', checked as boolean)}
                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="smarters" className="text-sm font-medium cursor-pointer">
                  Smarters
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-purple-100 hover:border-purple-300 transition-colors">
                <Checkbox
                  id="ibo_pro"
                  checked={formData.is_ibo_pro}
                  onCheckedChange={(checked) => handleServiceFeatureChange('ibo_pro', checked as boolean)}
                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="ibo_pro" className="text-sm font-medium cursor-pointer">
                  IBO Pro
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-purple-100 hover:border-purple-300 transition-colors">
                <Checkbox
                  id="iboss"
                  checked={formData.is_iboss}
                  onCheckedChange={(checked) => handleServiceFeatureChange('iboss', checked as boolean)}
                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="iboss" className="text-sm font-medium cursor-pointer">
                  IBOSS
                </Label>
              </div>
            </div>

            {formData.service_feature && (
              <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                <div className="text-sm font-medium text-purple-800">
                  Selected Feature: <span className="capitalize">{formData.service_feature.replace('_', ' ')}</span>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Calculated Information Section - Only show if not callback */}
          {!formData.is_callback && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                <div className="text-sm font-medium text-gray-600">End Date</div>
                <div className="text-lg font-bold text-blue-600">
                  {endDate.toLocaleDateString()}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
                <div className="text-sm font-medium text-gray-600">Paid per Month</div>
                <div className="text-lg font-bold text-green-600">
                  ${paidPerMonth.toFixed(2)}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                <div className="text-sm font-medium text-gray-600">Paid per Day</div>
                <div className="text-lg font-bold text-purple-600">
                  ${paidPerDay.toFixed(2)}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                <div className="text-sm font-medium text-gray-600">Days Remaining</div>
                <div className="text-lg font-bold text-orange-600">
                  {daysRemaining} days
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <div className="text-sm font-medium text-blue-800">
                Total Duration: {totalDurationMonths} months ({formData.duration_years} years, {formData.duration_months} months)
              </div>
            </div>
          </div>
          )}

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
              {loading ? "Saving..." : (formData.is_callback ? "Schedule Callback" : "Save Deal")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
