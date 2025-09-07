"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/use-notifications'
import { User } from '@/lib/auth'

interface Recipient extends Pick<User, 'id' | 'name' | 'role' | 'team'> {}

export default function NotificationsManager() {
  const { user } = useAuth()
  const { addNotification } = useNotifications()

  const [users, setUsers] = useState<Recipient[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const [audience, setAudience] = useState<'ALL' | 'SPECIFIC'>('ALL')
  const [selected, setSelected] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState<'manager' | 'salesman' | 'customer-service' | ''>('')
  const [selectedTeam, setSelectedTeam] = useState<string>('')

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error' | 'message'>('message')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' })
        const data = await res.json()
        if (mounted) setUsers(data)
      } catch (e) {
        console.error('Failed to fetch users', e)
      } finally {
        setLoadingUsers(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const visibleUsers = useMemo(() => {
    // Exclude manager self to avoid notifying yourself unnecessarily
    return users.filter(u => u.id !== user?.id)
  }, [users, user?.id])

  const teams = useMemo(() => Array.from(new Set(visibleUsers.map(u => u.team).filter(Boolean))) as string[], [visibleUsers])
  const roles: Array<'manager' | 'salesman' | 'customer-service'> = ['manager', 'salesman', 'customer-service']

  const toggleSelected = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const applyRoleSelection = () => {
    if (!selectedRole) return
    const ids = visibleUsers.filter(u => u.role === selectedRole).map(u => u.id)
    setSelected(Array.from(new Set([...selected, ...ids])))
  }

  const applyTeamSelection = () => {
    if (!selectedTeam) return
    const ids = visibleUsers.filter(u => u.team === selectedTeam).map(u => u.id)
    setSelected(Array.from(new Set([...selected, ...ids])))
  }

  const clearSelection = () => {
    setSelected([])
    setSelectedRole('')
    setSelectedTeam('')
  }

  const canSubmit = (title.trim().length > 0 && message.trim().length > 0 && (audience === 'ALL' || selected.length > 0))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!canSubmit) return

    setSubmitting(true)
    try {
      const to = audience === 'ALL' ? ['ALL'] : selected
      await addNotification({
        title,
        message,
        type: type as any,
        priority: priority as any,
        from: user.id,
        to,
        isManagerMessage: true,
        actionRequired: false,
      } as any)

      // Reset form
      setTitle('')
      setMessage('')
      setAudience('ALL')
      setSelected([])
    } catch (e) {
      console.error('Failed to send notification', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Broadcast Notification</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v: 'ALL' | 'SPECIFIC') => setAudience(v)}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Users</SelectItem>
                  <SelectItem value="SPECIFIC">Specific Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Message</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {audience === 'SPECIFIC' && (
            <div className="space-y-2">
              <Label>Select Recipients</Label>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Quick Select Role</Label>
                  <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Pick role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {roles.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="mt-2 w-full" onClick={applyRoleSelection} disabled={!selectedRole}>Add Role</Button>
                </div>
                <div>
                  <Label className="text-xs">Quick Select Team</Label>
                  <Select value={selectedTeam} onValueChange={(v: any) => setSelectedTeam(v)}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Pick team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {teams.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="mt-2 w-full" onClick={applyTeamSelection} disabled={!selectedTeam}>Add Team</Button>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" className="w-full" onClick={clearSelection}>Clear Selection</Button>
                </div>
              </div>
              <div className="max-h-52 overflow-auto border rounded p-2">
                {loadingUsers && <p className="text-sm text-muted-foreground">Loading users...</p>}
                {!loadingUsers && visibleUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No users found.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {visibleUsers.map(u => (
                    <label key={u.id} className={`flex items-center gap-2 border rounded px-2 py-1 ${selected.includes(u.id) ? 'bg-accent' : ''}`}>
                      <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelected(u.id)} />
                      <span className="text-sm capitalize">{u.name}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] uppercase">{u.role}</Badge>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>Title</Label>
            <Input className="mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea className="mt-1" rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message..." />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? 'Sending...' : 'Send Notification'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
