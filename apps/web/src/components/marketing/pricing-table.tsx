"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Tier = {
  name: string
  tag: string
  monthly: number | null
  annual: number | null
  blurb: string
  features: string[]
  cta: { label: string; href: string }
  highlight?: boolean
}

const TIERS: Tier[] = [
  {
    name: "Starter",
    tag: "STARTER",
    monthly: 20,
    annual: 16,
    blurb: "For a single team putting one product through the pipeline.",
    features: [
      "1 workspace · up to 8 seats",
      "AI discovery → PRD with acceptance criteria",
      "Dual-AI review on every PR",
      "1 connected GitHub repository",
      "Email support",
    ],
    cta: { label: "Request access", href: "mailto:access@shipflow.ai?subject=Starter%20access" },
  },
  {
    name: "Team",
    tag: "TEAM",
    monthly: 40,
    annual: 32,
    blurb: "For delivery orgs running several clients and repos at once.",
    features: [
      "Unlimited workspaces · up to 50 seats",
      "Everything in Starter",
      "Up to 10 connected repositories",
      "Role-based portals: Client / PM / Dev / Senior Eng",
      "Audit log export · priority support",
    ],
    cta: { label: "Request access", href: "mailto:access@shipflow.ai?subject=Team%20access" },
    highlight: true,
  },
  {
    name: "Enterprise",
    tag: "ENTERPRISE",
    monthly: null,
    annual: null,
    blurb: "For regulated teams with custom governance and security needs.",
    features: [
      "Unlimited seats & repositories",
      "SSO / SAML · custom roles",
      "Self-hosted review runners",
      "Custom severity policy & SLAs",
      "Dedicated solutions engineer",
    ],
    cta: { label: "Contact sales", href: "mailto:sales@shipflow.ai?subject=Enterprise" },
  },
]

function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-foreground"
    >
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PricingTable() {
  const [annual, setAnnual] = React.useState(true)

  return (
    <div>
      {/* billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span
          className={cn(
            "font-mono text-xs uppercase tracking-wider",
            annual ? "text-muted-foreground" : "text-foreground"
          )}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label="Toggle annual billing"
          onClick={() => setAnnual((v) => !v)}
          className="relative inline-flex h-6 w-11 items-center rounded-full border border-border bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-foreground transition-transform duration-200",
              annual ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
        <span
          className={cn(
            "font-mono text-xs uppercase tracking-wider",
            annual ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Annual
        </span>
        <span className="rounded border border-accent/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
          −20%
        </span>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {TIERS.map((tier) => {
          const price = annual ? tier.annual : tier.monthly
          return (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-6 transition-colors duration-150",
                tier.highlight ? "border-accent/50" : "border-border hover:border-border-strong"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {tier.tag}
                </span>
                {tier.highlight ? (
                  <span className="rounded border border-accent/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                    Most popular
                  </span>
                ) : null}
              </div>

              <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                {tier.name}
              </h3>

              <div className="mt-4 flex items-baseline gap-1.5">
                {price === null ? (
                  <span className="text-3xl font-semibold tracking-tight text-foreground">
                    Custom
                  </span>
                ) : (
                  <>
                    <span className="font-mono text-4xl font-semibold tracking-tight text-foreground">
                      ${price}
                    </span>
                    <span className="text-sm text-muted-foreground">/ user / mo</span>
                  </>
                )}
              </div>
              <p className="mt-1 h-4 font-mono text-[11px] text-muted-foreground">
                {price === null
                  ? "annual contract"
                  : annual
                    ? "billed annually"
                    : "billed monthly"}
              </p>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{tier.blurb}</p>

              <Button
                asChild
                variant={tier.highlight ? "default" : "secondary"}
                className="mt-6 w-full"
              >
                <Link href={tier.cta.href}>{tier.cta.label}</Link>
              </Button>

              <ul className="mt-6 space-y-3 border-t border-border pt-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check />
                    <span className="text-sm leading-relaxed text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Invite-only · no self-serve signup · prices in USD
      </p>
    </div>
  )
}
