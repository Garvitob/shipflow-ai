import { router, publicProcedure } from "../trpc"

export const appRouter = router({
  health: publicProcedure.query(() => {
    return { ok: true, ts: new Date() }
  }),
})

export type AppRouter = typeof appRouter