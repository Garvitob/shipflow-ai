import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@shipflow/trpc"
import type { TRPCContext } from "@shipflow/trpc"
import { getAuthContext } from "@/lib/auth-guard"

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async (): Promise<TRPCContext> => {
      const auth = await getAuthContext()
      return { auth }
    },
  })
}

export { handler as GET, handler as POST }