import { requireRole } from "@/lib/auth-guard"
import { PortalWelcome } from "@/components/portal-welcome"

export default async function AdminPage() {
  const ctx = await requireRole("ADMIN")
  return (
    <PortalWelcome
      title="Overview"
      name={ctx.name}
      workspaceName={ctx.workspaceName}
      description="Your workspace is ready. Add projects, invite your team, and track everything shipping across the company from here."
    />
  )
}