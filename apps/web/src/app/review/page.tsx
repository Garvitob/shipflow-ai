import { requireRole } from "@/lib/auth-guard"
import { PortalWelcome } from "@/components/portal-welcome"

export default async function ReviewPage() {
  const ctx = await requireRole("SENIOR_ENG")
  return (
    <PortalWelcome
      title="Review queue"
      name={ctx.name}
      workspaceName={ctx.workspaceName}
      description="Pull requests awaiting review will appear here, with AI findings traced to acceptance criteria for every change."
    />
  )
}