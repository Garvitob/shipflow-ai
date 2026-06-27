"use client"

import * as React from "react"
import { motion } from "motion/react"
import { Zap, Loader2, ArrowLeft } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: resetError } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    })

    setLoading(false)

    if (resetError) {
      if (resetError.status === 429) {
        setError(
          "Too many requests. Please wait a few minutes and try again."
        )
        return
      }
      // Any other error is shown generically below by still advancing to
      // the confirmation state, so we never reveal whether the email exists.
    }

    setSubmitted(true)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[380px]"
      >
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
            <Zap className="h-4 w-4 text-background" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            ShipFlow
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
          {submitted ? (
            <div className="space-y-4">
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  Check your email
                </h1>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  If an account exists for{" "}
                  <span className="font-mono text-foreground">{email}</span>, we
                  sent a link to reset your password. The link is valid for 24
                  hours.
                </p>
              </div>
              <a
                href="/login"
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </a>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  Reset password
                </h1>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Enter your email and we will send you a link to reset it.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>

                {error ? (
                  <p className="text-[13px] text-destructive">{error}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <a
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </a>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Access is managed by your workspace administrator.
        </p>
      </motion.div>
    </div>
  )
}