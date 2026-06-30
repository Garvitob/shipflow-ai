import "server-only";
import { generateText, generateObject, streamText } from "ai";
import type { InferSchema } from "ai";
import type { z } from "zod";
import { getModel, estimateCost, OPENAI_MODEL } from "./provider";
import type {
  CompletionRequest,
  CompletionResult,
  StructuredRequest,
  StructuredResult,
  TokenUsage,
  AIProvider,
  ReasoningEffort,
} from "./types";
import { AIError } from "./types";

const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_OUTPUT_TOKENS = 16_384;
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 3;
const BACKOFF_MS = [1_000, 2_000, 4_000] as const;

function buildUsage(
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  model = OPENAI_MODEL,
): TokenUsage {
  const promptTokens = inputTokens ?? 0;
  const completionTokens = outputTokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCostUsd: estimateCost(model, promptTokens, completionTokens),
  };
}

function providerOpts(effort: ReasoningEffort | undefined) {
  return effort ? { openai: { reasoningEffort: effort } } : undefined;
}

function classifyError(err: unknown): AIError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (
    lower.includes("401") ||
    lower.includes("unauthorized") ||
    lower.includes("api key") ||
    lower.includes("invalid_api_key")
  ) {
    return new AIError(
      "OpenAI authentication failed — check OPENAI_API_KEY",
      "AUTH_FAILED",
      false,
      err,
    );
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("rate_limit")) {
    return new AIError("OpenAI rate limit hit", "RATE_LIMITED", true, err);
  }
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("aborted") ||
    lower.includes("abort")
  ) {
    return new AIError(
      `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
      "TIMEOUT",
      true,
      err,
    );
  }
  if (
    lower.includes("context length") ||
    lower.includes("context_length") ||
    lower.includes("maximum context") ||
    lower.includes("too many tokens")
  ) {
    return new AIError("Input exceeded model context window", "CONTEXT_TOO_LONG", false, err);
  }
  if (lower.includes("503") || lower.includes("overloaded") || lower.includes("service unavailable")) {
    return new AIError("Model unavailable — service overloaded", "MODEL_UNAVAILABLE", true, err);
  }
  return new AIError(`Unexpected AI error: ${msg}`, "UNKNOWN", true, err);
}

async function withRetry<R>(fn: () => Promise<R>, attempt = 0): Promise<R> {
  try {
    return await fn();
  } catch (err) {
    const classified = err instanceof AIError ? err : classifyError(err);
    if (classified.retryable && attempt < MAX_RETRIES - 1) {
      const delay = BACKOFF_MS[attempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
      await new Promise((r) => setTimeout(r, delay));
      return withRetry(fn, attempt + 1);
    }
    throw classified;
  }
}

export async function generateCompletion(
  request: CompletionRequest,
): Promise<CompletionResult> {
  const {
    system,
    prompt,
    temperature = DEFAULT_TEMPERATURE,
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
    provider = "openai" as AIProvider,
    reasoningEffort,
    timeoutMs,
  } = request;

  const model = getModel(provider);
  const start = Date.now();

  const result = await withRetry(async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs ?? REQUEST_TIMEOUT_MS);
    try {
      return await generateText({
        model,
        system,
        prompt,
        temperature,
        maxOutputTokens,
        abortSignal: ac.signal,
        providerOptions: providerOpts(reasoningEffort),
      });
    } finally {
      clearTimeout(timer);
    }
  });

  return {
    text: result.text,
    usage: buildUsage(result.usage.inputTokens, result.usage.outputTokens),
    durationMs: Date.now() - start,
  };
}

export async function generateStructured<S extends z.ZodType>(
  request: StructuredRequest<S>,
): Promise<StructuredResult<InferSchema<S>>> {
  const {
    system,
    prompt,
    schema,
    schemaName,
    schemaDescription,
    temperature = DEFAULT_TEMPERATURE,
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
    provider = "openai" as AIProvider,
    reasoningEffort,
    timeoutMs,
  } = request;

  const model = getModel(provider);
  const start = Date.now();

  const result = await withRetry(async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs ?? REQUEST_TIMEOUT_MS);
    try {
      return await generateObject({
        model,
        output: "object",
        system,
        prompt,
        schema,
        schemaName,
        schemaDescription,
        temperature,
        maxOutputTokens,
        abortSignal: ac.signal,
        providerOptions: providerOpts(reasoningEffort),
      });
    } catch (err) {
      const lower = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (
        lower.includes("could not parse") ||
        lower.includes("no object generated") ||
        lower.includes("schema") ||
        lower.includes("validation")
      ) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new AIError(`Schema validation failed: ${msg}`, "VALIDATION_FAILED", false, err);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  });

  return {
    data: result.object,
    usage: buildUsage(result.usage.inputTokens, result.usage.outputTokens),
    durationMs: Date.now() - start,
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamChatRequest {
  system: string;
  messages: ChatMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  provider?: AIProvider;
  reasoningEffort?: ReasoningEffort;
  timeoutMs?: number;
}

export function streamChat(request: StreamChatRequest) {
  const {
    system,
    messages,
    temperature = DEFAULT_TEMPERATURE,
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
    provider = "openai" as AIProvider,
    reasoningEffort,
    timeoutMs,
  } = request;

  const model = getModel(provider);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs ?? REQUEST_TIMEOUT_MS);
  const clear = () => clearTimeout(timer);

  return streamText({
    model,
    system,
    messages,
    temperature,
    maxOutputTokens,
    maxRetries: MAX_RETRIES,
    abortSignal: ac.signal,
    providerOptions: providerOpts(reasoningEffort),
    onFinish: clear,
    onError: ({ error }) => {
      clear();
      console.error(
        "streamChat error:",
        error instanceof Error ? error.message : String(error),
      );
    },
  });
}