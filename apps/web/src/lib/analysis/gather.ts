import "server-only"
import { extract } from "tar-stream"
import { createGunzip } from "node:zlib"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { getInstallationOctokit } from "../github/client"
import type { GatherResult, RepoFile, RepoMetadata, CommitSummary } from "./types"

const MAX_FILE_BYTES = 1_500_000
const SKIP_TOP_DIRS = new Set(["node_modules", ".git"])
const COMMIT_COUNT = 15

export interface GatherInput {
  owner: string
  repo: string
  installationId: number
  ref: string
}

function isStatus(err: unknown, code: number): boolean {
  return (err as { status?: number }).status === code
}

async function extractTarball(buffer: Buffer): Promise<RepoFile[]> {
  const files: RepoFile[] = []
  const ext = extract()

  ext.on("entry", (header, stream, next) => {
    if (header.type !== "file") {
      stream.on("end", next)
      stream.resume()
      return
    }

    const segments = header.name.split("/")
    const path = segments.slice(1).join("/")
    const topDir = segments[1]

    const skip =
      path.length === 0 ||
      (typeof topDir === "string" && SKIP_TOP_DIRS.has(topDir)) ||
      (typeof header.size === "number" && header.size > MAX_FILE_BYTES)

    if (skip) {
      stream.on("end", next)
      stream.resume()
      return
    }

    const chunks: Buffer[] = []
    stream.on("data", (c: Buffer) => chunks.push(c))
    stream.on("end", () => {
      const contents = Buffer.concat(chunks)
      files.push({ path, contents: contents.toString("utf8"), bytes: contents.byteLength })
      next()
    })
    stream.on("error", next)
  })

  await pipeline(Readable.from(buffer), createGunzip(), ext)
  return files
}

export async function gatherRepo(input: GatherInput): Promise<GatherResult> {
  const { owner, repo, installationId, ref } = input
  const octokit = await getInstallationOctokit(installationId)

  const repoRes = await octokit.rest.repos.get({ owner, repo })
  const description = repoRes.data.description
  const topics = repoRes.data.topics ?? []
  const defaultBranch = repoRes.data.default_branch

  const [languages, readme, recentCommits] = await Promise.all([
    octokit.rest.repos
      .listLanguages({ owner, repo })
      .then((r): Record<string, number> => r.data)
      .catch((): Record<string, number> => ({})),
    octokit.rest.repos
      .getReadme({ owner, repo })
      .then((r): string | null => Buffer.from(r.data.content, "base64").toString("utf8"))
      .catch((): string | null => null),
    octokit.rest.repos
      .listCommits({ owner, repo, per_page: COMMIT_COUNT })
      .then((r): CommitSummary[] =>
        r.data.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
          author: c.commit.author?.name ?? c.author?.login ?? "unknown",
          date: c.commit.author?.date ?? "",
        })),
      )
      .catch((): CommitSummary[] => []),
  ])

  let files: RepoFile[] = []
  try {
    const tar = await octokit.rest.repos.downloadTarballArchive({ owner, repo, ref })
    files = await extractTarball(Buffer.from(tar.data as ArrayBuffer))
  } catch (err) {
    if (!isStatus(err, 404)) throw err
    files = []
  }

  const metadata: RepoMetadata = {
    fullName: `${owner}/${repo}`,
    defaultBranch,
    description,
    topics,
    languages,
    readme,
    recentCommits,
  }

  return { metadata, files, isEmpty: files.length === 0 }
}