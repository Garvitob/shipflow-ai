import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"

export default async function PmLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole("PM")
  return <PortalShell ctx={ctx} role="PM" breadcrumb="Overview">{children}</PortalShell>
}