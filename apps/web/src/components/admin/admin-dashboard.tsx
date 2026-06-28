"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, ArrowRight, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { sendMemberInvite } from "@/app/admin/projects/actions"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

const PLAN_LABEL: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
}

const ROLE_LABEL: Record<string, string> = {
  PM: "Product Manager",
  SENIOR_ENG: "Senior Engineer",
  DEVELOPER: "Developer",
  CLIENT: "Client",
}

const PLAN_CREDITS: Record<string, number> = {
  FREE: 10,
  STARTER: 100,
  PROFESSIONAL: 500,
  ENTERPRISE: 2000,
}

const PROJECTS_PREVIEW = 5
const ACTIVITY_PREVIEW = 5

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
      return `${base} · ${ROLE_LABEL[meta.role as string] ?? meta.role}`
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
  const activity = trpc.dashboard.activity.useQuery({ limit: ACTIVITY_PREVIEW })
  const pending = trpc.dashboard.pendingInvites.useQuery()

  const planLabel = stats.data ? PLAN_LABEL[stats.data.plan] ?? stats.data.plan : null

  const visibleProjects = projects.data?.slice(0, PROJECTS_PREVIEW) ?? []
  const hasMoreProjects = (projects.data?.length ?? 0) > PROJECTS_PREVIEW

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

      <section className="mt-8">
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
            <ErrorState
              message="Couldn't load projects."
              onRetry={() => projects.refetch()}
            />
          ) : visibleProjects.length > 0 ? (
            <>
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
                    {visibleProjects.map((p) => (
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
                            <span className="text-[13px] text-muted-foreground/60">
                              —
                            </span>
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
              {hasMoreProjects && (
                <div className="mt-3">
                  <Link
                    href="/admin/projects"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    View all projects
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </>
          ) : (
            <EmptyProjects />
          )}
        </div>
      </section>

      {pending.data && pending.data.length > 0 && (
        <PendingInvites
          people={pending.data}
          onResolved={() => pending.refetch()}
        />
      )}

      <UsagePanel
        loading={stats.isLoading}
        credits={stats.data?.credits ?? null}
        plan={stats.data?.plan ?? null}
        planLabel={planLabel}
      />

      <section className="mt-8">
        <h2 className="text-sm font-medium text-foreground">Recent activity</h2>
        <div className="mt-4">
          {activity.isLoading ? (
            <ActivityLoading />
          ) : activity.data && activity.data.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <ul className="divide-y divide-border">
                  {activity.data.map((entry) => (
                    <li
                      key={entry.id}
                      onClick={() => router.push("/admin/audit")}
                      className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-secondary/60"
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
              </div>
              <div className="mt-3">
                <Link
                  href="/admin/audit"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all activity
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border bg-card px-4 py-8">
              <p className="text-center text-sm text-muted-foreground">
                No activity yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function UsagePanel({
  loading,
  credits,
  plan,
  planLabel,
}: {
  loading: boolean
  credits: number | null
  plan: string | null
  planLabel: string | null
}) {
  const total = plan ? PLAN_CREDITS[plan] ?? credits ?? 0 : 0
  const remaining = credits ?? 0
  const used = Math.max(0, total - remaining)
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">AI credits</h2>
      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-5 w-32 animate-pulse rounded bg-secondary" />
            <div className="h-2 w-full animate-pulse rounded-full bg-secondary" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-sm text-foreground">{used}</span>
                <span className="text-sm text-muted-foreground">
                  of <span className="font-mono">{total}</span> credits used
                </span>
              </div>
              {planLabel && (
                <span className="text-xs text-muted-foreground">
                  {planLabel} plan
                </span>
              )}
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {remaining} credits remaining. Credits are used when the AI runs
              discovery, reviews, and planning.
            </p>
          </>
        )}
      </div>
    </section>
  )
}

type PendingPerson = {
  id: string
  name: string
  email: string
  role: string
  projectName: string
}

function PendingInvites({
  people,
  onResolved,
}: {
  people: PendingPerson[]
  onResolved: () => void
}) {
  void onResolved
  return (
    <section className="mt-8">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">
            {people.length === 1
              ? "1 person hasn't set up their account"
              : `${people.length} people haven't set up their accounts`}
          </h2>
          <p className="text-xs text-muted-foreground">
            They were invited but haven&apos;t set a password yet.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {people.map((person) => (
            <PendingRow key={person.id} person={person} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function PendingRow({ person }: { person: PendingPerson }) {
  const [state, setState] = React.useState<"idle" | "sending" | "sent">("idle")

  async function handleResend() {
    setState("sending")
    try {
      await sendMemberInvite(person.email)
      setState("sent")
    } catch {
      setState("idle")
    }
  }

  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
        {person.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {person.name}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {person.email}
        </p>
      </div>
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {ROLE_LABEL[person.role] ?? person.role} · {person.projectName}
      </span>
      <button
        onClick={handleResend}
        disabled={state !== "idle"}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {state === "sending" && <Loader2 className="h-3 w-3 animate-spin" />}
        {state === "sent" ? "Sent" : state === "sending" ? "Sending…" : "Resend invite"}
      </button>
    </li>
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
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0"
          >
            <div className="h-4 w-48 animate-pulse rounded bg-secondary" />
            <div className="h-3 w-14 animate-pulse rounded bg-secondary" />
          </div>
        ))}
      </div>
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