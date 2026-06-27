import { ROLE_LABELS, type Role } from "@/lib/navigation"
import { AppShell } from "@/components/shell/app-shell"
import type { AuthContext } from "@/lib/auth-guard"

export function PortalShell({
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
  return (
    <AppShell
      role={role}
      workspace={{ id: ctx.workspaceId, name: ctx.workspaceName, plan: "Professional" }}
      user={{ name: ctx.name, email: ctx.email, roleLabel: ROLE_LABELS[role] }}
      projects={[]}
      activeProjectId={null}
      canCreateProject={role === "ADMIN"}
      breadcrumb={breadcrumb}
    >
      {children}
    </AppShell>
  )
}