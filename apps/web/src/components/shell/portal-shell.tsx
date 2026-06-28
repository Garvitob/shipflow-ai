import { ROLE_LABELS, type Role } from "@/lib/navigation"
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
  children,
}: {
  ctx: AuthContext
  role: Role
  breadcrumb: string
  children: React.ReactNode
}) {
  const projects = await prisma.project.findMany({
    where: { workspaceId: ctx.workspaceId },
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
      activeProjectId={null}
      canCreateProject={role === "ADMIN"}
      breadcrumb={breadcrumb}
    >
      {children}
    </AppShell>
  )
}