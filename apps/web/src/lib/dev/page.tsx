import Link from "next/link"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { listDevBoard, type DevRequestGroup } from "@/lib/dev/queries"
import { formatTicketNumber } from "@/lib/discovery/ticket"
import { cn } from "@/lib/utils"
import { type NavSection } from "@/lib/navigation"

export const dynamic = "force-dynamic"

const DEV_NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/dev", icon: "dashboard" },
      { label: "My Tasks", href: "/dev", icon: "tasks" },
    ],
  },
]

function typeLabel(type: string): string {
  if (type === "BUG" || type === "CRITICAL_BUG") return "Bug"
  if (type === "FEATURE") return "Feature"
  if (type === "IMPROVEMENT") return "Improvement"
  return "Request"
}

function isBug(type: string): boolean {
  return type === "BUG" || type === "CRITICAL_BUG"
}

const STATUS_META: Record<string, { label: string; tone: "default" | "warn" }> = {
  IN_DEV: { label: "In development", tone: "default" },
  FIX_NEEDED: { label: "Fixes needed", tone: "warn" },
}

function RequestCard({ group }: { group: DevRequestGroup }) {
  const ticket = formatTicketNumber(group.projectName, group.ticketNumber)
  const meta = STATUS_META[group.status] ?? { label: group.status, tone: "default" as const }
  const pct =
    group.taskCount > 0 ? Math.round((group.doneCount / group.taskCount) * 100) : 0

  return (
    <Link
      href={`/dev/${group.featureRequestId}`}
      className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-secondary"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {ticket ?? "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  meta.tone === "warn" ? "bg-warning" : "bg-foreground",
                )}
              />
              <span className="text-xs text-muted-foreground">{meta.label}</span>
            </span>
          </div>
          <h3 className="truncate text-sm font-medium text-foreground">{group.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {typeLabel(group.type)}
            {isBug(group.type) && group.severity != null && (
              <span className="ml-1 font-mono tabular-nums">S{group.severity}</span>
            )}
            <span className="px-1.5 text-muted-foreground/40">·</span>
            {group.projectName}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm tabular-nums text-foreground">
            {group.doneCount}/{group.taskCount}
          </p>
          <p className="text-xs text-muted-foreground">tasks</p>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-foreground transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  )
}

export default async function DevOverviewPage() {
  const ctx = await requireRole("DEVELOPER")
  const board = await listDevBoard({
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  })

  return (
    <PortalShell ctx={ctx} role="DEVELOPER" breadcrumb="My Tasks" navSections={DEV_NAV}>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            My Tasks
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Requests ready for development across your projects.
          </p>
        </header>

        {board.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">Nothing to build yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              When a product manager approves a request on your projects, its tasks will
              appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {board.map((group) => (
              <RequestCard key={group.featureRequestId} group={group} />
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  )
}