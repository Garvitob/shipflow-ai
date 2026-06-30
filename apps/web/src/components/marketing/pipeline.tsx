"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

type Stage = {
  name: string
  idle: string
  active: string
  done: string
}

const STAGES: Stage[] = [
  { name: "Request", idle: "INTAKE", active: "RECEIVING", done: "TICKETED" },
  { name: "AI discovery", idle: "QUEUED", active: "ANALYZING…", done: "SCOPED" },
  { name: "PRD + criteria", idle: "QUEUED", active: "DRAFTING…", done: "PRD DRAFTED" },
  { name: "Task breakdown", idle: "QUEUED", active: "DECOMPOSING…", done: "TASKS CREATED" },
  { name: "Developer PR", idle: "QUEUED", active: "BUILDING…", done: "PR OPENED" },
  { name: "Dual-AI review", idle: "QUEUED", active: "REVIEWING DIFF…", done: "2 FINDINGS" },
  { name: "Approve & ship", idle: "QUEUED", active: "APPROVING…", done: "SHIPPED" },
]

const N = STAGES.length
const TICK_MS = 1500
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type NodeState = "todo" | "active" | "done"

function stateFor(i: number, active: number, reduce: boolean): NodeState {
  if (reduce) return "done"
  if (i < active) return "done"
  if (i === active) return "active"
  return "todo"
}

function StatusLabel({ stage, state }: { stage: Stage; state: NodeState }) {
  if (state === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent">
        <motion.span
          className="block h-1.5 w-1.5 rounded-full bg-accent"
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
        {stage.active}
      </span>
    )
  }
  if (state === "done") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/70">
        {stage.done}
      </span>
    )
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50">
      {stage.idle}
    </span>
  )
}

function Node({ index, state }: { index: number; state: NodeState }) {
  return (
    <motion.div
      animate={{ scale: state === "active" ? 1.08 : 1 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={cn(
        "relative z-10 flex h-9 w-9 items-center justify-center rounded-md border font-mono text-[11px] transition-colors duration-300",
        state === "done" && "border-foreground bg-foreground text-background",
        state === "active" && "border-accent bg-accent text-accent-foreground",
        state === "todo" && "border-border bg-card text-muted-foreground"
      )}
    >
      {String(index + 1).padStart(2, "0")}
    </motion.div>
  )
}

export function Pipeline() {
  const reduce = useReducedMotion()
  const [step, setStep] = React.useState(0)

  React.useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setStep((s) => s + 1), TICK_MS)
    return () => clearInterval(id)
  }, [reduce])

  const active = reduce ? N - 1 : step % N
  const cycle = Math.floor(step / N)
  const pct = reduce ? 100 : (active / (N - 1)) * 100
  const inset = 100 / (2 * N) // half a column → rail starts at first node center

  return (
    <div>
      {/* ── Status bar caption ───────────────────────────── */}
      <div className="mb-8 flex items-center justify-between border-b border-border pb-3">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 rounded-full bg-accent" />
            {!reduce ? (
              <motion.span
                className="absolute inline-flex h-2 w-2 rounded-full bg-accent"
                animate={{ opacity: [0.6, 0, 0.6], scale: [1, 2.2, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            ) : null}
          </span>
          delivery pipeline
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {reduce ? "shipped" : `run #${1042 + cycle}`}
        </span>
      </div>

      {/* ── Desktop: horizontal track ────────────────────── */}
      <div className="relative hidden md:block">
        {/* rail layer */}
        <div
          className="pointer-events-none absolute"
          style={{ left: `${inset}%`, right: `${inset}%`, top: 18 }}
        >
          <div className="absolute left-0 right-0 top-0 h-px -translate-y-1/2 bg-border" />
          <motion.div
            className="absolute left-0 top-0 h-px -translate-y-1/2 bg-accent"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: EASE }}
          />
          {!reduce ? (
            <motion.div
              key={cycle}
              className="absolute top-0 z-[5] -translate-x-1/2 -translate-y-1/2"
              initial={{ left: "0%", opacity: 0 }}
              animate={{ left: `${pct}%`, opacity: 1 }}
              transition={{
                left: { duration: 0.7, ease: EASE },
                opacity: { duration: 0.3 },
              }}
            >
              <span className="block h-2.5 w-2.5 rotate-45 rounded-[2px] bg-accent" />
            </motion.div>
          ) : null}
        </div>

        {/* nodes + labels */}
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
          {STAGES.map((stage, i) => {
            const state = stateFor(i, active, !!reduce)
            return (
              <div key={stage.name} className="flex flex-col items-center px-1 text-center">
                <Node index={i} state={state} />
                <div
                  className={cn(
                    "mt-3 text-xs font-medium transition-colors duration-300",
                    state === "todo" ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {stage.name}
                </div>
                <div className="mt-1.5 h-3.5">
                  <StatusLabel stage={stage} state={state} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Mobile: vertical track ───────────────────────── */}
      <div className="relative md:hidden">
        {/* rail layer */}
        <div
          className="pointer-events-none absolute"
          style={{ left: 18, top: 18, bottom: 18 }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-px -translate-x-1/2 bg-border" />
          <motion.div
            className="absolute left-0 top-0 w-px -translate-x-1/2 bg-accent"
            initial={false}
            animate={{ height: `${pct}%` }}
            transition={{ duration: 0.7, ease: EASE }}
          />
          {!reduce ? (
            <motion.div
              key={cycle}
              className="absolute left-0 z-[5] -translate-x-1/2 -translate-y-1/2"
              initial={{ top: "0%", opacity: 0 }}
              animate={{ top: `${pct}%`, opacity: 1 }}
              transition={{
                top: { duration: 0.7, ease: EASE },
                opacity: { duration: 0.3 },
              }}
            >
              <span className="block h-2.5 w-2.5 rotate-45 rounded-[2px] bg-accent" />
            </motion.div>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          {STAGES.map((stage, i) => {
            const state = stateFor(i, active, !!reduce)
            return (
              <div key={stage.name} className="flex items-center gap-4">
                <Node index={i} state={state} />
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      state === "todo" ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {stage.name}
                  </span>
                  <span className="mt-0.5">
                    <StatusLabel stage={stage} state={state} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
