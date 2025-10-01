"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Plus
} from "lucide-react"
import { API_CONFIG } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface EditableDataTableProps {
  title: string
  description?: string
  endpoint: string // e.g., 'deals-api.php' or 'callbacks-api.php'
  columns: Array<{
    key: string
    label: string
    type?: 'text' | 'select' | 'date' | 'number' | 'textarea'
    options?: Array<{ value: string; label: string }>
    editable?: boolean
    sortable?: boolean
  }>
  filters?: Array<{
    key: string
    label: string
    type: 'select' | 'text'
    options?: Array<{ value: string; label: string }>
  }>
  canEdit?: boolean
  canDelete?: boolean
  canCreate?: boolean
  userRole?: string
  userId?: string
  teamFilter?: string
  onRowClick?: (row: any) => void
}

export default function EditableDataTable({
  title,
  description,
  endpoint,
  columns,
  filters = [],
  canEdit = false,
  canDelete = false,
  canCreate = false,
  userRole,
  userId,
  teamFilter,
  onRowClick
}: EditableDataTableProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  })
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  
  // Edit states
  const [editingRow, setEditingRow] = useState<any>(null)
  const [editFormData, setEditFormData] = useState<Record<string, any>>({})
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [pagination.page, pagination.limit, searchTerm, filterValues, teamFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
        ...filterValues
      })
      
      if (teamFilter) {
        params.append('team', teamFilter)
      }
      
      if (userId && userRole !== 'manager') {
        params.append('user_id', userId)
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/${endpoint}?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data || [])
        if (result.pagination) {
          setPagination(prev => ({
            ...prev,
            total: result.pagination.total,
            totalPages: result.pagination.total_pages
          }))
        }
      } else {
        throw new Error(result.error || 'Failed to load data')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (row: any) => {
    setEditingRow(row)
    setEditFormData({ ...row })
    setIsEditDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData)
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Record updated successfully",
        })
        setIsEditDialogOpen(false)
        setEditingRow(null)
        loadData()
      } else {
        throw new Error(result.error || 'Failed to update record')
      }
    } catch (error) {
      console.error('Error updating record:', error)
      toast({
        title: "Error",
        description: "Failed to update record. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Record deleted successfully",
        })
        loadData()
      } else {
        throw new Error(result.error || 'Failed to delete record')
      }
    } catch (error) {
      console.error('Error deleting record:', error)
      toast({
        title: "Error",
        description: "Failed to delete record. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCreate = async () => {
    try {
      const createData = { ...editFormData }
      if (userId) {
        createData.user_id = userId
        createData.sales_agent_id = userId
      }
      if (teamFilter) {
        createData.team = teamFilter
        createData.sales_team = teamFilter
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData)
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Record created successfully",
        })
        setIsCreateDialogOpen(false)
        setEditFormData({})
        loadData()
      } else {
        throw new Error(result.error || 'Failed to create record')
      }
    } catch (error) {
      console.error('Error creating record:', error)
      toast({
        title: "Error",
        description: "Failed to create record. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleLimitChange = (newLimit: string) => {
    setPagination(prev => ({ ...prev, limit: parseInt(newLimit), page: 1 }))
  }

  const renderEditField = (column: any, value: any) => {
    const fieldValue = editFormData[column.key] || value || ''

    switch (column.type) {
      case 'select':
        return (
          <Select
            value={fieldValue}
            onValueChange={(newValue) => 
              setEditFormData(prev => ({ ...prev, [column.key]: newValue }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${column.label}`} />
            </SelectTrigger>
            <SelectContent>
              {column.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'textarea':
        return (
          <Textarea
            value={fieldValue}
            onChange={(e) => 
              setEditFormData(prev => ({ ...prev, [column.key]: e.target.value }))
            }
            placeholder={column.label}
            rows={3}
          />
        )
      
      case 'number':
        return (
          <Input
            type="number"
            value={fieldValue}
            onChange={(e) => 
              setEditFormData(prev => ({ ...prev, [column.key]: e.target.value }))
            }
            placeholder={column.label}
          />
        )
      
      case 'date':
        return (
          <Input
            type="date"
            value={fieldValue}
            onChange={(e) => 
              setEditFormData(prev => ({ ...prev, [column.key]: e.target.value }))
            }
          />
        )
      
      default:
        return (
          <Input
            value={fieldValue}
            onChange={(e) => 
              setEditFormData(prev => ({ ...prev, [column.key]: e.target.value }))
            }
            placeholder={column.label}
          />
        )
    }
  }

  const renderCellValue = (column: any, value: any) => {
    if (column.type === 'select' && column.options) {
      const option = column.options.find((opt: any) => opt.value === value)
      return option ? option.label : value
    }
    
    if (column.key.includes('date') && value) {
      return new Date(value).toLocaleDateString()
    }
    
    if (column.key.includes('amount') || column.key.includes('value')) {
      return value ? `$${parseFloat(value).toLocaleString()}` : '-'
    }
    
    return value || '-'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {canCreate && (
            <Button onClick={() => {
              setEditFormData({})
              setIsCreateDialogOpen(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          )}
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {filters.map((filter) => (
            <div key={filter.key} className="min-w-[150px]">
              {filter.type === 'select' ? (
                <Select
                  value={filterValues[filter.key] || ''}
                  onValueChange={(value) => 
                    setFilterValues(prev => ({ ...prev, [filter.key]: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All {filter.label}</SelectItem>
                    {filter.options?.map((option: any) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder={filter.label}
                  value={filterValues[filter.key] || ''}
                  onChange={(e) => 
                    setFilterValues(prev => ({ ...prev, [filter.key]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
                  {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow 
                    key={row.id || index}
                    className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        {renderCellValue(column, row[column.key])}
                      </TableCell>
                    ))}
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <div className="flex space-x-2">
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(row)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(row.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Select
                  value={pagination.limit.toString()}
                  onValueChange={handleLimitChange}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>
              Make changes to the record below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {columns.filter(col => col.editable !== false).map((column) => (
              <div key={column.key} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={column.key} className="text-right">
                  {column.label}
                </Label>
                <div className="col-span-3">
                  {renderEditField(column, editingRow?.[column.key])}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Record</DialogTitle>
            <DialogDescription>
              Fill in the details for the new record.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {columns.filter(col => col.editable !== false && col.key !== 'id').map((column) => (
              <div key={column.key} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={column.key} className="text-right">
                  {column.label}
                </Label>
                <div className="col-span-3">
                  {renderEditField(column, '')}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
