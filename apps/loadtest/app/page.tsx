"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ResultStatus = "hit" | "miss" | "error";
type PromptKind = "novel" | "repeat" | "paraphrase";

interface PromptResult {
  id: number;
  kind: PromptKind;
  derivedFrom?: number;
  prompt: string;
  status: ResultStatus;
  durationMs: number;
  score?: number;
  matchCount?: number;
  error?: string;
}

interface RunStats {
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

interface RunState {
  status: "idle" | "running" | "completed" | "stopped";
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
  delayMs: number;
}

interface PlanInfo {
  total: number;
  counts: Record<PromptKind, number>;
}

interface Breakdown {
  kind: PromptKind;
  total: number;
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
  avgMs: number;
}

interface Snapshot {
  state: RunState;
  config: RunnerConfig;
  plan: PlanInfo;
}

const STATUS_COLOR: Record<ResultStatus, string> = {
  hit: "text-emerald-500",
  miss: "text-amber-500",
  error: "text-red-500",
};

const STATUS_BADGE: Record<ResultStatus, string> = {
  hit: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  miss: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  error: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function ms(value: number | null): string {
  if (value === null) return "—";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-[11px] font-medium uppercase tracking-wider text-foreground/40">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent ?? ""}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-foreground/40">{sub}</p>}
    </div>
  );
}

