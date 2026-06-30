import "server-only"
import { parseCodebaseSummary } from "../analysis/schema"
import {
  buildDiscoverySystemPrompt,
  type ProjectGrounding,
  type ScopeAnswers,
} from "./prompt"
import { prdSchema, type PrdContent } from "./schema"
import { streamChat, generateStructured, type ChatMessage } from "../ai/client"

const DISCOVERY_MAX_OUTPUT_TOKENS = 2_000
const DISCOVERY_TIMEOUT_MS = 60_000
const PRD_MAX_OUTPUT_TOKENS = 16_384
const PRD_TIMEOUT_MS = 180_000

export function buildProjectGrounding(
  projectName: string,
  codebaseSummary: string | null,
): ProjectGrounding {
  const summary = parseCodebaseSummary(codebaseSummary)
  if (!summary || summary.meta.isEmpty) {
    return {
      projectName,
      oneLineDescription: null,
      primaryStack: null,
      keyModules: [],
      knownFeatures: [],
      hasAnalysis: false,
    }
  }

  const { analysis, reviewContext } = summary
  return {
    projectName,
    oneLineDescription: reviewContext.oneLineDescription,
    primaryStack:
      reviewContext.primaryStack.length > 0 ? reviewContext.primaryStack.join(", ") : null,
    keyModules: reviewContext.keyModules.map((m) => m.name),
    knownFeatures: analysis.keyFeatures.map((f) => f.feature),
    hasAnalysis: true,
  }
}

export interface DiscoveryStreamInput {
  grounding: ProjectGrounding
  scope: ScopeAnswers
  messages: ChatMessage[]
}

export function streamDiscovery(input: DiscoveryStreamInput) {
  const system = buildDiscoverySystemPrompt({
    grounding: input.grounding,
    scope: input.scope,
  })
  return streamChat({
    system,
    messages: input.messages,
    reasoningEffort: "low",
    maxOutputTokens: DISCOVERY_MAX_OUTPUT_TOKENS,
    timeoutMs: DISCOVERY_TIMEOUT_MS,
  })
}

function renderConversation(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "Client" : "Specialist"}: ${m.content}`)
    .join("\n\n")
}

function buildPrdSystemPrompt(grounding: ProjectGrounding, scope: ScopeAnswers): string {
  const lines: string[] = []
  lines.push(
    `You are a senior product manager writing a Product Requirements Document for an existing software product.`,
  )
  if (scope.kind === "BUG") {
    lines.push(
      `This PRD addresses a reported bug${scope.severity != null ? ` rated severity ${scope.severity} of 5` : ""}.`,
    )
  } else {
    lines.push(`This PRD specifies a new feature.`)
  }
  if (scope.requestedDays != null) {
    lines.push(
      `The client asked for delivery within roughly ${scope.requestedDays} day(s); treat this as context, not a hard guarantee.`,
    )
  }
  lines.push(``)
  lines.push(`── Product context ──`)
  lines.push(`Product: ${grounding.projectName}`)
  if (grounding.oneLineDescription) lines.push(`What it is: ${grounding.oneLineDescription}`)
  if (grounding.primaryStack) lines.push(`Built with: ${grounding.primaryStack}`)
  if (grounding.knownFeatures.length > 0) {
    lines.push(`Existing features: ${grounding.knownFeatures.join("; ")}`)
  }
  lines.push(``)
  lines.push(`── Instructions ──`)
  lines.push(
    `Write the PRD strictly from the discovery conversation provided. Do not invent scope the client did not ask for.`,
  )
  lines.push(
    `Be concrete and specific. The acceptance criteria are the contract the implementation and the code review are checked against, so each must be a single, objectively testable condition.`,
  )
  lines.push(
    `Ground the PRD in how this product actually works; keep it realistic to the existing stack and features.`,
  )
  lines.push(`Use plain professional language. No filler, no marketing tone.`)
  return lines.join("\n")
}

export interface GeneratePrdInput {
  grounding: ProjectGrounding
  scope: ScopeAnswers
  messages: ChatMessage[]
}

export async function generatePrd(input: GeneratePrdInput): Promise<PrdContent> {
  const system = buildPrdSystemPrompt(input.grounding, input.scope)
  const prompt = renderConversation(input.messages)

  const result = await generateStructured({
    system,
    prompt,
    schema: prdSchema,
    schemaName: "ProductRequirementsDocument",
    schemaDescription:
      "A complete product requirements document derived from the discovery conversation.",
    reasoningEffort: "high",
    maxOutputTokens: PRD_MAX_OUTPUT_TOKENS,
    timeoutMs: PRD_TIMEOUT_MS,
  })

  const prd = result.data
  if (prd.acceptanceCriteria.length === 0) {
    throw new Error("Generated PRD has no acceptance criteria")
  }
  return prd
}