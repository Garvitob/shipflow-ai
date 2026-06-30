import Link from "next/link"
import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { getDevRequestDetail } from "@/lib/dev/queries"
import { formatTicketNumber } from "@/lib/discovery/ticket"
import { KanbanBoard, type BoardTask } from "@/components/dev/kanban-board"
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

const STATUS_LABEL: Record<string, string> = {
  IN_DEV: "In development",
  FIX_NEEDED: "Fixes needed",
  IN_REVIEW: "In review",
  PENDING_APPROVAL: "Final review",
  SHIPPED: "Shipped",
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

export default async function DevRequestBoardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requireRole("DEVELOPER")
  const detail = await getDevRequestDetail(
    { userId: ctx.userId, workspaceId: ctx.workspaceId },
    id,
  )
  if (!detail || !detail.prd) notFound()

  const ticket = formatTicketNumber(detail.project.name, detail.ticketNumber)
  const statusLabel = STATUS_LABEL[detail.status] ?? detail.status
  const canSubmit = detail.status === "IN_DEV" || detail.status === "FIX_NEEDED"

  const criterionLabelById = new Map(
    detail.prd.acceptanceCriteria.map((c, i) => [
      c.id,
      `AC-${String(i + 1).padStart(2, "0")}`,
    ]),
  )

  const tasks: BoardTask[] = detail.prd.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    complexity: t.complexity,
    status: t.status as BoardTask["status"],
    criterionLabel: criterionLabelById.get(t.acceptanceCriterionId) ?? "AC",
    assignedToName: null,
    isMine: t.assignedToId === ctx.userId,
  }))

  const scopeParts: string[] = [typeLabel(detail.type)]
  if (isBug(detail.type) && detail.severity != null) {
    scopeParts.push(`Severity ${detail.severity}`)
  }

  return (
    <PortalShell
      ctx={ctx}
      role="DEVELOPER"
      breadcrumb={ticket ?? "Request"}
      navSections={DEV_NAV}
    >
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/dev"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← My Tasks
        </Link>

        <header className="mb-8 mt-5">
          <div className="mb-2 flex items-center gap-3">
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {ticket ?? "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              <span className="text-xs text-muted-foreground">{statusLabel}</span>
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {detail.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {scopeParts.join(" · ")}
            <span className="px-1.5 text-muted-foreground/40">·</span>
            {detail.project.name}
            {detail.project.gitHubRepo && (
              <>
                <span className="px-1.5 text-muted-foreground/40">·</span>
                <span className="font-mono text-xs">
                  {detail.project.gitHubRepo.repoFullName}
                </span>
              </>
            )}
          </p>
        </header>

        <KanbanBoard
          featureRequestId={detail.id}
          initialTasks={tasks}
          canSubmit={canSubmit}
        />
      </div>
    </PortalShell>
  )
}