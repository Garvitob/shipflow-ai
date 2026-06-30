import type { RepoMetadata, CuratedFile } from "./types"

export interface ProjectIntent {
  name: string
  description: string
  techStack: string
  existingFeatures: string
  businessGoals: string
  targetUsers: string
}

const ENGINEER_ROLE = `You are a senior staff engineer performing a first-time deep analysis of an unfamiliar codebase. Your reputation rests on being precise, specific, and grounded. You never hand-wave. You never pad. Every observation you make is concrete and tied to actual evidence in the code. When you explain something, you explain WHY it is the way it is — what a choice implies, what a pattern reveals, what a dependency signals — not merely what exists.`

const QUALITY_BAR = `Standards you hold yourself to:
- Be specific. "Uses authentication" is worthless; "Session-based auth via BetterAuth, with route protection in lib/auth-guard.ts hardened against CVE-2025-29927" is the bar.
- Explain WHY. Every claim carries reasoning: why this architecture, what this dependency implies, what this convention reveals about the team.
- Ground everything. Base claims on the actual code provided. Cite specific file paths. If you cannot point to evidence, do not assert it — omit it or mark it inferred.
- No filler. Never write vague praise ("follows best practices", "clean and well-structured") without naming the specific practice and where it appears.
- Prefer precision over breadth. A few sharp, evidenced observations beat a long list of generic ones.`

const GROUNDING_RULE = `GROUNDING (critical): Every factual claim must trace to a file in the provided material. Cite real file paths in the evidence fields. If something is not supported by the code you were given, either omit it or explicitly mark its confidence as "inferred". Never invent files, features, or technologies that are not present in the provided code. Fabricating evidence is the worst possible failure.`

const PURPOSE_RULE = `PURPOSE FRAMING: You are given the team's stated intent for this product (why it exists, who it serves, its goals). Use this to FRAME and INTERPRET the codebase — to understand what problems the code is solving and to judge how well it serves that purpose. BUT the code is authoritative on facts. Where the actual code contradicts the stated description (e.g. the team says one library but the code uses another), report what the CODE shows, and note the discrepancy. Stated intent shapes interpretation; code determines truth.`

const FEWSHOT = `Example of the quality bar for a single observation (note the specificity, the file citation, and the explicit reasoning):

  Architecture observation:
  summary: "Turborepo monorepo with a single Next.js app and shared workspace packages for database and API layers."
  details: [
    "apps/web is the only application; packages/db and packages/trpc are shared libraries consumed via workspace:* references.",
    "The App Router is used (src/app/), not the Pages Router, indicating a modern Next.js 15+ setup.",
    "Server-only boundaries are enforced explicitly via 'import \"server-only\"' in lib/ modules that touch secrets."
  ]
  reasoning: "The workspace:* protocol in apps/web/package.json plus the turbo.json pipeline confirms Turborepo orchestration. The choice to extract db and trpc into packages — rather than keeping them in the app — signals an intent to share them across future apps, even though only one app exists today. The server-only imports reveal a team disciplined about not leaking server code to the client bundle."
  evidence: ["turbo.json", "apps/web/package.json", "packages/db/src/index.ts", "apps/web/src/lib/auth-guard.ts"]
  confidence: "high"

Match this level of specificity, grounding, and reasoning in every section.`

function renderMetadata(meta: RepoMetadata): string {
  const langs = Object.entries(meta.languages)
    .sort((a, b) => b[1] - a[1])
    .map(([l, bytes]) => `${l} (${bytes}b)`)
    .join(", ")
  const commits = meta.recentCommits
    .slice(0, 10)
    .map((c) => `- ${c.message.split("\n")[0]} (${c.author})`)
    .join("\n")
  return [
    `Repository: ${meta.fullName}`,
    `Default branch: ${meta.defaultBranch}`,
    meta.description ? `Description: ${meta.description}` : null,
    meta.topics.length ? `Topics: ${meta.topics.join(", ")}` : null,
    langs ? `Languages: ${langs}` : null,
    commits ? `Recent commits:\n${commits}` : null,
    meta.readme ? `\nREADME:\n${meta.readme.slice(0, 6000)}` : null,
  ]
    .filter(Boolean)
    .join("\n")
}

function renderIntent(intent: ProjectIntent): string {
  return [
    `STATED INTENT (from the team — the "why"):`,
    `Product: ${intent.name}`,
    `Description: ${intent.description}`,
    `Stated tech stack: ${intent.techStack}`,
    `Stated existing features: ${intent.existingFeatures}`,
    `Business goals: ${intent.businessGoals}`,
    `Target users: ${intent.targetUsers}`,
  ].join("\n")
}

function renderTree(fileTree: string[]): string {
  return `FILE TREE (${fileTree.length} files):\n${fileTree.join("\n")}`
}

function renderFiles(files: CuratedFile[]): string {
  return files
    .map(
      (f) =>
        `\n===== FILE: ${f.path} =====\n${f.contents}`,
    )
    .join("\n")
}

