import "server-only"

// Resolves the client IP from proxy headers. On Vercel, x-forwarded-for
// is set and trustworthy; the first entry is the originating client.
// Falls back to a constant so rate limiting still groups unknown-IP
// traffic rather than skipping it.
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  const real = req.headers.get("x-real-ip")
  if (real) return real.trim()
  return "ip:unknown"
}