'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import NotificationMenu from './notification-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Plus } from 'lucide-react';

export function Navbar({ userRole = 'manager' }: { userRole?: 'manager' | 'salesman' | 'customer-service' }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src="/logo.PNG" 
                alt="VMAX Logo" 
                className="h-10 w-10 object-contain rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              />
            </div>
            <span className="inline-block font-bold text-xl bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">
              VMAX Dashboard
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {userRole === 'manager' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  <span>New Notification</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-96 p-4" align="end">
                <h3 className="text-lg font-semibold mb-4">Send Notification</h3>
                {/* TODO: Implement SendNotificationForm or route to notifications page */}
                <div className="text-sm text-slate-500">Use Notifications page to send messages.</div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <NotificationMenu />
          
          {/* User profile dropdown would go here */}
          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {userRole.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

