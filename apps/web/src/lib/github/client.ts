import "server-only"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { App } from "octokit"

let cachedApp: App | null = null

function loadPrivateKey(): string {
  const inlineKey = process.env.GITHUB_APP_PRIVATE_KEY
  if (inlineKey && inlineKey.includes("BEGIN")) {
    return inlineKey.replace(/\\n/g, "\n")
  }

  const configuredPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH
  if (!configuredPath) {
    throw new Error(
      "GitHub App private key not configured. Set GITHUB_APP_PRIVATE_KEY_PATH or GITHUB_APP_PRIVATE_KEY.",
    )
  }

  const candidates = [
    resolve(process.cwd(), configuredPath),
    resolve(process.cwd(), "..", "..", configuredPath),
    resolve(process.cwd(), "..", configuredPath),
  ]

  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf8")
    } catch {
      continue
    }
  }

  throw new Error(
    `GitHub App private key file not found. Looked in: ${candidates.join(", ")}`,
  )
}

export function getApp(): App {
  if (cachedApp) return cachedApp

  const appId = process.env.GITHUB_APP_ID
  if (!appId) {
    throw new Error("GITHUB_APP_ID is not set.")
  }

  const privateKey = loadPrivateKey()
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET

  cachedApp = new App({
    appId,
    privateKey,
    ...(webhookSecret ? { webhooks: { secret: webhookSecret } } : {}),
  })

  return cachedApp
}

export async function getInstallationOctokit(installationId: number) {
  const app = getApp()
  return app.getInstallationOctokit(installationId)
}

export async function getInstallationToken(
  installationId: number,
): Promise<string> {
  const app = getApp()
  const octokit = await app.getInstallationOctokit(installationId)
  const { token } = (await octokit.auth({ type: "installation" })) as {
    token: string
  }
  return token
}