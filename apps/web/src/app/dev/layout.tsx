import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole("DEVELOPER")
  return <PortalShell ctx={ctx} role="DEVELOPER" breadcrumb="My work">{children}</PortalShell>
}