import { after } from "next/server"
import { prisma } from "@shipflow/db"
import { getAuthContext } from "@/lib/auth-guard"
import { buildProjectGrounding, streamDiscovery } from "@/lib/discovery/discovery"
import type { ScopeAnswers } from "@/lib/discovery/prompt"
import type { ChatMessage } from "@/lib/ai/client"

export const maxDuration = 60

const MAX_MESSAGE_LENGTH = 4000

function readString(body: unknown, key: string): string | null {
  if (body && typeof body === "object" && key in body) {
    const value = (body as Record<string, unknown>)[key]
    return typeof value === "string" ? value : null
  }
  return null
}

export async function POST(req: Request): Promise<Response> {
  const ctx = await getAuthContext()
  if (!ctx) return new Response("Unauthorized", { status: 401 })
  if (ctx.role !== "CLIENT") return new Response("Forbidden", { status: 403 })

  const body: unknown = await req.json().catch(() => null)
  const featureRequestId = readString(body, "featureRequestId")
  const rawMessage = readString(body, "message")
  if (!featureRequestId || rawMessage === null) {
    return new Response("Invalid request body", { status: 400 })
  }

  const message = rawMessage.trim()
  if (message.length === 0 || message.length > MAX_MESSAGE_LENGTH) {
    return new Response(
      `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`,
      { status: 400 },
    )
  }

  const fr = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: {
      project: true,
      conversationMessages: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!fr) return new Response("Request not found", { status: 404 })
  if (fr.clientId !== ctx.userId) return new Response("Forbidden", { status: 403 })
  if (fr.project.workspaceId !== ctx.workspaceId) {
    return new Response("Forbidden", { status: 403 })
  }
  if (fr.status !== "DISCOVERY") {
    return new Response("Request is no longer in discovery", { status: 409 })
  }

  const kind: "BUG" | "FEATURE" =
    fr.type === "BUG" || fr.type === "CRITICAL_BUG" ? "BUG" : "FEATURE"
  const scope: ScopeAnswers = {
    kind,
    severity: fr.severity,
    requestedDays: fr.requestedDays,
  }
  const grounding = buildProjectGrounding(fr.project.name, fr.project.codebaseSummary)

  const history: ChatMessage[] = fr.conversationMessages.map((m) => ({
    role: m.role === "USER" ? "user" : "assistant",
    content: m.content,
  }))
  const messages: ChatMessage[] = [...history, { role: "user", content: message }]

  await prisma.conversationMessage.create({
    data: { featureRequestId, role: "USER", content: message },
  })

  const result = streamDiscovery({ grounding, scope, messages })

  after(async () => {
    try {
      const assistantText = (await result.text).trim()
      if (assistantText.length > 0) {
        await prisma.conversationMessage.create({
          data: { featureRequestId, role: "ASSISTANT", content: assistantText },
        })
      }
    } catch (err) {
      console.error(
        "discovery assistant persist failed:",
        err instanceof Error ? err.message : String(err),
      )
    }
  })

  return result.toTextStreamResponse()
}