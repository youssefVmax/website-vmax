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
import { apiService } from '@/lib/api-service'

type Recipient = { id: string; name: string; role: string; team?: string; managedTeam?: string }

interface NotificationsManagerProps {
  userRole?: string
  user?: any
}

export default function NotificationsManager({ userRole, user: propUser }: NotificationsManagerProps = {}) {
  const { user: authUser } = useAuth()
  const { addNotification } = useNotifications()

  // Resolve current user once
  const user = propUser || authUser

  // Hooks must always be called in the same order
  const [users, setUsers] = useState<Recipient[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const [audience, setAudience] = useState<'ALL' | 'SPECIFIC'>('ALL')
  const [selected, setSelected] = useState<string[]>([])
  const [addUserId, setAddUserId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<'manager' | 'salesman' | 'team_leader' | 'none'>('none')
  const [selectedTeam, setSelectedTeam] = useState<string>('')

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error' | 'message'>('message')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [submitting, setSubmitting] = useState(false)

  // Manager-only guard affects rendering only (not hook calls)
  const isManager = user?.role === 'manager' || userRole === 'manager'
  const isTeamLeader = user?.role === 'team_leader' || userRole === 'team_leader'

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await apiService.getUsers()
        if (mounted) setUsers((data || []).map(u => ({ id: u.id, name: u.name, role: u.role, team: u.team, managedTeam: (u as any).managedTeam })))
      } catch (e) {
        console.error('Failed to fetch users', e)
        if (mounted) setUsers([])
      } finally {
        if (mounted) setLoadingUsers(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const visibleUsers = useMemo(() => {
    if (!user) return []
    const all = users.filter(u => u.id !== user.id)
    if (isManager) return all
    if (isTeamLeader) {
      const teamName = (user as any).managedTeam || user.team
      const managers = all.filter(u => u.role === 'manager')
      const teamMembers = teamName ? all.filter(u => u.team === teamName) : []
      return [...new Set([...managers, ...teamMembers])]
    }
    // Salesman: can only notify manager
    return all.filter(u => u.role === 'manager')
  }, [users, user, isManager, isTeamLeader])

  const teams = useMemo(() => Array.from(new Set(visibleUsers.map(u => u.team).filter(Boolean))) as string[], [visibleUsers])
  const roles: Array<'manager' | 'team_leader' | 'salesman'> = ['manager', 'team_leader', 'salesman']

  const toggleSelected = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const applyRoleSelection = () => {
    if (!selectedRole || selectedRole === "none") return
    const roleUsers = users.filter(u => u.role === selectedRole)
    setSelected(prev => [...new Set([...prev, ...roleUsers.map(u => u.id)])])
    setSelectedRole("none")
  }

  const applyTeamSelection = () => {
    if (!selectedTeam) return
    const ids = visibleUsers.filter(u => u.team === selectedTeam).map(u => u.id)
    setSelected(prev => [...new Set([...prev, ...ids])])
  }

  const clearSelection = () => {
    setSelected([])
    setSelectedRole('none')
    setSelectedTeam('')
  }

  const addSelectedUser = (id: string) => {
    if (!id || id === 'none') return
    setSelected(prev => prev.includes(id) ? prev : [...prev, id])
    setAddUserId('')
  }

  const canSubmit = (title.trim().length > 0 && message.trim().length > 0 && (audience === 'ALL' || selected.length > 0))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!canSubmit) return

    setSubmitting(true)
    try {
      // Audience rules:
      // - Manager: ALL is allowed (maps to ['all']). SPECIFIC: use selected IDs (individual or teams expanded).
      // - Team leader: cannot use ALL. SPECIFIC only: must be manager or members of his managed team.
      // - Salesman: SPECIFIC only: manager only.
      let to: string[] = []
      if (audience === 'ALL') {
        if (!isManager) { setSubmitting(false); return }
        to = ['all']
      } else {
        // selected contains user IDs; if team quick select used, it already expanded ids
        to = Array.from(new Set(selected))
        if (isTeamLeader) {
          const teamName = (user as any).managedTeam || user.team
          const allowedIds = new Set(
            users
              .filter(u => u.role === 'manager' || (teamName && u.team === teamName))
              .map(u => u.id)
          )
          to = to.filter(id => allowedIds.has(id))
        }
        if (!isManager && !isTeamLeader) {
          // salesman -> only managers
          const managerIds = new Set(users.filter(u => u.role === 'manager').map(u => u.id))
          to = to.filter(id => managerIds.has(id))
        }
      }
      await addNotification({
        title,
        message,
        type: type as any,
        priority: priority as any,
        from: user.id,
        to,
        isManagerMessage: isManager,
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
                  {isManager && <SelectItem value="ALL">All Users</SelectItem>}
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
                      <SelectItem value="none">None</SelectItem>
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
                      <SelectItem value="none">None</SelectItem>
                      {teams.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="mt-2 w-full" onClick={applyTeamSelection} disabled={!selectedTeam}>Add Team</Button>
                </div>
                <div>
                  <Label className="text-xs">Add User</Label>
                  <Select value={addUserId} onValueChange={(v: any) => addSelectedUser(v)}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder={loadingUsers ? 'Loading users...' : 'Pick user'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {visibleUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
