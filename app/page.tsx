"use client"

import { Suspense } from "react"
import CompleteApp from "@/components/complete-app"
import { Toaster } from "@/components/ui/toaster"
import { NotificationsProvider } from "@/hooks/use-notifications"

function AppContent() {
  return (
    <>
      <NotificationsProvider>
        <CompleteApp />
      </NotificationsProvider>
      <Toaster />
    </>
  )
}

export default function Home() {
  return (
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
  )
}