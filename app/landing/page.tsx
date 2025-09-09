"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, BarChart3, Users, Database, Bell, Shield, Zap, TrendingUp, Star, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">IPTV Sales Pro</h1>
          </div>
          <Link href="/auth/signin">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-6 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
            Professional Sales Management Platform
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Supercharge Your
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"> IPTV Sales</span>
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Complete sales management platform with real-time analytics, team collaboration, 
            and automated workflows designed specifically for IPTV businesses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signin">
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-4 text-lg">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-4 text-lg">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to Scale
            </h3>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Powerful features designed to streamline your sales process and maximize revenue
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Real-time Analytics</h4>
                <p className="text-slate-400">
                  Track sales performance, revenue trends, and team metrics with live dashboards and detailed reports.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Team Management</h4>
                <p className="text-slate-400">
                  Organize teams, assign leads, track individual performance, and manage user roles efficiently.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Data Center</h4>
                <p className="text-slate-400">
                  Upload, manage, and distribute customer data files with automated assignment and tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Smart Notifications</h4>
                <p className="text-slate-400">
                  Stay updated with real-time notifications for new assignments, deals, and important updates.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Role-based Access</h4>
                <p className="text-slate-400">
                  Secure access control with manager and salesman roles, ensuring data privacy and proper permissions.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Automated Workflows</h4>
                <p className="text-slate-400">
                  Streamline processes with automated lead assignment, follow-ups, and performance tracking.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-slate-900/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="group">
              <div className="text-4xl font-bold text-cyan-400 mb-2 group-hover:scale-110 transition-transform">500+</div>
              <div className="text-slate-400">Active Sales Agents</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold text-blue-400 mb-2 group-hover:scale-110 transition-transform">$2M+</div>
              <div className="text-slate-400">Revenue Tracked</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold text-purple-400 mb-2 group-hover:scale-110 transition-transform">99.9%</div>
              <div className="text-slate-400">Uptime Guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">
                Why Choose IPTV Sales Pro?
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-cyan-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold">Increase Sales by 40%</h4>
                    <p className="text-slate-400">Advanced analytics and lead management boost conversion rates</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-cyan-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold">Save 10+ Hours Weekly</h4>
                    <p className="text-slate-400">Automated workflows eliminate manual tasks and repetitive processes</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-cyan-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold">Real-time Insights</h4>
                    <p className="text-slate-400">Make data-driven decisions with live performance metrics</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-cyan-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold">Team Collaboration</h4>
                    <p className="text-slate-400">Seamless communication and task management across teams</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl p-8 border border-cyan-500/30">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">4.9/5</div>
                    <div className="text-slate-400 text-sm">User Rating</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">40%</div>
                    <div className="text-slate-400 text-sm">Sales Increase</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">1000+</div>
                    <div className="text-slate-400 text-sm">Happy Customers</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <Shield className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">100%</div>
                    <div className="text-slate-400 text-sm">Secure</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border-cyan-500/20 max-w-4xl mx-auto">
            <CardContent className="p-12">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Sales?
              </h3>
              <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
                Join hundreds of IPTV businesses already using our platform to increase sales and streamline operations.
              </p>
              <Link href="/auth/signin">
                <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-4 text-lg">
                  Start Your Free Trial
                  <TrendingUp className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">IPTV Sales Pro</span>
          </div>
          <p className="text-slate-400">
            © 2024 IPTV Sales Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
