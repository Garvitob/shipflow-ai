import { NextResponse } from "next/server";
import { generateCompletion } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await generateCompletion({
      system: "You are a senior staff engineer. Be concise and precise.",
      prompt:
        "In one sentence, state what a monorepo is and one concrete tradeoff it makes.",
    });
    return NextResponse.json({
      ok: true,
      text: result.text,
      usage: result.usage,
      durationMs: result.durationMs,
    });
  } catch (err) {
    const e = err as { message?: string; code?: string; retryable?: boolean };
    return NextResponse.json(
      {
        ok: false,
        error: e.message ?? String(err),
        code: e.code ?? "UNKNOWN",
        retryable: e.retryable ?? null,
      },
      { status: 500 },
    );
  }
}