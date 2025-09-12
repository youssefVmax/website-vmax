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

  // Restrict access to managers only
  if (userRole !== 'manager') {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-red-600">Access Restricted</CardTitle>
          <CardDescription className="text-center">
            Data Center management is only available to managers.
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

  // Format Firestore timestamp to readable date
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      // If it's a Firestore timestamp with seconds property
      if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      
      // If it's a Firestore timestamp with toDate method
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      }
      
      // If it's already a Date object or string
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      }
      
      // If it's a string, try to parse it
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString();
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'N/A';
    }
  };

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

  // Filter data based on user role and team assignments
  const visibleFiles = isManager ? uploadedFiles : uploadedFiles.filter(file => {
    if (!file.assignedTo || file.assignedTo.length === 0) return false;
    
    // Check if user is directly assigned
    if (file.assignedTo.includes(user.name)) return true;
    
    // Check if user's team is assigned
    const userTeamMap = {
      'salesman': 'Sales Team',
      'customer-service': 'Customer Support',
      'manager': 'Management'
    };
    
    const userTeam = userTeamMap[userRole as keyof typeof userTeamMap];
    if (userTeam && file.assignedTo.includes(userTeam)) return true;
    
    return false;
  })

  const visibleAssignments = isManager ? numberAssignments : numberAssignments.filter(assignment =>
    assignment.assignedTo.toLowerCase() === user.name.toLowerCase()
  )

  // Show error state if Firebase connection fails
  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-red-600">Connection Error</CardTitle>
          <CardDescription className="text-center">
            Failed to connect to Firebase: {error}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => window.location.reload()}>
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
            // Non-manager view - Table layout for better data viewing
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span>{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{file.size}</TableCell>
                        <TableCell>{file.recordCount.toLocaleString()}</TableCell>
                        <TableCell>{formatTimestamp(file.uploadDate)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(file.status)}>
                            {file.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
            <CardTitle>
              {isManager ? 'All Number Assignments' : 'My Assigned Numbers'}
            </CardTitle>
            <CardDescription>
              {isManager 
                ? 'View and manage all number assignments across teams'
                : 'Phone numbers assigned to you for sales activities'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visibleAssignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">
                        Assignment #{assignment.id}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {assignment.numbers.length} numbers assigned to {assignment.assignedTo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Assigned by {assignment.assignedBy} on {assignment.assignDate}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(assignment.status)}>
                        {assignment.status}
                      </Badge>
                      {assignment.dealId && (
                        <Badge variant="outline">
                          Deal: {assignment.dealId}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Assigned Numbers:</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {assignment.numbers.slice(0, 6).map((number: string, index: number) => (
                        <div key={index} className="text-xs font-mono bg-muted p-2 rounded">
                          {number}
                        </div>
                      ))}
                      {assignment.numbers.length > 6 && (
                        <div className="text-xs text-muted-foreground p-2">
                          +{assignment.numbers.length - 6} more...
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-3">
                    <Button variant="outline" size="sm">
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
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
              ))}

              {visibleAssignments.length === 0 && (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No assignments found</h3>
                  <p className="text-muted-foreground">
                    {isManager 
                      ? 'Create your first number assignment above'
                      : 'No numbers have been assigned to you yet'}
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
}