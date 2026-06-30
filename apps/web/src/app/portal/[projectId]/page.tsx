import Link from "next/link"
import { notFound } from "next/navigation"
import { MessageSquarePlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { listClientRequests, type ClientRequestRow } from "@/lib/discovery/queries"
import { formatTicketNumber } from "@/lib/discovery/ticket"
import { type NavSection } from "@/lib/navigation"

export const dynamic = "force-dynamic"

const STATUS_META: Record<string, { label: string; active: boolean }> = {
  DISCOVERY: { label: "Draft", active: false },
  SUBMITTED: { label: "Submitted", active: true },
  PRD_DRAFT: { label: "Under review", active: true },
  PRD_APPROVED: { label: "Approved", active: true },
  PLANNING: { label: "Planning", active: true },
  IN_DEV: { label: "In development", active: true },
  IN_REVIEW: { label: "In review", active: true },
  FIX_NEEDED: { label: "Addressing feedback", active: true },
  PENDING_APPROVAL: { label: "Final review", active: true },
  SHIPPED: { label: "Shipped", active: true },
  REJECTED: { label: "Declined", active: false },
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
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

const GRID = "grid grid-cols-[130px_1fr_120px_160px_90px] items-center gap-4"

function RequestRow({
  row,
  projectName,
  projectId,
}: {
  row: ClientRequestRow
  projectName: string
  projectId: string
}) {
  const ticket = formatTicketNumber(projectName, row.ticketNumber)
  const meta = STATUS_META[row.status] ?? { label: row.status, active: false }

  return (
    <Link
      href={`/portal/${projectId}/tickets/${row.id}`}
      className={cn(GRID, "border-t border-border px-4 py-3 transition-colors hover:bg-secondary")}
    >
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {ticket ?? "Draft"}
      </span>
      <span className="min-w-0 truncate text-sm text-foreground">{row.title}</span>
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

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const ctx = await requireRole("CLIENT")
  const data = await listClientRequests(ctx, projectId)
  if (!data) notFound()

  const { project, requests } = data
  const active = requests.filter((r) => r.status !== "SHIPPED")
  const shipped = requests.filter((r) => r.status === "SHIPPED")

  const navSections: NavSection[] = [
    {
      items: [
        { label: "Dashboard", href: `/portal/${projectId}`, icon: "dashboard" },
        {
          label: "Generate request",
          href: `/portal/${projectId}/request`,
          icon: "newRequest",
        },
      ],
    },
  ]

  return (
    <PortalShell
      ctx={ctx}
      role="CLIENT"
      breadcrumb={project.name}
      activeProjectId={projectId}
      navSections={navSections}
    >
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Requests
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Track everything you have raised for {project.name}.
            </p>
          </div>
          <Link
            href={`/portal/${projectId}/request`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Generate request
          </Link>
        </header>

        {requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No requests yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Raise your first request and a specialist will help shape it into a
              clear plan for your team to build.
            </p>
            <Link
              href={`/portal/${projectId}/request`}
              className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Generate request
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="overflow-hidden rounded-lg border border-border">
                <div
                  className={cn(
                    GRID,
                    "bg-secondary/40 px-4 py-2.5 text-xs font-medium text-muted-foreground",
                  )}
                >
                  <span>Ticket</span>
                  <span>Request</span>
                  <span>Type</span>
                  <span>Status</span>
                  <span className="text-right">Updated</span>
                </div>
                {active.length > 0 ? (
                  active.map((row) => (
                    <RequestRow
                      key={row.id}
                      row={row}
                      projectName={project.name}
                      projectId={projectId}
                    />
                  ))
                ) : (
                  <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground">
                    Nothing in progress right now.
                  </p>
                )}
              </div>
            </section>

            {shipped.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recently shipped
                </h2>
                <div className="overflow-hidden rounded-lg border border-border">
                  {shipped.map((row, i) => {
                    const ticket = formatTicketNumber(project.name, row.ticketNumber)
                    return (
                      <Link
                        key={row.id}
                        href={`/portal/${projectId}/tickets/${row.id}`}
                        className={cn(
                          "flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-secondary",
                          i > 0 && "border-t border-border",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">
                            {ticket ?? "—"}
                          </span>
                          <span className="min-w-0 truncate text-sm text-foreground">
                            {row.title}
                          </span>
                        </div>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {timeAgo(row.updatedAt)}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PortalShell>
  )
}