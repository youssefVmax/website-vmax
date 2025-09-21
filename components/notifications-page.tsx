"use client"

import React, { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { Bell, CheckCircle, Plus, Send, X, AlertCircle, Briefcase, MessageSquare, Info, Eye } from "lucide-react"

import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useToast } from "./ui/use-toast"
import { apiService } from "@/lib/api-service"
import { DealDetailsModal } from "./DealDetailsModal"
import type { DealDetails } from "./DealDetailsModal"
import { Notification as FirebaseNotification } from "@/types/firebase"
import NotificationDetailsModal from "./notification-details-modal"
import { useNotifications } from "@/hooks/use-notifications"
import { useAuth } from "@/hooks/useAuth"

// Safe timestamp conversion helper
function safeToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  
  try {
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // If it's a Firestore timestamp with toDate method
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // If it's a Firestore timestamp with seconds property
    if (timestamp && typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000);
    }
    
    // If it's a string, try to parse it
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    // If it's a number (milliseconds)
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    return null;
  } catch (error) {
    console.error('Error converting timestamp:', error, timestamp);
    return null;
  }
}

type NotificationType = "info" | "warning" | "success" | "error" | "deal" | "message"
type PriorityType = "low" | "medium" | "high"
type UserRole = "manager" | "salesman" | "customer-service"

interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  priority: PriorityType
  from: string
  fromAvatar?: string
  to: string[]
  timestamp: Date
  read: boolean
  dealId?: string
  dealName?: string
  dealStage?: string
  dealValue?: number
  salesAgent?: string
  salesAgentId?: string
  closingAgent?: string
  closingAgentId?: string
  isManagerMessage?: boolean
  actionRequired?: boolean
  isRead?: boolean
  created_at?: any
  dealDetails?: Partial<DealDetails> // For storing additional deal info
}

interface NotificationsPageProps {
  userRole: UserRole
  user?: { name: string; username: string } | null
}


