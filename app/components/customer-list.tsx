"use client"

import { useState, useMemo } from "react"
import { useSalesData } from "@/hooks/useSalesData"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

export interface CustomerListProps {
  userRole: string
  userId?: string
}

interface Customer {
  DealID: string
  customer_name: string
  sales_agent_norm?: string
  sales_agent: string
  closing_agent_norm?: string
  closing_agent: string
  SalesAgentID: string
  ClosingAgentID: string
  team: string
  type_service: string
  amount: number
}

export function CustomerList({ userRole, userId }: CustomerListProps) {
  const { sales = [], loading, error } = useSalesData(userRole, userId)
  const [query, setQuery] = useState("")
  const [teamFilter, setTeamFilter] = useState<string | undefined>(undefined)
  const [serviceFilter, setServiceFilter] = useState<string | undefined>(undefined)
  const [sortBy, setSortBy] = useState<keyof Customer>("customer_name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-destructive">
          Error loading customer data: {error.message}
        </CardContent>
      </Card>
    )
  }

  // Role filter first
  const roleFiltered = useMemo(() => {
    return (sales as Customer[]).filter((sale: Customer) => 
      userRole === 'manager' || 
      sale.SalesAgentID === userId || 
      sale.ClosingAgentID === userId
    )
  }, [sales, userRole, userId])

  // Unique by DealID
  const uniqueCustomers = useMemo(() => {
    return Array.from(
      new Map(
        roleFiltered.map((customer: Customer) => [customer.DealID, customer])
      ).values()
    )
  }, [roleFiltered])

  // Derive filters options
  const teams = useMemo(() => Array.from(new Set(uniqueCustomers.map(c => c.team).filter(Boolean))), [uniqueCustomers])
  const services = useMemo(() => Array.from(new Set(uniqueCustomers.map(c => c.type_service).filter(Boolean))), [uniqueCustomers])

  // Text + dropdown filters
  const filteredByQuery = useMemo(() => {
    const q = query.trim().toLowerCase()
    return uniqueCustomers.filter(c => {
      const matchesQuery = !q ||
        c.customer_name?.toLowerCase().includes(q) ||
        c.sales_agent_norm?.toLowerCase().includes(q) ||
        c.sales_agent?.toLowerCase().includes(q) ||
        c.closing_agent_norm?.toLowerCase().includes(q) ||
        c.closing_agent?.toLowerCase().includes(q) ||
        c.type_service?.toLowerCase().includes(q) ||
        c.team?.toLowerCase().includes(q)
      const matchesTeam = !teamFilter || c.team === teamFilter
      const matchesService = !serviceFilter || c.type_service === serviceFilter
      return matchesQuery && matchesTeam && matchesService
    })
  }, [uniqueCustomers, query, teamFilter, serviceFilter])

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filteredByQuery]
    arr.sort((a, b) => {
      const va = (a[sortBy] ?? '') as any
      const vb = (b[sortBy] ?? '') as any
      let cmp = 0
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb
      } else {
        cmp = String(va).localeCompare(String(vb))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filteredByQuery, sortBy, sortDir])

  // Pagination
  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const pageData = sorted.slice(start, start + pageSize)

  if (uniqueCustomers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No customers found
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle>Customer List</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search customers, agents, team, service..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              className="w-64"
            />
            <Select value={teamFilter ?? "__all__"} onValueChange={(v) => { setTeamFilter(v === '__all__' ? undefined : v); setPage(1) }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Teams</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={serviceFilter ?? "__all__"} onValueChange={(v) => { setServiceFilter(v === '__all__' ? undefined : v); setPage(1) }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Services</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Rows" /></SelectTrigger>
              <SelectContent>
                {[10,20,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" className="px-0" onClick={() => {
                    setSortBy('customer_name'); setSortDir(sortBy === 'customer_name' && sortDir === 'asc' ? 'desc' : 'asc')
                  }}>
                    Customer Name <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-0" onClick={() => {
                    setSortBy('sales_agent_norm'); setSortDir(sortBy === 'sales_agent_norm' && sortDir === 'asc' ? 'desc' : 'asc')
                  }}>
                    Sales Agent <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-0" onClick={() => {
                    setSortBy('closing_agent_norm'); setSortDir(sortBy === 'closing_agent_norm' && sortDir === 'asc' ? 'desc' : 'asc')
                  }}>
                    Closing Agent <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-0" onClick={() => {
                    setSortBy('team'); setSortDir(sortBy === 'team' && sortDir === 'asc' ? 'desc' : 'asc')
                  }}>
                    Team <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-0" onClick={() => {
                    setSortBy('type_service'); setSortDir(sortBy === 'type_service' && sortDir === 'asc' ? 'desc' : 'asc')
                  }}>
                    Service Type <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" className="px-0" onClick={() => {
                    setSortBy('amount'); setSortDir(sortBy === 'amount' && sortDir === 'asc' ? 'desc' : 'asc')
                  }}>
                    Amount <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((customer: Customer) => (
                <TableRow key={customer.DealID}>
                  <TableCell className="font-medium">
                    {customer.customer_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {customer.sales_agent_norm || customer.sales_agent}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {customer.closing_agent_norm || customer.closing_agent}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {customer.team}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {customer.type_service}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${customer.amount ? customer.amount.toFixed(2) : '0.00'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Pagination footer */}
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <div>
            Showing {pageData.length} of {total} customers
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3">Page {currentPage} / {totalPages}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  )
}
