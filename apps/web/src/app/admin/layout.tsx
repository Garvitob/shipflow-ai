import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole("ADMIN")
  return <PortalShell ctx={ctx} role="ADMIN" breadcrumb="Overview">{children}</PortalShell>
}