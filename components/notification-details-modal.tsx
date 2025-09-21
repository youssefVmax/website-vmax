"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar, User, DollarSign, Building, Phone, Mail, MapPin, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Notification } from '@/types/notification'
import { useMySQLSalesData } from '@/hooks/useMySQLSalesData'
import { mysqlAnalyticsService } from '@/lib/mysql-analytics-service'

interface NotificationDetailsModalProps {
  notification: Notification | null
  isOpen: boolean
  onClose: () => void
  userRole: string
  userId: string
}

interface DealDetails {
  id: string
  customer_name: string
  amount: number
  sales_agent: string
  closing_agent: string
  type_service: string
  product_type: string
  team: string
  date: string
  duration_months: number
  status: string
  phone?: string
  email?: string
  address?: string
}

interface CallbackDetails {
  id: string
  customer_name: string
  phone: string
  email?: string
  callback_date: string
  callback_time: string
  status: string
  priority: string
  notes?: string
  assigned_agent: string
  created_by: string
  created_at: string
}

export default function NotificationDetailsModal({ 
  notification, 
  isOpen, 
  onClose, 
  userRole, 
  userId 
}: NotificationDetailsModalProps) {
  const [dealDetails, setDealDetails] = useState<DealDetails | null>(null)
  const [callbackDetails, setCallbackDetails] = useState<CallbackDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const { deals } = useMySQLSalesData({ userRole: userRole as any, userId, userName: '' })

  useEffect(() => {
    if (!notification || !isOpen) {
      setDealDetails(null)
      setCallbackDetails(null)
      return
    }

    const loadDetails = async () => {
      setLoading(true)
      try {
        // Load deal details if dealId exists
        if (notification.dealId && deals) {
          const deal = deals.find((s: any) => s.id === notification.dealId)
          if (deal) {
            setDealDetails({
              id: deal.id,
              customer_name: deal.customer_name || 'Unknown',
              amount: deal.amount || 0,
              sales_agent: deal.sales_agent || 'Unknown',
              closing_agent: deal.closing_agent || 'Unknown',
              type_service: deal.type_service || 'Unknown',
              product_type: deal.product_type || 'Unknown',
              team: deal.team || 'Unknown',
              date: deal.date || new Date().toISOString(),
              duration_months: deal.duration_months || 0,
              status: deal.status || 'Active',
              phone: deal.phone,
              email: deal.email,
              address: deal.address
            })
          }
        }

        // Load callback details if it's a callback notification
        if (notification.type === 'callback' || notification.message.toLowerCase().includes('callback')) {
          try {
            const callbackKPIs = await mysqlAnalyticsService.getCallbackKPIs({ userRole: userRole as any, userId })
            if (callbackKPIs?.recentCallbacks) {
              // Try to match callback by customer name or other criteria
              const callback = callbackKPIs.recentCallbacks.find((c: any) => 
                c.customer_name === notification.dealName ||
                c.id === notification.dealId
              )
              if (callback) {
                setCallbackDetails({
                  id: callback.id,
                  customer_name: callback.customer_name || 'Unknown',
                  phone: callback.phone || 'Unknown',
                  email: callback.email,
                  callback_date: callback.callback_date || new Date().toISOString(),
                  callback_time: callback.callback_time || '00:00',
                  status: callback.status || 'Pending',
                  priority: callback.priority || 'Medium',
                  notes: callback.notes,
                  assigned_agent: callback.assigned_agent || 'Unknown',
                  created_by: callback.created_by || 'System',
                  created_at: callback.created_at || new Date().toISOString()
                })
              }
            }
          } catch (error) {
            console.error('Failed to load callback details:', error)
          }
        }
      } catch (error) {
        console.error('Failed to load notification details:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDetails()
  }, [notification, isOpen, deals, userRole, userId])

  if (!notification) return null

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'warning': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'success': return 'bg-green-100 text-green-800 border-green-200'
      case 'deal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'callback': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'closed':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
      case 'scheduled':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'cancelled':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge className={getTypeColor(notification.type)}>
                {notification.type.toUpperCase()}
              </Badge>
              <Badge className={getPriorityColor(notification.priority)}>
                {notification.priority.toUpperCase()}
              </Badge>
            </div>
            <span className="text-lg font-semibold">{notification.title}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Notification Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Notification Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">From:</span>
                    <span className="font-medium">{notification.from}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="font-medium">
                      {new Date(notification.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Message:</span>
                  <p className="mt-1 p-4 bg-muted border border-border rounded-lg text-sm text-foreground leading-relaxed shadow-sm">
                    {notification.message}
                  </p>
                </div>
                {notification.to && notification.to.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">Recipients:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {notification.to.map((recipient, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {recipient === 'all' ? 'All Users' : recipient}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deal Details */}
            {dealDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Deal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Customer:</span>
                      <p className="font-medium">{dealDetails.customer_name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Amount:</span>
                      <p className="font-medium text-green-600">
                        ${dealDetails.amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(dealDetails.status)}
                        <span className="font-medium">{dealDetails.status}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Sales Agent:</span>
                      <p className="font-medium">{dealDetails.sales_agent}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Closing Agent:</span>
                      <p className="font-medium">{dealDetails.closing_agent}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Team:</span>
                      <p className="font-medium">{dealDetails.team}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Service:</span>
                      <p className="font-medium">{dealDetails.type_service}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Product:</span>
                      <p className="font-medium">{dealDetails.product_type}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Duration:</span>
                      <p className="font-medium">{dealDetails.duration_months} months</p>
                    </div>
                  </div>
                  
                  {(dealDetails.phone || dealDetails.email || dealDetails.address) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Contact Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {dealDetails.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{dealDetails.phone}</span>
                            </div>
                          )}
                          {dealDetails.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{dealDetails.email}</span>
                            </div>
                          )}
                          {dealDetails.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{dealDetails.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Callback Details */}
            {callbackDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Callback Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Customer:</span>
                      <p className="font-medium">{callbackDetails.customer_name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Phone:</span>
                      <p className="font-medium">{callbackDetails.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(callbackDetails.status)}
                        <span className="font-medium">{callbackDetails.status}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Scheduled Date:</span>
                      <p className="font-medium">
                        {new Date(callbackDetails.callback_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Scheduled Time:</span>
                      <p className="font-medium">{callbackDetails.callback_time}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Priority:</span>
                      <Badge className={getPriorityColor(callbackDetails.priority)}>
                        {callbackDetails.priority}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Assigned Agent:</span>
                      <p className="font-medium">{callbackDetails.assigned_agent}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Created By:</span>
                      <p className="font-medium">{callbackDetails.created_by}</p>
                    </div>
                    {callbackDetails.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{callbackDetails.email}</span>
                      </div>
                    )}
                  </div>
                  
                  {callbackDetails.notes && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-sm text-gray-600">Notes:</span>
                        <p className="mt-1 p-4 bg-muted border border-border rounded-lg text-sm text-foreground leading-relaxed shadow-sm">
                          {callbackDetails.notes}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {loading && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading details...</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
