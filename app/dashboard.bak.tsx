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
  const [systemStatus, setSystemStatus] = useState(85)
  const [cpuUsage, setCpuUsage] = useState(42)
  const [memoryUsage, setMemoryUsage] = useState(68)
  const [networkStatus, setNetworkStatus] = useState(92)
  const [securityLevel, setSecurityLevel] = useState(94)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState("dashboard")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [salesTarget, setSalesTarget] = useState(75)
  const [dealsCompleted, setDealsCompleted] = useState(42)
  const [monthlyRevenue, setMonthlyRevenue] = useState(125000)
  const [activeDeals, setActiveDeals] = useState(18)
  const [salesmanDeals, setSalesmanDeals] = useState<any[]>([])
  const [salesmanMetrics, setSalesmanMetrics] = useState({
    revenue: 0,
    dealsCount: 0,
    targetProgress: 0,
    commission: 0,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
      setCpuUsage((prev) => Math.max(20, Math.min(90, prev + (Math.random() - 0.5) * 10)))
      setMemoryUsage((prev) => Math.max(30, Math.min(95, prev + (Math.random() - 0.5) * 8)))
      setNetworkStatus((prev) => Math.max(70, Math.min(100, prev + (Math.random() - 0.5) * 5)))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

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

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.1,
      })
    }

    function animate() {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle, index) => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(34, 211, 238, ${particle.opacity})`
        ctx.fill()

        // Draw connections
        particles.forEach((otherParticle, otherIndex) => {
          if (index !== otherIndex) {
            const dx = particle.x - otherParticle.x
            const dy = particle.y - otherParticle.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < 100) {
              ctx.beginPath()
              ctx.moveTo(particle.x, particle.y)
              ctx.lineTo(otherParticle.x, otherParticle.y)
              ctx.strokeStyle = `rgba(34, 211, 238, ${0.1 * (1 - distance / 100)})`
              ctx.lineWidth = 0.5
              ctx.stroke()
            }
          }
        })
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

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className={`min-h-screen dark bg-slate-950 transition-colors duration-300`}>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.8) 0%, rgba(2, 6, 23, 1) 100%)",
        }}
      />

      <div className="container mx-auto p-4 relative z-10">
        <header className="flex items-center justify-between py-4 border-b border-slate-700/50 mb-6">
          <div className="flex items-center space-x-2">
            <Tv className="h-8 w-8 text-cyan-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Vmax Sales
            </span>
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-1 bg-slate-800/50 rounded-full px-3 py-1.5 border border-slate-700/50 backdrop-blur-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search deals, customers..."
                className="bg-transparent border-none focus:outline-none text-sm w-40 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-100">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-cyan-500 rounded-full animate-pulse"></span>
              </Button>

              <div className="flex items-center space-x-2 text-sm text-slate-300">
                <User className="h-4 w-4" />
                <span>{user.name}</span>
                <span className="text-slate-500">({userRole})</span>
              </div>

              <Button variant="ghost" size="icon" onClick={onLogout} className="text-slate-400 hover:text-slate-100">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm h-full">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <NavItem
                    icon={Command}
                    label="Dashboard"
                    active={activeTab === "dashboard"}
                    onClick={() => setActiveTab("dashboard")}
                  />
                  <NavItem
                    icon={Target}
                    label="Sales Targets"
                    active={activeTab === "targets"}
                    onClick={() => setActiveTab("targets")}
                  />
                  <NavItem
                    icon={FileText}
                    label="Deals"
                    active={activeTab === "deals"}
                    onClick={() => setActiveTab("deals")}
                  />
                  {userRole === "manager" && (
                    <NavItem
                      icon={BarChart3}
                      label="Deals Analytics"
                      active={activeTab === "deals-analytics"}
                      onClick={() => setActiveTab("deals-analytics")}
                    />
                  )}
                  <NavItem
                    icon={BarChart3}
                    label="Analytics"
                    active={activeTab === "analytics"}
                    onClick={() => setActiveTab("analytics")}
                  />
                  <NavItem
                    icon={Database}
                    label="Data Center"
                    active={activeTab === "datacenter"}
                    onClick={() => setActiveTab("datacenter")}
                  />
                  <NavItem
                    icon={Bell}
                    label="Notifications"
                    active={activeTab === "notifications"}
                    onClick={() => setActiveTab("notifications")}
                  />
                  <NavItem
                    icon={Users}
                    label="Customers"
                    active={activeTab === "customers"}
                    onClick={() => setActiveTab("customers")}
                  />
                  <NavItem
                    icon={Settings}
                    label="Settings"
                    active={activeTab === "settings"}
                    onClick={() => setActiveTab("settings")}
                  />
                </nav>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 md:col-span-9 lg:col-span-10">
            {activeTab === "dashboard" && (
              <DashboardContent
                userRole={userRole}
                user={user}
              />
            )}
            {activeTab === "targets" && <SalesTargetsContent userRole={userRole} />}
            {activeTab === "deals" && <DealsContent userRole={userRole} user={user} />}
            {activeTab === "deals-analytics" && userRole === "manager" && <ManagerDealsDashboard />}
            {activeTab === "analytics" && <AnalyticsContent userRole={userRole} />}
            {activeTab === "datacenter" && <DataCenterContent userRole={userRole} />}
            {activeTab === "notifications" && <NotificationsPage userRole={userRole} />}
            {activeTab === "customers" && <CustomersContent userRole={userRole} />}
            {activeTab === "settings" && <SettingsContent userRole={userRole} />}
          </div>
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
}: { icon: LucideIcon; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`w-full justify-start ${active ? "bg-slate-800/70 text-cyan-400" : "text-slate-400 hover:text-slate-100"}`}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}

function BottomNavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: { icon: LucideIcon; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`flex flex-col items-center space-y-1 px-3 py-2 ${active ? "text-cyan-400" : "text-slate-400 hover:text-slate-100"}`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-xs">{label}</span>
    </Button>
  )
}

// Component for status items
function StatusItem({ label, value, color }: { label: string; value: number; color: string }) {
  const getColor = () => {
    switch (color) {
      case "cyan":
        return "from-cyan-500 to-blue-500"
      case "green":
        return "from-green-500 to-emerald-500"
      case "blue":
        return "from-blue-500 to-indigo-500"
      case "purple":
        return "from-purple-500 to-pink-500"
      default:
        return "from-cyan-500 to-blue-500"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-xs text-slate-400">{value}%</div>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${getColor()} rounded-full`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  )
}

function SalesMetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  detail,
}: {
  title: string
  value: string
  icon: LucideIcon
  trend: "up" | "down" | "stable"
  color: string
  detail: string
}) {
  const getColor = () => {
    switch (color) {
      case "cyan":
        return "from-cyan-500 to-blue-500 border-cyan-500/30"
      case "green":
        return "from-green-500 to-emerald-500 border-green-500/30"
      case "blue":
        return "from-blue-500 to-indigo-500 border-blue-500/30"
      case "purple":
        return "from-purple-500 to-pink-500 border-purple-500/30"
      default:
        return "from-cyan-500 to-blue-500 border-cyan-500/30"
    }
  }

  return (
    <Card className={`bg-gradient-to-br ${getColor()} p-0.5`}>
      <div className="bg-slate-900/90 rounded-lg p-4 h-full">
        <div className="flex items-center justify-between mb-2">
          <Icon className="h-5 w-5 text-slate-300" />
          <TrendingUp
            className={`h-3 w-3 ${trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-slate-400"}`}
          />
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-slate-100">{value}</div>
          <div className="text-sm text-slate-400">{title}</div>
          <div className="text-xs text-slate-500">{detail}</div>
        </div>
      </div>
    </Card>
  )
}

function TargetItem({ name, current, target }: { name: string; current: number; target: number }) {
  const percentage = Math.min((current / target) * 100, 100)
  const isRevenue = name.includes("Revenue")

  return (
    <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-200">{name}</div>
        <div className="text-xs text-slate-400">
          {isRevenue ? `$${(current / 1000).toFixed(0)}K / $${(target / 1000).toFixed(0)}K` : `${current} / ${target}`}
        </div>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-xs text-cyan-400 mt-1">{percentage.toFixed(1)}% complete</div>
    </div>
  )
}

