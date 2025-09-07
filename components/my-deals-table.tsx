"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useNotifications } from "@/hooks/use-notifications"
import { ArrowUpDown, Download, Eye, Edit as EditIcon, RotateCcw } from "lucide-react"
import { useSalesData } from "@/hooks/useSalesData"

interface MyDealsTableProps {
  user: { id: string; name: string; username: string; role: 'manager'|'salesman'|'customer-service' }
}

export default function MyDealsTable({ user }: MyDealsTableProps) {
  // Fetch scoped rows for the salesman using streaming hook
  const { sales = [], loading, error } = useSalesData('salesman', user.id, user.name)
  const { toast } = useToast()
  const { addNotification } = useNotifications()

  const [query, setQuery] = useState("")
  const [serviceFilter, setServiceFilter] = useState<string|undefined>(undefined)
  const [teamFilter, setTeamFilter] = useState<string|undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")
  const [sortBy, setSortBy] = useState<keyof any>('date')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')

  // Quick action state
  const [viewDeal, setViewDeal] = useState<any|null>(null)
  const [editDeal, setEditDeal] = useState<any|null>(null)
  const [editNote, setEditNote] = useState<string>("")

  const enriched = useMemo(() => {
    const norm = user.name.toLowerCase().trim()
    return sales.map(s => ({
      ...s,
      role: s.sales_agent_norm?.toLowerCase() === norm || s.SalesAgentID === user.id ? 'Sales Agent' : 'Closing Agent'
    }))
  }, [sales, user])

  const services = useMemo(() => Array.from(new Set(enriched.map(s => s.type_service).filter(Boolean))), [enriched])
  const teams = useMemo(() => Array.from(new Set(enriched.map(s => s.team).filter(Boolean))), [enriched])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return enriched.filter(r => {
      const matchesQuery = !q || r.customer_name?.toLowerCase().includes(q) || r.DealID?.toLowerCase().includes(q)
      const matchesService = !serviceFilter || r.type_service === serviceFilter
      const matchesTeam = !teamFilter || r.team === teamFilter
      const d = new Date(r.date)
      const matchesFrom = !from || d >= new Date(from)
      const matchesTo = !to || d <= new Date(to)
      return matchesQuery && matchesService && matchesTeam && matchesFrom && matchesTo
    })
  }, [enriched, query, serviceFilter, teamFilter, from, to])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a,b) => {
      const get = (x:any) => {
        switch (sortBy) {
          case 'date': return new Date(x.date).getTime()
          case 'DealID': return String(x.DealID)
          case 'customer_name': return String(x.customer_name)
          case 'type_service': return String(x.type_service)
          case 'team': return String(x.team)
          case 'amount': return Number(x.amount || 0)
          default: return x[sortBy]
        }
      }
      const va:any = get(a); const vb:any = get(b)
      let cmp = 0
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb
      else cmp = String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, sortBy, sortDir])

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const pageData = sorted.slice(start, start + pageSize)

  const toggleSort = (key: keyof any) => {
    if (sortBy === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
  }

  const exportCsv = () => {
    const headers = ['date','DealID','customer_name','role','type_service','team','amount']
    const rows = sorted.map(r => [
      r.date,
      r.DealID,
      r.customer_name,
      (r as any).role,
      r.type_service,
      r.team,
      String(r.amount || 0)
    ].map(v => /[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"','""')}"` : String(v)).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my_deals_${user.username || user.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveEdit = async () => {
    // Persist via notification to manager as an audit trail
    await addNotification({
      title: 'Deal Updated',
      message: `${user.name} updated deal ${editDeal?.DealID}. Note: ${editNote}`,
      type: 'deal',
      priority: 'low',
      from: user.id,
      to: ['manager-001'],
      dealId: editDeal?.DealID,
      dealName: editDeal?.customer_name,
      dealValue: editDeal?.amount || 0,
      dealStage: 'updated',
      actionRequired: false,
    } as any)
    setEditDeal(null)
    setEditNote("")
    toast({ title: 'Saved successfully', description: 'Your changes have been recorded.' })
  }

  const handleReopen = async (deal: any) => {
    await addNotification({
      title: 'Deal Reopened',
      message: `${user.name} reopened deal ${deal?.DealID} (${deal?.customer_name}).`,
      type: 'deal',
      priority: 'medium',
      from: user.id,
      to: ['manager-001'],
      dealId: deal?.DealID,
      dealName: deal?.customer_name,
      dealValue: deal?.amount || 0,
      dealStage: 'reopened',
      actionRequired: false,
    } as any)
    toast({ title: 'Saved successfully', description: 'Deal marked as reopened.' })
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
        <div className="h-64 w-full bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-destructive">Failed to load your deals: {error.message}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle>My Deals</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="Search by customer or deal ID" value={query} onChange={(e)=>{setQuery(e.target.value); setPage(1)}} className="w-64" />
            <Select value={serviceFilter ?? ""} onValueChange={(v)=>{setServiceFilter(v||undefined); setPage(1)}}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Services</SelectItem>
                {services.map(s=> <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={teamFilter ?? ""} onValueChange={(v)=>{setTeamFilter(v||undefined); setPage(1)}}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Teams</SelectItem>
                {teams.map(t=> <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e)=>{setFrom(e.target.value); setPage(1)}} />
            <Input type="date" value={to} onChange={(e)=>{setTo(e.target.value); setPage(1)}} />
            <Select value={String(pageSize)} onValueChange={(v)=>{setPageSize(Number(v)); setPage(1)}}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Rows" /></SelectTrigger>
              <SelectContent>
                {[10,20,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" className="px-0" onClick={()=>toggleSort('date')}>
                    Date <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-0" onClick={()=>toggleSort('DealID')}>
                    Deal ID <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-0" onClick={()=>toggleSort('customer_name')}>
                    Customer <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>Role</TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-0" onClick={()=>toggleSort('type_service')}>
                    Service <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-0" onClick={()=>toggleSort('team')}>
                    Team <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" className="px-0" onClick={()=>toggleSort('amount')}>
                    Amount <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((d) => (
                <TableRow key={d.DealID}>
                  <TableCell>{new Date(d.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-xs">{d.DealID}</TableCell>
                  <TableCell className="font-medium">{d.customer_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{(d as any).role}</Badge>
                  </TableCell>
                  <TableCell>{d.type_service}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{d.team}</Badge>
                  </TableCell>
                  <TableCell className="text-right">${(d.amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={()=>setViewDeal(d)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={()=>{setEditDeal(d); setEditNote("")}}>
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={()=>handleReopen(d)}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <div>Showing {pageData.length} of {total} deals</div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={()=>setPage(p=>Math.max(1,p-1))} />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3">Page {currentPage} / {totalPages}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext onClick={()=>setPage(p=>Math.min(totalPages,p+1))} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>

        {/* View dialog */}
        <Dialog open={!!viewDeal} onOpenChange={(o)=>!o && setViewDeal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deal Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div><strong>Deal ID:</strong> {viewDeal?.DealID}</div>
              <div><strong>Date:</strong> {viewDeal ? new Date(viewDeal.date).toLocaleString() : ''}</div>
              <div><strong>Customer:</strong> {viewDeal?.customer_name}</div>
              <div><strong>Service:</strong> {viewDeal?.type_service}</div>
              <div><strong>Team:</strong> {viewDeal?.team}</div>
              <div><strong>Amount:</strong> ${viewDeal?.amount?.toFixed?.(2) ?? viewDeal?.amount}</div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={!!editDeal} onOpenChange={(o)=>!o && setEditDeal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Deal Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Add a note about this deal" value={editNote} onChange={(e)=>setEditNote(e.target.value)} />
            </div>
            <DialogFooter>
              <Button onClick={handleSaveEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
