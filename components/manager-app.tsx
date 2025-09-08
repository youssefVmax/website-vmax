"use client"

import { useState, useEffect } from "react"
import ManagerLogin from "@/components/manager-login"
import FullPageDashboard from "@/components/full-page-dashboard"
import { MANAGER_USER } from "@/lib/auth"

export default function ManagerApp() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('manager-user')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        // Verify it's the manager user
        if (parsedUser.id === MANAGER_USER.id && parsedUser.role === 'manager') {
          setUser(parsedUser)
        } else {
          localStorage.removeItem('manager-user')
        }
      } catch (error) {
        localStorage.removeItem('manager-user')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (loggedInUser: any) => {
    setUser(loggedInUser)
    // Save to localStorage for persistence
    localStorage.setItem('manager-user', JSON.stringify(loggedInUser))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('manager-user')
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
    return <ManagerLogin onLogin={handleLogin} />
  }

  return <FullPageDashboard user={user} onLogout={handleLogout} />
}
