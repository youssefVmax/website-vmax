"use client"

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useSettings } from '@/hooks/use-settings'

// Bridges global settings.theme with next-themes provider.
export function SettingsThemeSync() {
  const { settings } = useSettings()
  const { setTheme, theme: activeTheme } = useTheme()

  useEffect(() => {
    const desired = settings.theme
    if (!desired) return
    if (desired !== activeTheme) {
      setTheme(desired)
    }
  }, [settings.theme, activeTheme, setTheme])

  return null
}
