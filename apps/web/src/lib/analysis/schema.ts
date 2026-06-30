import { z } from "zod"

export const SCHEMA_VERSION = 1

const confidence = z
  .enum(["high", "medium", "inferred"])
  .describe(
    "high = directly evidenced in the code; medium = strongly implied; inferred = reasoned judgment.",
  )

function section(desc: string) {
  return z.object({
    summary: z
      .string()
      .min(1)
      .describe(`One to two sentence human-readable headline. ${desc}`),
    details: z
      .array(z.string())
      .describe("The substance as discrete, specific, grounded points."),
    reasoning: z
      .string()
      .min(1)
      .describe("WHY this is so — the reasoning, not just the what. Mandatory."),
    evidence: z
      .array(z.string())
      .describe("Real repo file paths that support these claims. Cite only files actually present."),
    confidence,
  })
}

const analysisSchema = z.object({
  purpose: section(
    "Why this product exists: the problem it solves and for whom, framed from the team's stated intent.",
  ),
  overview: section("What this codebase is, at a high level."),
  techStack: z
    .object({
      languages: z.array(z.string()),
      frameworks: z.array(z.string()),
      keyLibraries: z.array(z.string()),
      runtime: z.string().nullable(),
      summary: z.string().min(1),
      reasoning: z.string().min(1),
      evidence: z.array(z.string()),
      confidence,
    })
    .describe("The technologies in use, grounded in manifests and imports."),
  architecture: section("The architectural style and how the system is structured."),
  dataModel: section("Core entities/tables and how they relate."),
  apiSurface: section("Routes, endpoints, or handlers the system exposes."),
  entryPointsAndControlFlow: section(
    "Where execution starts and how a typical request flows through the system.",
  ),
  authAndSecurityModel: section(
    "How authentication and authorization work and what is protected.",
  ),
  keyFeatures: z
    .array(
      z.object({
        feature: z.string().min(1),
        reasoning: z.string().min(1),
        evidence: z.array(z.string()),
      }),
    )
    .describe("The main capabilities the codebase delivers, each with reasoning + evidence."),
  modules: z
    .array(
      z.object({
        name: z.string().min(1),
        path: z.string(),
        purpose: z.string().min(1),
        relationships: z.string(),
        reasoning: z.string().min(1),
      }),
    )
    .describe("The significant modules/directories, their purpose, and how they relate."),
  conventions: section("Coding conventions and patterns the team consistently follows."),
  dependencies: z
    .object({
      notable: z.array(
        z.object({
          name: z.string().min(1),
          purpose: z.string().min(1),
          implication: z.string().min(1),
        }),
      ),
      summary: z.string().min(1),
    })
    .describe("Notable dependencies and what each implies about the system."),
  externalIntegrations: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.string(),
        purpose: z.string().min(1),
        evidence: z.array(z.string()),
      }),
    )
    .describe("Third-party services, APIs, or webhooks the codebase integrates with."),
  testingApproach: section("What is tested and how — or an honest note if it is not."),
  buildAndTooling: section("Build system, package manager, CI, and deploy target."),
  notablePatterns: section("Distinctive or noteworthy patterns worth highlighting."),
  risksAndTechDebt: section("What looks fragile, outdated, risky, or likely to break."),
  codeHealth: section(
    "Error-handling, input validation, type-safety discipline, and testing reality.",
  ),
  howToExtend: section("Where new features would naturally plug in; the extension points."),
  purposeAlignment: section(
    "How well the actual code serves the stated purpose, and any gaps or contradictions. The code is authoritative where it differs from the stated description.",
  ),
  coverageNote: z
    .string()
    .nullable()
    .describe(
      "Set ONLY when analysis coverage is partial: honestly state which areas were not fully analyzed. Null when coverage is full.",
    ),
})

const reviewContextSchema = z
  .object({
    oneLineDescription: z.string().min(1),
    primaryStack: z.array(z.string()),
    architecturalStyle: z.string().min(1),
    criticalConventions: z.array(z.string()),
    securityModel: z.string().min(1),
    knownRiskAreas: z.array(z.string()),
    keyModules: z.array(
      z.object({
        name: z.string().min(1),
        path: z.string(),
        role: z.string().min(1),
      }),
    ),
  })
  .describe("A dense, prepackaged context block for downstream AI phases (e.g. code review).")

const moduleSummarySchema = z.object({
  moduleName: z.string().min(1),
  purpose: z.string().min(1),
  keyFiles: z.array(z.string()),
  patterns: z.array(z.string()),
  dependencies: z.array(z.string()),
  reasoning: z.string().min(1),
})

const metaSchema = z.object({
  schemaVersion: z.number(),
  repoFullName: z.string(),
  generatedAt: z.string(),
  coverage: z.enum(["full", "partial_budget"]),
  isEmpty: z.boolean(),
})

export const repoSummarySchema = z.object({
  meta: metaSchema,
  analysis: analysisSchema,
  reviewContext: reviewContextSchema,
})

export { analysisSchema, reviewContextSchema, moduleSummarySchema }

export type RepoSummary = z.infer<typeof repoSummarySchema>
export type RepoAnalysis = z.infer<typeof analysisSchema>
export type ReviewContext = z.infer<typeof reviewContextSchema>
export type ModuleSummary = z.infer<typeof moduleSummarySchema>

export function parseCodebaseSummary(raw: string | null): RepoSummary | null {
  if (!raw) return null
  try {
    const json: unknown = JSON.parse(raw)
    const result = repoSummarySchema.safeParse(json)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

function emptySection(note: string) {
  return {
    summary: note,
    details: [] as string[],
    reasoning: note,
    evidence: [] as string[],
    confidence: "inferred" as const,
  }
}

export function emptySummary(repoFullName: string): RepoSummary {
  const note = "The repository is empty — no source files were available to analyze."
  return {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      repoFullName,
      generatedAt: new Date().toISOString(),
      coverage: "full",
      isEmpty: true,
    },
    analysis: {
      purpose: emptySection(note),
      overview: emptySection(note),
      techStack: {
        languages: [],
        frameworks: [],
        keyLibraries: [],
        runtime: null,
        summary: note,
        reasoning: note,
        evidence: [],
        confidence: "inferred",
      },
      architecture: emptySection(note),
      dataModel: emptySection(note),
      apiSurface: emptySection(note),
      entryPointsAndControlFlow: emptySection(note),
      authAndSecurityModel: emptySection(note),
      keyFeatures: [],
      modules: [],
      conventions: emptySection(note),
      dependencies: { notable: [], summary: note },
      externalIntegrations: [],
      testingApproach: emptySection(note),
      buildAndTooling: emptySection(note),
      notablePatterns: emptySection(note),
      risksAndTechDebt: emptySection(note),
      codeHealth: emptySection(note),
      howToExtend: emptySection(note),
      purposeAlignment: emptySection(note),
      coverageNote: null,
    },
    reviewContext: {
      oneLineDescription: note,
      primaryStack: [],
      architecturalStyle: note,
      criticalConventions: [],
      securityModel: note,
      knownRiskAreas: [],
      keyModules: [],
    },
  }
}