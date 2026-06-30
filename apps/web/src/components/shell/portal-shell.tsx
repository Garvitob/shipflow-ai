import { ROLE_LABELS, type Role, type NavSection } from "@/lib/navigation"
import { AppShell } from "@/components/shell/app-shell"
import { prisma } from "@shipflow/db"
import type { AuthContext } from "@/lib/auth-guard"

const PLAN_LABEL: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
}

export async function PortalShell({
  ctx,
  role,
  breadcrumb,
  navSections,
  activeProjectId = null,
  children,
}: {
  ctx: AuthContext
  role: Role
  breadcrumb: string
  navSections?: NavSection[]
  activeProjectId?: string | null
  children: React.ReactNode
}) {
  const projects = await prisma.project.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      ...(role === "CLIENT"
        ? { projectMembers: { some: { userId: ctx.userId } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  })

  return (
    <AppShell
      role={role}
      workspace={{
        id: ctx.workspaceId,
        name: ctx.workspaceName,
        plan: PLAN_LABEL[ctx.workspacePlan] ?? ctx.workspacePlan,
      }}
      user={{ name: ctx.name, email: ctx.email, roleLabel: ROLE_LABELS[role] }}
      projects={projects}
      activeProjectId={activeProjectId}
      canCreateProject={role === "ADMIN"}
      breadcrumb={breadcrumb}
      navSections={navSections}
    >
      {children}
    </AppShell>
  )
}