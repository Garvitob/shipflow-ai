import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { prisma, Role, ProjectType } from "@shipflow/db"
import { router, adminProcedure } from "../trpc"

const repoFullName = z
  .string()
  .trim()
  .regex(/^[\w.-]+\/[\w.-]+$/, "Enter a repository as owner/repo")

const createInput = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(500),
  techStack: z.string().trim().min(2),
  existingFeatures: z.string().trim().min(2),
  businessGoals: z.string().trim().min(2),
  targetUsers: z.string().trim().min(2),
  projectType: z.nativeEnum(ProjectType).default(ProjectType.EXISTING),
  repoFullName,
})

const updateInput = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(500),
  techStack: z.string().trim().min(2),
  existingFeatures: z.string().trim().min(2),
  businessGoals: z.string().trim().min(2),
  targetUsers: z.string().trim().min(2),
  projectType: z.nativeEnum(ProjectType),
})

const memberRole = z.enum(["PM", "SENIOR_ENG", "DEVELOPER", "CLIENT"])

export const projectsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const projects = await prisma.project.findMany({
      where: { workspaceId: ctx.auth.workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        projectType: true,
        createdAt: true,
        gitHubRepo: { select: { repoFullName: true, installationId: true } },
        _count: { select: { projectMembers: true } },
      },
    })
    return projects
  }),

  get: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.id, workspaceId: ctx.auth.workspaceId },
        include: {
          gitHubRepo: { select: { repoFullName: true, installationId: true } },
          projectMembers: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              role: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  accounts: { select: { password: true } },
                },
              },
            },
          },
        },
      })

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" })
      }

      const members = project.projectMembers.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: { id: m.user.id, name: m.user.name, email: m.user.email },
        status: m.user.accounts.some((a) => a.password)
          ? ("active" as const)
          : ("pending" as const),
      }))

      const { projectMembers, ...rest } = project
      void projectMembers
      return { ...rest, members }
    }),

  create: adminProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.$transaction(async (tx) => {
        const created = await tx.project.create({
          data: {
            workspaceId: ctx.auth.workspaceId,
            name: input.name,
            description: input.description,
            techStack: input.techStack,
            existingFeatures: input.existingFeatures,
            businessGoals: input.businessGoals,
            targetUsers: input.targetUsers,
            projectType: input.projectType,
          },
        })

        await tx.gitHubRepo.create({
          data: {
            projectId: created.id,
            repoFullName: input.repoFullName,
          },
        })

        await tx.auditLog.create({
          data: {
            workspaceId: ctx.auth.workspaceId,
            actorId: ctx.auth.userId,
            action: "project.created",
            entityType: "Project",
            entityId: created.id,
            metadata: JSON.stringify({
              name: created.name,
              repo: input.repoFullName,
            }),
          },
        })

        return created
      })

      return { id: project.id }
    }),

  update: adminProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.project.findFirst({
        where: { id: input.id, workspaceId: ctx.auth.workspaceId },
        select: { id: true },
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" })
      }

      await prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id: input.id },
          data: {
            name: input.name,
            description: input.description,
            techStack: input.techStack,
            existingFeatures: input.existingFeatures,
            businessGoals: input.businessGoals,
            targetUsers: input.targetUsers,
            projectType: input.projectType,
          },
        })

        await tx.auditLog.create({
          data: {
            workspaceId: ctx.auth.workspaceId,
            actorId: ctx.auth.userId,
            action: "project.updated",
            entityType: "Project",
            entityId: input.id,
          },
        })
      })

      return { id: input.id }
    }),

  addMember: adminProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        email: z.string().trim().toLowerCase().email(),
        name: z.string().trim().min(1).max(120),
        role: memberRole,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, workspaceId: ctx.auth.workspaceId },
        select: { id: true },
      })
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" })
      }

      const result = await prisma.$transaction(async (tx) => {
        let user = await tx.user.findUnique({ where: { email: input.email } })
        const isNewUser = !user

        if (!user) {
          user = await tx.user.create({
            data: {
              email: input.email,
              name: input.name,
              emailVerified: false,
            },
          })
        }

        const existingMember = await tx.projectMember.findUnique({
          where: {
            projectId_userId: { projectId: input.projectId, userId: user.id },
          },
          select: { id: true },
        })
        if (existingMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This person is already on the project",
          })
        }

        await tx.projectMember.create({
          data: {
            projectId: input.projectId,
            userId: user.id,
            role: input.role as Role,
          },
        })

        if (!ctx.auth.workspaceId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
        }

        await tx.auditLog.create({
          data: {
            workspaceId: ctx.auth.workspaceId,
            actorId: ctx.auth.userId,
            action: "project.member_added",
            entityType: "Project",
            entityId: input.projectId,
            metadata: JSON.stringify({ email: input.email, role: input.role }),
          },
        })

        return { userId: user.id, email: user.email, isNewUser }
      })

      return result
    }),

  removeMember: adminProcedure
    .input(z.object({ projectId: z.string().min(1), memberId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const member = await prisma.projectMember.findFirst({
        where: {
          id: input.memberId,
          projectId: input.projectId,
          project: { workspaceId: ctx.auth.workspaceId },
        },
        select: { id: true, userId: true, role: true },
      })
      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" })
      }

      await prisma.$transaction(async (tx) => {
        await tx.projectMember.delete({ where: { id: input.memberId } })

        await tx.auditLog.create({
          data: {
            workspaceId: ctx.auth.workspaceId,
            actorId: ctx.auth.userId,
            action: "project.member_removed",
            entityType: "Project",
            entityId: input.projectId,
            metadata: JSON.stringify({ userId: member.userId, role: member.role }),
          },
        })
      })

      return { id: input.memberId }
    }),
})