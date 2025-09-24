"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  MessageSquare, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  User,
  Filter,
  Plus
} from "lucide-react"
import { User as AuthUser } from "@/lib/auth"

interface FeedbackSystemProps {
  user: AuthUser
}

interface Feedback {
  id: string
  user_id: string
  user_name: string
  user_role: 'manager' | 'team_leader' | 'salesman'
  feedback_type: 'bug_report' | 'feature_request' | 'data_issue' | 'general' | 'urgent'
  subject: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  assigned_to?: string
  response?: string
  response_by?: string
  response_at?: string
  created_at: string
  updated_at: string
}

export default function FeedbackSystem({ user }: FeedbackSystemProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showNewFeedback, setShowNewFeedback] = useState(false)
  const [filter, setFilter] = useState<{
    status?: string
    feedbackType?: string
    priority?: string
  }>({})

  // New feedback form state
  const [newFeedback, setNewFeedback] = useState({
    subject: '',
    message: '',
    feedback_type: 'general' as const,
    priority: 'medium' as const
  })

  useEffect(() => {
    loadFeedbacks()
  }, [user, filter])

  const loadFeedbacks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        userId: user.id.toString(),
        userRole: user.role
      })
      
      if (filter.status) params.append('status', filter.status)
      if (filter.feedbackType) params.append('feedbackType', filter.feedbackType)
      if (filter.priority) params.append('priority', filter.priority)

      const response = await fetch(`/api/feedback?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setFeedbacks(result.feedback)
      }
    } catch (error) {
      console.error('Error loading feedbacks:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitFeedback = async () => {
    try {
      setSubmitting(true)
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          ...newFeedback
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setNewFeedback({
          subject: '',
          message: '',
          feedback_type: 'general',
          priority: 'medium'
        })
        setShowNewFeedback(false)
        loadFeedbacks()
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'urgent': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug_report': return <AlertCircle className="h-4 w-4" />
      case 'feature_request': return <Plus className="h-4 w-4" />
      case 'data_issue': return <AlertCircle className="h-4 w-4" />
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Data Center Feedback</h2>
          <p className="text-muted-foreground">
            Submit feedback, report issues, or request features from the data center team
          </p>
        </div>
        <Dialog open={showNewFeedback} onOpenChange={setShowNewFeedback}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Feedback to Data Center</DialogTitle>
              <DialogDescription>
                Report issues, request features, or provide general feedback to the data center team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="feedback_type">Type</Label>
                  <Select 
                    value={newFeedback.feedback_type} 
                    onValueChange={(value: any) => setNewFeedback(prev => ({ ...prev, feedback_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Feedback</SelectItem>
                      <SelectItem value="bug_report">Bug Report</SelectItem>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="data_issue">Data Issue</SelectItem>
                      <SelectItem value="urgent">Urgent Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={newFeedback.priority} 
                    onValueChange={(value: any) => setNewFeedback(prev => ({ ...prev, priority: value }))}
                  >
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
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newFeedback.subject}
                  onChange={(e) => setNewFeedback(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of your feedback"
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={newFeedback.message}
                  onChange={(e) => setNewFeedback(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Detailed description of your feedback, issue, or request"
                  rows={6}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewFeedback(false)}>
                  Cancel
                </Button>
                <Button onClick={submitFeedback} disabled={submitting || !newFeedback.subject || !newFeedback.message}>
                  {submitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={filter.status || ''} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value || undefined }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={filter.feedbackType || ''} onValueChange={(value) => setFilter(prev => ({ ...prev, feedbackType: value || undefined }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="bug_report">Bug Report</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                  <SelectItem value="data_issue">Data Issue</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={filter.priority || ''} onValueChange={(value) => setFilter(prev => ({ ...prev, priority: value || undefined }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading feedback...</div>
            </CardContent>
          </Card>
        ) : feedbacks.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                No feedback found. Submit your first feedback to get started!
              </div>
            </CardContent>
          </Card>
        ) : (
          feedbacks.map((feedback) => (
            <Card key={feedback.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center space-x-2">
                      {getTypeIcon(feedback.feedback_type)}
                      <span>{feedback.subject}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <User className="h-3 w-3" />
                      <span>{feedback.user_name} ({feedback.user_role})</span>
                      <span>•</span>
                      <span>{new Date(feedback.created_at).toLocaleDateString()}</span>
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getStatusColor(feedback.status)}>
                      {feedback.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(feedback.priority)}>
                      {feedback.priority}
                    </Badge>
                    <Badge variant="outline">
                      {feedback.feedback_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {feedback.message}
                </p>
                {feedback.response && (
                  <div className="border-t pt-4">
                    <div className="bg-muted p-3 rounded">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-sm">Response from Data Center</span>
                        {feedback.response_by && (
                          <span className="text-xs text-muted-foreground">
                            by {feedback.response_by}
                          </span>
                        )}
                        {feedback.response_at && (
                          <span className="text-xs text-muted-foreground">
                            on {new Date(feedback.response_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{feedback.response}</p>
                    </div>
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