function DealItem({ customer, value, status }: { customer: string; value: number; status: string }) {
  const getStatusColor = () => {
    switch (status) {
      case "closed":
        return "text-green-400 bg-green-500/20"
      case "negotiation":
        return "text-yellow-400 bg-yellow-500/20"
      case "proposal":
        return "text-blue-400 bg-blue-500/20"
      default:
        return "text-slate-400 bg-slate-500/20"
    }
  }

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
      <div className="flex items-center space-x-3">
        <div className="h-2 w-2 rounded-full bg-cyan-500"></div>
        <div>
          <div className="text-sm text-slate-200">{customer}</div>
          <div className="text-xs text-slate-500">${value.toLocaleString()}</div>
        </div>
      </div>
      <Badge className={`text-xs px-2 py-1 ${getStatusColor()}`}>{status}</Badge>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  detail,
}: {
  title: string
  value: number
  icon: LucideIcon
  trend: "up" | "down" | "stable"
  color: string
  detail: string
}) {
  const getColor = () => {
    switch (color) {
      case "cyan":
        return "from-cyan-500 to-blue-500 border-cyan-500/30"
      case "green":
        return "from-green-500 to-emerald-500 border-green-500/30"
      case "blue":
        return "from-blue-500 to-indigo-500 border-blue-500/30"
      case "purple":
        return "from-purple-500 to-pink-500 border-purple-500/30"
      default:
        return "from-cyan-500 to-blue-500 border-cyan-500/30"
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <BarChart3 className="h-3 w-3 text-green-400" />
      case "down":
        return <BarChart3 className="h-3 w-3 text-red-400 rotate-180" />
      default:
        return <LineChart className="h-3 w-3 text-slate-400" />
    }
  }

  return (
    <Card className={`bg-gradient-to-br ${getColor()} p-0.5`}>
      <div className="bg-slate-900/90 rounded-lg p-4 h-full">
        <div className="flex items-center justify-between mb-2">
          <Icon className="h-5 w-5 text-slate-300" />
          {getTrendIcon()}
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-slate-100">{value}%</div>
          <div className="text-sm text-slate-400">{title}</div>
          <div className="text-xs text-slate-500">{detail}</div>
        </div>
      </div>
    </Card>
  )
}

