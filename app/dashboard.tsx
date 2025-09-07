"use client"

import { useEffect, useState, useRef, useMemo } from "react"
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
  Sun,
  Moon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ManagerDealsDashboard from "@/components/manager-deals-dashboard"
import NotificationsPage from "@/components/notifications-page"
import SalesAnalysisDashboard from "@/components/sales-dashboard"
import MyDeals from "@/components/my-deals"
import { useSalesData } from "@/lib/salesData"

interface DashboardProps {
  userRole: "manager" | "salesman" | "customer-service"
  user: { name: string; username: string }
  onLogout: () => void
}

export default function Dashboard({ userRole, user, onLogout }: DashboardProps) {
  const [isDark, setIsDark] = useState(true)
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

      <div className="container mx-auto p-4 relative z-10">
        <header className={`flex items-center justify-between py-4 border-b mb-6 transition-colors duration-300 ${
          isDark ? 'border-slate-700/50' : 'border-blue-200/50'
        }`}>
          <div className="flex items-center space-x-2">
            <Tv className={`h-8 w-8 transition-colors duration-300 ${
              isDark ? 'text-cyan-500' : 'text-blue-600'
            }`} />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Vmax  Sales
            </span>
          </div>

          <div className="flex items-center space-x-6">
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
                placeholder="Search deals, customers..."
                className={`bg-transparent border-none focus:outline-none text-sm w-40 transition-colors duration-300 ${
                  isDark 
                    ? 'text-slate-100 placeholder:text-slate-500' 
                    : 'text-slate-800 placeholder:text-slate-400'
                }`}
              />
            </div>

            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme}
                className={`transition-colors duration-300 ${
                  isDark 
                    ? 'text-slate-400 hover:text-slate-100' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <Button variant="ghost" size="icon" className={`relative transition-colors duration-300 ${
                isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-800'
              }`}>
                <Bell className="h-5 w-5" />
                <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse transition-colors duration-300 ${
                  isDark ? 'bg-cyan-500' : 'bg-blue-500'
                }`}></span>
              </Button>

              <div className={`flex items-center space-x-2 text-sm transition-colors duration-300 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <User className="h-4 w-4" />
                <span>{user.name}</span>
                <span className={`transition-colors duration-300 ${
                  isDark ? 'text-slate-500' : 'text-slate-500'
                }`}>({userRole})</span>
              </div>

              <Button variant="ghost" size="icon" onClick={onLogout} className={`transition-colors duration-300 ${
                isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-800'
              }`}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <Card className={`backdrop-blur-sm h-full transition-all duration-300 ${
              isDark 
                ? 'bg-slate-900/50 border-slate-700/50' 
                : 'bg-white/80 border-blue-200/50 shadow-lg'
            }`}>
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
                  <NavItem
                    icon={FileText}
                    label="My Deals"
                    active={activeTab === "my-deals"}
                    onClick={() => setActiveTab("my-deals")}
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
            {activeTab === "deals" && <SalesAnalysisDashboard userRole={userRole} user={user} />}
            {activeTab === "my-deals" && <MyDeals />}
            {activeTab === "deals-analytics" && userRole === "manager" && <ManagerDealsDashboard />}
            {activeTab === "notifications" && <NotificationsPage userRole={userRole} />}
            {activeTab === "customers" && <CustomersContent userRole={userRole} user={user} />}
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
      className={`w-full justify-start transition-all duration-300 ${
        active 
          ? "bg-slate-800/70 text-cyan-400 dark:bg-slate-800/70 dark:text-cyan-400 bg-blue-100/70 text-blue-700" 
          : "text-slate-400 hover:text-slate-100 dark:text-slate-400 dark:hover:text-slate-100 text-slate-600 hover:text-slate-800"
      }`}
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
  userRole: "manager" | "salesman" | "customer-service"; 
  user: { name: string; username: string } 
}) => {
  // Use the real-time sales hook (CSV + SSE)
  const { sales, loading } = useSalesData('manager')
  // Sanitize rows (remove placeholders/invalid entries)
  const salesData = (sales || [])
    .filter((row: any) => row && row.customer_name && row.DealID && (typeof row.amount === 'number' ? !isNaN(row.amount) : !isNaN(parseFloat(String(row.amount)))))
    .map((row: any) => ({
      ...row,
      date: new Date(row.date),
      amount: typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount)) || 0,
      salesAgent: row.sales_agent_norm?.toLowerCase?.() || row.sales_agent?.toLowerCase?.() || '',
      closingAgent: row.closing_agent_norm?.toLowerCase?.() || row.closing_agent?.toLowerCase?.() || '',
    }))

  const analytics = useMemo(() => {
    if (!salesData.length) return null

    let filteredData = salesData
    if (userRole === "salesman" && user) {
      const agentName = user.name.toLowerCase()
      filteredData = salesData.filter(
        (deal) =>
          (deal.salesAgent?.toLowerCase() === agentName) || (deal.closingAgent?.toLowerCase() === agentName)
      )
    }

    const totalSales = filteredData.reduce((sum, deal) => sum + (deal.amount || 0), 0)
    const totalDeals = filteredData.length
    const averageDealSize = totalDeals > 0 ? totalSales / totalDeals : 0
    
    const salesByAgent: { [key: string]: { agent: string; sales: number; deals: number } } = {};
    salesData.forEach(deal => { // use all sales data for top agent, not filtered
      const agentName = deal.salesAgent || 'Unknown';
      if (!salesByAgent[agentName]) {
        salesByAgent[agentName] = { agent: agentName, sales: 0, deals: 0 };
      }
      salesByAgent[agentName].sales += deal.amount || 0;
      salesByAgent[agentName].deals += 1;
    });
    const sortedAgents = Object.values(salesByAgent).sort((a, b) => b.sales - a.sales);
    const topAgent = sortedAgents[0];

    return {
      totalSales,
      totalDeals,
      averageDealSize,
      topAgent,
    }
  }, [salesData, userRole, user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading dashboard data...</p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">No sales data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold tracking-tight text-slate-100">
        Welcome back, {user.name}!
      </h2>
      <p className="text-slate-400">
        Here's what's happening with your sales performance.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SalesMetricCard
          title={userRole === 'salesman' ? "Your Total Revenue" : "Total Revenue"}
          value={`$${analytics.totalSales.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
          icon={Database}
          trend="up"
          color="cyan"
          detail="Live data from sales records"
        />
        <SalesMetricCard
          title={userRole === 'salesman' ? "Your Total Deals" : "Total Deals"}
          value={analytics.totalDeals.toString()}
          icon={FileText}
          trend="up"
          color="green"
          detail="All completed deals"
        />
        <SalesMetricCard
          title="Average Deal Size"
          value={`$${analytics.averageDealSize.toFixed(0)}`}
          icon={PieChart}
          trend="stable"
          color="blue"
          detail="Across all deals"
        />
        <SalesMetricCard
          title="Top Agent"
          value={analytics.topAgent ? `$${analytics.topAgent.sales.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}` : 'N/A'}
          icon={Users}
          trend="up"
          color="purple"
          detail={analytics.topAgent ? analytics.topAgent.agent : 'No agents'}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <PerformanceChart />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            {/* This can be made dynamic later if needed */}
            <div className="space-y-4">
              <StatusItem label="API Health" value={99} color="cyan" />
              <StatusItem label="Database Load" value={45} color="green" />
              <StatusItem label="Network Latency" value={88} color="blue" />
              <StatusItem label="Security" value={95} color="purple" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface Deal {
  sales_agent_norm: string;
  amount: number;
  id: string;
}

function SalesTargetsContent({ userRole }: { userRole: string }) {
  const [salesData, setSalesData] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sales');
        const data = await response.json();
        setSalesData(data);
      } catch (error) {
        console.error('Error fetching sales data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const salesByAgent = useMemo(() => {
    const agentData: { [key: string]: { current: number; target: number; id: string } } = {};

    salesData.forEach(deal => {
      const agentName = deal.sales_agent_norm;
      if (!agentData[agentName]) {
        agentData[agentName] = { current: 0, target: 20000, id: deal.id }; // Default target
      }
      agentData[agentName].current += deal.amount;
    });

    return Object.entries(agentData).map(([name, data]) => ({ name, ...data }));
  }, [salesData]);

  if (loading) {
    return <div>Loading...</div>;
  }

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
          {salesByAgent.map((salesman) => (
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
                <div>
                  <div className="flex justify-between text-sm text-slate-400 mb-1">
                    <span>${salesman.current.toLocaleString()}</span>
                    <span>${salesman.target.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full"
                      style={{ width: `${(salesman.current / salesman.target) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return <div>Sales targets are only available for managers.</div>;
}

import { CustomerList } from "./components/customer-list"

function CustomersContent({ userRole, user }: { userRole: string; user: { name: string; username: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Customer Management
          </h2>
          <p className="text-slate-400">Manage your customer base, view details, and track interactions.</p>
        </div>
      </div>
      
      <CustomerList userRole={userRole} userId={user.username} />
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
