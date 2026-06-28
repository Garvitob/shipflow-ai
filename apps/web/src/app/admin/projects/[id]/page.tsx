import { requireRole } from "@/lib/auth-guard"
import { ProjectDetail } from "@/components/admin/project-detail"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole("ADMIN")
  const { id } = await params
  return <ProjectDetail projectId={id} />
}