"use client"

import { useState, useRef, useEffect } from "react"
import { 
  BarChart3,
  Bell,
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
  Upload,
  Download,
  Plus,
  Menu,
  X,
  Sun,
  Moon,
  Home,
  Activity,
  UserCheck,
  Shield,
  PieChart,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { SalesAnalysisDashboard } from '@/components/sales-dashboard-fixed'
import NotificationsPage from "@/components/notifications-page-new"
import { CustomerList } from "@/app/components/customer-list"
import { AddDealPage } from "@/components/add-deal"
import { DataCenter } from "@/components/data-center"
import { SalesTargets } from "@/components/sales-targets"
import { ProfileSettings } from "@/components/profile-settings"
import AdvancedAnalytics from "@/components/advanced-analytics"

export default function FullPageDashboard() {
  const { user, logout } = useAuth()
  const [isDark, setIsDark] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Apply theme to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  // Animated background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
    }> = []

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.3 + 0.1,
      })
    }

    function animate() {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(34, 211, 238, ${particle.opacity})`
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  if (!user) {
    return null // This should be handled by the auth wrapper
  }

  const getNavItems = () => {
    const baseItems = [
      { id: "dashboard", icon: Home, label: "Dashboard" },
      { id: "analytics", icon: BarChart3, label: "Analytics" },
      { id: "notifications", icon: Bell, label: "Notifications" },
    ]

    if (user.role === 'manager') {
      return [
        ...baseItems,
        { id: "all-deals", icon: FileText, label: "All Deals" },
        { id: "team-targets", icon: Target, label: "Team Targets" },
        { id: "datacenter", icon: Database, label: "Data Center" },
        { id: "customers", icon: Users, label: "All Customers" },
        { id: "team-management", icon: UserCheck, label: "Team Management" },
        { id: "competition", icon: TrendingUp, label: "Competition" },
        { id: "settings", icon: Settings, label: "Settings" },
      ]
    } else if (user.role === 'salesman') {
      return [
        ...baseItems,
        { id: "my-deals", icon: FileText, label: "My Deals" },
        { id: "add-deal", icon: Plus, label: "Add Deal" },
        { id: "my-targets", icon: Target, label: "My Targets" },
        { id: "datacenter", icon: Database, label: "Data Center" },
        { id: "my-customers", icon: Users, label: "My Customers" },
        { id: "competition", icon: TrendingUp, label: "Competition" },
      ]
    } else {
      return [
        ...baseItems,
        { id: "support-deals", icon: FileText, label: "Support Deals" },
        { id: "customers", icon: Users, label: "Customer Support" },
        { id: "datacenter", icon: Database, label: "Data Center" },
        { id: "competition", icon: TrendingUp, label: "Competition" },
      ]
    }
  }

  const navItems = getNavItems()

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      isDark 
        ? 'dark bg-slate-950' 
        : 'light bg-gradient-to-br from-blue-50 via-white to-cyan-50'
    }`}>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: isDark 
            ? "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.8) 0%, rgba(2, 6, 23, 1) 100%)"
            : "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.05) 100%)",
        }}
      />

      <div className="relative z-10 flex h-screen">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 flex-shrink-0`}>
          <Card className={`h-full backdrop-blur-sm transition-all duration-300 rounded-none border-r ${
            isDark 
              ? 'bg-slate-900/50 border-slate-700/50' 
              : 'bg-white/80 border-blue-200/50 shadow-lg'
          }`}>
            <CardHeader className={`p-4 border-b transition-colors duration-300 ${
              isDark ? 'border-slate-700/50' : 'border-blue-200/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center space-x-2 ${sidebarOpen ? '' : 'justify-center'}`}>
                  <Tv className={`h-6 w-6 transition-colors duration-300 ${
                    isDark ? 'text-cyan-500' : 'text-blue-600'
                  }`} />
                  {sidebarOpen && (
                    <span className="font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      Vmax Sales
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`transition-colors duration-300 ${
                    isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 flex-1 overflow-y-auto">
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                    collapsed={!sidebarOpen}
                    isDark={isDark}
                  />
                ))}
              </nav>
            </CardContent>

            <div className={`p-4 border-t transition-colors duration-300 ${
              isDark ? 'border-slate-700/50' : 'border-blue-200/50'
            }`}>
              <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
                {sidebarOpen && (
                  <div className={`text-sm transition-colors duration-300 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <div className="font-medium">{user.name}</div>
                    <div className={`text-xs capitalize transition-colors duration-300 ${
                      isDark ? 'text-slate-500' : 'text-slate-500'
                    }`}>{user.role}</div>
                    {user.team && (
                      <div className={`text-xs transition-colors duration-300 ${
                        isDark ? 'text-slate-600' : 'text-slate-400'
                      }`}>{user.team}</div>
                    )}
                  </div>
                )}
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className={`transition-colors duration-300 ${
                      isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className={`transition-colors duration-300 ${
                      isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className={`p-4 border-b backdrop-blur-sm transition-colors duration-300 ${
            isDark ? 'border-slate-700/50 bg-slate-900/30' : 'border-blue-200/50 bg-white/30'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                  isDark ? 'text-slate-100' : 'text-slate-800'
                }`}>
                  {getPageTitle(activeTab, user.role)}
                </h1>
                <p className={`text-sm transition-colors duration-300 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Welcome back, {user.name}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className={`hidden md:flex items-center space-x-1 rounded-full px-3 py-1.5 border backdrop-blur-sm transition-all duration-300 ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700/50' 
                    : 'bg-white/70 border-blue-200/50'
                }`}>
                  <Search className={`h-4 w-4 transition-colors duration-300 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                  <input
                    type="text"
                    placeholder="Search..."
                    className={`bg-transparent border-none focus:outline-none text-sm w-40 transition-colors duration-300 ${
                      isDark 
                        ? 'text-slate-100 placeholder:text-slate-500' 
                        : 'text-slate-800 placeholder:text-slate-400'
                    }`}
                  />
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`relative transition-colors duration-300 ${
                    isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-800'
                  }`}
                  onClick={() => setActiveTab("notifications")}
                >
                  <Bell className="h-5 w-5" />
                  <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse transition-colors duration-300 ${
                    isDark ? 'bg-cyan-500' : 'bg-blue-500'
                  }`}></span>
                </Button>

                <Badge variant="outline" className={`transition-colors duration-300 ${
                  isDark ? 'border-slate-600 text-slate-300' : 'border-blue-300 text-blue-700'
                }`}>
                  {user.team || user.role}
                </Badge>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-6">
            <PageContent 
              activeTab={activeTab} 
              user={user} 
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles}
            />
          </main>
        </div>
      </div>
    </div>
  )
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  collapsed,
  isDark,
}: { 
  icon: LucideIcon; 
  label: string; 
  active?: boolean; 
  onClick?: () => void;
  collapsed?: boolean;
  isDark: boolean;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`w-full transition-all duration-300 ${
        collapsed ? 'justify-center px-2' : 'justify-start'
      } ${
        active 
          ? isDark 
            ? "bg-slate-800/70 text-cyan-400" 
            : "bg-blue-100/70 text-blue-700"
          : isDark
            ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
            : "text-slate-600 hover:text-slate-800 hover:bg-blue-50/50"
      }`}
    >
      <Icon className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
      {!collapsed && label}
    </Button>
  )
}

function getPageTitle(activeTab: string, userRole: string): string {
  switch (activeTab) {
    case "dashboard":
      return "Dashboard Overview"
    case "analytics":
      return "Sales Analytics"
    case "all-deals":
      return "All Deals Management"
    case "my-deals":
      return "My Sales Deals"
    case "support-deals":
      return "Support Deals"
    case "add-deal":
      return "Add New Deal"
    case "team-targets":
      return "Team Sales Targets"
    case "my-targets":
      return "My Sales Targets"
    case "datacenter":
      return "Data Center"
    case "notifications":
      return "Notifications"
    case "customers":
    case "my-customers":
      return userRole === 'manager' ? "All Customers" : "My Customers"
    case "team-management":
      return "Team Management"
    case "competition":
      return "Sales Competition"
    case "settings":
      return "Settings"
    default:
      return "Dashboard"
  }
}

function PageContent({ 
  activeTab, 
  user, 
  uploadedFiles, 
  setUploadedFiles 
}: { 
  activeTab: string; 
  user: any;
  uploadedFiles: string[];
  setUploadedFiles: (files: string[]) => void;
}) {
  switch (activeTab) {
    case "dashboard":
      return <DashboardOverview user={user} />
    case "analytics":
      return <AdvancedAnalytics userRole={user.role} user={user} />
    case "all-deals":
    case "my-deals":
    case "support-deals":
      return <DealsManagement user={user} />
    case "add-deal":
      return <AddDealPage />
    case "team-targets":
    case "my-targets":
      return <SalesTargets userRole={user.role} user={user} />
    case "datacenter":
      return <DataCenter userRole={user.role} user={user} />
    case "notifications":
      return <NotificationsPage userRole={user.role} user={user} />
    case "customers":
    case "my-customers":
      return <CustomerList userRole={user.role} userId={user.id} />
    case "team-management":
      return <TeamManagement user={user} />
    case "competition":
      return <CompetitionDashboard />
    case "settings":
      return <ProfileSettings user={user} />
    default:
      return <DashboardOverview user={user} />
  }
}

function DashboardOverview({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-200/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Welcome back, {user.name}!</h3>
              <p className="text-muted-foreground">
                {user.role === 'manager' 
                  ? 'Here\'s an overview of your team\'s performance today.'
                  : user.role === 'salesman'
                  ? 'Ready to close some deals? Here\'s your performance overview.'
                  : 'Here\'s an overview of your customer support activities.'}
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {user.team || user.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sales"
          value="$125,430"
          icon={TrendingUp}
          trend="up"
          change="+12.5%"
        />
        <MetricCard
          title="Active Deals"
          value="24"
          icon={FileText}
          trend="up"
          change="+8.2%"
        />
        <MetricCard
          title="Customers"
          value="156"
          icon={Users}
          trend="stable"
          change="+2.1%"
        />
        <MetricCard
          title="Target Progress"
          value="78%"
          icon={Target}
          trend="up"
          change="+5.3%"
        />
      </div>

      <SalesAnalysisDashboard userRole={user.role} user={user} />
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {user.role === 'manager' && (
              <>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Plus className="h-6 w-6 mb-2" />
                  Add Deal
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Target className="h-6 w-6 mb-2" />
                  Set Targets
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  Manage Team
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  View Reports
                </Button>
              </>
            )}
            
            {user.role === 'salesman' && (
              <>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Plus className="h-6 w-6 mb-2" />
                  New Deal
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  My Deals
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Target className="h-6 w-6 mb-2" />
                  My Targets
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  Competition
                </Button>
              </>
            )}
            
            {user.role === 'customer-service' && (
              <>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  Customers
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  Support Deals
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Bell className="h-6 w-6 mb-2" />
                  Notifications
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Activity className="h-6 w-6 mb-2" />
                  Analytics
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ title, value, icon: Icon, trend, change }: {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: 'up' | 'down' | 'stable';
  change: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className={`text-xs ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {change} from last month
            </p>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  )
}

