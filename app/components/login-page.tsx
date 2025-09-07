"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tv, User, Lock, ArrowLeft, Shield, Users, Headphones, Sun, Moon } from "lucide-react"

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>
  onBack: () => void
}

// Updated user lists with IDs that match the CSV data
const SALES_USERS = [
  { id: 1, username: "Agent-001", password: "2752004", name: "ahmed atef" },
  { id: 2, username: "Agent-002", password: "159753", name: "ali team" },
  { id: 3, username: "Agent-003", password: "13579", name: "sherif ashraf" },
  { id: 4, username: "Agent-004", password: "2520", name: "basmala" },
  { id: 5, username: "Agent-005", password: "2316", name: "marwan khaled" },
  { id: 6, username: "Agent-006", password: "777", name: "mohamed hossam" },
  { id: 7, username: "Agent-007", password: "392000", name: "ahmed heikal" },
  { id: 8, username: "Agent-008", password: "35422964", name: "mohsen sayed" },
  { id: 9, username: "Agent-009", password: "9528", name: "rodaina" },
  { id: 10, username: "Agent-010", password: "mn15", name: "omer ramadan" },
  { id: 11, username: "Agent-011", password: "292005bh", name: "ahmed helmy" },
  { id: 12, username: "Agent-012", password: "Manara1234", name: "mina nasr" },
  { id: 13, username: "Agent-013", password: "20062001", name: "saif team" },
  { id: 14, username: "Agent-014", password: "ko021", name: "khaled tarek" },
  { id: 15, username: "Agent-015", password: "2134", name: "mostafa shafey" },
  { id: 16, username: "Agent-016", password: "ro1234", name: "kerolos montaser" },
  { id: 17, username: "Agent-017", password: "support123", name: "heba ali" },
  { id: 18, username: "Agent-018", password: "support123", name: "beshoy hany" },
  { id: 19, username: "Agent-019", password: "support123", name: "hussin tamer" },
  { id: 20, username: "Agent-020", password: "support123", name: "abdallah" },
  { id: 21, username: "Agent-021", password: "support123", name: "sayed sherif" },
  { id: 22, username: "Agent-022", password: "support123", name: "mohamed omar" },
  { id: 23, username: "Agent-023", password: "support123", name: "ali ashraf" },
  { id: 24, username: "Agent-024", password: "support123", name: "saif mohamed" },
  { id: 25, username: "Agent-025", password: "support123", name: "alaa atef" }
]

const MANAGER_USERS = [{ username: "manager", password: "admin123", name: "System Manager" }]