/** Stacked hit/miss/error bar for a breakdown row. */
function RatioBar({
  hits,
  misses,
  errors,
}: {
  hits: number;
  misses: number;
  errors: number;
}) {
  const total = hits + misses + errors;
  if (total === 0) {
    return <div className="h-2.5 w-full rounded-full bg-black/5 dark:bg-white/10" />;
  }
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
      <div
        className="bg-emerald-500"
        style={{ width: `${(hits / total) * 100}%` }}
      />
      <div
        className="bg-amber-500"
        style={{ width: `${(misses / total) * 100}%` }}
      />
      <div
        className="bg-red-500"
        style={{ width: `${(errors / total) * 100}%` }}
      />
    </div>
  );
}

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    try {
      const [stateRes, breakdownRes] = await Promise.all([
        fetch("/api/loadtest", { cache: "no-store" }),
        fetch("/api/loadtest/breakdown", { cache: "no-store" }),
      ]);
      const snapshotData = (await stateRes.json()) as Snapshot;
      const breakdownData = (await breakdownRes.json()) as {
        byKind: Breakdown[];
      };
      setSnapshot(snapshotData);
      setBreakdown(breakdownData.byKind ?? []);
    } catch {
      // Keep last good snapshot on transient poll failure.
    }
  }, []);

  useEffect(() => {
    void poll();
    const timer = setInterval(() => void poll(), 1000);
    return () => clearInterval(timer);
  }, [poll]);

  useEffect(() => {
    if (snapshot?.state.status === "running") {
      tableRef.current?.scrollTo({ top: tableRef.current.scrollHeight });
    }
  }, [snapshot?.state.results.length, snapshot?.state.status]);

  async function act(
    url: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      await poll();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  if (!snapshot) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-foreground/50">
        Loading dashboard…
      </div>
    );
  }

  const { state, config, plan } = snapshot;
  const stats = state.stats;
  const running = state.status === "running";
  const progress = plan.total === 0 ? 0 : stats.total / plan.total;
  const elapsed =
    state.startedAt !== null
      ? (state.finishedAt ?? Date.now()) - state.startedAt
      : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-8">
      {/* Header ---------------------------------------------------------- */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Memora SDK Load Test
          </h1>
          <p className="text-xs text-foreground/50">
            {plan.total} prompts · {plan.counts.novel} novel /{" "}
            {plan.counts.repeat} repeat / {plan.counts.paraphrase} paraphrase ·
            model {config.model}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              running
                ? "bg-blue-500/10 text-blue-500"
                : state.status === "completed"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-black/5 text-foreground/50 dark:bg-white/10"
            }`}
          >
            {running ? "● Running" : state.status}
          </span>
          {running ? (
            <button
              onClick={() => void act("/api/loadtest/control", { action: "stop" })}
              disabled={busy}
              className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => void act("/api/loadtest", { action: "start" })}
              disabled={busy}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-40"
            >
              {stats.total > 0 ? "Run again" : "Start run"}
            </button>
          )}
          <button
            onClick={() => void act("/api/loadtest/control", { action: "reset" })}
            disabled={busy || stats.total === 0}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm transition-opacity hover:bg-black/5 disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"
          >
            Reset
          </button>
        </div>
      </header>

      {actionError && (
        <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}
      {state.error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          Run error: {state.error}
        </p>
      )}

      {/* Progress -------------------------------------------------------- */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="w-20 text-right text-xs tabular-nums text-foreground/50">
          {stats.total}/{plan.total}
        </span>
        {elapsed !== null && (
          <span className="w-16 text-right text-xs tabular-nums text-foreground/50">
            {ms(elapsed)}
          </span>
        )}
      </div>

      {/* Headline stats --------------------------------------------------- */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Cache hit rate"
          value={pct(stats.hitRate)}
          sub={`${stats.hits} hits / ${stats.total} calls`}
          accent="text-emerald-500"
        />
        <StatCard
          label="Misses"
          value={pct(stats.missRate)}
          sub={`${stats.misses} went to Gemini`}
          accent="text-amber-500"
        />
        <StatCard
          label="Errors"
          value={String(stats.errors)}
          sub="failed calls"
          accent={stats.errors > 0 ? "text-red-500" : undefined}
        />
        <StatCard
          label="Avg hit vs miss"
          value={`${ms(stats.avgHitMs)} / ${ms(stats.avgMissMs)}`}
          sub="cache speedup in one glance"
        />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="p95 latency" value={ms(stats.p95Ms)} sub="all calls" />
        <StatCard
          label="Fastest hit"
          value={ms(stats.fastestHitMs)}
          sub="best-case cache read"
        />
        <StatCard
          label="Slowest call"
          value={ms(stats.slowestCallMs)}
          sub="worst-case round trip"
        />
        <StatCard
          label="Threshold / topK"
          value={`${config.scoreThreshold} / ${config.topK}`}
          sub="SDK tuning knobs"
        />
      </section>

      {/* Per-category breakdown ------------------------------------------- */}
      <section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <h2 className="text-sm font-semibold">Breakdown by prompt kind</h2>
        <div className="mt-4 flex flex-col gap-4">
          {breakdown.map((row) => (
            <div key={row.kind}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium capitalize">{row.kind}</span>
                <span className="tabular-nums text-foreground/50">
                  {row.hits} hit · {row.misses} miss · {row.errors} err · avg{" "}
                  {ms(row.avgMs)} ·{" "}
                  <span className="font-medium text-emerald-500">
                    {pct(row.hitRate)} hit rate
                  </span>
                </span>
              </div>
              <div className="mt-1.5">
                <RatioBar
                  hits={row.hits}
                  misses={row.misses}
                  errors={row.errors}
                />
              </div>
              <p className="mt-1 text-[11px] text-foreground/40">
                {row.kind === "novel" &&
                  "First-seen prompts — expected to miss and seed the cache."}
                {row.kind === "repeat" &&
                  "Verbatim copies — should hit once the seed exists."}
                {row.kind === "paraphrase" &&
                  "Reworded duplicates — measures semantic recall vs scoreThreshold."}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Results table ----------------------------------------------------- */}
      <section className="flex min-h-0 flex-col rounded-xl border border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
          <h2 className="text-sm font-semibold">Per-prompt results</h2>
          <span className="text-xs text-foreground/40">
            newest at the bottom
          </span>
        </div>
        <div
          ref={tableRef}
          className="max-h-[28rem] overflow-y-auto divide-y divide-black/5 dark:divide-white/5"
        >
          {state.results.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-foreground/40">
              No results yet — start a run.
            </p>
          )}
          {state.results.map((result) => (
            <div
              key={result.id}
              className="flex items-start gap-3 px-4 py-2.5 text-sm"
            >
              <span className="w-8 shrink-0 text-right tabular-nums text-foreground/30">
                {result.id + 1}
              </span>
              <span
                className={`w-20 shrink-0 rounded-md px-1.5 py-0.5 text-center text-[11px] font-medium uppercase ${STATUS_BADGE[result.status]}`}
              >
                {result.status}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate">{result.prompt}</p>
                {result.error && (
                  <p className="text-xs text-red-500">{result.error}</p>
                )}
              </div>
              <span className="w-12 shrink-0 text-right text-[11px] uppercase text-foreground/40">
                {result.kind.slice(0, 4)}
              </span>
              {result.score !== undefined && (
                <span
                  className={`w-14 shrink-0 text-right text-xs tabular-nums ${STATUS_COLOR[result.status]}`}
                >
                  {result.score.toFixed(3)}
                </span>
              )}
              <span className="w-16 shrink-0 text-right text-xs tabular-nums text-foreground/50">
                {ms(result.durationMs)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <footer className="pb-4 text-center text-[11px] text-foreground/30">
        Env needed: OPEN_AI_KEY, UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN
        (same .env.local as the example app). Tip: run once to seed, run again to
        see the repeat hit rate jump.
      </footer>
    </div>
  );
}
