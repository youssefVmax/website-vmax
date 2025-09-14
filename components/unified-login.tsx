"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff, Shield, Users, Headphones, TrendingUp, DollarSign, Target, BarChart3, Tv, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { showToast, showSuccess } from "@/lib/sweetalert"
import { useAuth } from "@/hooks/useAuth"

interface UnifiedLoginProps {
  onLogin: () => void
  onBackToLanding?: () => void
}

export default function UnifiedLogin({ onLogin, onBackToLanding }: UnifiedLoginProps) {
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("manager")
  const [showPassword, setShowPassword] = useState(false)
  const [detectedRole, setDetectedRole] = useState<string | null>(null)
  const [roleMessage, setRoleMessage] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Animated background particles (matching dashboard and landing)
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

    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.2 + 0.05,
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
        ctx.fillStyle = `rgba(6, 182, 212, ${particle.opacity})`
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-detect role based on username
  const detectUserRole = async (username: string) => {
    if (!username) {
      setDetectedRole(null)
      setRoleMessage("")
      return
    }

    try {
      // Check if it's manager
      if (username === 'manager') {
        setDetectedRole('manager')
        setActiveTab('manager')
        setRoleMessage("Manager account detected")
        return
      }

      // Check Firebase users for salesmen and customer service
      const { userService } = await import('@/lib/firebase-user-service')
      const user = await userService.getUserByUsername(username)
      
      if (user) {
        setDetectedRole(user.role)
        if (user.role === 'salesman') {
          setActiveTab('agent')
          setRoleMessage(`Sales agent account detected: ${user.name}`)
        } else if (user.role === 'customer-service') {
          setActiveTab('support')
          setRoleMessage(`Customer service account detected: ${user.name}`)
        }
      } else {
        setDetectedRole(null)
        setRoleMessage("")
      }
    } catch (error) {
      setDetectedRole(null)
      setRoleMessage("")
    }
  }

  // Handle username change with role detection
  const handleUsernameChange = (value: string) => {
    setUsername(value)
    detectUserRole(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      console.log('UnifiedLogin: Attempting login with useAuth hook')
      const success = await login(username, password)
      console.log('UnifiedLogin: Login result:', success)
      
      if (success) {
        console.log('UnifiedLogin: Login successful, calling onLogin callback')
        // Show custom success notification
        await showSuccess(
          'Login Successful',
          'Welcome back! Redirecting you to your dashboard...'
        );
        
        // Add custom styles after the modal is shown
        setTimeout(() => {
          const popup = document.querySelector('.swal2-popup') as HTMLElement;
          if (popup) {
            popup.style.borderRadius = '0.75rem';
            popup.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.3)';
          }
        }, 10);
        onLogin()
      } else {
        console.log('UnifiedLogin: Login failed')
        setError("Invalid credentials")
        const failureReason = username === 'manager'
          ? 'Incorrect manager credentials. The manager account is not in Firebase; only the configured manager username/password are accepted.'
          : 'User not found or password mismatch in Firebase.'
        // SweetAlert toast (top-right) with reason
        showToast(`Login failed: ${failureReason}`, 'error')
      }
    } catch (err) {
      console.error('UnifiedLogin: Login error:', err)
      setError("Authentication failed")
      showToast('Authentication failed due to an unexpected error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.8) 0%, rgba(2, 6, 23, 1) 100%)",
        }}
      />
      
      {/* Back to Landing Button */}
      {onBackToLanding && (
        <Button
          onClick={onBackToLanding}
          variant="ghost"
          className="absolute top-6 left-6 text-slate-400 hover:text-white z-20"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Landing
        </Button>
      )}

      <div className="w-full max-w-md relative z-10">
        <Card className="backdrop-blur-sm bg-slate-900/50 border-slate-700/50 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full w-fit">
              <Tv className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Vmax Sales
            </CardTitle>
            <CardDescription className="text-slate-300">
              Sign in to access your dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-slate-600/50">
                <TabsTrigger 
                  value="manager" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white text-slate-300"
                  disabled={!!detectedRole && detectedRole !== 'manager'}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Manager
                </TabsTrigger>
                <TabsTrigger 
                  value="agent" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white text-slate-300"
                  disabled={!!detectedRole && detectedRole !== 'salesman'}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Agent
                </TabsTrigger>
                <TabsTrigger 
                  value="support" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white text-slate-300"
                  disabled={!!detectedRole && detectedRole !== 'customer-service'}
                >
                  <Headphones className="h-4 w-4 mr-2" />
                  Support
                </TabsTrigger>
              </TabsList>


              <TabsContent value="manager">
                <div className="space-y-4 mt-4">
                  <div className="bg-cyan-500/20 p-3 rounded-lg border border-cyan-400/30 backdrop-blur-sm">
                    <p className="text-sm text-cyan-200 font-medium">Manager Access</p>
                    <p className="text-xs text-cyan-300 mt-1">
                      Full dashboard access, team management, and analytics
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-slate-200">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-200">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 pr-10 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                          placeholder="Enter your password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-cyan-400"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="agent">
                <div className="space-y-4 mt-4">
                  <div className="bg-green-500/20 p-3 rounded-lg border border-green-400/30 backdrop-blur-sm">
                    <p className="text-sm text-green-200 font-medium">Sales Agent Access</p>
                    <p className="text-xs text-green-300 mt-1">
                      Access to deals, targets, and personal analytics
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="agent-username" className="text-slate-200">Username</Label>
                      <Input
                        id="agent-username"
                        type="text"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-green-500/50 focus:ring-green-500/20"
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agent-password" className="text-slate-200">Password</Label>
                      <div className="relative">
                        <Input
                          id="agent-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 pr-10 focus:border-green-500/50 focus:ring-green-500/20"
                          placeholder="Enter your password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-green-400"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="support">
                <div className="space-y-4 mt-4">
                  <div className="bg-purple-500/20 p-3 rounded-lg border border-purple-400/30 backdrop-blur-sm">
                    <p className="text-sm text-purple-200 font-medium">Customer Service Access</p>
                    <p className="text-xs text-purple-300 mt-1">
                      Customer support tools and order management
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="support-username" className="text-slate-200">Username</Label>
                      <Input
                        id="support-username"
                        type="text"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-purple-500/50 focus:ring-purple-500/20"
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="support-password" className="text-slate-200">Password</Label>
                      <div className="relative">
                        <Input
                          id="support-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 pr-10 focus:border-purple-500/50 focus:ring-purple-500/20"
                          placeholder="Enter your password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-purple-400"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>

            {/* Features showcase */}
            <div className="pt-4 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 text-center mb-3">Platform Features</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <TrendingUp className="h-3 w-3 text-cyan-400" />
                  <span>Analytics</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <DollarSign className="h-3 w-3 text-green-400" />
                  <span>Sales Tracking</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <Target className="h-3 w-3 text-purple-400" />
                  <span>Target Management</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <BarChart3 className="h-3 w-3 text-orange-400" />
                  <span>Reporting</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
