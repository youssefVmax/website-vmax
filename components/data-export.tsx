"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Database, PhoneCall } from "lucide-react"
import { apiService, Deal, Callback } from "@/lib/api-service"

function toCSV(rows: any[], headers: { key: string; label: string }[]): string {
  if (!rows || rows.length === 0) return ""
  const escape = (val: any) => {
    if (val === null || val === undefined) return ""
    const str = typeof val === "object" ? JSON.stringify(val) : String(val)
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return '"' + str.replaceAll('"', '""') + '"'
    }
    return str
  }
  const headerRow = headers.map(h => h.label).join(",")
  const dataRows = rows.map(row => headers.map(h => escape((row as any)[h.key])).join(","))
  return [headerRow, ...dataRows].join("\n")
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function DataExportPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [callbacks, setCallbacks] = useState<Callback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const [allDeals, allCallbacks] = await Promise.all([
          apiService.getDeals(),
          apiService.getCallbacks()
        ])
        setDeals(allDeals)
        setCallbacks(allCallbacks)
      } catch (e: any) {
        console.error("Failed to load data for export", e)
        setError("Failed to load data. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const dealHeaders = useMemo(() => ([
    { key: "dealId", label: "Deal ID" },
    { key: "customerName", label: "Customer" },
    { key: "email", label: "Email" },
    { key: "phoneNumber", label: "Phone" },
    { key: "serviceTier", label: "Service Tier" },
    { key: "amountPaid", label: "Amount Paid" },
    { key: "salesAgentName", label: "Sales Agent" },
    { key: "closingAgentName", label: "Closing Agent" },
    { key: "salesTeam", label: "Team" },
    { key: "status", label: "Status" },
    { key: "stage", label: "Stage" },
    { key: "signupDate", label: "Signup Date" },
  ]), [])

  const callbackHeaders = useMemo(() => ([
    { key: "customerName", label: "Customer" },
    { key: "phoneNumber", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "salesAgentName", label: "Sales Agent" },
    { key: "salesTeam", label: "Team" },
    { key: "firstCallDate", label: "First Call Date" },
    { key: "firstCallTime", label: "First Call Time" },
    { key: "callbackReason", label: "Reason" },
    { key: "status", label: "Status" },
  ]), [])

  const exportDealsCSV = () => {
    const csv = toCSV(deals, dealHeaders)
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    downloadCSV(`deals-export-${ts}.csv`, csv)
  }

  const exportCallbacksCSV = () => {
    const csv = toCSV(callbacks, callbackHeaders)
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    downloadCSV(`callbacks-export-${ts}.csv`, csv)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Export</h1>
          <p className="text-muted-foreground">View all deals and callbacks and export them as CSV files</p>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-10 text-center">Loading data...</CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-6 text-red-600">{error}</CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          {/* Deals Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Deals ({deals.length})
                </CardTitle>
                <CardDescription>All deals in the system</CardDescription>
              </div>
              <Button onClick={exportDealsCSV}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {dealHeaders.map(h => (
                      <TableHead key={h.key}>{h.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((d, idx) => (
                    <TableRow key={d.id || idx}>
                      <TableCell>{d.dealId || ""}</TableCell>
                      <TableCell>{d.customerName}</TableCell>
                      <TableCell>{d.email}</TableCell>
                      <TableCell>{d.phoneNumber}</TableCell>
                      <TableCell>{d.serviceTier}</TableCell>
                      <TableCell>{d.amountPaid}</TableCell>
                      <TableCell>{d.salesAgentName}</TableCell>
                      <TableCell>{d.closingAgentName}</TableCell>
                      <TableCell>{d.salesTeam}</TableCell>
                      <TableCell className="capitalize">{d.status}</TableCell>
                      <TableCell className="capitalize">{d.stage}</TableCell>
                      <TableCell>{d.signupDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Callbacks Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5" />
                  Callbacks ({callbacks.length})
                </CardTitle>
                <CardDescription>All callbacks in the system</CardDescription>
              </div>
              <Button onClick={exportCallbacksCSV}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {callbackHeaders.map(h => (
                      <TableHead key={h.key}>{h.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callbacks.map((c, idx) => (
                    <TableRow key={c.id || idx}>
                      <TableCell>{c.customerName}</TableCell>
                      <TableCell>{c.phoneNumber}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.salesAgentId}</TableCell>
                      <TableCell>{c.salesTeam}</TableCell>
                      <TableCell>{c.firstCallDate}</TableCell>
                      <TableCell>{c.firstCallTime}</TableCell>
                      <TableCell>{c.callbackReason}</TableCell>
                      <TableCell className="capitalize">{c.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
