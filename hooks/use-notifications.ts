"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { Notification } from "@/types/notification"
import { useAuth } from "@/hooks/useAuth"
import { showToast } from "@/lib/sweetalert"
import { notificationService } from "@/lib/firebase-services"

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
  const knownIdsRef = React.useRef<Set<string>>(new Set())

  // Load notifications from Firebase
  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        if (!user?.id || !user?.role) return
        const data = await notificationService.getNotifications(user.id, user.role)
        // Map Firebase notifications to expected format
        const mapped: Notification[] = data.map((n: any) => {
          // Safe timestamp conversion
          const safeToDate = (value: any) => {
            if (!value) return new Date();
            try {
              if (typeof value?.toDate === 'function') return value.toDate();
              if (value instanceof Date) return value;
              if (typeof value === 'string') return new Date(value);
              if (typeof value === 'object' && typeof value.seconds === 'number') {
                return new Date(value.seconds * 1000);
              }
              if (typeof value === 'number') return new Date(value);
            } catch (error) {
              console.warn('Failed to convert notification timestamp:', value, error);
            }
            return new Date();
          };

          return {
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            priority: n.priority || 'medium',
            from: n.from || 'System',
            fromAvatar: n.fromAvatar,
            to: n.to || [],
            timestamp: safeToDate(n.created_at),
            read: n.isRead || false,
            dealId: n.dealId,
            dealName: n.dealName,
            dealStage: n.dealStage,
            dealValue: n.dealValue,
            isManagerMessage: n.isManagerMessage,
            actionRequired: n.actionRequired
          };
        })
        if (mounted) setNotifications(mapped)
      } catch (e) {
        console.error('Notifications fetch failed', e)
        if (mounted) setNotifications([])
      }
    }

    load()
    const id = setInterval(load, 15000)
    return () => { mounted = false; clearInterval(id) }
  }, [user?.id, user?.role])

  // Show toasts for new notifications (only show recent notifications, not old ones on login)
  useEffect(() => {
    const prevIds = knownIdsRef.current
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000) // 5 minutes ago
    
    for (const n of notifications) {
      if (!prevIds.has(n.id)) {
        prevIds.add(n.id)
        const addressedToUser = Array.isArray(n.to) && (n.to.includes('ALL') || (user?.id && n.to.includes(user.id)))
        const managerSeesAll = user?.role === 'manager'
        
        // Only show toast if notification is recent (within last 5 minutes) and unread
        const notificationTime = new Date(n.timestamp)
        const isRecent = notificationTime > fiveMinutesAgo
        
        if ((addressedToUser || managerSeesAll) && !n.read && isRecent) {
          // Use SweetAlert2 toast matching app design
          const title = n.title ? `${n.title}` : 'Notification'
          const message = n.message ? ` ${n.message}` : ''
          showToast(`${title}${message ? ': ' + message : ''}`, 'info')
        }
      }
    }
  }, [notifications, user?.id, user?.role])

  const unreadCount = notifications.filter(n => !n.read).length

  const refresh = async () => {
    try {
      if (!user?.id || !user?.role) return
      const data = await notificationService.getNotifications(user.id, user.role)
      // Map Firebase notifications to expected format
      const mapped: Notification[] = data.map((n: any) => {
        // Safe timestamp conversion
        const safeToDate = (value: any) => {
          if (!value) return new Date();
          try {
            if (typeof value?.toDate === 'function') return value.toDate();
            if (value instanceof Date) return value;
            if (typeof value === 'string') return new Date(value);
            if (typeof value === 'object' && typeof value.seconds === 'number') {
              return new Date(value.seconds * 1000);
            }
            if (typeof value === 'number') return new Date(value);
          } catch (error) {
            console.warn('Failed to convert notification timestamp:', value, error);
          }
          return new Date();
        };

        return {
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          priority: n.priority || 'medium',
          from: n.from || 'System',
          fromAvatar: n.fromAvatar,
          to: n.to || [],
          timestamp: safeToDate(n.created_at),
          read: n.isRead || false,
          dealId: n.dealId,
          dealName: n.dealName,
          dealStage: n.dealStage,
          dealValue: n.dealValue,
          isManagerMessage: n.isManagerMessage,
          actionRequired: n.actionRequired
        };
      })
      setNotifications(mapped)
    } catch (e) {
      console.error('Refresh notifications failed', e)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
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

      await notificationService.markAllAsRead(targetUserId || user?.id || '')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (e) {
      console.error('markAllAsRead failed', e)
    }
  }

  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    try {
      // Map to Firebase format
      const firebaseNotification = {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        from: notification.from,
        fromAvatar: notification.fromAvatar,
        to: notification.to,
        userId: user?.id,
        userRole: user?.role,
        isRead: false,
        dealId: notification.dealId,
        dealName: notification.dealName,
        dealStage: notification.dealStage,
        dealValue: notification.dealValue,
        isManagerMessage: notification.isManagerMessage,
        actionRequired: notification.actionRequired
      }
      
      const id = await notificationService.addNotification(firebaseNotification)
      
      // Add to local state with proper format
      const newNotification: Notification = {
        id,
        ...notification,
        timestamp: new Date(),
        read: false
      }
      setNotifications(prev => [newNotification, ...prev])
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

