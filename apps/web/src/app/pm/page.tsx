import { requireRole } from "@/lib/auth-guard"
import { PortalWelcome } from "@/components/portal-welcome"

export default async function PmPage() {
  const ctx = await requireRole("PM")
  return (
    <PortalWelcome
      title="Overview"
      name={ctx.name}
      workspaceName={ctx.workspaceName}
      description="Review feature requests, approve PRDs, and keep delivery moving. Assigned projects will appear here."
    />
  )
}