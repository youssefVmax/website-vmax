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
    console.log('CompleteApp: Checking for saved user')
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('vmax_user') // Use same key as useAuth
    console.log('CompleteApp: Found saved user:', savedUser ? 'yes' : 'no')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        console.log('CompleteApp: Parsed user:', parsedUser.name)
        // Verify user data is valid
        if (parsedUser.id && parsedUser.username && parsedUser.role) {
          setUser(parsedUser)
          console.log('CompleteApp: User set successfully')
        } else {
          console.log('CompleteApp: Invalid user data, removing')
          localStorage.removeItem('vmax_user')
        }
      } catch (error) {
        console.log('CompleteApp: Error parsing user, removing')
        localStorage.removeItem('vmax_user')
      }
    }
    setLoading(false)
    console.log('CompleteApp: Loading complete, user:', user?.name || 'none')
  }, [])

  const handleLogin = () => {
    // Get user from useAuth's localStorage key
    const savedUser = localStorage.getItem('vmax_user')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
        console.log('CompleteApp: Login callback - user set:', parsedUser.name)
      } catch (error) {
        console.error('CompleteApp: Error parsing user in login callback')
      }
    }
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
    console.log('CompleteApp: No user found, showing login')
    return <UnifiedLogin onLogin={handleLogin} />
  }

  console.log('CompleteApp: User found, rendering dashboard for:', user.name)
  return <FullPageDashboard user={user} onLogout={handleLogout} />
}
