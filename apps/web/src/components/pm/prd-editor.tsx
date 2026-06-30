"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { updatePrd, approveRequest, rejectRequest } from "@/lib/pm/actions"

type Criterion = { title: string; description: string }

type PrdState = {
  problemStatement: string
  goals: string
  nonGoals: string
  userStories: string
  edgeCases: string
  successMetrics: string
  acceptanceCriteria: Criterion[]
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

export function PrdEditor({
  featureRequestId,
  initial,
  version,
  editable,
}: {
  featureRequestId: string
  initial: PrdState
  version: number
  editable: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(false)
  const [form, setForm] = React.useState<PrdState>(initial)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<null | "save" | "approve" | "reject">(null)
  const [rejectOpen, setRejectOpen] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState("")

  function setField(key: keyof Omit<PrdState, "acceptanceCriteria">, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  function setCriterion(i: number, key: keyof Criterion, value: string) {
    setForm((p) => {
      const next = [...p.acceptanceCriteria]
      next[i] = { ...next[i], [key]: value }
      return { ...p, acceptanceCriteria: next }
    })
  }

  function addCriterion() {
    setForm((p) => ({
      ...p,
      acceptanceCriteria: [...p.acceptanceCriteria, { title: "", description: "" }],
    }))
  }

  function removeCriterion(i: number) {
    setForm((p) => ({
      ...p,
      acceptanceCriteria: p.acceptanceCriteria.filter((_, idx) => idx !== i),
    }))
  }

  async function handleSave() {
    setError(null)
    setBusy("save")
    const res = await updatePrd({
      featureRequestId,
      problemStatement: form.problemStatement.trim(),
      goals: form.goals.trim(),
      nonGoals: form.nonGoals.trim(),
      userStories: form.userStories.trim(),
      edgeCases: form.edgeCases.trim(),
      successMetrics: form.successMetrics.trim(),
      acceptanceCriteria: form.acceptanceCriteria
        .map((c) => ({ title: c.title.trim(), description: c.description.trim() }))
        .filter((c) => c.title.length > 0 && c.description.length > 0),
    })
    setBusy(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setEditing(false)
    router.refresh()
  }

  async function handleApprove() {
    setError(null)
    setBusy("approve")
    const res = await approveRequest(featureRequestId)
    setBusy(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    router.push("/pm/requests")
    router.refresh()
  }

  async function handleReject() {
    setError(null)
    setBusy("reject")
    const res = await rejectRequest(featureRequestId, rejectReason.trim())
    setBusy(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    router.push("/pm/requests")
    router.refresh()
  }

  if (!editable) {
    return <ReadOnly form={initial} version={version} />
  }

  if (!editing) {
    return (
      <div>
        <ReadOnly form={form} version={version} />
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
          <button
            onClick={handleApprove}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
          >
            {busy === "approve" && <Loader2 className="h-4 w-4 animate-spin" />}
            Approve
          </button>
          <button
            onClick={() => setEditing(true)}
            disabled={busy !== null}
            className="inline-flex items-center rounded-md border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
          >
            Edit PRD
          </button>
          <button
            onClick={() => setRejectOpen((v) => !v)}
            disabled={busy !== null}
            className="ml-auto inline-flex items-center rounded-md px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
          >
            Reject
          </button>
        </div>

        {rejectOpen && (
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <label className="text-xs font-medium text-muted-foreground">
              Reason (optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="Why is this being rejected?"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setRejectOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
              >
                {busy === "reject" && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm reject
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <EditField
        label="Problem statement"
        value={form.problemStatement}
        onChange={(v) => setField("problemStatement", v)}
        rows={4}
      />
      <EditField
        label="Goals (one per line)"
        value={form.goals}
        onChange={(v) => setField("goals", v)}
        rows={4}
      />
      <EditField
        label="Non-goals (one per line)"
        value={form.nonGoals}
        onChange={(v) => setField("nonGoals", v)}
        rows={3}
      />
      <EditField
        label="User stories (one per line)"
        value={form.userStories}
        onChange={(v) => setField("userStories", v)}
        rows={4}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            Acceptance criteria
          </span>
          <button
            onClick={addCriterion}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        <div className="space-y-3">
          {form.acceptanceCriteria.map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <span className="mt-2 font-mono text-xs tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 space-y-2">
                  <input
                    value={c.title}
                    onChange={(e) => setCriterion(i, "title", e.target.value)}
                    placeholder="Criterion title"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  <textarea
                    value={c.description}
                    onChange={(e) => setCriterion(i, "description", e.target.value)}
                    placeholder="What must be true for this to pass?"
                    rows={2}
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  onClick={() => removeCriterion(i)}
                  aria-label="Remove criterion"
                  className="mt-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {form.acceptanceCriteria.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No criteria. Add at least one.
            </p>
          )}
        </div>
      </div>

      <EditField
        label="Edge cases (one per line)"
        value={form.edgeCases}
        onChange={(v) => setField("edgeCases", v)}
        rows={3}
      />
      <EditField
        label="Success metrics (one per line)"
        value={form.successMetrics}
        onChange={(v) => setField("successMetrics", v)}
        rows={3}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-6">
        <button
          onClick={() => {
            setForm(initial)
            setEditing(false)
            setError(null)
          }}
          disabled={busy !== null}
          className="rounded-md px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
        >
          {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </button>
      </div>
    </div>
  )
}

function EditField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows: number
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-2 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

function ReadOnly({ form, version }: { form: PrdState; version: number }) {
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Problem statement</h2>
          {version > 1 && (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              v{version}
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {form.problemStatement}
        </p>
      </section>

      <RoSection title="Goals" lines={splitLines(form.goals)} />
      <RoSection title="Non-goals" lines={splitLines(form.nonGoals)} />
      <RoSection title="User stories" lines={splitLines(form.userStories)} />

      <section className="border-t border-border pt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Acceptance criteria
        </h2>
        {form.acceptanceCriteria.length === 0 ? (
          <p className="text-sm text-muted-foreground">None specified.</p>
        ) : (
          <ol className="space-y-4">
            {form.acceptanceCriteria.map((c, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{c.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {c.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <RoSection title="Edge cases" lines={splitLines(form.edgeCases)} />
      <RoSection title="Success metrics" lines={splitLines(form.successMetrics)} />
    </div>
  )
}

function RoSection({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">None specified.</p>
      ) : (
        <ul className="space-y-2">
          {lines.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}