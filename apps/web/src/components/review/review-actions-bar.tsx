"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { approveAndShip, sendBackToDev } from "@/lib/review/actions"

export function ReviewActionsBar({
  featureRequestId,
  canApprove,
}: {
  featureRequestId: string
  canApprove: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = React.useState<"ship" | "back" | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [note, setNote] = React.useState("")
  const [showNote, setShowNote] = React.useState(false)

  async function handleShip() {
    setError(null)
    setBusy("ship")
    const res = await approveAndShip(featureRequestId)
    setBusy(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    router.refresh()
  }

  async function handleSendBack() {
    setError(null)
    setBusy("back")
    const res = await sendBackToDev(featureRequestId, note)
    setBusy(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setShowNote(false)
    setNote("")
    router.refresh()
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">Decision</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {canApprove
          ? "Approve to ship this change, or send it back to the developer with a note."
          : "This request is still in review or needs fixes. You can send it back with a note."}
      </p>

      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What needs to change? (optional)"
          rows={3}
          className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {canApprove && (
          <button
            onClick={handleShip}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
          >
            {busy === "ship" && <Loader2 className="h-4 w-4 animate-spin" />}
            Approve &amp; ship
          </button>
        )}
        {!showNote ? (
          <button
            onClick={() => setShowNote(true)}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
          >
            Send back to developer
          </button>
        ) : (
          <button
            onClick={handleSendBack}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
          >
            {busy === "back" && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm send back
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}
