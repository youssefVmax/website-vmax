"use client"

import React from "react"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error("App error boundary:", error)
  }, [error])

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        {error?.message && (
          <p className="text-sm text-muted-foreground break-words">{error.message}</p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium shadow hover:opacity-90"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  )
}
