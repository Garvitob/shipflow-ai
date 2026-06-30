"use client"

import * as React from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { requestAnalysis } from "@/app/admin/projects/analysis-actions"

// ─── Status + progress (mirrors what the Inngest job writes) ──────────────────

type AnalysisStatus = "IDLE" | "RUNNING" | "COMPLETE" | "FAILED"
type StageState = "pending" | "active" | "done" | "failed"

type ProgressStage = {
  key: string
  label: string
  state: StageState
}

type AnalysisProgress = {
  stages?: ProgressStage[]
  currentDetail?: string | null
  startedAt?: string | null
  updatedAt?: string | null
  error?: string | null
}

const FALLBACK_STAGES: ProgressStage[] = [
  { key: "resolve", label: "Connecting to repository", state: "pending" },
  { key: "gather", label: "Downloading source", state: "pending" },
  { key: "curate", label: "Selecting key files", state: "pending" },
  { key: "analyze", label: "Analyzing the codebase", state: "pending" },
  { key: "store", label: "Finalizing", state: "pending" },
]

function asProgress(value: unknown): AnalysisProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as AnalysisProgress
}

// ─── Summary shape (defensive consumer view of the stored codebaseSummary) ────

type Confidence = string

type Finding = {
  summary?: string
  details?: string[]
  reasoning?: string
  evidence?: string[]
  confidence?: Confidence
}

type TechStack = {
  summary?: string
  languages?: string[]
  frameworks?: string[]
  keyLibraries?: string[]
  runtime?: string
  confidence?: Confidence
  evidence?: string[]
}

type KeyFeature = {
  feature?: string
  reasoning?: string
  evidence?: string[]
}

type ModuleSummary = {
  name?: string
  path?: string
  purpose?: string
  reasoning?: string
  relationships?: string
}

type Dependency = {
  name?: string
  purpose?: string
  implication?: string
}

type Analysis = {
  purpose?: Finding
  overview?: Finding
  techStack?: TechStack
  architecture?: Finding
  dataModel?: Finding
  apiSurface?: Finding
  entryPointsAndControlFlow?: Finding
  authAndSecurityModel?: Finding
  keyFeatures?: KeyFeature[]
  modules?: ModuleSummary[]
  conventions?: Finding
  dependencies?: { summary?: string; notable?: Dependency[] }
  externalIntegrations?: unknown[]
  testingApproach?: Finding
  buildAndTooling?: Finding
  notablePatterns?: Finding
  risksAndTechDebt?: Finding
  codeHealth?: Finding
  howToExtend?: Finding
  purposeAlignment?: Finding
  coverageNote?: string | null
}

type ReviewContext = {
  oneLineDescription?: string
  primaryStack?: string[]
}

type RepoSummary = {
  meta?: { repoFullName?: string; coverage?: string; isEmpty?: boolean }
  analysis?: Analysis
  reviewContext?: ReviewContext
}

function parseSummary(raw: string | null): RepoSummary | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return null
    return parsed as RepoSummary
  } catch {
    return null
  }
}

// ─── Elapsed timer ────────────────────────────────────────────────────────────

