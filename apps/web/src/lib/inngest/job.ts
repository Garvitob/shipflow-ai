import "server-only"
import { inngest } from "./client"
import { prisma, AnalysisStatus, Prisma } from "@shipflow/db"
import { parseRepoFullName, resolveRepoConnection, RepoConnectionError } from "../github/repo"
import { gatherRepo } from "../analysis/gather"
import { curateFiles } from "../analysis/curate"
import { buildCuratedContext } from "../analysis/budget"
import { analyzeRepo } from "../analysis/analyze"
import type { ProjectIntent } from "../analysis/prompts"

// ─── Live progress model (rendered by the in-app stepper) ────────────────────

type StageKey = "resolve" | "gather" | "curate" | "analyze" | "store"
type StageState = "pending" | "active" | "done" | "failed"

interface ProgressStage {
  key: StageKey
  label: string
  state: StageState
}

interface AnalysisProgress {
  stages: ProgressStage[]
  currentDetail: string | null
  startedAt: string
  updatedAt: string
  error: string | null
}

const STAGES: { key: StageKey; label: string }[] = [
  { key: "resolve", label: "Connecting to repository" },
  { key: "gather", label: "Downloading source" },
  { key: "curate", label: "Selecting key files" },
  { key: "analyze", label: "Analyzing the codebase" },
  { key: "store", label: "Finalizing" },
]

function initialProgress(): AnalysisProgress {
  const now = new Date().toISOString()
  return {
    stages: STAGES.map((s) => ({ key: s.key, label: s.label, state: "pending" })),
    currentDetail: null,
    startedAt: now,
    updatedAt: now,
    error: null,
  }
}

function parseProgress(value: Prisma.JsonValue | null | undefined): AnalysisProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as unknown as AnalysisProgress
}

function setStage(p: AnalysisProgress, key: StageKey, state: StageState): void {
  for (const stage of p.stages) {
    if (stage.key === key) stage.state = state
  }
}

// Read-modify-write so progress is correct across Inngest step re-executions
// (in-memory state does not survive step boundaries).
async function writeProgress(
  repoId: string,
  mutate: (p: AnalysisProgress) => void,
): Promise<void> {
  const row = await prisma.gitHubRepo.findUnique({
    where: { id: repoId },
    select: { analysisProgress: true },
  })
  const progress = parseProgress(row?.analysisProgress) ?? initialProgress()
  mutate(progress)
  progress.updatedAt = new Date().toISOString()
  await prisma.gitHubRepo.update({
    where: { id: repoId },
    data: { analysisProgress: progress as unknown as Prisma.InputJsonValue },
  })
}

// ─── The durable analysis job ────────────────────────────────────────────────

