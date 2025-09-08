"use client"

import { Suspense, useState, useEffect } from "react"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import LandingPage from "./components/landing-page"
import LoginPage from "./components/login-page"
import FullPageDashboard from "@/components/full-page-dashboard"
import { Toaster } from "@/components/ui/toaster"
import { useSearchParams } from "next/navigation"
import { NotificationsProvider } from "@/hooks/use-notifications"
import dynamic from 'next/dynamic';

// Load SweetAlertTest component dynamically with SSR disabled
const SweetAlertTest = dynamic(
  () => import('@/components/SweetAlertTest'),
  { ssr: false }
);

function AppContent() {
  const { user, login, logout, isAuthenticated, loading } = useAuth()
  const searchParams = useSearchParams()
  const loginFlag = searchParams.get("login") === "1"
  const [showLogin, setShowLogin] = useState(() => loginFlag)
  const [showTest, setShowTest] = useState(false)

  // Show test component after a short delay to ensure SweetAlert is loaded
  useEffect(() => {
    const timer = setTimeout(() => setShowTest(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {isAuthenticated ? (
        <NotificationsProvider>
          <FullPageDashboard user={user} onLogout={logout} />
        </NotificationsProvider>
      ) : showLogin ? (
        <LoginPage onLogin={login} onBack={() => setShowLogin(false)} />
      ) : (
        <LandingPage onGetStarted={() => setShowLogin(true)} />
      )}
      <Toaster />
      {showTest && <SweetAlertTest />}
    </>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      }>
        <AppContent />
      </Suspense>
    </AuthProvider>
  )
}