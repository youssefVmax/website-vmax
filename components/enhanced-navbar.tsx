"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/notification-bell"
import { PlusCircle, User, LogOut, Settings, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { apiService } from "@/lib/api-service"
import { authService } from "@/lib/auth"

interface UserProfile {
  id: string
  username: string
  full_name: string
  email: string
  role: string
  team_name?: string
  last_login?: string
}

export function EnhancedNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user profile from API
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        if (user?.id) {
          setLoading(true)
          console.log('🔄 EnhancedNavbar: Loading user profile for ID:', user.id, 'User data:', user)
          
          // Always set fallback first to ensure something displays
          const fallbackProfile = {
            id: user.id.toString(),
            username: user.username || user.name || 'User',
            full_name: user.full_name || user.name || user.username || 'User',
            email: user.email || '',
            role: user.role,
            team_name: user.team_name || user.team || user.managedTeam
          }
          setUserProfile(fallbackProfile)
          
          // Try to get enhanced user profile from API
          try {
            const profile = await apiService.getUserById(user.id.toString())
            console.log('✅ EnhancedNavbar: API profile loaded:', profile)
            
            if (profile) {
              setUserProfile({
                id: profile.id,
                username: profile.username || profile.name || fallbackProfile.username,
                full_name: profile.full_name || profile.name || fallbackProfile.full_name,
                email: profile.email || fallbackProfile.email,
                role: profile.role || fallbackProfile.role,
                team_name: profile.team_name || profile.team || fallbackProfile.team_name,
                last_login: profile.last_login
              })
            }
          } catch (apiError) {
            console.warn('⚠️ EnhancedNavbar: API failed, using fallback:', apiError)
            // Keep the fallback profile that was already set
          }
        } else {
          console.warn('⚠️ EnhancedNavbar: No user ID available')
        }
      } catch (error) {
        console.error('❌ EnhancedNavbar: Error loading user profile:', error)
        
        // Ensure we always have some profile data
        if (user) {
          setUserProfile({
            id: user.id?.toString() || '1',
            username: user.username || user.name || 'User',
            full_name: user.full_name || user.name || user.username || 'User',
            email: user.email || '',
            role: user.role || 'user',
            team_name: user.team_name || user.team || user.managedTeam
          })
        }
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [user])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/deals", label: "Deals" },
    { href: "/callbacks", label: "Callbacks" },
    { href: "/reports", label: "Reports" },
    { href: "/settings", label: "Settings" },
  ]

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-purple-100 text-purple-800'
      case 'team-leader': return 'bg-blue-100 text-blue-800'
      case 'salesman': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-lg">VMAX</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-6 mx-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
          
          {/* Manager-specific links */}
          {user?.role === 'manager' && (
            <>
              <Link
                href="/manager/deals"
                className={cn(
                  "text-sm font-semibold transition-colors hover:text-primary",
                  pathname.startsWith("/manager/deals") ? "text-primary" : "text-muted-foreground"
                )}
                title="Manager Deals Table"
              >
                Deals Table
              </Link>
              <Link
                href="/manager/callbacks"
                className={cn(
                  "text-sm font-semibold transition-colors hover:text-primary",
                  pathname.startsWith("/manager/callbacks") ? "text-primary" : "text-muted-foreground"
                )}
                title="Manager Callbacks Table"
              >
                Callbacks Table
              </Link>
              <Link
                href="/admin/backup"
                className={cn(
                  "text-sm font-semibold transition-colors hover:text-primary",
                  pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground"
                )}
                title="Admin Panel"
              >
                Admin
              </Link>
            </>
          )}
          
          {/* Team Leader specific links */}
          {user?.role === 'team-leader' && (
            <Link
              href="/team-leader"
              className={cn(
                "text-sm font-semibold transition-colors hover:text-primary",
                pathname.startsWith("/team-leader") ? "text-primary" : "text-muted-foreground"
              )}
              title="Team Leader Dashboard"
            >
              Team Management
            </Link>
          )}
        </nav>

        {/* Right side actions */}
        <div className="ml-auto flex items-center space-x-4">
          {/* Action buttons */}
          {(user?.role === 'manager' || user?.role === 'team-leader' || user?.role === 'salesman') && (
            <>
              <Link href="/deals/new">
                <Button variant="default" size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Deal
                </Button>
              </Link>
              <Link href="/callbacks/new">
                <Button variant="outline" size="sm" className="border-cyan-500 text-cyan-600 hover:bg-cyan-50">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Callback
                </Button>
              </Link>
            </>
          )}

          {/* Notifications */}
          <NotificationBell />

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-auto px-2">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                      {loading ? '...' : getUserInitials(userProfile?.full_name || user?.name || user?.username || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">
                      {loading ? 'Loading...' : userProfile?.full_name || user?.name || user?.username || 'User'}
                    </span>
                    <Badge variant="outline" className={cn("text-xs", getRoleColor(user?.role || ''))}>
                      {user?.role || 'user'}
                    </Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                    {loading ? '...' : getUserInitials(userProfile?.full_name || user?.name || user?.username || 'User')}
                    {loading ? '...' : getUserInitials(userProfile?.full_name || 'User')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm">
                    {loading ? 'Loading...' : userProfile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userProfile?.email || 'No email'}
                  </p>
                  {userProfile?.team_name && (
                    <p className="text-xs text-muted-foreground">
                      Team: {userProfile.team_name}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
