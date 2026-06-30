import "server-only"
import { generateCompletion, generateStructured } from "../ai/client"
import {
  treePredictionPrompt,
  modulePrompt,
  synthesisPrompt,
  critiquePrompt,
  distillPrompt,
  type ProjectIntent,
} from "./prompts"
import {
  analysisSchema,
  reviewContextSchema,
  repoSummarySchema,
  SCHEMA_VERSION,
  emptySummary,
  type RepoAnalysis,
  type RepoSummary,
} from "./schema"
import type { CuratedContext, CuratedFile } from "./types"

export type ProgressFn = (stage: string, detail?: string) => Promise<void> | void

// Per-pass output ceilings. Reasoning tokens count toward the output budget for
// reasoning models, so high-effort passes get generous headroom to avoid truncation.
const OUT_TREE = 8_000
const OUT_MODULE = 32_000
const OUT_SYNTHESIS = 96_000
const OUT_CRITIQUE = 96_000
const OUT_DISTILL = 16_000

// Per-pass timeouts. Quality over speed: high-effort synthesis/critique can run
// for minutes, so they get a generous ceiling instead of the engine default.
const TIMEOUT_MODULE = 240_000
const TIMEOUT_HEAVY = 300_000

// Per-chunk budget for map-reduce — matches the cost-cliff-safe single-pass budget.
const MODULE_CHUNK_BUDGET = 220_000

export interface ModuleChunk {
  name: string
  files: CuratedFile[]
}

// Group curated files by top-level module boundary; split a module further if it
// alone exceeds the per-chunk budget. Logical boundaries, never arbitrary cuts.
export function chunkByModule(files: CuratedFile[]): ModuleChunk[] {
  const groups = new Map<string, CuratedFile[]>()
  for (const file of files) {
    const slash = file.path.indexOf("/")
    const top = slash === -1 ? "(root)" : file.path.slice(0, slash)
    const existing = groups.get(top)
    if (existing) existing.push(file)
    else groups.set(top, [file])
  }

  const chunks: ModuleChunk[] = []
  for (const [name, groupFiles] of groups) {
    let current: CuratedFile[] = []
    let accumulated = 0
    let part = 0
    for (const file of groupFiles) {
      if (accumulated + file.estimatedTokens > MODULE_CHUNK_BUDGET && current.length > 0) {
        part += 1
        chunks.push({ name: part > 1 ? `${name} (part ${part})` : name, files: current })
        current = []
        accumulated = 0
      }
      current.push(file)
      accumulated += file.estimatedTokens
    }
    if (current.length > 0) {
      part += 1
      chunks.push({ name: part > 1 ? `${name} (part ${part})` : name, files: current })
    }
  }
  return chunks
}

