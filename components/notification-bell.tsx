"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/hooks/use-notifications"

export function NotificationBell() {
  const router = useRouter()
  const { unreadCount } = useNotifications()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative text-slate-400 hover:text-slate-100 hover:bg-accent"
      onClick={() => router.push('/notifications')}
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-2 w-2 bg-cyan-500 rounded-full animate-pulse"></span>
      )}
    </Button>
  )
}
