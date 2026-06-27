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
})