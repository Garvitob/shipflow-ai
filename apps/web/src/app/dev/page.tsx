import { requireRole } from "@/lib/auth-guard"
import { PortalWelcome } from "@/components/portal-welcome"

export default async function DevPage() {
  const ctx = await requireRole("DEVELOPER")
  return (
    <PortalWelcome
      title="My work"
      name={ctx.name}
      workspaceName={ctx.workspaceName}
      description="Tasks assigned to you, their PRs, and review feedback will show up here as work gets allocated."
    />
  )
}