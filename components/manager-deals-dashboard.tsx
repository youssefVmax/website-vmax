"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, DollarSign, Users, Target, Calendar, Filter, Download, Upload, Plus, Search, Eye, Edit, Trash2 } from "lucide-react"
import { useFirebaseSalesData } from "@/hooks/useFirebaseSalesData"

interface Deal {
  DealID: string
  customer_name: string
  amount: number
  sales_agent: string
  closing_agent: string
  team: string
  type_service: string
  date: string
  status?: string
}

export default function ManagerDealsDashboard() {
  const { sales, loading, error } = useFirebaseSalesData('manager')
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [teamFilter, setTeamFilter] = useState("all")
  const [serviceFilter, setServiceFilter] = useState("all")
  const [closedByFilter, setClosedByFilter] = useState("all")
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-destructive">
          Error loading deals: {error.message}
        </CardContent>
      </Card>
    )
  }

  const deals = sales as Deal[]

  // Filter deals based on search and filters
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = 
      deal.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.DealID.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.sales_agent.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTeam = teamFilter === "all" || deal.team === teamFilter
    const matchesService = serviceFilter === "all" || deal.type_service === serviceFilter
    const matchesClosedBy = closedByFilter === "all" || deal.closing_agent === closedByFilter
    const matchesDate = !dateFilter || deal.date.includes(dateFilter)

    return matchesSearch && matchesTeam && matchesService && matchesClosedBy && matchesDate
  })

  // Calculate analytics
  const totalRevenue = filteredDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0)
  const totalDeals = filteredDeals.length
  const averageDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0

  // Get unique values for filters
  const teams = [...new Set(deals.map(deal => deal.team))].filter(Boolean)
  const services = [...new Set(deals.map(deal => deal.type_service))].filter(Boolean)
  const closers = [...new Set(deals.map(deal => deal.closing_agent))].filter(Boolean)

  // Sales by team data for chart
  const salesByTeam = teams.map(team => ({
    team,
    sales: deals.filter(deal => deal.team === team).reduce((sum, deal) => sum + deal.amount, 0),
    deals: deals.filter(deal => deal.team === team).length
  }))

  // Sales by service data for pie chart
  const salesByService = services.map(service => ({
    service,
    sales: deals.filter(deal => deal.type_service === service).reduce((sum, deal) => sum + deal.amount, 0)
  }))

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Manager Analytics Dashboard
          </h2>
          <p className="text-muted-foreground">
            Comprehensive view of all sales activities and team performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-green-600">+12.5% from last month</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Deals</p>
                <p className="text-2xl font-bold">{totalDeals}</p>
                <p className="text-xs text-blue-600">+8.2% from last month</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Deal Size</p>
                <p className="text-2xl font-bold">${Math.round(averageDealSize).toLocaleString()}</p>
                <p className="text-xs text-purple-600">+5.3% from last month</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Teams</p>
                <p className="text-2xl font-bold">{teams.length}</p>
                <p className="text-xs text-orange-600">All teams active</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Team</CardTitle>
            <CardDescription>Revenue distribution across teams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByTeam}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="team" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Bar dataKey="sales" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Service Type</CardTitle>
            <CardDescription>Distribution of sales across service types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByService}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="sales"
                    nameKey="service"
                    label={({ service, percent }) => `${service}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {salesByService.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Sales']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Management</CardTitle>
          <CardDescription>Filter and manage all deals across the organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deals, customers, or agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map(service => (
                  <SelectItem key={service} value={service}>{service}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={closedByFilter} onValueChange={setClosedByFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by closer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Closers</SelectItem>
                {closers.map(closer => (
                  <SelectItem key={closer} value={closer}>{closer}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-[150px]"
            />

            <div className="flex gap-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Cards
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredDeals.length} of {totalDeals} deals
            </p>
          </div>

          {viewMode === 'table' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Sales Agent</TableHead>
                    <TableHead>Closing Agent</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeals.map((deal) => (
                    <TableRow key={deal.DealID}>
                      <TableCell className="font-medium">{deal.DealID}</TableCell>
                      <TableCell>{deal.customer_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{deal.sales_agent}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{deal.closing_agent}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{deal.team}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{deal.type_service}</Badge>
                      </TableCell>
                      <TableCell>{deal.date}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${deal.amount?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDeals.map((deal) => (
                <Card key={deal.DealID} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{deal.customer_name}</h4>
                      <Badge variant="outline">{deal.type_service}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">ID: {deal.DealID}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Sales Agent:</span>
                        <span className="font-medium">{deal.sales_agent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Team:</span>
                        <Badge variant="secondary" className="text-xs">{deal.team}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-bold text-green-600">${deal.amount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{deal.date}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-3">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredDeals.length === 0 && (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No deals found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}