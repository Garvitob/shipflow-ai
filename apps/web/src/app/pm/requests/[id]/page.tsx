import Link from "next/link"
import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { getPmRequestDetail } from "@/lib/pm/queries"
import { formatTicketNumber } from "@/lib/discovery/ticket"
import { PrdEditor } from "@/components/pm/prd-editor"
import { type NavSection } from "@/lib/navigation"

export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  PRD_DRAFT: "Awaiting review",
  PRD_APPROVED: "Approved",
  PLANNING: "Planning",
  IN_DEV: "In development",
  IN_REVIEW: "In review",
  FIX_NEEDED: "Fixes needed",
  PENDING_APPROVAL: "Final review",
  SHIPPED: "Shipped",
  REJECTED: "Rejected",
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

const PM_NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/pm", icon: "dashboard" },
      { label: "Requests", href: "/pm/requests", icon: "inbox" },
      { label: "Task Board", href: "/pm/tasks", icon: "board" },
    ],
  },
]

export default async function PmRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requireRole("PM")
  const detail = await getPmRequestDetail(
    { userId: ctx.userId, workspaceId: ctx.workspaceId },
    id,
  )
  if (!detail) notFound()

  const ticket = formatTicketNumber(detail.project.name, detail.ticketNumber)
  const statusLabel = STATUS_LABEL[detail.status] ?? detail.status
  const editable = detail.status === "PRD_DRAFT"

  const scopeParts: string[] = [typeLabel(detail.type)]
  if (isBug(detail.type) && detail.severity != null) {
    scopeParts.push(`Severity ${detail.severity}`)
  }
  if (detail.requestedDays != null) {
    scopeParts.push(`Needed within ${detail.requestedDays} days`)
  }

  return (
    <PortalShell ctx={ctx} role="PM" breadcrumb={ticket ?? "Request"} navSections={PM_NAV}>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/pm/requests"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Requests
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
            <span className="px-1.5 text-muted-foreground/40">·</span>
            {detail.client.name}
          </p>
        </header>

        {detail.prd ? (
          <PrdEditor
            featureRequestId={detail.id}
            version={detail.prd.version}
            editable={editable}
            initial={{
              problemStatement: detail.prd.problemStatement,
              goals: detail.prd.goals,
              nonGoals: detail.prd.nonGoals,
              userStories: detail.prd.userStories,
              edgeCases: detail.prd.edgeCases,
              successMetrics: detail.prd.successMetrics,
              acceptanceCriteria: detail.prd.acceptanceCriteria.map((c) => ({
                title: c.title,
                description: c.description,
              })),
            }}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              This request has no PRD yet.
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  )
}