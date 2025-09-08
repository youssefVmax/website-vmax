"use client"

import { Suspense, useState, useEffect } from "react"
import CompleteApp from "@/components/complete-app"
import { Toaster } from "@/components/ui/toaster"
import { NotificationsProvider } from "@/hooks/use-notifications"
import dynamic from 'next/dynamic';

// Load SweetAlertTest component dynamically with SSR disabled
const SweetAlertTest = dynamic(
  () => import('@/components/SweetAlertTest'),
  { ssr: false }
);

function AppContent() {
  const [showTest, setShowTest] = useState(false)

  // Show test component after a short delay to ensure SweetAlert is loaded
  useEffect(() => {
    const timer = setTimeout(() => setShowTest(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <NotificationsProvider>
        <CompleteApp />
      </NotificationsProvider>
      <Toaster />
      {showTest && <SweetAlertTest />}
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