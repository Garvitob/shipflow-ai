import Link from "next/link"
import { Logo } from "@/components/marketing/logo"

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "PRODUCT",
    links: [
      { label: "How it works", href: "/#pipeline" },
      { label: "Review engine", href: "/#review-engine" },
      { label: "Traceability", href: "/#traceability" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "COMPANY",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Request access", href: "mailto:access@shipflow.ai" },
      { label: "Security", href: "mailto:security@shipflow.ai" },
    ],
  },
  {
    heading: "ACCESS",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Status", href: "/#pipeline" },
    ],
  },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Logo />
            <p className="mt-4 max-w-[14rem] text-sm leading-relaxed text-muted-foreground">
              AI-governed delivery. Accountable to the spec, traceable to the line.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="font-mono text-xs text-muted-foreground">
            © {new Date().getFullYear()} ShipFlow AI — invite-only
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            governance for AI-era software delivery
          </p>
        </div>
      </div>
    </footer>
  )
}
