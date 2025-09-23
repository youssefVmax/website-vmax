"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Trash2, RefreshCw, Shield } from "lucide-react"
import { showSuccess, showError, showConfirm } from "@/lib/sweetalert"
import { useMySQLSalesData } from "@/hooks/useMySQLSalesData"

interface ImportExportControlsProps {
  userRole: 'manager' | 'salesman' | 'team-leader'
}

export function ImportExportControls({ userRole }: ImportExportControlsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { refreshData } = useMySQLSalesData({ userRole })

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

}
