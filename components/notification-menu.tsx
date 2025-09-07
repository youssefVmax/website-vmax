"use client"

import React, { useMemo } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function NotificationMenu() {
  const { notifications, unreadCount, markAsRead } = useNotifications()
  const { user } = useAuth()

  const visible = useMemo(() => {
    if (!user) return []
    if (user.role === 'manager') return notifications
    return notifications.filter(n => Array.isArray(n.to) && (n.to.includes('ALL') || n.to.includes(user.id)))
  }, [notifications, user])

  const latest = visible.slice(0, 8)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 bg-cyan-500 rounded-full animate-pulse" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="p-3">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            <Badge variant="secondary">{unreadCount} unread</Badge>
          </DropdownMenuLabel>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-auto">
          {latest.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No notifications</div>
          )}
          {latest.map(n => (
            <DropdownMenuItem key={n.id} className={`p-3 whitespace-normal ${!n.read ? 'bg-accent/40' : ''}`} onClick={() => !n.read && markAsRead(n.id)}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  <Badge variant="secondary" className="uppercase text-[10px]">{n.type}</Badge>
                  <Badge className="uppercase text-[10px]" variant={n.priority === 'high' ? 'destructive' : 'secondary'}>{n.priority}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(n.timestamp).toLocaleString()}</div>
                <p className="text-sm leading-snug">{n.message}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2 text-right">
          <Link href="/notifications" className="text-xs text-cyan-600 hover:underline">View all</Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
