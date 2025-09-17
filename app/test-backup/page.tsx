"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { firebaseBackupService } from "@/lib/firebase-backup-service"

export default function TestBackupPage() {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }

  const testSimpleDownload = () => {
    addLog("🧪 Testing simple file download...")
    
    try {
      // Create a simple test file
      const testData = {
        message: "This is a test backup file",
        timestamp: new Date().toISOString(),
        testData: [
          { id: 1, name: "Test Item 1" },
          { id: 2, name: "Test Item 2" }
        ]
      }

      const jsonString = JSON.stringify(testData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `test-backup-${Date.now()}.json`
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      addLog("✅ Simple test download completed!")
      alert("✅ Test file should be downloading! Check your Downloads folder.")
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addLog(`❌ Simple test failed: ${errorMsg}`)
      alert(`❌ Test failed: ${errorMsg}`)
    }
  }

  const testBackupStats = async () => {
    addLog("📊 Testing backup statistics...")
    setLoading(true)
    
    try {
      const stats = await firebaseBackupService.getBackupStatistics()
      addLog(`✅ Stats loaded: ${stats.collections.length} collections, ${stats.totalDocuments} documents`)
      addLog(`📋 Collections found: ${stats.collections.map(c => c.name).join(', ')}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addLog(`❌ Stats test failed: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  const testFullBackup = async () => {
    addLog("🔄 Testing full backup...")
    setLoading(true)
    
    try {
      addLog("📥 Exporting data from Firebase...")
      const backupData = await firebaseBackupService.exportAllData()
      
      addLog(`✅ Export completed: ${backupData.metadata.totalDocuments} documents`)
      addLog("⬇️ Starting download...")
      
      firebaseBackupService.downloadBackupAsJSON(backupData)
      addLog("✅ Backup process completed!")
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addLog(`❌ Full backup failed: ${errorMsg}`)
      alert(`❌ Backup failed: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🧪 Firebase Backup Test Page</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={testSimpleDownload}
                  variant="outline"
                  className="w-full"
                >
                  🧪 Test Simple Download
                </Button>
                
                <Button 
                  onClick={testBackupStats}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  📊 Test Backup Stats
                </Button>
                
                <Button 
                  onClick={testFullBackup}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "⏳ Processing..." : "🔄 Test Full Backup"}
                </Button>
              </div>
              
              <Button 
                onClick={clearLogs}
                variant="ghost"
                size="sm"
              >
                🗑️ Clear Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Test Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Click a test button to start...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🔧 Troubleshooting Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>If downloads don't work:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Check if your browser is blocking downloads</li>
                <li>Look for download notifications in your browser</li>
                <li>Check browser settings for download location</li>
                <li>Try disabling popup blockers</li>
                <li>Open browser developer tools (F12) and check Console tab for errors</li>
              </ul>
              
              <p className="mt-4"><strong>Browser Download Settings:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Chrome:</strong> Settings → Advanced → Downloads</li>
                <li><strong>Firefox:</strong> Settings → General → Files and Applications</li>
                <li><strong>Edge:</strong> Settings → Downloads</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
