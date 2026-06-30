import "server-only"
import { prisma, FeatureStatus } from "@shipflow/db"

type PmScope = { userId: string; workspaceId: string }

const PIPELINE_STATUSES: FeatureStatus[] = [
  FeatureStatus.PRD_DRAFT,
  FeatureStatus.PRD_APPROVED,
  FeatureStatus.PLANNING,
  FeatureStatus.IN_DEV,
  FeatureStatus.IN_REVIEW,
  FeatureStatus.FIX_NEEDED,
  FeatureStatus.PENDING_APPROVAL,
  FeatureStatus.SHIPPED,
  FeatureStatus.REJECTED,
]

export type PmRequestRow = {
  id: string
  ticketNumber: number | null
  title: string
  type: string
  severity: number | null
  status: FeatureStatus
  updatedAt: Date
  project: { id: string; name: string }
  clientName: string
}

export async function listPmRequests(scope: PmScope): Promise<PmRequestRow[]> {
  const requests = await prisma.featureRequest.findMany({
    where: {
      status: { in: PIPELINE_STATUSES },
      project: {
        workspaceId: scope.workspaceId,
        projectMembers: { some: { userId: scope.userId, role: "PM" } },
      },
    },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      type: true,
      severity: true,
      status: true,
      updatedAt: true,
      clientId: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  if (requests.length === 0) return []

  const clientIds = Array.from(new Set(requests.map((r) => r.clientId)))
  const clients = await prisma.user.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true },
  })
  const nameById = new Map(clients.map((c) => [c.id, c.name]))

  return requests.map((r) => ({
    id: r.id,
    ticketNumber: r.ticketNumber,
    title: r.title,
    type: r.type,
    severity: r.severity,
    status: r.status,
    updatedAt: r.updatedAt,
    project: r.project,
    clientName: nameById.get(r.clientId) ?? "Unknown",
  }))
}

export async function getPmRequestDetail(
  scope: PmScope,
  featureRequestId: string,
) {
  const fr = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          workspaceId: true,
          projectMembers: {
            where: { userId: scope.userId, role: "PM" },
            select: { id: true },
          },
        },
      },
      prd: { include: { acceptanceCriteria: { orderBy: { order: "asc" } } } },
    },
  })

  if (
    !fr ||
    fr.project.workspaceId !== scope.workspaceId ||
    fr.project.projectMembers.length === 0
  ) {
    return null
  }

  const client = await prisma.user.findUnique({
    where: { id: fr.clientId },
    select: { id: true, name: true, email: true },
  })

  return {
    ...fr,
    client: client ?? { id: fr.clientId, name: "Unknown", email: "" },
  }
}

export type PmRequestDetail = NonNullable<
  Awaited<ReturnType<typeof getPmRequestDetail>>
>