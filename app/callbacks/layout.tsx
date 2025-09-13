"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Plus, List, Home } from "lucide-react";

export default function CallbacksLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userRole={(user?.role as any) || 'salesman'} />

      <div className="flex flex-1">
        {/* Simple Sidebar for Callbacks section */}
        <aside className="w-64 hidden md:block border-r bg-background/50">
          <div className="p-4 space-y-2">
            <div className="text-sm font-semibold text-muted-foreground mb-2">Callbacks</div>
            <div className="grid gap-2">
              <Button variant="ghost" className="justify-start" onClick={() => (window.location.href = '/') }>
                <Home className="h-4 w-4 mr-2" /> Dashboard
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => (window.location.href = '/callbacks/manage') }>
                <List className="h-4 w-4 mr-2" /> Manage Callbacks
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => (window.location.href = '/callbacks/new') }>
                <Plus className="h-4 w-4 mr-2" /> New Callback
              </Button>
            </div>
            <div className="mt-6 text-xs text-muted-foreground flex items-center"><Phone className="h-3 w-3 mr-1" /> Role: {user?.role || 'guest'}</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
