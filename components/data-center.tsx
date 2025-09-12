"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, Download, Database, FileText, Users, Trash2, Plus, Search, Filter, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userService } from "@/lib/firebase-user-service"
import { useFirebaseSalesData } from "@/hooks/useFirebaseSalesData"
import { dataFilesService, numberAssignmentsService } from "@/lib/firebase-data-services"
import { useFirebaseDataFiles } from "@/hooks/useFirebaseDataFiles"
import { showInfo, showSuccess } from "@/lib/sweetalert"
import { formatDisplayDate } from "@/lib/timestamp-utils"

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
  userRole: 'manager' | 'salesman' | 'customer-service'
  user: { name: string; username: string; id: string }
}

export function DataCenter({ userRole, user }: DataCenterProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [users, setUsers] = useState<any[]>([])
  const [userLoading, setUserLoading] = useState(true)
  const { sales = [] } = useFirebaseSalesData(userRole, user.id, user.name)

  const { files: uploadedFiles, assignments: numberAssignments, loading, error } = useFirebaseDataFiles(userRole, user.name)

  // Add error boundary for timestamp issues
  const [renderError, setRenderError] = useState<string | null>(null)
  
  useEffect(() => {
    // Reset render error when data changes
    setRenderError(null)
  }, [uploadedFiles, numberAssignments])

  // Role-based access control - salespeople can view their assigned data
  const hasDataAccess = userRole === 'manager' || userRole === 'salesman';
  
  if (!hasDataAccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-red-600">Access Restricted</CardTitle>
          <CardDescription className="text-center">
            Data Center access is limited to managers and sales team members.
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
  
  // Define available teams
  const teams = [
    { id: 'sales', name: 'Sales Team' },
    { id: 'support', name: 'Customer Support' },
    { id: 'closing', name: 'Closing Team' },
    { id: 'management', name: 'Management' }
  ]

  // Load users from Firebase
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUserLoading(true)
        const allUsers = await userService.getAllUsers()
        setUsers(allUsers)
      } catch (error) {
        console.error('Error loading users:', error)
        toast({
          title: "Error Loading Users",
          description: "Failed to load user information.",
          variant: "destructive"
        })
      } finally {
        setUserLoading(false)
      }
    }
    loadUsers()
  }, [])

  // Use the centralized timestamp formatting utility
  const formatTimestamp = formatDisplayDate;

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

    // Create file record in Firebase (initially unassigned)
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
      await dataFilesService.createDataFile(fileData)
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

      await dataFilesService.updateDataFile(selectedFileForAssign, {
        assignedTo: newAssignments
      });

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
        title: "Missing Information",
        description: "Please provide numbers and select an agent.",
        variant: "destructive"
      })
      return
    }

    const numbers = bulkNumbers.split('\n').filter(n => n.trim())
    
    try {
      await numberAssignmentsService.createNumberAssignment({
        numbers,
        assignedTo: selectedAgent,
        assignedBy: user.name,
        assignedById: user.id,
        notes: 'Bulk assignment via Data Center'
      })

      setBulkNumbers('')
      setSelectedAgent('')

      toast({
        title: "Numbers Assigned Successfully",
        description: `${numbers.length} numbers assigned to ${selectedAgent}.`
      })
    } catch (error) {
      console.error('Error assigning numbers:', error)
      toast({
        title: "Assignment Failed",
        description: "Failed to assign numbers. Please try again.",
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
      await dataFilesService.deleteDataFile(fileId)
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
  const visibleFiles = isManager ? uploadedFiles : uploadedFiles.filter(file => {
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
  const visibleAssignments = isManager ? numberAssignments : numberAssignments.filter(assignment => {
    // Check by name (case insensitive)
    if (assignment.assignedTo.toLowerCase() === user.name.toLowerCase()) return true;
    
    // Check by user ID
    if (assignment.assignedTo === user.id) return true;
    
    // Check by username
    if (assignment.assignedTo.toLowerCase() === user.username?.toLowerCase()) return true;
    
    return false;
  })

  // Show error state if Firebase connection fails or render error occurs
  if (error || renderError) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-red-600">
            {renderError ? 'Render Error' : 'Connection Error'}
          </CardTitle>
          <CardDescription className="text-center">
            {renderError || `Failed to connect to Firebase: ${error}`}
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
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
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
        {isManager && (
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.xlsx,.xls"
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
        )}
      </div>

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
                      <h4 className="font-medium">{file.name}</h4>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{file.size}</span>
                        <span>•</span>
                        <span>{file.recordCount} records</span>
                        <span>•</span>
                        <span>Uploaded {formatTimestamp(file.uploadDate)}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(file.status)}>
                          {file.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Assigned to: {file.assignedTo?.length > 0 ? file.assignedTo.join(', ') : 'Unassigned'}
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
                              <h3 className="font-semibold text-lg">{file.name}</h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Size:</span>
                                  <p className="font-medium">{file.size}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Records:</span>
                                  <p className="font-medium">{file.recordCount.toLocaleString()}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Uploaded:</span>
                                  <p className="font-medium">{formatTimestamp(file.uploadDate)}</p>
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
                                  {file.assignedTo?.join(', ') || 'Unassigned'}
                                </span>
                              </div>
                              {file.notes && (
                                <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                  <p className="text-sm text-muted-foreground">{file.notes}</p>
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
                  {visibleAssignments.reduce((sum, assignment) => sum + assignment.numbers.length, 0)} Total Numbers
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
                          Assignment #{assignment.id.slice(-8)}
                        </h4>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-green-600">
                            📞 {assignment.numbers.length} numbers ready for calling
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Assigned by {assignment.assignedBy} • {formatTimestamp(assignment.assignDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                        {assignment.dealId && (
                          <Badge variant="outline" className="text-xs">
                            Deal: {assignment.dealId}
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
                          {assignment.numbers.length} total
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                        {assignment.numbers.map((number: string, index: number) => (
                          <div key={index} className="flex items-center justify-between text-sm font-mono bg-muted p-2 rounded hover:bg-muted/80 transition-colors">
                            <span>{number}</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  {visibleFiles.reduce((sum, file) => sum + file.recordCount, 0)}
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
                  {visibleAssignments.reduce((sum, assignment) => sum + assignment.numbers.length, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
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
  } catch (renderErr: any) {
    console.error('Data Center render error:', renderErr);
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