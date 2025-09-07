"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/notification-bell"
import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MainNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/deals", label: "Deals" },
    { href: "/reports", label: "Reports" },
    { href: "/settings", label: "Settings" },
  ]

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
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
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <Link href="/deals/new">
            <Button variant="default" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Deal
            </Button>
          </Link>
          <NotificationBell />
        </div>
      </div>
    </div>
  )
}
