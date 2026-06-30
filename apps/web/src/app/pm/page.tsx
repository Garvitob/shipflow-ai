import Link from "next/link"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { listPmRequests } from "@/lib/pm/queries"
import { type NavSection } from "@/lib/navigation"

export const dynamic = "force-dynamic"

const PM_NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/pm", icon: "dashboard" },
      { label: "Requests", href: "/pm/requests", icon: "inbox" },
      { label: "Task Board", href: "/pm/tasks", icon: "board" },
    ],
  },
]

export default async function PmOverviewPage() {
  const ctx = await requireRole("PM")
  const requests = await listPmRequests({
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  })

  const awaiting = requests.filter((r) => r.status === "PRD_DRAFT").length
  const approved = requests.filter((r) =>
    ["PRD_APPROVED", "PLANNING", "IN_DEV", "IN_REVIEW", "FIX_NEEDED", "PENDING_APPROVAL"].includes(
      r.status,
    ),
  ).length
  const shipped = requests.filter((r) => r.status === "SHIPPED").length

  return (
    <PortalShell ctx={ctx} role="PM" breadcrumb="Overview" navSections={PM_NAV}>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your requests across all assigned projects.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          <Stat label="Awaiting review" value={awaiting} href="/pm/requests" />
          <Stat label="In progress" value={approved} href="/pm/requests" />
          <Stat label="Shipped" value={shipped} href="/pm/requests" />
        </div>

        <div className="mt-8">
          <Link
            href="/pm/requests"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Review requests
          </Link>
        </div>
      </div>
    </PortalShell>
  )
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="bg-card px-5 py-4 transition-colors hover:bg-secondary">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums text-foreground">{value}</p>
    </Link>
  )
}