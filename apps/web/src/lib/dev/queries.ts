import "server-only"
import { prisma, FeatureStatus, TaskStatus } from "@shipflow/db"

type DevScope = { userId: string; workspaceId: string }

const DEV_REQUEST_STATUSES: FeatureStatus[] = [
  FeatureStatus.IN_DEV,
  FeatureStatus.FIX_NEEDED,
]

export type DevTask = {
  id: string
  title: string
  description: string
  complexity: string
  status: TaskStatus
  acceptanceCriterionId: string
  assignedToId: string | null
  assignedToName: string | null
  isMine: boolean
}

export type DevRequestGroup = {
  featureRequestId: string
  ticketNumber: number | null
  title: string
  type: string
  severity: number | null
  status: FeatureStatus
  projectId: string
  projectName: string
  prdVersion: number
  tasks: DevTask[]
  taskCount: number
  doneCount: number
}

export async function listDevBoard(scope: DevScope): Promise<DevRequestGroup[]> {
  const requests = await prisma.featureRequest.findMany({
    where: {
      status: { in: DEV_REQUEST_STATUSES },
      project: {
        workspaceId: scope.workspaceId,
      },
    },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      type: true,
      severity: true,
      status: true,
      project: { select: { id: true, name: true } },
      prd: {
        select: {
          version: true,
          tasks: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              complexity: true,
              status: true,
              acceptanceCriterionId: true,
              assignedToId: true,
              assignedTo: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return requests.map((r) => {
    const tasks: DevTask[] = (r.prd?.tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      complexity: t.complexity,
      status: t.status,
      acceptanceCriterionId: t.acceptanceCriterionId,
      assignedToId: t.assignedToId,
      assignedToName: t.assignedTo?.name ?? null,
      isMine: t.assignedToId === scope.userId,
    }))

    return {
      featureRequestId: r.id,
      ticketNumber: r.ticketNumber,
      title: r.title,
      type: r.type,
      severity: r.severity,
      status: r.status,
      projectId: r.project.id,
      projectName: r.project.name,
      prdVersion: r.prd?.version ?? 1,
      tasks,
      taskCount: tasks.length,
      doneCount: tasks.filter((t) => t.status === TaskStatus.DONE).length,
    }
  })
}

export async function getDevRequestDetail(
  scope: DevScope,
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
          gitHubRepo: { select: { repoFullName: true } },
        },
      },
      prd: {
        include: {
          acceptanceCriteria: { orderBy: { order: "asc" } },
          tasks: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  })

  if (!fr || fr.project.workspaceId !== scope.workspaceId) {
    return null
  }

  return fr
}

export type DevRequestDetail = NonNullable<
  Awaited<ReturnType<typeof getDevRequestDetail>>
>