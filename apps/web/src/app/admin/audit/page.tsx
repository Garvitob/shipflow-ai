import { requireRole } from "@/lib/auth-guard"
import { AuditLog } from "@/components/admin/audit-log"

export default async function AuditPage() {
  await requireRole("ADMIN")
  return <AuditLog />
}