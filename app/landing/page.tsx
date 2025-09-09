"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, BarChart3, Users, Database, Bell, Shield, Zap, TrendingUp, Star, CheckCircle, Tv, Sun, Moon, Award, Globe, Clock, Target } from "lucide-react"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { useSettings } from "@/hooks/use-settings"

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { settings, updateSettings } = useSettings()
  
  // Set dark as default if no theme is set
  const isDark = settings.theme ? settings.theme === 'dark' : true

  // Enhanced particle animation for professional look
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
      pulse: number
    }> = []

    // Reduced particles for cleaner professional look
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.2 + 0.05,
        pulse: Math.random() * Math.PI * 2,
      })
    }

    function animate() {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.pulse += 0.02

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        const pulseOpacity = particle.opacity * (1 + Math.sin(particle.pulse) * 0.3)

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = isDark 
          ? `rgba(99, 102, 241, ${pulseOpacity})` 
          : `rgba(59, 130, 246, ${pulseOpacity})`
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
  }, [isDark])

  // Initialize theme as dark if not set
  useEffect(() => {
    if (!settings.theme) {
      updateSettings({ theme: 'dark' })
    }
  }, [settings.theme, updateSettings])

  return (
    <div className={`min-h-screen relative transition-colors duration-500 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-gray-950' 
        : 'bg-gradient-to-br from-gray-50 via-slate-50 to-white'
    }`}>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
      />
      
      {/* Professional Header */}
      <header className={`border-b backdrop-blur-xl sticky top-0 z-50 transition-all duration-500 ${
        isDark 
          ? 'border-slate-800/30 bg-slate-950/80' 
          : 'border-slate-200/30 bg-white/80'
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Tv className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Vmax Sales
                </h1>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Professional Sales Platform
                </p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className={`text-sm font-medium transition-colors hover:text-indigo-600 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>Features</a>
              <a href="#benefits" className={`text-sm font-medium transition-colors hover:text-indigo-600 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>Benefits</a>
              <a href="#pricing" className={`text-sm font-medium transition-colors hover:text-indigo-600 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>Pricing</a>
            </nav>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
                className={`rounded-full p-2 transition-all duration-300 ${
                  isDark 
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Link href="/auth/signin">
                <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Professional Hero Section */}
      <section className="py-24 px-6 relative z-10">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className={`mb-8 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors duration-300 ${
              isDark 
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                : 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30'
            }`}>
              <Award className="w-4 h-4 mr-2" />
              Enterprise-Grade Sales Management Platform
            </Badge>
            
            <h2 className={`text-5xl md:text-7xl font-bold mb-8 leading-tight transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Transform Your
              <br />
              <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                IPTV Business
              </span>
            </h2>
            
            <p className={`text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed font-light ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Comprehensive sales management solution with advanced analytics, 
              intelligent automation, and enterprise-grade security for IPTV professionals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link href="/auth/signin">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-10 py-4 text-lg font-semibold rounded-full shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300"
                >
                  Start Free Trial
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className={`px-10 py-4 text-lg font-semibold rounded-full transition-all duration-300 ${
                  isDark 
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500' 
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                }`}
              >
                Schedule Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  SOC 2 Compliant
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Global Infrastructure
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  99.99% Uptime SLA
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Features Grid */}
      <section id="features" className="py-24 px-6 relative z-10">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <Badge className={`mb-6 px-4 py-2 text-sm font-medium ${
              isDark 
                ? 'bg-slate-800/50 text-slate-300 border-slate-700' 
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              Platform Features
            </Badge>
            <h3 className={`text-4xl md:text-5xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Enterprise-Ready Capabilities
            </h3>
            <p className={`text-xl max-w-3xl mx-auto font-light ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Powerful features designed to scale with your business and drive measurable results
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BarChart3,
                title: "Advanced Analytics",
                description: "Real-time dashboards with predictive insights, custom KPIs, and automated reporting for data-driven decision making.",
                color: "from-blue-500 to-indigo-600"
              },
              {
                icon: Users,
                title: "Team Management",
                description: "Comprehensive user management with role-based permissions, performance tracking, and collaborative workflows.",
                color: "from-purple-500 to-violet-600"
              },
              {
                icon: Database,
                title: "Data Center",
                description: "Secure cloud storage with automated backups, version control, and seamless data distribution across teams.",
                color: "from-emerald-500 to-teal-600"
              },
              {
                icon: Bell,
                title: "Smart Notifications",
                description: "AI-powered alerts and notifications with customizable triggers, priority routing, and multi-channel delivery.",
                color: "from-orange-500 to-red-600"
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Bank-grade encryption, SSO integration, audit trails, and compliance with industry security standards.",
                color: "from-cyan-500 to-blue-600"
              },
              {
                icon: Zap,
                title: "Automation Engine",
                description: "Intelligent workflow automation with conditional logic, scheduled tasks, and seamless third-party integrations.",
                color: "from-yellow-500 to-orange-600"
              }
            ].map((feature, index) => (
              <Card key={index} className={`group hover:scale-105 transition-all duration-500 cursor-pointer ${
                isDark 
                  ? 'bg-slate-900/50 border-slate-800/50 hover:bg-slate-900/70 hover:border-slate-700' 
                  : 'bg-white/70 border-slate-200/50 hover:bg-white hover:border-slate-300 hover:shadow-xl'
              }`}>
                <CardContent className="p-8">
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h4 className={`text-xl font-bold mb-4 ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>{feature.title}</h4>
                  <p className={`leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Professional Stats Section */}
      <section className={`py-24 px-6 ${
        isDark 
          ? 'bg-slate-900/30 border-y border-slate-800/30' 
          : 'bg-slate-50/50 border-y border-slate-200/30'
      }`}>
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: "10K+", label: "Active Users", icon: Users, color: "text-blue-500" },
              { value: "$50M+", label: "Revenue Processed", icon: TrendingUp, color: "text-emerald-500" },
              { value: "99.99%", label: "Uptime SLA", icon: Shield, color: "text-purple-500" },
              { value: "150+", label: "Countries Served", icon: Globe, color: "text-orange-500" }
            ].map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="flex justify-center mb-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    isDark ? 'bg-slate-800/50' : 'bg-white shadow-lg'
                  } group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </div>
                <div className={`text-4xl font-bold mb-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>{stat.value}</div>
                <div className={`text-sm font-medium ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Professional Benefits Section */}
      <section id="benefits" className="py-24 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className={`mb-6 px-4 py-2 text-sm font-medium ${
                isDark 
                  ? 'bg-slate-800/50 text-slate-300 border-slate-700' 
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                Business Impact
              </Badge>
              <h3 className={`text-4xl font-bold mb-8 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Measurable Business Results
              </h3>
              
              <div className="space-y-6">
                {[
                  {
                    title: "Revenue Growth",
                    description: "Average 45% increase in sales revenue within the first quarter of implementation",
                    metric: "+45%"
                  },
                  {
                    title: "Operational Efficiency",
                    description: "Reduce administrative overhead by 60% through intelligent automation and streamlined workflows",
                    metric: "60% less time"
                  },
                  {
                    title: "Data-Driven Insights",
                    description: "Make informed decisions with real-time analytics and predictive modeling capabilities",
                    metric: "Real-time"
                  },
                  {
                    title: "Team Productivity",
                    description: "Enhanced collaboration tools and role-based access improve team performance by 35%",
                    metric: "+35%"
                  }
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4 group">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`text-lg font-bold ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>{benefit.title}</h4>
                        <Badge className="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 text-indigo-600 border-indigo-500/20">
                          {benefit.metric}
                        </Badge>
                      </div>
                      <p className={`${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className={`rounded-3xl p-8 border ${
                isDark 
                  ? 'bg-slate-900/50 border-slate-700/50' 
                  : 'bg-white border-slate-200 shadow-2xl'
              }`}>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { icon: Star, value: "4.9/5", label: "Customer Rating", color: "text-yellow-500" },
                    { icon: TrendingUp, value: "45%", label: "Revenue Increase", color: "text-emerald-500" },
                    { icon: Users, value: "10K+", label: "Active Users", color: "text-blue-500" },
                    { icon: Target, value: "99%", label: "Goal Achievement", color: "text-purple-500" }
                  ].map((metric, index) => (
                    <div key={index} className={`text-center p-4 rounded-2xl ${
                      isDark ? 'bg-slate-800/30' : 'bg-slate-50'
                    }`}>
                      <metric.icon className={`h-8 w-8 ${metric.color} mx-auto mb-3`} />
                      <div className={`text-2xl font-bold mb-1 ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}>{metric.value}</div>
                      <div className={`text-sm ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>{metric.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-full blur-xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <Card className={`max-w-5xl mx-auto overflow-hidden ${
            isDark 
              ? 'bg-gradient-to-r from-slate-900/80 to-slate-800/80 border-slate-700/50' 
              : 'bg-gradient-to-r from-white to-slate-50 border-slate-200/50 shadow-2xl'
          }`}>
            <CardContent className="p-16 text-center relative">
              <div className="relative z-10">
                <Badge className="mb-6 px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500/10 to-blue-500/10 text-indigo-600 border-indigo-500/20">
                  Limited Time Offer
                </Badge>
                <h3 className={`text-4xl md:text-5xl font-bold mb-6 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Ready to Scale Your Business?
                </h3>
                <p className={`text-xl mb-10 max-w-3xl mx-auto font-light ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Join thousands of IPTV professionals who have transformed their sales operations 
                  with our enterprise-grade platform. Start your 30-day free trial today.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <Link href="/auth/signin">
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-10 py-4 text-lg font-semibold rounded-full shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300"
                    >
                      Start Free Trial
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className={`px-10 py-4 text-lg font-semibold rounded-full ${
                      isDark 
                        ? 'border-slate-600 text-slate-300 hover:bg-slate-800' 
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Contact Sales
                  </Button>
                </div>
                
                <div className="flex justify-center items-center gap-6 text-sm opacity-75">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>30-day free trial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>24/7 support</span>
                  </div>
                </div>
              </div>
              
              {/* Background decoration */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-56 h-56 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full blur-3xl"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className={`border-t py-12 px-6 ${
        isDark 
          ? 'border-slate-800/30 bg-slate-950/50' 
          : 'border-slate-200/30 bg-slate-50/50'
      }`}>
        <div className="container mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Tv className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Vmax Sales
                </div>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Professional Sales Platform
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 mb-8 text-sm">
              <a href="#" className={`hover:text-indigo-600 transition-colors ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>Privacy Policy</a>
              <a href="#" className={`hover:text-indigo-600 transition-colors ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>Terms of Service</a>
              <a href="#" className={`hover:text-indigo-600 transition-colors ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>Support</a>
              <a href="#" className={`hover:text-indigo-600 transition-colors ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>Documentation</a>
            </div>
            
            <p className={`text-sm ${
              isDark ? 'text-slate-500' : 'text-slate-500'
            }`}>
              © 2025 Vmax Sales. All rights reserved. | Youssef Bassiony.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}