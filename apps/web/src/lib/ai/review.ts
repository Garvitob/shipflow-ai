import "server-only"
import { z } from "zod"
import {
  prisma,
  Severity,
  FindingCategory,
  ReviewStatus,
  FindingStatus,
  PRStatus,
} from "@shipflow/db"
import { getInstallationOctokit } from "@/lib/github/client"
import { generateStructured } from "@/lib/ai/client"

const MAX_DIFF_CHARS = 30_000

const SEVERITY_VALUES = ["S1", "S2", "S3", "S4", "S5"] as const
const CATEGORY_VALUES = [
  "SECURITY",
  "CORRECTNESS",
  "PERFORMANCE",
  "REQUIREMENT",
  "EDGE_CASE",
  "CODE_QUALITY",
] as const

const findingSchema = z.object({
  criterionNumber: z
    .number()
    .int()
    .describe(
      "The 1-based number of the acceptance criterion this finding relates to, from the numbered list provided. Use the closest matching criterion.",
    ),
  severity: z
    .enum(SEVERITY_VALUES)
    .describe(
      "Severity: S1 is most severe (blocks shipping), S5 is trivial. Security holes and unmet core requirements are S1 or S2.",
    ),
  category: z
    .enum(CATEGORY_VALUES)
    .describe("The kind of issue this finding represents."),
  title: z.string().describe("A short, specific title for the issue. Under 12 words."),
  description: z
    .string()
    .describe(
      "A clear explanation of the problem and why it matters, referencing the code in the diff.",
    ),
  quotedEvidence: z
    .string()
    .describe(
      "A short verbatim snippet copied from the diff that demonstrates the issue. If the issue is a missing implementation, quote the most relevant nearby line or write 'No relevant code found in diff'.",
    ),
})

const reviewPassSchema = z.object({
  summary: z
    .string()
    .describe("A two to three sentence overall assessment from this review pass."),
  findings: z
    .array(findingSchema)
    .describe(
      "All issues found in this pass. Empty array if the code fully satisfies the criteria with no problems.",
    ),
})

type ReviewPass = z.infer<typeof reviewPassSchema>
type RawFinding = z.infer<typeof findingSchema>

export type ReviewVerdict = "PENDING_APPROVAL" | "FIX_NEEDED"

export interface ReviewResult {
  verdict: ReviewVerdict
  findingCount: number
  blockingCount: number
}

function parseRepo(repoFullName: string): { owner: string; repo: string } | null {
  const parts = repoFullName.split("/")
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return { owner: parts[0], repo: parts[1] }
}

async function fetchDiff(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<{ diff: string; headSha: string; branch: string }> {
  const octokit = await getInstallationOctokit(installationId)

  const meta = await octokit.rest.pulls.get({ owner, repo, pull_number: prNumber })
  const headSha = meta.data.head.sha
  const branch = meta.data.head.ref

  const diffResp = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: "diff" },
  })

  const diff = diffResp.data as unknown as string
  const trimmed =
    diff.length > MAX_DIFF_CHARS
      ? diff.slice(0, MAX_DIFF_CHARS) + "\n\n[diff truncated]"
      : diff

  return { diff: trimmed, headSha, branch }
}

function buildCriteriaBlock(
  criteria: { title: string; description: string }[],
): string {
  return criteria
    .map((c, i) => `${i + 1}. ${c.title} — ${c.description}`)
    .join("\n")
}

const IMPLEMENTATION_SYSTEM = [
  "You are a meticulous senior engineer performing a code review.",
  "Your job in this pass: verify the pull request diff against each acceptance criterion.",
  "For every criterion, decide whether the diff actually implements it correctly and completely.",
  "Flag any criterion that is unmet, partially met, or implemented incorrectly.",
  "Be concrete: cite the code. Do not invent problems that aren't supported by the diff.",
].join("\n")

const ADVERSARIAL_SYSTEM = [
  "You are an adversarial QA reviewer trying to find what is wrong with a pull request.",
  "Your job in this pass: hunt for security vulnerabilities, unhandled edge cases, race conditions, regressions, missing validation, and poor practices in the diff.",
  "You are not checking requirements here; you are stress-testing the implementation for defects.",
  "Be concrete and cite the code. Only report real, defensible issues.",
].join("\n")

function buildUserPrompt(
  projectName: string,
  problemStatement: string,
  criteriaBlock: string,
  diff: string,
): string {
  return [
    `Project: ${projectName}`,
    ``,
    `What this change is supposed to address:`,
    problemStatement,
    ``,
    `Acceptance criteria (numbered):`,
    criteriaBlock,
    ``,
    `Pull request diff:`,
    "```diff",
    diff,
    "```",
  ].join("\n")
}

async function runPass(
  system: string,
  prompt: string,
  schemaName: string,
): Promise<ReviewPass> {
  const result = await generateStructured({
    system,
    prompt,
    schema: reviewPassSchema,
    schemaName,
    schemaDescription: "The findings from one code review pass.",
    maxOutputTokens: 8_192,
    timeoutMs: 120_000,
  })
  return result.data
}

