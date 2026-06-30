import "server-only"
import { prisma } from "@shipflow/db"

type ClientScope = { userId: string; workspaceId: string }

export type ClientProjectListItem = {
  id: string
  name: string
  description: string
  requestCount: number
  lastActivity: Date | null
}

export async function listClientProjects(
  scope: ClientScope,
): Promise<ClientProjectListItem[]> {
  const members = await prisma.projectMember.findMany({
    where: { userId: scope.userId, project: { workspaceId: scope.workspaceId } },
    select: { project: { select: { id: true, name: true, description: true } } },
    orderBy: { createdAt: "asc" },
  })

  const projects = members.map((m) => m.project)
  if (projects.length === 0) return []

  const grouped = await prisma.featureRequest.groupBy({
    by: ["projectId"],
    where: {
      projectId: { in: projects.map((p) => p.id) },
      clientId: scope.userId,
    },
    _count: { _all: true },
    _max: { updatedAt: true },
  })

  const stats = new Map(
    grouped.map((g) => [g.projectId, { count: g._count._all, last: g._max.updatedAt }]),
  )

  return projects.map((p) => {
    const s = stats.get(p.id)
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      requestCount: s?.count ?? 0,
      lastActivity: s?.last ?? null,
    }
  })
}

export async function listClientRequests(scope: ClientScope, projectId: string) {
  const member = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: scope.userId,
      project: { workspaceId: scope.workspaceId },
    },
    select: { project: { select: { id: true, name: true } } },
  })
  if (!member) return null

  const requests = await prisma.featureRequest.findMany({
    where: { projectId, clientId: scope.userId },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      type: true,
      severity: true,
      requestedDays: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  })

  return { project: member.project, requests }
}

export async function getClientRequestDetail(
  scope: ClientScope,
  featureRequestId: string,
) {
  const fr = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: {
      project: { select: { id: true, name: true, workspaceId: true } },
      prd: { include: { acceptanceCriteria: { orderBy: { order: "asc" } } } },
    },
  })
  if (
    !fr ||
    fr.clientId !== scope.userId ||
    fr.project.workspaceId !== scope.workspaceId
  ) {
    return null
  }
  return fr
}

export type ClientRequestsData = NonNullable<
  Awaited<ReturnType<typeof listClientRequests>>
>
export type ClientRequestRow = ClientRequestsData["requests"][number]
export type ClientRequestDetail = NonNullable<
  Awaited<ReturnType<typeof getClientRequestDetail>>
>