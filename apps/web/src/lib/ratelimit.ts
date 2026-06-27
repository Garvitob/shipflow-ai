import "server-only"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

// Rate limiting is only active when Redis is configured. In local dev
// without Upstash credentials, limiters are null and checks are skipped
// (logged once), so the app never hard-fails on a missing dependency.
const redis = url && token ? new Redis({ url, token }) : null

if (!redis) {
  console.warn(
    "[ratelimit] Upstash not configured — auth rate limiting is DISABLED. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
  )
}

function makeLimiter(limiter: ReturnType<typeof Ratelimit.slidingWindow>, prefix: string) {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter,
    prefix,
    analytics: false,
  })
}

// Sign-in: 5 attempts per 15 minutes. Brute-force protection.
export const signInLimiter = makeLimiter(
  Ratelimit.slidingWindow(5, "15 m"),
  "rl:signin"
)

// Request password reset / set-password link: 3 per hour.
// Prevents email-bombing and reset-link flooding.
export const resetRequestLimiter = makeLimiter(
  Ratelimit.slidingWindow(3, "1 h"),
  "rl:reset-request"
)

// Submit new password via token: 5 per hour. Prevents token brute-force.
export const resetSubmitLimiter = makeLimiter(
  Ratelimit.slidingWindow(5, "1 h"),
  "rl:reset-submit"
)

export type LimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// Runs a limiter for a given identifier. If Redis is unconfigured, allows
// the request (fail-open) so a missing/broken Redis never locks users out —
// the correct availability tradeoff for auth. Real Redis errors are caught
// and also fail-open, but logged loudly for alerting.
export async function checkLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<LimitResult> {
  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 }
  }
  try {
    const res = await limiter.limit(identifier)
    return {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
    }
  } catch (err) {
    console.error("[ratelimit] Redis error, failing open:", err)
    return { success: true, limit: 0, remaining: 0, reset: 0 }
  }
}