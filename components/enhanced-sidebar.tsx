"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Home, 
  Users, 
  Phone, 
  BarChart3, 
  Settings, 
  User,
  Building2,
  Target,
  Bell,
  FileText,
  Database
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { apiService } from "@/lib/api-service"

interface UserProfile {
  id: string
  username: string
  full_name: string
  email: string
  role: string
  team_name?: string
}

export function EnhancedSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user profile from API
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        if (user?.id) {
          setLoading(true)
          
          const profile = await apiService.getUserById(user.id.toString())
          
          if (profile) {
            setUserProfile({
              id: profile.id,
              username: profile.username,
              full_name: profile.full_name || profile.name || profile.username,
              email: profile.email,
              role: profile.role,
              team_name: profile.team_name || profile.team
            })
          } else {
            // Fallback to user data from auth
            setUserProfile({
              id: user.id.toString(),
              username: user.username || 'User',
              full_name: user.full_name || user.name || user.username || 'User',
              email: user.email || '',
              role: user.role,
              team_name: user.team_name || user.team
            })
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
        
        // Fallback to user data from auth context
        if (user) {
          setUserProfile({
            id: user.id.toString(),
            username: user.username || 'User',
            full_name: user.full_name || user.name || user.username || 'User',
            email: user.email || '',
            role: user.role,
            team_name: user.team_name || user.team
          })
        }
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [user])

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-purple-100 text-purple-800'
      case 'team-leader': return 'bg-blue-100 text-blue-800'
      case 'salesman': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Navigation items based on role
  const getNavigationItems = () => {
    const baseItems = [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/deals", label: "Deals", icon: Users },
      { href: "/callbacks", label: "Callbacks", icon: Phone },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ]

    const roleSpecificItems = []

    if (user?.role === 'manager') {
      roleSpecificItems.push(
        { href: "/manager/deals", label: "Deals Table", icon: FileText },
        { href: "/manager/callbacks", label: "Callbacks Table", icon: Phone },
        { href: "/admin/backup", label: "Admin Panel", icon: Database },
        { href: "/notifications", label: "Notifications", icon: Bell },
        { href: "/targets", label: "Targets", icon: Target }
      )
    }

    if (user?.role === 'team-leader') {
      roleSpecificItems.push(
        { href: "/team-leader", label: "Team Management", icon: Building2 },
        { href: "/targets", label: "Targets", icon: Target }
      )
    }

    roleSpecificItems.push({ href: "/settings", label: "Settings", icon: Settings })

    return [...baseItems, ...roleSpecificItems]
  }

  const navigationItems = getNavigationItems()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-50 border-r">
      {/* User Profile Section */}
      <div className="flex flex-col items-center p-6 border-b">
        <Avatar className="h-16 w-16 mb-3">
          <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-lg">
            {loading ? '...' : getUserInitials(userProfile?.full_name || 'User')}
          </AvatarFallback>
        </Avatar>
        
        <div className="text-center">
          <h3 className="font-semibold text-gray-900">
            {loading ? 'Loading...' : userProfile?.full_name || 'User'}
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            @{userProfile?.username || 'username'}
          </p>
          
          <Badge className={cn("text-xs", getRoleColor(user?.role || ''))}>
            {user?.role || 'user'}
          </Badge>
          
          {userProfile?.team_name && (
            <p className="text-xs text-gray-500 mt-1">
              Team: {userProfile.team_name}
            </p>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-cyan-100 text-cyan-900 border-r-2 border-cyan-500"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-500">Online</span>
          </div>
          <span className="text-xs text-gray-400">VMAX v2.0</span>
        </div>
      </div>
    </div>
  )
}
