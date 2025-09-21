"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import SimpleBackupButton from "@/components/simple-backup-button"
import { User } from "@/lib/auth"

export default function BackupPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in and is a manager
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.role === 'manager') {
        setUser(parsedUser)
      } else {
        // Redirect non-managers
        router.push('/dashboard')
        return
      }
    } else {
      // Redirect to login if not authenticated
      router.push('/')
      return
    }
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || user.role !== 'manager') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only managers can access the backup system.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Backup</h1>
          <p className="text-gray-600">
            Welcome, {user.name}. Export and download your Firebase database for backup purposes.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Firebase Database Backup</h2>
              <p className="text-gray-600 mb-6">
                Click the button below to download a complete backup of your Firebase database. 
                This will include all collections with their data in JSON format.
              </p>
              <SimpleBackupButton 
                variant="default" 
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                Download Complete Backup
              </SimpleBackupButton>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
              <h3 className="font-semibold text-blue-900 mb-2">📋 What's included in the backup:</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Users and authentication data</li>
                <li>• All deals and sales records</li>
                <li>• Callbacks and customer interactions</li>
                <li>• Sales targets and progress</li>
                <li>• Team targets and assignments</li>
                <li>• Notifications and system messages</li>
                <li>• Application settings and configurations</li>
              </ul>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-amber-900 mb-2">⚠️ Important Notes:</h3>
              <ul className="text-amber-800 text-sm space-y-1">
                <li>• The backup file will be downloaded to your default Downloads folder</li>
                <li>• Large databases may take a few minutes to process</li>
                <li>• Keep backup files secure as they contain sensitive business data</li>
                <li>• The backup includes timestamps and metadata for easy restoration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
