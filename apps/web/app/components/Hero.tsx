"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"

import { Icon } from "./Icon"
import { cn } from "@workspace/ui/lib/utils"

const INSTALL_COMMAND = "npm install memora-sdk"

const trustSignals = [
  { icon: "check_circle", label: "No credit card required" },
  { icon: "bolt", label: "10,000 free cached queries/month" },
  { icon: "tune", label: "Gemini, OpenAI, Claude compatible" },
] as const

/** Clipboard feedback that self-clears after `DURATION` ms. */
function useCopyFeedback(duration = 2000) {
  const [copied, setCopied] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timeout.current), [])

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      clearTimeout(timeout.current)
      timeout.current = setTimeout(() => setCopied(false), duration)
    },
    [duration],
  )

  return { copied, copy }
}

export function Hero() {
  const { copied, copy } = useCopyFeedback()

  return (
    <>
      {/* Top ambient glow line — full bleed, above the padded hero container */}
      <div className="relative w-full h-[1px] bg-surface-container-high overflow-hidden">
        <div className="absolute inset-y-0 left-1/3 w-64 bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-80 blur-[1px]" />
      </div>

      <section className="relative w-full px-[2rem] pt-[2.5rem] pb-[4rem] max-w-7xl mx-auto flex flex-col items-start">
        {/* Eyebrow Pill */}
        <div className="hero-anim-1 inline-flex items-center gap-[0.5rem] px-[0.5rem] py-1 rounded-[0.125rem] bg-surface-container-low text-primary text-label-sm font-label-sm uppercase tracking-wider mb-[1rem] shadow-sm border border-surface-container-high/60 transition-colors hover:border-primary-container/40">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping" />
          <span>HOSTED SEMANTIC CACHE FOR LLM RUNTIMES</span>
        </div>

        {/* Headline */}
        <h1 className="hero-anim-2 font-display text-display text-on-background max-w-4xl tracking-tight leading-[1.12] mb-[1rem]">
          Stop paying twice for the exact same prompt.
        </h1>

        {/* Subtitle */}
        <p className="hero-anim-3 font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-[2.5rem] leading-relaxed">
          A drop-in proxy and client SDK that caches semantically identical LLM
          completions in sub-50ms. Zero egress for raw prompts, zero provider
          credential leakage.
        </p>

        {/* Action Group */}
        <div className="hero-anim-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-[1rem] w-full sm:w-auto mb-[1.5rem]">
          <a
            className="inline-flex items-center justify-center gap-[0.5rem] h-11 px-[1.5rem] bg-primary-container text-white font-label-md text-label-md rounded-[0.125rem] hover:bg-secondary-container active:scale-[0.98] transition-all duration-150 shadow-glow-primary-lg hover:shadow-glow-primary-lg-hover group"
            href="/signup"
          >
            <span>Get API Key in 2 Minutes</span>
            <Icon
              className="text-[18px] group-hover:translate-x-1 transition-transform duration-200"
              name="arrow_forward"
            />
          </a>

          {/* Quick Copy Terminal Command */}
          <div
            className={cn(
              "relative flex items-center justify-between gap-[1rem] h-11 px-[1rem] bg-surface-container-lowest rounded-[0.125rem] border cursor-pointer group transition-all duration-150 select-none",
              copied
                ? "border-primary-container ring-1 ring-primary-container/40"
                : "border-surface-container-high hover:border-surface-variant",
            )}
            onClick={() => copy(INSTALL_COMMAND)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                copy(INSTALL_COMMAND)
              }
            }}
            role="button"
            tabIndex={0}
            title="Click to copy command"
          >
            <div className="flex items-center gap-[0.5rem] font-code-md text-code-md">
              <span className="text-on-surface-variant select-none group-hover:text-primary transition-colors">
                $
              </span>
              <span
                className={cn(
                  "transition-colors duration-150",
                  copied ? "text-primary" : "text-on-background",
                )}
              >
                {copied ? "Copied to clipboard!" : INSTALL_COMMAND}
              </span>
            </div>

            <button
              aria-label="Copy install command"
              className="flex items-center justify-center text-on-surface-variant group-hover:text-on-surface transition-colors p-1 rounded hover:bg-surface-container"
              onClick={(event) => {
                event.stopPropagation()
                copy(INSTALL_COMMAND)
              }}
            >
              <Icon
                className={cn(
                  "text-[16px] transition-transform duration-200 group-hover:scale-110",
                  copied && "text-emerald-400",
                )}
                name={copied ? "check" : "content_copy"}
              />
            </button>

            <span
              className={cn(
                "absolute -top-8 right-2 text-label-sm font-label-sm text-primary bg-surface-container px-2 py-0.5 rounded-[0.125rem] shadow-lg border border-primary-container/30 transition-all pointer-events-none",
                copied ? "opacity-100" : "opacity-0",
              )}
              role="status"
            >
              Copied to clipboard!
            </span>
          </div>
        </div>

        {/* Micro Trust Signals */}
        <div className="hero-anim-5 flex flex-wrap items-center gap-x-[1rem] gap-y-[0.5rem] text-on-surface-variant font-label-sm text-label-sm">
          {trustSignals.map((signal, index) => (
            <Fragment key={signal.label}>
              {index > 0 && (
                <span aria-hidden className="text-surface-variant">
                  •
                </span>
              )}
              <div className="flex items-center gap-1.5 transition-colors hover:text-on-surface">
                <Icon className="text-primary text-[14px]" name={signal.icon} />
                <span>{signal.label}</span>
              </div>
            </Fragment>
          ))}
        </div>
      </section>
    </>
  )
}