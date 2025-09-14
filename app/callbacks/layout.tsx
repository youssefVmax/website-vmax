"use client";

import React from "react";
import { MainNav } from "@/components/main-nav";
import { NotificationsProvider } from "@/hooks/use-notifications";

// Use the same shell as the dashboard so callbacks pages share the main navbar/layout
export default function CallbacksLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <div className="flex min-h-screen flex-col">
        <MainNav />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </NotificationsProvider>
  );
}