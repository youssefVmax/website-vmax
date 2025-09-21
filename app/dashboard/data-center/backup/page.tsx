"use client"

import React from "react"
import SimpleBackupButton from "@/components/simple-backup-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DataCenterBackupPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Backup</CardTitle>
          <CardDescription>Download a complete backup of your Firebase database</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <SimpleBackupButton 
            variant="default" 
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            Download Complete Backup
          </SimpleBackupButton>
          <p className="text-sm text-muted-foreground mt-4">
            This will download all your Firebase data as a JSON file
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
