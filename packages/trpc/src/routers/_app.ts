import { router, publicProcedure } from "../trpc"
import { projectsRouter } from "./projects"
import { dashboardRouter } from "./dashboard"

export const appRouter = router({
  health: publicProcedure.query(() => {
    return { ok: true, ts: new Date() }
  }),
  projects: projectsRouter,
  dashboard: dashboardRouter,
})

export type AppRouter = typeof appRouter