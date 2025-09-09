"use client"

import React, { useState } from 'react'
import { Eye, EyeOff, Shield, Users, Headphones, TrendingUp, DollarSign, Target, BarChart3, Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authenticateUser } from "@/lib/auth"

interface UnifiedLoginProps {
  onLogin: (user: any) => void
}

export default function UnifiedLogin({ onLogin }: UnifiedLoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("manager")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const user = await authenticateUser(username, password)
      if (user) {
        onLogin(user)
      } else {
        setError("Invalid credentials")
      }
    } catch (err) {
      setError("Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="backdrop-blur-sm bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-fit">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              IPTV Sales Dashboard
            </CardTitle>
            <CardDescription className="text-slate-300">
              Sign in to access your dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/10 border-white/20">
                <TabsTrigger 
                  value="manager" 
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-slate-300"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Manager
                </TabsTrigger>
                <TabsTrigger 
                  value="salesman"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white text-slate-300"
                >
                  <User className="w-4 h-4 mr-1" />
                  Salesman
                </TabsTrigger>
                <TabsTrigger 
                  value="customer-service"
                  className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-slate-300"
                >
                  <Headphones className="w-4 h-4 mr-1" />
                  Support
                </TabsTrigger>
              </TabsList>

              {activeTab === "manager" && (
                <div className="space-y-4 mt-4">
                  <div className="bg-blue-500/20 p-3 rounded-lg border border-blue-400/30">
                    <p className="text-sm text-blue-200 font-medium">Manager Access</p>
                    <p className="text-xs text-blue-300 mt-1">
                      Full dashboard access, team management, and analytics
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="manager-username" className="text-slate-200">Username</Label>
                      <Input
                        id="manager-username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="manager-password" className="text-slate-200">Password</Label>
                      <div className="relative">
                        <Input
                          id="manager-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In as Manager"}
                    </Button>
                  </form>

                </div>
              )}

              {activeTab === "salesman" && (
                <div className="space-y-4 mt-4">
                  <div className="bg-green-500/20 p-3 rounded-lg border border-green-400/30">
                    <p className="text-sm text-green-200 font-medium">Salesman Access</p>
                    <p className="text-xs text-green-300 mt-1">
                      Access to deals, targets, and personal analytics
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="salesman-username" className="text-slate-200">Username</Label>
                      <Input
                        id="salesman-username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-green-400"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="salesman-password" className="text-slate-200">Password</Label>
                      <div className="relative">
                        <Input
                          id="salesman-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-green-400 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full bg-green-500 hover:bg-green-600" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In as Salesman"}
                    </Button>
                  </form>
                </div>
              )}

              {activeTab === "customer-service" && (
                <div className="space-y-4 mt-4">
                  <div className="bg-purple-500/20 p-3 rounded-lg border border-purple-400/30">
                    <p className="text-sm text-purple-200 font-medium">Customer Service Access</p>
                    <p className="text-xs text-purple-300 mt-1">
                      Customer support tools and order management
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cs-username" className="text-slate-200">Username</Label>
                      <Input
                        id="cs-username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cs-password" className="text-slate-200">Password</Label>
                      <div className="relative">
                        <Input
                          id="cs-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full bg-purple-500 hover:bg-purple-600" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In as Support"}
                    </Button>
                  </form>
                </div>
              )}
            </Tabs>

            {/* Features showcase */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-slate-400 text-center mb-3">Platform Features</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <TrendingUp className="h-3 w-3 text-blue-400" />
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
