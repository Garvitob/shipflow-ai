"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma, type Prisma, TaskStatus } from "@shipflow/db"
import { getAuthContext } from "@/lib/auth-guard"
import { generateTaskBreakdown } from "@/lib/ai/tasks"

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

export async function generateTasksForPrd(
  tx: Prisma.TransactionClient,
  featureRequestId: string,
): Promise<number> {
  const fr = await tx.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: {
      project: { select: { name: true } },
      prd: {
        include: { acceptanceCriteria: { orderBy: { order: "asc" } } },
      },
    },
  })

  if (!fr || !fr.prd) return 0
  const prd = fr.prd
  const criteria = prd.acceptanceCriteria
  if (criteria.length === 0) return 0

  const existing = await tx.task.count({ where: { prdId: prd.id } })
  if (existing > 0) return existing

  const breakdown = await generateTaskBreakdown({
    projectName: fr.project.name,
    prd: {
      title: fr.title,
      problemStatement: prd.problemStatement,
      goals: prd.goals,
      nonGoals: prd.nonGoals,
    },
    criteria: criteria.map((c) => ({ title: c.title, description: c.description })),
  })

  if (breakdown.length !== criteria.length) {
    throw new Error("TASK_COUNT_MISMATCH")
  }

  await tx.task.createMany({
    data: breakdown.map((t, i) => ({
      prdId: prd.id,
      acceptanceCriterionId: criteria[i].id,
      title: t.title,
      description: t.description,
      complexity: t.complexity,
    })),
  })

  return breakdown.length
}

const moveInput = z.object({
  taskId: z.string().min(1),
  status: z.nativeEnum(TaskStatus),
})

async function devTaskGuard(taskId: string) {
  const ctx = await getAuthContext()
  if (!ctx || ctx.role !== "DEVELOPER") return { ok: false as const }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      assignedToId: true,
      prd: {
        select: {
          featureRequest: {
            select: {
              id: true,
              status: true,
              project: {
                select: {
                  workspaceId: true,
                  projectMembers: {
                    where: { userId: ctx.userId, role: "DEVELOPER" },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const fr = task?.prd.featureRequest
  if (
    !task ||
    !fr ||
    fr.project.workspaceId !== ctx.workspaceId ||
    fr.project.projectMembers.length === 0
  ) {
    return { ok: false as const }
  }

  return {
    ok: true as const,
    userId: ctx.userId,
    workspaceId: fr.project.workspaceId,
    assignedToId: task.assignedToId,
    requestStatus: fr.status,
  }
}

export async function moveTask(
  raw: z.infer<typeof moveInput>,
): Promise<ActionResult<{ moved: true }>> {
  const parsed = moveInput.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Invalid task move" }
  const { taskId, status } = parsed.data

  const guard = await devTaskGuard(taskId)
  if (!guard.ok) return { ok: false, error: "Not authorized" }

  const claim =
    status === TaskStatus.IN_PROGRESS && guard.assignedToId === null
      ? { assignedToId: guard.userId }
      : {}

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status, ...claim },
    })
    revalidatePath("/dev", "layout")
    return { ok: true, data: { moved: true } }
  } catch {
    return { ok: false, error: "Could not update the task. Please try again." }
  }
}

export async function claimTask(
  taskId: string,
): Promise<ActionResult<{ claimed: true }>> {
  if (typeof taskId !== "string" || taskId.length === 0) {
    return { ok: false, error: "Invalid task" }
  }

  const guard = await devTaskGuard(taskId)
  if (!guard.ok) return { ok: false, error: "Not authorized" }
  if (guard.assignedToId && guard.assignedToId !== guard.userId) {
    return { ok: false, error: "This task is already claimed by someone else" }
  }

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { assignedToId: guard.userId, status: TaskStatus.IN_PROGRESS },
    })
    revalidatePath("/dev", "layout")
    return { ok: true, data: { claimed: true } }
  } catch {
    return { ok: false, error: "Could not claim the task. Please try again." }
  }
}