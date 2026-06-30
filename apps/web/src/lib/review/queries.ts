import "server-only"
import { prisma, FeatureStatus } from "@shipflow/db"

type ReviewScope = { userId: string; workspaceId: string }

const REVIEW_STATUSES: FeatureStatus[] = [
  FeatureStatus.IN_REVIEW,
  FeatureStatus.FIX_NEEDED,
  FeatureStatus.PENDING_APPROVAL,
  FeatureStatus.SHIPPED,
]

export type ReviewRow = {
  id: string
  ticketNumber: number | null
  title: string
  type: string
  severity: number | null
  status: FeatureStatus
  updatedAt: Date
  projectId: string
  projectName: string
}

export async function listReviewQueue(scope: ReviewScope): Promise<ReviewRow[]> {
  const requests = await prisma.featureRequest.findMany({
    where: {
      status: { in: REVIEW_STATUSES },
      project: { workspaceId: scope.workspaceId },
    },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      type: true,
      severity: true,
      status: true,
      updatedAt: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return requests.map((r) => ({
    id: r.id,
    ticketNumber: r.ticketNumber,
    title: r.title,
    type: r.type,
    severity: r.severity,
    status: r.status,
    updatedAt: r.updatedAt,
    projectId: r.project.id,
    projectName: r.project.name,
  }))
}

export async function getReviewDetail(
  scope: ReviewScope,
  featureRequestId: string,
) {
  const fr = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: {
      project: {
        select: { id: true, name: true, workspaceId: true },
      },
      prd: {
        include: { acceptanceCriteria: { orderBy: { order: "asc" } } },
      },
    },
  })

  if (!fr || !fr.prd || fr.project.workspaceId !== scope.workspaceId) {
    return null
  }

  const pullRequest = await prisma.pullRequest.findFirst({
    where: { featureRequestId },
    orderBy: { createdAt: "desc" },
    include: {
      reviewSnapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          reviewRuns: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              findings: {
                orderBy: { severity: "asc" },
                include: {
                  acceptanceCriterion: { select: { title: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  const snapshot = pullRequest?.reviewSnapshots[0] ?? null
  const run = snapshot?.reviewRuns[0] ?? null

  return {
    request: fr,
    prd: fr.prd,
    pullRequest: pullRequest
      ? {
          prNumber: pullRequest.prNumber,
          branchName: pullRequest.branchName,
          status: pullRequest.status,
        }
      : null,
    run: run
      ? {
          id: run.id,
          reconciledResult: run.reconciledResult,
          createdAt: run.createdAt,
          findings: run.findings.map((f) => ({
            id: f.id,
            severity: f.severity,
            category: f.category,
            title: f.title,
            description: f.description,
            quotedEvidence: f.quotedEvidence,
            status: f.status,
            criterionTitle: f.acceptanceCriterion.title,
          })),
        }
      : null,
  }
}

export type ReviewDetail = NonNullable<
  Awaited<ReturnType<typeof getReviewDetail>>
>