import { NextResponse } from "next/server"
import {
  verifySignature,
  parsePullRequest,
  parsePush,
  parseInstallation,
  isReviewablePullRequest,
} from "@/lib/github/webhooks"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get("x-hub-signature-256")
  const event = request.headers.get("x-github-event")
  const deliveryId = request.headers.get("x-github-delivery") ?? "unknown"

  const valid = await verifySignature(payload, signature)
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    )
  }

  if (!event) {
    return NextResponse.json({ error: "Missing event type" }, { status: 400 })
  }

  try {
    switch (event) {
      case "ping":
        return NextResponse.json({ ok: true, event: "ping" })

      case "pull_request":
        return await handlePullRequest(payload, deliveryId)

      case "push":
        return await handlePush(payload, deliveryId)

      case "installation":
      case "installation_repositories":
        return await handleInstallation(payload, deliveryId)

      default:
        return NextResponse.json({ ok: true, ignored: event })
    }
  } catch (err) {
    console.error(`[webhook:${deliveryId}] handler error`, err)
    return NextResponse.json(
      { error: "Handler failed" },
      { status: 500 },
    )
  }
}

async function handlePullRequest(payload: string, deliveryId: string) {
  const data = parsePullRequest(payload)
  const { action, pull_request: pr, repository } = data

  console.log(
    `[webhook:${deliveryId}] pull_request.${action} #${pr.number} "${pr.title}" on ${repository.full_name}`,
  )

  if (!isReviewablePullRequest(action)) {
    return NextResponse.json({ ok: true, action, reviewQueued: false })
  }

  if (pr.draft && action !== "ready_for_review") {
    return NextResponse.json({ ok: true, action, reviewQueued: false, reason: "draft" })
  }

  return NextResponse.json({
    ok: true,
    action,
    reviewQueued: true,
    pr: {
      number: pr.number,
      title: pr.title,
      headSha: pr.head.sha,
      baseRef: pr.base.ref,
      author: pr.user.login,
      repo: repository.full_name,
    },
  })
}

async function handlePush(payload: string, deliveryId: string) {
  const data = parsePush(payload)
  const branch = data.ref.replace("refs/heads/", "")

  console.log(
    `[webhook:${deliveryId}] push to ${data.repository.full_name}@${branch} (${data.after.slice(0, 7)})`,
  )

  return NextResponse.json({
    ok: true,
    repo: data.repository.full_name,
    branch,
  })
}

async function handleInstallation(payload: string, deliveryId: string) {
  const data = parseInstallation(payload)

  console.log(
    `[webhook:${deliveryId}] installation.${data.action} for ${data.installation.account.login} (id ${data.installation.id})`,
  )

  return NextResponse.json({
    ok: true,
    action: data.action,
    installationId: data.installation.id,
  })
}