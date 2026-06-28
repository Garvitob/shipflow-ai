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

const TYPE_LABEL: Record<string, string> = {
  EXISTING: "Existing",
  NEW: "New",
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

export function ProjectsList() {
  const router = useRouter()
  const projects = trpc.projects.list.useQuery()

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold leading-none tracking-[-0.02em] text-foreground">
            Projects
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every project your team is delivering across the company.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/projects/new">
            <Plus className="h-4 w-4" />
            New project
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        {projects.isLoading ? (
          <ListSkeleton />
        ) : projects.error ? (
          <ErrorState onRetry={() => projects.refetch()} />
        ) : projects.data && projects.data.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Repository</TableHead>
                  <TableHead className="w-24">Type</TableHead>
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
                        <span className="text-[13px] text-muted-foreground/60">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {TYPE_LABEL[p.projectType]}
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
          <EmptyState />
        )}
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-border px-4 py-3.5 last:border-0"
          >
            <div className="h-4 w-44 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-28 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-16 animate-pulse rounded bg-secondary" />
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

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-12">
      <div className="mx-auto max-w-sm text-center">
        <p className="text-sm text-foreground">Couldn&apos;t load projects.</p>
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}