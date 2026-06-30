"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"

const HEADLINE = ["Turn", "feature", "requests", "into", "reviewed,", "shipped", "code."]
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function Hero() {
  const reduce = useReducedMotion()

  return (
    <section className="relative overflow-hidden">
      {/* hairline grid backdrop — structural, not decorative glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)/0.6) 1px, transparent 1px)",
          backgroundSize: "88px 100%",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pb-28 sm:pt-28">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            AI-governed delivery pipeline
          </span>
        </motion.div>

        <h1 className="mt-7 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
          {HEADLINE.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={reduce ? false : { opacity: 0, y: "0.45em" }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE, delay: 0.08 + i * 0.05 }}
            >
              {word}
              {i < HEADLINE.length - 1 ? " " : ""}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
        >
          ShipFlow holds every change accountable to the spec. A clarified request becomes
          a PRD with numbered acceptance criteria, then dual-AI review checks the real diff
          against each one — with full traceability from request to ship.
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.62 }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <a href="#pipeline">See how it works</a>
          </Button>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.8 }}
          className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground"
        >
          <span>request</span>
          <span className="text-border-strong">→</span>
          <span>acceptance criteria</span>
          <span className="text-border-strong">→</span>
          <span>PR</span>
          <span className="text-border-strong">→</span>
          <span className="text-accent">2 review passes</span>
          <span className="text-border-strong">→</span>
          <span>senior approval</span>
          <span className="text-border-strong">→</span>
          <span>shipped</span>
        </motion.div>
      </div>
    </section>
  )
}
