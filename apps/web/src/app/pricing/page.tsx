import type { Metadata } from "next"
import { MarketingNav } from "@/components/marketing/marketing-nav"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { PricingTable } from "@/components/marketing/pricing-table"
import { Reveal } from "@/components/marketing/reveal"

export const metadata: Metadata = {
  title: "Pricing — ShipFlow AI",
  description:
    "Per-seat pricing for ShipFlow AI. Starter, Team, and Enterprise plans. Invite-only — request access for your team.",
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "How does per-seat billing work?",
    a: "You pay per active member across all roles — Client, PM, Developer, and Senior Engineer seats all count. Annual billing is 20% cheaper than monthly.",
  },
  {
    q: "Why is there no free signup?",
    a: "ShipFlow is invite-only. Access is provisioned per workspace so every account is tied to a real delivery org. Request access and we'll set you up.",
  },
  {
    q: "What counts as a review pass?",
    a: "Each opened or updated pull request triggers both review passes — the implementation critic and the adversarial QA pass. There are no per-review surcharges on any plan.",
  },
  {
    q: "Can we connect more repositories?",
    a: "Starter includes one repository, Team includes ten, and Enterprise is unlimited. You can move between plans at any time.",
  },
]

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />

      <main className="flex-1">
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-24">
            <Reveal>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Pricing
              </span>
              <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Per seat. Every role. No surprises.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                One price covers the whole pipeline — discovery, PRD, dual-AI review, and
                traceability — for every member of the workspace.
              </p>
            </Reveal>

            <div className="mt-14">
              <PricingTable />
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Questions, answered.
              </h2>
            </Reveal>
            <dl className="mt-10 divide-y divide-border border-y border-border">
              {FAQ.map((item, i) => (
                <Reveal key={item.q} delay={0.04 * i}>
                  <div className="py-6">
                    <dt className="text-base font-semibold text-foreground">{item.q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
