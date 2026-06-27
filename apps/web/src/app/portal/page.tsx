import { requireRole } from "@/lib/auth-guard"
import { PortalWelcome } from "@/components/portal-welcome"

export default async function ClientPage() {
  const ctx = await requireRole("CLIENT")
  return (
    <PortalWelcome
      title="My requests"
      name={ctx.name}
      workspaceName={ctx.workspaceName}
      description="Submit feature requests and track their progress from idea to shipped. Your requests will appear here."
    />
  )
}