"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import FirebaseBackup from "@/components/firebase-backup"
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
        
        <FirebaseBackup />
      </div>
    </div>
  )
}
