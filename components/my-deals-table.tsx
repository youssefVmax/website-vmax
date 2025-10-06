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

// Helper function to get program type from deal data
const getProgramType = (deal: any) => {
  // First check if program_type is explicitly set
  if (deal.program_type && deal.program_type !== 'None Selected' && deal.program_type !== null) {
    return deal.program_type;
  }
  if (deal.programType && deal.programType !== 'None Selected' && deal.programType !== null) {
    return deal.programType;
  }
  
  // If not, calculate from boolean service feature fields
  if (deal.is_ibo_player === true || deal.is_ibo_player === 1) return 'IBO Player';
  if (deal.is_bob_player === true || deal.is_bob_player === 1) return 'BOB Player';
  if (deal.is_smarters === true || deal.is_smarters === 1) return 'Smarters';
  if (deal.is_ibo_pro === true || deal.is_ibo_pro === 1) return 'IBO Pro';
  if (deal.is_iboss === true || deal.is_iboss === 1) return 'IBOSS';
  
  // For legacy deals without any program type data, default to IBO Player
  // This provides a reasonable fallback for existing deals
  return 'Not Selected';
};

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
          // Team leaders should use managedTeam parameter for proper API filtering
          filters.managedTeam = (user as any).managedTeam
        }
        
        // Add user context for proper role-based filtering
        const userContext = {
          userRole: user.role,
          userId: user.id,
          managedTeam: (user as any).managedTeam
        }
        
        const dealsData = await apiService.getDeals(filters, userContext)
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
          .map(s => (s as any).service_tier || s.serviceTier)
          .filter((x): x is string => Boolean(x))
      )
    ),
    [enriched]
  )
  const teams = useMemo<string[]>(
    () => Array.from(
      new Set(
        enriched
          .map(s => (s as any).sales_team || s.salesTeam)
          .filter((x): x is string => Boolean(x))
      )
    ),
    [enriched]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return enriched.filter(r => {
      const customerName = (r as any).customer_name || r.customerName || ''
      const closingAgent = (r as any).closing_agent || (r as any).closingAgentName || (r as any).sales_agent || r.salesAgentName || ''
      const email = (r as any).email || ''
      const phoneNumber = (r as any).phone_number || r.phoneNumber || ''
      
      const matchesQuery = !q || 
        customerName.toLowerCase().includes(q) || 
        closingAgent.toLowerCase().includes(q) || 
        email.toLowerCase().includes(q) || 
        phoneNumber.toLowerCase().includes(q)
        
      const matchesService = !serviceFilter || (r as any).service_tier === serviceFilter || r.serviceTier === serviceFilter
      const matchesTeam = !teamFilter || (r as any).sales_team === teamFilter || r.salesTeam === teamFilter
      const rawDate = (r as any).date ?? (r as any).signup_date ?? (r as any).signupDate ?? r.signupDate ?? ''
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
            const raw = x.date ?? x.signup_date ?? x.signupDate ?? x.created_at
            return raw ? new Date(raw).getTime() : 0
          }
          case 'end_date': return new Date(x.end_date || x.endDate || x.date).getTime()
          case 'closing_agent': return String(x.sales_agent_name || x.sales_agent || x.salesAgentName || '')
          case 'customer_name': return String(x.customer_name || x.customerName || '')
          case 'type_service': return String(x.service_tier || x.serviceTier || x.type_service || '')
          case 'team': return String(x.sales_team || x.salesTeam || x.team || '')
          case 'amount': return Number(x.amount_paid || x.amountPaid || x.amount || 0)
          case 'username': return String(x.username || x.user_name || '')
          case 'duration': return Number(x.duration_months || x.durationMonths || 0)
          case 'program': return String(x.type_program || x.program_type || x.program || '')
          case 'users': return Number(x.number_of_users || x.no_user || x.numberOfUsers || 1)
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
    
    const customerName = editDealName || editDeal?.customer_name || 'Unknown Customer';
    
    await addNotification({
      title: 'Deal Updated',
      message: `${user.name} updated deal for ${customerName}. Changes: ${updates.join(', ')}`,
      type: 'deal',
      priority: 'low',
      from: user.id,
      to: ['manager-001', user.id], // Include the user who made the update
      dealId: editDeal?.DealID,
      dealName: customerName,
      dealValue: editDeal?.amount_paid || 0,
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
      dealValue: deal?.amount_paid || 0,
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
            {user.role === 'manager' && (
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
                <TableHead className="w-24">
                  <Button variant="ghost" className="px-0 text-xs" onClick={()=>toggleSort('date')}>
                    Date <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-32">
                  <Button variant="ghost" className="px-0 text-xs" onClick={()=>toggleSort('customer_name')}>
                    Customer <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-28">Contact</TableHead>
                <TableHead className="w-20 text-right">
                  <Button variant="ghost" className="px-0 text-xs" onClick={()=>toggleSort('amount')}>
                    Amount <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-28">
                  <Button variant="ghost" className="px-0 text-xs" onClick={()=>toggleSort('closing_agent')}>
                    Sales Agent <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-28">Closing Agent</TableHead>
                <TableHead className="w-24">
                  <Button variant="ghost" className="px-0 text-xs" onClick={()=>toggleSort('team')}>
                    Team <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-20">Duration</TableHead>
                <TableHead className="w-24">Program</TableHead>
                <TableHead className="w-20">
                  <Button variant="ghost" className="px-0 text-xs" onClick={()=>toggleSort('type_service')}>
                    Service <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-20">Users</TableHead>
                <TableHead className="w-32">Device Info</TableHead>
                <TableHead className="w-24">
                  <Button variant="ghost" className="px-0 text-xs" onClick={()=>toggleSort('end_date')}>
                    End Date <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((d, index) => (
                <TableRow key={(d as any).id || (d as any).dealId || `${index}_${(d as any).customer_name}_${(d as any).date}`}>
                  {/* Date */}
                  <TableCell className="text-xs py-2">{
                    (() => {
                      const raw = (d as any).date ?? (d as any).signup_date ?? (d as any).signupDate ?? (d as any).created_at
                      return raw ? new Date(raw).toLocaleDateString() : 'N/A'
                    })()
                  }</TableCell>
                  
                  {/* Customer */}
                  <TableCell className="font-medium text-xs py-2">{
                    (d as any).customer_name || d.customerName || 'N/A'
                  }</TableCell>
                  
                  {/* Contact (Phone + Email) */}
                  <TableCell className="text-xs py-2">
                    <div className="space-y-1">
                      <div>{(d as any).phone_number || (d as any).phone || d.phoneNumber || 'No Phone'}</div>
                      <div className="text-muted-foreground">{(d as any).email || 'No Email'}</div>
                    </div>
                  </TableCell>
                  
                  {/* Amount */}
                  <TableCell className="text-right text-xs py-2 font-medium">
                    <div className="text-right">
                      ${((d as any).amount_paid || d.amountPaid || (d as any).amount || 0).toFixed(2)}
                    </div>
                  </TableCell>
                  
                  {/* Sales Agent */}
                  <TableCell className="text-xs py-2">{
                    (d as any).sales_agent_name || (d as any).sales_agent || d.salesAgentName ||
                    (d as any).created_by || (d as any).createdByName || 'N/A'
                  }</TableCell>
                  
                  {/* Closing Agent */}
                  <TableCell className="text-xs py-2">{
                    (d as any).closing_agent_name || (d as any).closing_agent || (d as any).closingAgentName || 'N/A'
                  }</TableCell>
                  
                  {/* Team */}
                  <TableCell className="py-2">
                    <Badge variant="secondary" className="text-xs px-2 py-1">{
                      (d as any).sales_team || d.salesTeam || (d as any).team || 'N/A'
                    }</Badge>
                  </TableCell>
                  
                  {/* Duration */}
                  <TableCell className="py-2">
                    <div className="flex flex-col">
                      {(() => {
                        const years = (d as any).duration_years || d.durationYears || 0;
                        const months = (d as any).duration_months || d.durationMonths || 0;
                        const durLabel = (d as any).duration || (d as any).duration_label;
                        
                        // If there's a custom duration label, use it
                        if (durLabel) {
                          return (
                            <>
                              <div className="font-medium text-sm">{durLabel}</div>
                              <div className="text-xs text-muted-foreground">Custom duration</div>
                            </>
                          );
                        }
                        
                        if (years > 0 && months > 0) {
                          return (
                            <>
                              <div className="font-medium text-sm">{years}y {months}m</div>
                              <div className="text-xs text-muted-foreground">
                                {years === 1 ? '1 year' : `${years} years`} + {months === 1 ? '1 month' : `${months} months`}
                              </div>
                            </>
                          );
                        } else if (years > 0) {
                          return (
                            <>
                              <div className="font-medium text-sm">{years}y</div>
                              <div className="text-xs text-muted-foreground">
                                {years === 1 ? '1 year' : `${years} years`}
                              </div>
                            </>
                          );
                        } else if (months > 0) {
                          return (
                            <>
                              <div className="font-medium text-sm">{months}m</div>
                              <div className="text-xs text-muted-foreground">
                                {months === 1 ? '1 month' : `${months} months`}
                              </div>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <div className="font-medium text-sm">N/A</div>
                              <div className="text-xs text-muted-foreground">No duration</div>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </TableCell>
                  
                  {/* Program */}
                  <TableCell className="text-xs py-2">
                    <Badge variant="outline" className="text-xs">
                      {getProgramType(d)}
                    </Badge>
                  </TableCell>
                  
                  {/* Service */}
                  <TableCell className="text-xs py-2">
                    <Badge variant={
                      ((d as any).service_tier || d.serviceTier) === 'GOLD' ? 'default' :
                      ((d as any).service_tier || d.serviceTier) === 'PREMIUM' ? 'secondary' : 'outline'
                    } className="text-xs">{
                      (d as any).service_tier || d.serviceTier || (d as any).type_service || 'N/A'
                    }</Badge>
                  </TableCell>
                  
                  {/* Users */}
                  <TableCell className="text-xs py-2 text-center">{
                    (d as any).number_of_users || (d as any).no_user || (d as any).numberOfUsers || '1'
                  }</TableCell>
                  
                  {/* Device Info */}
                  <TableCell className="text-xs py-2">
                    <div className="space-y-1 font-mono">
                      <div className="text-blue-600">ID: {(d as any).device_id || 'N/A'}</div>
                      <div className="text-green-600 truncate max-w-24" title={(d as any).device_key || 'N/A'}>
                        Key: {((d as any).device_key || 'N/A').substring(0, 8)}{(d as any).device_key && (d as any).device_key.length > 8 ? '...' : ''}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* End Date */}
                  <TableCell className="text-xs py-2">{
                    (() => {
                      const endDate = (d as any).end_date || (d as any).endDate
                      return endDate ? new Date(endDate).toLocaleDateString() : 'N/A'
                    })()
                  }</TableCell>
                  
                  {/* Actions */}
                  <TableCell className="text-right space-x-1 py-2">
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>setViewDeal(d)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>{
                        setEditDeal(d); 
                        setEditNote("");
                        setEditEmail((d as any).email || "");
                        setEditPhone((d as any).phone_number || "");
                        setEditDealName((d as any).closing_agent || "");
                      }}>
                        <EditIcon className="h-3 w-3" />
                      </Button>
                    </div>
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
          <DialogContent aria-describedby="view-deal-description" className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Deal Details</DialogTitle>
            </DialogHeader>
            <div id="view-deal-description" className="sr-only">
              View detailed information about the selected deal
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Customer Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base border-b pb-2">Customer Information</h4>
                <div><strong>Customer Name:</strong> {(viewDeal as any)?.customer_name || viewDeal?.customerName || 'N/A'}</div>
                <div><strong>Email:</strong> {(viewDeal as any)?.email || 'N/A'}</div>
                <div><strong>Phone:</strong> {(viewDeal as any)?.phone_number || (viewDeal as any)?.phone || viewDeal?.phoneNumber || 'N/A'}</div>
                <div><strong>Username:</strong> {(viewDeal as any)?.username || (viewDeal as any)?.user_name || 'N/A'}</div>
              </div>

              {/* Deal Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base border-b pb-2">Deal Information</h4>
                <div><strong>Amount:</strong> ${((viewDeal as any)?.amount_paid || viewDeal?.amountPaid || (viewDeal as any)?.amount || 0).toFixed?.(2) ?? ((viewDeal as any)?.amount_paid || viewDeal?.amountPaid || 0)}</div>
                <div><strong>Date:</strong> {viewDeal ? (() => {
                  const raw = (viewDeal as any).date ?? (viewDeal as any).signup_date ?? (viewDeal as any).signupDate ?? (viewDeal as any).created_at
                  return raw ? new Date(raw).toLocaleString() : 'N/A'
                })() : 'N/A'}</div>
                <div><strong>End Date:</strong> {(() => {
                  const endDate = (viewDeal as any)?.end_date || (viewDeal as any)?.endDate
                  return endDate ? new Date(endDate).toLocaleString() : 'N/A'
                })()}</div>
                <div><strong>Duration:</strong> {(() => {
                  const years = (viewDeal as any)?.duration_years || viewDeal?.durationYears || 0;
                  const months = (viewDeal as any)?.duration_months || viewDeal?.durationMonths || 0;
                  const durLabel = (viewDeal as any)?.duration || (viewDeal as any)?.duration_label;
                  
                  if (durLabel) return durLabel;
                  
                  if (years > 0 && months > 0) {
                    return `${years} ${years === 1 ? 'year' : 'years'} and ${months} ${months === 1 ? 'month' : 'months'}`;
                  } else if (years > 0) {
                    return `${years} ${years === 1 ? 'year' : 'years'}`;
                  } else if (months > 0) {
                    return `${months} ${months === 1 ? 'month' : 'months'}`;
                  } else {
                    return 'No duration specified';
                  }
                })()}</div>
              </div>

              {/* Agent Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base border-b pb-2">Agent Information</h4>
                <div><strong>Sales Agent:</strong> {(viewDeal as any)?.sales_agent_name || (viewDeal as any)?.sales_agent || viewDeal?.salesAgentName || 'N/A'}</div>
                <div><strong>Closing Agent:</strong> {(viewDeal as any)?.closing_agent_name || (viewDeal as any)?.closing_agent || (viewDeal as any)?.closingAgentName || 'N/A'}</div>
                <div><strong>Team:</strong> {(viewDeal as any)?.sales_team || viewDeal?.salesTeam || (viewDeal as any)?.team || 'N/A'}</div>
              </div>

              {/* Service Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base border-b pb-2">Service Information</h4>
                <div><strong>Program Type:</strong> {(viewDeal as any)?.type_program || (viewDeal as any)?.program_type || (viewDeal as any)?.program || 'N/A'}</div>
                <div><strong>Service Tier:</strong> {(viewDeal as any)?.service_tier || viewDeal?.serviceTier || (viewDeal as any)?.type_service || 'N/A'}</div>
                <div><strong>Number of Users:</strong> {(viewDeal as any)?.number_of_users || (viewDeal as any)?.no_user || (viewDeal as any)?.numberOfUsers || '1'}</div>
                <div><strong>Invoice:</strong> {(viewDeal as any)?.invoice || (viewDeal as any)?.invoice_link || 'N/A'}</div>
              </div>

              {/* Device Information */}
              <div className="space-y-3 md:col-span-2">
                <h4 className="font-semibold text-base border-b pb-2">Device Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><strong>Device ID:</strong> <span className="font-mono text-blue-600">{(viewDeal as any)?.device_id || 'N/A'}</span></div>
                  <div><strong>Device Key:</strong> <span className="font-mono text-green-600 break-all">{(viewDeal as any)?.device_key || 'N/A'}</span></div>
                </div>
              </div>

              {/* Comments */}
              {((viewDeal as any)?.comment || (viewDeal as any)?.notes || (viewDeal as any)?.comments) && (
                <div className="space-y-3 md:col-span-2">
                  <h4 className="font-semibold text-base border-b pb-2">Comments</h4>
                  <div className="bg-muted p-3 rounded-md">{(viewDeal as any)?.comment || (viewDeal as any)?.notes || (viewDeal as any)?.comments}</div>
                </div>
              )}
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
