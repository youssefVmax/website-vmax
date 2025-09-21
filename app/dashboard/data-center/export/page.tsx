"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Database, PhoneCall } from "lucide-react"
import { dealsService, Deal } from "@/lib/firebase-deals-service"
import { callbacksService, Callback } from "@/lib/firebase-callbacks-service"

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

export default function DataCenterExportPage() {
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
          dealsService.getAllDeals(),
          callbacksService.getCallbacks("manager")
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
    { key: "DealID", label: "Deal ID" },
    { key: "customer_name", label: "Customer" },
    { key: "email", label: "Email" },
    { key: "phone_number", label: "Phone" },
    { key: "service_tier", label: "Service Tier" },
    { key: "amount_paid", label: "Amount Paid" },
    { key: "sales_agent", label: "Sales Agent" },
    { key: "closing_agent", label: "Closing Agent" },
    { key: "sales_team", label: "Team" },
    { key: "status", label: "Status" },
    { key: "stage", label: "Stage" },
    { key: "signup_date", label: "Signup Date" },
  ]), [])

  const callbackHeaders = useMemo(() => ([
    { key: "customer_name", label: "Customer" },
    { key: "phone_number", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "sales_agent", label: "Sales Agent" },
    { key: "sales_team", label: "Team" },
    { key: "first_call_date", label: "First Call Date" },
    { key: "first_call_time", label: "First Call Time" },
    { key: "callback_reason", label: "Reason" },
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
    <div className="space-y-6">
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
                  <TableCell>{d.DealID || ""}</TableCell>
                  <TableCell>{d.customer_name}</TableCell>
                  <TableCell>{d.email}</TableCell>
                  <TableCell>{d.phone_number}</TableCell>
                  <TableCell>{d.service_tier}</TableCell>
                  <TableCell>{d.amount_paid}</TableCell>
                  <TableCell>{d.sales_agent}</TableCell>
                  <TableCell>{d.closing_agent}</TableCell>
                  <TableCell>{d.sales_team}</TableCell>
                  <TableCell className="capitalize">{d.status}</TableCell>
                  <TableCell className="capitalize">{d.stage}</TableCell>
                  <TableCell>{d.signup_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                  <TableCell>{c.customer_name}</TableCell>
                  <TableCell>{c.phone_number}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.sales_agent}</TableCell>
                  <TableCell>{c.sales_team}</TableCell>
                  <TableCell>{c.first_call_date}</TableCell>
                  <TableCell>{c.first_call_time}</TableCell>
                  <TableCell>{c.callback_reason}</TableCell>
                  <TableCell className="capitalize">{c.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
