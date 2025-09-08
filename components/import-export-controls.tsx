"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { showSuccess, showError, showLoading } from "@/lib/sweetalert"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ImportExportControlsProps {
  userRole: 'manager' | 'salesman' | 'customer-service'
}

export function ImportExportControls({ userRole }: ImportExportControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      const response = await fetch('/api/deals/export')
      if (!response.ok) {
        throw new Error('Failed to export deals')
      }

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'deals-export.csv'
      link.download = filename
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      showSuccess("Export Successful", "Deals data has been exported to CSV file.")

    } catch (error) {
      console.error('Export error:', error)
      showError("Export Failed", "Failed to export deals data. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showError("Invalid File Type", "Please select a CSV file.")
      return
    }

    try {
      setIsImporting(true)
      setImportResult(null)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/deals/import', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Import failed')
      }

      setImportResult({
        success: true,
        message: result.message
      })
      showSuccess("Import Successful", result.message)

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error: any) {
      console.error('Import error:', error)
      setImportResult({
        success: false,
        message: error.message || 'Import failed'
      })
      showError("Import Failed", error.message || "Failed to import deals data.")
    } finally {
      setIsImporting(false)
    }
  }

  // Only managers can import/export
  if (userRole !== 'manager') {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Import / Export Deals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export Section */}
        <div className="space-y-2">
          <Label>Export Deals Data</Label>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export to CSV'}
          </Button>
        </div>

        {/* Import Section */}
        <div className="space-y-2">
          <Label htmlFor="import-file">Import Deals Data</Label>
          <Input
            id="import-file"
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            disabled={isImporting}
          />
          {isImporting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4 animate-pulse" />
              Importing deals...
            </div>
          )}
        </div>

        {/* Import Result */}
        {importResult && (
          <Alert className={importResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {importResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={importResult.success ? "text-green-800" : "text-red-800"}>
              {importResult.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Export:</strong> Download all deals as CSV file</p>
          <p><strong>Import:</strong> Upload CSV file with deals data</p>
          <p><strong>Required CSV columns:</strong> customer_name, amount, sales_agent</p>
        </div>
      </CardContent>
    </Card>
  )
}
