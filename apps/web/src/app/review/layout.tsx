import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"

export default async function ReviewLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole("SENIOR_ENG")
  return <PortalShell ctx={ctx} role="SENIOR_ENG" breadcrumb="Review queue">{children}</PortalShell>
}