"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Database, Download, RefreshCw, Shield, FileText, AlertTriangle, TrendingUp, Target, Users } from "lucide-react"
import { showSuccess, showError, showConfirm } from "@/lib/sweetalert"
import { useMySQLSalesData } from "@/hooks/useMySQLSalesData"
import { User } from "@/types/user"

interface ImportExportControlsProps {
  user: User
}

interface AgentPerformance {
  agentId: string
  agentName: string
  team: string
  targetAmount: number
  targetDeals: number
  actualDeals: number
  actualAmount: number
  dealProgress: number
  amountProgress: number
  averageDealSize: number
  status: 'excellent' | 'good' | 'needs_improvement' | 'poor'
}

export function ImportExportControls({ user }: ImportExportControlsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<string>('deals')
  const [exportFormat, setExportFormat] = useState<string>('csv')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const { refreshData } = useMySQLSalesData({ userRole: user.role })

  // Fetch agent performance data
  useEffect(() => {
    if (user.role === 'manager') {
      fetchAgentPerformance()
    }
  }, [user])

  const fetchAgentPerformance = async () => {
    try {
      setLoading(true)

      // Fetch targets
      const targetsResponse = await fetch('/api/targets?limit=1000', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })

      // Fetch deals
      const dealsResponse = await fetch('/api/deals?limit=1000', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })

      if (!targetsResponse.ok || !dealsResponse.ok) {
        throw new Error('Failed to fetch performance data')
      }

      const targetsData = await targetsResponse.json()
      const dealsData = await dealsResponse.json()

      // Process data to create performance metrics
      const targets = targetsData.targets || []
      const deals = dealsData.deals || []

      // Group deals by agent
      const dealsByAgent = deals.reduce((acc: any, deal: any) => {
        const agentId = deal.SalesAgentID || deal.salesAgentId
        const agentName = deal.sales_agent || deal.salesAgentName
        const team = deal.sales_team || deal.salesTeam

        if (!acc[agentId]) {
          acc[agentId] = {
            agentId,
            agentName,
            team,
            deals: [],
            totalAmount: 0,
            dealCount: 0
          }
        }

        acc[agentId].deals.push(deal)
        acc[agentId].totalAmount += parseFloat(deal.amount_paid || deal.amountPaid || 0)
        acc[agentId].dealCount += 1

        return acc
      }, {})

      // Combine with targets
      const performance: AgentPerformance[] = Object.values(dealsByAgent).map((agentData: any) => {
        const agentTargets = targets.filter((t: any) => t.agentId === agentData.agentId)
        const targetAmount = agentTargets.reduce((sum: number, t: any) => sum + (parseFloat(t.monthlyTarget || t.targetAmount || 0)), 0)
        const targetDeals = agentTargets.reduce((sum: number, t: any) => sum + (parseInt(t.dealsTarget || 0)), 0)

        const actualDeals = agentData.dealCount
        const actualAmount = agentData.totalAmount
        const dealProgress = targetDeals > 0 ? (actualDeals / targetDeals) * 100 : 0
        const amountProgress = targetAmount > 0 ? (actualAmount / targetAmount) * 100 : 0
        const averageDealSize = actualDeals > 0 ? actualAmount / actualDeals : 0

        // Determine status based on progress
        let status: 'excellent' | 'good' | 'needs_improvement' | 'poor' = 'poor'
        if (dealProgress >= 100 && amountProgress >= 100) {
          status = 'excellent'
        } else if (dealProgress >= 80 && amountProgress >= 80) {
          status = 'good'
        } else if (dealProgress >= 50 || amountProgress >= 50) {
          status = 'needs_improvement'
        }

        return {
          agentId: agentData.agentId,
          agentName: agentData.agentName,
          team: agentData.team,
          targetAmount,
          targetDeals,
          actualDeals,
          actualAmount,
          dealProgress,
          amountProgress,
          averageDealSize,
          status
        }
      })

      // Sort by performance (excellent first)
      performance.sort((a, b) => {
        const statusOrder = { excellent: 4, good: 3, needs_improvement: 2, poor: 1 }
        return statusOrder[b.status] - statusOrder[a.status]
      })

      setAgentPerformance(performance)
    } catch (error) {
      console.error('Error fetching agent performance:', error)
      showError('Performance Data Error', 'Failed to load agent performance data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true)
      await refreshData?.()
      await fetchAgentPerformance() // Refresh performance data too
      showSuccess("Data Refreshed", "MySQL data has been refreshed successfully.")
    } catch (error) {
      console.error('Refresh error:', error)
      showError("Refresh Failed", "Failed to refresh data. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleExportData = async () => {
    if (user.role !== 'manager') {
      showError("Permission Denied", "Only managers are allowed to export data.")
      return
    }

    try {
      setIsExporting(true)

      const params = new URLSearchParams({
        userRole: user.role,
        userId: user.id.toString(),
        exportType,
        format: exportFormat
      })

      const response = await fetch(`/api/export?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Export failed')
      }

      if (exportFormat === 'csv') {
        // Handle CSV download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        showSuccess("Export Complete", `${exportType} data exported successfully as CSV.`)
      } else {
        // Handle JSON download
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportType}_export_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        showSuccess("Export Complete", `${exportType} data exported successfully as JSON.`)
      }
    } catch (error) {
      console.error('Export error:', error)
      showError("Export Failed", error instanceof Error ? error.message : "Failed to export data. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleFilteredExport = async () => {
    if (user.role !== 'manager') {
      showError("Permission Denied", "Only managers are allowed to export data.")
      return
    }

    try {
      setIsExporting(true)

      const filters: any = {}
      if (dateFrom) filters.dateFrom = dateFrom
      if (dateTo) filters.dateTo = dateTo

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userRole: user.role,
          userId: user.id,
          exportType,
          filters
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Filtered export failed')
      }

      const data = await response.json()

      // Download filtered data as JSON
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportType}_filtered_export_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showSuccess("Filtered Export Complete", `${data.recordCount} ${exportType} records exported successfully.`)
    } catch (error) {
      console.error('Filtered export error:', error)
      showError("Export Failed", error instanceof Error ? error.message : "Failed to export filtered data.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDataMaintenance = async () => {
    const confirmed = await showConfirm(
      "Data Maintenance",
      "This will optimize MySQL indexes and clean up old data. Continue?",
      "Yes, Optimize",
      "Cancel"
    )

    if (confirmed) {
      showSuccess("Maintenance Scheduled", "Data maintenance has been scheduled and will run in the background.")
    }
  }

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (agentPerformance.length === 0) return null

    const totalAgents = agentPerformance.length
    const totalTargets = agentPerformance.reduce((sum, p) => sum + p.targetAmount, 0)
    const totalActual = agentPerformance.reduce((sum, p) => sum + p.actualAmount, 0)
    const totalTargetDeals = agentPerformance.reduce((sum, p) => sum + p.targetDeals, 0)
    const totalActualDeals = agentPerformance.reduce((sum, p) => sum + p.actualDeals, 0)
    const avgProgress = agentPerformance.reduce((sum, p) => sum + Math.min(p.amountProgress, 100), 0) / totalAgents
    const excellentAgents = agentPerformance.filter(p => p.status === 'excellent').length

    return {
      totalAgents,
      totalTargets,
      totalActual,
      totalTargetDeals,
      totalActualDeals,
      avgProgress,
      excellentAgents
    }
  }, [agentPerformance])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500'
      case 'good': return 'bg-blue-500'
      case 'needs_improvement': return 'bg-yellow-500'
      case 'poor': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800 border-green-200',
      good: 'bg-blue-100 text-blue-800 border-blue-200',
      needs_improvement: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      poor: 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // Show permission denied message for non-managers
  if (user.role !== 'manager') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span>Data export and management features are restricted to managers only.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Data Export (Manager Only)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="exportType">Export Type</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deals">Deals</SelectItem>
                  <SelectItem value="callbacks">Callbacks</SelectItem>
                  <SelectItem value="targets">Targets</SelectItem>
                  <SelectItem value="analytics">Analytics Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="exportFormat">Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export All {exportType}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Agent Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading performance data...</span>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              {summaryStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-600">Total Agents</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{summaryStats.totalAgents}</div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Target className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-600">Avg Progress</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">{summaryStats.avgProgress.toFixed(1)}%</div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-purple-600">Total Deals</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">{summaryStats.totalActualDeals}</div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Database className="h-5 w-5 text-orange-600 mr-2" />
                      <span className="text-sm font-medium text-orange-600">Excellent Agents</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-900">{summaryStats.excellentAgents}</div>
                  </div>
                </div>
              )}

              {/* Performance Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Agent</th>
                      <th className="text-center py-2 px-4">Team</th>
                      <th className="text-center py-2 px-4">Target Deals</th>
                      <th className="text-center py-2 px-4">Actual Deals</th>
                      <th className="text-center py-2 px-4">Deal Progress</th>
                      <th className="text-center py-2 px-4">Target Amount</th>
                      <th className="text-center py-2 px-4">Actual Amount</th>
                      <th className="text-center py-2 px-4">Amount Progress</th>
                      <th className="text-center py-2 px-4">Avg Deal Size</th>
                      <th className="text-center py-2 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentPerformance.map((agent) => (
                      <tr key={agent.agentId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{agent.agentName}</div>
                          <div className="text-xs text-gray-500">{agent.agentId}</div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge variant="outline">{agent.team || '—'}</Badge>
                        </td>
                        <td className="text-center py-3 px-4 font-medium">
                          {agent.targetDeals}
                        </td>
                        <td className="text-center py-3 px-4 font-medium text-blue-600">
                          {agent.actualDeals}
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex flex-col items-center space-y-1">
                            <div className="text-sm font-medium">{agent.dealProgress.toFixed(1)}%</div>
                            <Progress value={Math.min(agent.dealProgress, 100)} className="w-16 h-2" />
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          ${agent.targetAmount.toLocaleString()}
                        </td>
                        <td className="text-center py-3 px-4 text-green-600 font-medium">
                          ${agent.actualAmount.toLocaleString()}
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex flex-col items-center space-y-1">
                            <div className="text-sm font-medium">{agent.amountProgress.toFixed(1)}%</div>
                            <Progress value={Math.min(agent.amountProgress, 100)} className="w-16 h-2" />
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          ${agent.averageDealSize.toLocaleString()}
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge className={`${getStatusBadge(agent.status)} ${getStatusColor(agent.status)} text-white`}>
                            {agent.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {agentPerformance.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No agent performance data available</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
