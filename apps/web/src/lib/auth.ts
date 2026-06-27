import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { prisma } from "@shipflow/db"
import { sendPasswordSetupEmail } from "@/lib/email"

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    // Token validity for set-password / reset links (24 hours)
    resetPasswordTokenExpiresIn: 60 * 60 * 24,
    // Called when a password reset / set-password link is requested.
    // Used for: provisioned admins setting their first password,
    // invited members setting their password, and forgot-password resets.
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordSetupEmail({
        to: user.email,
        name: user.name,
        url,
      })
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
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