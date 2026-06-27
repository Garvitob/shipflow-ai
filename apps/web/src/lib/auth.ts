import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { prisma } from "@shipflow/db"
import { sendPasswordSetupEmail } from "@/lib/email"
import { writeAudit, resolveWorkspaceId } from "@/lib/audit"

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 60 * 24,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordSetupEmail({
        to: user.email,
        name: user.name,
        url,
      })
      const workspaceId = await resolveWorkspaceId(user.id)
      if (workspaceId) {
        await writeAudit({
          workspaceId,
          actorId: user.id,
          action: "password.reset_requested",
          entityType: "User",
          entityId: user.id,
        })
      }
    },
    onPasswordReset: async ({ user }) => {
      const workspaceId = await resolveWorkspaceId(user.id)
      if (workspaceId) {
        await writeAudit({
          workspaceId,
          actorId: user.id,
          action: "password.reset_completed",
          entityType: "User",
          entityId: user.id,
        })
      }
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          const workspaceId = await resolveWorkspaceId(session.userId)
          if (workspaceId) {
            await writeAudit({
              workspaceId,
              actorId: session.userId,
              action: "user.login",
              entityType: "Session",
              entityId: session.id,
              metadata: session.ipAddress
                ? { ip: session.ipAddress }
                : undefined,
            })
          }
        },
      },
    },
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
export { APP_URL }