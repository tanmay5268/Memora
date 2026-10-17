import { Index } from "@upstash/vector";
import { MemoraSdk } from "@workspace/memorasdk/core/main";
import { TEST_PROMPTS, type PromptKind } from "./prompts";

export type RunStatus = "idle" | "running" | "completed" | "stopped";

export type ResultStatus = "hit" | "miss" | "error";

export interface PromptResult {
  id: number;
  kind: PromptKind;
  derivedFrom?: number;
  prompt: string;
  status: ResultStatus;
  /** Wall-clock time of the whole SDK chat() call. */
  durationMs: number;
  /** Best cosine similarity score returned by the vector lookup. */
  score?: number;
  /** Vector-store matches returned (hits only). */
  matchCount?: number;
  error?: string;
  at: number;
}

export interface RunStats {
  total: number;
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
  missRate: number;
  avgHitMs: number;
  avgMissMs: number;
  p95Ms: number;
  fastestHitMs: number | null;
  slowestCallMs: number | null;
}

export interface RunState {
  status: RunStatus;
  runId: number;
  startedAt: number | null;
  finishedAt: number | null;
  results: PromptResult[];
  stats: RunStats;
  error?: string;
}

interface RunnerConfig {
  model: string;
  topK: number;
  scoreThreshold: number;
  /** Delay between prompts so we don't hammer the Gemini / Upstash APIs. */
  delayMs: number;
}

const DEFAULT_CONFIG: RunnerConfig = {
  model: "gemini-3.5-flash-lite",
  topK: 2,
  scoreThreshold: 0.7,
  delayMs: 150,
};

// ---------------------------------------------------------------------------
// Module-level singleton: survives route-handler reloads within one server
// process, which is exactly what a dev-side load tester needs.
// ---------------------------------------------------------------------------

const globalForRunner = globalThis as unknown as {
  __memoraLoadtestRunner?: RunnerState;
};

interface RunnerState {
  status: RunStatus;
  runId: number;
  startedAt: number | null;
  finishedAt: number | null;
  results: PromptResult[];
  config: RunnerConfig;
  abort: AbortController | null;
  error?: string;
}

function state(): RunnerState {
  if (!globalForRunner.__memoraLoadtestRunner) {
    globalForRunner.__memoraLoadtestRunner = {
      status: "idle",
      runId: 0,
      startedAt: null,
      finishedAt: null,
      results: [],
      config: { ...DEFAULT_CONFIG },
      abort: null,
    };
  }
  return globalForRunner.__memoraLoadtestRunner;
}

function createSdk(config: RunnerConfig): MemoraSdk {
  const openAIKey = process.env.OPEN_AI_KEY;
  if (!openAIKey) throw new Error("OPEN_AI_KEY is not set");

  const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL;
  const vectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!vectorUrl || !vectorToken) {
    throw new Error(
      "UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN are required",
    );
  }

  return new MemoraSdk({
    openAIKey,
    VectorInstance: new Index({ url: vectorUrl, token: vectorToken }),
    scoreThreshold: config.scoreThreshold,
    topK: config.topK,
  });
}

/**
 * The SDK's return type is a union: an array of vector matches means the
 * cache answered (hit); a plain string means Gemini answered and the result
 * was upserted (miss). Anything else is treated as an error.
 */
function classify(answer: unknown): {
  status: ResultStatus;
  score?: number;
  matchCount?: number;
} {
  if (Array.isArray(answer) && answer.length > 0) {
    const scores = answer
      .map((match) => (match as { score?: unknown }).score)
      .filter((score): score is number => typeof score === "number");
    return {
      status: "hit",
      score: scores.length > 0 ? Math.max(...scores) : undefined,
      matchCount: answer.length,
    };
  }
  if (typeof answer === "string") {
    return { status: "miss" };
  }
  throw new Error(`Unexpected SDK return: ${JSON.stringify(answer).slice(0, 120)}`);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, index)];
}

