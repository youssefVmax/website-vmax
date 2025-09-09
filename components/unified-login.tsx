"use client"

import { useState } from "react"
import { Eye, EyeOff, Shield, Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authenticateUser } from "@/lib/auth"

interface UnifiedLoginProps {
  onLogin: (user: any) => void
}

export default function UnifiedLogin({ onLogin }: UnifiedLoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("manager")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const user = await authenticateUser(username, password)
      
      if (user) {
        // Verify role matches selected tab
        if (activeTab === "manager" && user.role !== "manager") {
          setError("Manager credentials required for manager login")
          return
        }
        if (activeTab === "salesman" && user.role === "manager") {
          setError("Please use the Manager tab to login as manager")
          return
        }
        
        onLogin(user)
      } else {
        setError("Invalid credentials. Please check your username and password.")
      }
    } catch (err) {
      setError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setUsername("")
    setPassword("")
    setError("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">IPTV Sales Portal</h1>
          <p className="text-gray-600 mt-2">
            Access your sales dashboard and manage accounts
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Login to Your Account
            </CardTitle>
            <CardDescription>
              Choose your role and enter your credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full grid-cols-2 gap-2 p-1 bg-muted rounded-md">
                <Button
                  type="button"
                  variant={activeTab === "manager" ? "default" : "ghost"}
                  className="flex items-center gap-2"
                  onClick={() => { setActiveTab("manager"); resetForm(); }}
                >
                  <Shield className="w-4 h-4" />
                  Manager
                </Button>
                <Button
                  type="button"
                  variant={activeTab === "salesman" ? "default" : "ghost"}
                  className="flex items-center gap-2"
                  onClick={() => { setActiveTab("salesman"); resetForm(); }}
                >
                  <User className="w-4 h-4" />
                  Salesman
                </Button>
              </div>
              
              {activeTab === "manager" && (
                <div className="space-y-4 mt-4">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">Manager Access</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Full system access including user management and analytics
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="manager-username">Username</Label>
                      <Input
                        id="manager-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter manager username"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manager-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="manager-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter manager password"
                          required
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
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

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In as Manager"}
                    </Button>
                  </form>

                  <div className="text-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <p>Default Manager Credentials:</p>
                    <p className="font-mono">Username: manager | Password: manage@Vmax</p>
                  </div>
                </div>
              )}

              {activeTab === "salesman" && (
                <div className="space-y-4 mt-4">
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800 font-medium">Salesman Access</p>
                    <p className="text-xs text-green-600 mt-1">
                      Access to deals, targets, and personal analytics
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="salesman-username">Username</Label>
                      <Input
                        id="salesman-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username (e.g., Agent-001)"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salesman-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="salesman-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
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

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In as Salesman"}
                    </Button>
                  </form>

                  <div className="text-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <p>Contact your manager if you don't have login credentials</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
