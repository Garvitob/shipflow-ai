"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@shipflow/db"
import { getAuthContext } from "@/lib/auth-guard"

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

type Guard =
  | { ok: true; userId: string; workspaceId: string; status: string }
  | { ok: false }

async function requireSeniorForRequest(featureRequestId: string): Promise<Guard> {
  const ctx = await getAuthContext()
  if (!ctx || ctx.role !== "SENIOR_ENG") return { ok: false }

  const fr = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    select: { status: true, project: { select: { workspaceId: true } } },
  })

  if (!fr || fr.project.workspaceId !== ctx.workspaceId) return { ok: false }

  return {
    ok: true,
    userId: ctx.userId,
    workspaceId: fr.project.workspaceId,
    status: fr.status,
  }
}

export async function approveAndShip(
  featureRequestId: string,
): Promise<ActionResult<{ shipped: true }>> {
  if (typeof featureRequestId !== "string" || featureRequestId.length === 0) {
    return { ok: false, error: "Invalid request" }
  }

  const guard = await requireSeniorForRequest(featureRequestId)
  if (!guard.ok) return { ok: false, error: "Not authorized" }
  if (guard.status !== "PENDING_APPROVAL") {
    return { ok: false, error: "This request is not awaiting final approval" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "SHIPPED" },
      })

      await tx.auditLog.create({
        data: {
          workspaceId: guard.workspaceId,
          actorId: guard.userId,
          action: "feature_request.shipped",
          entityType: "FeatureRequest",
          entityId: featureRequestId,
        },
      })
    })

    revalidatePath("/review", "layout")
    return { ok: true, data: { shipped: true } }
  } catch {
    return { ok: false, error: "We could not ship this request. Please try again." }
  }
}

export async function sendBackToDev(
  featureRequestId: string,
  note: string,
): Promise<ActionResult<{ sentBack: true }>> {
  if (typeof featureRequestId !== "string" || featureRequestId.length === 0) {
    return { ok: false, error: "Invalid request" }
  }
  const trimmed = (note ?? "").trim().slice(0, 1000)

  const guard = await requireSeniorForRequest(featureRequestId)
  if (!guard.ok) return { ok: false, error: "Not authorized" }
  if (guard.status !== "PENDING_APPROVAL" && guard.status !== "IN_REVIEW") {
    return { ok: false, error: "This request cannot be sent back right now" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "FIX_NEEDED" },
      })

      await tx.auditLog.create({
        data: {
          workspaceId: guard.workspaceId,
          actorId: guard.userId,
          action: "feature_request.sent_back",
          entityType: "FeatureRequest",
          entityId: featureRequestId,
          metadata: trimmed ? JSON.stringify({ note: trimmed }) : undefined,
        },
      })
    })

    revalidatePath("/review", "layout")
    return { ok: true, data: { sentBack: true } }
  } catch {
    return { ok: false, error: "We could not send this back. Please try again." }
  }
}