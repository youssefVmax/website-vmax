"use client"

import React, { useMemo } from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications()
  const { user } = useAuth()

  const visible = useMemo(() => {
    if (!user) return []
    if (user.role === 'manager') {
      // Manager sees notifications to ALL or to manager or specific ones
      return notifications
    }
    // Others see ALL and those addressed to them
    return notifications.filter(n => Array.isArray(n.to) && (n.to.includes('ALL') || n.to.includes(user.id)))
  }, [notifications, user])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Real-time updates and messages</p>
        </div>
        <Button variant="outline" onClick={() => markAllAsRead(user?.id)}>Mark all as read</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visible.length === 0 && (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            )}
            {visible.map(n => (
              <div key={n.id} className={`p-4 rounded border ${!n.read ? 'bg-accent/30' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{n.title}</h3>
                      <Badge variant="secondary" className="uppercase text-[10px]">{n.type}</Badge>
                      <Badge className="uppercase text-[10px]" variant={n.priority === 'high' ? 'destructive' : 'secondary'}>{n.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.message}</p>
                    <div className="text-xs text-muted-foreground">
                      {new Date(n.timestamp).toLocaleString()}
                    </div>
                    {n.dealId && (
                      <div className="text-xs">
                        Deal: <span className="font-mono">{n.dealId}</span> {n.dealName ? `• ${n.dealName}` : ''} {n.dealValue ? `• $${n.dealValue.toLocaleString()}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <Button size="sm" onClick={() => markAsRead(n.id)}>Mark as read</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
