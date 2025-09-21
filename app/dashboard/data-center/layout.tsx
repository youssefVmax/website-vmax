"use client"

import React from "react"
import DashboardManagerShell from "@/components/dashboard-manager-shell"

export default function DataCenterLayout({ children }: { children: React.ReactNode }) {
  return <DashboardManagerShell>{children}</DashboardManagerShell>
}
