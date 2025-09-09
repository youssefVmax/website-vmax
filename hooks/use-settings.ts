import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type AppSettings = {
  theme: 'light' | 'dark' | 'system'
  emailNotifications: boolean
  pushNotifications: boolean
  dealAlerts: boolean
  targetReminders: boolean
  autoLogout: number
}

const DEFAULTS: AppSettings = {
  theme: 'dark',
  emailNotifications: true,
  pushNotifications: true,
  dealAlerts: true,
  targetReminders: true,
  autoLogout: 30,
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const bcRef = useRef<BroadcastChannel | null>(null)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const pendingRef = useRef<AppSettings | null>(null)

  // Load initial settings from localStorage or use defaults
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        // Try to load from localStorage first
        const stored = localStorage.getItem('app_settings')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (mounted) {
            setSettings({ ...DEFAULTS, ...parsed })
            setLoading(false)
            return
          }
        }
        // If no stored settings, use defaults
        if (mounted) {
          setSettings(DEFAULTS)
          setLoading(false)
        }
      } catch (e: any) {
        if (!mounted) return
        console.warn('Failed to load settings from localStorage, using defaults:', e)
        setSettings(DEFAULTS)
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // BroadcastChannel setup
  useEffect(() => {
    bcRef.current = new BroadcastChannel('app_settings')
    const bc = bcRef.current
    bc.onmessage = (evt) => {
      if (evt?.data?.type === 'settings:update' && evt.data?.payload) {
        setSettings((prev) => ({ ...prev, ...evt.data.payload }))
      }
    }
    return () => { bc.close() }
  }, [])

  const flushSave = useCallback(async (next: AppSettings) => {
    try {
      // Save to localStorage instead of API
      localStorage.setItem('app_settings', JSON.stringify(next))
      // broadcast to other tabs
      bcRef.current?.postMessage({ type: 'settings:update', payload: next })
    } catch (e) {
      console.error('Settings save failed', e)
    }
  }, [])

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      pendingRef.current = next
      // debounce save 400ms
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        if (pendingRef.current) flushSave(pendingRef.current)
        pendingRef.current = null
      }, 400)
      return next
    })
  }, [flushSave])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const api = useMemo(() => ({ settings, loading, error, updateSettings, setSettings }), [settings, loading, error, updateSettings])
  return api
}
