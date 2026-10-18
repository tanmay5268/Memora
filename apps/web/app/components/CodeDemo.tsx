"use client"

import { useEffect, useRef, useState } from "react"

import { Icon } from "./Icon"
import { cn } from "@workspace/ui/lib/utils"

/** Plain-text version handed to the clipboard. */
const CODE_SNIPPET = `import { MemoraClient } from 'memora-sdk';

const memora = new MemoraClient({
  apiKey: process.env.MEMORA_KEY,
  threshold: 0.88,
});

const response = await memora.chat({
  model: 'gemini-2.5-flash',
  prompt: agentInputPayload,
});

console.log(response.metadata.cacheHit); // true (18.4ms)`

const telemetryScenarios = [
  {
    name: "Support Bot",
    query: '"summarize user support chat #4092"',
    hit: "HIT (0.94)",
    sha: "7f83b1657ff1...",
    tokens: "4,120 prompt tokens",
    rawLatency: "1,420 ms",
    rawWidth: "96%",
    cachedLatency: "18.4 ms (-98.7%)",
    cachedWidth: "12%",
    intercept: "⚡ Cache Intercept: 18.2ms",
  },
  {
    name: "Code Eval",
    query: '"verify test suite AST constraints against v2"',
    hit: "HIT (0.91)",
    sha: "9c31b818a4d2...",
    tokens: "8,450 prompt tokens",
    rawLatency: "2,640 ms",
    rawWidth: "98%",
    cachedLatency: "21.1 ms (-99.2%)",
    cachedWidth: "14%",
    intercept: "⚡ Cache Intercept: 21.1ms",
  },
  {
    name: "Agent Loop",
    query: '"parse schema toolcall argument json #iter_4"',
    hit: "HIT (0.98)",
    sha: "10e82f44c9b0...",
    tokens: "2,890 prompt tokens",
    rawLatency: "980 ms",
    rawWidth: "78%",
    cachedLatency: "14.2 ms (-98.5%)",
    cachedWidth: "9%",
    intercept: "⚡ Cache Intercept: 14.2ms",
  },
] as const

/** Bar snaps to this before easing out to the active scenario's width. */
const COLLAPSED_WIDTH = "2%"
const COLLAPSE_MS = 120

function CopyCodeButton() {
  const [copied, setCopied] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timeout.current), [])

  return (
    <button
      aria-label="Copy code snippet"
      className="flex items-center gap-1 font-code-sm text-code-sm text-on-surface-variant hover:text-on-surface px-2 py-0.5 rounded hover:bg-surface-container transition-colors"
      onClick={async () => {
        await navigator.clipboard.writeText(CODE_SNIPPET)
        setCopied(true)
        clearTimeout(timeout.current)
        timeout.current = setTimeout(() => setCopied(false), 2000)
      }}
    >
      <Icon
        className={cn("text-[14px]", copied && "text-emerald-400")}
        name={copied ? "check" : "content_copy"}
      />
      <span className={cn(copied && "text-emerald-400")}>
        {copied ? "Copied!" : "Copy code"}
      </span>
    </button>
  )
}

