import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { requireRole } from "@/lib/auth-guard"
import { PortalShell } from "@/components/shell/portal-shell"
import { listClientProjects } from "@/lib/discovery/queries"

export const dynamic = "force-dynamic"

export default async function PortalProjectsPage() {
  const ctx = await requireRole("CLIENT")
  const projects = await listClientProjects(ctx)

  return (
    <PortalShell ctx={ctx} role="CLIENT" breadcrumb="Projects">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Your projects
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Open a project to track your requests or raise a new one.
          </p>
        </header>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No projects yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Your team will add you to a project. Once they do, it will appear
              here and you can start raising requests.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border">
            {projects.map((p, i) => (
              <li
                key={p.id}
                className={i > 0 ? "border-t border-border" : undefined}
              >
                <Link
                  href={`/portal/${p.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-secondary"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {p.requestCount} {p.requestCount === 1 ? "request" : "requests"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalShell>
  )
}