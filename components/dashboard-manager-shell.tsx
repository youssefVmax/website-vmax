"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarSeparator,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Database, FileSpreadsheet, HardDrive } from "lucide-react"

export default function DashboardManagerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()

  const dataCenterItems = [
    { href: "/dashboard/data-center/backup", label: "Backup", icon: HardDrive },
    { href: "/dashboard/data-center/export", label: "Data Export", icon: FileSpreadsheet },
  ]

  // If not manager, render children without sidebar
  if (user?.role !== "manager") {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <Sidebar className="bg-white/80 border-r">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Database className="h-5 w-5 text-blue-600" />
            <span className="font-semibold">Data Center</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Manage</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {dataCenterItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Link href={item.href} legacyBehavior>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <a>
                            <Icon className="text-blue-600" />
                            <span>{item.label}</span>
                          </a>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <div className="flex h-12 items-center gap-2 px-4 border-b bg-background/60">
          <SidebarTrigger />
          <div className="text-sm text-muted-foreground">Dashboard / Data Center</div>
        </div>
        <div className="p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
