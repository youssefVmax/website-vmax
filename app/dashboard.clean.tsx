"use client"

import { useEffect, useState, useRef } from "react"
import { 
  BarChart3,
  Bell,
  Command,
  Database,
  type LucideIcon,
  Search,
  Settings,
  Tv,
  Users,
  Target,
  TrendingUp,
  FileText,
  LogOut,
  User,
  LineChart,
  Shield,
  Key,
  Download,
  Trash2,
  PieChart,
  BarChart,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ManagerDealsDashboard from "@/components/manager-deals-dashboard"
import NotificationsPage from "@/components/notifications-page"
import SalesAnalysisDashboard from "@/components/sales-dashboard"

interface DashboardProps {
  userRole: "manager" | "salesman" | "customer-service"
  user: { name: string; username: string }
  onLogout: () => void
}

export default function Dashboard({ userRole, user, onLogout }: DashboardProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [activeTab, setActiveTab] = useState("dashboard")
  
  // Get the appropriate user ID based on role
  const getUserId = () => {
    if (userRole === "manager") return undefined; // Manager sees all data
    if (userRole === "salesman") return user.username; // Use username as ID for sales
    if (userRole === "customer-service") return user.username; // Use username as ID for CS
    return undefined;
  };

  // Rest of the component implementation...
  
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Main content area */}
      <main className="p-6">
        {activeTab === "dashboard" && <DashboardContent userRole={userRole} user={user} />}
        {activeTab === "deals" && <DealsContent userRole={userRole} />}
        {activeTab === "targets" && <SalesTargetsContent userRole={userRole} />}
        {activeTab === "analytics" && <AnalyticsContent userRole={userRole} />}
        {activeTab === "settings" && <SettingsContent userRole={userRole} />}
      </main>
    </div>
  )
}

// Update DashboardContent to accept userId prop
function DashboardContent({ userRole, user }: { userRole: "manager" | "salesman" | "customer-service"; user: { name: string; username: string } }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">
        Welcome back, {user.name}!
      </h2>
      <p className="text-muted-foreground">
        Here's what's happening with your sales performance.
      </p>
      
      {/* Sales Dashboard Component */}
      <SalesAnalysisDashboard userRole={userRole} user={user} />
      
      {/* Additional metrics and charts based on user role */}
      {userRole === 'manager' && (
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>
              Overview of your team's performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Team performance metrics will be displayed here
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {userRole === 'salesman' && (
        <Card>
          <CardHeader>
            <CardTitle>Your Performance</CardTitle>
            <CardDescription>
              Your individual performance metrics and targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Your performance metrics will be displayed here
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {userRole === 'customer-service' && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Support Metrics</CardTitle>
            <CardDescription>
              Customer service performance and ticket metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Customer service metrics will be displayed here
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Placeholder components for other tabs
function SalesTargetsContent({ userRole }: { userRole: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Sales Targets</h2>
      <Card>
        <CardContent className="p-6">
          <div className="h-[400px] flex items-center justify-center">
            <Target className="h-12 w-12 text-muted-foreground" />
            <span className="ml-4 text-muted-foreground">
              Sales targets will be displayed here
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DealsContent({ userRole }: { userRole: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Deals</h2>
      <Card>
        <CardContent className="p-6">
          <div className="h-[400px] flex items-center justify-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <span className="ml-4 text-muted-foreground">
              Deals will be displayed here
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AnalyticsContent({ userRole }: { userRole: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
      <Card>
        <CardContent className="p-6">
          <div className="h-[400px] flex items-center justify-center">
            <BarChart className="h-12 w-12 text-muted-foreground" />
            <span className="ml-4 text-muted-foreground">
              Analytics will be displayed here
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsContent({ userRole }: { userRole: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      <Card>
        <CardContent className="p-6">
          <div className="h-[400px] flex items-center justify-center">
            <Settings className="h-12 w-12 text-muted-foreground" />
            <span className="ml-4 text-muted-foreground">
              Settings will be displayed here
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}