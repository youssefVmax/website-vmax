"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSettings } from "@/hooks/use-settings"
import { useAuth } from "@/hooks/useAuth"

interface ProfileSettingsProps {
  user: {
    id: string
    name: string
    username: string
    role: 'manager' | 'salesman' | 'customer-service'
    team?: string
    email?: string
    phone?: string
  }
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const { toast } = useToast()
  const { updateProfile } = useAuth()
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email || '',
    phone: user.phone || '',
    team: user.team || '',
    avatar: '',
  })

  const { settings, updateSettings } = useSettings()

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  })

  const handleProfileSave = async () => {
    const updates: Partial<typeof user> = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
    }
    const ok = await updateProfile(updates as any)
    if (ok) {
      // Broadcast user update so any app-level state can react
      const event = new CustomEvent('userUpdated', { detail: updates })
      window.dispatchEvent(event)
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully."
      })
    } else {
      toast({
        title: "Update Failed",
        description: "Could not save your profile. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handlePreferencesSave = () => {
    // Preferences auto-save on change via updateSettings; this is just a confirmation toast
    toast({
      title: "Preferences Updated",
      description: "Your preferences have been saved across the app."
    })
  }

  const handlePasswordChange = () => {
    if (!security.currentPassword || !security.newPassword || !security.confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields.",
        variant: "destructive"
      })
      return
    }

    if (security.newPassword !== security.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation don't match.",
        variant: "destructive"
      })
      return
    }

    // In a real app, you would validate and update the password
    setSecurity(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }))
    toast({
      title: "Password Updated",
      description: "Your password has been changed successfully."
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Profile & Settings
        </h2>
        <p className="text-muted-foreground">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar} alt={profile.name} />
                <AvatarFallback className="text-lg">
                  {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{profile.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                <Badge variant="outline">{user.team || 'No Team'}</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@vmax.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={user.username}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Username cannot be changed
                </p>
              </div>

              <div>
                <Label htmlFor="team">Team</Label>
                <Input
                  id="team"
                  value={profile.team}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Team assignment is managed by administrators
                </p>
              </div>
            </div>

            <Button onClick={handleProfileSave} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}