"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useFirebaseSalesData } from "@/hooks/useFirebaseSalesData"

export default function MyDeals() {
  const { user } = useAuth()
  const role = user?.role || 'salesman'
  const userId = user?.id
  const { sales, loading, error, refresh } = useFirebaseSalesData(role, userId, user?.name)
  const [filter, setFilter] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  const myDeals = useMemo(() => {
    const rows = (sales || [])
      .filter((r: any) => r && r.customer_name && r.DealID)
      .filter((r: any) => {
        if (!filter) return true
        const f = filter.toLowerCase()
        return (
          r.customer_name?.toLowerCase?.().includes(f) ||
          r.DealID?.toLowerCase?.().includes(f) ||
          r.sales_agent?.toLowerCase?.().includes(f) ||
          r.closing_agent?.toLowerCase?.().includes(f)
        )
      })
    return rows
  }, [sales, filter])

  const totals = useMemo(() => {
    const sum = myDeals.reduce((acc: number, r: any) => acc + (typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount)) || 0), 0)
    const count = myDeals.length
    return { sum, count }
  }, [myDeals])

  // Simple default targets; can be made configurable later
  const userTarget = role === 'salesman' ? 20000 : 0
  const systemTarget = 200000
  const userRemaining = Math.max(userTarget - totals.sum, 0)
  const systemRemaining = Math.max(systemTarget - (sales || []).reduce((acc: number, r: any) => acc + (typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount)) || 0), 0), 0)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">My Deals</h2>
          <p className="text-muted-foreground">Your deals and progress toward targets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Sales</div>
            <div className="text-2xl font-bold">${totals.sum.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Deals Count</div>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Your Target Remaining</div>
            <div className="text-2xl font-bold">${userRemaining.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">System Target Remaining</div>
            <div className="text-2xl font-bold">${systemRemaining.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deals</CardTitle>
          <CardDescription>All deals attributed to you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <Input placeholder="Search by customer, deal id, agent" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Sales Agent</TableHead>
                  <TableHead>Closer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myDeals.map((d: any) => (
                  <TableRow key={d.DealID}>
                    <TableCell className="font-medium">{d.DealID}</TableCell>
                    <TableCell>{d.date}</TableCell>
                    <TableCell>{d.customer_name}</TableCell>
                    <TableCell>{d.type_service || d.service_tier}</TableCell>
                    <TableCell>{d.sales_agent}</TableCell>
                    <TableCell>{d.closing_agent}</TableCell>
                    <TableCell className="text-right">${(typeof d.amount === 'number' ? d.amount : parseFloat(String(d.amount)) || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {loading && <div className="text-sm text-muted-foreground mt-2">Loading...</div>}
          {error && <div className="text-sm text-destructive mt-2">Failed to load deals.</div>}
        </CardContent>
      </Card>
    </div>
  )
}
