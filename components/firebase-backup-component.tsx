"use client"

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { 
  Download, 
  Database, 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  HardDrive,
  Calendar
} from 'lucide-react'
import { useToast } from './ui/use-toast'

interface BackupInfo {
  timestamp: string
  backup_date: string
  collections: Record<string, number>
  total_documents: number
  status: 'completed' | 'failed' | 'in_progress'
}

interface BackupFile {
  timestamp: string
  filename: string
  size: number
  created: string
  totalDocuments: number
}

export default function FirebaseBackupComponent() {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupProgress, setBackupProgress] = useState(0)
  const [currentCollection, setCurrentCollection] = useState('')
  const [backupHistory, setBackupHistory] = useState<BackupFile[]>([])
  const [lastBackup, setLastBackup] = useState<BackupInfo | null>(null)
  const { toast } = useToast()

  // Collections to backup
  const COLLECTIONS = [
    { name: 'users', label: 'Users', icon: '👥' },
    { name: 'deals', label: 'Deals', icon: '💼' },
    { name: 'callbacks', label: 'Callbacks', icon: '📞' },
    { name: 'sales', label: 'Sales', icon: '💰' },
    { name: 'targets', label: 'Targets', icon: '🎯' },
    { name: 'notifications', label: 'Notifications', icon: '🔔' },
    { name: 'settings', label: 'Settings', icon: '⚙️' }
  ]

  // Load backup history on component mount
  useEffect(() => {
    loadBackupHistory()
  }, [])

  const loadBackupHistory = async () => {
    try {
      // This would typically call your backend API
      const response = await fetch('/api/backup/history')
      if (response.ok) {
        const history = await response.json()
        setBackupHistory(history)
        if (history.length > 0) {
          setLastBackup(history[0])
        }
      }
    } catch (error) {
      console.error('Failed to load backup history:', error)
    }
  }

  const startBackup = async () => {
    setIsBackingUp(true)
    setBackupProgress(0)
    setCurrentCollection('')

    try {
      toast({
        title: "Backup Started",
        description: "Firebase backup process has begun...",
      })

      // Simulate backup progress
      const totalCollections = COLLECTIONS.length
      
      for (let i = 0; i < totalCollections; i++) {
        const collection = COLLECTIONS[i]
        setCurrentCollection(collection.label)
        setBackupProgress(((i + 1) / totalCollections) * 100)
        
        // Simulate API call to backup each collection
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Call the actual backup API
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collections: COLLECTIONS.map(c => c.name),
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        toast({
          title: "Backup Completed Successfully! 🎉",
          description: `Backed up ${result.totalDocuments} documents from ${result.collections.length} collections`,
        })

        // Update backup history
        await loadBackupHistory()
      } else {
        throw new Error('Backup API call failed')
      }

    } catch (error) {
      console.error('Backup failed:', error)
      toast({
        title: "Backup Failed",
        description: "An error occurred during the backup process. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsBackingUp(false)
      setBackupProgress(0)
      setCurrentCollection('')
    }
  }

  const downloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/backup/download/${filename}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: "Download Started",
          description: `Downloading ${filename}...`,
        })
      }
    } catch (error) {
      console.error('Download failed:', error)
      toast({
        title: "Download Failed",
        description: "Failed to download backup file.",
        variant: "destructive"
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Backup Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Firebase Backup Control
          </CardTitle>
          <CardDescription>
            Create and manage backups of all Firebase data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Backup Button */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Create New Backup</h3>
              <p className="text-sm text-muted-foreground">
                Backup all collections to downloadable JSON files
              </p>
            </div>
            <Button 
              onClick={startBackup} 
              disabled={isBackingUp}
              className="min-w-[120px]"
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Backing Up...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Start Backup
                </>
              )}
            </Button>
          </div>

          {/* Progress Indicator */}
          {isBackingUp && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress: {Math.round(backupProgress)}%</span>
                <span className="text-muted-foreground">
                  {currentCollection && `Backing up ${currentCollection}...`}
                </span>
              </div>
              <Progress value={backupProgress} className="w-full" />
            </div>
          )}

          {/* Collections Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {COLLECTIONS.map((collection) => (
              <div 
                key={collection.name}
                className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
              >
                <span className="text-lg">{collection.icon}</span>
                <div>
                  <div className="font-medium text-sm">{collection.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {lastBackup?.collections[collection.name] || 0} items
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last Backup Info */}
      {lastBackup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Last Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Date</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(lastBackup.backup_date)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Documents</div>
                  <div className="text-sm text-muted-foreground">
                    {lastBackup.total_documents.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lastBackup.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <div className="font-medium">Status</div>
                  <Badge variant={lastBackup.status === 'completed' ? 'default' : 'destructive'}>
                    {lastBackup.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Backup History
          </CardTitle>
          <CardDescription>
            Download and manage previous backups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backupHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No backups found</p>
              <p className="text-sm">Create your first backup to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backupHistory.map((backup, index) => (
                <div 
                  key={backup.timestamp}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">{backup.filename}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(backup.created)} • {formatFileSize(backup.size)} • {backup.totalDocuments} documents
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadBackup(backup.filename)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
