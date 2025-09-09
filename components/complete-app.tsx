"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import UnifiedLogin from "@/components/unified-login"
import FullPageDashboard from "@/components/full-page-dashboard"
import { User } from "@/lib/auth"

export default function CompleteApp() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('current-user')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        // Verify user data is valid
        if (parsedUser.id && parsedUser.username && parsedUser.role) {
          setUser(parsedUser)
        } else {
          localStorage.removeItem('current-user')
        }
      } catch (error) {
        localStorage.removeItem('current-user')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser)
    // Save to localStorage for persistence
    localStorage.setItem('current-user', JSON.stringify(loggedInUser))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('current-user')
    localStorage.removeItem('vmax_user')
    // Navigate to landing page
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <UnifiedLogin onLogin={handleLogin} />
  }

  return <FullPageDashboard user={user} onLogout={handleLogout} />
}
