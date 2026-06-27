import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { getClientIp } from "@/lib/request-ip"
import {
  checkLimit,
  signInLimiter,
  resetRequestLimiter,
  resetSubmitLimiter,
  type LimitResult,
} from "@/lib/ratelimit"

const handlers = toNextJsHandler(auth)

function tooMany(result: LimitResult) {
  const retryAfter =
    result.reset > 0 ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) : 60
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    }
  )
}

// Reads the JSON body without consuming the original request stream.
// Returns a fresh Request so BetterAuth still receives an intact body.
async function readBody(req: Request): Promise<{ body: unknown; cloned: Request }> {
  const cloned = req.clone()
  let body: unknown = null
  try {
    body = await cloned.json()
  } catch {
    body = null
  }
  return { body, cloned: req }
}

function emailFrom(body: unknown): string | null {
  if (body && typeof body === "object" && "email" in body) {
    const e = (body as { email?: unknown }).email
    if (typeof e === "string" && e.length > 0) return e.toLowerCase()
  }
  return null
}

export async function POST(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url)
  const ip = getClientIp(req)

  // Sign-in: limit per IP AND per email (so one IP can't grind many
  // accounts, and one account can't be ground from many IPs).
  if (pathname.endsWith("/sign-in/email")) {
    const { body } = await readBody(req)
    const email = emailFrom(body)

    const ipCheck = await checkLimit(signInLimiter, `ip:${ip}`)
    if (!ipCheck.success) return tooMany(ipCheck)

    if (email) {
      const emailCheck = await checkLimit(signInLimiter, `email:${email}`)
      if (!emailCheck.success) return tooMany(emailCheck)
    }
  }

  // Request password reset / set-password link: limit per IP.
  // Not per-email, to avoid leaking which emails exist.
  else if (pathname.endsWith("/request-password-reset")) {
    const check = await checkLimit(resetRequestLimiter, `ip:${ip}`)
    if (!check.success) return tooMany(check)
  }

  // Submit new password with token: limit per IP. Stops token brute-force.
  else if (pathname.endsWith("/reset-password")) {
    const check = await checkLimit(resetSubmitLimiter, `ip:${ip}`)
    if (!check.success) return tooMany(check)
  }

  return handlers.POST(req)
}

export async function GET(req: Request): Promise<Response> {
  return handlers.GET(req)
}