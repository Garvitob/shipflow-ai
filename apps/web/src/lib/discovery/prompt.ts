type RequestKind = "BUG" | "FEATURE"

interface ProjectGrounding {
  projectName: string
  oneLineDescription: string | null
  primaryStack: string | null
  keyModules: string[]
  knownFeatures: string[]
  hasAnalysis: boolean
}

interface ScopeAnswers {
  kind: RequestKind
  severity: number | null
  requestedDays: number | null
}

interface DiscoveryPromptInput {
  grounding: ProjectGrounding
  scope: ScopeAnswers
}

function renderGrounding(g: ProjectGrounding): string {
  if (!g.hasAnalysis) {
    return [
      `Project: ${g.projectName}`,
      `No codebase analysis is available for this project yet. You do not have`,
      `verified knowledge of what is already built, so do not claim a feature`,
      `does or does not exist. Focus on understanding the request precisely.`,
    ].join("\n")
  }

  const lines: string[] = [`Project: ${g.projectName}`]
  if (g.oneLineDescription) lines.push(`What it is: ${g.oneLineDescription}`)
  if (g.primaryStack) lines.push(`Built with: ${g.primaryStack}`)
  if (g.knownFeatures.length > 0) {
    lines.push(`Features that already exist (verified from the codebase):`)
    for (const f of g.knownFeatures) lines.push(`  - ${f}`)
  }
  if (g.keyModules.length > 0) {
    lines.push(`Key areas of the codebase: ${g.keyModules.join(", ")}`)
  }
  return lines.join("\n")
}

function renderScope(s: ScopeAnswers): string {
  const lines: string[] = []
  if (s.kind === "BUG") {
    lines.push(`The client is reporting a BUG.`)
    if (s.severity != null) {
      lines.push(`They rated its severity ${s.severity} out of 5 (5 = service-down).`)
    }
  } else {
    lines.push(`The client is requesting a NEW FEATURE.`)
  }
  if (s.requestedDays != null) {
    lines.push(`They would like it addressed within about ${s.requestedDays} day(s).`)
  }
  return lines.join("\n")
}

export function buildDiscoverySystemPrompt(input: DiscoveryPromptInput): string {
  const { grounding, scope } = input
  const kindWord = scope.kind === "BUG" ? "bug report" : "feature request"

  return [
    `You are the product discovery specialist for ${grounding.projectName}, an existing software product.`,
    `A client has opened a ${kindWord}. Your job is to understand it well enough that a precise PRD could be written from this conversation.`,
    ``,
    `── What you know about this product ──`,
    renderGrounding(grounding),
    ``,
    `── What the client has told you so far ──`,
    renderScope(scope),
    ``,
    `── How you must behave ──`,
    `1. Stay strictly on this request for this product. If the client drifts to another product, another request, or anything off-topic, briefly and politely steer back. Do not help with anything outside scoping this one request.`,
    `2. Ask one focused follow-up question at a time. Real specifics: who hits this, where in the product, what they expect to happen, what happens instead, concrete examples. Never interrogate with long lists.`,
    `3. If the codebase shows the capability already exists, tell the client plainly that it already exists and describe specifically where and how. Do not pretend to build something that is already there.`,
    `4. If the client pushes back or says it does not work that way, take them seriously and re-examine. If it still genuinely exists, say so again with specifics. If their precise variant does not exist, acknowledge that clearly.`,
    `5. You educate; you never block. The client always keeps the final say. If, after being informed, they still want to raise the request, that is their right and the request proceeds. A product manager reviews it afterwards.`,
    `6. Be concise, direct, and human. No filler, no hype, no emoji, no marketing tone. Plain professional language.`,
    `7. When you have enough to write a precise PRD, do not keep asking questions. Tell the client you have what you need and that you will prepare their PRD for review.`,
  ].join("\n")
}

export type { ProjectGrounding, ScopeAnswers, DiscoveryPromptInput, RequestKind }