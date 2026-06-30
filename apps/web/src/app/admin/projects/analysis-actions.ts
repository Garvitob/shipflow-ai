"use server"

import { prisma, AnalysisStatus, Prisma } from "@shipflow/db"
import { requireRole } from "@/lib/auth-guard"
import { inngest } from "@/lib/inngest/client"

// Must mirror the stepper stages written by the Inngest job (lib/inngest/job.ts)
// so the UI shows a correct all-pending stepper instantly, before the job's
// first progress write takes over.
const STAGES = [
  { key: "resolve", label: "Connecting to repository" },
  { key: "gather", label: "Downloading source" },
  { key: "curate", label: "Selecting key files" },
  { key: "analyze", label: "Analyzing the codebase" },
  { key: "store", label: "Finalizing" },
] as const

function freshProgress() {
  const now = new Date().toISOString()
  return {
    stages: STAGES.map((s) => ({ key: s.key, label: s.label, state: "pending" })),
    currentDetail: null,
    startedAt: now,
    updatedAt: now,
    error: null,
  }
}

/**
 * Starts (or restarts) codebase analysis for a project.
 *
 * Used by:
 *  - the "Analyze" / "Re-analyze" / "Try again" buttons on the project detail page
 *  - the "Analyze after creating" checkbox on the new-project form (fire-and-forget)
 *
 * Admin-gated and workspace-scoped so it can't be triggered for arbitrary projects.
 * The status flip is optimistic UI: the durable job marks RUNNING itself and then
 * drives the live progress, so this just makes the stepper appear immediately.
 */
export async function requestAnalysis(projectId: string): Promise<void> {
  const auth = await requireRole("ADMIN")

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: auth.workspaceId },
    select: { id: true, gitHubRepo: { select: { id: true } } },
  })

  if (!project) {
    throw new Error("Project not found")
  }
  if (!project.gitHubRepo) {
    throw new Error("This project has no repository to analyze")
  }

  await prisma.gitHubRepo.update({
    where: { id: project.gitHubRepo.id },
    data: {
      analysisStatus: AnalysisStatus.RUNNING,
      analysisProgress: freshProgress() as unknown as Prisma.InputJsonValue,
      analysisStartedAt: new Date(),
      analysisCompletedAt: null,
    },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId: auth.workspaceId,
      actorId: auth.userId,
      action: "analysis.requested",
      entityType: "Project",
      entityId: projectId,
    },
  })

  await inngest.send({ name: "analysis/requested", data: { projectId } })
}