export function treePredictionPrompt(
  meta: RepoMetadata,
  intent: ProjectIntent,
  fileTree: string[],
): { system: string; prompt: string } {
  return {
    system: `${ENGINEER_ROLE}\n\nYou will be shown ONLY a repository's file tree and metadata — not the file contents yet. Form a sharp hypothesis about its architecture, stack, and structure from the layout alone, the way a senior engineer sizes up a repo before reading code. Be concrete about what you expect and WHY the structure implies it. You will later verify this against the real code.`,
    prompt: `${renderIntent(intent)}\n\n${renderMetadata(meta)}\n\n${renderTree(fileTree)}\n\nPredict: the architectural style, the likely stack, how the code is probably organized, where the entry points and core modules likely are, and what conventions you expect. State your reasoning from the structure.`,
  }
}

export function modulePrompt(
  meta: RepoMetadata,
  intent: ProjectIntent,
  globalContext: string,
  moduleName: string,
  files: CuratedFile[],
): { system: string; prompt: string } {
  return {
    system: `${ENGINEER_ROLE}\n\n${QUALITY_BAR}\n\n${GROUNDING_RULE}\n\nYou are analyzing ONE module of a larger codebase. You are given global context about the whole system so you understand this module in relation to it. Summarize this module precisely: its purpose, key files, internal patterns, and how it depends on or is depended on by the rest of the system.`,
    prompt: `${renderIntent(intent)}\n\nGLOBAL CONTEXT (the whole system, for situating this module):\n${globalContext}\n\n===== MODULE UNDER ANALYSIS: ${moduleName} =====\n${renderFiles(files)}\n\nAnalyze this module. Ground every claim in the files above and cite them.`,
  }
}

export function synthesisPrompt(
  meta: RepoMetadata,
  intent: ProjectIntent,
  fileTree: string[],
  treePrediction: string,
  body: string,
  isModuleReduce: boolean,
): { system: string; prompt: string } {
  const bodyLabel = isModuleReduce
    ? `PER-MODULE ANALYSES (synthesize these into the whole; reason about how the modules relate, not just concatenate):`
    : `CURATED SOURCE FILES (the actual code):`
  return {
    system: `${ENGINEER_ROLE}\n\n${QUALITY_BAR}\n\n${GROUNDING_RULE}\n\n${PURPOSE_RULE}\n\n${FEWSHOT}\n\nYou are producing the definitive structured analysis of this codebase. You earlier formed a hypothesis from the file tree; now confirm or CORRECT it against the real evidence. Fill every section of the required structure with specific, grounded, reasoned content. This summary is the foundation that every later automated stage will rely on, so it must be both precise and complete.`,
    prompt: `${renderIntent(intent)}\n\n${renderMetadata(meta)}\n\n${renderTree(fileTree)}\n\nYOUR EARLIER STRUCTURAL HYPOTHESIS (confirm or correct against the code):\n${treePrediction}\n\n${bodyLabel}\n${body}\n\nProduce the complete structured analysis. Every section: specific, grounded in cited files, with explicit reasoning. Where the code contradicts the stated intent, the code wins and you note it. If your earlier hypothesis was wrong, correct it and say so.`,
  }
}

export function critiquePrompt(
  draftJson: string,
  fileTree: string[],
): { system: string; prompt: string } {
  return {
    system: `${ENGINEER_ROLE}\n\nYou are reviewing a DRAFT analysis of a codebase — your own first pass — with a critical eye. Your job is to make it sharper and more rigorous, not longer. Hunt specifically for: (1) vague or unsupported claims that name no specific file or mechanism; (2) any claim citing a file not plausibly in the tree; (3) internal contradictions between sections; (4) significant modules visible in the file tree that no section accounts for; (5) sections that are thin where the evidence supports more. Fix each issue. Keep what is strong. Return the full corrected analysis in the same structure.`,
    prompt: `FILE TREE (for completeness-checking — every significant area should be accounted for):\n${fileTree.join("\n")}\n\nDRAFT ANALYSIS TO REVIEW AND TIGHTEN:\n${draftJson}\n\nReturn the corrected, tightened analysis. Remove vagueness, fix contradictions, fill genuine gaps, drop any uncited claim. Do not pad.`,
  }
}

export function distillPrompt(analysisJson: string): { system: string; prompt: string } {
  return {
    system: `${ENGINEER_ROLE}\n\nYou are compressing a full codebase analysis into a dense, reusable context block for other automated systems (e.g. an automated code reviewer) to consume. Capture only the essentials a reviewer must know to evaluate changes against this codebase: what it is, its primary stack, its architectural style, the conventions that must be respected, its security model, its known risk areas, and its key modules. Be terse and factual — this is machine context, not prose.`,
    prompt: `FULL ANALYSIS TO DISTILL:\n${analysisJson}\n\nProduce the dense review-context block.`,
  }
}