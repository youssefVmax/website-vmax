"use client"

import { useState, useEffect } from "react"
import { Bell, Plus, Send, CheckCircle, Info, Briefcase, MessageSquare, AlertCircle, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { formatDistanceToNow } from "date-fns"
import { Notification, PriorityType, NotificationType } from "@/types/notification"
import { useNotifications } from "@/hooks/use-notifications"
import { userService } from "@/lib/mysql-services"

type UserRole = "manager" | "salesman" | "customer-service"

interface NotificationsPageProps {
  userRole?: UserRole
  user?: { name: string; username: string } | null
}

export default function NotificationsPage({ userRole = 'salesman', user }: NotificationsPageProps) {
  const currentUser = user || { name: "Mohsen Sayed", username: "mohsen.sayed" }

  const [activeTab, setActiveTab] = useState("all")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [newMessage, setNewMessage] = useState({
    message: "",
    priority: "medium" as PriorityType,
  })
  
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    addNotification 
  } = useNotifications()
  
  // Load users for manager user selection
  useEffect(() => {
    const loadUsers = async () => {
      if (userRole === 'manager') {
        try {
          const allUsers = await userService.getUsers()
          setUsers(allUsers)
        } catch (error) {
          console.error('Failed to load users:', error)
        }
      }
    }
    loadUsers()
  }, [userRole])
  
  // No sample data - all notifications come from Firebase

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification: Notification) => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !notification.read
    if (activeTab === "deals") return notification.type === "deal"
    if (activeTab === "messages") return notification.type === "message" || notification.isManagerMessage
    return true
  })

  const unreadCount = filteredNotifications.filter((notif: Notification) => !notif.read).length
  const canCreateNotifications = userRole === "manager" || userRole === "customer-service"

  // markAsRead and markAllAsRead are now provided by the context

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deal': return <Briefcase className="h-4 w-4 text-blue-500" />
      case 'message': return <MessageSquare className="h-4 w-4 text-green-500" />
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const handleCreateMessage = () => {
    if (!newMessage.message.trim()) return
    if (userRole === 'manager' && selectedUsers.length === 0) return

    const recipients = userRole === 'manager' ? selectedUsers : ["Sales Team"]

    const notification: Notification = {
      id: Date.now().toString(),
      title: `New ${newMessage.priority} message from ${currentUser.name}`,
      message: newMessage.message,
      type: "message",
      priority: newMessage.priority,
      from: currentUser.name,
      fromAvatar: "/placeholder-user.jpg",
      to: recipients,
      timestamp: new Date(),
      read: false,
      isManagerMessage: userRole === 'manager'
    }

    addNotification(notification)
    setNewMessage({
      message: "",
      priority: "medium"
    })
    setSelectedUsers([])
    setShowCreateForm(false)
  }

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId])
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    }
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(user => user.id))
    }
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
          <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
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
              
              {userRole === 'manager' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Recipients</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      <Users className="mr-1 h-3 w-3" />
                      {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={user.id}
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                        />
                        <label
                          htmlFor={user.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {user.role}
                            </Badge>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedUsers.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedUsers.length} recipient{selectedUsers.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <Select
                    value={newMessage.priority}
                    onValueChange={(value) => setNewMessage({ ...newMessage, priority: value as PriorityType })}
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
              disabled={!newMessage.message.trim() || (userRole === 'manager' && selectedUsers.length === 0)}
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