/** Hand-tuned highlighting for the fixed snippet above. */
function HighlightedCode() {
  return (
    <code>
      <span className="text-on-surface-variant">
        {"// 1. Import lightweight zero-overhead client"}
      </span>
      {"\n"}
      <span className="text-primary-container">import</span>
      {" { "}
      <span className="text-tertiary">MemoraClient</span>
      {" } "}
      <span className="text-primary-container">from</span>
      {" "}
      <span className="text-primary">&apos;memora-sdk&apos;</span>;
      {"\n\n"}
      <span className="text-on-surface-variant">
        {"// 2. Initialize with semantic similarity threshold"}
      </span>
      {"\n"}
      <span className="text-primary-container">const</span> memora ={" "}
      <span className="text-primary-container">new</span>{" "}
      <span className="text-tertiary">MemoraClient</span>
      {"({\n  apiKey: process.env."}
      <span className="text-secondary">MEMORA_KEY</span>
      {",\n  threshold: "}
      <span className="text-secondary">0.88</span>
      {", "}
      <span className="text-on-surface-variant">{"// Cosine boundary"}</span>
      {"\n});\n\n"}
      <span className="text-on-surface-variant">
        {"// 3. Wrap generative inference - transparent cache hit return"}
      </span>
      {"\n"}
      <span className="text-primary-container">const</span> response ={" "}
      <span className="text-primary-container">await</span> memora.
      <span className="text-tertiary">chat</span>
      {"({\n  model: "}
      <span className="text-primary">&apos;gemini-2.5-flash&apos;</span>
      {",\n  prompt: agentInputPayload,\n});\n\n"}
      <span className="text-primary-container">console</span>.log(response.
      <span className="text-tertiary">metadata</span>.
      <span className="text-secondary">cacheHit</span>
      {"); "}
      <span className="text-on-surface-variant">{"// true (18.4ms)"}</span>
    </code>
  )
}

export function CodeDemo() {
  const [activeScenario, setActiveScenario] = useState(0)
  // Bumping the key restarts the `animate-flash-badge` CSS animation.
  const [flashKey, setFlashKey] = useState(0)
  const [cachedWidth, setCachedWidth] = useState<string>(COLLAPSED_WIDTH)
  const barTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  useEffect(() => () => clearTimeout(barTimeout.current), [])

  const data = telemetryScenarios[activeScenario]!

  // Load-in: ease the cache bar out from collapsed on the first frame.
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      setCachedWidth(telemetryScenarios[0].cachedWidth),
    )
    return () => cancelAnimationFrame(raf)
  }, [])

  const switchTelemetry = (index: number) => {
    setActiveScenario(index)
    setFlashKey((key) => key + 1)
    // Collapse then ease out, so the comparison reads as a live re-measure
    // rather than an instant swap.
    setCachedWidth(COLLAPSED_WIDTH)
    clearTimeout(barTimeout.current)
    barTimeout.current = setTimeout(
      () => setCachedWidth(telemetryScenarios[index]!.cachedWidth),
      COLLAPSE_MS,
    )
  }

  return (
    <section
      className="w-full hero-anim-6 px-[2rem] py-[4rem] max-w-7xl mx-auto scroll-mt-16"
      id="integration"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-[1.5rem] gap-[0.5rem]">
        <div>
          <div className="font-label-sm text-label-sm text-primary uppercase tracking-wider mb-1">
            Developer Ergonomics
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-background">
            Integration footprint: 3 lines of code.
          </h2>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
          No proxy DNS rewrites. Memora wraps existing SDK calls with
          client-side SHA hashing and sub-50ms cache resolution.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[1.5rem] items-stretch">
        {/* Monospace Code Terminal (7 Cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-[0.5rem] p-[1.5rem] flex flex-col justify-between shadow-xl border border-surface-container-high/60 transition-all hover:border-surface-variant">
          <div>
            <div className="flex items-center justify-between pb-[1.5rem] mb-[1.5rem] border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-variant hover:bg-error transition-colors cursor-pointer" />
                <span className="w-2.5 h-2.5 rounded-full bg-surface-variant hover:bg-yellow-500 transition-colors cursor-pointer" />
                <span className="w-2.5 h-2.5 rounded-full bg-surface-variant hover:bg-emerald-500 transition-colors cursor-pointer" />
                <span className="ml-[1rem] font-code-sm text-code-sm text-on-surface-variant">
                  agent-runtime.ts
                </span>
              </div>
              <div className="flex items-center gap-[0.5rem]">
                <CopyCodeButton />
                <span className="font-code-sm text-code-sm text-primary bg-surface-container-high px-2 py-0.5 rounded-[0.125rem]">
                  Node.js / Bun / Edge
                </span>
              </div>
            </div>

            <pre className="font-code-md text-code-md leading-relaxed text-on-surface overflow-x-auto selection:bg-surface-variant">
              <HighlightedCode />
            </pre>
          </div>

          <div className="pt-[1.5rem] mt-[1.5rem] flex items-center justify-between font-code-sm text-code-sm text-on-surface-variant border-t border-surface-container-high/40">
            <div className="flex items-center gap-[0.5rem]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Zero AST syntax modifications required</span>
            </div>
            <span>SDK bundle: 4.1 kB minified</span>
          </div>
        </div>

        {/* Live Execution Telemetry Visualizer (5 Cols) */}
        <div className="lg:col-span-5 bg-surface-container-low rounded-[0.5rem] p-[1.5rem] flex flex-col justify-between shadow-xl border border-surface-container-high/60 transition-all hover:border-surface-variant relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-[0.5rem] mb-[1.5rem]">
              <div className="flex items-center gap-[0.5rem]">
                <Icon
                  className="text-primary text-[20px] transition-transform hover:scale-110"
                  name="monitor_heart"
                />
                <span className="font-headline-sm text-headline-sm text-on-background">
                  Execution Telemetry
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-code-sm text-code-sm px-2 py-0.5 rounded-[0.125rem] bg-surface-container-high text-primary tracking-wide">
                  LIVE INGESTION
                </span>
              </div>
            </div>

            {/* Interactive Scenario Preset Tabs */}
            <div className="mb-[1.5rem]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Test Scenario Simulation
                </span>
                <span
                  key={flashKey}
                  className="hidden sm:inline-block font-code-sm text-code-sm text-primary animate-flash-badge bg-primary-container/15 px-2 py-0.5 rounded-[0.125rem] border border-primary-container/30 whitespace-nowrap"
                >
                  {data.intercept}
                </span>
              </div>
              <div
                aria-label="Test scenario"
                className="grid grid-cols-3 gap-1 bg-surface-container-lowest p-1 rounded-[0.125rem] border border-surface-container-high"
                role="tablist"
              >
                {telemetryScenarios.map((scenario, index) => (
                  <button
                    aria-selected={index === activeScenario}
                    key={scenario.name}
                    onClick={() => switchTelemetry(index)}
                    role="tab"
                    type="button"
                    className={cn(
                      "text-left px-2 py-1.5 rounded-[0.125rem] font-code-sm text-code-sm transition-all duration-150",
                      index === activeScenario
                        ? "text-on-surface bg-surface-container-high border-b border-primary"
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    <span className="block truncate">{scenario.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Comparison Bars */}
            <div className="space-y-[1.5rem] mb-[1.5rem]">
              <div>
                <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
                  <span>Standard Gemini / Claude Invocations</span>
                  <span className="font-code-sm text-code-sm text-error">
                    {data.rawLatency}
                  </span>
                </div>
                <div className="w-full h-3 bg-surface-container-high rounded-[0.125rem] overflow-hidden">
                  <div
                    className="h-full bg-surface-variant transition-all duration-700 ease-out"
                    style={{ width: data.rawWidth }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
                  <span>Memora Edge Cache Match (≥ 0.88 Cosine)</span>
                  <span className="font-code-sm text-code-sm text-primary font-medium">
                    {data.cachedLatency}
                  </span>
                </div>
                <div className="w-full h-3 bg-surface-container-high rounded-[0.125rem] overflow-hidden">
                  <div
                    className="h-full bg-primary-container transition-all duration-700 ease-out"
                    style={{ width: cachedWidth }}
                  />
                </div>
              </div>
            </div>

            {/* Real-Time Inspection Log */}
            <div className="bg-surface-container-lowest p-[1rem] rounded-[0.125rem] space-y-[0.5rem] font-code-sm text-code-sm border border-surface-container-high">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="truncate pr-2">
                  Query:{" "}
                  <span className="text-on-background transition-colors duration-200">
                    {data.query}
                  </span>
                </span>
                <span className="text-primary flex-shrink-0 font-medium">
                  {data.hit}
                </span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant">
                <span>Client SHA-256 Digest:</span>
                <span className="text-on-background truncate max-w-[140px]">
                  {data.sha}
                </span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant">
                <span>Token Egress Prevented:</span>
                <span className="text-emerald-400 font-medium transition-all duration-200">
                  {data.tokens}
                </span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant">
                <span>Inference Cost Added:</span>
                <span className="text-on-background">$0.000000</span>
              </div>
            </div>
          </div>

          {/* Runner Action & Footer */}
          <div className="mt-[1.5rem] pt-[0.5rem] flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant border-t border-surface-container-high/40">
            <button
              className="inline-flex items-center gap-1.5 px-[0.75rem] py-1 rounded bg-surface-container-high text-on-surface hover:text-on-surface hover:bg-surface-variant active:scale-95 transition-all duration-150 font-code-sm text-code-sm"
              onClick={() =>
                switchTelemetry(
                  (activeScenario + 1) % telemetryScenarios.length,
                )
              }
              type="button"
            >
              <Icon
                className="text-[15px] text-primary transition-transform duration-300 hover:rotate-180"
                name="play_arrow"
              />
              <span>Simulate Request</span>
            </button>
            <span className="text-on-background font-code-sm text-code-sm">
              Production Invariant Protected
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}