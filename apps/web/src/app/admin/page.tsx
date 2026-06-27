import { requireRole } from "@/lib/auth-guard"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  await requireRole("ADMIN")
  return <AdminDashboard />
}