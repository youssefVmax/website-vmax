"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiService } from "@/lib/api-service"
import { useState, useEffect } from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts"
import { DollarSign, TrendingUp, Users } from "lucide-react"

export default function AgentDrilldownPage() {
  const params = useParams<{ agent: string }>()
  const agentParam = decodeURIComponent(params.agent)
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadSalesData = async () => {
      try {
        setLoading(true)
        const deals = await apiService.getDeals()
        setSales(deals)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load data'))
      } finally {
        setLoading(false)
      }
    }
    loadSalesData()
  }, [])

  const data = useMemo(() => {
    const norm = agentParam.toLowerCase().trim()
    const rows = (sales || []).filter(s =>
      s.sales_agent_norm?.toLowerCase().trim() === norm ||
      s.sales_agent?.toLowerCase().trim() === norm ||
      s.closing_agent_norm?.toLowerCase().trim() === norm ||
      s.closing_agent?.toLowerCase().trim() === norm
    )

    const totalRevenue = rows.reduce((sum, r) => sum + (r.amount || 0), 0)
    const totalDeals = rows.length
    const avgDeal = totalDeals > 0 ? totalRevenue / totalDeals : 0

    const dailyMap: Record<string, { date: string; revenue: number; deals: number }> = {}
    const serviceMap: Record<string, number> = {}

    for (const r of rows) {
      const d = r.date
      if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, deals: 0 }
      dailyMap[d].revenue += r.amount || 0
      dailyMap[d].deals += 1

      const svc = r.type_service || 'Unknown'
      serviceMap[svc] = (serviceMap[svc] || 0) + (r.amount || 0)
    }

    const dailyTrend = Object.values(dailyMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const serviceDist = Object.entries(serviceMap).map(([service, revenue]) => ({ service, revenue }))

    return { rows, totalRevenue, totalDeals, avgDeal, dailyTrend, serviceDist }
  }, [sales, agentParam])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="m-6 border-destructive">
        <CardContent className="p-6 text-destructive">Failed to load agent data: {error.message}</CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold capitalize">Agent: {agentParam}</h1>
          <p className="text-muted-foreground">Detailed performance and recent deals</p>
        </div>
        <Badge variant="outline">{data.rows.length} records</Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${data.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deals</p>
                <p className="text-2xl font-bold">{data.totalDeals}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                <p className="text-2xl font-bold">${Math.round(data.avgDeal).toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue</CardTitle>
            <CardDescription>Trend over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Mix</CardTitle>
            <CardDescription>Revenue by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.serviceDist} dataKey="revenue" nameKey="service" cx="50%" cy="50%" outerRadius={80} label>
                    {data.serviceDist.map((_, i) => (
                      <Cell key={i} fill={["#0088FE","#00C49F","#FFBB28","#FF8042","#8884D8","#82CA9D"][i % 6]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Deals */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Service</th>
                </tr>
              </thead>
              <tbody>
                {data.rows
                  .slice()
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 20)
                  .map((r, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="py-2">{r.customer_name}</td>
                      <td className="py-2 font-semibold">${r.amount}</td>
                      <td className="py-2">{r.type_service}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
