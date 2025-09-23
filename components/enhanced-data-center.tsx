"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Send, MessageCircle, Star, Eye, Edit, Calendar, User, AlertCircle,
  CheckCircle, Clock, Archive, Plus, Trash2, RefreshCw
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"
import { dataCenterService, DataCenterEntry, DataFeedback } from "@/lib/data-center-service"
import { FeedbackManagementTable } from "./feedback-management-table"

interface EnhancedDataCenterProps {
  userRole: 'manager' | 'salesman' | 'team-leader'
  user: { name: string; username: string; id: string; team?: string }
}

export function EnhancedDataCenter({ userRole, user }: EnhancedDataCenterProps) {
  const { toast } = useToast()
  
  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataEntries, setDataEntries] = useState<DataCenterEntry[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedEntry, setSelectedEntry] = useState<DataCenterEntry | null>(null)
  const [feedback, setFeedback] = useState<DataFeedback[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  
  // Form states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [newDataForm, setNewDataForm] = useState({
    title: '',
    description: '',
    content: '',
    data_type: 'general',
    sent_to_id: '',
    sent_to_team: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  })
  const [newFeedbackForm, setNewFeedbackForm] = useState({
    feedback_text: '',
    rating: 5,
    feedback_type: 'general'
  })

  const isManager = userRole === 'manager'
  const canProvideFeedback = userRole === 'salesman' || userRole === 'team-leader'

  // Available teams
  const teams = [
    { id: 'ALI ASHRAF', name: 'ALI ASHRAF Team' },
    { id: 'CS TEAM', name: 'CS Team' },
    { id: 'SALES', name: 'Sales Team' },
    { id: 'SUPPORT', name: 'Support Team' }
  ]

  // Initialize tables and load data
  useEffect(() => {
    initializeAndLoadData()
    loadUsers()
  }, [user.id, userRole])

  const initializeAndLoadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Initialize tables first
      await dataCenterService.initializeTables()
      
      // Load data entries
      const result = await dataCenterService.getDataEntries(user.id, userRole, {
        data_type: 'all',
        limit: 50
      })
      
      setDataEntries(result.data)
    } catch (err) {
      console.error('Error initializing data center:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const allUsers = await apiService.getUsers({})
      setUsers(allUsers.filter((u: any) => u.role !== 'manager' || u.id === user.id))
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadFeedback = async (dataId: string) => {
    try {
      setFeedbackLoading(true)
      const result = await dataCenterService.getFeedback(dataId, user.id, userRole, {
        limit: 50
      })
      setFeedback(result.data)
    } catch (error) {
      console.error('Error loading feedback:', error)
      toast({
        title: "Error",
        description: "Failed to load feedback",
        variant: "destructive"
      })
    } finally {
      setFeedbackLoading(false)
    }
  }

  const handleCreateData = async () => {
    try {
      if (!newDataForm.title || !newDataForm.description) {
        toast({
          title: "Missing Information",
          description: "Please fill in title and description",
          variant: "destructive"
        })
        return
      }

      await dataCenterService.createDataEntry(user.id, userRole, newDataForm)
      
      toast({
        title: "Success",
        description: "Data entry created successfully"
      })

      setShowCreateDialog(false)
      setNewDataForm({
        title: '',
        description: '',
        content: '',
        data_type: 'general',
        sent_to_id: '',
        sent_to_team: '',
        priority: 'medium'
      })

      // Reload data
      initializeAndLoadData()
    } catch (error) {
      console.error('Error creating data:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create data entry",
        variant: "destructive"
      })
    }
  }

  const handleSubmitFeedback = async () => {
    try {
      if (!selectedEntry || !newFeedbackForm.feedback_text) {
        toast({
          title: "Missing Information",
          description: "Please provide feedback text",
          variant: "destructive"
        })
        return
      }

      await dataCenterService.submitFeedback(
        selectedEntry.id,
        user.id,
        userRole,
        newFeedbackForm
      )

      toast({
        title: "Success",
        description: "Feedback submitted successfully"
      })

      setNewFeedbackForm({
        feedback_text: '',
        rating: 5,
        feedback_type: 'general'
      })

      // Reload feedback
      loadFeedback(selectedEntry.id)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit feedback",
        variant: "destructive"
      })
    }
  }

  const handleDeleteData = async (dataId: string) => {
    try {
      await dataCenterService.deleteDataEntry(dataId, user.id, userRole)
      
      toast({
        title: "Success",
        description: "Data entry deleted successfully"
      })

      // Reload data
      initializeAndLoadData()
    } catch (error) {
      console.error('Error deleting data:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete data entry",
        variant: "destructive"
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4" />
      case 'high': return <Clock className="h-4 w-4" />
      case 'medium': return <CheckCircle className="h-4 w-4" />
      case 'low': return <Archive className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading data center...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-red-600">Error</CardTitle>
          <CardDescription className="text-center">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={initializeAndLoadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Data Center</h1>
          <p className="text-gray-600">
            {isManager 
              ? "Share data with your team and view feedback" 
              : "View data shared with you and provide feedback"
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={initializeAndLoadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {isManager && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Share Data
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Share Data with Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newDataForm.title}
                      onChange={(e) => setNewDataForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter data title..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newDataForm.description}
                      onChange={(e) => setNewDataForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this data is about..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={newDataForm.content}
                      onChange={(e) => setNewDataForm(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Enter the detailed content, instructions, or data..."
                      rows={5}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="data_type">Data Type</Label>
                      <Select value={newDataForm.data_type} onValueChange={(value) => setNewDataForm(prev => ({ ...prev, data_type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="targets">Targets</SelectItem>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="policy">Policy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newDataForm.priority} onValueChange={(value: any) => setNewDataForm(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sent_to_id">Send to Individual</Label>
                      <Select value={newDataForm.sent_to_id} onValueChange={(value) => setNewDataForm(prev => ({ ...prev, sent_to_id: value, sent_to_team: '' }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="sent_to_team">Send to Team</Label>
                      <Select value={newDataForm.sent_to_team} onValueChange={(value) => setNewDataForm(prev => ({ ...prev, sent_to_team: value, sent_to_id: '' }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateData}>
                      <Send className="h-4 w-4 mr-2" />
                      Share Data
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Tabs for Data Management and Feedback */}
      <Tabs defaultValue="data" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="feedback">Feedback Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="data" className="space-y-6">
          {/* Data Cards */}
          <div className="grid gap-4">
        {dataEntries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">
                {isManager 
                  ? "No data shared yet. Click 'Share Data' to get started." 
                  : "No data has been shared with you yet."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          dataEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{entry.title}</CardTitle>
                      <Badge className={getPriorityColor(entry.priority)}>
                        {getPriorityIcon(entry.priority)}
                        <span className="ml-1 capitalize">{entry.priority}</span>
                      </Badge>
                    </div>
                    <CardDescription>{entry.description}</CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canProvideFeedback && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedEntry(entry)
                          setShowFeedbackDialog(true)
                          loadFeedback(entry.id)
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Feedback ({entry.feedback_count || 0})
                      </Button>
                    )}
                    
                    {isManager && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteData(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {entry.content && (
                  <div className="mb-4">
                    <div className="bg-gray-50 p-3 rounded-md">
                      <pre className="whitespace-pre-wrap text-sm">{entry.content}</pre>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      From: {entry.sent_by_name || 'Manager'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <Badge variant="outline" className="capitalize">
                    {entry.data_type}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
        </TabsContent>
        
        <TabsContent value="feedback" className="space-y-6">
          <FeedbackManagementTable 
            userRole={userRole}
            user={user}
            showAllFeedback={isManager}
          />
        </TabsContent>
      </Tabs>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback for: {selectedEntry?.title}</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="view-feedback" className="w-full">
            <TabsList>
              <TabsTrigger value="view-feedback">
                View Feedback ({feedback.length})
              </TabsTrigger>
              {canProvideFeedback && (
                <TabsTrigger value="add-feedback">Add Feedback</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="view-feedback" className="space-y-4">
              {feedbackLoading ? (
                <div className="text-center py-4">Loading feedback...</div>
              ) : feedback.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No feedback yet. Be the first to provide feedback!
                </div>
              ) : (
                feedback.map((fb) => (
                  <Card key={fb.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <strong>{fb.user_name}</strong>
                          <Badge variant="outline" className="text-xs">
                            {fb.user_role}
                          </Badge>
                          {fb.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">{fb.rating}/5</span>
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(fb.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{fb.feedback_text}</p>
                      {fb.feedback_type !== 'general' && (
                        <Badge variant="outline" className="mt-2 text-xs capitalize">
                          {fb.feedback_type}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            
            {canProvideFeedback && (
              <TabsContent value="add-feedback" className="space-y-4">
                <div>
                  <Label htmlFor="feedback_text">Your Feedback</Label>
                  <Textarea
                    id="feedback_text"
                    value={newFeedbackForm.feedback_text}
                    onChange={(e) => setNewFeedbackForm(prev => ({ ...prev, feedback_text: e.target.value }))}
                    placeholder="Share your thoughts, questions, or suggestions..."
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rating">Rating</Label>
                    <Select 
                      value={newFeedbackForm.rating.toString()} 
                      onValueChange={(value) => setNewFeedbackForm(prev => ({ ...prev, rating: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent</SelectItem>
                        <SelectItem value="4">⭐⭐⭐⭐ Good</SelectItem>
                        <SelectItem value="3">⭐⭐⭐ Average</SelectItem>
                        <SelectItem value="2">⭐⭐ Poor</SelectItem>
                        <SelectItem value="1">⭐ Very Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="feedback_type">Feedback Type</Label>
                    <Select 
                      value={newFeedbackForm.feedback_type} 
                      onValueChange={(value) => setNewFeedbackForm(prev => ({ ...prev, feedback_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="question">Question</SelectItem>
                        <SelectItem value="suggestion">Suggestion</SelectItem>
                        <SelectItem value="concern">Concern</SelectItem>
                        <SelectItem value="acknowledgment">Acknowledgment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitFeedback}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </Button>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
