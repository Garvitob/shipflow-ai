import { requireRole } from "@/lib/auth-guard"
import { NewProjectForm } from "@/components/admin/new-project-form"

export default async function NewProjectPage() {
  await requireRole("ADMIN")
  return <NewProjectForm />
}