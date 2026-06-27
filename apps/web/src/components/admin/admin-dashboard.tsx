"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

const PLAN_LABEL: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

function relativeTime(d: Date) {
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return formatDate(d)
}

const ACTION_LABEL: Record<string, string> = {
  "workspace.provisioned": "Workspace provisioned",
  "project.created": "Project created",
  "project.updated": "Project updated",
  "project.member_added": "Member added",
  "project.member_removed": "Member removed",
  "user.login": "Signed in",
  "password.reset_requested": "Password reset requested",
  "password.reset_completed": "Password reset completed",
}

function describeActivity(action: string, metadata: string | null): string {
  const base = ACTION_LABEL[action] ?? action
  if (!metadata) return base
  try {
    const meta = JSON.parse(metadata) as Record<string, unknown>
    if (action === "project.created" && typeof meta.name === "string") {
      return `${base} · ${meta.name}`
    }
    if (action === "project.member_added" && typeof meta.role === "string") {
      return `${base} · ${meta.role}`
    }
  } catch {
    return base
  }
  return base
}

export function AdminDashboard() {
  const router = useRouter()
  const stats = trpc.dashboard.stats.useQuery()
  const projects = trpc.projects.list.useQuery()
  const activity = trpc.dashboard.activity.useQuery({ limit: 6 })

  const planLabel = stats.data ? PLAN_LABEL[stats.data.plan] ?? stats.data.plan : null

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header>
        <h1 className="text-[22px] font-semibold leading-none tracking-[-0.02em] text-foreground">
          Overview
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {stats.isLoading ? (
            <span className="inline-block h-4 w-56 animate-pulse rounded bg-secondary align-middle" />
          ) : stats.data ? (
            <span>
              {stats.data.projectCount === 0
                ? "No projects yet"
                : `${stats.data.projectCount} ${stats.data.projectCount === 1 ? "project" : "projects"} · ${stats.data.memberCount} ${stats.data.memberCount === 1 ? "person" : "people"}`}
              <span className="px-1.5 text-muted-foreground/40">·</span>
              <span className="font-mono">{planLabel}</span> plan
            </span>
          ) : null}
        </p>
      </header>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Projects</h2>
          <Button asChild>
            <Link href="/admin/projects/new">
              <Plus className="h-4 w-4" />
              New project
            </Link>
          </Button>
        </div>

        <div className="mt-4">
          {projects.isLoading ? (
            <ProjectsLoading />
          ) : projects.error ? (
            <ErrorState message="Couldn't load projects." onRetry={() => projects.refetch()} />
          ) : projects.data && projects.data.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Name</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead className="w-24">Members</TableHead>
                    <TableHead className="w-32 pr-4 text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.data.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/projects/${p.id}`)}
                    >
                      <TableCell className="pl-4 font-medium">{p.name}</TableCell>
                      <TableCell>
                        {p.gitHubRepo ? (
                          <span className="font-mono text-[13px] text-muted-foreground">
                            {p.gitHubRepo.repoFullName}
                          </span>
                        ) : (
                          <span className="text-[13px] text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[13px] text-muted-foreground">
                        {p._count.projectMembers}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-mono text-[13px] text-muted-foreground">
                        {formatDate(p.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyProjects />
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-foreground">Recent activity</h2>
        <div className="mt-4">
          {activity.isLoading ? (
            <ActivityLoading />
          ) : activity.data && activity.data.length > 0 ? (
            <ul className="flex flex-col">
              {activity.data.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
                >
                  <span className="text-sm text-foreground">
                    {describeActivity(entry.action, entry.metadata)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {relativeTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function ProjectsLoading() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-border px-4 py-3.5 last:border-0"
          >
            <div className="h-4 w-40 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityLoading() {
  return (
    <div className="flex flex-col">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
        >
          <div className="h-4 w-48 animate-pulse rounded bg-secondary" />
          <div className="h-3 w-14 animate-pulse rounded bg-secondary" />
        </div>
      ))}
    </div>
  )
}

function EmptyProjects() {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-16">
      <div className="mx-auto max-w-sm text-center">
        <h3 className="text-sm font-medium text-foreground">No projects yet</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Create your first project to start managing feature delivery across the
          company.
        </p>
        <div className="mt-5 flex justify-center">
          <Button asChild>
            <Link href="/admin/projects/new">
              <Plus className="h-4 w-4" />
              New project
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-12">
      <div className="mx-auto max-w-sm text-center">
        <p className="text-sm text-foreground">{message}</p>
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}