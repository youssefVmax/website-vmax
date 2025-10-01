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
import { ArrowUpDown, Eye, Edit as EditIcon, RotateCcw } from "lucide-react"
import { apiService, Deal } from "@/lib/api-service"
import { useEffect } from "react"

interface MyDealsTableProps {
  user: { id: string; name: string; username: string; role: 'manager'|'salesman'|'team_leader' }
}

export default function MyDealsTable({ user }: MyDealsTableProps) {
  // State for deals data
  const [sales, setSales] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch deals data from API
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoading(true)
        let filters: Record<string, string> = {}
        
        if (user.role === 'salesman') {
          filters.salesAgentId = user.id
        } else if (user.role === 'team_leader' && (user as any).managedTeam) {
          filters.salesTeam = (user as any).managedTeam
        }
        
        const dealsData = await apiService.getDeals(filters)
        setSales(dealsData)
        setError(null)
      } catch (err) {
        console.error('Error fetching deals:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch deals')
        toast({
          title: "Error",
          description: "Failed to load deals data",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchDeals()
  }, [user.id, user.role])
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
  const [editEmail, setEditEmail] = useState<string>("") 
  const [editPhone, setEditPhone] = useState<string>("") 
  const [editDealName, setEditDealName] = useState<string>("")

  const enriched = useMemo(() => {
    const norm = user.name.toLowerCase().trim()
    return sales.map(s => ({
      ...s,
      role: (() => {
        const agentName = ((s as any).sales_agent_name || (s as any).sales_agent || (s as any).salesAgentName || (s as any).created_by || (s as any).createdByName || '').toLowerCase().trim()
        const agentId = (s as any).salesAgentId ?? (s as any).SalesAgentID
        return agentName === norm || agentId === user.id ? 'Sales Agent' : 'Closing Agent'
      })()
    }))
  }, [sales, user])

  const services = useMemo<string[]>(
    () => Array.from(
      new Set(
        enriched
          .map(s => s.type_service)
          .filter((x): x is string => Boolean(x))
      )
    ),
    [enriched]
  )
  const teams = useMemo<string[]>(
    () => Array.from(
      new Set(
        enriched
          .map(s => s.team)
          .filter((x): x is string => Boolean(x))
      )
    ),
    [enriched]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return enriched.filter(r => {
      const matchesQuery = !q || r.customer_name?.toLowerCase().includes(q) || r.closing_agent?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.phone_number?.toLowerCase().includes(q)
      const matchesService = !serviceFilter || r.type_service === serviceFilter
      const matchesTeam = !teamFilter || r.team === teamFilter
      const rawDate = (r as any).date ?? (r as any).signup_date ?? (r as any).signupDate ?? ''
      const d = rawDate ? new Date(rawDate) : new Date(0)
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
          case 'date': {
            const raw = x.date ?? x.signup_date ?? x.signupDate
            return raw ? new Date(raw).getTime() : 0
          }
          case 'end_date': return new Date(x.end_date || x.date).getTime()
          case 'closing_agent': return String(x.closing_agent || '')
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


  const handleSaveEdit = async () => {
    // Persist via notification to manager as an audit trail
    const updates = [];
    if (editDealName !== ((editDeal as any)?.closing_agent || '')) updates.push(`Closing Agent: ${editDealName}`);
    if (editEmail !== ((editDeal as any)?.email || '')) updates.push(`Email: ${editEmail}`);
    if (editPhone !== ((editDeal as any)?.phone_number || '')) updates.push(`Phone: ${editPhone}`);
    if (editNote) updates.push(`Note: ${editNote}`);
    
    await addNotification({
      title: 'Deal Updated',
      message: `${user.name} updated deal ${editDeal?.DealID}. Changes: ${updates.join(', ')}`,
      type: 'deal',
      priority: 'low',
      from: user.id,
      to: ['manager-001'],
      dealId: editDeal?.DealID,
      dealName: editDealName || editDeal?.customer_name,
      dealValue: editDeal?.amount || 0,
      dealStage: 'updated',
      actionRequired: false,
    } as any)
    
    setEditDeal(null)
    setEditNote("")
    setEditEmail("")
    setEditPhone("")
    setEditDealName("")
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
        <CardContent className="p-6 text-destructive">Failed to load your deals: {error}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <CardTitle>My Deals</CardTitle>
            <Input placeholder="Search by customer or deal ID" value={query} onChange={(e)=>{setQuery(e.target.value); setPage(1)}} className="w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Select value={serviceFilter ?? "__all__"} onValueChange={(v)=>{setServiceFilter(v === '__all__' ? undefined : v); setPage(1)}}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Services</SelectItem>
                {services.map(s=> <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {user.role !== 'salesman' && (
              <Select value={teamFilter ?? "__all__"} onValueChange={(v)=>{setTeamFilter(v === '__all__' ? undefined : v); setPage(1)}}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Teams</SelectItem>
                  {teams.map(t=> <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input type="date" value={from} onChange={(e)=>{setFrom(e.target.value); setPage(1)}} />
            <Input type="date" value={to} onChange={(e)=>{setTo(e.target.value); setPage(1)}} />
            <Select value={String(pageSize)} onValueChange={(v)=>{setPageSize(Number(v)); setPage(1)}}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Rows" /></SelectTrigger>
              <SelectContent>
                {[10,20,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
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
                  <Button variant="ghost" className="px-0 text-xs" onClick={()=>toggleSort('closing_agent')}>
                    Sales Agent <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-0" onClick={()=>toggleSort('end_date')}>
                    End Date <ArrowUpDown className="h-3 w-3 ml-1" />
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
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Device Key</TableHead>
                <TableHead>Device ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((d) => (
                <TableRow key={d.dealId}>
                  <TableCell className="text-sm py-2">{
                    (() => {
                      const raw = (d as any).date ?? (d as any).signup_date ?? (d as any).signupDate
                      return raw ? new Date(raw).toLocaleDateString() : 'N/A'
                    })()
                  }</TableCell>
                  <TableCell className="font-medium text-sm">{
                    (d as any).sales_agent_name || d.salesAgentName ||
                    (d as any).created_by || (d as any).createdByName ||
                    (d as any).closing_agent || 'N/A'
                  }</TableCell>
                  <TableCell className="text-sm">{(d as any).end_date ? new Date((d as any).end_date).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="font-medium text-sm py-2">{d.customer_name}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-xs px-2 py-1">{(d as any).role}</Badge>
                  </TableCell>
                  <TableCell className="text-sm py-2">{d.type_service}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant="secondary" className="text-xs px-2 py-1">{d.team}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm py-2">${(d.amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-sm py-2">{(d as any).email || 'N/A'}</TableCell>
                  <TableCell className="text-sm py-2">{(d as any).phone_number || 'N/A'}</TableCell>
                  <TableCell className="font-mono text-xs py-2">{(d as any).device_key || 'N/A'}</TableCell>
                  <TableCell className="font-mono text-xs py-2">{(d as any).device_id || 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-1 py-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={()=>setViewDeal(d)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={()=>{
                      setEditDeal(d); 
                      setEditNote("");
                      setEditEmail((d as any).email || "");
                      setEditPhone((d as any).phone_number || "");
                      setEditDealName((d as any).closing_agent || "");
                    }}>
                      <EditIcon className="h-3 w-3" />
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
          <DialogContent aria-describedby="view-deal-description">
            <DialogHeader>
              <DialogTitle>Deal Details</DialogTitle>
            </DialogHeader>
            <div id="view-deal-description" className="sr-only">
              View detailed information about the selected deal
            </div>
            <div className="space-y-2 text-sm">
              <div><strong>Closing Agent:</strong> {(viewDeal as any)?.closing_agent || 'N/A'}</div>
              <div><strong>Date:</strong> {viewDeal ? new Date(viewDeal.date).toLocaleString() : ''}</div>
              <div><strong>End Date:</strong> {(viewDeal as any)?.end_date ? new Date((viewDeal as any).end_date).toLocaleString() : 'N/A'}</div>
              <div><strong>Customer:</strong> {viewDeal?.customer_name}</div>
              <div><strong>Email:</strong> {(viewDeal as any)?.email || 'N/A'}</div>
              <div><strong>Phone:</strong> {(viewDeal as any)?.phone_number || 'N/A'}</div>
              <div><strong>Service:</strong> {viewDeal?.type_service}</div>
              <div><strong>Team:</strong> {viewDeal?.team}</div>
              <div><strong>Amount:</strong> ${viewDeal?.amount?.toFixed?.(2) ?? viewDeal?.amount}</div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={!!editDeal} onOpenChange={(o)=>!o && setEditDeal(null)}>
          <DialogContent aria-describedby="edit-deal-description">
            <DialogHeader>
              <DialogTitle>Edit Deal Information</DialogTitle>
            </DialogHeader>
            <div id="edit-deal-description" className="sr-only">
              Edit deal information including name, email, phone, and notes
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Closing Agent</label>
                <Input placeholder="Closing agent name" value={editDealName} onChange={(e)=>setEditDealName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input placeholder="Customer email" value={editEmail} onChange={(e)=>setEditEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input placeholder="Customer phone number" value={editPhone} onChange={(e)=>setEditPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input placeholder="Add a note about this deal" value={editNote} onChange={(e)=>setEditNote(e.target.value)} />
              </div>
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
