import Link from "next/link"
import { notFound } from "next/navigation"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { getClientRequestDetail } from "@/lib/discovery/queries"
import { formatTicketNumber } from "@/lib/discovery/ticket"
import { type NavSection } from "@/lib/navigation"

export const dynamic = "force-dynamic"

const MILESTONES = ["Submitted", "Under review", "Approved", "In development", "Shipped"]

const STATUS_TO_MILESTONE: Record<string, number> = {
  SUBMITTED: 0,
  DISCOVERY: 0,
  PRD_DRAFT: 1,
  PRD_APPROVED: 2,
  PLANNING: 2,
  IN_DEV: 3,
  IN_REVIEW: 3,
  FIX_NEEDED: 3,
  PENDING_APPROVAL: 3,
  SHIPPED: 4,
  REJECTED: -1,
}

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  DISCOVERY: "Draft",
  PRD_DRAFT: "Under review",
  PRD_APPROVED: "Approved",
  PLANNING: "Planning",
  IN_DEV: "In development",
  IN_REVIEW: "In review",
  FIX_NEEDED: "Addressing feedback",
  PENDING_APPROVAL: "Final review",
  SHIPPED: "Shipped",
  REJECTED: "Declined",
}

const STATUS_DETAIL: Record<string, string> = {
  SUBMITTED: "Your request has been received.",
  DISCOVERY: "This request is still a draft.",
  PRD_DRAFT: "Your request is being reviewed by the team before any work begins.",
  PRD_APPROVED: "Approved and scheduled for development.",
  PLANNING: "The team is planning the work.",
  IN_DEV: "Your request is being built.",
  IN_REVIEW: "The work is being reviewed for quality.",
  FIX_NEEDED: "The team is addressing review feedback.",
  PENDING_APPROVAL: "A final review before this ships.",
  SHIPPED: "This has shipped.",
  REJECTED: "This request was declined. Reach out to your team for details.",
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None specified.</p>
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function LifecycleStepper({ milestone }: { milestone: number }) {
  return (
    <ol>
      {MILESTONES.map((label, i) => {
        const done = i < milestone
        const current = i === milestone
        const last = i === MILESTONES.length - 1
        return (
          <li key={label} className="flex gap-3">
            <div className="flex flex-col items-center self-stretch">
              <span
                className={cn(
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  done || current ? "bg-foreground" : "bg-muted-foreground/30",
                )}
              />
              {!last && (
                <span
                  className={cn("my-1 w-px flex-1", done ? "bg-foreground/30" : "bg-border")}
                />
              )}
            </div>
            <span
              className={cn(
                "text-sm",
                last ? "pb-0" : "pb-6",
                current
                  ? "font-medium text-foreground"
                  : done
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

const navFor = (projectId: string): NavSection[] => [
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

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>
}) {
  const { projectId, id } = await params
  const ctx = await requireRole("CLIENT")
  const detail = await getClientRequestDetail(ctx, id)
  if (!detail || detail.projectId !== projectId) notFound()

  const navSections = navFor(projectId)
  const ticket = formatTicketNumber(detail.project.name, detail.ticketNumber)
  const milestone = STATUS_TO_MILESTONE[detail.status] ?? 0
  const rejected = detail.status === "REJECTED"
  const statusLabel = STATUS_LABEL[detail.status] ?? detail.status
  const statusDetail = STATUS_DETAIL[detail.status] ?? ""

  const scopeParts: string[] = [typeLabel(detail.type)]
  if (isBug(detail.type) && detail.severity != null) {
    scopeParts.push(`Severity ${detail.severity}`)
  }
  if (detail.requestedDays != null) {
    scopeParts.push(`Needed within ${detail.requestedDays} days`)
  }

  const prd = detail.prd

  return (
    <PortalShell
      ctx={ctx}
      role="CLIENT"
      breadcrumb={ticket ?? "Request"}
      activeProjectId={projectId}
      navSections={navSections}
    >
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {ticket ?? "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  rejected ? "bg-muted-foreground/40" : "bg-foreground",
                )}
              />
              <span className="text-xs text-muted-foreground">{statusLabel}</span>
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {detail.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{scopeParts.join(" · ")}</p>
        </header>

        <section className="mb-10 rounded-lg border border-border p-5">
          {rejected ? (
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              <span className="text-sm text-muted-foreground">{statusDetail}</span>
            </div>
          ) : (
            <>
              <LifecycleStepper milestone={milestone} />
              {statusDetail && (
                <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                  {statusDetail}
                </p>
              )}
            </>
          )}
        </section>

        {prd && (
          <div>
            <h2 className="mb-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What was submitted
            </h2>
            <div className="space-y-6">
              <section>
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Problem statement
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {prd.problemStatement}
                </p>
              </section>

              <Section title="Goals">
                <BulletList items={splitLines(prd.goals)} />
              </Section>

              <Section title="Non-goals">
                <BulletList items={splitLines(prd.nonGoals)} />
              </Section>

              <Section title="User stories">
                <BulletList items={splitLines(prd.userStories)} />
              </Section>

              <Section title="Acceptance criteria">
                {prd.acceptanceCriteria.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None specified.</p>
                ) : (
                  <ol className="space-y-4">
                    {prd.acceptanceCriteria.map((ac, i) => (
                      <li key={ac.id} className="flex gap-3">
                        <span className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{ac.title}</p>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {ac.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              <Section title="Edge cases">
                <BulletList items={splitLines(prd.edgeCases)} />
              </Section>

              <Section title="Success metrics">
                <BulletList items={splitLines(prd.successMetrics)} />
              </Section>
            </div>
          </div>
        )}

        <div className="mt-10 border-t border-border pt-6">
          <Link
            href={`/portal/${projectId}`}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </PortalShell>
  )
}