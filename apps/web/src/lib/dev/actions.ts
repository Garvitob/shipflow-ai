"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma, AssigneeType } from "@shipflow/db"
import { getAuthContext } from "@/lib/auth-guard"
import { runReview, type ReviewVerdict } from "@/lib/ai/review"

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

const PR_URL_RE =
  /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)(?:[/?#].*)?$/

type ParsedPr = { owner: string; repo: string; number: number }

function parsePrUrl(url: string): ParsedPr | null {
  const m = url.trim().match(PR_URL_RE)
  if (!m) return null
  const owner = m[1]
  const repo = m[2]
  const number = Number.parseInt(m[3], 10)
  if (!Number.isFinite(number) || number <= 0) return null
  return { owner, repo, number }
}

const submitInput = z.object({
  featureRequestId: z.string().min(1),
  prUrl: z.string().trim().min(1).max(500),
})

export async function submitPrForReview(
  raw: z.infer<typeof submitInput>,
): Promise<
  ActionResult<{
    verdict: ReviewVerdict
    findingCount: number
    blockingCount: number
  }>
> {
  const parsed = submitInput.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Invalid submission" }
  const { featureRequestId, prUrl } = parsed.data

  const pr = parsePrUrl(prUrl)
  if (!pr) {
    return {
      ok: false,
      error: "Enter a valid GitHub pull request URL (github.com/owner/repo/pull/123)",
    }
  }

  const ctx = await getAuthContext()
  if (!ctx || ctx.role !== "DEVELOPER") return { ok: false, error: "Not authorized" }

  const fr = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: {
      project: {
        select: {
          workspaceId: true,
          gitHubRepo: { select: { id: true, repoFullName: true } },
        },
      },
    },
  })

  if (!fr || fr.project.workspaceId !== ctx.workspaceId) {
    return { ok: false, error: "Request not found" }
  }
  if (fr.status !== "IN_DEV" && fr.status !== "FIX_NEEDED") {
    return { ok: false, error: "This request is not ready for review submission" }
  }

  const repo = fr.project.gitHubRepo
  if (!repo) {
    return { ok: false, error: "This project has no connected GitHub repository" }
  }

  const expected = repo.repoFullName.toLowerCase()
  const provided = `${pr.owner}/${pr.repo}`.toLowerCase()
  if (expected !== provided) {
    return {
      ok: false,
      error: `That pull request is not on this project's repository (${repo.repoFullName})`,
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.pullRequest.create({
        data: {
          repoId: repo.id,
          featureRequestId,
          prNumber: pr.number,
          title: `PR #${pr.number}`,
          branchName: "",
          commitSha: "",
          authorType: AssigneeType.HUMAN,
          authorGithubHandle: pr.owner,
        },
      })

      await tx.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "IN_REVIEW" },
      })

      await tx.auditLog.create({
        data: {
          workspaceId: fr.project.workspaceId,
          actorId: ctx.userId,
          action: "pull_request.submitted",
          entityType: "FeatureRequest",
          entityId: featureRequestId,
          metadata: JSON.stringify({
            repo: repo.repoFullName,
            prNumber: pr.number,
          }),
        },
      })
    })
  } catch {
    return { ok: false, error: "We could not submit this PR. Please try again." }
  }

  try {
    const result = await runReview(featureRequestId, pr.number, ctx.userId)
    revalidatePath("/dev", "layout")
    revalidatePath("/review", "layout")
    return { ok: true, data: result }
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN"
    revalidatePath("/dev", "layout")
    revalidatePath("/review", "layout")
    if (code === "NO_INSTALLATION" || code === "NO_REPO") {
      return {
        ok: false,
        error:
          "The GitHub App is not installed on this repository, so the diff could not be read.",
      }
    }
    return {
      ok: false,
      error: "The PR was submitted, but the AI review could not complete. Please retry.",
    }
  }
}