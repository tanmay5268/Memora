import { getRunState } from "../_runner/runner";
import { TEST_PROMPTS, PROMPT_COUNTS, type PromptKind } from "../_runner/prompts";

export interface KindBreakdown {
  kind: PromptKind;
  total: number;
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
  avgMs: number;
}

/**
 * Per-category breakdown: does the cache hit exact repeats but miss
 * paraphrases? This endpoint answers that.
 */
export async function GET() {
  const { results } = getRunState();
  const kinds: PromptKind[] = ["novel", "repeat", "paraphrase"];

  const byKind: KindBreakdown[] = kinds.map((kind) => {
    const subset = results.filter((r) => r.kind === kind);
    const hits = subset.filter((r) => r.status === "hit").length;
    const misses = subset.filter((r) => r.status === "miss").length;
    const errors = subset.filter((r) => r.status === "error").length;
    const durations = subset
      .filter((r) => r.status !== "error")
      .map((r) => r.durationMs);
    const avgMs =
      durations.length === 0
        ? 0
        : Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    return {
      kind,
      total: PROMPT_COUNTS[kind],
      hits,
      misses,
      errors,
      hitRate: subset.length === 0 ? 0 : hits / subset.length,
      avgMs,
    };
  });

  return Response.json({
    byKind,
    expectedTotal: TEST_PROMPTS.length,
    observedTotal: results.length,
  });
}
