"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useFirebaseSalesData } from "@/hooks/useFirebaseSalesData"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Star, TrendingUp, Users, Target, Calendar, Zap, X, PieChart as PieChartIcon } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface AgentStats {
  id: string
  name: string
  deals: number
  totalAmount: number
  team: string
  avatar?: string
}

interface TeamStats {
  name: string
  deals: number
  totalAmount: number
  agents: number
}

interface ServiceData {
  service: string
  sales: number
  fill?: string
}

export default function CompetitionPage() {
  const { user } = useAuth()
  const { sales: deals, loading, error } = useFirebaseSalesData(user?.role || 'manager', user?.id, user?.name)
  const [celebrating, setCelebrating] = useState(false)
  const [showWinnerCards, setShowWinnerCards] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [currentMonth] = useState(new Date().toLocaleString("default", { month: "long", year: "numeric" }))
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'teams' | 'sales-by-service'>('sales-by-service')

  // Salesmen no longer use this page; avoid mounting heavy UI and charts
  if (user?.role === 'salesman') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-xl w-full">
          <CardHeader>
            <CardTitle>Competition</CardTitle>
            <CardDescription>This page is not available for your role.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please use the Dashboard, My Deals Table, or Analytics tabs.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Update lastUpdate when deals change
  useEffect(() => {
    if (deals && deals.length > 0) {
      setLastUpdate(new Date())
    }
  }, [deals])

  const getAgentStats = (type: "sales" | "closing"): AgentStats[] => {
    const agentMap = new Map<string, AgentStats>()

    deals.forEach((deal) => {
      const agentName = type === "sales" ? deal.sales_agent : deal.closing_agent
      const agentId = type === "sales" ? deal.SalesAgentID : deal.ClosingAgentID

      if (!agentName || !agentId || agentName.trim() === "" || agentId.trim() === "") return

      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          id: agentId,
          name: agentName,
          deals: 0,
          totalAmount: 0,
          team: deal.team,
          avatar: `/placeholder.svg?height=40&width=40&query=${agentName.replace(/\s+/g, "+")}`,
        })
      }

      const agent = agentMap.get(agentId)!
      agent.deals += 1
      agent.totalAmount += deal.amount
    })

    const result = Array.from(agentMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)
    return result
  }

  const getTeamStats = (): TeamStats[] => {
    const teamMap = new Map<string, TeamStats>()

    deals.forEach((deal) => {
      if (!deal.team || deal.team.trim() === "") return

      if (!teamMap.has(deal.team)) {
        teamMap.set(deal.team, {
          name: deal.team,
          deals: 0,
          totalAmount: 0,
          agents: 0,
        })
      }

      const team = teamMap.get(deal.team)!
      team.deals += 1
      team.totalAmount += deal.amount
    })

    teamMap.forEach((team, teamName) => {
      const agentSet = new Set<string>()
      deals.forEach((deal) => {
        if (deal.team === teamName) {
          if (deal.sales_agent && deal.sales_agent.trim()) agentSet.add(deal.sales_agent)
          if (deal.closing_agent && deal.closing_agent.trim()) agentSet.add(deal.closing_agent)
        }
      })
      team.agents = agentSet.size
    })

    const result = Array.from(teamMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)
    return result
  }

  const getServiceStats = (): ServiceData[] => {
    const serviceMap = new Map<string, ServiceData>()

    deals.forEach((deal) => {
      if (!deal.type_service || deal.type_service.trim() === "") return

      if (!serviceMap.has(deal.type_service)) {
        serviceMap.set(deal.type_service, {
          service: deal.type_service,
          sales: 0,
        })
      }

      const service = serviceMap.get(deal.type_service)!
      service.sales += deal.amount
    })

    const result = Array.from(serviceMap.values()).sort((a, b) => b.sales - a.sales)
    return result
  }

  const salesAgents = getAgentStats("sales")
  const closingAgents = getAgentStats("closing")
  const teams = getTeamStats()
  const services = getServiceStats()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p>Loading competition data from Firebase...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error loading competition data: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Sales Competition Dashboard
          </h1>
          <p className="text-xl text-muted-foreground">
            {currentMonth} - Real-time leaderboard powered by Firebase
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted p-1 rounded-lg">
            <Button
              variant={activeTab === 'leaderboard' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('leaderboard')}
              className="mr-1"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Leaderboard
            </Button>
            <Button
              variant={activeTab === 'teams' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('teams')}
              className="mr-1"
            >
              <Users className="h-4 w-4 mr-2" />
              Teams
            </Button>
            <Button
              variant={activeTab === 'sales-by-service' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('sales-by-service')}
            >
              <PieChartIcon className="h-4 w-4 mr-2" />
              Services
            </Button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'leaderboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Agents Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Top Sales Agents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {salesAgents.slice(0, 5).map((agent, index) => (
                  <div
                    key={agent.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0 ? "bg-accent/20" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0 ? "bg-accent text-accent-foreground" :
                        index === 1 ? "bg-chart-2 text-white" :
                        index === 2 ? "bg-chart-3 text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        {index === 0 ? <Trophy className="h-4 w-4" /> :
                         index === 1 ? <Medal className="h-4 w-4" /> :
                         index === 2 ? <Star className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{agent.deals} deals</p>
                      <p className="text-sm text-accent font-medium">{formatCurrency(agent.totalAmount)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Closing Agents Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Top Closing Agents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {closingAgents.slice(0, 5).map((agent, index) => (
                  <div
                    key={agent.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0 ? "bg-accent/20" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0 ? "bg-accent text-accent-foreground" :
                        index === 1 ? "bg-chart-2 text-white" :
                        index === 2 ? "bg-chart-3 text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        {index === 0 ? <Trophy className="h-4 w-4" /> :
                         index === 1 ? <Medal className="h-4 w-4" /> :
                         index === 2 ? <Star className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{agent.deals} deals</p>
                      <p className="text-sm text-accent font-medium">{formatCurrency(agent.totalAmount)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Team Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {teams.slice(0, 5).map((team, index) => (
                  <div
                    key={team.name}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0 ? "bg-accent/20" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0 ? "bg-accent text-accent-foreground" :
                        index === 1 ? "bg-chart-2 text-white" :
                        index === 2 ? "bg-chart-3 text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        {index === 0 ? <Trophy className="h-4 w-4" /> :
                         index === 1 ? <Medal className="h-4 w-4" /> :
                         index === 2 ? <Star className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-xs text-muted-foreground">{team.agents} agents</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{team.deals} deals</p>
                      <p className="text-sm text-accent font-medium">{formatCurrency(team.totalAmount)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'sales-by-service' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales by Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={services}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="sales"
                        nameKey="service"
                        label={({ service, percent }) => `${service}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {services.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${(index * 360) / services.length}, 70%, 60%)`} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${value}`, 'Sales']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {services.map((service, index) => (
                  <div key={service.service} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: `hsl(${(index * 360) / services.length}, 70%, 60%)` }}
                      />
                      <p className="font-medium">{service.service}</p>
                    </div>
                    <p className="font-bold">{formatCurrency(service.sales)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="text-center mt-8 text-sm text-muted-foreground">
          Last updated: {lastUpdate.toLocaleString()} • Data from Firebase
        </div>
      </div>
    </div>
  )
}
