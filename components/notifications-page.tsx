"use client"

import { useState } from "react"
import { Bell, Plus, Send, CheckCircle, Info, Briefcase, MessageSquare, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

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
  isManagerMessage?: boolean
  actionRequired?: boolean
}

interface NotificationsPageProps {
  userRole: UserRole
  user?: { name: string; username: string } | null
}

export default function NotificationsPage({ userRole = 'salesman', user }: NotificationsPageProps) {
  const currentUser = user || { name: "Mohsen Sayed", username: "mohsen.sayed" }

  const [activeTab, setActiveTab] = useState("all")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newMessage, setNewMessage] = useState({
    message: "",
    priority: "medium" as PriorityType,
  })
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "New Deal Assigned",
      message: "You've been assigned to follow up with TechCorp Solutions. The deal is in the proposal stage with a potential value of $45,000.",
      type: "deal",
      priority: "high",
      from: "Manager",
      fromAvatar: "/placeholder-user.jpg",
      to: [currentUser.name],
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      read: false,
      dealId: "DEAL-1001",
      dealName: "TechCorp Solutions",
      dealStage: "Proposal",
      dealValue: 45000,
      actionRequired: true
    },
    {
      id: "2",
      title: "Deal Status Update",
      message: "The deal with StreamMax Ltd has moved to the negotiation stage. The client has reviewed the proposal and has some questions.",
      type: "deal",
      priority: "medium",
      from: "System",
      to: [currentUser.name],
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false,
      dealId: "DEAL-1002",
      dealName: "StreamMax Ltd",
      dealStage: "Negotiation",
      dealValue: 32000
    },
    {
      id: "3",
      title: "Message from Manager",
      message: "Great job on closing the DataFlow deal! The client was very impressed with your presentation. Let's schedule a call to discuss next steps and potential upselling opportunities.",
      type: "message",
      priority: "high",
      from: "Sarah Johnson",
      fromAvatar: "/placeholder-user.jpg",
      to: [currentUser.name],
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      read: false,
      isManagerMessage: true,
      actionRequired: true
    },
    {
      id: "4",
      title: "Deal Won: CloudTech Solutions",
      message: "Congratulations! The CloudTech Solutions deal has been successfully closed with a final value of $68,000. This brings you closer to your quarterly target.",
      type: "success",
      priority: "high",
      from: "System",
      to: [currentUser.name, "Sales Team"],
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      read: true,
      dealId: "DEAL-0998",
      dealName: "CloudTech Solutions",
      dealStage: "Closed Won",
      dealValue: 68000
    },
    {
      id: "5",
      title: "Reminder: Follow Up Required",
      message: "The deal with InnovateX is waiting for your response. The client expects to hear back from you by tomorrow.",
      type: "warning",
      priority: "high",
      from: "System",
      to: [currentUser.name],
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      read: true,
      dealId: "DEAL-1000",
      dealName: "InnovateX",
      dealStage: "Follow Up",
      dealValue: 28000,
      actionRequired: true
    }
  ])


  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !notification.read
    if (activeTab === "deals") return notification.type === "deal"
    if (activeTab === "messages") return notification.type === "message" || notification.isManagerMessage
    return true
  })
  const unreadCount = filteredNotifications.filter(notif => !notif.read).length

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => ({
        ...notification,
        read: true
      }))
    )
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

  const canCreateNotifications = userRole === "manager" || userRole === "customer-service"

  const handleCreateMessage = () => {
    if (!newMessage.message.trim()) return

    const notification: Notification = {
      id: Date.now().toString(),
      title: `New ${newMessage.priority} message from ${currentUser.name}`,
      message: newMessage.message,
      type: "message",
      priority: newMessage.priority,
      from: currentUser.name,
      fromAvatar: "/placeholder-user.jpg",
      to: ["Sales Team"],
      timestamp: new Date(),
      read: false,
      isManagerMessage: userRole === 'manager'
    }

    setNotifications(prev => [notification, ...prev])
    setNewMessage({
      message: "",
      priority: "medium"
    })
    setShowCreateForm(false)
  }


  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All notifications read"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
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
                      <p className="text-sm text-muted-foreground">
                        {notification.type === 'deal' ? 'Deal Update' : 'Message'}
                        {notification.dealName && ` • ${notification.dealName}`}
                      </p>
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
                <p className="text-sm">{notification.message}</p>
                
                {notification.dealId && (
                  <div className="mt-3 p-3 bg-muted/30 rounded-md">
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium">{notification.dealName}</p>
                        <p className="text-muted-foreground">Deal ID: {notification.dealId}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${notification.dealValue?.toLocaleString()}</p>
                        <Badge variant="outline" className="mt-1">
                          {notification.dealStage}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
                
                {notification.actionRequired && (
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm">
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
  )
}
