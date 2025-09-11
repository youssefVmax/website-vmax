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
    duration_months: 0,
    duration_years: 1,
    number_of_users: 1,
    sales_agent: user?.name || "",
    closing_agent: user?.name || "",
    sales_team: user?.team || "",
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
        duration_months: 0,
        duration_years: 1,
        number_of_users: 1,
        sales_agent: user?.name || "",
        closing_agent: user?.name || "",
        sales_team: user?.team || "",
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
              <Label htmlFor="duration_months">Duration - Months (0-12) *</Label>
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
              <Label htmlFor="duration_years">Duration - Years *</Label>
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

          {/* Calculated Information Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">📊 Calculated Information</h3>
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
