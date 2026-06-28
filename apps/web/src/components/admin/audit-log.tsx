"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc/client"

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

function actionLabel(action: string) {
  return ACTION_LABEL[action] ?? action
}

function detailFor(action: string, metadata: string | null): string | null {
  if (!metadata) return null
  try {
    const meta = JSON.parse(metadata) as Record<string, unknown>
    if (action === "project.created" && typeof meta.name === "string") {
      return meta.name
    }
    if (action === "project.member_added") {
      const parts: string[] = []
      if (typeof meta.email === "string") parts.push(meta.email)
      if (typeof meta.role === "string") parts.push(humanRole(meta.role))
      return parts.length ? parts.join(" · ") : null
    }
    if (action === "project.member_removed" && typeof meta.role === "string") {
      return humanRole(meta.role)
    }
    if (action === "workspace.provisioned" && typeof meta.slug === "string") {
      return meta.slug
    }
  } catch {
    return null
  }
  return null
}

function humanRole(role: string) {
  const map: Record<string, string> = {
    PM: "Product Manager",
    SENIOR_ENG: "Senior Engineer",
    DEVELOPER: "Developer",
    CLIENT: "Client",
    ADMIN: "Admin",
  }
  return map[role] ?? role
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
  return null
}

function absoluteDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

function absoluteTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d)
}

export function AuditLog() {
  const query = trpc.dashboard.auditLog.useInfiniteQuery(
    { limit: 20 },
    { getNextPageParam: (last) => last.nextCursor },
  )

  const entries = query.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <header>
        <h1 className="text-[22px] font-semibold leading-none tracking-[-0.02em] text-foreground">
          Audit log
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A record of everything that has happened in your workspace.
        </p>
      </header>

      <div className="mt-8">
        {query.isLoading ? (
          <AuditSkeleton />
        ) : query.error ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-2.5 sm:grid-cols-[1fr_160px_140px]">
                <span className="text-xs font-medium text-muted-foreground">
                  Event
                </span>
                <span className="hidden text-xs font-medium text-muted-foreground sm:block">
                  Actor
                </span>
                <span className="text-right text-xs font-medium text-muted-foreground">
                  When
                </span>
              </div>

              <ul className="divide-y divide-border">
                {entries.map((entry) => {
                  const detail = detailFor(entry.action, entry.metadata)
                  const rel = relativeTime(entry.createdAt)
                  return (
                    <li
                      key={entry.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 sm:grid-cols-[1fr_160px_140px]"
                    >
                      <div className="min-w-0">
                        <span className="text-sm text-foreground">
                          {actionLabel(entry.action)}
                        </span>
                        {detail && (
                          <span className="ml-2 truncate font-mono text-xs text-muted-foreground">
                            {detail}
                          </span>
                        )}
                      </div>
                      <span className="hidden truncate text-sm text-muted-foreground sm:block">
                        {entry.actor}
                      </span>
                      <span
                        className="text-right font-mono text-xs text-muted-foreground"
                        title={`${absoluteDate(entry.createdAt)}, ${absoluteTime(entry.createdAt)}`}
                      >
                        {rel ?? absoluteDate(entry.createdAt)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {query.hasNextPage && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {query.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AuditSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-border px-4 py-3.5 last:border-0"
          >
            <div className="h-4 w-44 animate-pulse rounded bg-secondary" />
            <div className="hidden h-4 w-28 animate-pulse rounded bg-secondary sm:block" />
            <div className="h-3 w-16 animate-pulse rounded bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-16">
      <div className="mx-auto max-w-sm text-center">
        <h3 className="text-sm font-medium text-foreground">No activity yet</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Actions across your workspace will appear here as they happen.
        </p>
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-12">
      <div className="mx-auto max-w-sm text-center">
        <p className="text-sm text-foreground">Couldn&apos;t load the audit log.</p>
        <div className="mt-4 flex justify-center">
          <button
            onClick={onRetry}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}