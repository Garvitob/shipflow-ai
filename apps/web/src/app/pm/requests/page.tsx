import Link from "next/link"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { listPmRequests, type PmRequestRow } from "@/lib/pm/queries"
import { formatTicketNumber } from "@/lib/discovery/ticket"
import { cn } from "@/lib/utils"
import { type NavSection } from "@/lib/navigation"

export const dynamic = "force-dynamic"

const STATUS_META: Record<string, { label: string; active: boolean }> = {
  PRD_DRAFT: { label: "Awaiting review", active: true },
  PRD_APPROVED: { label: "Approved", active: true },
  PLANNING: { label: "Planning", active: true },
  IN_DEV: { label: "In development", active: true },
  IN_REVIEW: { label: "In review", active: true },
  FIX_NEEDED: { label: "Fixes needed", active: true },
  PENDING_APPROVAL: { label: "Final review", active: true },
  SHIPPED: { label: "Shipped", active: false },
  REJECTED: { label: "Rejected", active: false },
}

function typeLabel(type: string): string {
  if (type === "BUG" || type === "CRITICAL_BUG") return "Bug"
  if (type === "FEATURE") return "Feature"
  if (type === "IMPROVEMENT") return "Improvement"
  return "Request"
}

function isBug(type: string): boolean {
  return type === "BUG" || type === "CRITICAL_BUG"
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

const PM_NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/pm", icon: "dashboard" },
      { label: "Requests", href: "/pm/requests", icon: "inbox" },
      { label: "Task Board", href: "/pm/tasks", icon: "board" },
    ],
  },
]

const GRID = "grid grid-cols-[110px_1fr_140px_120px_110px_150px] items-center gap-4"

function Row({ row }: { row: PmRequestRow }) {
  const ticket = formatTicketNumber(row.project.name, row.ticketNumber)
  const meta = STATUS_META[row.status] ?? { label: row.status, active: false }

  return (
    <Link
      href={`/pm/requests/${row.id}`}
      className={cn(GRID, "border-t border-border px-4 py-3 transition-colors hover:bg-secondary")}
    >
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {ticket ?? "—"}
      </span>
      <span className="min-w-0 truncate text-sm text-foreground">{row.title}</span>
      <span className="truncate text-sm text-muted-foreground">{row.project.name}</span>
      <span className="text-sm text-muted-foreground">
        {typeLabel(row.type)}
        {isBug(row.type) && row.severity != null && (
          <span className="ml-1 font-mono text-xs tabular-nums text-muted-foreground/80">
            S{row.severity}
          </span>
        )}
      </span>
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            meta.active ? "bg-foreground" : "bg-muted-foreground/40",
          )}
        />
        <span className="truncate text-sm text-muted-foreground">{meta.label}</span>
      </span>
      <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
        {timeAgo(row.updatedAt)}
      </span>
    </Link>
  )
}

export default async function PmRequestsPage() {
  const ctx = await requireRole("PM")
  const requests = await listPmRequests({
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  })

  const awaiting = requests.filter((r) => r.status === "PRD_DRAFT")
  const rest = requests.filter((r) => r.status !== "PRD_DRAFT")

  return (
    <PortalShell ctx={ctx} role="PM" breadcrumb="Requests" navSections={PM_NAV}>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Requests
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Review and approve client requests across your projects.
          </p>
        </header>

        {requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No requests yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              When clients submit requests on your projects, they will appear here for
              review.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Awaiting review
                <span className="ml-2 font-mono tabular-nums text-muted-foreground/70">
                  {awaiting.length}
                </span>
              </h2>
              {awaiting.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <div
                    className={cn(
                      GRID,
                      "bg-secondary/40 px-4 py-2.5 text-xs font-medium text-muted-foreground",
                    )}
                  >
                    <span>Ticket</span>
                    <span>Request</span>
                    <span>Project</span>
                    <span>Type</span>
                    <span>Status</span>
                    <span className="text-right">Updated</span>
                  </div>
                  {awaiting.map((row) => (
                    <Row key={row.id} row={row} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nothing awaiting review right now.
                  </p>
                </div>
              )}
            </section>

            {rest.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  In flight
                </h2>
                <div className="overflow-hidden rounded-lg border border-border">
                  <div
                    className={cn(
                      GRID,
                      "bg-secondary/40 px-4 py-2.5 text-xs font-medium text-muted-foreground",
                    )}
                  >
                    <span>Ticket</span>
                    <span>Request</span>
                    <span>Project</span>
                    <span>Type</span>
                    <span>Status</span>
                    <span className="text-right">Updated</span>
                  </div>
                  {rest.map((row) => (
                    <Row key={row.id} row={row} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PortalShell>
  )
}