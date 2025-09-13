"use client"

import { useRouter } from "next/navigation"
import UnifiedLogin from "@/components/unified-login"
import FullPageDashboard from "@/components/full-page-dashboard"
import { useAuth } from "@/hooks/useAuth"

export default function CompleteApp() {
  const { user, isAuthenticated, loading, logout } = useAuth()
  const router = useRouter()

  const handleLogin = () => {
    // Login is handled by useAuth hook, this callback just triggers after success
    console.log('CompleteApp: Login callback triggered')
  }

  const handleLogout = () => {
    logout()
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

  if (!isAuthenticated || !user) {
    console.log('CompleteApp: No authenticated user, showing login')
    return <UnifiedLogin onLogin={handleLogin} />
  }

  console.log('CompleteApp: Authenticated user found, rendering dashboard for:', user.name)
  return <FullPageDashboard user={user} onLogout={handleLogout} />
}
