"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { Notification } from "@/types/notification"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  refresh: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: (userId?: string) => Promise<void>
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { user } = useAuth()
  const { toast } = useToast()
  const knownIdsRef = React.useRef<Set<string>>(new Set())

  // Poll notifications from API
  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const query = new URLSearchParams()
        if (user?.id) query.set('userId', user.id)
        if (user?.role) query.set('role', user.role)
        const url = `/api/notifications${query.toString() ? `?${query.toString()}` : ''}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch notifications')
        const data = await res.json()
        // Parse timestamp strings into Date objects
        const parsed: Notification[] = data.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }))
        if (mounted) setNotifications(parsed)
      } catch (e) {
        console.error('Notifications fetch failed', e)
      }
    }

    load()
    const id = setInterval(load, 15000)
    return () => { mounted = false; clearInterval(id) }
  }, [user?.id, user?.role])

  // Subscribe to SSE stream for near real-time updates
  useEffect(() => {
    let es: EventSource | null = null
    try {
      const query = new URLSearchParams()
      if (user?.id) query.set('userId', user.id)
      if (user?.role) query.set('role', user.role)
      es = new EventSource(`/api/notifications/stream${query.toString() ? `?${query.toString()}` : ''}`)
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const parsed: Notification[] = data.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }))
          setNotifications(prev => {
            // Compute toasts for new notifications addressed to the current user
            const prevIds = knownIdsRef.current
            for (const n of parsed) {
              if (!prevIds.has(n.id)) {
                prevIds.add(n.id)
                const addressedToUser = Array.isArray(n.to) && (n.to.includes('ALL') || (user?.id && n.to.includes(user.id)))
                const managerSeesAll = user?.role === 'manager'
                if ((addressedToUser || managerSeesAll) && !n.read) {
                  toast({ title: n.title, description: n.message })
                }
              }
            }
            return parsed
          })
        } catch (e) {
          console.error('Failed to parse SSE notification payload', e)
        }
      }
      es.onerror = () => {
        // Fail silently; polling continues as fallback
        es?.close()
      }
    } catch (e) {
      console.warn('EventSource not available; using polling only')
    }
    return () => { es?.close() }
  }, [user?.id, user?.role, toast])

  const unreadCount = notifications.filter(n => !n.read).length

  const refresh = async () => {
    const res = await fetch('/api/notifications', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      const parsed: Notification[] = data.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }))
      setNotifications(parsed)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      if (!res.ok) throw new Error('Failed to update notification')
      const updated = await res.json()
      setNotifications(prev => prev.map(n => n.id === updated.id ? { ...n, read: true } : n))
    } catch (e) {
      console.error('markAsRead failed', e)
    }
  }

  const markAllAsRead = async (userId?: string | unknown) => {
    try {
      // Guard: Sometimes onClick handlers pass the click event by mistake.
      let targetUserId: string | undefined = undefined
      if (typeof userId === 'string') targetUserId = userId
      else if (userId && typeof userId === 'object') targetUserId = user?.id || undefined
      else targetUserId = user?.id || undefined

      const body = targetUserId ? { markAllForUser: true, userId: targetUserId } : { markAllForUser: true, userId: 'ALL' }
      const res = await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to mark all as read')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (e) {
      console.error('markAllAsRead failed', e)
    }
  }

  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    try {
      const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notification) })
      if (!res.ok) throw new Error('Failed to create notification')
      const created = await res.json()
      // Parse timestamp
      created.timestamp = new Date(created.timestamp)
      setNotifications(prev => [created, ...prev])
    } catch (e) {
      console.error('addNotification failed', e)
    }
  }

  const value = {
    notifications,
    unreadCount,
    refresh,
    markAsRead,
    markAllAsRead,
    addNotification
  }

  // Use React.createElement to avoid JSX in .ts file
  return React.createElement(
    NotificationsContext.Provider,
    { value },
    children
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}

