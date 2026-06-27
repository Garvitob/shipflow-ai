import "server-only"
import { prisma } from "@shipflow/db"

export type AuditAction =
  | "workspace.provisioned"
  | "user.login"
  | "password.reset_requested"
  | "password.reset_completed"

type AuditInput = {
  workspaceId: string
  actorId: string
  action: AuditAction
  entityType: string
  entityId: string
  metadata?: Record<string, unknown>
}

// Writes an audit entry. Fail-soft by design: an audit failure must never
// break the user action that triggered it (e.g. a logging hiccup should
// not block a login). Errors are logged for alerting instead of thrown.
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    })
  } catch (err) {
    console.error("[audit] failed to write audit log:", input.action, err)
  }
}

// Resolves a user's primary workspace for audit attribution. Used by auth
// events where we have the user but need their workspace context.
export async function resolveWorkspaceId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  })
  return membership?.workspaceId ?? null
}