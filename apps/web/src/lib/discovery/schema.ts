import { z } from "zod"

export const acceptanceCriterionSchema = z.object({
  title: z
    .string()
    .describe("A short label for this acceptance criterion, a few words long."),
  description: z
    .string()
    .describe(
      "A single, objectively testable condition that must hold for the work to be considered done. Written so a reviewer can verify it without ambiguity."
    ),
})

export const userStorySchema = z.object({
  role: z
    .string()
    .describe("The kind of user this story is about, for example 'a project owner'."),
  capability: z.string().describe("What that user wants to be able to do."),
  benefit: z.string().describe("The value the user gets; why this matters to them."),
})

export const prdSchema = z.object({
  title: z
    .string()
    .describe(
      "A concise, specific title for this request, suitable as a support ticket title. Ten words or fewer."
    ),
  problemStatement: z
    .string()
    .describe(
      "A clear paragraph describing the problem this request addresses and who experiences it, grounded in what the client actually said."
    ),
  goals: z
    .array(z.string())
    .describe(
      "The specific outcomes this work should achieve. Provide at least one. Each is a single clear statement."
    ),
  nonGoals: z
    .array(z.string())
    .describe(
      "What is explicitly out of scope, to prevent scope creep. Use an empty list if nothing notable applies."
    ),
  userStories: z
    .array(userStorySchema)
    .describe("The user stories this work satisfies. Provide at least one."),
  acceptanceCriteria: z
    .array(acceptanceCriterionSchema)
    .describe(
      "The concrete, testable conditions that define done. These are the contract the implementation and the code review are checked against, so each must be specific and verifiable. Provide at least one."
    ),
  edgeCases: z
    .array(z.string())
    .describe(
      "Edge cases and failure modes that must be handled. Use an empty list only if genuinely none apply."
    ),
  successMetrics: z
    .array(z.string())
    .describe(
      "How success will be measured after shipping. Provide at least one, measurable where possible."
    ),
})

export type PrdContent = z.infer<typeof prdSchema>
export type AcceptanceCriterionContent = z.infer<typeof acceptanceCriterionSchema>
export type UserStoryContent = z.infer<typeof userStorySchema>