export default function NotificationsPage({ userRole = 'salesman', user }: NotificationsPageProps) {
  const currentUser = user || { name: "Mohsen Sayed", username: "mohsen.sayed" }
  const { toast } = useToast()
  const { user: authUser } = useAuth()
  const { notifications, markAsRead, markAllAsRead } = useNotifications()

  const [activeTab, setActiveTab] = useState("all")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingDeal, setLoadingDeal] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<DealDetails | null>(null)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [newMessage, setNewMessage] = useState({
    message: "",
    priority: "medium" as PriorityType,
  })

  // Load notifications from Firebase on component mount
  useEffect(() => {
    setLoading(false) // Use notifications from hook instead
  }, [notifications])

  const handleViewDetailsModal = (notification: any) => {
    setSelectedNotification(notification)
    setShowDetailsModal(true)
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const firebaseNotifications = await notificationService.getNotifications(
        (user as any)?.id, 
        userRole
      )
      
      // Transform Firebase notifications to match our interface
      const transformedNotifications = firebaseNotifications.map(notif => {
        // Convert technical IDs to readable names and get actual deal creator names
        const getReadableName = (name: string) => {
          if (!name || name === 'System') return 'System';
          // If it's a technical ID (contains random characters), use deal creator name if available
          if (name.length > 15 && /^[a-zA-Z0-9]+$/.test(name)) {
            // Try to get the actual creator name from notification data
            if (notif.salesAgent) return notif.salesAgent;
            if (notif.createdBy) return notif.createdBy;
            return 'Sales Agent'; // Fallback
          }
          return name;
        };

        // Create readable deal description instead of showing technical IDs
        const getDealDescription = () => {
          if (notif.dealName && notif.dealValue) {
            return `Deal: ${notif.dealName} ($${notif.dealValue.toLocaleString()})`;
          }
          if (notif.dealName) {
            return `Deal: ${notif.dealName}`;
          }
          if (notif.dealId && notif.dealId.startsWith('DEAL-')) {
            // Extract meaningful info from deal ID format DEAL-timestamp-random
            const parts = notif.dealId.split('-');
            if (parts.length >= 2) {
              const timestamp = parseInt(parts[1]);
              const date = new Date(timestamp).toLocaleDateString();
              return `Deal created on ${date}`;
            }
          }
          return notif.dealId || 'Deal';
        };

        // Enhanced message with readable deal info
        const enhancedMessage = notif.message?.replace(
          /DEAL-\d+-\d+|[a-zA-Z0-9]{20,}/g, 
          getDealDescription()
        ) || notif.message;

        return {
          id: notif.id || '',
          title: notif.title,
          message: enhancedMessage,
          type: (notif.type as NotificationType) || 'info',
          priority: (notif.priority as PriorityType) || 'medium',
          from: getReadableName(notif.from || 'System'),
          fromAvatar: notif.fromAvatar,
          to: notif.to || [currentUser.name],
          timestamp: safeToDate(notif.created_at) || new Date(),
          read: notif.isRead || false,
          dealId: notif.dealId,
          dealName: notif.dealName,
          dealStage: notif.dealStage,
          dealValue: notif.dealValue,
          salesAgent: notif.salesAgent,
          salesAgentId: notif.salesAgentId,
          closingAgent: notif.closingAgent,
          closingAgentId: notif.closingAgentId,
          isManagerMessage: notif.isManagerMessage || false,
          actionRequired: notif.actionRequired || false
        };
      }).filter(notif => notif.id !== '')
      
      setNotifications(transformedNotifications)
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }


  // Filter notifications based on active tab and user role
  const filteredNotifications = notifications.filter(notification => {
    // Role-based filtering for deal notifications
    if (notification.type === "deal") {
      if (userRole === "manager") {
        // Managers see all deal notifications
        return true;
      } else {
        // Non-managers only see notifications where they are involved
        const isUserInvolved = 
          notification.to.includes(currentUser.name) ||
          notification.to.includes(currentUser.username) ||
          notification.from === currentUser.name ||
          notification.from === currentUser.username;
        
        if (!isUserInvolved) return false;
      }
    }

    // Apply tab filtering
    if (activeTab === "all") return true
    if (activeTab === "unread") return !notification.read
    if (activeTab === "deals") return notification.type === "deal"
    return true
  })

  const unreadCount = filteredNotifications.filter(notif => !notif.read).length

  // Mark notification as read (using local function to avoid conflicts)
  const markNotificationAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        )
      )
      
      toast({
        title: "Notification marked as read",
        description: "The notification has been marked as read.",
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllNotificationsAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read)
      await Promise.all(unreadNotifications.map(n => notificationService.markAsRead(n.id)))
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({
          ...notification,
          read: true
        }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      })
    }
  }

  const fetchDealDetails = async (dealId: string): Promise<DealDetails | null> => {
    if (!dealId) return null;
    
    try {
      setLoadingDeal(true);
      
      // Fetch deal details from Firebase
      const deal = await dealsService.getDealById(dealId);
      
      if (!deal) {
        console.error('Deal not found:', dealId);
        return null;
      }
      
      // Transform Firebase deal to DealDetails format
      const dealDetails: DealDetails = {
        id: deal.id || dealId,
        customerName: deal.customer_name,
        salesAgent: deal.sales_agent,
        salesAgentId: deal.SalesAgentID,
        closingAgent: deal.closing_agent,
        closingAgentId: deal.ClosingAgentID,
        amount: deal.amount_paid,
        stage: deal.stage,
        status: deal.status,
        createdDate: safeToDate(deal.created_at)?.toISOString() || deal.signup_date,
        lastUpdated: safeToDate(deal.updated_at)?.toISOString() || new Date().toISOString(),
        notes: deal.notes || `Deal for ${deal.customer_name} - ${deal.product_type} service (${deal.service_tier})`
      };
      
      return dealDetails;
    } catch (error) {
      console.error('Error fetching deal details:', error);
      return null;
    } finally {
      setLoadingDeal(false);
    }
  };

  const handleViewDetails = async (notification: Notification) => {
    if (!notification.dealId) {
      toast({
        title: "No Deal Details",
        description: "This notification doesn't have associated deal information",
        variant: "destructive"
      });
      return;
    }
    
    // If we already have the deal details in the notification, use that
    if (notification.dealDetails) {
      setSelectedDeal(notification.dealDetails as DealDetails);
      return;
    }
    
    // Otherwise, fetch the deal details
    const deal = await fetchDealDetails(notification.dealId);
    
    if (deal) {
      // Update the notification with the deal details for future reference
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, dealDetails: deal }
            : n
        )
      );
      
      setSelectedDeal(deal);
    } else {
      toast({
        title: "Error",
        description: "Could not load deal details. Please try again.",
        variant: "destructive"
      });
    }
  }

  const getPriorityColor = (priority: PriorityType) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'deal': return <Briefcase className="h-4 w-4 text-blue-500" />
      case 'message': return <MessageSquare className="h-4 w-4 text-green-500" />
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  // Only managers can create notifications
  const canCreateNotifications = userRole === "manager"

  const handleCreateMessage = async () => {
    if (!canCreateNotifications) return
    if (!newMessage.message.trim()) return

    try {
      const notificationData = {
        title: `New ${newMessage.priority} priority message from ${currentUser.name}`,
        message: newMessage.message,
        type: "message" as const,
        priority: newMessage.priority as PriorityType,
        from: currentUser.name,
        fromAvatar: "/placeholder-user.jpg",
        to: ["all"],
        isRead: false,
        isManagerMessage: userRole === 'manager',
        actionRequired: newMessage.priority === 'high',
        userRole: userRole
      }

      const notificationId = await notificationService.addNotification(notificationData)
      
      // Add to local state for immediate UI update
      const newNotification: Notification = {
        id: notificationId,
        ...notificationData,
        timestamp: new Date(),
        read: false
      }

      setNotifications(prev => [newNotification, ...prev])
      setNewMessage({
        message: "",
        priority: "medium"
      })
      setShowCreateForm(false)
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the team."
      })
    } catch (error) {
      console.error('Error creating notification:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    }
  }


  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {selectedDeal && (
        <DealDetailsModal 
          deal={selectedDeal} 
          onClose={() => setSelectedDeal(null)} 
        />
      )}
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All notifications read"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllNotificationsAsRead}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
          {canCreateNotifications && (
            <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
              <Plus className="mr-2 h-4 w-4" /> New Message
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
      </Tabs>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Message</CardTitle>
            <CardDescription>Send a message to your team members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <Textarea
                  value={newMessage.message}
                  onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                  placeholder="Type your message here..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <Select
                    value={newMessage.priority}
                    onValueChange={(value) => setNewMessage({ ...newMessage, priority: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2 border-t pt-4">
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateMessage}
              disabled={!newMessage.message.trim()}
            >
              <Send className="mr-2 h-4 w-4" /> Send Message
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No notifications found</h3>
              <p className="text-sm text-muted-foreground">You're all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all duration-200 hover:shadow-md ${
                !notification.read ? 'border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={notification.fromAvatar} alt={notification.from} />
                        <AvatarFallback>{notification.from.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{notification.from}</h3>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </span>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          {notification.type === 'deal' ? 'New Deal Created' : 'Team Message'}
                          {notification.dealName && ` • Customer: ${notification.dealName}`}
                        </p>
                        {notification.type === 'deal' && (
                          <div className="text-xs space-y-1">
                            {notification.salesAgent && (
                              <p className="flex items-center">
                                <span className="font-medium mr-1">Agent:</span> {notification.salesAgent}
                                {notification.salesAgentId && userRole === 'manager' && (
                                  <span className="ml-2 text-muted-foreground/70">(ID: {notification.salesAgentId})</span>
                                )}
                              </p>
                            )}
                            {notification.closingAgent && (
                              <p className="flex items-center">
                                <span className="font-medium mr-1">Closer:</span> {notification.closingAgent}
                                {notification.closingAgentId && userRole === 'manager' && (
                                  <span className="ml-2 text-muted-foreground/70">(ID: {notification.closingAgentId})</span>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                      {notification.priority}
                    </Badge>
                    {getTypeIcon(notification.type)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4 pt-0">
                <div className="text-sm">
                  {notification.message.includes('\n') ? (
                    <div className="space-y-1">
                      {notification.message.split('\n').map((line, idx) => (
                        <div key={idx} className={line.startsWith('•') ? 'ml-3 text-muted-foreground' : line.includes(':') && line.includes('Agent') ? 'font-medium' : ''}>
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>{notification.message}</p>
                  )}
                </div>
                
                {notification.dealId && (
                  <div className="mt-3 p-3 bg-muted/30 rounded-md">
                    <div className="flex flex-col space-y-2 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            <span className="text-slate-600 dark:text-slate-400">Customer:</span> {notification.dealName}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Sales Agent:</span> {notification.salesAgent || notification.from}
                          </p>
                          {userRole === 'manager' && notification.salesAgentId && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              ID: {notification.salesAgentId}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          {notification.closingAgent && (
                            <p className="text-slate-600 dark:text-slate-400">
                              <span className="font-medium">Closing Agent:</span> {notification.closingAgent}
                              {userRole === 'manager' && notification.closingAgentId && (
                                <span className="text-xs block text-slate-500 dark:text-slate-400">
                                  ID: {notification.closingAgentId}
                                </span>
                              )}
                            </p>
                          )}
                          
                          <p className="font-bold text-lg text-green-600 dark:text-green-400 mt-1">
                            ${notification.dealValue?.toLocaleString()}
                          </p>
                          
                          {notification.dealStage && (
                            <Badge 
                              variant="outline" 
                              className="mt-1 bg-blue-50 text-blue-700 border-blue-200 capitalize"
                            >
                              {notification.dealStage.replace(/-/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-end pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetailsModal(notification);
                          }}
                          disabled={loadingDeal}
                        >
                          {loadingDeal ? 'Loading...' : 'View Deal Details'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {notification.actionRequired && !notification.dealId && (
                  <div className="mt-3 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetailsModal(notification);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
        </div>
      </div>

      {/* Notification Details Modal */}
      <NotificationDetailsModal
        notification={selectedNotification}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedNotification(null)
        }}
        userRole={userRole}
        userId={authUser?.id || ''}
      />
    </div>
  )
}
