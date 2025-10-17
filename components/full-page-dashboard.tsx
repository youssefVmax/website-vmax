"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { 
  BarChart3,
  Bell,
  Database,
  type LucideIcon,
  Settings,
  Tv,
  Users,
  Target,
  TrendingUp,
  FileText,
  FileSpreadsheet,
  LogOut,
  User as UserIcon,
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
  DollarSign,
  Phone,
  RefreshCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { useSWRDashboardData, useSWRDashboardStats } from '@/hooks/useSWRData'
import { apiMethods } from "@/config/api"
import { UserRole } from "@/types/user"
import { DateFilter } from "@/components/ui/date-filter"
import SalesAnalysisDashboard from '@/components/sales-dashboard'
import NotificationsPage from "@/components/notifications-page-new"
import { AddDealPage } from "@/components/add-deal"
import EnhancedAddDeal from "@/components/enhanced-add-deal"
import { DataCenter } from "@/components/data-center"
import SalesTargets from "@/components/sales-targets"
import { EnhancedTargetsManagement } from "./enhanced-targets-management"
import { EnhancedTargetDashboard } from "./enhanced-target-dashboard"
import { ProfileSettings } from "@/components/profile-settings"
import AdvancedAnalytics from "@/components/advanced-analytics"
import EnhancedAnalytics from "@/components/enhanced-analytics"
import DealsTablePage from "@/components/deals-table"
import MyDealsTable from "@/components/my-deals-table"
import { ImportExportControls } from "@/components/import-export-controls"
import UserManagement from "@/components/user-management-new"
import AccessDenied from "@/components/access-denied"
import { CallbacksManagement } from "@/components/callbacks-management"
import ManageCallbacksPage from "@/components/manage-callback"
import NewCallbackPage from "@/components/new-callback"
import { User } from '@/types/user'
import apiService, { Deal } from "@/lib/api-service"

