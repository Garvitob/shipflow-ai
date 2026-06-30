"use client"

import * as React from "react"

export type ChatTurn = {
  id: string
  role: "user" | "assistant"
  content: string
}

type Options = {
  featureRequestId: string
  initialMessages?: ChatTurn[]
}

let turnCounter = 0
function nextId(): string {
  turnCounter += 1
  return `turn_${Date.now()}_${turnCounter}`
}

export function useDiscoveryStream({ featureRequestId, initialMessages = [] }: Options) {
  const [messages, setMessages] = React.useState<ChatTurn[]>(initialMessages)
  const [streaming, setStreaming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (trimmed.length === 0 || streaming) return

      setError(null)
      const userTurn: ChatTurn = { id: nextId(), role: "user", content: trimmed }
      const assistantId = nextId()
      setMessages((prev) => [
        ...prev,
        userTurn,
        { id: assistantId, role: "assistant", content: "" },
      ])
      setStreaming(true)

      try {
        const res = await fetch("/api/portal/discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ featureRequestId, message: trimmed }),
        })

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "")
          throw new Error(detail || "The request could not be completed.")
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ""

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
          )
        }

        if (acc.trim().length === 0) {
          throw new Error("No response was generated. Please try again.")
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        setError(message)
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      } finally {
        setStreaming(false)
      }
    },
    [featureRequestId, streaming],
  )

  return { messages, streaming, error, send }
}