export const analyzeRepository = inngest.createFunction(
  { id: "analyze-repository", retries: 1, triggers: [{ event: "analysis/requested" }] },
  async ({ event, step }) => {
    const projectId = (event.data as { projectId?: string }).projectId
    if (!projectId) {
      throw new Error("analysis/requested event is missing projectId")
    }

    try {
      // STEP 1 — full pipeline. All repo file content lives and dies inside this
      // step's closure; only the compact summary JSON is returned (≈tens of KB,
      // far under Inngest's 4MB step-output limit).
      const summary = await step.run("analyze", async () => {
        const repo = await prisma.gitHubRepo.findUnique({
          where: { projectId },
          include: { project: true },
        })
        if (!repo) {
          throw new Error(`No GitHub repository is connected to project ${projectId}`)
        }

        const intent: ProjectIntent = {
          name: repo.project.name,
          description: repo.project.description,
          techStack: repo.project.techStack,
          existingFeatures: repo.project.existingFeatures,
          businessGoals: repo.project.businessGoals,
          targetUsers: repo.project.targetUsers,
        }

        await prisma.gitHubRepo.update({
          where: { id: repo.id },
          data: {
            analysisStatus: AnalysisStatus.RUNNING,
            analysisProgress: initialProgress() as unknown as Prisma.InputJsonValue,
            analysisStartedAt: new Date(),
            analysisCompletedAt: null,
          },
        })

        // resolve connection (fresh installationId + defaultBranch), persist them
        await writeProgress(repo.id, (p) => {
          setStage(p, "resolve", "active")
          p.currentDetail = null
        })
        const { owner, repo: repoName } = parseRepoFullName(repo.repoFullName)
        const connection = await resolveRepoConnection(owner, repoName)
        await prisma.gitHubRepo.update({
          where: { id: repo.id },
          data: {
            installationId: String(connection.installationId),
            defaultBranch: connection.defaultBranch,
          },
        })
        await writeProgress(repo.id, (p) => setStage(p, "resolve", "done"))

        // gather (tarball source + metadata)
        await writeProgress(repo.id, (p) => setStage(p, "gather", "active"))
        const gathered = await gatherRepo({
          owner,
          repo: repoName,
          installationId: connection.installationId,
          ref: connection.defaultBranch,
        })
        await writeProgress(repo.id, (p) => setStage(p, "gather", "done"))

        // curate + budget (pure)
        await writeProgress(repo.id, (p) => setStage(p, "curate", "active"))
        const curation = curateFiles(gathered)
        const ctx = buildCuratedContext(gathered, curation)
        await writeProgress(repo.id, (p) => setStage(p, "curate", "done"))

        // analyze (the 20-section AI pipeline; live sub-progress → currentDetail)
        await writeProgress(repo.id, (p) => setStage(p, "analyze", "active"))
        const result = await analyzeRepo(ctx, intent, async (stage, detail) => {
          await writeProgress(repo.id, (p) => {
            p.currentDetail = detail ? `${stage} — ${detail}` : stage
          })
        })
        await writeProgress(repo.id, (p) => {
          setStage(p, "analyze", "done")
          p.currentDetail = null
        })

        return result
      })

      // STEP 2 — persist the summary and mark complete. The summary returned from
      // step 1 is memoized by Inngest, so this never re-runs the analysis.
      await step.run("store", async () => {
        const repo = await prisma.gitHubRepo.findUnique({
          where: { projectId },
          select: { id: true, projectId: true },
        })
        if (!repo) {
          throw new Error(`No GitHub repository for project ${projectId} at store step`)
        }

        await writeProgress(repo.id, (p) => setStage(p, "store", "active"))
        await prisma.project.update({
          where: { id: repo.projectId },
          data: { codebaseSummary: JSON.stringify(summary) },
        })
        await writeProgress(repo.id, (p) => {
          setStage(p, "store", "done")
          p.currentDetail = null
        })
        await prisma.gitHubRepo.update({
          where: { id: repo.id },
          data: {
            analysisStatus: AnalysisStatus.COMPLETE,
            analysisCompletedAt: new Date(),
          },
        })
        return { stored: true }
      })

      return {
        ok: true,
        projectId,
        isEmpty: summary.meta.isEmpty,
        coverage: summary.meta.coverage,
      }
    } catch (err) {
      // Never-silent failure: record FAILED + the specific reason for the UI.
      const message = err instanceof Error ? err.message : String(err)
      const fullMessage =
        err instanceof RepoConnectionError ? `${err.code}: ${message}` : message
      try {
        const repo = await prisma.gitHubRepo.findUnique({
          where: { projectId },
          select: { id: true },
        })
        if (repo) {
          await writeProgress(repo.id, (p) => {
            for (const stage of p.stages) {
              if (stage.state === "active") stage.state = "failed"
            }
            p.error = fullMessage
          })
          await prisma.gitHubRepo.update({
            where: { id: repo.id },
            data: {
              analysisStatus: AnalysisStatus.FAILED,
              analysisCompletedAt: new Date(),
            },
          })
        }
      } catch {
        // swallow secondary failures so the original error is what surfaces
      }
      throw err
    }
  },
)