"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Icon } from "@/app/components/Icon"
import { orpc, safe } from "@/lib/orpc"
import { cn } from "@workspace/ui/lib/utils"

const PKG_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const
type PkgManager = (typeof PKG_MANAGERS)[number]

const INSTALL_COMMANDS: Record<PkgManager, string> = {
  npm: "npm install memorasdk @upstash/vector",
  pnpm: "pnpm add memorasdk @upstash/vector",
  yarn: "yarn add memorasdk @upstash/vector",
  bun: "bun add memorasdk @upstash/vector",
}

const SNIPPET = `import { MemoraSdk } from "memorasdk";
import { Index } from "@upstash/vector";

const memora = new MemoraSdk({
  openAIKey: process.env.GEMINI_API_KEY!,
  VectorInstance: new Index({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  scoreThreshold: 0.88,  // cosine cutoff, 0–1
  topK: 10,
});

// Cache hit returns matching entries; miss falls through to Gemini.
const hits = await memora.chat({
  prompt: userPrompt,
  model: "gemini-2.5-flash",
});`

const LOOKUP_STEPS = [
  {
    from: '[Prompt: "Summarize…"]',
    arrow: "→",
    to: "Vector index query",
    tone: "text-secondary bg-surface-container px-1 rounded",
  },
  {
    from: "topK nearest neighbours",
    arrow: "→",
    to: "score > 0.88",
    tone: "text-primary font-semibold",
  },
  {
    from: "hit → return match",
    arrow: "→",
    to: "miss → call Gemini",
    tone: "text-secondary font-bold text-xs",
  },
] as const

function CopyButton({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timeout.current), [])

  return (
    <button
      className={cn(
        "flex items-center gap-1 text-outline hover:text-primary transition-colors shrink-0",
        className,
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          clearTimeout(timeout.current)
          timeout.current = setTimeout(() => setCopied(false), 1800)
        } catch {
          /* clipboard blocked — leave the label alone */
        }
      }}
      type="button"
    >
      <Icon
        className={cn("text-base", copied && "text-primary")}
        name={copied ? "check" : "content_copy"}
      />
      <span className="font-label-sm text-label-sm uppercase">
        {copied ? "Copied" : children}
      </span>
    </button>
  )
}

/** Real RPC round-trip against the app's own health procedure. */
function useProbe() {
  const [state, setState] = useState<
    | { phase: "idle" }
    | { phase: "running" }
    | {
        phase: "done"
        rttMs: number
        region: string
        node: string | null
        uptimeSeconds: number
        ok: boolean
      }
  >({ phase: "idle" })

  const probe = useCallback(async () => {
    setState({ phase: "running" })
    const started = performance.now()
    const [error, data] = await safe(orpc.health.check())
    const rttMs = Math.round(performance.now() - started)

    if (error || !data) {
      setState({
        phase: "done",
        rttMs,
        region: "unreachable",
        node: null,
        uptimeSeconds: 0,
        ok: false,
      })
      return
    }

    setState({
      phase: "done",
      rttMs,
      region: data.region,
      node: data.node,
      uptimeSeconds: data.uptimeSeconds,
      ok: true,
    })
  }, [])

  return { state, probe }
}