export default function FullPageDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Date filter state
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())
  const [dateFilterKey, setDateFilterKey] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  // Listen for tab changes from dashboard buttons
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail)
    }
    window.addEventListener('setActiveTab', handleTabChange as EventListener)
    return () => window.removeEventListener('setActiveTab', handleTabChange as EventListener)
  }, [])

  // Auto-sync deals with targets on app startup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Clear any cached data to ensure fresh load
        if (typeof window !== 'undefined' && (window as any).unifiedApiService) {
          (window as any).unifiedApiService.clearCache();
        }
        
        // Initialize API connection
        await apiService.getUsers({ role: 'salesman' })
      } catch (error) {
        console.error('Failed to initialize API service:', error)
      }
    }
    initializeApp()
  }, [])

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

  // Removed auto-redirect. Salesmen now land on Dashboard and stay there unless they choose another tab.

  if (!user || !user.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading user...</p>
          {!user && <p className="text-slate-400 text-sm mt-2">No user data</p>}
          {user && !user.role && <p className="text-slate-400 text-sm mt-2">Missing user role</p>}
        </div>
      </div>
    )
  }


  const getNavItems = () => {
    const baseItems = [
      { id: "dashboard", icon: Home, label: "Dashboard" } as const,
      { id: "notifications", icon: Bell, label: "Notifications" } as const,
    ]

    if (user.role === 'manager') {
      return [
        ...baseItems,
        { id: "callbacks-manage", icon: Phone, label: "Manage Callbacks" } as const,
        { id: "user-management", icon: Users, label: "User Management" } as const,
        { id: "team-targets", icon: Target, label: "Team Targets" } as const,
        { id: "analytics", icon: BarChart3, label: "Advanced Analytics" } as const,
        { id: "datacenter", icon: Database, label: "Data Center" } as const,
        { id: "admin-deals-table", icon: Users, label: "All Deals Table" } as const,
        { id: "admin-callbacks-table", icon: Phone, label: "All Callbacks Table" } as const,
        { id: "settings", icon: Settings, label: "Settings" } as const,
      ]
    } else if (user.role === 'team_leader') {
      return [
        ...baseItems,
        { id: "callbacks-manage", icon: Phone, label: "Team Callbacks" } as const,
        { id: "callbacks-new", icon: Plus, label: "New Callback" } as const,
        { id: "my-deals", icon: FileText, label: "Team Deals" } as const,
        { id: "add-deal", icon: Plus, label: "Add Deal" } as const,
        { id: "my-targets", icon: Target, label: "Team Targets" } as const,
        { id: "analytics", icon: BarChart3, label: "Team Analytics" } as const,
        { id: "datacenter", icon: Database, label: "Data Center" } as const,
      ]
    } else if (user.role === 'salesman') {
      return [
        ...baseItems,
        { id: "callbacks-manage", icon: Phone, label: "My Callbacks" } as const,
        { id: "callbacks-new", icon: Plus, label: "New Callback" } as const,
        { id: "my-deals", icon: FileText, label: "My Deals Table" } as const,
        { id: "add-deal", icon: Plus, label: "Add Deal" } as const,
        { id: "my-targets", icon: Target, label: "My Targets" } as const,
        { id: "analytics", icon: BarChart3, label: "Advanced Analytics" } as const,
        { id: "datacenter", icon: Database, label: "Data Center" } as const,
      ]
    } else {
      return [
        ...baseItems,
        { id: "support-deals", icon: FileText, label: "Support Deals" } as const,
        { id: "analytics", icon: BarChart3, label: "Advanced Analytics" } as const,
        { id: "datacenter", icon: Database, label: "Data Center" } as const,
      ]
    }
  }

  const navItems = getNavItems()


  try {
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
        <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 flex-shrink-0`}>
          <Card className={`h-full backdrop-blur-sm transition-all duration-300 rounded-none border-r ${
            isDark 
              ? 'bg-slate-900/50 border-slate-700/50' 
              : 'bg-white/80 border-blue-200/50 shadow-lg'
          }`}>
            <CardHeader className={`p-4 border-b transition-colors duration-300 ${
              isDark ? 'border-slate-700/50' : 'border-blue-200/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center space-x-3 ${isSidebarOpen ? '' : 'justify-center'}`}>
                  <div className="relative">
                    <img 
                      src="/logo.PNG" 
                      alt="VMAX Logo" 
                      className="h-8 w-8 object-contain rounded-md shadow-sm transition-all duration-300 hover:shadow-md"
                    />
                  </div>
                  {isSidebarOpen && (
                    <span className="font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      VMAX Sales
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`transition-colors duration-300 ${
                    isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 flex-1 overflow-y-auto">
              <nav className="space-y-2">
                {navItems.map((item: any) => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeTab === item.id}
                    onClick={() => {
                      if (item.href) {
                        window.location.href = item.href
                      } else {
                        setActiveTab(item.id)
                      }
                    }}
                    collapsed={!isSidebarOpen}
                    isDark={isDark}
                  />
                ))}
              </nav>
            </CardContent>

            <div className={`p-4 border-t transition-colors duration-300 ${
              isDark ? 'border-slate-700/50' : 'border-blue-200/50'
            }`}>
              <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                {isSidebarOpen && (
                  <div className={`text-sm transition-colors duration-300 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <div className="font-medium">{user.full_name || user.username}</div>
                    <div className={`text-xs capitalize transition-colors duration-300 ${
                      isDark ? 'text-slate-500' : 'text-slate-500'
                    }`}>{user.role}</div>
                    {user.team_name && (
                      <div className={`text-xs transition-colors duration-300 ${
                        isDark ? 'text-slate-600' : 'text-slate-400'
                      }`}>{user.team_name}</div>
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
                      isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-600 hover:text-red-600'
                    }`}
                    title="Logout"
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
                  Welcome back, {user.full_name || user.username || 'User'}! ({user.role})
                </p>
              </div>

              <div className="flex items-center space-x-4">
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
                  {user.team_name || user.role}
                </Badge>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <PageContent 
              activeTab={activeTab} 
              user={user} 
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles}
              setActiveTab={setActiveTab}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              setSelectedMonth={setSelectedMonth}
              setSelectedYear={setSelectedYear}
              setDateFilterKey={setDateFilterKey}
            />
          </main>
        </div>
      </div>
    </div>
  )
  } catch (error) {
    console.error('FullPageDashboard render error:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="text-red-400 mb-4">⚠️ Dashboard Error</div>
          <p className="text-slate-300 mb-4">Something went wrong loading the dashboard</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }
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
    case "sales-dashboard":
      return "Sales Dashboard"
    case "analytics":
      return "Sales Analytics"
    case "enhanced-analytics":
      return "Enhanced Analytics"
    case "all-deals":
      return "All Deals Management"
    case "my-deals":
      return "My Deals Table"
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
    case "user-management":
      return "User Management"
    case "competition":
      return "Sales Competition"
    case "callbacks-manage":
      return "Manage Callbacks"
    case "callbacks-new":
      return "New Callback"
    case "admin-deals-table":
      return "All Deals Table"
    case "admin-callbacks-table":
      return "All Callbacks Table"
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
  setUploadedFiles,
  setActiveTab,
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,
  setDateFilterKey
}: { 
  activeTab: string; 
  user: any;
  uploadedFiles: string[];
  setUploadedFiles: (files: string[]) => void;
  setActiveTab: (tab: string) => void;
  selectedMonth: string;
  selectedYear: string;
  setSelectedMonth: (month: string) => void;
  setSelectedYear: (year: string) => void;
  setDateFilterKey: (key: number | ((prev: number) => number)) => void;
}) {
  switch (activeTab) {
    case "dashboard":
      try {
        return <DashboardOverview user={user} setActiveTab={setActiveTab} />
      } catch (error) {
        console.error('Error rendering dashboard:', error)
        return (
          <div className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Welcome, {user?.name || user?.username}!</h2>
              <p className="text-gray-600 mb-4">Your dashboard is loading...</p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        )
      }
    case "sales-dashboard":
      return <SalesAnalysisDashboard userRole={user.role} user={user} />
    case "analytics":
      return <AdvancedAnalytics userRole={user.role} user={user} />
    case "all-deals":
    case "my-deals":
    case "support-deals":
      if (activeTab === "my-deals") {
        // Team leader: show team deals table with server-side filters/pagination
        if (user.role === 'team_leader') {
          return <DealsTablePage />
        }
        // Salesman: personal deals table
        if (user.role === 'salesman') {
          return <MyDealsTable user={user} />
        }
      }
      return <DealsManagement user={user} />
    case "add-deal":
      return <EnhancedAddDeal currentUser={user} />
    case "team-targets":
      return <EnhancedTargetsManagement userRole={user.role} user={user} />
    case "my-targets":
      return <EnhancedTargetDashboard userRole={user.role} user={user} />
    case "datacenter":
      return <DataCenter userRole={user.role} user={user} />
    case "notifications":
      return <NotificationsPage userRole={user.role} user={user} />
    case "user-management":
      // Only managers can access user management
      if (user.role !== 'manager') {
        return <AccessDenied feature="User Management" />
      }
      return <UserManagement userRole={user.role} user={user} />
    case "competition":
      return <CompetitionDashboard />
    case "callbacks-manage":
      return <ManageCallbacksPage />
    case "callbacks-new":
      return <NewCallbackPage />
    case "admin-deals-table":
      return <AdminDealsTablePage user={user} setActiveTab={setActiveTab} />
    case "admin-callbacks-table":
      return <AdminCallbacksTablePage user={user} setActiveTab={setActiveTab} />
    case "settings":
      return <ProfileSettings user={user} />
    default:
      
      try {
        return <DashboardOverview user={user} setActiveTab={setActiveTab} />
      } catch (error) {
        console.error('Error rendering DashboardOverview:', error)
        return (
          <div className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Welcome to VMAX Sales Dashboard</h2>
              <p className="text-gray-600 mb-4">Loading your dashboard...</p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        )
      }
  }
}

function DashboardOverview({ user, setActiveTab }: { user: any, setActiveTab: (tab: string) => void }) {
  // ✅ SWR: Use SWR hooks for data fetching
  const { 
    deals = [], 
    callbacks = [], 
    targets = [], 
    notifications = [], 
    isLoading, 
    error,
    refresh 
  } = useSWRDashboardData({
    userRole: user.role,
    userId: user.id,
    managedTeam: user.managedTeam || user.team_name,
    limit: 1000  // ✅ FIX: Get all deals for accurate metrics
  });

  // ✅ SWR: Use SWR stats hook for dashboard stats
  const { 
    stats: dashboardStats, 
    isLoading: statsLoading, 
    error: statsError, 
    refresh: refreshStats 
  } = useSWRDashboardStats({
    userRole: user.role,
    userId: user.id,
    managedTeam: user.managedTeam || user.team_name
  });

  // Create data object for compatibility
  const data = { deals, callbacks, targets, notifications };

  // Enhanced analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [totalCallbacksFromAPI, setTotalCallbacksFromAPI] = useState<number | null>(null);

  // Calculate metrics with safe number conversion
  const metrics = useMemo(() => {
    const deals = data.deals || [];
    const callbacks = data.callbacks || [];
    const targets = data.targets || [];
    
    // Safe numeric conversion to prevent binary string issues
    // ✅ FIX: Check both camelCase and snake_case field names
    const totalRevenue = deals.reduce((sum: number, deal: any) => {
      const amountField = deal.amount_paid || deal.amountPaid || 0;
      const amount = typeof amountField === 'string' 
        ? parseFloat(amountField) || 0 
        : Number(amountField) || 0;
      return sum + amount;
    }, 0);
    
    
    
    return {
      totalRevenue,
      totalSales: totalRevenue, // Alias for compatibility
      totalDeals: deals.length,
      averageDealSize: deals.length > 0 ? totalRevenue / deals.length : 0,
      // Role-aware total callbacks: manager uses system total; others use filtered total or local length
      totalCallbacks: (user.role === 'manager'
        ? (totalCallbacksFromAPI ?? callbacks.length)
        : (typeof totalCallbacksFromAPI === 'number' ? totalCallbacksFromAPI : callbacks.length)),
      totalTargets: targets.length,
      deals,
      callbacks,
      targets
    };
  }, [data, totalCallbacksFromAPI]);

  const [totalAgents, setTotalAgents] = useState(0)

  useEffect(() => {
    const loadAgentCount = async () => {
      if (user.role === 'manager') {
        try {
          
          const usersResponse = await fetch('/api/unified-data?userRole=manager&dataTypes=users&limit=1000');
          const usersData = await usersResponse.json();
          
          
          if (usersData.success && usersData.data && Array.isArray(usersData.data.users)) {
            // Count all users in the system (not just salesmen)
            const allUsers = usersData.data.users;
            setTotalAgents(allUsers.length);
            
          } else {
            
            setTotalAgents(0);
          }
        } catch (error) {
          console.error('❌ DashboardOverview: Error loading agent count:', error)
          setTotalAgents(0);
        }
      }
    }
    loadAgentCount()
  }, [user.role])

  // Load actual callback total from API
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadCallbackTotal = async () => {
      try {
        if (!user?.role || !user?.id) return;

        const params = new URLSearchParams({
          userRole: user.role,
          userId: user.id,
          limit: '1',
          page: '1'
        });

        if (user?.managedTeam) {
          params.set('managedTeam', user.managedTeam);
        }

        const response = await fetch(`/api/callbacks?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load callbacks total: ${response.status}`);
        }

        const data = await response.json();
        if (!cancelled) {
          // Role-aware: manager -> systemTotal; others -> filtered total
          const apiTotal = user.role === 'manager'
            ? (typeof data?.systemTotal === 'number' ? data.systemTotal : (typeof data?.total === 'number' ? data.total : null))
            : (typeof data?.total === 'number' ? data.total : (Array.isArray(data?.callbacks) ? data.callbacks.length : null));
          setTotalCallbacksFromAPI(apiTotal);
        }
      } catch (error) {
        if ((error as any)?.name !== 'AbortError') {
          console.error('❌ DashboardOverview: Error fetching callback total:', error);
        }
        if (!cancelled) {
          setTotalCallbacksFromAPI(null);
        }
      }
    };

    loadCallbackTotal();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user?.role, user?.id, user?.managedTeam])

  if ((statsLoading || isLoading) && (!data || data.deals.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (statsError || error) {
    console.log('❌ Dashboard: Error state', { statsError, error });
    return (
      <div className="space-y-6">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="text-lg font-semibold">Error Loading Dashboard</p>
              <p className="text-sm mt-2">{statsError || error?.message || 'Unknown error'}</p>
              <Button onClick={refreshStats} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-cyan-200/50 dark:border-cyan-800/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"></div>
        <CardContent className="p-8 relative">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                    Welcome back, {user.full_name || user.username || 'User'}!
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {user.role === 'manager' 
                      ? 'Here\'s an overview of your team\'s performance today.'
                      : user.role === 'salesman'
                        ? `You have ${metrics?.deals?.length || 0} deals totaling $${metrics?.totalSales?.toFixed(2) || '0.00'}`
                        : `Supporting ${metrics?.deals?.length || 0} customer interactions.`}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-xl border border-green-200/50 dark:border-green-800/50">
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  ${metrics?.totalSales?.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-muted-foreground">{metrics?.deals?.length || 0} Deals</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role-based KPIs with Real-time Animation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black dark:text-gray-200">
                  {user.role === 'manager' ? "Team Sales" : "My Sales"}
                </p>
                <p className="text-2xl font-bold">
                  ${(metrics?.totalSales || 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black dark:text-gray-200">
                  {user.role === 'manager' ? "Total Deals" : "My Deals"}
                </p>
                <p className="text-2xl font-bold">
                  {metrics?.deals?.length || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black dark:text-gray-200">
                  {user.role === 'manager' ? "Total Callbacks" : "Performance Score"}
                </p>
                <p className="text-2xl font-bold">
                  {user.role === 'manager' 
                    ? (metrics?.totalCallbacks || 0).toLocaleString()
                    : `${Math.min(100, ((metrics?.deals?.length || 0) * 10))}%`
                  }
                </p>
              </div>
              {user.role === 'manager' ? (
                <Phone className="h-8 w-8 text-purple-600" />
              ) : (
                <Users className="h-8 w-8 text-purple-600" />
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black dark:text-gray-200">
                  {user.role === 'manager' 
                    ? "Avg Deal Size" 
                    : user.role === 'team_leader' 
                      ? "Team Callbacks"
                      : "My Callbacks"
                  }
                </p>
                <p className="text-2xl font-bold">
                  {user.role === 'manager' 
                    ? `$${(metrics?.averageDealSize || 0).toLocaleString()}`
                    : (metrics?.totalCallbacks || 0).toLocaleString()
                  }
                </p>
              </div>
              {user.role === 'manager' ? (
                <Target className="h-8 w-8 text-orange-600" />
              ) : (
                <Phone className="h-8 w-8 text-orange-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>


      <SalesAnalysisDashboard userRole={user.role} user={user} />
      
      {/* Import/Export Controls for Managers */}
      {user.role === 'manager' && (
        <ImportExportControls user={user} />
      )}
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {user.role === 'manager' ? (
              <>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("team-targets")}>
                  <Target className="h-6 w-6 mb-2" />
                  Set Targets
                </Button>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("analytics")}>
                  <BarChart3 className="h-6 w-6 mb-2" />
                  Analytics
                </Button>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("admin-deals-table")}>
                  <Users className="h-6 w-6 mb-2" />
                  All Deals
                </Button>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("admin-callbacks-table")}>
                  <Phone className="h-6 w-6 mb-2" />
                  All Callbacks
                </Button>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("notifications")}>
                  <Bell className="h-6 w-6 mb-2" />
                  Notifications
                </Button>
              </>
            ) : user.role === 'salesman' ? (
              <>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("add-deal")}>
                  <Plus className="h-6 w-6 mb-2" />
                  Add Deal
                </Button>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("my-deals")}>
                  <FileText className="h-6 w-6 mb-2" />
                  My Deals
                </Button>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("my-targets")}>
                  <Target className="h-6 w-6 mb-2" />
                  My Targets
                </Button>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("analytics")}>
                  <Activity className="h-6 w-6 mb-2" />
                  Analytics
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("support-deals")}>
                  <FileText className="h-6 w-6 mb-2" />
                  Support Deals
                </Button>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("notifications")}>
                  <Bell className="h-6 w-6 mb-2" />
                  Notifications
                </Button>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setActiveTab("analytics")}>
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

function MetricCard({ title, value, icon: Icon, trend, change, color = 'blue' }: {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: 'up' | 'down' | 'stable';
  change: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'cyan';
}) {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50',
      border: 'border-blue-200/50 dark:border-blue-800/50',
      icon: 'text-blue-600 dark:text-blue-400',
      accent: 'bg-blue-500'
    },
    green: {
      bg: 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/50 dark:to-green-900/50',
      border: 'border-emerald-200/50 dark:border-emerald-800/50',
      icon: 'text-emerald-600 dark:text-emerald-400',
      accent: 'bg-emerald-500'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/50 dark:to-violet-900/50',
      border: 'border-purple-200/50 dark:border-purple-800/50',
      icon: 'text-purple-600 dark:text-purple-400',
      accent: 'bg-purple-500'
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/50 dark:to-amber-900/50',
      border: 'border-orange-200/50 dark:border-orange-800/50',
      icon: 'text-orange-600 dark:text-orange-400',
      accent: 'bg-orange-500'
    },
    cyan: {
      bg: 'bg-gradient-to-br from-cyan-50 to-teal-100 dark:from-cyan-950/50 dark:to-teal-900/50',
      border: 'border-cyan-200/50 dark:border-cyan-800/50',
      icon: 'text-cyan-600 dark:text-cyan-400',
      accent: 'bg-cyan-500'
    }
  };

  const classes = colorClasses[color];
  
  return (
    <Card className={`${classes.bg} ${classes.border} backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:scale-105 group relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-full h-1 ${classes.accent}`}></div>
      <CardContent className="p-6 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              {value}
            </p>
            <div className="flex items-center space-x-2">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                trend === 'up' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                trend === 'down' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
              }`}>
                {trend === 'up' && '↗'}
                {trend === 'down' && '↘'}
                {trend === 'stable' && '→'}
                <span className="ml-1">{change}</span>
              </div>
            </div>
          </div>
          <div className={`p-3 rounded-full ${classes.bg} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`h-8 w-8 ${classes.icon}`} />
          </div>
        </div>
        <div className={`absolute bottom-0 right-0 w-20 h-20 ${classes.accent} opacity-5 rounded-full transform translate-x-8 translate-y-8`}></div>
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
  const [users, setUsers] = useState<User[]>([])
  const [sales, setSales] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allUsers, allDeals] = await Promise.all([
          apiService.getUsers(),
          apiService.getDeals()
        ])
        setUsers(allUsers as User[])
        setSales(allDeals as Deal[])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group users by team and calculate performance metrics
  const teamStats = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    const teams = users.reduce((acc: Record<string, { members: any[], sales: any[] }>, user: any) => {
      const teamName = user.team || 'OTHER'
      if (!acc[teamName]) {
        acc[teamName] = { members: [], sales: [] }
      }
      acc[teamName].members.push(user)
      
      // Get sales for this user - handle both sales array and empty/undefined cases
      if (sales && Array.isArray(sales)) {
        const userSales = sales.filter((sale: any) => {
          if (!sale) return false;
          const salesAgent = sale.sales_agent || sale.sales_agent_norm || '';
          const closingAgent = sale.closing_agent || sale.closing_agent_norm || '';
          const userName = user.name || '';
          
          return salesAgent.toLowerCase() === userName.toLowerCase() ||
                 closingAgent.toLowerCase() === userName.toLowerCase();
        });
        acc[teamName].sales.push(...userSales);
      }
      
      return acc
    }, {})

    return Object.entries(teams).map(([teamName, data]) => {
      const totalRevenue = data.sales.reduce((sum: number, sale: any) => {
        if (!sale) return sum;
        return sum + ((sale as any).amount_paid || (sale as any).amount || 0);
      }, 0);
      const avgDealSize = data.sales.length > 0 ? totalRevenue / data.sales.length : 0
      const performance = Math.min(100, Math.max(0, (avgDealSize / 1000) * 10)) // Simple performance calculation
      
      return {
        team: teamName,
        members: data.members.length,
        performance: Math.round(performance),
        totalRevenue,
        totalDeals: data.sales.length,
        users: data.members
      }
    })
  }, [users, sales])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="h-5 w-5 mr-2" />
            Team Management
          </CardTitle>
          <CardDescription>Manage team members, roles, and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamStats.map((team: any) => (
              <Card key={team.team} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{team.team}</h4>
                    <Badge variant="outline">{team.members} members</Badge>
                  </div>
                  <div className="space-y-2">
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
                    <div className="text-xs text-muted-foreground">
                      ${team.totalRevenue.toLocaleString()} • {team.totalDeals} deals
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      // Navigate to detailed team view
                      const event = new CustomEvent('setActiveTab', { detail: 'user-management' })
                      window.dispatchEvent(event)
                    }}
                  >
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

// Admin Page Components

// Type that accepts both camelCase and snake_case field names for deals
type DealData = Deal & {
  customer_name?: string;
  phone_number?: string;
  sales_agent?: string;
  amount_paid?: string | number;
  created_at?: string;
  updated_at?: string;
  sales_team?: string;
  closing_agent?: string;
  service_tier?: string;
  DealID?: string;
  SalesAgentID?: string;
  ClosingAgentID?: string;
};

function AdminDealsTablePage({ user, setActiveTab }: { user: any, setActiveTab: (tab: string) => void }) {
  const [deals, setDeals] = useState<DealData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper functions to get field values from either camelCase or snake_case
  const getCustomerName = (deal: DealData) => deal?.customer_name || deal?.customerName || '';
  const getPhoneNumber = (deal: DealData) => deal?.phone_number || deal?.phoneNumber || '';
  const getSalesAgent = (deal: DealData) => deal?.sales_agent || deal?.salesAgentName || '';
  const getAmountPaid = (deal: DealData) => deal?.amount_paid || deal?.amountPaid || 0;
  const getDealId = (deal: DealData) => deal?.DealID || deal?.dealId || deal?.id || '';


  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('🔄 AdminDealsTablePage: Fetching all deals...')
        
        // Use new API service to get all deals
        const response = await fetch('/api/deals?limit=1000&userRole=manager&userId=manager-001', {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        const allDeals = result.success ? result.deals || [] : [];
        
        setDeals(Array.isArray(allDeals) ? allDeals : []);
      } catch (error) {
        console.error('❌ AdminDealsTablePage: Error fetching deals:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch deals')
        setDeals([])
      } finally {
        setLoading(false)
      }
    }
    fetchDeals()
  }, [user.id, user.name, user.team])


  const exportToCSV = () => {
    if (!deals || deals.length === 0) return

    const headers = ['Deal ID', 'Customer Name', 'Email', 'Phone', 'Amount Paid', 'Sales Agent', 'Status']
    const csvData = (deals || []).map(deal => [
      getDealId(deal),
      getCustomerName(deal),
      deal?.email || '',
      getPhoneNumber(deal),
      getAmountPaid(deal),
      getSalesAgent(deal),
      deal?.status || ''
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `deals_export.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Deals Table</h1>
          <p className="text-muted-foreground">
            {deals.length} deals from all salesmen
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} disabled={deals.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Deals ({deals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-lg font-medium text-muted-foreground mb-2">No deals found</div>
              <div className="text-sm text-muted-foreground mb-4">
                <p className="mb-2">No deals are currently available in the system.</p>
                <p className="text-xs">
                  Deals will appear here once they are created through the system.
                </p>
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {(deals || []).slice(0, 20).map((deal, index) => (
                <div key={deal?.id || index} className="flex justify-between items-center p-3 border rounded hover:bg-muted/50 transition-colors">
                  <div>
                    <div className="font-medium">{getCustomerName(deal) || 'Unknown Customer'}</div>
                    <div className="text-sm text-muted-foreground">{getSalesAgent(deal) || 'Unknown Agent'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">
                      ${Number(getAmountPaid(deal)).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {deal?.status || 'Unknown'}
                    </div>
                  </div>
                </div>
              ))}
              {deals.length > 20 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Showing first 20 of {deals.length} deals
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Callback interface that accepts both camelCase and snake_case field names
interface Callback {
  id: string;
  customer_name?: string;
  customerName?: string;
  phone_number?: string;
  phoneNumber?: string;
  sales_agent?: string;
  salesAgent?: string;
  salesAgentName?: string; // Added missing property
  SalesAgentID?: string;
  salesAgentId?: string;
  first_call_date?: string;
  firstCallDate?: string;
  first_call_time?: string;
  firstCallTime?: string;
  scheduled_date?: string;
  scheduledDate?: string;
  callback_notes?: string;
  callbackNotes?: string;
  status?: string;
  priority?: string;
  sales_team?: string;
  salesTeam?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  email?: string; // Also adding email since it's used in the CSV export
}

type CallbackData = Callback & {
  created_by_id?: string;
  SalesAgentID?: string;
  sales_team?: string;
};

function AdminCallbacksTablePage({ user, setActiveTab }: { user: any, setActiveTab: (tab: string) => void }) {
  const [callbacks, setCallbacks] = useState<CallbackData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCallbacks = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('Fetching callbacks...')
        const response = await fetch('/api/callbacks?limit=1000&userRole=manager&userId=manager-001', {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        const allCallbacks = result.success ? result.callbacks || [] : [];
        console.log('Callbacks fetched:', allCallbacks)
        
        // Ensure we have a valid array
        if (Array.isArray(allCallbacks)) {
          console.log('✅ AdminCallbacksTablePage: Callbacks count:', allCallbacks.length)
          console.log('📋 AdminCallbacksTablePage: Sample callback data:', allCallbacks.slice(0, 2))
          setCallbacks(allCallbacks)
        } else {
          console.warn('⚠️ AdminCallbacksTablePage: Callbacks response is not an array:', allCallbacks)
          setCallbacks([])
        }
      } catch (error) {
        console.error('Error fetching callbacks:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
        setCallbacks([]) // Ensure callbacks is always an array
      } finally {
        setLoading(false)
      }
    }
    fetchCallbacks()
  }, [])

  // Helper functions to get field values from either camelCase or snake_case
  const getCustomerName = (callback: CallbackData) => callback?.customer_name || callback?.customerName || '';
  const getPhoneNumber = (callback: CallbackData) => callback?.phone_number || callback?.phoneNumber || '';
  const getSalesAgent = (callback: CallbackData) => callback?.sales_agent || callback?.salesAgent || callback?.salesAgentName || '';
  const getFirstCallDate = (callback: CallbackData) => callback?.first_call_date || callback?.firstCallDate || '';

  const exportToCSV = () => {
    if (!callbacks || callbacks.length === 0) return

    const headers = ['Customer Name', 'Phone', 'Email', 'Sales Agent', 'Status', 'Call Date']
    const csvData = (callbacks || []).map(callback => [
      getCustomerName(callback),
      getPhoneNumber(callback),
      callback?.email || '',
      getSalesAgent(callback),
      callback?.status || '',
      getFirstCallDate(callback)
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `callbacks_export.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Callbacks Table</h1>
          <p className="text-muted-foreground">
            {(callbacks || []).length} callbacks from all salesmen
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} disabled={(callbacks || []).length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.open('/admin/callbacks-table', '_blank')}>
            <Phone className="h-4 w-4 mr-2" />
            Full Table View
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Callbacks ({Math.min(10, (callbacks || []).length)})</CardTitle>
        </CardHeader>
        <CardContent>
          {(callbacks || []).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-lg font-medium text-muted-foreground mb-2">No callbacks found</div>
              <div className="text-sm text-muted-foreground">
                No callback data is available in the system yet.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {(callbacks || []).slice(0, 10).map((callback, index) => (
                <div key={callback?.id || index} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">{getCustomerName(callback) || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">{getSalesAgent(callback) || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium capitalize">{callback?.status || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">
                      {getFirstCallDate(callback) ? new Date(getFirstCallDate(callback)).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