function clampCriterionIndex(n: number, len: number): number {
  if (!Number.isFinite(n)) return 0
  const idx = Math.round(n) - 1
  if (idx < 0) return 0
  if (idx >= len) return len - 1
  return idx
}

const BLOCKING_SEVERITIES = new Set<string>(["S1", "S2"])

export async function runReview(
  featureRequestId: string,
  prNumber: number,
  actorId: string,
): Promise<ReviewResult> {
  const fr = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: {
      project: {
        select: {
          workspaceId: true,
          name: true,
          gitHubRepo: {
            select: { id: true, repoFullName: true, installationId: true },
          },
        },
      },
      prd: {
        include: { acceptanceCriteria: { orderBy: { order: "asc" } } },
      },
    },
  })

  if (!fr || !fr.prd) throw new Error("REQUEST_OR_PRD_NOT_FOUND")
  const repo = fr.project.gitHubRepo
  if (!repo) throw new Error("NO_REPO")
  if (!repo.installationId) throw new Error("NO_INSTALLATION")

  const parsedRepo = parseRepo(repo.repoFullName)
  if (!parsedRepo) throw new Error("BAD_REPO_NAME")

  const installationId = Number.parseInt(repo.installationId, 10)
  if (!Number.isFinite(installationId)) throw new Error("BAD_INSTALLATION_ID")

  const workspaceId = fr.project.workspaceId

  const criteria = fr.prd.acceptanceCriteria
  const criteriaList = criteria.map((c) => ({
    title: c.title,
    description: c.description,
  }))

  const pullRequest = await prisma.pullRequest.findFirst({
    where: { featureRequestId, prNumber },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  if (!pullRequest) throw new Error("NO_PULL_REQUEST_ROW")

  const { diff, headSha, branch } = await fetchDiff(
    installationId,
    parsedRepo.owner,
    parsedRepo.repo,
    prNumber,
  )

  const criteriaBlock = buildCriteriaBlock(criteriaList)
  const userPrompt = buildUserPrompt(
    fr.project.name,
    fr.prd.problemStatement,
    criteriaBlock,
    diff,
  )

  const passA = await runPass(IMPLEMENTATION_SYSTEM, userPrompt, "implementation_review")
  const passB = await runPass(ADVERSARIAL_SYSTEM, userPrompt, "adversarial_review")

  const allFindings: RawFinding[] = [...passA.findings, ...passB.findings]
  const blockingCount = allFindings.filter((f) =>
    BLOCKING_SEVERITIES.has(f.severity),
  ).length

  const verdict: ReviewVerdict =
    blockingCount > 0 ? "FIX_NEEDED" : "PENDING_APPROVAL"

  const reconciledSummary = [
    `Implementation review: ${passA.summary}`,
    ``,
    `Adversarial QA: ${passB.summary}`,
    ``,
    `Verdict: ${verdict === "FIX_NEEDED" ? "Changes required" : "Ready for human approval"} (${allFindings.length} finding(s), ${blockingCount} blocking).`,
  ].join("\n")

  const prdVersion = fr.prd.version

  await prisma.$transaction(
    async (tx) => {
      const snapshot = await tx.reviewSnapshot.create({
        data: {
          pullRequestId: pullRequest.id,
          commitSha: headSha,
          prdVersion,
          diffSnapshot: diff,
        },
      })

      const run = await tx.reviewRun.create({
        data: {
          snapshotId: snapshot.id,
          modelAResult: JSON.stringify(passA),
          modelBResult: JSON.stringify(passB),
          reconciledResult: reconciledSummary,
          status: ReviewStatus.COMPLETE,
        },
      })

      for (const f of allFindings) {
        const idx = clampCriterionIndex(f.criterionNumber, criteria.length)
        const criterionId = criteria[idx]?.id
        if (!criterionId) continue
        await tx.finding.create({
          data: {
            reviewRunId: run.id,
            acceptanceCriterionId: criterionId,
            severity: f.severity as Severity,
            category: f.category as FindingCategory,
            title: f.title,
            description: f.description,
            quotedEvidence: f.quotedEvidence,
            status: FindingStatus.OPEN,
          },
        })
      }

      await tx.pullRequest.update({
        where: { id: pullRequest.id },
        data: {
          commitSha: headSha,
          branchName: branch,
          status: verdict === "FIX_NEEDED" ? PRStatus.NEEDS_FIX : PRStatus.IN_REVIEW,
        },
      })

      await tx.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: verdict },
      })

      await tx.auditLog.create({
        data: {
          workspaceId,
          actorId,
          action: "review.completed",
          entityType: "FeatureRequest",
          entityId: featureRequestId,
          metadata: JSON.stringify({
            verdict,
            findingCount: allFindings.length,
            blockingCount,
          }),
        },
      })
    },
    { timeout: 120_000 },
  )

  return {
    verdict,
    findingCount: allFindings.length,
    blockingCount,
  }
}