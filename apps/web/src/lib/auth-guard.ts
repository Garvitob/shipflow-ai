import "server-only"
import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@shipflow/db"
import type { Role } from "@shipflow/db"

export const getCurrentSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  return session
})

export type AuthContext = {
  userId: string
  email: string
  name: string
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  role: Role
}

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const session = await getCurrentSession()
  if (!session?.user) return null

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  })
  if (!membership) return null

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    workspaceId: membership.workspaceId,
    workspaceName: membership.workspace.name,
    workspaceSlug: membership.workspace.slug,
    role: membership.role,
  }
})

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) redirect("/login")
  return ctx
}

export async function requireRole(allowed: Role | Role[]): Promise<AuthContext> {
  const ctx = await requireAuth()
  const roles = Array.isArray(allowed) ? allowed : [allowed]
  if (!roles.includes(ctx.role)) {
    redirect(ROLE_HOME[ctx.role])
  }
  return ctx
}

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  PM: "/pm",
  SENIOR_ENG: "/review",
  DEVELOPER: "/dev",
  CLIENT: "/portal",
}