"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@shipflow/db"
import { getAuthContext } from "@/lib/auth-guard"
import { buildProjectGrounding, generatePrd } from "@/lib/discovery/discovery"
import type { ScopeAnswers } from "@/lib/discovery/prompt"
import type { ChatMessage } from "@/lib/ai/client"
import type { PrdContent } from "@/lib/discovery/schema"

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

const startInput = z.object({
  projectId: z.string().min(1),
  type: z.enum(["BUG", "FEATURE"]),
  severity: z.number().int().min(1).max(5).nullable(),
  requestedDays: z.number().int().min(1).max(365).nullable(),
})

function toScope(
  type: string,
  severity: number | null,
  requestedDays: number | null,
): ScopeAnswers {
  const kind: "BUG" | "FEATURE" =
    type === "BUG" || type === "CRITICAL_BUG" ? "BUG" : "FEATURE"
  return { kind, severity, requestedDays }
}

function formatUserStory(s: { role: string; capability: string; benefit: string }): string {
  return `As ${s.role}, I want to ${s.capability}, so that ${s.benefit}.`
}

function serializePrdFields(prd: PrdContent) {
  return {
    problemStatement: prd.problemStatement,
    goals: prd.goals.join("\n"),
    nonGoals: prd.nonGoals.join("\n"),
    userStories: prd.userStories.map(formatUserStory).join("\n"),
    edgeCases: prd.edgeCases.join("\n"),
    successMetrics: prd.successMetrics.join("\n"),
  }
}

export async function startDiscoveryRequest(
  raw: z.infer<typeof startInput>,
): Promise<ActionResult<{ featureRequestId: string }>> {
  const ctx = await getAuthContext()
  if (!ctx || ctx.role !== "CLIENT") return { ok: false, error: "Not authorized" }

  const parsed = startInput.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Invalid request details" }
  const { projectId, type, severity, requestedDays } = parsed.data

  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId: ctx.userId },
    include: { project: { select: { workspaceId: true } } },
  })
  if (!member || member.project.workspaceId !== ctx.workspaceId) {
    return { ok: false, error: "Project not found" }
  }

  const fr = await prisma.featureRequest.create({
    data: {
      projectId,
      clientId: ctx.userId,
      type,
      severity,
      requestedDays,
      title: "Untitled request",
      rawDescription: "",
      status: "DISCOVERY",
    },
    select: { id: true },
  })

  return { ok: true, data: { featureRequestId: fr.id } }
}

export async function generatePrdForRequest(
  featureRequestId: string,
): Promise<ActionResult<{ ready: true }>> {
  const ctx = await getAuthContext()
  if (!ctx || ctx.role !== "CLIENT") return { ok: false, error: "Not authorized" }
  if (typeof featureRequestId !== "string" || featureRequestId.length === 0) {
    return { ok: false, error: "Invalid request" }
  }

  const fr = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: {
      project: true,
      conversationMessages: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!fr || fr.clientId !== ctx.userId || fr.project.workspaceId !== ctx.workspaceId) {
    return { ok: false, error: "Request not found" }
  }
  if (fr.status !== "DISCOVERY") {
    return { ok: false, error: "This request can no longer be edited" }
  }
  if (fr.conversationMessages.length === 0) {
    return { ok: false, error: "Add some details in the conversation first" }
  }

  const grounding = buildProjectGrounding(fr.project.name, fr.project.codebaseSummary)
  const scope = toScope(fr.type, fr.severity, fr.requestedDays)
  const messages: ChatMessage[] = fr.conversationMessages.map((m) => ({
    role: m.role === "USER" ? "user" : "assistant",
    content: m.content,
  }))

  let prd: PrdContent
  try {
    prd = await generatePrd({ grounding, scope, messages })
  } catch {
    return { ok: false, error: "We could not generate the PRD. Please try again." }
  }

  const fields = serializePrdFields(prd)
  const rawDescription =
    messages.find((m) => m.role === "user")?.content ?? prd.problemStatement

  await prisma.$transaction(async (tx) => {
    const existing = await tx.prd.findUnique({ where: { featureRequestId } })
    if (existing) {
      await tx.acceptanceCriterion.deleteMany({ where: { prdId: existing.id } })
      await tx.prd.update({
        where: { id: existing.id },
        data: { ...fields, version: { increment: 1 } },
      })
      await tx.acceptanceCriterion.createMany({
        data: prd.acceptanceCriteria.map((c, i) => ({
          prdId: existing.id,
          title: c.title,
          description: c.description,
          order: i,
        })),
      })
    } else {
      const created = await tx.prd.create({ data: { featureRequestId, ...fields } })
      await tx.acceptanceCriterion.createMany({
        data: prd.acceptanceCriteria.map((c, i) => ({
          prdId: created.id,
          title: c.title,
          description: c.description,
          order: i,
        })),
      })
    }
    await tx.featureRequest.update({
      where: { id: featureRequestId },
      data: { title: prd.title, rawDescription },
    })
  })

  revalidatePath("/portal", "layout")
  return { ok: true, data: { ready: true } }
}

export async function finalizeRequest(
  featureRequestId: string,
): Promise<ActionResult<{ ticketNumber: number }>> {
  const ctx = await getAuthContext()
  if (!ctx || ctx.role !== "CLIENT") return { ok: false, error: "Not authorized" }
  if (typeof featureRequestId !== "string" || featureRequestId.length === 0) {
    return { ok: false, error: "Invalid request" }
  }

  try {
    const ticketNumber = await prisma.$transaction(async (tx) => {
      const fr = await tx.featureRequest.findUnique({
        where: { id: featureRequestId },
        include: {
          prd: { select: { id: true } },
          project: { select: { workspaceId: true } },
        },
      })
      if (!fr || fr.clientId !== ctx.userId || fr.project.workspaceId !== ctx.workspaceId) {
        throw new Error("NOT_FOUND")
      }
      if (fr.status !== "DISCOVERY") throw new Error("BAD_STATE")
      if (!fr.prd) throw new Error("NO_PRD")

      const proj = await tx.project.update({
        where: { id: fr.projectId },
        data: { ticketSeq: { increment: 1 } },
        select: { ticketSeq: true },
      })

      await tx.featureRequest.update({
        where: { id: featureRequestId },
        data: { ticketNumber: proj.ticketSeq, status: "PRD_DRAFT" },
      })

      await tx.auditLog.create({
        data: {
          workspaceId: fr.project.workspaceId,
          actorId: ctx.userId,
          action: "feature_request.finalized",
          entityType: "FeatureRequest",
          entityId: featureRequestId,
          metadata: JSON.stringify({ ticketNumber: proj.ticketSeq }),
        },
      })

      return proj.ticketSeq
    })

    revalidatePath("/portal", "layout")
    return { ok: true, data: { ticketNumber } }
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN"
    if (code === "NO_PRD") return { ok: false, error: "Generate the PRD before submitting" }
    if (code === "BAD_STATE") return { ok: false, error: "This request has already been submitted" }
    if (code === "NOT_FOUND") return { ok: false, error: "Request not found" }
    return { ok: false, error: "We could not submit your request. Please try again." }
  }
}