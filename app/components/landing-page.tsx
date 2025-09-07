"use client"

import { useEffect, useRef } from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tv, Users, BarChart3, Shield, Zap, Globe, Target, TrendingUp, Database, ArrowRight, Sun, Moon } from "lucide-react"

interface LandingPageProps {
  onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isDark, setIsDark] = useState(true)
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

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tv className={`h-8 w-8 ${isDark ? 'text-cyan-500' : 'text-blue-600'}`} />
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Vmax Sales
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className={`transition-all duration-300 ${
                  isDark 
                    ? 'border-slate-700 bg-slate-800/30 text-slate-400 hover:bg-slate-700/50 hover:text-slate-100' 
                    : 'border-blue-200 bg-white/50 text-blue-600 hover:bg-blue-50 hover:text-blue-700 shadow-sm'
                }`}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                onClick={onGetStarted}
                className={`transition-all duration-300 ${
                  isDark 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600' 
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg'
                }`}
              >
                Access System
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <Badge className={`mb-6 transition-all duration-300 ${
              isDark 
                ? 'bg-slate-800/50 text-cyan-400 border-cyan-500/50' 
                : 'bg-blue-100/80 text-blue-700 border-blue-300/50'
            }`}>
              <Zap className="h-3 w-3 mr-1" />
              Advanced Sales Management Platform
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Vmax  Sales
              <br />
              Management System
            </h1>

            <p className={`text-xl mb-8 max-w-2xl mx-auto leading-relaxed transition-colors duration-300 ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Streamline your service sales with our comprehensive management platform. Track deals, manage
              targets, and optimize performance with real-time analytics.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                onClick={onGetStarted}
                className={`text-lg px-8 py-3 transition-all duration-300 ${
                  isDark 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600' 
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg'
                }`}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={`text-lg px-8 py-3 transition-all duration-300 ${
                  isDark 
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800/50 bg-transparent' 
                    : 'border-blue-200 text-blue-600 hover:bg-blue-50 bg-white/50 shadow-sm'
                }`}
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 transition-colors duration-300 ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}>Powerful Features for Every Role</h2>
            <p className={`text-lg max-w-2xl mx-auto transition-colors duration-300 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Designed for Managers, Salesmen, and Customer Service teams to work together seamlessly
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Users}
              title="Role-Based Access"
              description="Secure authentication with customized dashboards for Managers, Salesmen, and Customer Service teams."
              color="from-cyan-500 to-blue-500"
              isDark={isDark}
            />

            <FeatureCard
              icon={Target}
              title="Sales Target Tracking"
              description="Set and monitor sales targets with real-time progress tracking and performance analytics."
              color="from-blue-500 to-indigo-500"
              isDark={isDark}
            />

            <FeatureCard
              icon={BarChart3}
              title="Advanced Analytics"
              description="Comprehensive reporting with filtering by date, customer, and performance metrics."
              color="from-indigo-500 to-purple-500"
              isDark={isDark}
            />

            <FeatureCard
              icon={Database}
              title="Data Management"
              description="Efficient data assignment, Excel imports, and bulk number management for streamlined operations."
              color="from-purple-500 to-pink-500"
              isDark={isDark}
            />

            <FeatureCard
              icon={TrendingUp}
              title="Deal Management"
              description="Track new and existing deals with status updates and customer interaction history."
              color="from-pink-500 to-red-500"
              isDark={isDark}
            />

            <FeatureCard
              icon={Shield}
              title="Secure & Reliable"
              description="Enterprise-grade security with real-time notifications and system monitoring."
              color="from-red-500 to-orange-500"
              isDark={isDark}
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className={`backdrop-blur-sm overflow-hidden transition-all duration-300 ${
            isDark 
              ? 'bg-slate-900/50 border-slate-700/50' 
              : 'bg-white/80 border-blue-200/50 shadow-xl'
          }`}>
            <CardContent className="p-12 text-center">
              <Globe className={`h-16 w-16 mx-auto mb-6 transition-colors duration-300 ${
                isDark ? 'text-cyan-500' : 'text-blue-600'
              }`} />
              <h3 className={`text-3xl font-bold mb-4 transition-colors duration-300 ${
                isDark ? 'text-slate-100' : 'text-slate-800'
              }`}>Ready to Transform Your Sales?</h3>
              <p className={`text-lg mb-8 max-w-2xl mx-auto transition-colors duration-300 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Join the future of service management with our comprehensive platform designed for modern sales
                teams.
              </p>
              <Button
                size="lg"
                onClick={onGetStarted}
                className={`text-lg px-12 py-4 transition-all duration-300 ${
                  isDark 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600' 
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg'
                }`}
              >
                Access Management System
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className={`container mx-auto px-4 py-8 border-t transition-colors duration-300 ${
          isDark ? 'border-slate-700/50' : 'border-blue-200/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tv className={`h-6 w-6 transition-colors duration-300 ${
                isDark ? 'text-cyan-500' : 'text-blue-600'
              }`} />
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Vmax 
              </span>
            </div>
            <p className={`text-sm transition-colors duration-300 ${
              isDark ? 'text-slate-500' : 'text-slate-500'
            }`}>© 2025 Vmax Sales - Youssef Bassiony</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  isDark,
}: {
  icon: any
  title: string
  description: string
  color: string
  isDark: boolean
}) {
  return (
    <Card className={`bg-gradient-to-br ${color} p-0.5 group hover:scale-105 transition-all duration-300`}>
      <div className={`rounded-lg p-6 h-full transition-colors duration-300 ${
        isDark ? 'bg-slate-900/90' : 'bg-white/95'
      }`}>
        <Icon className={`h-12 w-12 mb-4 group-hover:scale-110 transition-all duration-300 ${
          isDark ? 'text-slate-300' : 'text-slate-600'
        }`} />
        <h3 className={`text-xl font-bold mb-3 transition-colors duration-300 ${
          isDark ? 'text-slate-100' : 'text-slate-800'
        }`}>{title}</h3>
        <p className={`leading-relaxed transition-colors duration-300 ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}>{description}</p>
      </div>
    </Card>
  )
}
