"use client"

import React, { useState } from 'react'
import { Button } from './ui/button'
import { Download, RefreshCw, Database } from 'lucide-react'
import { useToast } from './ui/use-toast'
import { directMySQLService } from '@/lib/direct-mysql-service'

// Collections to backup
const COLLECTIONS = [
  'users',
  'deals', 
  'callbacks',
  'sales',
  'targets',
  'team_targets',
  'notifications',
  'settings'
]

interface SimpleBackupButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  children?: React.ReactNode
}

export default function SimpleBackupButton({ 
  variant = "outline", 
  size = "sm", 
  className = "",
  children 
}: SimpleBackupButtonProps) {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const { toast } = useToast()

  // Convert Firebase timestamp to ISO string
  const convertTimestamp = (timestamp: any): string | null => {
    if (!timestamp) return null
    
    try {
      if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000).toISOString()
      }
      if (timestamp.toDate) {
        return timestamp.toDate().toISOString()
      }
      if (timestamp instanceof Date) {
        return timestamp.toISOString()
      }
      return new Date(timestamp).toISOString()
    } catch (error) {
      return null
    }
  }

  // Process document data to handle special Firebase types
  const processDocumentData = (data: any): any => {
    const processed: any = {}
    
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object') {
        // Handle Firestore timestamps
        if ((value as any)._seconds !== undefined || (typeof (value as any).toDate === 'function')) {
          processed[key] = convertTimestamp(value)
        }
        // Handle nested objects
        else if (!Array.isArray(value)) {
          processed[key] = processDocumentData(value)
        }
        // Handle arrays
        else {
          processed[key] = (value as any[]).map(item => 
            (item && typeof item === 'object') ? processDocumentData(item) : item
          )
        }
      } else {
        processed[key] = value
      }
    }
    
    return processed
  }

  // Backup a single collection
  const backupCollection = async (collectionName: string) => {
    try {
      let response: any;
      
      // Get data based on collection type
      switch (collectionName) {
        case 'deals':
          response = await directMySQLService.getDeals({});
          break;
        case 'callbacks':
          response = await directMySQLService.getCallbacks({});
          break;
        case 'users':
          response = await directMySQLService.getUsers({});
          break;
        case 'notifications':
          response = await directMySQLService.getNotifications({});
          break;
        case 'targets':
          response = await directMySQLService.getTargets({});
          break;
        default:
          response = await directMySQLService.makeDirectRequest(`${collectionName}-api.php`);
      }
      
      const documents = Array.isArray(response) ? response : (response[collectionName] || []);
      
      return documents.map((doc: any) => ({
        ...processDocumentData(doc),
        _backup_timestamp: new Date().toISOString(),
        _document_path: `${collectionName}/${doc.id || doc._id || 'unknown'}`
      }));
      
    } catch (error) {
      console.error(`❌ Failed to backup ${collectionName}:`, error)
      return []
    }
  }

  // Create and download backup file
  const createAndDownloadBackup = async () => {
    setIsBackingUp(true)
    
    try {
      const backupData: Record<string, any[]> = {}
      const backupStats: Record<string, number> = {}
      const startTime = Date.now()
      let totalDocuments = 0
      
      // Show initial toast
      toast({
        title: "Backup Started",
        description: "Collecting Firebase data...",
      })
      
      // Backup each collection
      for (const collectionName of COLLECTIONS) {
        const documents = await backupCollection(collectionName)
        backupData[collectionName] = documents
        backupStats[collectionName] = documents.length
        totalDocuments += documents.length
      }
      
      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)
      
      // Create backup info
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupInfo = {
        timestamp,
        backup_date: new Date().toISOString(),
        mysql_database: process.env.DB_NAME || 'vmax',
        collections: backupStats,
        total_documents: totalDocuments,
        duration_seconds: parseFloat(duration),
        status: 'completed'
      }
      
      // Create complete backup object
      const completeBackup = {
        backup_info: backupInfo,
        data: backupData
      }
      
      // Convert to JSON and create download
      const jsonString = JSON.stringify(completeBackup, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      
      // Create download link
      const a = document.createElement('a')
      a.href = url
      a.download = `mysql-complete-backup-${timestamp}.json`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Backup Completed! 🎉",
        description: `Downloaded ${totalDocuments} documents from ${Object.keys(backupStats).length} collections`,
      })
      
    } catch (error) {
      console.error('Backup failed:', error)
      toast({
        title: "Backup Failed",
        description: "An error occurred during the backup process. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  return (
    <Button 
      onClick={createAndDownloadBackup} 
      disabled={isBackingUp}
      variant={variant}
      size={size}
      className={className}
    >
      {isBackingUp ? (
        <>
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Backing Up...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {children || "Backup MySQL"}
        </>
      )}
    </Button>
  )
}
