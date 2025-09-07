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

  // Load initial
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        if (!res.ok) throw new Error(`Failed to load settings: ${res.status}`)
        const json = await res.json()
        if (!mounted) return
        setSettings({ ...DEFAULTS, ...json })
        setLoading(false)
      } catch (e: any) {
        if (!mounted) return
        setError(e instanceof Error ? e : new Error('Failed to load settings'))
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
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error(`Failed to save settings: ${res.status}`)
      const saved = await res.json()
      // broadcast
      bcRef.current?.postMessage({ type: 'settings:update', payload: saved })
    } catch (e) {
      // Optionally surface error to UI
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
