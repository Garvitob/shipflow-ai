import Link from "next/link"
import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { getReviewDetail } from "@/lib/review/queries"
import { formatTicketNumber } from "@/lib/discovery/ticket"
import { ReviewActionsBar } from "@/components/review/review-actions-bar"
import { cn } from "@/lib/utils"
import { type NavSection } from "@/lib/navigation"

export const dynamic = "force-dynamic"

const REVIEW_NAV: NavSection[] = [
  { items: [{ label: "Reviews", href: "/review", icon: "tasks" }] },
]

const SEVERITY_TONE: Record<string, string> = {
  S1: "border-destructive/40 bg-destructive/10 text-destructive",
  S2: "border-destructive/30 bg-destructive/5 text-destructive",
  S3: "border-warning/40 bg-warning/10 text-warning",
  S4: "border-border bg-secondary text-muted-foreground",
  S5: "border-border bg-secondary text-muted-foreground",
}

function catLabel(c: string): string {
  return c.charAt(0) + c.slice(1).toLowerCase().replace("_", " ")
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requireRole("SENIOR_ENG")
  const detail = await getReviewDetail(
    { userId: ctx.userId, workspaceId: ctx.workspaceId },
    id,
  )
  if (!detail) notFound()

  const { request, run, pullRequest } = detail
  const ticket = formatTicketNumber(request.project.name, request.ticketNumber)
  const canApprove = request.status === "PENDING_APPROVAL"
  const findings = run?.findings ?? []
  const blocking = findings.filter((f) => f.severity === "S1" || f.severity === "S2")

  return (
    <PortalShell
      ctx={ctx}
      role="SENIOR_ENG"
      breadcrumb={ticket ?? "Review"}
      navSections={REVIEW_NAV}
    >
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/review"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Reviews
        </Link>

        <header className="mb-8 mt-5">
          <div className="mb-2 flex items-center gap-3">
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {ticket ?? "—"}
            </span>
            <span className="text-xs text-muted-foreground">{request.status}</span>
            {pullRequest && (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                PR #{pullRequest.prNumber}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {request.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{request.project.name}</p>
        </header>

        {run ? (
          <>
            <section className="mb-6 rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">AI review summary</h2>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {findings.length} finding{findings.length === 1 ? "" : "s"} · {blocking.length} blocking
                </span>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {run.reconciledResult}
              </p>
            </section>

            <section className="mb-6">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Findings</h2>
              {findings.length === 0 ? (
                <div className="rounded-lg border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
                  No issues found. The implementation satisfies the acceptance criteria.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {findings.map((f) => (
                    <article key={f.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums",
                            SEVERITY_TONE[f.severity] ?? "border-border bg-secondary text-muted-foreground",
                          )}
                        >
                          {f.severity}
                        </span>
                        <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                          {catLabel(f.category)}
                        </span>
                        <span className="text-xs text-muted-foreground">{f.criterionTitle}</span>
                      </div>
                      <h3 className="text-sm font-medium text-foreground">{f.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {f.description}
                      </p>
                      {f.quotedEvidence && (
                        <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
                          {f.quotedEvidence}
                        </pre>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="mb-6 rounded-lg border border-dashed border-border px-5 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No review run yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This request is in the queue but the AI review has not produced a result.
            </p>
          </section>
        )}

        <ReviewActionsBar featureRequestId={request.id} canApprove={canApprove} />
      </div>
    </PortalShell>
  )
}
