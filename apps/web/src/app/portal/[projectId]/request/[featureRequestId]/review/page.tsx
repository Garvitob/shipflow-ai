import Link from "next/link"
import { notFound } from "next/navigation"
import { type ReactNode } from "react"
import { MessageSquarePlus } from "lucide-react"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { getClientRequestDetail } from "@/lib/discovery/queries"
import { ReviewConfirm } from "@/components/portal/review-confirm"
import { type NavSection } from "@/lib/navigation"

export const dynamic = "force-dynamic"

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

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ projectId: string; featureRequestId: string }>
}) {
  const { projectId, featureRequestId } = await params
  const ctx = await requireRole("CLIENT")
  const detail = await getClientRequestDetail(ctx, featureRequestId)
  if (!detail || detail.projectId !== projectId) notFound()

  const navSections = navFor(projectId)

  if (!detail.prd) {
    return (
      <PortalShell
        ctx={ctx}
        role="CLIENT"
        breadcrumb="Review request"
        activeProjectId={projectId}
        navSections={navSections}
      >
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">
            This request doesn&apos;t have a PRD yet
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Head back to the conversation and generate a PRD to review.
          </p>
          <Link
            href={`/portal/${projectId}/request`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Back to request
          </Link>
        </div>
      </PortalShell>
    )
  }

  const prd = detail.prd
  const submitted = detail.status !== "DISCOVERY"

  const scopeParts: string[] = [typeLabel(detail.type)]
  if (isBug(detail.type) && detail.severity != null) {
    scopeParts.push(`Severity ${detail.severity}`)
  }
  if (detail.requestedDays != null) {
    scopeParts.push(`Needed within ${detail.requestedDays} days`)
  }

  return (
    <PortalShell
      ctx={ctx}
      role="CLIENT"
      breadcrumb="Review request"
      activeProjectId={projectId}
      navSections={navSections}
    >
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {submitted ? "Submitted request" : "Draft for your review"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {detail.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {scopeParts.join(" · ")}
            {prd.version > 1 && (
              <span className="ml-2 font-mono text-xs tabular-nums">v{prd.version}</span>
            )}
          </p>
        </header>

        {submitted && (
          <div className="mb-8 rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              This request has been submitted
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              A specialist is reviewing it. You&apos;ll see progress on your dashboard.
            </p>
          </div>
        )}

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

        <div className="mt-10 border-t border-border pt-6">
          {submitted ? (
            <Link
              href={`/portal/${projectId}`}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back to dashboard
            </Link>
          ) : (
            <ReviewConfirm featureRequestId={detail.id} projectId={projectId} />
          )}
        </div>
      </div>
    </PortalShell>
  )
}