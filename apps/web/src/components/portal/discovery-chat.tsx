"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, Loader2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDiscoveryStream } from "@/lib/discovery/use-discovery-stream"
import {
  startDiscoveryRequest,
  generatePrdForRequest,
} from "@/lib/discovery/actions"

type Kind = "BUG" | "FEATURE"
type ScopeStep = "kind" | "severity" | "timeline" | "chatting"

const SEVERITY = [
  { value: 1, label: "Minor" },
  { value: 2, label: "Low" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "High" },
  { value: 5, label: "Service down" },
]

const TIMELINE = [
  { value: 3, label: "Within 3 days" },
  { value: 7, label: "Within a week" },
  { value: 14, label: "Within 2 weeks" },
  { value: 30, label: "Within a month" },
  { value: null, label: "I'm flexible" },
]

function ChipButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
    >
      {children}
    </button>
  )
}

export function DiscoveryChat({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const router = useRouter()

  const [kind, setKind] = React.useState<Kind | null>(null)
  const [severity, setSeverity] = React.useState<number | null>(null)
  const [scopeStep, setScopeStep] = React.useState<ScopeStep>("kind")

  const [frId, setFrId] = React.useState<string | null>(null)
  const [starting, setStarting] = React.useState(false)
  const [startError, setStartError] = React.useState<string | null>(null)

  const [generating, setGenerating] = React.useState(false)
  const [genError, setGenError] = React.useState<string | null>(null)

  const [input, setInput] = React.useState("")

  const stream = useDiscoveryStream({ featureRequestId: frId ?? "" })
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [stream.messages, scopeStep, starting])

  async function beginChat(k: Kind, s: number | null, days: number | null) {
    setScopeStep("chatting")
    setStarting(true)
    setStartError(null)
    const res = await startDiscoveryRequest({
      projectId,
      type: k,
      severity: s,
      requestedDays: days,
    })
    setStarting(false)
    if (res.ok) setFrId(res.data.featureRequestId)
    else setStartError(res.error)
  }

  function onKind(k: Kind) {
    setKind(k)
    setScopeStep(k === "BUG" ? "severity" : "timeline")
  }

  function onSeverity(s: number) {
    setSeverity(s)
    if (s === 5) void beginChat("BUG", 5, null)
    else setScopeStep("timeline")
  }

  function onTimeline(days: number | null) {
    void beginChat(kind ?? "FEATURE", severity, days)
  }

  function submitInput() {
    const text = input.trim()
    if (text.length === 0 || !frId || stream.streaming) return
    setInput("")
    void stream.send(text)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submitInput()
    }
  }

  async function handleGenerate() {
    if (!frId) return
    setGenerating(true)
    setGenError(null)
    const res = await generatePrdForRequest(frId)
    if (res.ok) {
      router.push(`/portal/${projectId}/request/${frId}/review`)
      return
    }
    setGenerating(false)
    setGenError(res.error)
  }

  const greeting =
    kind === "BUG"
      ? `Tell me what's going wrong in ${projectName}. What were you doing, what did you expect, and what happened instead?`
      : `Tell me about the feature you'd like in ${projectName}. What should it let people do, and why does it matter?`

  const hasUserMessage = stream.messages.some((m) => m.role === "user")
  const canGenerate = hasUserMessage && !stream.streaming && !starting && !generating

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          {scopeStep !== "chatting" ? (
            <ScopeSetup
              scopeStep={scopeStep}
              onKind={onKind}
              onSeverity={onSeverity}
              onTimeline={onTimeline}
            />
          ) : (
            <div className="space-y-6">
              <Bubble role="assistant" content={greeting} />
              {starting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up your request…
                </div>
              )}
              {startError && (
                <p className="text-sm text-destructive">{startError}</p>
              )}
              {stream.messages.map((m) => (
                <Bubble key={m.id} role={m.role} content={m.content} />
              ))}
              {stream.error && (
                <p className="text-sm text-destructive">{stream.error}</p>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {scopeStep === "chatting" && frId && (
        <div className="shrink-0 border-t border-border bg-background">
          <div className="mx-auto max-w-2xl px-6 py-4">
            {canGenerate && (
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  When you have explained it, generate a PRD to review.
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Generate my PRD
                </button>
              </div>
            )}
            {genError && <p className="mb-2 text-sm text-destructive">{genError}</p>}
            <div className="flex items-end gap-2 rounded-lg border border-border bg-background p-2 focus-within:border-foreground/30">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={`Describe it in your own words…`}
                disabled={stream.streaming || generating}
                className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent px-2 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />
              <button
                type="button"
                onClick={submitInput}
                disabled={input.trim().length === 0 || stream.streaming || generating}
                aria-label="Send"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground text-background transition-colors hover:bg-foreground/90 disabled:opacity-40"
              >
                {stream.streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScopeSetup({
  scopeStep,
  onKind,
  onSeverity,
  onTimeline,
}: {
  scopeStep: ScopeStep
  onKind: (k: Kind) => void
  onSeverity: (s: number) => void
  onTimeline: (days: number | null) => void
}) {
  return (
    <div className="space-y-6 py-8">
      {scopeStep === "kind" && (
        <div className="space-y-3">
          <p className="text-sm text-foreground">
            What would you like to raise?
          </p>
          <div className="flex flex-wrap gap-2">
            <ChipButton onClick={() => onKind("FEATURE")}>
              A new feature
            </ChipButton>
            <ChipButton onClick={() => onKind("BUG")}>
              Something is broken
            </ChipButton>
          </div>
        </div>
      )}

      {scopeStep === "severity" && (
        <div className="space-y-3">
          <p className="text-sm text-foreground">How severe is it?</p>
          <p className="text-xs text-muted-foreground">
            1 is minor, 5 means the service is down.
          </p>
          <div className="flex flex-wrap gap-2">
            {SEVERITY.map((s) => (
              <ChipButton key={s.value} onClick={() => onSeverity(s.value)}>
                <span className="font-mono tabular-nums">{s.value}</span>
                <span className="ml-1.5 text-muted-foreground">{s.label}</span>
              </ChipButton>
            ))}
          </div>
        </div>
      )}

      {scopeStep === "timeline" && (
        <div className="space-y-3">
          <p className="text-sm text-foreground">When do you need this?</p>
          <div className="flex flex-wrap gap-2">
            {TIMELINE.map((t) => (
              <ChipButton key={t.label} onClick={() => onTimeline(t.value)}>
                {t.label}
              </ChipButton>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Bubble({
  role,
  content,
}: {
  role: "user" | "assistant"
  content: string
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-secondary px-3.5 py-2.5 text-sm text-foreground">
          {content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {content || <span className="text-muted-foreground">…</span>}
      </div>
    </div>
  )
}