"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tv, User as UserIcon, Lock, ArrowLeft, Shield, Users, Headphones, Sun, Moon } from "lucide-react"
import { userService } from "@/lib/firebase-user-service"
import { User } from "@/lib/auth"

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>
  onBack: () => void
}

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [isDark, setIsDark] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<"manager" | "salesman" | "customer-service">("salesman")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showDemo, setShowDemo] = useState(false)
  const [firebaseUsers, setFirebaseUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Load Firebase users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await userService.getAllUsers()
        setFirebaseUsers(users)
      } catch (error) {
        console.error('Failed to load users:', error)
      } finally {
        setLoadingUsers(false)
      }
    }
    loadUsers()
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
                        <UserIcon className={`absolute left-3 top-3 h-4 w-4 transition-colors duration-300 ${
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
                        ? "Use your assigned sales credentials from Firebase"
                        : selectedRole === "manager"
                          ? "Manager: manager / manage@Vmax"
                          : "Use your assigned customer service credentials"}
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
                      Available Users (From Firebase)
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
                          <div className="text-slate-100 font-mono">manage@Vmax</div>
                          <div className="text-slate-100">System Manager</div>
                        </div>
                      </div>
                    </div>

                    {/* Firebase Users */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Firebase Users ({firebaseUsers.length} Total)
                      </h3>
                      {loadingUsers ? (
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center text-slate-400">
                          Loading users from Firebase...
                        </div>
                      ) : (
                        <div className="bg-slate-800/50 rounded-lg p-3 max-h-80 overflow-y-auto">
                          <div className="grid grid-cols-4 gap-4 text-sm mb-2 pb-2 border-b border-slate-700">
                            <div className="text-slate-400 font-semibold">Username</div>
                            <div className="text-slate-400 font-semibold">Name</div>
                            <div className="text-slate-400 font-semibold">Role</div>
                            <div className="text-slate-400 font-semibold">Team</div>
                          </div>
                          {firebaseUsers.map((user) => (
                            <div
                              key={user.id}
                              className="grid grid-cols-4 gap-4 text-sm py-1 hover:bg-slate-700/30 rounded cursor-pointer"
                              onClick={() => {
                                setUsername(user.username)
                                setSelectedRole(user.role)
                              }}
                            >
                              <div className="text-slate-100 font-mono">{user.username}</div>
                              <div className="text-slate-100 capitalize">{user.name}</div>
                              <div className="text-slate-300">{user.role === 'customer-service' ? 'Support' : 'Sales'}</div>
                              <div className="text-slate-300">{user.team}</div>
                            </div>
                          ))}
                        </div>
                      )}
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
                            setPassword("manage@Vmax")
                            setSelectedRole("manager")
                          }}
                          className="text-xs bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                        >
                          Manager
                        </Button>
                        {firebaseUsers.slice(0, 8).map((user) => (
                          <Button
                            key={user.id}
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setUsername(user.username)
                              setSelectedRole(user.role)
                            }}
                            className={`text-xs ${
                              user.role === 'salesman' 
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                                : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                            }`}
                          >
                            {user.name.split(" ")[0]}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Note: Passwords are managed by the system administrator. Contact your manager for credentials.
                      </p>
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