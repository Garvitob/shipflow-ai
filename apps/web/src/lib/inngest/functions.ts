import { inngest } from "./client"
import { analyzeRepository } from "./job"

export const testFunction = inngest.createFunction(
  {
    id: "test-function",
    triggers: [{ event: "test/hello" }],
  },
  async ({ event, step }) => {
    const name = event.data?.name ?? "world"

    await step.run("log-greeting", async () => {
      console.log("[inngest] test function ran")
      return { greeted: true }
    })

    return { message: `Hello, ${name}!` }
  },
)

export const functions = [testFunction, analyzeRepository]