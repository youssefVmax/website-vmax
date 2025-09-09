"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import CompleteApp from "@/components/complete-app"
import UnifiedLogin from "@/components/unified-login"
import { Toaster } from "@/components/ui/toaster"
import { NotificationsProvider } from "@/hooks/use-notifications"

function AppContent() {
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'app'>('landing')
  const [user, setUser] = useState<any>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if login parameter is present in URL
    if (searchParams.get('login') === '1') {
      setCurrentView('login')
    }
  }, [searchParams])

  const handleLogin = (authenticatedUser: any) => {
    setUser(authenticatedUser)
    setCurrentView('app')
  }

  const handleGetStarted = () => {
    setCurrentView('login')
  }

  const handleBackToLanding = () => {
    setCurrentView('landing')
  }

  if (currentView === 'login') {
    return <UnifiedLogin onLogin={handleLogin} onBackToLanding={handleBackToLanding} />
  }

  if (currentView === 'app' && user) {
    return (
      <>
        <NotificationsProvider>
          <CompleteApp />
        </NotificationsProvider>
        <Toaster />
      </>
    )
  }

  // Show landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <LandingPageContent onGetStarted={handleGetStarted} />
    </div>
  )
}

// Landing page component with modern design
function LandingPageContent({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 110 2h-1v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6H4a1 1 0 110-2h3z" />
              </svg>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Vmax Sales</span>
          </div>
          <button 
            onClick={onGetStarted}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Advanced Sales
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"> Analytics</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Powerful dashboard for IPTV sales teams. Track performance, manage targets, 
            and boost your revenue with real-time analytics and insights.
          </p>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-600/30 rounded-xl p-6">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-time Analytics</h3>
              <p className="text-slate-400 text-sm">Track sales performance with live data and interactive charts</p>
            </div>
            
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-600/30 rounded-xl p-6">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Team Management</h3>
              <p className="text-slate-400 text-sm">Manage your sales team and track individual performance</p>
            </div>
            
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-600/30 rounded-xl p-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Target Tracking</h3>
              <p className="text-slate-400 text-sm">Set and monitor sales targets with automated reporting</p>
            </div>
          </div>

          <button 
            onClick={onGetStarted}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            Access Dashboard
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-slate-400 text-sm">
          © 2024 IPTV Sales Dashboard. Empowering sales teams worldwide.
        </p>
      </footer>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <AppContent />
    </Suspense>
  )
}