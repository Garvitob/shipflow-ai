import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { ZodError } from "zod"
import type { Role } from "@shipflow/db"

export type TRPCContext = {
  auth: {
    userId: string
    email: string
    name: string
    workspaceId: string
    workspaceName: string
    workspaceSlug: string
    role: Role
  } | null
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zod: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const createCallerFactory = t.createCallerFactory
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({ ctx: { auth: ctx.auth } })
})

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.auth.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" })
  }
  return next({ ctx })
})