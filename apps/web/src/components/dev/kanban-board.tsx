"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, GitPullRequest } from "lucide-react"
import { cn } from "@/lib/utils"
import { moveTask } from "@/lib/tasks/actions"
import { submitPrForReview } from "@/lib/dev/actions"

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE"

export type BoardTask = {
  id: string
  title: string
  description: string
  complexity: string
  status: TaskStatus
  criterionLabel: string
  assignedToName: string | null
  isMine: boolean
}

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "TODO", label: "To do" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "DONE", label: "Done" },
]

const COMPLEXITY_TONE: Record<string, string> = {
  Low: "text-muted-foreground",
  Medium: "text-foreground",
  High: "text-[var(--accent-strong,#4f46e5)]",
}

export function KanbanBoard({
  featureRequestId,
  initialTasks,
  canSubmit,
}: {
  featureRequestId: string
  initialTasks: BoardTask[]
  canSubmit: boolean
}) {
  const router = useRouter()
  const [tasks, setTasks] = React.useState<BoardTask[]>(initialTasks)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [overCol, setOverCol] = React.useState<TaskStatus | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const allDone = tasks.length > 0 && tasks.every((t) => t.status === "DONE")

  async function applyMove(taskId: string, status: TaskStatus) {
    const prev = tasks
    const task = prev.find((t) => t.id === taskId)
    if (!task || task.status === status) return

    setTasks((cur) =>
      cur.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              assignedToName:
                status === "IN_PROGRESS" && t.assignedToName === null
                  ? "You"
                  : t.assignedToName,
              isMine:
                status === "IN_PROGRESS" && t.assignedToName === null ? true : t.isMine,
            }
          : t,
      ),
    )
    setError(null)

    const res = await moveTask({ taskId, status })
    if (!res.ok) {
      setTasks(prev)
      setError(res.error)
      return
    }
    router.refresh()
  }

  function onDrop(status: TaskStatus) {
    setOverCol(null)
    if (dragId) void applyMove(dragId, status)
    setDragId(null)
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key)
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault()
                setOverCol(col.key)
              }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
              onDrop={() => onDrop(col.key)}
              className={cn(
                "flex flex-col rounded-lg border bg-card transition-colors",
                overCol === col.key ? "border-foreground/40" : "border-border",
              )}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <span className="text-xs font-medium text-foreground">{col.label}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {colTasks.length}
                </span>
              </div>
              <div className="flex min-h-[120px] flex-col gap-2 p-2">
                {colTasks.map((task) => (
                  <article
                    key={task.id}
                    draggable
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => {
                      setDragId(null)
                      setOverCol(null)
                    }}
                    className={cn(
                      "cursor-grab rounded-md border border-border bg-background p-3 active:cursor-grabbing",
                      dragId === task.id && "opacity-50",
                    )}
                  >
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {task.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {task.description}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          COMPLEXITY_TONE[task.complexity] ?? "text-muted-foreground",
                        )}
                      >
                        {task.complexity}
                      </span>
                      {task.assignedToName && (
                        <span className="truncate text-xs text-muted-foreground">
                          {task.isMine ? "You" : task.assignedToName}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
                {colTasks.length === 0 && (
                  <div className="flex flex-1 items-center justify-center py-6">
                    <span className="text-xs text-muted-foreground/60">Drop here</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {canSubmit && (
        <SubmitPr
          featureRequestId={featureRequestId}
          allDone={allDone}
          taskCount={tasks.length}
        />
      )}
    </div>
  )
}

function SubmitPr({
  featureRequestId,
  allDone,
  taskCount,
}: {
  featureRequestId: string
  allDone: boolean
  taskCount: number
}) {
  const router = useRouter()
  const [url, setUrl] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  async function handleSubmit() {
    setError(null)
    if (url.trim().length === 0) {
      setError("Paste your pull request URL.")
      return
    }
    setBusy(true)
    const res = await submitPrForReview({ featureRequestId, prUrl: url.trim() })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    router.refresh()
  }

  return (
    <section className="mt-8 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <GitPullRequest className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Submit for review</h2>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {taskCount > 0 && !allDone
          ? "Open a pull request for your work, then submit it. The AI reviewer will check it against the acceptance criteria."
          : "Paste the pull request for this work. The AI reviewer will check it against the acceptance criteria."}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
          disabled={busy}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <button
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit PR
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  )
}