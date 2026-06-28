import "server-only"
import { verify } from "@octokit/webhooks-methods"

export type GitHubWebhookEvent = {
  id: string
  name: string
  signature: string
  payload: string
}

export async function verifySignature(
  payload: string,
  signature: string | null,
): Promise<boolean> {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET
  if (!secret) {
    throw new Error("GITHUB_APP_WEBHOOK_SECRET is not set.")
  }
  if (!signature) {
    return false
  }
  try {
    return await verify(secret, payload, signature)
  } catch {
    return false
  }
}

type PullRequestPayload = {
  action: string
  number: number
  pull_request: {
    id: number
    number: number
    title: string
    state: string
    draft: boolean
    head: { ref: string; sha: string }
    base: { ref: string; sha: string }
    user: { login: string }
    html_url: string
  }
  repository: {
    id: number
    full_name: string
    name: string
    owner: { login: string }
    default_branch: string
  }
  installation?: { id: number }
}

type PushPayload = {
  ref: string
  after: string
  repository: {
    id: number
    full_name: string
    name: string
    owner: { login: string }
    default_branch: string
  }
  installation?: { id: number }
}

type InstallationPayload = {
  action: string
  installation: {
    id: number
    account: { login: string }
  }
  repositories?: Array<{ full_name: string; name: string }>
  repositories_added?: Array<{ full_name: string; name: string }>
  repositories_removed?: Array<{ full_name: string; name: string }>
}

export function parsePullRequest(payload: string): PullRequestPayload {
  return JSON.parse(payload) as PullRequestPayload
}

export function parsePush(payload: string): PushPayload {
  return JSON.parse(payload) as PushPayload
}

export function parseInstallation(payload: string): InstallationPayload {
  return JSON.parse(payload) as InstallationPayload
}

const REVIEWABLE_PR_ACTIONS = new Set([
  "opened",
  "synchronize",
  "reopened",
  "ready_for_review",
])

export function isReviewablePullRequest(action: string): boolean {
  return REVIEWABLE_PR_ACTIONS.has(action)
}