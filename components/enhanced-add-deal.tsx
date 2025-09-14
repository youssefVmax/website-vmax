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
import { showDealAdded, showError, showLoading } from "@/lib/sweetalert"
import { useToast } from "@/hooks/use-toast"

interface EnhancedAddDealProps {
  currentUser: UserType
  onClose?: () => void
  onSuccess?: (dealId: string) => void
}

export default function EnhancedAddDeal({ currentUser, onClose, onSuccess }: EnhancedAddDealProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserType[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    // Customer Information
    customer_name: '',
    email: '',
    phone_number: '',
    country: '',
    custom_country: '',
    
    // Deal Information
    signup_date: new Date().toISOString().split('T')[0],
    amount_paid: 0,
    duration_months: 12,
    duration_years: 0,
    number_of_users: 1,
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
    device_key: '',
    device_id: '',
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

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    // Required text fields validation
    if (!formData.customer_name?.trim()) {
      errors.customer_name = 'Customer name is required';
    }

    // Email validation
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (!formData.phone_number?.trim()) {
      errors.phone_number = 'Phone number is required';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone_number.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone_number = 'Please enter a valid phone number';
    }

    // Country validation
    if (!formData.country) {
      errors.country = 'Country is required';
    } else if (formData.country === 'Other' && !formData.custom_country?.trim()) {
      errors.custom_country = 'Please specify the country name';
    }

    // Amount validation
    if (!formData.amount_paid || formData.amount_paid <= 0) {
      errors.amount_paid = 'Amount paid must be greater than 0';
    }

    // Date validation
    if (!formData.signup_date) {
      errors.signup_date = 'Signup date is required';
    } else {
      const signupDate = new Date(formData.signup_date);
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      
      if (signupDate > today) {
        errors.signup_date = 'Signup date cannot be in the future';
      } else if (signupDate < oneYearAgo) {
        errors.signup_date = 'Signup date cannot be more than 1 year ago';
      }
    }

    // Duration validation
    const totalMonths = formData.duration_months + (formData.duration_years * 12);
    if (totalMonths === 0) {
      errors.duration = 'Duration must be at least 1 month';
    }

    // Service tier validation
    if (!formData.service_tier) {
      errors.service_tier = 'Service tier is required';
    }

    // Program type validation
    const isProgramTypeSelected = formData.is_ibo_player || formData.is_bob_player || 
                                 formData.is_smarters || formData.is_ibo_pro || formData.is_iboss;
    if (!isProgramTypeSelected) {
      errors.program_type = 'Please select a program type';
    }

    // Closing agent validation
    if (!formData.closing_agent) {
      errors.closing_agent = 'Closing agent is required';
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const validation = validateForm();
    setValidationErrors(validation.errors);
    
    if (!validation.isValid) {
      const errorCount = Object.keys(validation.errors).length;
      const firstError = Object.values(validation.errors)[0];
      
      toast({
        title: "⚠️ Validation Error",
        description: `${errorCount} field${errorCount > 1 ? 's need' : ' needs'} attention: ${firstError}`,
        duration: 5000,
        variant: "destructive",
        className: "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-800"
      });
      
      // Scroll to first error field
      const firstErrorField = Object.keys(validation.errors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      
      return;
    }
    
    // Clear validation errors on successful validation
    setValidationErrors({});
    
    setLoading(true);

    try {
      console.log('Creating deal with data:', formData);

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
      
      // Show success message with toast notification
      toast({
        title: "🎉 Deal Created Successfully!",
        description: `$${formData.amount_paid.toLocaleString()} deal for ${formData.customer_name}`,
        duration: 4000,
        className: "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-800"
      });
      
      if (onSuccess) {
        onSuccess(dealId);
      }
      
      // Reset form and validation errors
      setValidationErrors({});
      setFormData({
        customer_name: '',
        email: '',
        phone_number: '',
        country: '',
        custom_country: '',
        signup_date: new Date().toISOString().split('T')[0],
        amount_paid: 0,
        duration_months: 12,
        duration_years: 0,
        number_of_users: 1,
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
        device_key: '',
        device_id: '',
        notes: '',
        status: 'active' as const,
        stage: 'closed-won' as const,
        priority: 'medium' as const
      });
    } catch (error) {
      console.error('Error creating deal:', error)
      toast({
        title: "❌ Deal Creation Failed",
        description: "Failed to create deal. Please try again.",
        duration: 5000,
        variant: "destructive",
        className: "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-800"
      });
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
                    onChange={(e) => {
                      handleInputChange('customer_name', e.target.value)
                      if (validationErrors.customer_name) {
                        setValidationErrors(prev => ({ ...prev, customer_name: '' }))
                      }
                    }}
                    className={validationErrors.customer_name ? 'border-red-500 focus:border-red-500' : ''}
                    placeholder="Enter customer's full name"
                    required
                  />
                  {validationErrors.customer_name && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.customer_name}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      handleInputChange('email', e.target.value)
                      if (validationErrors.email) {
                        setValidationErrors(prev => ({ ...prev, email: '' }))
                      }
                    }}
                    className={validationErrors.email ? 'border-red-500 focus:border-red-500' : ''}
                    placeholder="customer@example.com"
                    required
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => {
                      handleInputChange('phone_number', e.target.value)
                      if (validationErrors.phone_number) {
                        setValidationErrors(prev => ({ ...prev, phone_number: '' }))
                      }
                    }}
                    className={validationErrors.phone_number ? 'border-red-500 focus:border-red-500' : ''}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                  {validationErrors.phone_number && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.phone_number}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select value={formData.country} onValueChange={(value) => {
                    handleInputChange('country', value)
                    if (validationErrors.country) {
                      setValidationErrors(prev => ({ ...prev, country: '' }))
                    }
                  }}>
                    <SelectTrigger className={validationErrors.country ? 'border-red-500 focus:border-red-500' : ''}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USA">USA</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="Germany">Germany</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="Other">Other (specify below)</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.country && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.country}</p>
                  )}
                  {formData.country === 'Other' && (
                    <div className="mt-2">
                      <Input
                        id="custom_country"
                        placeholder="Enter country name"
                        value={formData.custom_country || ''}
                        onChange={(e) => {
                          handleInputChange('custom_country', e.target.value)
                          if (validationErrors.custom_country) {
                            setValidationErrors(prev => ({ ...prev, custom_country: '' }))
                          }
                        }}
                        className={validationErrors.custom_country ? 'border-red-500 focus:border-red-500' : ''}
                        required
                      />
                      {validationErrors.custom_country && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.custom_country}</p>
                      )}
                    </div>
                  )}
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
                    onChange={(e) => {
                      handleInputChange('signup_date', e.target.value)
                      if (validationErrors.signup_date) {
                        setValidationErrors(prev => ({ ...prev, signup_date: '' }))
                      }
                    }}
                    className={validationErrors.signup_date ? 'border-red-500 focus:border-red-500' : ''}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                  {validationErrors.signup_date && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.signup_date}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="amount_paid">Amount Paid ($) *</Label>
                  <Input
                    id="amount_paid"
                    type="text"
                    value={formData.amount_paid === 0 ? '' : formData.amount_paid.toString()}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty string or valid numbers
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        handleInputChange('amount_paid', value === '' ? 0 : parseFloat(value))
                        if (validationErrors.amount_paid) {
                          setValidationErrors(prev => ({ ...prev, amount_paid: '' }))
                        }
                      }
                    }}
                    className={validationErrors.amount_paid ? 'border-red-500 focus:border-red-500' : ''}
                    placeholder="Enter amount (e.g., 299.99)"
                    required
                  />
                  {validationErrors.amount_paid && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.amount_paid}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="duration_months">Duration (Months)</Label>
                  <Select value={formData.duration_months.toString()} onValueChange={(value) => handleInputChange('duration_months', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select months" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 12}, (_, i) => (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service_tier">Service Tier *</Label>
                  <Select value={formData.service_tier} onValueChange={(value) => {
                    handleInputChange('service_tier', value)
                    if (validationErrors.service_tier) {
                      setValidationErrors(prev => ({ ...prev, service_tier: '' }))
                    }
                  }}>
                    <SelectTrigger className={validationErrors.service_tier ? 'border-red-500 focus:border-red-500' : ''}>
                      <SelectValue placeholder="Select service tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Silver">Silver</SelectItem>
                      <SelectItem value="Gold">Gold</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.service_tier && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.service_tier}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="number_of_users">Number of Users</Label>
                  <Select value={formData.number_of_users.toString()} onValueChange={(value) => handleInputChange('number_of_users', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select number of users" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 10}, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1} user{i + 1 > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Service Features - Program Type */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-4 w-4" />
                  <Label className="text-lg font-semibold">Service Features - Program Type *</Label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {validationErrors.program_type && (
                    <div className="col-span-full">
                      <p className="text-sm text-red-600 mb-2">{validationErrors.program_type}</p>
                    </div>
                  )}
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
                        if (validationErrors.program_type) {
                          setValidationErrors(prev => ({ ...prev, program_type: '' }))
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      required
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
                      required
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
                      required
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
                      required
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
                      required
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">IBOSS</span>
                  </label>
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
                  <Label htmlFor="sales_agent">Sales Agent </Label>
                  <div className="flex items-center h-10 px-3 rounded-md border text-sm bg-muted">
                    <span className="capitalize">{formData.sales_agent || currentUser.name}</span>
                    <Badge variant="secondary" className="ml-2">{currentUser.team}</Badge>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="closing_agent">Closing Agent *</Label>
                  <Select value={formData.closing_agent} onValueChange={(value) => {
                    handleAgentChange('closing_agent', value)
                    if (validationErrors.closing_agent) {
                      setValidationErrors(prev => ({ ...prev, closing_agent: '' }))
                    }
                  }}>
                    <SelectTrigger className={validationErrors.closing_agent ? 'border-red-500 focus:border-red-500' : ''}>
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
                  {validationErrors.closing_agent && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.closing_agent}</p>
                  )}
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
                <Label htmlFor="device_key">Device Key</Label>
                <Input
                  id="device_key"
                  value={formData.device_key}
                  onChange={(e) => handleInputChange('device_key', e.target.value)}
                  placeholder="Enter device key..."
                />
              </div>

              <div>
                <Label htmlFor="device_id">Device ID</Label>
                <Input
                  id="device_id"
                  value={formData.device_id}
                  onChange={(e) => handleInputChange('device_id', e.target.value)}
                  placeholder="Enter device ID..."
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
              <Button type="submit" disabled={loading} className="min-w-[140px]">
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
