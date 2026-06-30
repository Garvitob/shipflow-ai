import "server-only"
import { getApp, getInstallationOctokit } from "./client"

export interface RepoConnection {
  installationId: number
  defaultBranch: string
}

export type RepoConnectionCode =
  | "APP_NOT_INSTALLED"
  | "REPO_NOT_FOUND"
  | "INVALID_NAME"
  | "LOOKUP_FAILED"

export class RepoConnectionError extends Error {
  constructor(
    message: string,
    public readonly code: RepoConnectionCode,
  ) {
    super(message)
    this.name = "RepoConnectionError"
  }
}

export function parseRepoFullName(repoFullName: string): {
  owner: string
  repo: string
} {
  const parts = repoFullName.split("/")
  const owner = parts[0]
  const repo = parts[1]
  if (parts.length !== 2 || !owner || !repo) {
    throw new RepoConnectionError(
      `Invalid repository name "${repoFullName}". Expected "owner/repo".`,
      "INVALID_NAME",
    )
  }
  return { owner, repo }
}

export async function resolveRepoConnection(
  owner: string,
  repo: string,
): Promise<RepoConnection> {
  const app = getApp()

  let installationId: number
  try {
    const { data } = await app.octokit.rest.apps.getRepoInstallation({
      owner,
      repo,
    })
    installationId = data.id
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 404) {
      throw new RepoConnectionError(
        `ShipFlow's GitHub App is not installed on ${owner}/${repo}.`,
        "APP_NOT_INSTALLED",
      )
    }
    throw new RepoConnectionError(
      `Failed to resolve the GitHub installation for ${owner}/${repo}.`,
      "LOOKUP_FAILED",
    )
  }

  let defaultBranch: string
  try {
    const octokit = await getInstallationOctokit(installationId)
    const { data } = await octokit.rest.repos.get({ owner, repo })
    defaultBranch = data.default_branch
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 404) {
      throw new RepoConnectionError(
        `Repository ${owner}/${repo} was not found or is not accessible.`,
        "REPO_NOT_FOUND",
      )
    }
    throw new RepoConnectionError(
      `Failed to read repository ${owner}/${repo}.`,
      "LOOKUP_FAILED",
    )
  }

  return { installationId, defaultBranch }
}