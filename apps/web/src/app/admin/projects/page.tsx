import { requireRole } from "@/lib/auth-guard"
import { ProjectsList } from "@/components/admin/projects-list"

export default async function ProjectsPage() {
  await requireRole("ADMIN")
  return <ProjectsList />
}