function normalizePath(p: string): string {
  return p.replace(/^\.\//, "").replace(/^\/+/, "").trim()
}

// Grounding audit: drop any evidence citation that does not correspond to a file
// actually sent to the model. This is the hallucination-control guarantee — the
// model cannot invent a file path and have it survive into the stored summary.
export function stripFabricatedEvidence(
  analysis: RepoAnalysis,
  validPaths: Set<string>,
): { analysis: RepoAnalysis; dropped: number } {
  const valid = new Set<string>()
  for (const p of validPaths) valid.add(normalizePath(p))

  let dropped = 0
  const filter = (evidence: string[]): string[] =>
    evidence.filter((p) => {
      const keep = valid.has(normalizePath(p))
      if (!keep) dropped += 1
      return keep
    })

  const cloned = structuredClone(analysis)
  const sections = [
    cloned.purpose,
    cloned.overview,
    cloned.architecture,
    cloned.dataModel,
    cloned.apiSurface,
    cloned.entryPointsAndControlFlow,
    cloned.authAndSecurityModel,
    cloned.conventions,
    cloned.testingApproach,
    cloned.buildAndTooling,
    cloned.notablePatterns,
    cloned.risksAndTechDebt,
    cloned.codeHealth,
    cloned.howToExtend,
    cloned.purposeAlignment,
  ]
  for (const s of sections) s.evidence = filter(s.evidence)
  cloned.techStack.evidence = filter(cloned.techStack.evidence)
  for (const feature of cloned.keyFeatures) feature.evidence = filter(feature.evidence)
  for (const integration of cloned.externalIntegrations) {
    integration.evidence = filter(integration.evidence)
  }

  return { analysis: cloned, dropped }
}

function renderFiles(files: CuratedFile[]): string {
  return files.map((f) => `\n===== FILE: ${f.path} =====\n${f.contents}`).join("\n")
}

export async function analyzeRepo(
  ctx: CuratedContext,
  intent: ProjectIntent,
  progress: ProgressFn,
): Promise<RepoSummary> {
  const repoFullName = ctx.metadata.fullName

  if (ctx.isEmpty || ctx.files.length === 0) {
    await progress("Repository is empty — nothing to analyze")
    return emptySummary(repoFullName)
  }

  const validPaths = new Set(ctx.files.map((f) => f.path))

  // [predict] fast structural hypothesis from the tree alone (low effort, verified later)
  await progress("Predicting architecture from structure")
  const prediction = await generateCompletion({
    ...treePredictionPrompt(ctx.metadata, intent, ctx.fileTree),
    reasoningEffort: "low",
    maxOutputTokens: OUT_TREE,
  })
  const treePrediction = prediction.text

  // [analyze] one deep pass, or relationship-aware map-reduce for large repos
  let body: string
  let isModuleReduce: boolean
  if (ctx.strategy === "single_pass") {
    await progress("Analyzing the codebase in depth")
    body = renderFiles(ctx.files)
    isModuleReduce = false
  } else {
    const chunks = chunkByModule(ctx.files)
    const globalContext = `${treePrediction}\n\nFull file tree:\n${ctx.fileTree.join("\n")}`
    const moduleSummaries: string[] = []
    for (const [index, chunk] of chunks.entries()) {
      await progress(`Analyzing module ${index + 1} of ${chunks.length}`, chunk.name)
      const result = await generateCompletion({
        ...modulePrompt(ctx.metadata, intent, globalContext, chunk.name, chunk.files),
        reasoningEffort: "high",
        maxOutputTokens: OUT_MODULE,
        timeoutMs: TIMEOUT_MODULE,
      })
      moduleSummaries.push(`### Module: ${chunk.name}\n${result.text}`)
    }
    body = moduleSummaries.join("\n\n")
    isModuleReduce = true
  }

  // [synthesize] the full structured analysis (high effort)
  await progress("Synthesizing the full analysis")
  const draft = await generateStructured({
    ...synthesisPrompt(ctx.metadata, intent, ctx.fileTree, treePrediction, body, isModuleReduce),
    schema: analysisSchema,
    schemaName: "RepoAnalysis",
    reasoningEffort: "high",
    maxOutputTokens: OUT_SYNTHESIS,
    timeoutMs: TIMEOUT_HEAVY,
  })

  // [critique] two-pass self-review for rigor, consistency, and completeness (high effort)
  await progress("Reviewing and tightening the analysis")
  const refined = await generateStructured({
    ...critiquePrompt(JSON.stringify(draft.data), ctx.fileTree),
    schema: analysisSchema,
    schemaName: "RepoAnalysisRefined",
    reasoningEffort: "high",
    maxOutputTokens: OUT_CRITIQUE,
    timeoutMs: TIMEOUT_HEAVY,
  })

  // [audit] grounding: strip any cited file not actually in the curated set
  await progress("Verifying evidence against the codebase")
  const { analysis: grounded } = stripFabricatedEvidence(refined.data, validPaths)

  if (ctx.coverage === "partial_budget" && !grounded.coverageNote) {
    grounded.coverageNote =
      "Coverage is partial: analysis prioritized the highest-importance files; some lower-ranked files were not included in this pass."
  }

  // [distill] dense reusable context for downstream phases (medium effort)
  await progress("Preparing reusable review context")
  const distilled = await generateStructured({
    ...distillPrompt(JSON.stringify(grounded)),
    schema: reviewContextSchema,
    schemaName: "ReviewContext",
    reasoningEffort: "medium",
    maxOutputTokens: OUT_DISTILL,
  })

  const summary: RepoSummary = {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      repoFullName,
      generatedAt: new Date().toISOString(),
      coverage: ctx.coverage,
      isEmpty: false,
    },
    analysis: grounded,
    reviewContext: distilled.data,
  }

  const validated = repoSummarySchema.safeParse(summary)
  if (!validated.success) {
    throw new Error(
      `Generated summary failed final validation: ${validated.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}`,
    )
  }
  return validated.data
}
