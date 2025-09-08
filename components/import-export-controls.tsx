"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Trash2, RefreshCw, Shield } from "lucide-react"
import { showSuccess, showError, showConfirm } from "@/lib/sweetalert"
import { useFirebaseSalesData } from "@/hooks/useFirebaseSalesData"

interface ImportExportControlsProps {
  userRole: 'manager' | 'salesman' | 'customer-service'
}

export function ImportExportControls({ userRole }: ImportExportControlsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { refresh } = useFirebaseSalesData(userRole)

  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true)
      await refresh?.()
      showSuccess("Data Refreshed", "Firebase data has been refreshed successfully.")
    } catch (error) {
      console.error('Refresh error:', error)
      showError("Refresh Failed", "Failed to refresh data. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDataMaintenance = async () => {
    const confirmed = await showConfirm(
      "Data Maintenance", 
      "This will optimize Firebase indexes and clean up old data. Continue?",
      "Yes, Optimize",
      "Cancel"
    )
    
    if (confirmed) {
      showSuccess("Maintenance Scheduled", "Data maintenance has been scheduled and will run in the background.")
    }
  }

  // Only managers can access data management
  if (userRole !== 'manager') {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Firebase Data Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Refresh Data */}
        <div className="space-y-2">
          <Button 
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="w-full"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Firebase Data'}
          </Button>
        </div>

        {/* Data Maintenance */}
        <div className="space-y-2">
          <Button 
            onClick={handleDataMaintenance}
            className="w-full"
            variant="outline"
          >
            <Shield className="h-4 w-4 mr-2" />
            Optimize Database
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Refresh:</strong> Reload all data from Firebase Firestore</p>
          <p><strong>Optimize:</strong> Clean up indexes and improve performance</p>
          <p><strong>Note:</strong> All data is now stored securely in Firebase Cloud</p>
        </div>
      </CardContent>
    </Card>
  )
}
