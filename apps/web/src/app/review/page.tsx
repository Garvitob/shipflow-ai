import Link from "next/link"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { listReviewQueue, type ReviewRow } from "@/lib/review/queries"
import { formatTicketNumber } from "@/lib/discovery/ticket"
import { cn } from "@/lib/utils"
import { type NavSection } from "@/lib/navigation"

export const dynamic = "force-dynamic"

const REVIEW_NAV: NavSection[] = [
  { items: [{ label: "Reviews", href: "/review", icon: "tasks" }] },
]

function typeLabel(type: string): string {
  if (type === "BUG" || type === "CRITICAL_BUG") return "Bug"
  if (type === "FEATURE") return "Feature"
  if (type === "IMPROVEMENT") return "Improvement"
  return "Request"
}

const STATUS_META: Record<string, { label: string; dot: string }> = {
  IN_REVIEW: { label: "In review", dot: "bg-foreground" },
  FIX_NEEDED: { label: "Fixes needed", dot: "bg-warning" },
  PENDING_APPROVAL: { label: "Awaiting approval", dot: "bg-[var(--accent-strong,#4f46e5)]" },
  SHIPPED: { label: "Shipped", dot: "bg-success" },
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return m + "m ago"
  const h = Math.floor(m / 60)
  if (h < 24) return h + "h ago"
  return Math.floor(h / 24) + "d ago"
}

function Row({ row }: { row: ReviewRow }) {
  const ticket = formatTicketNumber(row.projectName, row.ticketNumber)
  const meta = STATUS_META[row.status] ?? { label: row.status, dot: "bg-muted-foreground" }
  return (
    <Link
      href={"/review/" + row.id}
      className="flex items-center gap-4 border-b border-border px-4 py-3 transition-colors hover:bg-secondary"
    >
      <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {ticket ?? "—"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{row.title}</span>
      <span className="hidden w-24 shrink-0 text-xs text-muted-foreground sm:block">
        {typeLabel(row.type)}
      </span>
      <span className="flex w-40 shrink-0 items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
        <span className="text-xs text-muted-foreground">{meta.label}</span>
      </span>
      <span className="hidden w-20 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground md:block">
        {timeAgo(row.updatedAt)}
      </span>
    </Link>
  )
}

export default async function ReviewQueuePage() {
  const ctx = await requireRole("SENIOR_ENG")
  const rows = await listReviewQueue({ userId: ctx.userId, workspaceId: ctx.workspaceId })

  const active = rows.filter((r) => r.status !== "SHIPPED")
  const shipped = rows.filter((r) => r.status === "SHIPPED")

  return (
    <PortalShell ctx={ctx} role="SENIOR_ENG" breadcrumb="Reviews" navSections={REVIEW_NAV}>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Reviews</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Pull requests under AI review and awaiting your approval.
          </p>
        </header>

        {active.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">Nothing in review</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              When a developer submits a pull request, it will appear here after the AI review runs.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {active.map((r) => (
              <Row key={r.id} row={r} />
            ))}
          </div>
        )}

        {shipped.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Shipped
            </h2>
            <div className="overflow-hidden rounded-lg border border-border">
              {shipped.map((r) => (
                <Row key={r.id} row={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  )
}