const SUPPORT_USERS = [
  { username: "Agent-001", password: "support123", name: "ahmed atef" },
  { username: "Agent-003", password: "support123", name: "sherif ashraf" },
  { username: "Agent-004", password: "support123", name: "basmala" },
  { username: "Agent-005", password: "support123", name: "marwan khaled" },
  { username: "Agent-008", password: "support123", name: "mohsen sayed" },
  { username: "Agent-009", password: "support123", name: "rodaina" },
  { username: "Agent-010", password: "support123", name: "omer ramadan" },
  { username: "Agent-011", password: "support123", name: "ahmed helmy" },
  { username: "Agent-012", password: "support123", name: "mina nasr" },
  { username: "Agent-013", password: "support123", name: "saif team" },
  { username: "Agent-014", password: "support123", name: "khaled tarek" },
  { username: "Agent-015", password: "support123", name: "mostafa shafey" },
  { username: "Agent-016", password: "support123", name: "kerolos montaser" },
  { username: "Agent-017", password: "support123", name: "heba ali" },
  { username: "Agent-018", password: "support123", name: "beshoy hany" },
  { username: "Agent-019", password: "support123", name: "hussin tamer" },
  { username: "Agent-020", password: "support123", name: "abdallah" },
  { username: "Agent-021", password: "support123", name: "sayed sherif" },
  { username: "Agent-022", password: "support123", name: "mohamed omar" },
  { username: "Agent-023", password: "support123", name: "ali ashraf" },
  { username: "Agent-024", password: "support123", name: "saif mohamed" },
  { username: "Agent-025", password: "support123", name: "alaa atef" }
]

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [isDark, setIsDark] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<"manager" | "salesman" | "customer-service">("salesman")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showDemo, setShowDemo] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Delegate authentication to parent hook
    const ok = await onLogin(username, password)
    if (!ok) {
      setError("Invalid username or password. Please check your credentials.")
    }
    setIsLoading(false)
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

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <Button
              variant="ghost"
              onClick={onBack}
              className={`absolute top-4 left-4 transition-colors duration-300 ${
                isDark 
                  ? 'text-slate-400 hover:text-slate-100' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className={`absolute top-4 right-4 transition-colors duration-300 ${
                isDark 
                  ? 'text-slate-400 hover:text-slate-100' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Tv className={`h-8 w-8 transition-colors duration-300 ${
                isDark ? 'text-cyan-500' : 'text-blue-600'
              }`} />
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Vmax sales
              </span>
            </div>
            <h1 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}>Access Management System</h1>
            <p className={`transition-colors duration-300 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>Sign in to your account</p>
          </div>

          <div className="text-center mb-6">
            <Button
              variant="outline"
              onClick={() => setShowDemo(!showDemo)}
              className={`transition-all duration-300 ${
                isDark 
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 text-purple-400 hover:bg-purple-500/30' 
                  : 'bg-gradient-to-r from-purple-100/80 to-pink-100/80 border-purple-300/50 text-purple-700 hover:bg-purple-200/50'
              }`}
            >
              {showDemo ? "Hide Demo Credentials" : "Show Demo Credentials"}
            </Button>
          </div>

          <div className="flex gap-6 items-start">
            {/* Login Form */}
            <div className="flex-1 max-w-md mx-auto">
              {/* Role Selection */}
              <div className="mb-6">
                <Label className={`text-sm mb-3 block transition-colors duration-300 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>Select Your Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  <RoleButton
                    icon={Shield}
                    label="Manager"
                    role="manager"
                    selected={selectedRole === "manager"}
                    onClick={() => setSelectedRole("manager")}
                    isDark={isDark}
                  />
                  <RoleButton
                    icon={Users}
                    label="Salesman"
                    role="salesman"
                    selected={selectedRole === "salesman"}
                    onClick={() => setSelectedRole("salesman")}
                    isDark={isDark}
                  />
                  <RoleButton
                    icon={Headphones}
                    label="Support"
                    role="customer-service"
                    selected={selectedRole === "customer-service"}
                    onClick={() => setSelectedRole("customer-service")}
                    isDark={isDark}
                  />
                </div>
              </div>

              <Card className={`backdrop-blur-sm transition-all duration-300 ${
                isDark 
                  ? 'bg-slate-900/50 border-slate-700/50' 
                  : 'bg-white/80 border-blue-200/50 shadow-lg'
              }`}>
                <CardHeader>
                  <CardTitle className={`text-center transition-colors duration-300 ${
                    isDark ? 'text-slate-100' : 'text-slate-800'
                  }`}>
                    {selectedRole === "manager"
                      ? "Manager Login"
                      : selectedRole === "salesman"
                        ? "Salesman Login"
                        : "Customer Service Login"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="username" className={`transition-colors duration-300 ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Username
                      </Label>
                      <div className="relative">
                        <User className={`absolute left-3 top-3 h-4 w-4 transition-colors duration-300 ${
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        }`} />
                        <Input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={`pl-10 transition-all duration-300 ${
                            isDark 
                              ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                              : 'bg-white/70 border-blue-200 text-slate-800'
                          }`}
                          placeholder="Enter your username"
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password" className={`transition-colors duration-300 ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className={`absolute left-3 top-3 h-4 w-4 transition-colors duration-300 ${
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        }`} />
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`pl-10 transition-all duration-300 ${
                            isDark 
                              ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                              : 'bg-white/70 border-blue-200 text-slate-800'
                          }`}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className={`text-sm text-center rounded p-2 transition-all duration-300 ${
                        isDark 
                          ? 'text-red-400 bg-red-500/10 border border-red-500/20' 
                          : 'text-red-600 bg-red-50 border border-red-200'
                      }`}>
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className={`w-full transition-all duration-300 ${
                        isDark 
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600' 
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg'
                      }`}
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>

                  <div className="mt-4 text-center">
                    <p className={`text-xs transition-colors duration-300 ${
                      isDark ? 'text-slate-500' : 'text-slate-500'
                    }`}>
                      {selectedRole === "salesman"
                        ? "Use your assigned sales credentials (Agent-001 to Agent-025)"
                        : selectedRole === "manager"
                          ? "Manager: manager / admin123"
                          : "Support: Agent ID / support123"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {showDemo && (
              <div className="flex-1 max-w-2xl">
                <Card className={`backdrop-blur-sm transition-all duration-300 ${
                  isDark 
                    ? 'bg-slate-900/50 border-slate-700/50' 
                    : 'bg-white/80 border-blue-200/50 shadow-lg'
                }`}>
                  <CardHeader>
                    <CardTitle className={`text-center flex items-center justify-center gap-2 transition-colors duration-300 ${
                      isDark ? 'text-slate-100' : 'text-slate-800'
                    }`}>
                      <Shield className={`h-5 w-5 transition-colors duration-300 ${
                        isDark ? 'text-cyan-500' : 'text-blue-600'
                      }`} />
                      Demo Credentials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Manager Credentials */}
                    <div>
                      <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Manager Access
                      </h3>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-slate-400">Username</div>
                          <div className="text-slate-400">Password</div>
                          <div className="text-slate-400">Name</div>
                          <div className="text-slate-100 font-mono">manager</div>
                          <div className="text-slate-100 font-mono">admin123</div>
                          <div className="text-slate-100">System Manager</div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Service Credentials */}
                    <div>
                      <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <Headphones className="h-4 w-4" />
                        Customer Service Access
                      </h3>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-slate-400">Username</div>
                          <div className="text-slate-400">Password</div>
                          <div className="text-slate-400">Name</div>
                          <div className="text-slate-100 font-mono">Agent-001</div>
                          <div className="text-slate-100 font-mono">support123</div>
                          <div className="text-slate-100">ahmed atef</div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Use any Agent ID from the list below with password "support123"
                        </p>
                      </div>
                    </div>

                    {/* Sales Team Credentials */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Sales Team Access ({SALES_USERS.length} Members)
                      </h3>
                      <div className="bg-slate-800/50 rounded-lg p-3 max-h-80 overflow-y-auto">
                        <div className="grid grid-cols-4 gap-4 text-sm mb-2 pb-2 border-b border-slate-700">
                          <div className="text-slate-400 font-semibold">ID</div>
                          <div className="text-slate-400 font-semibold">Username</div>
                          <div className="text-slate-400 font-semibold">Password</div>
                          <div className="text-slate-400 font-semibold">Name</div>
                        </div>
                        {SALES_USERS.map((user) => (
                          <div
                            key={user.id}
                            className="grid grid-cols-4 gap-4 text-sm py-1 hover:bg-slate-700/30 rounded"
                          >
                            <div className="text-slate-300">{user.id}</div>
                            <div className="text-slate-100 font-mono">{user.username}</div>
                            <div className="text-slate-100 font-mono">{user.password}</div>
                            <div className="text-slate-100 capitalize">{user.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Login Buttons */}
                    <div className="pt-4 border-t border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Quick Login (Click to auto-fill)</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setUsername("manager")
                            setPassword("admin123")
                            setSelectedRole("manager")
                          }}
                          className="text-xs bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                        >
                          Manager
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setUsername("Agent-001")
                            setPassword("support123")
                            setSelectedRole("customer-service")
                          }}
                          className="text-xs bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                        >
                          Support
                        </Button>
                        {SALES_USERS.slice(0, 6).map((user) => (
                          <Button
                            key={user.id}
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setUsername(user.username)
                              setPassword(user.password)
                              setSelectedRole("salesman")
                            }}
                            className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                          >
                            {user.name.split(" ")[0]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RoleButton({
  icon: Icon,
  label,
  role,
  selected,
  onClick,
  isDark,
}: {
  icon: any
  label: string
  role: string
  selected: boolean
  onClick: () => void
  isDark: boolean
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={`h-16 flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${
        selected
          ? isDark 
            ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/50 text-cyan-400"
            : "bg-gradient-to-br from-blue-100/80 to-cyan-100/80 border-blue-400/50 text-blue-700"
          : isDark
            ? "border-slate-700 bg-slate-800/30 text-slate-400 hover:bg-slate-700/50"
            : "border-blue-200 bg-white/50 text-slate-600 hover:bg-blue-50"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </Button>
  )
}