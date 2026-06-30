"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { finalizeRequest } from "@/lib/discovery/actions"

export function ReviewConfirm({
  featureRequestId,
  projectId,
}: {
  featureRequestId: string
  projectId: string
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleConfirm() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    const res = await finalizeRequest(featureRequestId)
    if (res.ok) {
      router.push(`/portal/${projectId}`)
      router.refresh()
      return
    }
    setSubmitting(false)
    setError(res.error)
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        This matches what I need
      </button>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        By confirming, you agree this captures what you need. A specialist will
        review feasibility and scope before any work begins.
      </p>
    </div>
  )
}