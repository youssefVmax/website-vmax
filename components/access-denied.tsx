"use client"

import { Shield, Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AccessDeniedProps {
  feature: string
}

export default function AccessDenied({ feature }: AccessDeniedProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md mx-auto bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-500/20 rounded-full w-fit">
            <Lock className="h-8 w-8 text-red-400" />
          </div>
          <CardTitle className="text-xl font-bold text-white">
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              You don't have permission to access <strong>{feature}</strong>.
            </AlertDescription>
          </Alert>
          <div className="text-center text-slate-400 text-sm">
            <p>This feature is restricted to managers only.</p>
            <p className="mt-2">Please contact your system administrator if you need access.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