function PerformanceChart() {
  return (
    <div className="w-full h-full flex items-end justify-center space-x-1 p-4">
      {Array.from({ length: 50 }, (_, i) => (
        <div
          key={i}
          className="bg-gradient-to-t from-cyan-500 to-blue-500 rounded-sm opacity-70"
          style={{
            height: `${Math.random() * 80 + 20}%`,
            width: "2px",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  )
}

function ProcessItem({ name, cpu, memory, status }: { name: string; cpu: number; memory: number; status: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
      <div className="flex items-center space-x-3">
        <div className="h-2 w-2 rounded-full bg-green-500"></div>
        <div>
          <div className="text-sm text-slate-200">{name}</div>
          <div className="text-xs text-slate-500">{status}</div>
        </div>
      </div>
      <div className="flex items-center space-x-4 text-xs text-slate-400">
        <div>CPU: {cpu}%</div>
        <div>RAM: {memory}MB</div>
      </div>
    </div>
  )
}

function StorageItem({ name, used, total }: { name: string; used: number; total: number }) {
  const percentage = (used / total) * 100
  return (
    <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-200">{name}</div>
        <div className="text-xs text-slate-400">
          {used}GB / {total}GB
        </div>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}

function DiagnosticItem({
  name,
  value,
  status,
}: { name: string; value: string; status: "good" | "normal" | "warning" | "error" }) {
  const getStatusColor = () => {
    switch (status) {
      case "good":
        return "text-green-400"
      case "normal":
        return "text-cyan-400"
      case "warning":
        return "text-yellow-400"
      case "error":
        return "text-red-400"
      default:
        return "text-slate-400"
    }
  }

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
      <div className="text-sm text-slate-200">{name}</div>
      <div className={`text-sm font-mono ${getStatusColor()}`}>{value}</div>
    </div>
  )
}

function SecurityItem({ name, status, level }: { name: string; status: string; level: "low" | "medium" | "high" }) {
  const getLevelColor = () => {
    switch (level) {
      case "high":
        return "text-green-400"
      case "medium":
        return "text-yellow-400"
      case "low":
        return "text-red-400"
      default:
        return "text-slate-400"
    }
  }

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
      <div className="text-sm text-slate-200">{name}</div>
      <div className="flex items-center space-x-2">
        <div className="text-sm text-slate-400">{status}</div>
        <div className={`h-2 w-2 rounded-full ${getLevelColor().replace("text-", "bg-")}`}></div>
      </div>
    </div>
  )
}

// Action button component
function ActionButton({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Button
      variant="outline"
      className="h-auto py-3 px-3 border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 flex flex-col items-center justify-center space-y-1 w-full"
    >
      <Icon className="h-5 w-5 text-cyan-500" />
      <span className="text-xs">{label}</span>
    </Button>
  )
}

// Main dashboard content with sales data visualization
const DashboardContent = ({
  userRole,
  user,
}: { 
  userRole: string; 
  user: { name: string; username: string } 
}) => {
  // Get the user ID based on the role
  const getUserId = () => {
    // In a real app, you'd get this from your auth system
    if (userRole === 'manager') return 'Agent-001'; // Example manager ID
    if (userRole === 'salesman') return 'Agent-002'; // Example salesman ID
    return undefined; // For customer service, show all data
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">
        Welcome back, {user.name}!
      </h2>
      <p className="text-muted-foreground">
        Here's what's happening with your sales performance.
      </p>
      
      {/* Sales Dashboard Component */}
      <SalesAnalysisDashboard 
        userRole={userRole} 
        user={user}
      />
      
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
};

function SalesTargetsContent({ userRole }: { userRole: string }) {
  if (userRole === "manager") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Team Sales Targets
          </h2>
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
            <Target className="h-4 w-4 mr-2" />
            Set New Target
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { name: "Mohsen Sayed", current: 15200, target: 20000, id: "8001" },
            { name: "Ahmed Helmy", current: 12800, target: 18000, id: "8002" },
            { name: "Marawan Khaled", current: 9600, target: 15000, id: "8003" },
            { name: "Shiref Ashraf", current: 11400, target: 16000, id: "8004" },
            { name: "Ahmed Hikal", current: 8900, target: 14000, id: "8005" },
            { name: "Omar Ramadan", current: 13200, target: 19000, id: "8006" },
          ].map((salesman) => (
            <Card key={salesman.id} className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">{salesman.name}</h3>
                    <p className="text-sm text-slate-400">ID: {salesman.id}</p>
                  </div>
                  <Badge className="bg-cyan-500/20 text-cyan-400">
                    {Math.round((salesman.current / salesman.target) * 100)}%
                  </Badge>
                </div>
                <TargetItem name="Monthly Revenue" current={salesman.current} target={salesman.target} />
                <div className="mt-4 flex space-x-2">
                  <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                    Edit Target
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          My Sales Targets
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Current Targets</h3>
            <div className="space-y-4">
              <TargetItem name="Monthly Revenue" current={8200} target={12000} />
              <TargetItem name="Deals Closed" current={12} target={20} />
              <TargetItem name="New Customers" current={8} target={15} />
              <TargetItem name="Follow-ups" current={25} target={30} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Performance History</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-slate-200">Last Month</span>
                <span className="text-green-400 font-semibold">105% ✓</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-slate-200">2 Months Ago</span>
                <span className="text-yellow-400 font-semibold">92%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-slate-200">3 Months Ago</span>
                <span className="text-green-400 font-semibold">108% ✓</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DealsContent({ userRole, user }: { userRole: string; user: { name: string; username: string } }) {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await fetch(
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3%2C4%2C5%2C6%2C7-monthes_with_all_IDs-U2tDfI3EhWbqP1Znn3aTBVetS92sLM.csv",
        )
        const csvText = await response.text()
        const lines = csvText.split("\n")
        const headers = lines[0].split(",")

        const dealsData = lines
          .slice(1)
          .filter((line) => line.trim())
          .map((line, index) => {
            const values = line.split(",")
            return {
              id: values[headers.indexOf("DealID")] || `Deal-${index}`,
              customer: values[headers.indexOf("Customer_Name")] || "Unknown Customer",
              amount: Number.parseFloat(values[headers.indexOf("amount_paid")] || "0"),
              status: Math.random() > 0.7 ? "closed" : Math.random() > 0.5 ? "negotiation" : "proposal",
              agent: values[headers.indexOf("sales_agent")] || "Unknown Agent",
              phone: values[headers.indexOf("phone_number")] || "",
              country: values[headers.indexOf("country")] || "",
              product: values[headers.indexOf("product_type")] || "",
              tier: values[headers.indexOf("service_tier")] || "",
              signupDate: values[headers.indexOf("signup_date")] || "",
              endDate: values[headers.indexOf("end_date")] || "",
              duration: values[headers.indexOf("duration_months")] || "0",
            }
          })

        const filteredByRole =
          userRole === "salesman"
            ? dealsData.filter((deal) => deal.agent.toLowerCase().includes(user.name.toLowerCase()))
            : dealsData

        setDeals(filteredByRole)
      } catch (error) {
        console.error("Error fetching deals:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDeals()
  }, [userRole, user.name])

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || deal.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          {userRole === "manager" ? "All Deals" : "My Assigned Deals"}
        </h2>
        {(userRole === "manager" || userRole === "customer-service") && (
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
            <FileText className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">All Status</option>
          <option value="proposal">Proposal</option>
          <option value="negotiation">Negotiation</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredDeals.map((deal) => (
          <Card
            key={deal.id}
            className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-colors"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      deal.status === "closed"
                        ? "bg-green-500"
                        : deal.status === "negotiation"
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                    }`}
                  ></div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">{deal.customer}</h3>
                    <p className="text-sm text-slate-400">Deal ID: {deal.id}</p>
                    {userRole === "manager" && <p className="text-sm text-slate-500">Agent: {deal.agent}</p>}
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-slate-500">{deal.product}</span>
                      <span className="text-xs text-slate-500">{deal.tier}</span>
                      <span className="text-xs text-slate-500">{deal.country}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-100">${deal.amount.toLocaleString()}</div>
                    <Badge
                      className={`${
                        deal.status === "closed"
                          ? "bg-green-500/20 text-green-400"
                          : deal.status === "negotiation"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {deal.status}
                    </Badge>
                    <div className="text-xs text-slate-500 mt-1">{deal.duration} months</div>
                  </div>
                  <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-700 bg-transparent">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDeals.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No deals found</h3>
            <p className="text-slate-500">Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SettingsContent({ userRole }: { userRole: string }) {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    twoFactorAuth: false,
    theme: "dark",
    language: "en",
    timezone: "UTC+0",
    autoLogout: 30,
    dataRetention: 90,
  })

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    role: userRole,
  })

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleProfileChange = (key: string, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Profile Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => handleProfileChange("name", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleProfileChange("email", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleProfileChange("phone", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
          </CardContent>
        </Card>


      </div>

      {userRole === "manager" && (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">System Administration</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 h-20 flex flex-col">
                <Users className="h-6 w-6 mb-2" />
                User Management
              </Button>
              <Button className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 h-20 flex flex-col">
                <Database className="h-6 w-6 mb-2" />
                Database Backup
              </Button>
              <Button className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 h-20 flex flex-col">
                <Settings className="h-6 w-6 mb-2" />
                System Config
              </Button>
              <Button className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 h-20 flex flex-col">
                <BarChart3 className="h-6 w-6 mb-2" />
                Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
          Save Changes
        </Button>
      </div>
    </div>
  )
}

function AnalyticsContent({ userRole }: { userRole: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Analytics Dashboard
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard title="System Status" value={85} icon={Shield} trend="up" color="cyan" detail="Overall health" />
        <MetricCard title="CPU Usage" value={42} icon={Command} trend="down" color="green" detail="Current load" />
        <MetricCard
          title="Memory Usage"
          value={68}
          icon={Database}
          trend="stable"
          color="blue"
          detail="RAM utilization"
        />
      </div>

      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Performance Chart</h3>
          <PerformanceChart />
        </CardContent>
      </Card>
    </div>
  )
}

function DataCenterContent({ userRole }: { userRole: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Data Center Overview
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Server Status</h3>
            <div className="space-y-3">
              <StatusItem label="System Health" value={92} color="cyan" />
              <StatusItem label="Network Stability" value={98} color="green" />
              <StatusItem label="Security Level" value={95} color="blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Active Processes</h3>
            <div className="space-y-3">
              <ProcessItem name="Main App" cpu={12} memory={256} status="Running" />
              <ProcessItem name="Database" cpu={28} memory={512} status="Running" />
              <ProcessItem name="Cache Service" cpu={5} memory={128} status="Idle" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Storage Usage</h3>
            <div className="space-y-3">
              <StorageItem name="Main Drive" used={420} total={500} />
              <StorageItem name="Backup Drive" used={120} total={250} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">System Diagnostics</h3>
            <div className="space-y-3">
              <DiagnosticItem name="CPU Temp" value="52°C" status="good" />
              <DiagnosticItem name="Fan Speed" value="2800 RPM" status="normal" />
              <DiagnosticItem name="Voltage" value="12.1V" status="good" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Security Audit</h3>
            <div className="space-y-3">
              <SecurityItem name="Firewall" status="Active" level="high" />
              <SecurityItem name="Antivirus" status="Running" level="high" />
              <SecurityItem name="Access Control" status="Enabled" level="medium" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionButton icon={Download} label="Download Logs" />
        <ActionButton icon={Settings} label="Configure Server" />
        <ActionButton icon={Database} label="Backup Database" />
        <ActionButton icon={Trash2} label="Clear Cache" />
      </div>
    </div>
  )
}

function CustomersContent({ userRole }: { userRole: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Customer Management
      </h2>
      <p className="text-slate-400">Manage your customer base, view details, and track interactions.</p>

      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Customer List</h3>
          <p className="text-slate-500">This section is under development. Customer data will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
