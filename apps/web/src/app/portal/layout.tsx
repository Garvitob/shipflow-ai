import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole("CLIENT")
  return <PortalShell ctx={ctx} role="CLIENT" breadcrumb="My requests">{children}</PortalShell>
}