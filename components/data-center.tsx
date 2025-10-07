"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Upload, Download, Database, FileText, Users, Trash2, Plus, X, 
  Send, MessageCircle, Star, Eye, Edit, Calendar, User as UserIcon, AlertCircle,
  CheckCircle, Clock, Archive
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"
import { dataCenterService, DataCenterEntry, DataFeedback } from "@/lib/data-center-service"
import { FeedbackManagementTable } from "@/components/feedback-management-table"
import { formatDisplayDate, sanitizeObject } from "@/lib/timestamp-utils"
import { showInfo } from "@/lib/sweetalert"

interface DataFile {
  id: string
  name: string
  type: 'csv' | 'xlsx' | 'txt'
  size: string
  uploadDate: string
  assignedTo: string[]
  recordCount: number
  status: 'active' | 'archived' | 'processing'
}

interface NumberAssignment {
  id: string
  numbers: string[]
  assignedTo: string
  assignedBy: string
  assignDate: string
  status: 'assigned' | 'used' | 'available'
  dealId?: string
}
interface DataCenterProps {
  userRole: 'manager' | 'salesman' | 'team_leader'
  user: { name: string; username: string; id: string }
}
export function DataCenter({ userRole, user }: DataCenterProps) {
  const { toast } = useToast()
  const [users, setUsers] = useState<any[]>([])
  const [userLoading, setUserLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [numberAssignments, setNumberAssignments] = useState<NumberAssignment[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [sharedFiles, setSharedFiles] = useState<any[]>([])
  
  // Data Center shared data states
  const [dataEntries, setDataEntries] = useState<DataCenterEntry[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showShareFileModal, setShowShareFileModal] = useState(false)
  const [showContentModal, setShowContentModal] = useState(false)
  const [selectedDataContent, setSelectedDataContent] = useState('')
  const [selectedDataTitle, setSelectedDataTitle] = useState('')
  const [createDataForm, setCreateDataForm] = useState({
    title: '',
    description: '',
    content: '',
    data_type: 'general',
    sent_to_team: '',
    sent_to_id: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  // File sharing form state
  const [shareFileForm, setShareFileForm] = useState({
    title: '',
    description: '',
    file: null as File | null,
    sent_to_team: '',
    sent_to_id: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    shareType: 'team' as 'team' | 'individual'
  });

  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedDataId, setSelectedDataId] = useState<string>('');
  const [feedbackForm, setFeedbackForm] = useState({
    feedback_text: '',
    rating: 5,
    feedback_type: 'general'
  })

  // Add error boundary for timestamp issues
  const [renderError, setRenderError] = useState<string | null>(null)
  
  useEffect(() => {
    // Reset render error when data changes
    setRenderError(null)
  }, [uploadedFiles, numberAssignments, dataEntries])

  // Load data files and assignments + Data Center entries
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use a valid user ID from the database instead of the hardcoded one
      const validUserId = user.id === 'manager-001' ? '0ChFAyPoh0nOK9MybrJn' : user.id;
      console.log('🔍 Loading data with user ID:', validUserId, 'Role:', userRole);
      
      // Load shared data entries with role-based filtering
      console.log('🔍 Loading shared data entries for:', { userId: validUserId, userRole });
      const result = await dataCenterService.getDataEntries(validUserId, userRole, {
        page: 1,
        limit: 50,
        data_type: 'all'
      })
      console.log('🔍 Shared data entries result:', result);
      setDataEntries(result.data || [])
      
      // Load shared files from data_center table (files only)
      console.log('🔍 About to fetch files with:', { userId: validUserId, userRole, data_type: 'file' });
      const filesResult = await dataCenterService.getDataEntries(validUserId, userRole, {
        page: 1,
        limit: 100,
        data_type: 'file'
      })
      
      console.log('🔍 Files result:', filesResult);
      console.log('🔍 Files data length:', filesResult.data?.length || 0);
      if (filesResult.data && filesResult.data.length > 0) {
        console.log('🔍 Sample file entry:', filesResult.data[0]);
      }
      
      // Convert data_center entries to file format for display
      const files = (filesResult.data || []).map((entry: any) => ({
        id: entry.id,
        name: entry.title,
        size: entry.content ? entry.content.match(/\(([\d.]+) MB\)/)?.[1] + ' MB' : '0 MB',
        recordCount: entry.content ? parseInt(entry.content.match(/(\d+) records/)?.[1] || '0') || 0 : 0,
        uploadDate: entry.created_at,
        uploadedBy: entry.sent_by_name || 'Unknown',
        uploadedById: entry.sent_by_id,
        assignedTo: entry.sent_to_team ? [entry.sent_to_team] : (entry.sent_to_name ? [entry.sent_to_name] : []),
        notes: entry.description,
        status: entry.status || 'active',
        priority: entry.priority || 'medium'
      }))
      
      setUploadedFiles(files)
      setNumberAssignments([])
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user.id, userRole])

  // Defensive: sanitize incoming arrays one more time before usage in JSX
  const sanitizedFiles = (uploadedFiles || []).map((f: any) => sanitizeObject(f))
  const sanitizedAssignments = (numberAssignments || []).map((a: any) => sanitizeObject(a))

  // Helper to avoid rendering raw objects by accident
  const safeDisplay = (val: any): string => {
    if (val == null) return "";
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val)
    if (val instanceof Date) return formatDisplayDate(val.toISOString())
    // Last resort, stringify to avoid React child object error
    try { return JSON.stringify(val) } catch { return String(val) }
  }

  // Role-based access control - salespeople and team leaders can view their assigned data
  const hasDataAccess = userRole === 'manager' || userRole === 'salesman' || userRole === 'team_leader';
  
  if (!hasDataAccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-red-600">Access Restricted</CardTitle>
          <CardDescription className="text-center">
            Data Center access is limited to managers, team leaders, and sales team members.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const [newAssignment, setNewAssignment] = useState({
    numbers: '',
    assignTo: '',
    notes: ''
  })

  const [bulkNumbers, setBulkNumbers] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [assignmentType, setAssignmentType] = useState<'individual' | 'team'>('individual')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedFileForAssign, setSelectedFileForAssign] = useState<string | null>(null)

  const isManager = userRole === 'manager'
  
  // Define available teams (matching database teams)
  const teams = [
    { id: 'ali_ashraf', name: 'ALI ASHRAF' },
    { id: 'cs_team', name: 'CS TEAM' },
    { id: 'sales_team', name: 'Sales Team' },
    { id: 'management', name: 'Management' }
  ]

  // Load users from MySQL
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUserLoading(true)
        console.log('🔄 DataCenter: Loading users from API...')
        
        // Test direct API call first with higher limit to get all users
        console.log('🔍 DataCenter: Testing direct API call to /api/users')
        const directResponse = await fetch('/api/users?limit=1000')
        console.log('🔍 DataCenter: Direct API response status:', directResponse.status)
        
        let allUsers = [];
        
        if (directResponse.ok) {
          const directData = await directResponse.json()
          console.log('🔍 DataCenter: Direct API data structure:', {
            success: directData.success,
            usersCount: directData.users?.length || 0,
            totalUsers: directData.total,
            hasUsers: !!directData.users
          })
          
          if (directData.success && directData.users && Array.isArray(directData.users)) {
            allUsers = directData.users;
            console.log('✅ DataCenter: Using direct API users:', allUsers.length)
            
            if (allUsers.length > 0) {
              console.log('📝 DataCenter: Sample user from direct API:', {
                id: allUsers[0].id,
                name: allUsers[0].name,
                username: allUsers[0].username,
                role: allUsers[0].role,
                team: allUsers[0].team,
                email: allUsers[0].email
              })
            }
          }
        }
        
        // Fallback to apiService if direct API didn't work
        if (allUsers.length === 0) {
          console.log('🔄 DataCenter: Trying apiService as fallback...')
          const serviceUsers = await apiService.getUsers({})
          console.log('🔍 DataCenter: ApiService response:', serviceUsers)
          
          if (Array.isArray(serviceUsers)) {
            allUsers = serviceUsers;
            console.log('✅ DataCenter: Using apiService users:', allUsers.length)
          }
        }
        
        // Final validation and logging
        console.log('📊 DataCenter: Final users count:', allUsers.length)
        if (allUsers.length > 0) {
          console.log('📝 DataCenter: Users by team:', allUsers.reduce((acc: Record<string, number>, user: any) => {
            const team = user.team || 'No Team';
            acc[team] = (acc[team] || 0) + 1;
            return acc;
          }, {} as Record<string, number>))
          
          console.log('📝 DataCenter: Users by role:', allUsers.reduce((acc: Record<string, number>, user: any) => {
            const role = user.role || 'No Role';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
          }, {} as Record<string, number>))
        }
        
        setUsers(allUsers)
      } catch (error) {
        console.error('❌ DataCenter: Error loading users:', error)
        toast({
          title: "Error Loading Users",
          description: "Failed to load user information. Please check console for details.",
          variant: "destructive"
        })
        setUsers([]) // Set empty array on error
      } finally {
        setUserLoading(false)
      }
    }
    loadUsers()
  }, [])

  // Handle creating shared data entry
  const handleCreateDataEntry = async () => {
    if (!createDataForm.title.trim() || !createDataForm.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use a valid user ID from the database instead of the hardcoded one
      const validUserId = user.id === 'manager-001' ? '0ChFAyPoh0nOK9MybrJn' : user.id;
      await dataCenterService.createDataEntry(validUserId, userRole, createDataForm);
      
      toast({
        title: "Success",
        description: userRole === 'salesman' ? "Feedback shared successfully" : "Data shared successfully",
      });

      // Reset form and close modal
      setCreateDataForm({
        title: '',
        description: '',
        content: '',
        data_type: 'general',
        sent_to_team: '',
        sent_to_id: '',
        priority: 'medium'
      });
      setShowCreateModal(false);

      // Reload data
      loadData();
    } catch (error) {
      console.error('Error creating data entry:', error);
      toast({
        title: "Error",
        description: userRole === 'salesman' ? "Failed to share feedback" : "Failed to share data",
        variant: "destructive",
      });
    }
  };

  // Handle deleting data entry (manager only)
  const handleDeleteDataEntry = async (dataId: string) => {
    if (!isManager) {
      toast({
        title: "Access Denied",
        description: "Only managers can delete shared data.",
        variant: "destructive"
      })
      return
    }

    try {
      await dataCenterService.deleteDataEntry(dataId, user.id, userRole)
      
      toast({
        title: "Data Deleted",
        description: "The shared data has been removed."
      })
      
      // Reload data
      const result = await dataCenterService.getDataEntries(user.id, userRole, {
        data_type: 'all',
        limit: 50
      })
      setDataEntries(result.data || [])
      
    } catch (error) {
      console.error('Error deleting data entry:', error)
      toast({
        title: "Delete Failed",
        description: "Failed to delete data. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Handle feedback submission
  const handleSubmitFeedback = async () => {
    if (!feedbackForm.feedback_text.trim()) {
      toast({
        title: "Missing Feedback",
        description: "Please provide your feedback text.",
        variant: "destructive"
      })
      return
    }

    try {
      await dataCenterService.submitFeedback(
        selectedDataId,
        user.id,
        userRole,
        {
          feedback_text: feedbackForm.feedback_text,
          rating: feedbackForm.rating,
          feedback_type: feedbackForm.feedback_type
        }
      )
      
      // Show SweetAlert success notification
      await showInfo("Feedback Submitted", "Thank you for your feedback! Your feedback has been successfully submitted.")
      
      // Reset form
      setFeedbackForm({
        feedback_text: '',
        rating: 5,
        feedback_type: 'general'
      })
      setShowFeedbackModal(false)
      setSelectedDataId('')
      
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast({
        title: "Submission Failed",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Handle file sharing
  const handleShareFile = async () => {
    if (!shareFileForm.title.trim() || !shareFileForm.file) {
      toast({
        title: "Error",
        description: "Please provide a title and select a file",
        variant: "destructive"
      });
      return;
    }

    // Validate that either team or individual is selected
    if (shareFileForm.shareType === 'team' && !shareFileForm.sent_to_team) {
      toast({
        title: "Error",
        description: "Please select a team to share with",
        variant: "destructive"
      });
      return;
    }

    if (shareFileForm.shareType === 'individual' && !shareFileForm.sent_to_id) {
      toast({
        title: "Error", 
        description: "Please select an individual to share with",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create file data entry with estimated record count based on file size
      const fileSizeMB = shareFileForm.file.size / 1024 / 1024;
      const estimatedRecords = Math.floor(fileSizeMB * 500); // Estimate ~500 records per MB
      
      const fileEntry = {
        title: shareFileForm.title,
        description: shareFileForm.description,
        content: `File: ${shareFileForm.file.name} (${fileSizeMB.toFixed(2)} MB) - Estimated ${estimatedRecords} records`,
        data_type: 'file',
        sent_to_team: shareFileForm.sent_to_team,
        sent_to_id: shareFileForm.sent_to_id,
        priority: shareFileForm.priority
      };

      // Actually send the file entry to the API
      console.log('🔍 About to create file entry:', fileEntry);
      console.log('🔍 Using user ID:', user.id, 'User role:', userRole);
      
      // Use a valid user ID from the database instead of the hardcoded one
      const validUserId = user.id === 'manager-001' ? '0ChFAyPoh0nOK9MybrJn' : user.id;
      console.log('🔍 Adjusted user ID for API call:', validUserId);
      
      await dataCenterService.createDataEntry(validUserId, userRole, fileEntry);
      console.log('✅ File entry created successfully');

      // Add to shared files list for display
      const sharedFile = {
        id: Date.now().toString(),
        title: shareFileForm.title,
        description: shareFileForm.description,
        fileName: shareFileForm.file.name,
        fileSize: `${(shareFileForm.file.size / 1024 / 1024).toFixed(2)} MB`,
        fileType: shareFileForm.file.type,
        uploadDate: new Date().toISOString(),
        uploadedBy: user.name,
        uploadedById: user.id,
        sent_to_team: shareFileForm.sent_to_team,
        sent_to_id: shareFileForm.sent_to_id,
        priority: shareFileForm.priority,
        status: 'active',
        feedbacks: []
      };

      const shareTarget = shareFileForm.shareType === 'team' 
        ? `team "${shareFileForm.sent_to_team}"` 
        : `individual user`;
      
      toast({
        title: "File Shared Successfully",
        description: `${shareFileForm.file.name} has been shared with ${shareTarget}.`
      });

      // Reload data to show the new file
      loadData();

      // Reset form and close modal
      setShareFileForm({
        title: '',
        description: '',
        file: null,
        sent_to_team: '',
        sent_to_id: '',
        priority: 'medium',
        shareType: 'team'
      });
      setShowShareFileModal(false);

      // Reload data
      loadData();

    } catch (error) {
      console.error('Error sharing file:', error);
      toast({
        title: "Share Failed",
        description: "Failed to share file. Please try again.",
        variant: "destructive"
      });
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isManager) {
      toast({
        title: "Access Denied",
        description: "Only managers can upload files.",
        variant: "destructive"
      });
      return;
    }

    // Create file record in MySQL (initially unassigned)
    const fileData = {
      name: file.name,
      type: file.name.endsWith('.csv') ? 'csv' as const : file.name.endsWith('.xlsx') ? 'xlsx' as const : 'txt' as const,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      uploadDate: new Date().toISOString(),
      assignedTo: [], // Start with no assignments
      recordCount: Math.floor(Math.random() * 500) + 50,
      uploadedBy: user.name,
      uploadedById: user.id,
      notes: 'Uploaded via Data Center - Ready for assignment',
      status: 'active' as const
    };

    try {
      // TODO: Implement data file creation in MySQL API
      const newFile: DataFile = {
        id: Date.now().toString(),
        ...fileData,
        assignedTo: fileData.assignedTo || []
      }
      setUploadedFiles(prev => [...prev, newFile])
      toast({
        title: "File Uploaded Successfully",
        description: `${file.name} has been uploaded. You can now assign it to teams or individuals.`
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleAssignFile = async () => {
    if (!selectedFileForAssign) return;

    const assignTo = assignmentType === 'team' ? selectedTeam : selectedAgent;
    if (!assignTo) {
      toast({
        title: "Missing Selection",
        description: `Please select a ${assignmentType} to assign to.`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current file data
      const currentFile = uploadedFiles.find(f => f.id === selectedFileForAssign);
      if (!currentFile) return;

      // Update assignments
      const newAssignments = [...(currentFile.assignedTo || [])];
      
      if (assignmentType === 'team') {
        // Add team assignment
        const teamName = teams.find(t => t.id === selectedTeam)?.name || selectedTeam;
        if (!newAssignments.includes(teamName)) {
          newAssignments.push(teamName);
        }
      } else {
        // Add individual assignment
        const userName = users.find(u => u.id === selectedAgent)?.name || selectedAgent;
        if (!newAssignments.includes(userName)) {
          newAssignments.push(userName);
        }
      }

      // TODO: Implement data file update in MySQL API
      setUploadedFiles(prev => prev.map(file => 
        file.id === selectedFileForAssign 
          ? { ...file, assignedTo: newAssignments }
          : file
      ));

      setShowAssignModal(false);
      setSelectedFileForAssign(null);
      setSelectedAgent('');
      setSelectedTeam('');

      toast({
        title: "Assignment Successful",
        description: `File assigned to ${assignmentType === 'team' ? teams.find(t => t.id === assignTo)?.name : users.find(u => u.id === assignTo)?.name}.`
      });
    } catch (error) {
      console.error('Error assigning file:', error);
      toast({
        title: "Assignment Failed",
        description: "Failed to assign file. Please try again.",
        variant: "destructive"
      });
    }
  }

  const handleBulkAssignment = async () => {
    if (!bulkNumbers.trim() || !selectedAgent) {
      toast({
        title: "Error",
        description: "Please provide numbers and select an agent",
        variant: "destructive"
      })
      return
    }

    const numbers = bulkNumbers.split('\n').filter(n => n.trim())
    
    try {
      // TODO: Implement number assignment creation in MySQL API
      const newAssignment: NumberAssignment = {
        id: Date.now().toString(),
        numbers,
        assignedTo: selectedAgent,
        assignedBy: user.name,
        assignDate: new Date().toISOString(),
        status: 'assigned'
      }
      setNumberAssignments(prev => [...prev, newAssignment])

      setBulkNumbers('')
      setSelectedAgent('')
      
      toast({
        title: "Assignment Created",
        description: `${numbers.length} numbers assigned to ${selectedAgent}`
      })

      // Reload assignments
      loadData()
    } catch (error) {
      console.error('Error creating assignment:', error)
      toast({
        title: "Assignment Failed",
        description: "Failed to create assignment. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!isManager) {
      toast({
        title: "Access Denied",
        description: "Only managers can delete files.",
        variant: "destructive"
      })
      return
    }

    try {
      // TODO: Implement data file deletion in MySQL API
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
      toast({
        title: "File Deleted",
        description: "File has been removed from the system."
      })
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        title: "Delete Failed",
        description: "Failed to delete file. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!isManager) {
      toast({
        title: "Access Denied",
        description: "Only managers can delete assignments.",
        variant: "destructive"
      })
      return
    }

    try {
      // TODO: Implement number assignment deletion in MySQL API
      setNumberAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId))
      toast({
        title: "Assignment Deleted",
        description: "The number assignment has been removed."
      })

      // Reload assignments
      loadData()
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast({
        title: "Delete Failed",
        description: "Failed to delete assignment. Please try again.",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      case 'assigned': return 'bg-blue-100 text-blue-800'
      case 'used': return 'bg-purple-100 text-purple-800'
      case 'available': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Enhanced role-based data filtering
  const visibleFiles = isManager ? sanitizedFiles : sanitizedFiles.filter(file => {
    if (!file.assignedTo || file.assignedTo.length === 0) return false;
    
    // Check if user is directly assigned by name
    if (file.assignedTo.includes(user.name)) return true;
    
    // Check if user is assigned by ID
    if (file.assignedTo.includes(user.id)) return true;
    
    // Check if user's team is assigned
    const userTeamMap = {
      'salesman': 'Sales Team',
      'customer-service': 'Customer Support',
      'manager': 'Management'
    };
    
    const userTeam = userTeamMap[userRole as keyof typeof userTeamMap];
    if (userTeam && file.assignedTo.includes(userTeam)) return true;
    
    // Check for role-based assignments
    if (file.assignedTo.includes(`role:${userRole}`)) return true;
    
    return false;
  })

  // Enhanced assignment filtering for salespeople
  const visibleAssignments = isManager ? sanitizedAssignments : sanitizedAssignments.filter(assignment => {
    // Check by name (case insensitive)
    if (assignment.assignedTo.toLowerCase() === user.name.toLowerCase()) return true;
    
    // Check by user ID
    if (assignment.assignedTo === user.id) return true;
    
    // Check by username
    if (assignment.assignedTo.toLowerCase() === user.username?.toLowerCase()) return true;
    
    return false;
  })

  // Show error state if connection fails or render error occurs
  if (error || renderError) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-red-600">
            {renderError ? 'Render Error' : 'Connection Error'}
          </CardTitle>
          <CardDescription className="text-center">
            {renderError || `Failed to connect to database: ${error}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => {
            setRenderError(null);
            window.location.reload();
          }}>
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading || userLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1,2,3].map((i: number) => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Wrap render in try-catch to prevent timestamp serialization crashes
  try {
    return (
      <>
        {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Assign Data File</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedFileForAssign(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Assignment Type</Label>
                  <Select value={assignmentType} onValueChange={(value: 'individual' | 'team') => setAssignmentType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual User</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {assignmentType === 'individual' ? (
                  <div>
                    <Label>Select User</Label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {userLoading ? (
                          <SelectItem value="loading" disabled>Loading users...</SelectItem>
                        ) : users.length === 0 ? (
                          <SelectItem value="no-users" disabled>No users found</SelectItem>
                        ) : (
                          users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.full_name || user.username} ({user.role}) - {user.team || user.team_name || 'No Team'}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label>Select Team</Label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedFileForAssign(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAssignFile}>
                    Assign File
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Data Modal */}
      {showCreateModal && (
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{userRole === 'salesman' ? 'Share Feedback' : 'Share Data'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={createDataForm.title}
                  onChange={(e) => setCreateDataForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter title..."
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createDataForm.description}
                  onChange={(e) => setCreateDataForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="content">Content (Optional)</Label>
                <Textarea
                  id="content"
                  value={createDataForm.content}
                  onChange={(e) => setCreateDataForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter detailed content..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Type</Label>
                  <Select value={createDataForm.data_type} onValueChange={(value) => setCreateDataForm(prev => ({ ...prev, data_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="policy">Policy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select value={createDataForm.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setCreateDataForm(prev => ({ ...prev, priority: value }))}>
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
                <Label>Share with Team</Label>
                <Select value={createDataForm.sent_to_team} onValueChange={(value) => setCreateDataForm(prev => ({ ...prev, sent_to_team: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.name}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Share with Individual</Label>
                <Select value={createDataForm.sent_to_id} onValueChange={(value) => setCreateDataForm(prev => ({ ...prev, sent_to_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {userLoading ? (
                      <SelectItem value="loading" disabled>Loading users...</SelectItem>
                    ) : users.length === 0 ? (
                      <SelectItem value="no-users" disabled>No users found - Check console for details</SelectItem>
                    ) : (
                      users
                        .sort((a, b) => {
                          // Sort by team first, then by name
                          const teamA = a.team || 'ZZZ_No Team';
                          const teamB = b.team || 'ZZZ_No Team';
                          if (teamA !== teamB) return teamA.localeCompare(teamB);
                          
                          const nameA = a.name || a.username || '';
                          const nameB = b.name || b.username || '';
                          return nameA.localeCompare(nameB);
                        })
                        .map((user) => {
                          const displayName = user.name || user.username || 'Unnamed User';
                          const team = user.team || 'No Team';
                          const role = user.role || 'No Role';
                          const email = user.email ? ` (${user.email})` : '';
                          
                          return (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{displayName}</span>
                                <span className="text-xs text-gray-500">
                                  {role} • {team}{email}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDataEntry}>
                  {userRole === 'salesman' ? 'Share Feedback' : 'Share Data'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="feedback_text">Your Feedback</Label>
                <Textarea
                  id="feedback_text"
                  value={feedbackForm.feedback_text}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, feedback_text: e.target.value }))}
                  placeholder="Share your thoughts, questions, or suggestions..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Feedback Type</Label>
                  <Select value={feedbackForm.feedback_type} onValueChange={(value) => setFeedbackForm(prev => ({ ...prev, feedback_type: value }))}>
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

                <div>
                  <Label>Rating (1-5)</Label>
                  <Select value={feedbackForm.rating.toString()} onValueChange={(value) => setFeedbackForm(prev => ({ ...prev, rating: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Poor</SelectItem>
                      <SelectItem value="2">2 - Fair</SelectItem>
                      <SelectItem value="3">3 - Good</SelectItem>
                      <SelectItem value="4">4 - Very Good</SelectItem>
                      <SelectItem value="5">5 - Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowFeedbackModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitFeedback}>
                  Submit Feedback
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Content View Modal */}
      {showContentModal && (
        <Dialog open={showContentModal} onOpenChange={setShowContentModal}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                {selectedDataTitle} - File Data
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">File Content:</span>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedDataContent)
                        toast({
                          title: "Copied!",
                          description: "Content copied to clipboard",
                        })
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([selectedDataContent], { type: 'text/plain' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${selectedDataTitle.replace(/[^a-z0-9]/gi, '_')}.txt`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                  {selectedDataContent.includes('File:') && selectedDataContent.includes('records') ? (
                    // File metadata display
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-blue-600 mb-3">📁 File Information:</div>
                      <pre className="whitespace-pre-wrap text-sm font-mono bg-blue-50 p-3 rounded">
                        {selectedDataContent}
                      </pre>
                      <div className="text-xs text-muted-foreground mt-2 p-2 bg-yellow-50 rounded">
                        💡 This appears to be file metadata. The actual file data would be processed and displayed here in a production system.
                      </div>
                    </div>
                  ) : selectedDataContent.includes(',') && selectedDataContent.includes('\n') ? (
                    // CSV-like data display
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-green-600 mb-3">📊 Structured Data:</div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border-collapse border border-gray-300">
                          {selectedDataContent.split('\n').slice(0, 10).map((line, index) => (
                            <tr key={index} className={index === 0 ? 'bg-gray-100 font-medium' : ''}>
                              {line.split(',').map((cell, cellIndex) => (
                                <td key={cellIndex} className="border border-gray-300 px-2 py-1">
                                  {cell.trim()}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </table>
                        {selectedDataContent.split('\n').length > 10 && (
                          <div className="text-xs text-muted-foreground mt-2 text-center">
                            ... and {selectedDataContent.split('\n').length - 10} more rows
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Regular text display
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-600 mb-3">📄 Text Content:</div>
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {selectedDataContent}
                      </pre>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Content length: {selectedDataContent.length} characters
                  {selectedDataContent.includes('\n') && (
                    <span> • {selectedDataContent.split('\n').length} lines</span>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowContentModal(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setShowContentModal(false)
                    setShowFeedbackModal(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Provide Feedback
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Share File Modal */}
      {showShareFileModal && (
        <Dialog open={showShareFileModal} onOpenChange={setShowShareFileModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Share File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-title">Title</Label>
                <Input
                  id="file-title"
                  value={shareFileForm.title}
                  onChange={(e) => setShareFileForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter file title..."
                />
              </div>
              
              <div>
                <Label htmlFor="file-description">Description</Label>
                <Textarea
                  id="file-description"
                  value={shareFileForm.description}
                  onChange={(e) => setShareFileForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter file description..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="file-upload">Select File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setShareFileForm(prev => ({ ...prev, file: file || null }));
                  }}
                  accept=".xls,.xlsx,.csv"
                />
                {shareFileForm.file && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {shareFileForm.file.name} ({(shareFileForm.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div>
                <Label>Priority</Label>
                <Select value={shareFileForm.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setShareFileForm(prev => ({ ...prev, priority: value }))}>
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

              <div>
                <Label>Share With</Label>
                <div className="flex space-x-4 mt-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="shareType"
                      value="team"
                      checked={shareFileForm.shareType === 'team'}
                      onChange={(e) => setShareFileForm(prev => ({ 
                        ...prev, 
                        shareType: 'team',
                        sent_to_id: '', // Clear individual selection
                      }))}
                      className="text-blue-600"
                    />
                    <span>Team</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="shareType"
                      value="individual"
                      checked={shareFileForm.shareType === 'individual'}
                      onChange={(e) => setShareFileForm(prev => ({ 
                        ...prev, 
                        shareType: 'individual',
                        sent_to_team: '', // Clear team selection
                      }))}
                      className="text-blue-600"
                    />
                    <span>Individual</span>
                  </label>
                </div>
              </div>

              {shareFileForm.shareType === 'team' && (
                <div>
                  <Label>Select Team</Label>
                  <Select value={shareFileForm.sent_to_team} onValueChange={(value) => setShareFileForm(prev => ({ ...prev, sent_to_team: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.name}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {shareFileForm.shareType === 'individual' && (
                <div>
                  <Label>Select Individual</Label>
                  <Select value={shareFileForm.sent_to_id} onValueChange={(value) => setShareFileForm(prev => ({ ...prev, sent_to_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {userLoading ? (
                        <SelectItem value="loading" disabled>Loading users...</SelectItem>
                      ) : users.length === 0 ? (
                        <SelectItem value="no-users" disabled>No users found</SelectItem>
                      ) : (
                        users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.full_name || user.username} ({user.role}) - {user.team || user.team_name || 'No Team'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowShareFileModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleShareFile}>
                  Share File
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Data Center
          </h2>
          <p className="text-muted-foreground">
            {isManager 
              ? 'Upload, manage, and assign data files and numbers to team members'
              : 'Access your assigned data and download resources'}
          </p>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <Button 
              onClick={() => setShowShareFileModal(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload & Share File
            </Button>
          )}
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            {userRole === 'salesman' ? 'Share Feedback' : 'Share Data'}
          </Button>
        </div>
      </div>

      {/* Shared Data Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Shared Data ({dataEntries.length})
          </CardTitle>
          <CardDescription>
            {isManager 
              ? 'Manage shared data and communications' 
              : userRole === 'salesman' 
                ? 'Share feedback and view data shared with you'
                : 'View data shared with you'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataEntries.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Shared Data</h3>
              <p className="text-sm text-muted-foreground">
                {isManager ? 'Start sharing data with your team members.' : 'No data has been shared with you yet.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Title</TableHead>
                    <TableHead className="w-[200px]">Description</TableHead>
                    <TableHead className="w-[300px]">Content</TableHead>
                    <TableHead className="w-[80px]">Type</TableHead>
                    <TableHead className="w-[80px]">Priority</TableHead>
                    <TableHead className="w-[100px]">Team</TableHead>
                    <TableHead className="w-[120px]">Created</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{entry.title}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {entry.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.content ? (
                          <div className="max-w-[300px]">
                            <div 
                              className="bg-muted/50 p-2 rounded text-xs border cursor-pointer hover:bg-muted/70 transition-colors"
                              onClick={() => {
                                setSelectedDataId(entry.id)
                                setSelectedDataContent(entry.content || '')
                                setSelectedDataTitle(entry.title || 'Untitled')
                                setShowContentModal(true)
                              }}
                            >
                              <div className="max-h-20 overflow-y-auto">
                                <div className="whitespace-pre-wrap">
                                  {entry.content.length > 150 
                                    ? `${entry.content.substring(0, 150)}...` 
                                    : entry.content
                                  }
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-blue-600 text-xs font-medium">
                                    <Eye className="h-3 w-3 mr-1 inline" />
                                    Click to view file data
                                  </span>
                                  {entry.content.length > 150 && (
                                    <span className="text-muted-foreground text-xs">
                                      {entry.content.length} chars
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No content</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {entry.data_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${
                          entry.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          entry.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          entry.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {entry.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {entry.sent_to_team || 'Individual'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {safeDisplay(formatDisplayDate(entry.created_at))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedDataId(entry.id)
                              setShowFeedbackModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-700 text-xs px-2 py-1"
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Feedback
                          </Button>
                          {isManager && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteDataEntry(entry.id)}
                              className="text-destructive hover:text-destructive text-xs px-2 py-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shared Files Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Shared Files ({sharedFiles.length})
          </CardTitle>
          <CardDescription>
            Files shared with you and your team - provide feedback on shared files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sharedFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Files Shared</h3>
              <p className="text-sm text-muted-foreground">
                No files have been shared yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">File</th>
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Size</th>
                    <th className="text-left p-3">Shared By</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Priority</th>
                    <th className="text-left p-3">Team</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sharedFiles.map((file) => (
                    <tr key={file.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{file.fileName}</span>
                        </div>
                      </td>
                      <td className="p-3">{file.title}</td>
                      <td className="p-3">{file.fileSize}</td>
                      <td className="p-3">{file.uploadedBy}</td>
                      <td className="p-3">{new Date(file.uploadDate).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Badge className={`${
                          file.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          file.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          file.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {file.priority}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-muted-foreground">
                          {file.sent_to_team || 'Individual'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedDataId(file.id)
                              setShowFeedbackModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Feedback
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          {isManager && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSharedFiles(prev => prev.filter(f => f.id !== file.id))
                                toast({
                                  title: "File Removed",
                                  description: "Shared file has been removed from the system."
                                })
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Data Files
          </CardTitle>
          <CardDescription>
            {isManager ? 'Manage uploaded data files and assignments' : 'Your assigned data files'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isManager ? (
            // Manager view - Card layout with assignment controls
            <div className="space-y-4">
              {visibleFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <h4 className="font-medium">{safeDisplay(file.name)}</h4>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{safeDisplay(file.size)}</span>
                        <span>•</span>
                        <span>{safeDisplay(file.recordCount?.toLocaleString?.() ?? file.recordCount)}</span>
                        <span>•</span>
                        <span>Uploaded {safeDisplay(formatDisplayDate(file.uploadDate))}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(file.status)}>
                          {file.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Assigned to: {file.assignedTo?.length > 0 ? safeDisplay(file.assignedTo.join(', ')) : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedFileForAssign(file.id);
                        setShowAssignModal(true);
                      }}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Salesperson view - Enhanced card layout with detailed information
            <div className="space-y-4">
              {visibleFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Data Files Assigned</h3>
                  <p className="text-sm text-muted-foreground">
                    You don't have any data files assigned to you yet. Contact your manager for access.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {visibleFiles.map((file) => (
                    <Card key={file.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                              <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="font-semibold text-lg">{safeDisplay(file.name)}</h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Size:</span>
                                  <p className="font-medium">{safeDisplay(file.size)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Records:</span>
                                  <p className="font-medium">{safeDisplay(file.recordCount?.toLocaleString?.() ?? file.recordCount)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Uploaded:</span>
                                  <p className="font-medium">{safeDisplay(formatDisplayDate(file.uploadDate))}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <Badge className={getStatusColor(file.status)}>
                                    {file.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="mt-3">
                                <span className="text-sm text-muted-foreground">Assigned to: </span>
                                <span className="text-sm font-medium">
                                  {safeDisplay(file.assignedTo?.join(', ') || 'Unassigned')}
                                </span>
                              </div>
                              {file.notes && (
                                <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                  <p className="text-sm text-muted-foreground">{safeDisplay(file.notes)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Number Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bulk Number Assignment (Manager Only) */}
        {isManager && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk Number Assignment</CardTitle>
              <CardDescription>Assign phone numbers to sales agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bulk-numbers">Phone Numbers (one per line)</Label>
                <Textarea
                  id="bulk-numbers"
                  placeholder="Enter phone numbers, one per line..."
                  value={bulkNumbers}
                  onChange={(e) => setBulkNumbers(e.target.value)}
                  rows={6}
                />
              </div>
              
              <div>
                <Label htmlFor="assign-to">Assign To</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.name.toLowerCase()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleBulkAssignment}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign Numbers
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Number Assignments List */}
        <Card className={isManager ? '' : 'lg:col-span-2'}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isManager ? 'All Number Assignments' : 'My Assigned Numbers'}</span>
              {!isManager && visibleAssignments.length > 0 && (
                <Badge variant="secondary">
                  {visibleAssignments.reduce((sum, assignment) => sum + ((assignment.numbers?.length) || 0), 0)} Total Numbers
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isManager 
                ? 'View and manage all number assignments across teams'
                : 'Phone numbers assigned to you for sales activities - Use these for outbound calls'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visibleAssignments.map((assignment) => (
                <Card key={assignment.id} className={`border-l-4 ${assignment.status === 'assigned' ? 'border-l-green-500' : assignment.status === 'used' ? 'border-l-purple-500' : 'border-l-gray-400'}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">
                          Assignment #{safeDisplay(assignment.id.slice(-8))}
                        </h4>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-green-600">
                            {safeDisplay(assignment.numbers.length)} numbers assigned to {safeDisplay(assignment.assignedTo)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Assigned by {safeDisplay(assignment.assignedBy)} on {safeDisplay(formatDisplayDate(assignment.assignDate))}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                        {assignment.dealId && (
                          <Badge variant="outline" className="text-xs">
                            Deal: {safeDisplay(assignment.dealId)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {!isManager && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Your Active Lead List</span>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          These numbers are exclusively assigned to you. Start calling to generate leads and close deals!
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Phone Numbers:</Label>
                        <span className="text-xs text-muted-foreground">
                          {safeDisplay(assignment.numbers.length)} total
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                        {assignment.numbers.map((number: string, index: number) => (
                          <div key={index} className="flex items-center justify-between text-sm font-mono bg-muted p-2 rounded hover:bg-muted/80 transition-colors">
                            <span>{safeDisplay(number)}</span>
                            {!isManager && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <span className="text-xs">📞</span>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        {assignment.notes && (
                          <span>📝 {assignment.notes}</span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-3 w-3 mr-1" />
                          Export CSV
                        </Button>
                        {!isManager && (
                          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                            <span className="mr-1">📞</span>
                            Start Calling
                          </Button>
                        )}
                        {isManager && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {visibleAssignments.length === 0 && (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Database className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No assignments found</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {isManager 
                      ? 'Create your first number assignment using the bulk assignment tool above'
                      : 'No phone numbers have been assigned to you yet. Contact your manager to get your lead list assigned.'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold">{visibleFiles.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">
                  {visibleFiles.reduce((sum, file) => sum + (Number(file.recordCount) || 0), 0)}
                </p>
              </div>
              <Database className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assigned Numbers</p>
                <p className="text-2xl font-bold">
                  {visibleAssignments.reduce((sum, assignment) => sum + ((assignment.numbers?.length) || 0), 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Shared Data</p>
                <p className="text-2xl font-bold">{dataEntries.length}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Management Section - Manager Only */}
      {isManager && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                User Feedback Management
              </CardTitle>
              <CardDescription>
                View and manage all feedback submitted by users on shared data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedbackManagementTable 
                userRole={userRole}
                user={user}
                showAllFeedback={true}
              />
            </CardContent>
          </Card>
        </div>
      )}
      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common data management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col"
                onClick={async () => {
                  // Create file input for bulk upload
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv,.xlsx,.json';
                  input.multiple = true;
                  input.onchange = async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files && files.length > 0) {
                      console.log('Files selected for bulk upload:', files);
                      // TODO: Implement bulk upload functionality
                      await showInfo('Bulk Upload', `Selected ${files.length} file(s) for upload. Upload functionality will be implemented.`);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="h-6 w-6 mb-2" />
                Bulk Upload
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col"
                onClick={async () => {
                  // Export all data
                  console.log('Exporting all data...');
                  // TODO: Implement export functionality
                  await showInfo('Export Data', 'Export functionality will be implemented. This will download all data as CSV/Excel.');
                }}
              >
                <Download className="h-6 w-6 mb-2" />
                Export All
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col"
                onClick={async () => {
                  // Assign data to users
                  console.log('Opening data assignment dialog...');
                  // TODO: Implement data assignment functionality
                  await showInfo('Assign Data', 'Data assignment functionality will be implemented. This will allow assigning leads/deals to team members.');
                }}
              >
                <Users className="h-6 w-6 mb-2" />
                Assign Data
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col"
                onClick={async () => {
                  // Archive old data
                  console.log('Starting data archival process...');
                  // TODO: Implement archival functionality
                  await showInfo('Archive Data', 'Archive functionality will be implemented. This will move old data to archive storage.');
                }}
              >
                <Database className="h-6 w-6 mb-2" />
                Archive Old
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
      </>
    )
  } catch (renderError: any) {
    console.error('Data Center render error:', renderError);
    setRenderError('Failed to render data. This may be due to timestamp serialization issues.');
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-red-600">Render Error</CardTitle>
          <CardDescription className="text-center">
            Failed to render data center. Please refresh the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    );
  }
}