function useElapsed(startedAt: string | null | undefined, active: boolean): string {
  const [, force] = React.useState(0)
  React.useEffect(() => {
    if (!active) return
    const id = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [active])

  if (!startedAt) return "0:00"
  const ms = Date.now() - new Date(startedAt).getTime()
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

// ─── Section ──────────────────────────────────────────────────────────────────

type Props = {
  projectId: string
  hasRepo: boolean
  initialStatus: string
  initialProgress: unknown
  codebaseSummary: string | null
  onChanged: () => void
}

export function AnalysisSection({
  projectId,
  hasRepo,
  initialStatus,
  initialProgress,
  codebaseSummary,
  onChanged,
}: Props) {
  const [optimisticRunning, setOptimisticRunning] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const prevStatus = React.useRef<string>(initialStatus)

  const liveStatus = (initialStatus as AnalysisStatus) || "IDLE"
  const isPolling = optimisticRunning || liveStatus === "RUNNING"

  const statusQuery = trpc.projects.getAnalysisStatus.useQuery(
    { id: projectId },
    {
      refetchInterval: isPolling ? 1500 : false,
      refetchOnWindowFocus: false,
    },
  )

  const polledStatus = statusQuery.data?.status as AnalysisStatus | undefined
  const status: AnalysisStatus = optimisticRunning
    ? "RUNNING"
    : polledStatus ?? (initialStatus as AnalysisStatus) ?? "IDLE"

  const progress: AnalysisProgress | null =
    asProgress(statusQuery.data?.progress) ?? asProgress(initialProgress)

  const startedAt =
    (statusQuery.data?.startedAt as unknown as string | null) ??
    progress?.startedAt ??
    null

  // React to status transitions coming from the poll.
  React.useEffect(() => {
    if (!polledStatus) return
    if (polledStatus === "RUNNING") setOptimisticRunning(false)
    if (polledStatus === "COMPLETE" || polledStatus === "FAILED") {
      setOptimisticRunning(false)
      if (polledStatus === "COMPLETE" && prevStatus.current !== "COMPLETE") {
        onChanged()
      }
      prevStatus.current = polledStatus
    }
  }, [polledStatus, onChanged])

  async function start() {
    setActionError(null)
    setBusy(true)
    setOptimisticRunning(true)
    try {
      await requestAnalysis(projectId)
      await statusQuery.refetch()
    } catch (err) {
      setOptimisticRunning(false)
      setActionError(
        err instanceof Error ? err.message : "Couldn't start the analysis.",
      )
    } finally {
      setBusy(false)
    }
  }

  const summary = React.useMemo(
    () => parseSummary(codebaseSummary),
    [codebaseSummary],
  )

  const action = (() => {
    if (status === "RUNNING") {
      return <RunningTimer startedAt={startedAt} />
    }
    if (status === "COMPLETE") {
      return (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
        >
          Re-analyze
        </Button>
      )
    }
    if (status === "FAILED") {
      return (
        <Button variant="secondary" size="sm" onClick={start} disabled={busy}>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Try again
        </Button>
      )
    }
    // IDLE
    return (
      <Button size="sm" onClick={start} disabled={busy || !hasRepo}>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Analyze
      </Button>
    )
  })()

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Codebase analysis</h2>
        {action}
      </div>

      <div className="mt-4">
        {status === "RUNNING" ? (
          <Stepper progress={progress} />
        ) : status === "COMPLETE" ? (
          <SummaryView summary={summary} />
        ) : status === "FAILED" ? (
          <FailedCard progress={progress} />
        ) : (
          <IdleCard hasRepo={hasRepo} />
        )}

        {actionError && (
          <p className="mt-3 text-sm text-destructive">{actionError}</p>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-analyze this repository?</DialogTitle>
            <DialogDescription>
              This replaces the current analysis with a fresh read of the latest
              code. It can take a minute.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false)
                void start()
              }}
              disabled={busy}
            >
              Re-analyze
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

// ─── States ─────────────────────────────────────────────────────────────────

function IdleCard({ hasRepo }: { hasRepo: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {hasRepo
          ? "This repository hasn't been analyzed yet. Map its architecture, security model, and conventions so feature work stays grounded in the real code."
          : "Connect a repository to this project to analyze its architecture, security model, and conventions."}
      </p>
    </div>
  )
}

function RunningTimer({ startedAt }: { startedAt: string | null }) {
  const elapsed = useElapsed(startedAt, true)
  return (
    <span className="text-sm text-muted-foreground">
      Analyzing · <span className="font-mono">{elapsed}</span>
    </span>
  )
}

function Stepper({ progress }: { progress: AnalysisProgress | null }) {
  const stages =
    progress?.stages && progress.stages.length > 0
      ? progress.stages
      : FALLBACK_STAGES
  const detail = progress?.currentDetail ?? null

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col">
        {stages.map((stage) => {
          const active = stage.state === "active"
          return (
            <div key={stage.key}>
              <div className="flex items-center gap-3 py-[7px]">
                <Dot state={stage.state} />
                <span
                  className={cn(
                    "flex-1 text-[13px] transition-colors",
                    stage.state === "pending"
                      ? "text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {stage.label}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {stage.state === "done"
                    ? "done"
                    : stage.state === "failed"
                      ? "failed"
                      : stage.state === "pending"
                        ? "pending"
                        : ""}
                </span>
              </div>
              {active && detail && (
                <p className="mb-1.5 ml-[19px] font-mono text-xs text-muted-foreground">
                  {detail}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Dot({ state }: { state: StageState }) {
  return (
    <span
      className={cn(
        "h-[7px] w-[7px] shrink-0 rounded-full",
        state === "done" && "bg-success",
        state === "active" && "bg-accent motion-safe:animate-pulse",
        state === "failed" && "bg-destructive",
        state === "pending" && "border-[1.5px] border-border-strong",
      )}
    />
  )
}

function FailedCard({ progress }: { progress: AnalysisProgress | null }) {
  const failedStage = progress?.stages?.find((s) => s.state === "failed")
  const error = progress?.error ?? null
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <span className="inline-flex items-center gap-2 rounded-md bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning">
        <span className="h-[7px] w-[7px] rounded-full bg-destructive" />
        Analysis failed
      </span>
      <p className="mt-3 text-sm leading-relaxed text-foreground">
        {failedStage
          ? `Analysis stopped at: ${failedStage.label.toLowerCase()}.`
          : "Analysis stopped before it could finish."}
      </p>
      {error && (
        <p className="mt-1 break-words font-mono text-xs text-muted-foreground">
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Summary rendering ────────────────────────────────────────────────────────

const PRIMARY: { key: keyof Analysis; label: string }[] = [
  { key: "purpose", label: "Purpose" },
  { key: "overview", label: "Overview" },
  { key: "architecture", label: "Architecture" },
  { key: "authAndSecurityModel", label: "Security model" },
  { key: "risksAndTechDebt", label: "Risks and tech debt" },
]

const SECONDARY: { key: keyof Analysis; label: string }[] = [
  { key: "dataModel", label: "Data model" },
  { key: "apiSurface", label: "API surface" },
  { key: "entryPointsAndControlFlow", label: "Entry points and control flow" },
  { key: "conventions", label: "Conventions" },
  { key: "testingApproach", label: "Testing approach" },
  { key: "buildAndTooling", label: "Build and tooling" },
  { key: "notablePatterns", label: "Notable patterns" },
  { key: "codeHealth", label: "Code health" },
  { key: "howToExtend", label: "How to extend" },
  { key: "purposeAlignment", label: "Purpose alignment" },
]

function SummaryView({ summary }: { summary: RepoSummary | null }) {
  const [expanded, setExpanded] = React.useState(false)

  if (!summary || !summary.analysis) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          The analysis finished, but the summary couldn&apos;t be read. Try
          re-analyzing the repository.
        </p>
      </div>
    )
  }

  const a = summary.analysis
  const lead =
    summary.reviewContext?.oneLineDescription ?? a.purpose?.summary ?? null
  const techLine = buildTechLine(a, summary.reviewContext)
  const coverageNote =
    typeof a.coverageNote === "string" && a.coverageNote.trim()
      ? a.coverageNote
      : null

  return (
    <div className="rounded-xl border border-border bg-card px-6 py-5">
      {coverageNote && (
        <div className="mb-4 rounded-md bg-warning-subtle px-3 py-2 text-xs leading-relaxed text-warning">
          {coverageNote}
        </div>
      )}

      {lead && (
        <p className="text-[15px] font-medium leading-snug text-foreground">
          {lead}
        </p>
      )}
      {techLine && (
        <p className="mt-2 break-words font-mono text-xs leading-relaxed text-muted-foreground">
          {techLine}
        </p>
      )}

      <div className="mt-4">
        {PRIMARY.map((s, i) => (
          <FindingBlock
            key={s.key}
            label={s.label}
            finding={a[s.key] as Finding | undefined}
            first={i === 0}
          />
        ))}
      </div>

      {expanded && (
        <div>
          {SECONDARY.map((s) => (
            <FindingBlock
              key={s.key}
              label={s.label}
              finding={a[s.key] as Finding | undefined}
            />
          ))}
          <TechStackBlock tech={a.techStack} />
          <KeyFeaturesBlock features={a.keyFeatures} />
          <ModulesBlock modules={a.modules} />
          <DependenciesBlock dependencies={a.dependencies} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            expanded && "rotate-180",
          )}
        />
        {expanded ? "Show fewer sections" : "Show all sections"}
      </button>
    </div>
  )
}

function buildTechLine(a: Analysis, rc?: ReviewContext): string | null {
  const ts = a.techStack
  const parts = [...(ts?.languages ?? []), ...(ts?.frameworks ?? [])].filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  )
  if (parts.length > 0) return parts.join(" · ")
  const primary = (rc?.primaryStack ?? []).filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  )
  return primary.length > 0 ? primary.join(" · ") : null
}

function FindingBlock({
  label,
  finding,
  first,
}: {
  label: string
  finding?: Finding
  first?: boolean
}) {
  if (!finding) return null
  const hasBody =
    (finding.summary && finding.summary.trim()) ||
    (finding.details && finding.details.length > 0)
  if (!hasBody) return null

  return (
    <div
      className={cn(
        "border-t border-border py-4",
        first && "border-t-0 pt-1",
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h4 className="text-[13px] font-medium text-foreground">{label}</h4>
        {finding.confidence && (
          <span className="font-mono text-[11px] text-muted-foreground">
            {finding.confidence}
          </span>
        )}
      </div>

      {finding.summary && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">
          {finding.summary}
        </p>
      )}

      {finding.details && finding.details.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {finding.details.map((d, i) => (
            <li
              key={i}
              className="flex gap-2 text-[13px] leading-relaxed text-foreground"
            >
              <span className="select-none text-muted-foreground">·</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}

      {finding.reasoning && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium">Why</span> — {finding.reasoning}
        </p>
      )}

      <EvidenceLine evidence={finding.evidence} />
    </div>
  )
}

function EvidenceLine({ evidence }: { evidence?: string[] }) {
  if (!evidence || evidence.length === 0) return null
  const paths = evidence.filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  )
  if (paths.length === 0) return null
  return (
    <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
      {paths.join("   ")}
    </p>
  )
}

function TechStackBlock({ tech }: { tech?: TechStack }) {
  if (!tech) return null
  const libs = (tech.keyLibraries ?? []).filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  )
  if (!tech.summary && libs.length === 0 && !tech.runtime) return null
  return (
    <div className="border-t border-border py-4">
      <div className="flex items-baseline justify-between gap-4">
        <h4 className="text-[13px] font-medium text-foreground">Tech stack</h4>
        {tech.confidence && (
          <span className="font-mono text-[11px] text-muted-foreground">
            {tech.confidence}
          </span>
        )}
      </div>
      {tech.summary && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">
          {tech.summary}
        </p>
      )}
      {tech.runtime && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium">Runtime</span> — {tech.runtime}
        </p>
      )}
      {libs.length > 0 && (
        <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
          {libs.join("   ")}
        </p>
      )}
    </div>
  )
}

function KeyFeaturesBlock({ features }: { features?: KeyFeature[] }) {
  if (!features || features.length === 0) return null
  return (
    <div className="border-t border-border py-4">
      <h4 className="text-[13px] font-medium text-foreground">Key features</h4>
      <ul className="mt-2 flex flex-col gap-3">
        {features.map((f, i) => (
          <li key={i}>
            {f.feature && (
              <p className="text-[13px] font-medium leading-relaxed text-foreground">
                {f.feature}
              </p>
            )}
            {f.reasoning && (
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                {f.reasoning}
              </p>
            )}
            <EvidenceLine evidence={f.evidence} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ModulesBlock({ modules }: { modules?: ModuleSummary[] }) {
  if (!modules || modules.length === 0) return null
  return (
    <div className="border-t border-border py-4">
      <h4 className="text-[13px] font-medium text-foreground">Modules</h4>
      <ul className="mt-2 flex flex-col gap-3">
        {modules.map((m, i) => (
          <li key={i}>
            <div className="flex flex-wrap items-baseline gap-x-2">
              {m.name && (
                <span className="text-[13px] font-medium text-foreground">
                  {m.name}
                </span>
              )}
              {m.path && (
                <span className="break-words font-mono text-[11px] text-muted-foreground">
                  {m.path}
                </span>
              )}
            </div>
            {m.purpose && (
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                {m.purpose}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function DependenciesBlock({
  dependencies,
}: {
  dependencies?: { summary?: string; notable?: Dependency[] }
}) {
  if (!dependencies) return null
  const notable = dependencies.notable ?? []
  if (!dependencies.summary && notable.length === 0) return null
  return (
    <div className="border-t border-border py-4">
      <h4 className="text-[13px] font-medium text-foreground">Dependencies</h4>
      {dependencies.summary && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">
          {dependencies.summary}
        </p>
      )}
      {notable.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {notable.map((d, i) => (
            <li key={i} className="text-[13px] leading-relaxed">
              {d.name && (
                <span className="font-mono text-xs text-foreground">
                  {d.name}
                </span>
              )}
              {d.purpose && (
                <span className="text-muted-foreground">
                  {d.name ? " — " : ""}
                  {d.purpose}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}