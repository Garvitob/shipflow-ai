import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import type { AIProvider } from "./types";

// Single source of truth for the model identifier.
// Your key accesses "5.5" — verify this exact string on the first live call.
// If the call 404s on model, swap to "gpt-5.2" / "gpt-5" and update COST_PER_1M.
export const OPENAI_MODEL = "gpt-5.5" as const;

const openaiClient = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Phase 7 (Anthropic dual-review) plugs in here — one import, zero path changes:
//
// import { createAnthropic } from "@ai-sdk/anthropic";
// export const ANTHROPIC_MODEL = "claude-opus-4-8" as const;
// const anthropicClient = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export function getModel(_provider: AIProvider = "openai") {
  // Phase 7: switch (_provider) { case "anthropic": return anthropicClient(ANTHROPIC_MODEL); }
  return openaiClient(OPENAI_MODEL);
}

// USD per 1M tokens. These feed real cost tracking — set to actual published
// OpenAI pricing for your model before the usage/credits surface goes live.
// Placeholder values below are estimates and MUST be verified.
export const COST_PER_1M: Record<string, { input: number; output: number }> = {
  "gpt-5.5": { input: 1.25, output: 10.0 },
  "gpt-5.2": { input: 1.25, output: 10.0 },
};

export function estimateCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rates = COST_PER_1M[modelId] ?? { input: 0, output: 0 };
  return (
    (promptTokens / 1_000_000) * rates.input +
    (completionTokens / 1_000_000) * rates.output
  );
}