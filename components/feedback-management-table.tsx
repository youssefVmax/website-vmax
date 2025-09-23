"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Edit, 
  Trash2, 
  Star, 
  MessageCircle, 
  User, 
  Calendar,
  RefreshCw,
  Plus,
  Eye,
  Save,
  X
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { dataCenterService, DataFeedback } from "@/lib/data-center-service"

interface FeedbackManagementTableProps {
  userRole: 'manager' | 'salesman' | 'team-leader'
  user: { name: string; username: string; id: string; team?: string }
  dataId?: string // If provided, shows feedback for specific data entry
  showAllFeedback?: boolean // If true, shows all feedback across all data entries
}

export function FeedbackManagementTable({ 
  userRole, 
  user, 
  dataId, 
  showAllFeedback = false 
}: FeedbackManagementTableProps) {
  const { toast } = useToast()
  
  // State management
  const [feedback, setFeedback] = useState<DataFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingFeedback, setEditingFeedback] = useState<DataFeedback | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    feedback_text: '',
    rating: 5,
    feedback_type: 'general'
  })

  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [filterType, setFilterType] = useState('all')
  const [filterRating, setFilterRating] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const isManager = userRole === 'manager'
  const canEdit = userRole === 'salesman' || userRole === 'team-leader'

  // Load feedback data
  useEffect(() => {
    loadFeedback()
  }, [user.id, dataId, showAllFeedback])

  const loadFeedback = async () => {
    try {
      setLoading(true)
      setError(null)

      let feedbackData: DataFeedback[] = []

      if (showAllFeedback) {
        // Load all feedback across all data entries (manager view)
        // This would require a new API endpoint for all feedback
        const response = await fetch(`/api/data-feedback-all?user_id=${user.id}&user_role=${userRole}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          cache: 'no-store'
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            feedbackData = result.data
          }
        }
      } else if (dataId) {
        // Load feedback for specific data entry
        const result = await dataCenterService.getFeedback(dataId, user.id, userRole, {
          limit: 100 // Get more feedback for table view
        })
        feedbackData = result.data
      }

      setFeedback(feedbackData)
    } catch (err) {
      console.error('Error loading feedback:', err)
      setError(err instanceof Error ? err.message : 'Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }

  const handleEditFeedback = (feedbackItem: DataFeedback) => {
    // Only allow editing own feedback
    if (feedbackItem.user_id !== user.id && !isManager) {
      toast({
        title: "Access Denied",
        description: "You can only edit your own feedback",
        variant: "destructive"
      })
      return
    }

    setEditingFeedback(feedbackItem)
    setEditForm({
      feedback_text: feedbackItem.feedback_text,
      rating: feedbackItem.rating || 5,
      feedback_type: feedbackItem.feedback_type
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    try {
      if (!editingFeedback) return

      await dataCenterService.updateFeedback(
        editingFeedback.id,
        user.id,
        userRole,
        editForm
      )

      toast({
        title: "Success",
        description: "Feedback updated successfully"
      })

      setShowEditDialog(false)
      setEditingFeedback(null)
      loadFeedback() // Reload data
    } catch (error) {
      console.error('Error updating feedback:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update feedback",
        variant: "destructive"
      })
    }
  }

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      await dataCenterService.deleteFeedback(feedbackId, user.id, userRole)
      
      toast({
        title: "Success",
        description: "Feedback deleted successfully"
      })

      loadFeedback() // Reload data
    } catch (error) {
      console.error('Error deleting feedback:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete feedback",
        variant: "destructive"
      })
    }
  }

  // Filter and paginate feedback
  const filteredFeedback = feedback.filter(item => {
    const matchesType = filterType === 'all' || item.feedback_type === filterType
    const matchesRating = filterRating === 'all' || (item.rating && item.rating.toString() === filterRating)
    const matchesSearch = !searchTerm || 
      item.feedback_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesType && matchesRating && matchesSearch
  })

  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedFeedback = filteredFeedback.slice(startIndex, startIndex + itemsPerPage)

  const getRatingStars = (rating?: number) => {
    if (!rating) return null
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
      />
    ))
  }

  const getFeedbackTypeColor = (type: string) => {
    switch (type) {
      case 'question': return 'bg-blue-100 text-blue-800'
      case 'suggestion': return 'bg-green-100 text-green-800'
      case 'concern': return 'bg-red-100 text-red-800'
      case 'acknowledgment': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading feedback...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={loadFeedback} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Feedback Management
              </CardTitle>
              <CardDescription>
                {showAllFeedback 
                  ? "All feedback responses across the system" 
                  : "Feedback responses for selected data entry"
                }
              </CardDescription>
            </div>
            <Button onClick={loadFeedback} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="suggestion">Suggestion</SelectItem>
                <SelectItem value="concern">Concern</SelectItem>
                <SelectItem value="acknowledgment">Acknowledgment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFeedback.length > 0 ? (
                paginatedFeedback.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{item.user_name}</div>
                          <div className="text-sm text-gray-500">{item.user_role}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm line-clamp-3">{item.feedback_text}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={getFeedbackTypeColor(item.feedback_type)}>
                        {item.feedback_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.rating && (
                        <div className="flex items-center">
                          {getRatingStars(item.rating)}
                          <span className="ml-2 text-sm">{item.rating}/5</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {(canEdit && item.user_id === user.id) || isManager ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditFeedback(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // View-only dialog for feedback they can't edit
                              toast({
                                title: "Feedback Details",
                                description: item.feedback_text
                              })
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {((canEdit && item.user_id === user.id) || isManager) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this feedback?')) {
                                handleDeleteFeedback(item.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-gray-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No feedback found</p>
                      <p className="text-sm">Try adjusting your filters or search terms</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredFeedback.length)} of {filteredFeedback.length} feedback responses
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Feedback Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Feedback Text</label>
              <Textarea
                value={editForm.feedback_text}
                onChange={(e) => setEditForm(prev => ({ ...prev, feedback_text: e.target.value }))}
                placeholder="Enter your feedback..."
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Rating</label>
                <Select 
                  value={editForm.rating.toString()} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, rating: parseInt(value) }))}
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
                <label className="text-sm font-medium">Type</label>
                <Select 
                  value={editForm.feedback_type} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, feedback_type: value }))}
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
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
