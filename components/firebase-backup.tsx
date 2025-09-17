"use client"

import { useState, useEffect } from "react"
import { Download, Database, FileText, Table, Info, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { firebaseBackupService, BackupData } from "@/lib/firebase-backup-service"
import { showSuccess, showError, showLoading } from "@/lib/sweetalert"

interface BackupStats {
  collections: { name: string; count: number }[];
  totalDocuments: number;
  estimatedSize: string;
}

export default function FirebaseBackup() {
  const [stats, setStats] = useState<BackupStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
  const [backupInProgress, setBackupInProgress] = useState(false)

  useEffect(() => {
    loadBackupStatistics()
  }, [])

  const loadBackupStatistics = async () => {
    try {
      setLoading(true)
      const backupStats = await firebaseBackupService.getBackupStatistics()
      setStats(backupStats)
      // Select all collections by default
      setSelectedCollections(backupStats.collections.map(c => c.name))
    } catch (error) {
      console.error('Error loading backup statistics:', error)
      showError('Failed to load backup statistics')
    } finally {
      setLoading(false)
    }
  }

  const handleFullBackup = async () => {
    try {
      setBackupInProgress(true)
      showLoading('Exporting all Firebase data...')
      
      const backupData = await firebaseBackupService.exportAllData()
      
      // Download as JSON
      firebaseBackupService.downloadBackupAsJSON(backupData)
      
      showSuccess(`Backup completed! Exported ${backupData.metadata.totalDocuments} documents from ${backupData.metadata.collectionsCount} collections.`)
    } catch (error) {
      console.error('Error creating backup:', error)
      showError('Failed to create backup')
    } finally {
      setBackupInProgress(false)
    }
  }

  const handleSelectiveBackup = async () => {
    if (selectedCollections.length === 0) {
      showError('Please select at least one collection to backup')
      return
    }

    try {
      setBackupInProgress(true)
      showLoading(`Exporting ${selectedCollections.length} selected collections...`)
      
      const backupData = await firebaseBackupService.exportSpecificCollections(selectedCollections)
      
      // Download as JSON
      firebaseBackupService.downloadBackupAsJSON(backupData, `selective-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
      
      showSuccess(`Selective backup completed! Exported ${backupData.metadata.totalDocuments} documents from ${backupData.metadata.collectionsCount} collections.`)
    } catch (error) {
      console.error('Error creating selective backup:', error)
      showError('Failed to create selective backup')
    } finally {
      setBackupInProgress(false)
    }
  }

  const handleCSVBackup = async () => {
    try {
      setBackupInProgress(true)
      showLoading('Exporting data as CSV files...')
      
      const backupData = selectedCollections.length > 0 
        ? await firebaseBackupService.exportSpecificCollections(selectedCollections)
        : await firebaseBackupService.exportAllData()
      
      // Download as CSV files
      firebaseBackupService.downloadBackupAsCSV(backupData)
      
      showSuccess(`CSV backup completed! Downloaded ${Object.keys(backupData.collections).length} CSV files.`)
    } catch (error) {
      console.error('Error creating CSV backup:', error)
      showError('Failed to create CSV backup')
    } finally {
      setBackupInProgress(false)
    }
  }

  const toggleCollection = (collectionName: string) => {
    setSelectedCollections(prev => 
      prev.includes(collectionName)
        ? prev.filter(name => name !== collectionName)
        : [...prev, collectionName]
    )
  }

  const selectAllCollections = () => {
    if (stats) {
      setSelectedCollections(stats.collections.map(c => c.name))
    }
  }

  const deselectAllCollections = () => {
    setSelectedCollections([])
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Firebase Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading backup statistics...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Firebase Database Backup
          </CardTitle>
          <CardDescription>
            Export and download all your Firebase data for backup purposes
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Database Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.collections.length}</div>
                <div className="text-sm text-blue-800">Collections</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.totalDocuments}</div>
                <div className="text-sm text-green-800">Total Documents</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.estimatedSize}</div>
                <div className="text-sm text-purple-800">Estimated Size</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Collections Overview:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {stats.collections.map((collection) => (
                  <div key={collection.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{collection.name}</span>
                    <Badge variant="secondary">{collection.count} docs</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collection Selection */}
      {stats && stats.collections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Select Collections to Backup
            </CardTitle>
            <CardDescription>
              Choose which collections you want to include in your backup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={selectAllCollections}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllCollections}>
                Deselect All
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.collections.map((collection) => (
                <div key={collection.name} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox
                    id={collection.name}
                    checked={selectedCollections.includes(collection.name)}
                    onCheckedChange={() => toggleCollection(collection.name)}
                  />
                  <label
                    htmlFor={collection.name}
                    className="flex-1 cursor-pointer flex justify-between items-center"
                  >
                    <span className="font-medium">{collection.name}</span>
                    <Badge variant="outline">{collection.count}</Badge>
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Backup Options
          </CardTitle>
          <CardDescription>
            Choose your preferred backup format and scope
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Full JSON Backup */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                <h4 className="font-semibold">Full JSON Backup</h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Export all collections as a single JSON file with complete data structure
              </p>
              <Button 
                onClick={handleFullBackup} 
                disabled={backupInProgress}
                className="w-full"
              >
                {backupInProgress ? 'Exporting...' : 'Download JSON'}
              </Button>
            </div>

            {/* Selective JSON Backup */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                <h4 className="font-semibold">Selective JSON Backup</h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Export only selected collections as JSON ({selectedCollections.length} selected)
              </p>
              <Button 
                onClick={handleSelectiveBackup} 
                disabled={backupInProgress || selectedCollections.length === 0}
                variant="outline"
                className="w-full"
              >
                {backupInProgress ? 'Exporting...' : 'Download Selected'}
              </Button>
            </div>

            {/* CSV Backup */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Table className="h-4 w-4" />
                <h4 className="font-semibold">CSV Backup</h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Export as separate CSV files for each collection (Excel compatible)
              </p>
              <Button 
                onClick={handleCSVBackup} 
                disabled={backupInProgress}
                variant="secondary"
                className="w-full"
              >
                {backupInProgress ? 'Exporting...' : 'Download CSV'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important Notes:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Backup files will be downloaded to your default Downloads folder</li>
            <li>Large databases may take several minutes to export</li>
            <li>JSON format preserves complete data structure and relationships</li>
            <li>CSV format is ideal for data analysis but may lose some structure</li>
            <li>Keep your backups secure as they contain sensitive business data</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