function buildStats(results: PromptResult[]): RunStats {
  const hits = results.filter((r) => r.status === "hit");
  const misses = results.filter((r) => r.status === "miss");
  const errors = results.filter((r) => r.status === "error");
  const hitDurations = hits.map((r) => r.durationMs);
  const allDurations = results
    .filter((r) => r.status !== "error")
    .map((r) => r.durationMs);

  const total = results.length;
  const avg = (xs: number[]) =>
    xs.length === 0 ? 0 : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

  return {
    total,
    hits: hits.length,
    misses: misses.length,
    errors: errors.length,
    hitRate: total === 0 ? 0 : hits.length / total,
    missRate: total === 0 ? 0 : misses.length / total,
    avgHitMs: avg(hitDurations),
    avgMissMs: avg(misses.map((r) => r.durationMs)),
    p95Ms: percentile(allDurations, 95),
    fastestHitMs: hitDurations.length ? Math.min(...hitDurations) : null,
    slowestCallMs: allDurations.length ? Math.max(...allDurations) : null,
  };
}

export function getRunState(): RunState {
  const s = state();
  return {
    status: s.status,
    runId: s.runId,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
    results: s.results,
    stats: buildStats(s.results),
    error: s.error,
  };
}

export function getConfig(): RunnerConfig {
  return state().config;
}

export function updateConfig(patch: Partial<RunnerConfig>): RunnerConfig {
  const s = state();
  if (s.status === "running") {
    throw new Error("Cannot change config while a run is in progress");
  }
  if (patch.model !== undefined) s.config.model = patch.model;
  if (patch.topK !== undefined) s.config.topK = patch.topK;
  if (patch.scoreThreshold !== undefined) {
    s.config.scoreThreshold = patch.scoreThreshold;
  }
  if (patch.delayMs !== undefined) s.config.delayMs = patch.delayMs;
  return { ...s.config };
}

export function resetRun(): void {
  const s = state();
  if (s.status === "running") {
    throw new Error("Stop the current run before resetting");
  }
  s.results = [];
  s.status = "idle";
  s.startedAt = null;
  s.finishedAt = null;
  s.error = undefined;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLoop(s: RunnerState): Promise<void> {
  const sdk = createSdk(s.config);
  const abort = s.abort!;

  for (const prompt of TEST_PROMPTS) {
    if (abort.signal.aborted) {
      s.status = "stopped";
      s.finishedAt = Date.now();
      return;
    }

    const startedAt = Date.now();
    try {
      const answer = await sdk.chat({
        prompt: prompt.text,
        model: s.config.model,
      });
      const { status, score, matchCount } = classify(answer);
      s.results.push({
        id: prompt.id,
        kind: prompt.kind,
        derivedFrom: prompt.derivedFrom,
        prompt: prompt.text,
        status,
        durationMs: Date.now() - startedAt,
        score,
        matchCount,
        at: Date.now(),
      });
    } catch (error) {
      s.results.push({
        id: prompt.id,
        kind: prompt.kind,
        derivedFrom: prompt.derivedFrom,
        prompt: prompt.text,
        status: "error",
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
        at: Date.now(),
      });
    }

    await sleep(s.config.delayMs);
  }

  s.status = "completed";
  s.finishedAt = Date.now();
}

export function startRun(): RunState {
  const s = state();
  if (s.status === "running") throw new Error("A run is already in progress");
  if (!process.env.OPEN_AI_KEY) throw new Error("OPEN_AI_KEY is not set");
  if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
    throw new Error("Upstash Vector credentials are not set");
  }

  s.runId += 1;
  s.results = [];
  s.status = "running";
  s.startedAt = Date.now();
  s.finishedAt = null;
  s.error = undefined;
  s.abort = new AbortController();

  // Fire and forget — progress is polled through getRunState().
  void runLoop(s).catch((error) => {
    s.status = "stopped";
    s.finishedAt = Date.now();
    s.error = error instanceof Error ? error.message : String(error);
  });

  return getRunState();
}

export function stopRun(): RunState {
  const s = state();
  if (s.status !== "running") return getRunState();
  s.abort?.abort();
  return getRunState();
}
