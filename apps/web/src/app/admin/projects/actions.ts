"use server"

import { headers } from "next/headers"
import { auth, APP_URL } from "@/lib/auth"
import { requireRole } from "@/lib/auth-guard"

export async function sendMemberInvite(email: string): Promise<void> {
  await requireRole("ADMIN")

  await auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: `${APP_URL}/reset-password`,
    },
    headers: await headers(),
  })
}