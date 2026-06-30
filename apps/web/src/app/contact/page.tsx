import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { MarketingNav } from "@/components/marketing/marketing-nav"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { Reveal } from "@/components/marketing/reveal"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Contact — ShipFlow AI",
  description:
    "Reach the ShipFlow team — request access, talk to sales, get support, or report a security issue.",
}

const CHANNELS: {
  tag: string
  title: string
  blurb: string
  email: string
  response: string
}[] = [
  {
    tag: "ACCESS",
    title: "Request access",
    blurb: "ShipFlow is invite-only. Tell us about your team and product to get provisioned.",
    email: "access@shipflow.ai",
    response: "≤ 1 business day",
  },
  {
    tag: "SALES",
    title: "Talk to sales",
    blurb: "Enterprise plans, custom governance policies, self-hosted runners, and SLAs.",
    email: "sales@shipflow.ai",
    response: "≤ 1 business day",
  },
  {
    tag: "SUPPORT",
    title: "Technical support",
    blurb: "Pipeline issues, review-engine questions, GitHub App or webhook help.",
    email: "support@shipflow.ai",
    response: "≤ 4 hours · priority plans",
  },
  {
    tag: "SECURITY",
    title: "Security disclosures",
    blurb: "Report a vulnerability. Coordinated disclosure; please do not file a public issue.",
    email: "security@shipflow.ai",
    response: "≤ 24 hours",
  },
]

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />

      <main className="flex-1">
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <Reveal>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Contact
              </span>
              <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Talk to the people building it.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                Pick the channel that fits. Every address below is monitored by the team — no
                ticket maze, no bots.
              </p>
            </Reveal>

            <div className="mt-14 grid gap-4 sm:grid-cols-2">
              {CHANNELS.map((c, i) => (
                <Reveal key={c.tag} delay={0.05 * i}>
                  <a
                    href={`mailto:${c.email}`}
                    className="group flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors duration-150 hover:border-border-strong"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {c.tag}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                    <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                      {c.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.blurb}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                      <span className="font-mono text-sm text-foreground underline-offset-4 group-hover:underline">
                        {c.email}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {c.response}
                      </span>
                    </div>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* secondary info strip */}
        <section className="border-b border-border bg-secondary/30">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  General
                </h3>
                <a
                  href="mailto:hello@shipflow.ai"
                  className="mt-2 block font-mono text-sm text-foreground underline-offset-4 hover:underline"
                >
                  hello@shipflow.ai
                </a>
              </div>
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Hours
                </h3>
                <p className="mt-2 text-sm text-foreground">Mon–Fri · 9:00–18:00 IST</p>
              </div>
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Existing workspace
                </h3>
                <Link
                  href="/login"
                  className="mt-2 block text-sm text-foreground underline-offset-4 hover:underline"
                >
                  Sign in →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* closing */}
        <section>
          <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Ready when you are.
              </h2>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg">
                  <a href="mailto:access@shipflow.ai?subject=ShipFlow%20access%20request">
                    Request access
                  </a>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
