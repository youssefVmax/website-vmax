"use client"

import React from 'react'
import { AuthProvider } from '@/hooks/useAuth'
import { NotificationsProvider } from '@/hooks/use-notifications'
import { ThemeProvider } from '@/components/theme-provider'
import { SettingsThemeSync } from './settings-theme-sync'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <NotificationsProvider>
          <SettingsThemeSync />
          {children}
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
