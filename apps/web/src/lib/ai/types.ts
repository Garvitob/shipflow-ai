import type { z } from "zod";

export type AIProvider = "openai" | "anthropic";

export type ReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export interface CompletionRequest {
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  provider?: AIProvider;
  reasoningEffort?: ReasoningEffort;
  timeoutMs?: number;
}

export interface CompletionResult {
  text: string;
  usage: TokenUsage;
  durationMs: number;
}

export interface StructuredRequest<S extends z.ZodType> extends CompletionRequest {
  schema: S;
  schemaName: string;
  schemaDescription?: string;
}

export interface StructuredResult<T> {
  data: T;
  usage: TokenUsage;
  durationMs: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIError";
  }
}

export type AIErrorCode =
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "VALIDATION_FAILED"
  | "CONTEXT_TOO_LONG"
  | "MODEL_UNAVAILABLE"
  | "UNKNOWN";