function DealsManagement({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {user.role === 'manager' ? 'All Team Deals' : 'My Deals'}
          </h2>
          <p className="text-muted-foreground">
            {user.role === 'manager' 
              ? 'Manage all team deals and performance' 
              : 'Track your personal deals and performance'}
          </p>
        </div>
        {(user.role === 'manager' || user.role === 'salesman') && (
          <Button 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            onClick={() => window.location.href = '/deals/new'}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Deal
          </Button>
        )}
      </div>
      
      <SalesAnalysisDashboard userRole={user.role} user={user} />
    </div>
  )
}








function TeamManagement({ user }: { user: any }) {
  if (user.role !== 'manager') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">Only managers can access team management.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="h-5 w-5 mr-2" />
            Team Management
          </CardTitle>
          <CardDescription>Manage team members, roles, and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { team: "CS TEAM", members: 5, performance: 85 },
              { team: "ALI ASHRAF", members: 8, performance: 92 },
              { team: "SAIF MOHAMED", members: 7, performance: 88 },
              { team: "OTHER", members: 5, performance: 76 },
            ].map((team) => (
              <Card key={team.team} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{team.team}</h4>
                    <Badge variant="outline">{team.members} members</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Performance</span>
                      <span>{team.performance}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                        style={{ width: `${team.performance}%` }}
                      />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Team
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CompetitionDashboard() {
  return (
    <iframe 
      src="/competation" 
      className="w-full h-[calc(100vh-200px)] border-0 rounded-lg"
      title="Sales Competition Dashboard"
    />
  )
}