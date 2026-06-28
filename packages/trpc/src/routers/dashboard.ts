import { z } from "zod"
import { prisma } from "@shipflow/db"
import { router, adminProcedure } from "../trpc"

export const dashboardRouter = router({
  stats: adminProcedure.query(async ({ ctx }) => {
    const [workspace, projectCount, memberCount] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: ctx.auth.workspaceId },
        select: { name: true, slug: true, plan: true, credits: true },
      }),
      prisma.project.count({
        where: { workspaceId: ctx.auth.workspaceId },
      }),
      prisma.projectMember.count({
        where: { project: { workspaceId: ctx.auth.workspaceId } },
      }),
    ])

    return {
      workspaceName: workspace?.name ?? ctx.auth.workspaceName,
      plan: workspace?.plan ?? "FREE",
      credits: workspace?.credits ?? 0,
      projectCount,
      memberCount,
    }
  }),

  activity: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(8) }))
    .query(async ({ ctx, input }) => {
      const entries = await prisma.auditLog.findMany({
        where: { workspaceId: ctx.auth.workspaceId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
        },
      })
      return entries
    }),

  pendingInvites: adminProcedure.query(async ({ ctx }) => {
    const members = await prisma.projectMember.findMany({
      where: {
        project: { workspaceId: ctx.auth.workspaceId },
        user: { accounts: { none: { password: { not: null } } } },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    })

    const seen = new Set<string>()
    const unique = members.filter((m) => {
      if (seen.has(m.user.id)) return false
      seen.add(m.user.id)
      return true
    })

    return unique.map((m) => ({
      id: m.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      projectName: m.project.name,
    }))
  }),

  auditLog: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entries = await prisma.auditLog.findMany({
        where: { workspaceId: ctx.auth.workspaceId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          action: true,
          actorId: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
        },
      })

      let nextCursor: string | undefined
      if (entries.length > input.limit) {
        const next = entries.pop()
        nextCursor = next?.id
      }

      const actorIds = [...new Set(entries.map((e) => e.actorId))]
      const actors = await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      })
      const actorName = new Map(actors.map((a) => [a.id, a.name]))

      const items = entries.map((e) => ({
        id: e.id,
        action: e.action,
        actor: actorName.get(e.actorId) ?? "Unknown",
        entityType: e.entityType,
        entityId: e.entityId,
        metadata: e.metadata,
        createdAt: e.createdAt,
      }))

      return { items, nextCursor }
    }),
})