"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, DollarSign, User, Building, Package, Settings, Save, X } from "lucide-react"
import { dealsService } from "@/lib/firebase-deals-service"
import { userService } from "@/lib/firebase-user-service"
import { User as UserType } from "@/lib/auth"

interface EnhancedAddDealProps {
  currentUser: UserType
  onClose?: () => void
  onSuccess?: (dealId: string) => void
}

export default function EnhancedAddDeal({ currentUser, onClose, onSuccess }: EnhancedAddDealProps) {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserType[]>([])
  const [formData, setFormData] = useState({
    // Customer Information
    customer_name: '',
    email: '',
    phone_number: '',
    country: '',
    
    // Deal Information
    signup_date: new Date().toISOString().split('T')[0],
    amount_paid: 0,
    duration_months: 12,
    duration_years: 0,
    product_type: '',
    service_tier: '',
    
    // Agent Information
    sales_agent: currentUser.name,
    closing_agent: currentUser.name,
    sales_team: currentUser.team || '',
    SalesAgentID: currentUser.id || '',
    ClosingAgentID: currentUser.id || '',
    
    // Service Features
    is_ibo_player: false,
    is_bob_player: false,
    is_smarters: false,
    is_ibo_pro: false,
    is_iboss: false,
    
    // Additional Information
    invoice_link: '',
    notes: '',
    status: 'active' as const,
    stage: 'closed-won' as const,
    priority: 'medium' as const
  })

  // Calculated fields (read-only)
  const [calculatedFields, setCalculatedFields] = useState({
    end_date: '',
    paid_per_month: 0,
    paid_per_day: 0,
    days_remaining: 0,
    data_month: 0,
    data_year: 0,
    end_year: 0
  })

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    calculateFields()
  }, [formData.signup_date, formData.amount_paid, formData.duration_months, formData.duration_years])

  const loadUsers = async () => {
    try {
      const allUsers = await userService.getAllUsers()
      setUsers(allUsers.filter(user => user.role === 'salesman' || user.role === 'manager'))
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const calculateFields = () => {
    const totalMonths = formData.duration_months + (formData.duration_years * 12)
    if (!formData.signup_date || !formData.amount_paid || totalMonths === 0) return

    const signupDate = new Date(formData.signup_date)
    const endDate = new Date(signupDate)
    endDate.setMonth(endDate.getMonth() + totalMonths)
    
    const today = new Date()
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    const paidPerMonth = formData.amount_paid / totalMonths
    const paidPerDay = formData.amount_paid / (totalMonths * 30)

    setCalculatedFields({
      end_date: endDate.toISOString().split('T')[0],
      paid_per_month: Math.round(paidPerMonth * 100) / 100,
      paid_per_day: Math.round(paidPerDay * 100) / 100,
      days_remaining: daysRemaining,
      data_month: signupDate.getMonth() + 1,
      data_year: signupDate.getFullYear(),
      end_year: endDate.getFullYear()
    })
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAgentChange = (field: 'sales_agent' | 'closing_agent', value: string) => {
    const selectedUser = users.find(user => user.name === value)
    if (selectedUser) {
      const updates: any = { [field]: value }
      if (field === 'sales_agent') {
        updates.SalesAgentID = selectedUser.id
        updates.sales_team = selectedUser.team || ''
      } else {
        updates.ClosingAgentID = selectedUser.id
      }
      setFormData(prev => ({ ...prev, ...updates }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.customer_name || !formData.email || !formData.phone_number || !formData.amount_paid) {
        alert('Please fill in all required fields: Customer Name, Email, Phone, and Amount Paid')
        setLoading(false)
        return
      }

      console.log('Creating deal with data:', formData)

      // Combine form data with calculated fields
      const dealData = {
        ...formData,
        ...calculatedFields,
        // These will be calculated automatically by the service
        sales_agent_norm: formData.sales_agent.toLowerCase().replace(/\s+/g, '_'),
        closing_agent_norm: formData.closing_agent.toLowerCase().replace(/\s+/g, '_'),
        duration_mean_paid: formData.amount_paid / formData.duration_months,
        // These will be calculated by the service based on existing data
        agent_avg_paid: 0,
        is_above_avg: false,
        paid_rank: 0,
        created_by: currentUser.id || currentUser.username
      }

      console.log('Processed deal data:', dealData)
      const dealId = await dealsService.createDeal(dealData, currentUser)
      console.log('Deal created successfully with ID:', dealId)
      
      // Show success message
      alert(`Deal for "${formData.customer_name}" created successfully! Deal ID: ${dealId}`)
      
      if (onSuccess) {
        onSuccess(dealId)
      }
      
      // Reset form
      setFormData({
        customer_name: '',
        email: '',
        phone_number: '',
        country: '',
        signup_date: new Date().toISOString().split('T')[0],
        amount_paid: 0,
        duration_months: 12,
        duration_years: 0,
        product_type: '',
        service_tier: '',
        sales_agent: currentUser.name,
        closing_agent: currentUser.name,
        sales_team: currentUser.team || '',
        SalesAgentID: currentUser.id || '',
        ClosingAgentID: currentUser.id || '',
        is_ibo_player: false,
        is_bob_player: false,
        is_smarters: false,
        is_ibo_pro: false,
        is_iboss: false,
        invoice_link: '',
        notes: '',
        status: 'active' as const,
        stage: 'closed-won' as const,
        priority: 'medium' as const
      })

    } catch (error) {
      console.error('Error creating deal:', error)
      alert('Failed to create deal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Add New Deal
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new deal with automatic calculations and tracking
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Customer Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Customer Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Deal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Deal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="signup_date">Signup Date *</Label>
                  <Input
                    id="signup_date"
                    type="date"
                    value={formData.signup_date}
                    onChange={(e) => handleInputChange('signup_date', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="amount_paid">Amount Paid ($) *</Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount_paid}
                    onChange={(e) => handleInputChange('amount_paid', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="duration_months">Duration (Months) *</Label>
                  <Select value={formData.duration_months.toString()} onValueChange={(value) => handleInputChange('duration_months', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select months" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 13}, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>{i} months</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="duration_years">Duration (Years)</Label>
                  <Select value={formData.duration_years?.toString() || '0'} onValueChange={(value) => handleInputChange('duration_years', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select years" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 7}, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>{i} years</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="service_tier">Service Tier</Label>
                  <Select value={formData.service_tier} onValueChange={(value) => handleInputChange('service_tier', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Silver">Silver</SelectItem>
                      <SelectItem value="Gold">Gold</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Agent Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Agent Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sales_agent">Sales Agent *</Label>
                  <Select value={formData.sales_agent} onValueChange={(value) => handleAgentChange('sales_agent', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.name}>
                          {user.name} ({user.team})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="closing_agent">Closing Agent *</Label>
                  <Select value={formData.closing_agent} onValueChange={(value) => handleAgentChange('closing_agent', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select closing agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.name}>
                          {user.name} ({user.team})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="sales_team">Sales Team</Label>
                <Input
                  id="sales_team"
                  value={formData.sales_team}
                  onChange={(e) => handleInputChange('sales_team', e.target.value)}
                  placeholder="Team will be auto-filled based on sales agent"
                  readOnly
                />
              </div>
            </div>

            {/* Service Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Service Features</h3>
              </div>
              
              <div className="space-y-3">
                <Label>Program Type *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="program_type"
                      value="IBO Player"
                      checked={formData.is_ibo_player}
                      onChange={() => {
                        handleInputChange('is_ibo_player', true)
                        handleInputChange('is_bob_player', false)
                        handleInputChange('is_smarters', false)
                        handleInputChange('is_ibo_pro', false)
                        handleInputChange('is_iboss', false)
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">IBO Player</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="program_type"
                      value="BOB Player"
                      checked={formData.is_bob_player}
                      onChange={() => {
                        handleInputChange('is_ibo_player', false)
                        handleInputChange('is_bob_player', true)
                        handleInputChange('is_smarters', false)
                        handleInputChange('is_ibo_pro', false)
                        handleInputChange('is_iboss', false)
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">BOB Player</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="program_type"
                      value="Smarters"
                      checked={formData.is_smarters}
                      onChange={() => {
                        handleInputChange('is_ibo_player', false)
                        handleInputChange('is_bob_player', false)
                        handleInputChange('is_smarters', true)
                        handleInputChange('is_ibo_pro', false)
                        handleInputChange('is_iboss', false)
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Smarters</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="program_type"
                      value="IBO Pro"
                      checked={formData.is_ibo_pro}
                      onChange={() => {
                        handleInputChange('is_ibo_player', false)
                        handleInputChange('is_bob_player', false)
                        handleInputChange('is_smarters', false)
                        handleInputChange('is_ibo_pro', true)
                        handleInputChange('is_iboss', false)
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">IBO Pro</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="program_type"
                      value="IBOSS"
                      checked={formData.is_iboss}
                      onChange={() => {
                        handleInputChange('is_ibo_player', false)
                        handleInputChange('is_bob_player', false)
                        handleInputChange('is_smarters', false)
                        handleInputChange('is_ibo_pro', false)
                        handleInputChange('is_iboss', true)
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">IBOSS</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Calculated Fields Display */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Calculated Information</h3>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">Auto-calculated</Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-blue-700 dark:text-blue-300">End Date</Label>
                  <Input value={calculatedFields.end_date} readOnly className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-600" />
                </div>
                
                <div>
                  <Label className="text-blue-700 dark:text-blue-300">Paid per Month</Label>
                  <Input value={`$${calculatedFields.paid_per_month}`} readOnly className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-600" />
                </div>
                
                <div>
                  <Label className="text-blue-700 dark:text-blue-300">Paid per Day</Label>
                  <Input value={`$${calculatedFields.paid_per_day}`} readOnly className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-600" />
                </div>
                
                <div>
                  <Label className="text-blue-700 dark:text-blue-300">Days Remaining</Label>
                  <Input value={calculatedFields.days_remaining} readOnly className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-600" />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="stage">Stage</Label>
                  <Select value={formData.stage} onValueChange={(value: any) => handleInputChange('stage', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="closed-won">Closed Won</SelectItem>
                      <SelectItem value="closed-lost">Closed Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="invoice_link">Invoice Link</Label>
                <Input
                  id="invoice_link"
                  type="url"
                  value={formData.invoice_link}
                  onChange={(e) => handleInputChange('invoice_link', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this deal..."
                  rows={3}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              {onClose && (
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Creating Deal...' : 'Create Deal'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
