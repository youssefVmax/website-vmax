"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Star, TrendingUp, Users, Target, Calendar, Zap, X, PieChart as PieChartIcon } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface Deal {
  date: string
  customer_name: string
  phone_number: string
  email_address: string
  amount: number
  user: string
  address: string
  sales_agent: string
  closing_agent: string
  team: string
  duration: string
  type_program: string
  type_service: string
  invoice: string
  device_id: string
  device_key: string
  comment: string
  no_user: string
  status: string
  sales_agent_norm: string
  closing_agent_norm: string
  sales_agent_id: string
  closing_agent_id: string
  deal_id: string
}

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

export default function SalesCompetitionDashboard() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [celebrating, setCelebrating] = useState(false)
  const [showWinnerCards, setShowWinnerCards] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [currentMonth] = useState(new Date().toLocaleString("default", { month: "long", year: "numeric" }))
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'teams' | 'sales-by-service'>('sales-by-service')

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        console.log("[v0] Fetching deals from /api/sales ...")
        const response = await fetch('/api/sales')
        if (!response.ok) {
          throw new Error(`Failed to fetch sales (status ${response.status})`)
        }
        const sales = await response.json()

        const parsedDeals: Deal[] = (sales as any[]).map((row: any, index: number) => {
          const amountVal = typeof row.amount === 'number' ? row.amount : Number.parseFloat(String(row.amount).replace(/[$,]/g, '')) || 0
          const deal: Deal = {
            date: (row.date ?? '').toString(),
            customer_name: (row.customer_name ?? '').toString(),
            phone_number: (row.phone_number ?? '').toString(),
            email_address: (row.email_address ?? '').toString(),
            amount: amountVal,
            user: (row.user ?? '').toString(),
            address: (row.address ?? '').toString(),
            sales_agent: (row.sales_agent ?? '').toString(),
            closing_agent: (row.closing_agent ?? '').toString(),
            team: (row.team ?? '').toString(),
            duration: (row.duration ?? '').toString(),
            type_program: (row.type_program ?? '').toString(),
            type_service: (row.type_service ?? '').toString(),
            invoice: (row.invoice ?? '').toString(),
            device_id: (row.device_id ?? '').toString(),
            device_key: (row.device_key ?? '').toString(),
            comment: (row.comment ?? '').toString(),
            no_user: (row.no_user ?? '').toString(),
            status: (row.status ?? '').toString(),
            sales_agent_norm: (row.sales_agent_norm ?? '').toString(),
            closing_agent_norm: (row.closing_agent_norm ?? '').toString(),
            sales_agent_id: (row.SalesAgentID ?? row.sales_agent_id ?? '').toString(),
            closing_agent_id: (row.ClosingAgentID ?? row.closing_agent_id ?? '').toString(),
            deal_id: (row.DealID ?? row.deal_id ?? '').toString(),
          }

          if (index < 3) {
            console.log(`[v0] Deal ${index + 1}:`, {
              customer: deal.customer_name,
              amount: deal.amount,
              sales_agent: deal.sales_agent,
              closing_agent: deal.closing_agent,
              team: deal.team,
            })
          }

          return deal
        })

        console.log("[v0] Total parsed deals:", parsedDeals.length)
        console.log("[v0] Total revenue:", parsedDeals.reduce((sum, deal) => sum + deal.amount, 0))

        setDeals(parsedDeals)
        setLastUpdate(new Date())
      } catch (error) {
        console.error("[v0] Error fetching deals:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDeals()

    const interval = setInterval(fetchDeals, 30000)
    return () => clearInterval(interval)
  }, [])

  const getAgentStats = (type: "sales" | "closing"): AgentStats[] => {
    const agentMap = new Map<string, AgentStats>()

    deals.forEach((deal) => {
      const agentName = type === "sales" ? deal.sales_agent : deal.closing_agent
      const agentId = type === "sales" ? deal.sales_agent_id : deal.closing_agent_id

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
    console.log(`[v0] ${type} agents stats:`, result.slice(0, 3))
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
    console.log("[v0] Team stats:", result)
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
    console.log("[v0] Service stats:", result)
    return result
  }

  const salesAgents = getAgentStats("sales")
  const closingAgents = getAgentStats("closing")
  const teams = getTeamStats()
  const services = getServiceStats()

  const triggerCelebration = () => {
    setCelebrating(true)
    setShowWinnerCards(true)
    setTimeout(() => setCelebrating(false), 3000)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const LeaderboardCard = ({
    title,
    icon: Icon,
    data,
    type,
  }: {
    title: string
    icon: any
    data: AgentStats[] | TeamStats[]
    type: "agent" | "team"
  }) => (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.slice(0, 5).map((item, index) => (
          <div
            key={type === "agent" ? (item as AgentStats).id : (item as TeamStats).name}
            className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 slide-up ${
              index === 0 ? "bg-accent/20 pulse-glow" : "bg-muted/50"
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index === 0
                    ? "bg-accent text-accent-foreground"
                    : index === 1
                      ? "bg-chart-2 text-white"
                      : index === 2
                        ? "bg-chart-3 text-white"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {index === 0 ? (
                  <Trophy className="h-4 w-4" />
                ) : index === 1 ? (
                  <Medal className="h-4 w-4" />
                ) : index === 2 ? (
                  <Star className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>

              {type === "agent" && (
                <img
                  src={(item as AgentStats).avatar || "/placeholder.svg"}
                  alt={(item as AgentStats).name}
                  className="w-8 h-8 rounded-full"
                />
              )}

              <div>
                <p className="font-medium text-foreground">
                  {type === "agent" ? (item as AgentStats).name : (item as TeamStats).name}
                </p>
                {type === "agent" && <p className="text-xs text-muted-foreground">{(item as AgentStats).team}</p>}
                {type === "team" && (
                  <p className="text-xs text-muted-foreground">{(item as TeamStats).agents} agents</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="font-bold text-foreground">
                {type === "agent" ? (item as AgentStats).deals : (item as TeamStats).deals} deals
              </p>
              <p className="text-sm text-accent font-medium">
                {formatCurrency(type === "agent" ? (item as AgentStats).totalAmount : (item as TeamStats).totalAmount)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )

  const WinnerCard = ({
    agent,
    title,
    icon: Icon,
    color,
    bgColor,
  }: {
    agent: AgentStats | TeamStats
    title: string
    icon: any
    color: string
    bgColor: string
  }) => (
    <Card className={`${bgColor} border-2 transform transition-all duration-500 hover:scale-105 winner-card-animate`}>
      <CardContent className="p-8 text-center">
        <div className="relative">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
            <Trophy className="h-6 w-6 text-yellow-800" />
          </div>
          <Icon className={`h-16 w-16 ${color} mx-auto mb-6`} />

          {"avatar" in agent ? (
            <img
              src={agent.avatar || "/placeholder.svg"}
              alt={agent.name}
              className={`w-24 h-24 rounded-full mx-auto mb-6 border-4 ${color.replace("text-", "border-")} shadow-lg`}
            />
          ) : (
            <div
              className={`w-24 h-24 rounded-full mx-auto mb-6 border-4 ${color.replace("text-", "border-")} ${bgColor} flex items-center justify-center shadow-lg`}
            >
              <Users className={`h-12 w-12 ${color}`} />
            </div>
          )}

          <h3 className="text-3xl font-bold text-foreground mb-2">{agent.name}</h3>
          <p className={`${color} font-bold text-xl mb-2`}>{title}</p>
          {"team" in agent && agent.team && <p className="text-muted-foreground mb-4">{agent.team}</p>}
          {"agents" in agent && <p className="text-muted-foreground mb-4">{agent.agents} active agents</p>}

          <div className="space-y-2">
            <div className={`inline-block px-4 py-2 ${bgColor} rounded-full`}>
              <p className="text-3xl font-bold text-foreground">{agent.deals}</p>
              <p className="text-sm text-muted-foreground">DEALS WON</p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{formatCurrency(agent.totalAmount)}</p>
          </div>

          <div className="mt-6 flex justify-center space-x-2">
            {[...Array(3)].map((_, i) => (
              <Star
                key={i}
                className="h-6 w-6 text-yellow-400 fill-current animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const SalesByServiceChart = () => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    
    const data = services.length > 0 
      ? services.map((service, index) => ({
          name: service.service,
          value: service.sales,
          fill: COLORS[index % COLORS.length],
        }))
      : [
          { name: 'No Data', value: 1, fill: '#e5e7eb' }
        ];

    return (
      <div className="h-[calc(100vh-200px)] w-full p-4">
        <Card className="h-full w-full border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">Sales by Service</CardTitle>
            <CardDescription>Distribution of sales across different service types</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-80px)] w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius="80%"
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => 
                    `${name}: ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [
                    `$${Number(value).toLocaleString()}`, 
                    name
                  ]} 
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{
                    paddingTop: '20px',
                    fontSize: '14px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading competition data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Celebration Effects */}
      {celebrating && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-accent confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: i % 3 === 0 ? "var(--accent)" : i % 3 === 1 ? "var(--primary)" : "var(--chart-3)",
              }}
            />
          ))}
        </div>
      )}

      {showWinnerCards && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-4xl font-bold text-foreground flex items-center gap-3">
                <Trophy className="h-10 w-10 text-yellow-400" />🎉 COMPETITION WINNERS! 🎉
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowWinnerCards(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {salesAgents[0] && (
                <WinnerCard
                  agent={salesAgents[0]}
                  title="🏆 TOP SALES CHAMPION"
                  icon={TrendingUp}
                  color="text-yellow-400"
                  bgColor="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-400/50"
                />
              )}

              {closingAgents[0] && (
                <WinnerCard
                  agent={closingAgents[0]}
                  title="🎯 CLOSING MASTER"
                  icon={Target}
                  color="text-blue-400"
                  bgColor="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-400/50"
                />
              )}

              {teams[0] && (
                <WinnerCard
                  agent={teams[0]}
                  title="👑 TEAM CHAMPIONS"
                  icon={Users}
                  color="text-green-400"
                  bgColor="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-400/50"
                />
              )}
            </div>

            <div className="mt-8 text-center">
              <p className="text-xl text-muted-foreground mb-4">
                Congratulations to all our amazing performers this month!
              </p>
              <Button
                onClick={() => setShowWinnerCards(false)}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold px-8 py-3 text-lg"
              >
                Continue Competition! 🚀
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-8 w-8 text-accent" />
                <h1 className="text-2xl font-bold text-foreground">Sales Competition Dashboard</h1>
              </div>
              <Badge variant="secondary" className="bg-accent text-accent-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {currentMonth}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">{lastUpdate.toLocaleTimeString()}</p>
              </div>
              <Button onClick={triggerCelebration} className="bg-primary hover:bg-primary/90">
                <Zap className="h-4 w-4 mr-2" />
                Celebrate!
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deals</p>
                  <p className="text-3xl font-bold text-primary">{deals.length}</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/20 to-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold text-accent">
                    {formatCurrency(deals.reduce((sum, deal) => sum + deal.amount, 0))}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-chart-3/20 to-chart-3/5 border-chart-3/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Teams</p>
                  <p className="text-3xl font-bold text-chart-3">{teams.length}</p>
                </div>
                <Users className="h-8 w-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-chart-2/20 to-chart-2/5 border-chart-2/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                  <p className="text-3xl font-bold text-chart-2">
                    {formatCurrency(
                      deals.length > 0 ? deals.reduce((sum, deal) => sum + deal.amount, 0) / deals.length : 0,
                    )}
                  </p>
                </div>
                <Star className="h-8 w-8 text-chart-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <LeaderboardCard title="Top Sales Agents" icon={TrendingUp} data={salesAgents} type="agent" />

          <LeaderboardCard title="Top Closing Agents" icon={Target} data={closingAgents} type="agent" />

          <LeaderboardCard title="Team Rankings" icon={Users} data={teams} type="team" />
        </div>

        {/* Winner Spotlight */}
        {(salesAgents.length > 0 || closingAgents.length > 0 || teams.length > 0) && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-accent" />
              Current Champions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {salesAgents[0] && (
                <Card className="bg-gradient-to-br from-accent/20 to-accent/5 border-accent/20 pulse-glow">
                  <CardContent className="p-6 text-center">
                    <Trophy className="h-12 w-12 text-accent mx-auto mb-4" />
                    <img
                      src={salesAgents[0].avatar || "/placeholder.svg"}
                      alt={salesAgents[0].name}
                      className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-accent"
                    />
                    <h3 className="text-xl font-bold text-foreground mb-2">{salesAgents[0].name}</h3>
                    <p className="text-accent font-medium mb-1">Top Sales Agent</p>
                    <p className="text-sm text-muted-foreground mb-3">{salesAgents[0].team}</p>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-accent">{salesAgents[0].deals} deals</p>
                      <p className="text-lg text-foreground">{formatCurrency(salesAgents[0].totalAmount)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {closingAgents[0] && (
                <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20 pulse-glow">
                  <CardContent className="p-6 text-center">
                    <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                    <img
                      src={closingAgents[0].avatar || "/placeholder.svg"}
                      alt={closingAgents[0].name}
                      className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-primary"
                    />
                    <h3 className="text-xl font-bold text-foreground mb-2">{closingAgents[0].name}</h3>
                    <p className="text-primary font-medium mb-1">Top Closing Agent</p>
                    <p className="text-sm text-muted-foreground mb-3">{closingAgents[0].team}</p>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-primary">{closingAgents[0].deals} deals</p>
                      <p className="text-lg text-foreground">{formatCurrency(closingAgents[0].totalAmount)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {teams[0] && (
                <Card className="bg-gradient-to-br from-chart-3/20 to-chart-3/5 border-chart-3/20 pulse-glow">
                  <CardContent className="p-6 text-center">
                    <Users className="h-12 w-12 text-chart-3 mx-auto mb-4" />
                    <div className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-chart-3 bg-chart-3/20 flex items-center justify-center">
                      <Users className="h-10 w-10 text-chart-3" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{teams[0].name}</h3>
                    <p className="text-chart-3 font-medium mb-1">Leading Team</p>
                    <p className="text-sm text-muted-foreground mb-3">{teams[0].agents} active agents</p>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-chart-3">{teams[0].deals} deals</p>
                      <p className="text-lg text-foreground">{formatCurrency(teams[0].totalAmount)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
