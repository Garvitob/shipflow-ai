import "server-only"
import { z } from "zod"
import { generateStructured } from "./client"

const COMPLEXITY_VALUES = ["Low", "Medium", "High"] as const

export const taskBreakdownSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z
          .string()
          .describe(
            "A concise, action-oriented engineering task title. Starts with a verb. Ten words or fewer.",
          ),
        description: z
          .string()
          .describe(
            "A clear, self-contained instruction to a developer describing exactly what to build or change for this one acceptance criterion. Specific and implementation-focused, but does not prescribe exact code.",
          ),
        complexity: z
          .enum(COMPLEXITY_VALUES)
          .describe(
            "The relative engineering complexity of this single task: Low, Medium, or High.",
          ),
      }),
    )
    .describe(
      "Exactly one task per acceptance criterion, in the same order as the criteria provided. Do not merge, split, reorder, add, or omit. The number of tasks must equal the number of criteria.",
    ),
})

export type TaskBreakdown = z.infer<typeof taskBreakdownSchema>
export type GeneratedTask = TaskBreakdown["tasks"][number]

export interface TaskBreakdownInput {
  projectName: string
  prd: {
    title: string
    problemStatement: string
    goals: string
    nonGoals: string
  }
  criteria: { title: string; description: string }[]
}

function buildSystemPrompt(projectName: string): string {
  return [
    `You are a senior software engineer breaking an approved Product Requirements Document into concrete, buildable engineering tasks for the project "${projectName}".`,
    ``,
    `Rules:`,
    `- Produce exactly one task per acceptance criterion, in the same order they are given.`,
    `- Each task implements precisely that one criterion. Do not combine criteria into a single task or split a criterion across tasks.`,
    `- Write each task as a clear instruction to a developer: what to build, where it fits, what "done" means for that criterion.`,
    `- Be implementation-focused and specific, but do not write the code or dictate exact file names you cannot know.`,
    `- Assign each task a complexity of Low, Medium, or High based on engineering effort and risk.`,
    `- The number of tasks in your output must equal the number of acceptance criteria.`,
  ].join("\n")
}

function buildPrompt(input: TaskBreakdownInput): string {
  const lines: string[] = []
  lines.push(`── Request ──`)
  lines.push(`Title: ${input.prd.title}`)
  lines.push(`Problem: ${input.prd.problemStatement}`)
  if (input.prd.goals.trim()) {
    lines.push(``)
    lines.push(`Goals:`)
    lines.push(input.prd.goals)
  }
  if (input.prd.nonGoals.trim()) {
    lines.push(``)
    lines.push(`Out of scope:`)
    lines.push(input.prd.nonGoals)
  }
  lines.push(``)
  lines.push(`── Acceptance criteria (produce one task per item, in this order) ──`)
  input.criteria.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.title} — ${c.description}`)
  })
  return lines.join("\n")
}

export async function generateTaskBreakdown(
  input: TaskBreakdownInput,
): Promise<GeneratedTask[]> {
  if (input.criteria.length === 0) return []

  const result = await generateStructured({
    system: buildSystemPrompt(input.projectName),
    prompt: buildPrompt(input),
    schema: taskBreakdownSchema,
    schemaName: "task_breakdown",
    schemaDescription:
      "An ordered list of engineering tasks, exactly one per acceptance criterion.",
    maxOutputTokens: 8_192,
    timeoutMs: 120_000,
  })

  const tasks = result.data.tasks

  if (tasks.length === input.criteria.length) return tasks

  if (tasks.length > input.criteria.length) {
    return tasks.slice(0, input.criteria.length)
  }

  const padded = [...tasks]
  for (let i = tasks.length; i < input.criteria.length; i++) {
    padded.push({
      title: input.criteria[i].title,
      description: input.criteria[i].description,
      complexity: "Medium",
    })
  }
  return padded
}