export function GetStarted() {
  const [pkg, setPkg] = useState<PkgManager>("npm")
  const [tab, setTab] = useState<"pipeline" | "config">("pipeline")
  const pkgRefs = useRef<(HTMLButtonElement | null)[]>([])
  const { state, probe } = useProbe()

  const configSnippet = `{
  "upstash": {
    "url": "${process.env.NEXT_PUBLIC_UPSTASH_URL ?? "$UPSTASH_REDIS_REST_URL"}",
    "token": "$UPSTASH_REDIS_REST_TOKEN"
  },
  "gemini": {
    "apiKey": "$GEMINI_API_KEY"
  },
  "similarity": {
    "scoreThreshold": 0.88,
    "topK": 10
  }
}`

  return (
    <>
      {/* Macro header */}
      <div className="flex flex-col gap-space-sm mb-space-xl">
        <div className="flex flex-wrap items-center gap-space-sm">
          <span className="px-2 py-0.5 rounded-lg bg-surface-container font-code-sm text-code-sm text-primary uppercase tracking-wider">
            GUIDE_VERSION::v0.1.0
          </span>
          <span className="w-1 h-1 rounded-full bg-outline" />
          <span className="font-code-sm text-code-sm text-outline">
            ESTIMATED_SETUP_RTT: 90_SECONDS
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div>
            <h1 className="font-display text-display text-on-surface tracking-tight">
              Quickstart: semantic caching in 90 seconds
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mt-1">
              Wrap any Gemini pipeline with a vector-backed cache. Matching
              prompts return instantly instead of paying for another
              generation.
            </p>
          </div>
          <div className="flex items-center gap-space-xs shrink-0 bg-surface-container p-1 rounded-lg border border-surface-container-high">
            <div className="px-space-sm py-1 rounded bg-surface-container-high text-center">
              <div className="font-label-sm text-label-sm text-outline uppercase">
                Threshold
              </div>
              <div className="font-headline-sm text-headline-sm text-primary font-mono">
                0.88
              </div>
            </div>
            <div className="px-space-sm py-1 rounded bg-surface-container-high text-center">
              <div className="font-label-sm text-label-sm text-outline uppercase">
                Top K
              </div>
              <div className="font-headline-sm text-headline-sm text-on-surface font-mono">
                10
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mb-space-xl">
        {/* Steps 1 & 2 */}
        <div className="lg:col-span-5 flex flex-col gap-gutter">
          <section className="bg-surface-container rounded-xl p-space-lg flex flex-col gap-space-md shadow-sm">
            <div className="flex items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm min-w-0">
                <span className="w-6 h-6 rounded bg-primary-container text-on-primary-container font-code-sm text-code-sm font-bold flex items-center justify-center shrink-0">
                  01
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Install dependencies
                </span>
              </div>
              <span className="font-code-sm text-code-sm text-outline shrink-0">
                Node 18+
              </span>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Install the client engine alongside your provider SDK. The vector
              index query runs in-process before any model call is attempted.
            </p>

            <div className="flex flex-col bg-surface-container-lowest rounded-lg overflow-hidden border border-surface-container-high">
              <div
                aria-label="Package manager"
                className="flex items-center bg-surface-container-high px-space-xs pt-space-xs gap-1"
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
                    return
                  event.preventDefault()
                  const current = PKG_MANAGERS.indexOf(pkg)
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? PKG_MANAGERS.length - 1
                        : (current + (event.key === "ArrowRight" ? 1 : -1) +
                            PKG_MANAGERS.length) %
                          PKG_MANAGERS.length
                  setPkg(PKG_MANAGERS[next]!)
                  pkgRefs.current[next]?.focus()
                }}
                role="tablist"
              >
                {PKG_MANAGERS.map((manager, index) => (
                  <button
                    aria-selected={pkg === manager}
                    className={cn(
                      "px-space-sm py-1 rounded-t text-label-sm font-label-sm font-medium transition-colors",
                      pkg === manager
                        ? "bg-surface-container-lowest text-primary"
                        : "text-outline hover:text-on-surface",
                    )}
                    key={manager}
                    onClick={() => setPkg(manager)}
                    ref={(node) => {
                      pkgRefs.current[index] = node
                    }}
                    role="tab"
                    tabIndex={pkg === manager ? 0 : -1}
                    type="button"
                  >
                    {manager}
                  </button>
                ))}
              </div>
              <div className="p-space-md flex items-center justify-between gap-space-sm">
                <div className="flex items-start gap-space-sm min-w-0">
                  <span className="text-primary select-none">$</span>
                  <code className="text-on-surface font-mono break-all">
                    {INSTALL_COMMANDS[pkg]}
                  </code>
                </div>
                <CopyButton value={INSTALL_COMMANDS[pkg]}>
                  Copy
                </CopyButton>
              </div>
            </div>

            <div className="flex items-center gap-space-xs text-outline font-code-sm text-code-sm">
              <Icon className="text-sm text-secondary" name="verified_user" />
              <span>Pure ESM. No native hooks, no build step.</span>
            </div>
          </section>

          <section className="bg-surface-container rounded-xl p-space-lg flex flex-col gap-space-md shadow-sm">
            <div className="flex items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm min-w-0">
                <span className="w-6 h-6 rounded bg-surface-container-highest text-on-surface font-code-sm text-code-sm font-bold flex items-center justify-center shrink-0">
                  02
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  How a lookup resolves
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-label-sm font-label-sm text-outline shrink-0">
                Request path
              </span>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Every call queries the vector index first. Prompts scoring above
              the threshold return their stored answer; anything else falls
              through to the model and is written back for next time.
            </p>

            <div className="bg-surface-container-lowest p-space-md rounded-lg flex flex-col gap-space-sm font-mono text-code-sm border border-surface-container-high">
              <div className="flex items-center justify-between text-outline text-label-sm font-label-sm uppercase tracking-wider pb-1">
                <span>Prompt</span>
                <span className="text-primary-container">Vector index</span>
                <span>Outcome</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded flex flex-col gap-2">
                {LOOKUP_STEPS.map((step) => (
                  <div
                    className="flex items-center justify-between gap-2"
                    key={step.from}
                  >
                    <span className="text-on-surface-variant truncate">
                      {step.from}
                    </span>
                    <Icon className="text-xs text-outline" name="trending_flat" />
                    <span className={step.tone}>{step.to}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-space-xs pt-1">
              <div className="bg-surface-container-low p-space-sm rounded">
                <div className="text-label-sm font-label-sm text-outline">
                  THRESHOLD
                </div>
                <div className="font-code-md text-code-md text-on-surface font-semibold">
                  0.88 cosine
                </div>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded">
                <div className="text-label-sm font-label-sm text-outline">
                  NEIGHBOURS
                </div>
                <div className="font-code-md text-code-md text-on-surface font-semibold">
                  topK = 10
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Step 3 — editor */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-surface-container rounded-xl flex flex-col h-full shadow-md overflow-hidden border border-surface-container-high">
            <div className="bg-surface-container-high px-space-md py-2.5 flex items-center justify-between gap-space-sm select-none border-b border-surface-container-high">
              <div
                aria-label="Example file"
                className="flex items-center gap-space-sm min-w-0"
                role="tablist"
              >
                <button
                  aria-selected={tab === "pipeline"}
                  className={cn(
                    "flex items-center gap-1.5 px-space-sm py-1 rounded font-code-sm text-code-sm transition-colors shrink-0",
                    tab === "pipeline"
                      ? "bg-surface-container text-primary"
                      : "text-outline hover:text-on-surface",
                  )}
                  onClick={() => setTab("pipeline")}
                  role="tab"
                  tabIndex={tab === "pipeline" ? 0 : -1}
                  type="button"
                >
                  <Icon className="text-xs" name="terminal" />
                  <span>pipeline.ts</span>
                </button>
                <button
                  aria-selected={tab === "config"}
                  className={cn(
                    "font-code-sm text-code-sm transition-colors truncate",
                    tab === "config"
                      ? "text-primary"
                      : "text-outline hover:text-on-surface",
                  )}
                  onClick={() => setTab("config")}
                  role="tab"
                  tabIndex={tab === "config" ? 0 : -1}
                  type="button"
                >
                  memora.config.json
                </button>
              </div>
              <div className="flex items-center gap-space-sm shrink-0">
                <span className="hidden sm:block px-2 py-0.5 rounded bg-surface-container-low font-code-sm text-code-sm text-outline">
                  TypeScript
                </span>
                <CopyButton value={tab === "config" ? configSnippet : SNIPPET}>
                  Copy code
                </CopyButton>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-space-md font-code-sm text-code-sm flex-1 overflow-x-auto relative leading-relaxed">
              <pre className="text-on-surface font-mono">
                <code>
                  {tab === "config" ? configSnippet : SNIPPET}
                </code>
              </pre>
            </div>

            <div className="bg-surface-container-high px-space-md py-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm text-code-sm font-code-sm border-t border-surface-container-high">
              <div className="flex items-center gap-space-sm">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="text-on-surface-variant">
                  Pipeline status:{" "}
                  <span className="text-on-surface">Engine ready</span>
                </span>
              </div>
              <div className="flex items-center gap-space-md text-outline">
                <span>Store: Upstash Vector</span>
                <span>Sim: cosine</span>
                <span className="text-primary">memorasdk 0.1.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edge probe */}
      <section className="bg-surface-container rounded-xl p-space-lg flex flex-col gap-space-md shadow-sm border border-surface-container-high">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
              <Icon className="text-lg" name="network_check" />
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                Edge gateway probe
              </h2>
              <span className="font-body-sm text-body-sm text-outline">
                Round-trip measurement against your deployed edge
              </span>
            </div>
          </div>

          <button
            className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary-container hover:bg-secondary-container transition-all flex items-center gap-2 font-label-md text-label-md font-semibold cursor-pointer active:scale-95 shadow-sm disabled:opacity-70"
            disabled={state.phase === "running"}
            onClick={() => void probe()}
            type="button"
          >
            <Icon
              className={cn("text-base", state.phase === "running" && "animate-spin")}
              name={state.phase === "running" ? "sync" : "send"}
            />
            <span>
              {state.phase === "running"
                ? "Probing…"
                : state.phase === "done"
                  ? state.ok
                    ? "Handshake 200 OK"
                    : "Handshake failed"
                  : "Send test handshake"}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm">
          <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between gap-1">
            <span className="font-label-sm text-label-sm text-outline uppercase">
              Target ingress
            </span>
            <div className="font-code-sm text-code-sm text-on-surface font-mono truncate">
              /api/rpc/health/check
            </div>
            <span className="text-label-sm font-label-sm text-outline">
              POST · health.check
            </span>
          </div>

          <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between gap-1">
            <span className="font-label-sm text-label-sm text-outline uppercase">
              RTT roundtrip
            </span>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "font-headline-lg text-headline-lg font-mono",
                  state.phase === "done" && !state.ok ? "text-error" : "text-secondary",
                )}
              >
                {state.phase === "done" ? state.rttMs : "--"}
              </span>
              <span className="font-code-sm text-code-sm text-secondary">ms</span>
            </div>
            <span className="text-label-sm font-label-sm text-on-surface-variant font-mono truncate">
              {state.phase === "done" ? state.region : "awaiting probe"}
            </span>
          </div>

          <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between gap-1">
            <span className="font-label-sm text-label-sm text-outline uppercase">
              Node
            </span>
            <div className="font-code-md text-code-md text-primary font-mono truncate">
              {state.phase === "done" ? (state.node ?? "self-hosted") : "--"}
            </div>
            <span className="text-label-sm font-label-sm text-outline">
              {state.phase === "done"
                ? `up ${Math.floor(state.uptimeSeconds / 60)}m`
                : "—"}
            </span>
          </div>

          <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between gap-1">
            <span className="font-label-sm text-label-sm text-outline uppercase">
              Result
            </span>
            <div className="font-code-md text-code-md text-on-surface flex items-center gap-1.5 font-mono">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  state.phase === "done"
                    ? state.ok
                      ? "bg-secondary"
                      : "bg-error"
                    : "bg-surface-container-highest",
                )}
              />
              <span>
                {state.phase === "idle"
                  ? "NOT RUN"
                  : state.phase === "running"
                    ? "IN FLIGHT"
                    : state.ok
                      ? "200 OK"
                      : "ERROR"}
              </span>
            </div>
            <span className="text-label-sm font-label-sm text-outline">
              measured in-browser
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-space-xs text-body-sm font-body-sm text-outline border-t border-surface-container-high pt-space-sm">
          <div className="flex items-center gap-space-md">
            <a
              className="hover:text-primary transition-colors flex items-center gap-1 font-label-sm text-label-sm uppercase"
              href="https://github.com/tanmay5268/Memora"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon className="text-sm" name="code" />
              <span>Source on GitHub</span>
            </a>
            <span className="text-surface-container-highest">/</span>
            <a
              className="hover:text-primary transition-colors flex items-center gap-1 font-label-sm text-label-sm uppercase"
              href="https://github.com/tanmay5268/Memora/blob/main/packages/memorasdk/README.md"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon className="text-sm" name="schema" />
              <span>SDK reference</span>
            </a>
            <span className="text-surface-container-highest">/</span>
            <a
              className="hover:text-primary transition-colors flex items-center gap-1 font-label-sm text-label-sm uppercase"
              href="https://github.com/tanmay5268/Memora/issues"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon className="text-sm" name="forum" />
              <span>Report an issue</span>
            </a>
          </div>
          <div className="font-code-sm text-code-sm text-outline">
            PACKAGE: memorasdk
          </div>
        </div>
      </section>
    </>
  )
}