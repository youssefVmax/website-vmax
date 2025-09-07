"use client"

import { useSalesData } from "@/hooks/useSalesData"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

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

  // Filter customers based on user role
  const filteredCustomers = (sales as Customer[]).filter((sale: Customer) => 
    userRole === 'manager' || 
    sale.SalesAgentID === userId || 
    sale.ClosingAgentID === userId
  )

  // Get unique customers by DealID to avoid duplicates
  const uniqueCustomers = Array.from(
    new Map(
      filteredCustomers.map((customer: Customer) => [customer.DealID, customer])
    ).values()
  )

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
        <CardTitle>Customer List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Sales Agent</TableHead>
                <TableHead>Closing Agent</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniqueCustomers.map((customer: Customer) => (
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
      </CardContent>
    </Card>
  )
}
