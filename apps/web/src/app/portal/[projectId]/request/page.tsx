import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { listClientRequests } from "@/lib/discovery/queries"
import { DiscoveryChat } from "@/components/portal/discovery-chat"
import { type NavSection } from "@/lib/navigation"

export const dynamic = "force-dynamic"

export default async function RequestPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const ctx = await requireRole("CLIENT")
  const data = await listClientRequests(ctx, projectId)
  if (!data) notFound()

  const navSections: NavSection[] = [
    {
      items: [
        { label: "Dashboard", href: `/portal/${projectId}`, icon: "dashboard" },
        {
          label: "Generate request",
          href: `/portal/${projectId}/request`,
          icon: "newRequest",
        },
      ],
    },
  ]

  return (
    <PortalShell
      ctx={ctx}
      role="CLIENT"
      breadcrumb="New request"
      activeProjectId={projectId}
      navSections={navSections}
    >
      <DiscoveryChat projectId={projectId} projectName={data.project.name} />
    </PortalShell>
  )
}