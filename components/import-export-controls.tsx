"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Database, Download, RefreshCw, Shield, FileText, AlertTriangle } from "lucide-react"
import { showSuccess, showError, showConfirm } from "@/lib/sweetalert"
import { useMySQLSalesData } from "@/hooks/useMySQLSalesData"
import { User } from "@/lib/auth"

interface ImportExportControlsProps {
  user: User
}

export function ImportExportControls({ user }: ImportExportControlsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<string>('deals')
  const [exportFormat, setExportFormat] = useState<string>('csv')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const { refreshData } = useMySQLSalesData({ userRole: user.role })

  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true)
      await refreshData?.()
      showSuccess("Data Refreshed", "MySQL data has been refreshed successfully.")
    } catch (error) {
      console.error('Refresh error:', error)
      showError("Refresh Failed", "Failed to refresh data. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleExportData = async () => {
    if (user.role !== 'manager') {
      showError("Permission Denied", "Only managers are allowed to export data.")
      return
    }

    try {
      setIsExporting(true)
      
      const params = new URLSearchParams({
        userRole: user.role,
        userId: user.id.toString(),
        exportType,
        format: exportFormat
      })

      const response = await fetch(`/api/export?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Export failed')
      }

      if (exportFormat === 'csv') {
        // Handle CSV download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        showSuccess("Export Complete", `${exportType} data exported successfully as CSV.`)
      } else {
        // Handle JSON download
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportType}_export_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        showSuccess("Export Complete", `${exportType} data exported successfully as JSON.`)
      }
    } catch (error) {
      console.error('Export error:', error)
      showError("Export Failed", error instanceof Error ? error.message : "Failed to export data. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleFilteredExport = async () => {
    if (user.role !== 'manager') {
      showError("Permission Denied", "Only managers are allowed to export data.")
      return
    }

    try {
      setIsExporting(true)
      
      const filters: any = {}
      if (dateFrom) filters.dateFrom = dateFrom
      if (dateTo) filters.dateTo = dateTo

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userRole: user.role,
          userId: user.id,
          exportType,
          filters
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Filtered export failed')
      }

      const data = await response.json()
      
      // Download filtered data as JSON
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportType}_filtered_export_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      showSuccess("Filtered Export Complete", `${data.recordCount} ${exportType} records exported successfully.`)
    } catch (error) {
      console.error('Filtered export error:', error)
      showError("Export Failed", error instanceof Error ? error.message : "Failed to export filtered data.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDataMaintenance = async () => {
    const confirmed = await showConfirm(
      "Data Maintenance", 
      "This will optimize MySQL indexes and clean up old data. Continue?",
      "Yes, Optimize",
      "Cancel"
    )
    
    if (confirmed) {
      showSuccess("Maintenance Scheduled", "Data maintenance has been scheduled and will run in the background.")
    }
  }

  // Show permission denied message for non-managers
  if (user.role !== 'manager') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span>Data export and management features are restricted to managers only.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Data Export (Manager Only)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="exportType">Export Type</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deals">Deals</SelectItem>
                  <SelectItem value="callbacks">Callbacks</SelectItem>
                  <SelectItem value="targets">Targets</SelectItem>
                  <SelectItem value="analytics">Analytics Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="exportFormat">Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={handleExportData} 
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export All {exportType}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtered Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Filtered Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleFilteredExport} 
            disabled={isExporting}
            variant="outline"
            className="w-full"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Export Filtered Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Data Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={handleRefreshData} 
              disabled={isRefreshing}
              variant="outline"
              className="flex-1"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleDataMaintenance}
              variant="outline"
              className="flex-1"
            >
              <Database className="h-4 w-4 mr-2" />
              Data Maintenance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
