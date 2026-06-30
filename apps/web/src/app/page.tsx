import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MarketingNav } from "@/components/marketing/marketing-nav"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { Hero } from "@/components/marketing/hero"
import { Pipeline } from "@/components/marketing/pipeline"
import { Reveal } from "@/components/marketing/reveal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "ShipFlow AI — AI-governed delivery, accountable to the spec",
  description:
    "Turn plain-language feature requests into reviewed, shipped code. Dual-AI review gated on acceptance criteria, with full traceability from request to ship.",
}

/* ─── small presentational primitives ──────────────────── */

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  )
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}

function Severity({ level }: { level: string }) {
  const high = level === "S1" || level === "S2"
  const mid = level === "S3"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold",
        high && "bg-destructive-subtle text-destructive",
        mid && "bg-warning-subtle text-warning",
        !high && !mid && "bg-secondary text-muted-foreground"
      )}
    >
      {level}
    </span>
  )
}

function FindingCard({
  level,
  category,
  path,
  title,
  description,
  diff,
}: {
  level: string
  category: string
  path: string
  title: string
  description: string
  diff: { sign: "+" | "-" | " "; text: string }[]
}) {
  return (
    <div className="group rounded-lg border border-border bg-card p-5 transition-colors duration-150 hover:border-border-strong">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Severity level={level} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {category}
          </span>
        </div>
        <span className="truncate font-mono text-[11px] text-muted-foreground">{path}</span>
      </div>

      <h4 className="mt-3 text-[15px] font-semibold tracking-tight text-foreground">{title}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>

      <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-secondary/60 p-3 font-mono text-xs leading-relaxed">
        <code>
          {diff.map((line, i) => (
            <span
              key={i}
              className={cn(
                "block whitespace-pre",
                line.sign === "+" && "text-success",
                line.sign === "-" && "text-destructive",
                line.sign === " " && "text-muted-foreground"
              )}
            >
              {line.sign === " " ? "  " : line.sign + " "}
              {line.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

const STATS: { value: string; label: string }[] = [
  { value: "7", label: "PIPELINE STAGES" },
  { value: "2", label: "REVIEW PASSES" },
  { value: "1:1", label: "TASK ↔ CRITERION" },
  { value: "4", label: "PORTAL ROLES" },
  { value: "S1–S5", label: "SEVERITY SCALE" },
]

const ROLES: { role: string; tag: string; blurb: string }[] = [
  {
    role: "Client",
    tag: "CLIENT",
    blurb: "Submits requests in plain language and tracks each ticket to ship.",
  },
  {
    role: "Product Manager",
    tag: "PM",
    blurb: "Owns the PRD and approves acceptance criteria before work starts.",
  },
  {
    role: "Developer",
    tag: "DEVELOPER",
    blurb: "Picks up tasks on a kanban board and opens the pull request.",
  },
  {
    role: "Senior Engineer",
    tag: "SENIOR_ENG",
    blurb: "Reviews AI findings, clears or escalates, and approves the ship.",
  },
]

const LINEAGE = ["REQ-142", "AC-3", "TASK-3", "PR #87", "FND-2 · S2", "SHIPPED"]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />

      <main className="flex-1">
        <Hero />

        {/* ── PIPELINE ────────────────────────────────────── */}
        <section id="pipeline" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <Reveal>
              <Kicker>The pipeline</Kicker>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Seven stages. One flow that holds the work to the spec.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Every request runs the same track — from intake to a senior-approved ship.
                Nothing advances until the stage before it is satisfied.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="mt-12 rounded-xl border border-border bg-card p-6 sm:p-10">
                <Pipeline />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CAPABILITY 1: Discovery → PRD ───────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <Reveal>
                <Kicker>01 · Discovery → PRD</Kicker>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  From a sentence to a spec with numbered criteria.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                  An AI discovery conversation pins down scope and intent, then drafts a
                  structured PRD. Every requirement becomes an explicit, numbered acceptance
                  criterion — the contract the rest of the pipeline is measured against.
                </p>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      PRD-142 · v1
                    </span>
                    <Chip className="border-accent/40 text-accent">APPROVED</Chip>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    Bulk CSV import for contacts
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {[
                      { id: "AC-1", text: "Reject files over 5 MB with a typed error." },
                      { id: "AC-2", text: "Validate the header row before any row is parsed." },
                      { id: "AC-3", text: "Deduplicate incoming rows on normalized email." },
                    ].map((ac) => (
                      <li key={ac.id} className="flex items-start gap-3">
                        <Chip>{ac.id}</Chip>
                        <span className="text-sm leading-relaxed text-muted-foreground">
                          {ac.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── CAPABILITY 2: Dual-AI review (centerpiece) ──── */}
        <section id="review-engine" className="scroll-mt-20 border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <Reveal>
              <Kicker>02 · Dual-AI review</Kicker>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Two independent passes, checked against the spec.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                When a PR opens, the engine fetches the real diff and reviews it twice. Findings
                carry a severity, a category, and quoted code evidence. Blocking findings route
                the PR back to the developer; a clean pass advances it.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              <Reveal delay={0.05}>
                <div className="h-full rounded-lg border border-border bg-card p-5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-accent">
                    Pass A
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-foreground">
                    Implementation critic
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Reads the diff against every acceptance criterion and flags anything the
                    change fails to satisfy — missing behavior, wrong behavior, unmet criteria.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="h-full rounded-lg border border-border bg-card p-5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Pass B
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-foreground">
                    Adversarial QA
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Hunts for security holes, edge cases, and regressions the diff could
                    introduce — independent of the spec, looking for what could break.
                  </p>
                </div>
              </Reveal>
            </div>

            {/* proof: real finding output */}
            <Reveal delay={0.1}>
              <div className="mt-12">
                <div className="mb-5 flex items-center gap-3">
                  <Kicker>Sample output</Kicker>
                  <span className="h-px flex-1 bg-border" />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    review-run · 2 findings
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <FindingCard
                    level="S2"
                    category="CORRECTNESS"
                    path="lib/import/parse.ts"
                    title="Dedup runs before validation, so invalid rows survive"
                    description="AC-3 dedupes on normalized email, but normalization happens after the dedup pass — duplicates with differing casing slip through."
                    diff={[
                      { sign: " ", text: "const rows = parseCsv(file)" },
                      { sign: "-", text: "const unique = dedupe(rows, r => r.email)" },
                      { sign: "+", text: "const cleaned = rows.map(normalizeEmail)" },
                      { sign: "+", text: "const unique = dedupe(cleaned, r => r.email)" },
                    ]}
                  />
                  <FindingCard
                    level="S4"
                    category="CODE_QUALITY"
                    path="lib/import/parse.ts"
                    title="Size check reads the whole file into memory first"
                    description="AC-1 is met, but the 5 MB guard runs after readFileSync — large uploads are buffered before being rejected. Prefer the stream's byte length."
                    diff={[
                      { sign: "-", text: "const buf = await file.arrayBuffer()" },
                      { sign: "-", text: "if (buf.byteLength > MAX) throw new TooLarge()" },
                      { sign: "+", text: "if (file.size > MAX) throw new TooLarge()" },
                    ]}
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CAPABILITY 3: Traceability ──────────────────── */}
        <section id="traceability" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <Reveal>
              <Kicker>03 · Traceability</Kicker>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Every line traces back to what was asked for.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Request, criterion, task, pull request, finding, ship — one unbroken lineage.
                Open any shipped change and walk it back to the sentence that started it.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="mt-12 rounded-xl border border-border bg-card p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
                  {LINEAGE.map((node, i) => (
                    <div key={node} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-xs",
                          i === LINEAGE.length - 1
                            ? "border-accent/40 text-foreground"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {i === LINEAGE.length - 1 ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        ) : null}
                        {node}
                      </span>
                      {i < LINEAGE.length - 1 ? (
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-border-strong" />
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className="mt-5 border-t border-border pt-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  audit-logged · workspace-scoped · immutable lineage
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CAPABILITY 4: Roles ─────────────────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <Reveal>
              <Kicker>04 · Multi-tenant portals</Kicker>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                A portal for every role, scoped to the workspace.
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ROLES.map((r, i) => (
                <Reveal key={r.role} delay={0.05 * i}>
                  <div className="group h-full rounded-lg border border-border bg-card p-5 transition-colors duration-150 hover:border-border-strong">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {r.tag}
                    </span>
                    <h3 className="mt-2 text-base font-semibold tracking-tight text-foreground">
                      {r.role}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {r.blurb}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS STRIP ─────────────────────────────────── */}
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    {s.value}
                  </div>
                  <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CLOSING CTA ─────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
            <Reveal>
              <Kicker>Governance for AI-era delivery</Kicker>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Hold your delivery pipeline accountable to the spec.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                ShipFlow is invite-only. Sign in with your workspace, or request access for
                your team.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <a href="mailto:access@shipflow.ai?subject=ShipFlow%20access%20request">
                    Request access
                  </a>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
