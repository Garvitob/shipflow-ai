"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@shipflow/db"
import { getAuthContext } from "@/lib/auth-guard"
import { generateTasksForPrd } from "@/lib/tasks/actions"

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

const criterionInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
})

const updatePrdInput = z.object({
  featureRequestId: z.string().min(1),
  problemStatement: z.string().trim().min(1).max(5000),
  goals: z.string().trim().max(5000),
  nonGoals: z.string().trim().max(5000),
  userStories: z.string().trim().max(5000),
  edgeCases: z.string().trim().max(5000),
  successMetrics: z.string().trim().max(5000),
  acceptanceCriteria: z.array(criterionInput).max(50),
})

type PmGuard =
  | {
      ok: true
      userId: string
      workspaceId: string
      status: string
      prdId: string | null
    }
  | { ok: false }

async function requirePmForRequest(featureRequestId: string): Promise<PmGuard> {
  const ctx = await getAuthContext()
  if (!ctx || ctx.role !== "PM") return { ok: false }

  const fr = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: {
      prd: { select: { id: true } },
      project: {
        select: {
          workspaceId: true,
          projectMembers: {
            where: { userId: ctx.userId, role: "PM" },
            select: { id: true },
          },
        },
      },
    },
  })

  if (
    !fr ||
    fr.project.workspaceId !== ctx.workspaceId ||
    fr.project.projectMembers.length === 0
  ) {
    return { ok: false }
  }

  return {
    ok: true,
    userId: ctx.userId,
    workspaceId: fr.project.workspaceId,
    status: fr.status,
    prdId: fr.prd?.id ?? null,
  }
}

export async function updatePrd(
  raw: z.infer<typeof updatePrdInput>,
): Promise<ActionResult<{ saved: true }>> {
  const parsed = updatePrdInput.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Invalid PRD fields" }
  const input = parsed.data

  const guard = await requirePmForRequest(input.featureRequestId)
  if (!guard.ok) return { ok: false, error: "Not authorized" }
  if (guard.status !== "PRD_DRAFT") {
    return { ok: false, error: "This request can no longer be edited" }
  }
  if (!guard.prdId) return { ok: false, error: "This request has no PRD" }

  const prdId = guard.prdId

  try {
    await prisma.$transaction(async (tx) => {
      await tx.prd.update({
        where: { id: prdId },
        data: {
          problemStatement: input.problemStatement,
          goals: input.goals,
          nonGoals: input.nonGoals,
          userStories: input.userStories,
          edgeCases: input.edgeCases,
          successMetrics: input.successMetrics,
          version: { increment: 1 },
        },
      })

      await tx.acceptanceCriterion.deleteMany({ where: { prdId } })
      if (input.acceptanceCriteria.length > 0) {
        await tx.acceptanceCriterion.createMany({
          data: input.acceptanceCriteria.map((c, i) => ({
            prdId,
            title: c.title,
            description: c.description,
            order: i,
          })),
        })
      }

      await tx.auditLog.create({
        data: {
          workspaceId: guard.workspaceId,
          actorId: guard.userId,
          action: "prd.edited",
          entityType: "FeatureRequest",
          entityId: input.featureRequestId,
        },
      })
    })

    revalidatePath("/pm", "layout")
    return { ok: true, data: { saved: true } }
  } catch {
    return { ok: false, error: "We could not save your changes. Please try again." }
  }
}

export async function approveRequest(
  featureRequestId: string,
): Promise<ActionResult<{ approved: true; taskCount: number }>> {
  if (typeof featureRequestId !== "string" || featureRequestId.length === 0) {
    return { ok: false, error: "Invalid request" }
  }

  const guard = await requirePmForRequest(featureRequestId)
  if (!guard.ok) return { ok: false, error: "Not authorized" }
  if (guard.status !== "PRD_DRAFT") {
    return { ok: false, error: "This request is not awaiting approval" }
  }
  if (!guard.prdId) return { ok: false, error: "This request has no PRD" }

  const prdId = guard.prdId

  try {
    const taskCount = await prisma.$transaction(
      async (tx) => {
        await tx.prd.update({
          where: { id: prdId },
          data: { approvedByPmId: guard.userId, approvedAt: new Date() },
        })

        const count = await generateTasksForPrd(tx, featureRequestId)

        await tx.featureRequest.update({
          where: { id: featureRequestId },
          data: { status: "IN_DEV" },
        })

        await tx.auditLog.create({
          data: {
            workspaceId: guard.workspaceId,
            actorId: guard.userId,
            action: "feature_request.approved",
            entityType: "FeatureRequest",
            entityId: featureRequestId,
            metadata: JSON.stringify({ taskCount: count }),
          },
        })

        return count
      },
      { timeout: 120_000 },
    )

    revalidatePath("/pm", "layout")
    revalidatePath("/dev", "layout")
    return { ok: true, data: { approved: true, taskCount } }
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN"
    if (code === "TASK_COUNT_MISMATCH") {
      return {
        ok: false,
        error: "Task generation produced an unexpected result. Please try again.",
      }
    }
    return { ok: false, error: "We could not approve this request. Please try again." }
  }
}

export async function rejectRequest(
  featureRequestId: string,
  reason: string,
): Promise<ActionResult<{ rejected: true }>> {
  if (typeof featureRequestId !== "string" || featureRequestId.length === 0) {
    return { ok: false, error: "Invalid request" }
  }
  const trimmed = (reason ?? "").trim().slice(0, 1000)

  const guard = await requirePmForRequest(featureRequestId)
  if (!guard.ok) return { ok: false, error: "Not authorized" }
  if (guard.status !== "PRD_DRAFT") {
    return { ok: false, error: "This request cannot be rejected" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "REJECTED" },
      })

      await tx.auditLog.create({
        data: {
          workspaceId: guard.workspaceId,
          actorId: guard.userId,
          action: "feature_request.rejected",
          entityType: "FeatureRequest",
          entityId: featureRequestId,
          metadata: trimmed ? JSON.stringify({ reason: trimmed }) : undefined,
        },
      })
    })

    revalidatePath("/pm", "layout")
    return { ok: true, data: { rejected: true } }
  } catch {
    return { ok: false, error: "We could not reject this request. Please try again." }
  }
}