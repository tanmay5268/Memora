"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import MemoraLogo from "@/app/icon.svg"
import { createAuthClient } from "@workspace/auth/client"
import { toast } from "@workspace/ui/components/toast"
import { cn } from "@workspace/ui/lib/utils"

export type AuthMode = "signin" | "signup"

const COPY: Record<
  AuthMode,
  { tab: string; cta: string; pending: string }
> = {
  signin: { tab: "Sign in", cta: "Sign in", pending: "Signing in…" },
  signup: {
    tab: "Create account",
    cta: "Create account",
    pending: "Creating account…",
  },
}

type ConsoleState =
  | { kind: "idle" }
  | { kind: "pending"; text: string }
  | { kind: "error"; text: string }
  | { kind: "ok"; text: string }

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className}>
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0C7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        fill="#EA4335"
      />
    </svg>
  )
}

/**
 * SHA-256 of a string, computed in this tab. `crypto.subtle` is only exposed in
 * secure contexts, so this resolves to `null` on plain-http origins rather than
 * throwing — the console strip degrades to a character count.
 */
async function sha256Hex(input: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null
  try {
    const bytes = await subtle.digest(
      "SHA-256",
      new TextEncoder().encode(input),
    )
    return Array.from(new Uint8Array(bytes))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  } catch {
    return null
  }
}

export function AuthForm({ initialMode = "signin" }: { initialMode?: AuthMode }) {
  const router = useRouter()
  const authClient = createAuthClient()
  const uid = useId()

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [console_, setConsole] = useState<ConsoleState>({ kind: "idle" })
  // Keyed by the value it was computed from, so a stale in-flight digest can
// never be shown for a newer email — and no reset-on-empty setState is needed.
const [digest, setDigest] = useState<{
    value: string
    hash: string | null
  } | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const copy = COPY[mode]
  const isSignup = mode === "signup"

  const emailValue = email.trim()
  const activeDigest =
    digest && digest.value === emailValue ? digest.hash : null

  useEffect(() => {
    if (!emailValue) return
    let cancelled = false
    void sha256Hex(emailValue).then((hash) => {
      if (!cancelled) setDigest({ value: emailValue, hash })
    })
    return () => {
      cancelled = true
    }
  }, [emailValue])

  function switchMode(next: AuthMode) {
    if (next === mode) return
    setMode(next)
    setNotice(null)
    setConsole({ kind: "idle" })
    // Keep the tab linkable without triggering a Next.js navigation.
    const path = next === "signup" ? "/signup" : "/login"
    window.history.replaceState(null, "", path)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values = {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      name: String(data.get("name") ?? ""),
    }

    setNotice(null)
    setConsole({ kind: "pending", text: copy.pending })

    try {
      const { error } = isSignup
        ? await authClient.signUp.email({
            name: values.name,
            email: values.email,
            password: values.password,
            callbackURL: "/dashboard",
          })
        : await authClient.signIn.email({
            email: values.email,
            password: values.password,
          })

      if (error) {
        const code = error.code ?? ""

        if (code.startsWith("USER_ALREADY_EXISTS")) {
          setNotice(
            "That email already has a password account. Sign in instead, or reset the password.",
          )
          setConsole({ kind: "error", text: "ERR email already registered" })
        } else if (code === "SOCIAL_ACCOUNT_ALREADY_LINKED") {
          setNotice(
            "That email is already linked to a GitHub account. Sign in with GitHub to continue.",
          )
          setConsole({ kind: "error", text: "ERR account linked to GitHub" })
        } else {
          const message =
            code === "INVALID_EMAIL_OR_PASSWORD"
              ? "That email and password don't match."
              : (error.message ?? "Something went wrong.")
          setConsole({ kind: "error", text: `ERR ${message}` })
          toast.add({ type: "error", title: "Couldn't sign you in", description: message })
        }
        return
      }

      setConsole({ kind: "ok", text: "OK session established · redirecting" })
      router.push("/dashboard")
      router.refresh()
    } catch {
      const message = "Memora couldn't reach the auth service. Try again."
      setConsole({ kind: "error", text: `ERR ${message}` })
      toast.add({ type: "error", title: "Request failed", description: message })
    }
  }

  function social(provider: "github" | "google") {
    setConsole({ kind: "pending", text: `Redirecting to ${provider}…` })
    void authClient.signIn.social({ provider, callbackURL: "/dashboard" })
  }

  const consoleText = (() => {
    if (console_.kind !== "idle") return console_.text
    if (!emailValue) return "ready · awaiting identifier"
    if (activeDigest) return `sha256(email) = ${activeDigest.slice(0, 16)}…`
    return `${emailValue.length} chars · local digest unavailable`
  })()

  const consoleTone =
    console_.kind === "error"
      ? "text-error"
      : console_.kind === "ok"
        ? "text-emerald-400"
        : "text-tertiary"

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      {/* Identity */}
      <div className="flex flex-col items-center text-center mb-space-lg">
        <div className="flex items-center gap-space-xs mb-space-sm">
          <Image
            alt="memora brandmark"
            className="w-7 h-7 rounded-[0.125rem] object-cover"
            height={28}
            priority
            src={MemoraLogo}
            width={28}
          />
          <span className="font-headline-md text-headline-md tracking-tight text-on-surface">
            memora
          </span>
          <span className="ml-space-xs font-code-sm text-code-sm text-outline px-1.5 py-0.5 rounded-[0.125rem] bg-surface-container-high">
            v2.4
          </span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-space-xs">
          Stop paying twice for the same prompt.
        </h1>
        <p className="font-body-sm text-body-sm text-outline max-w-sm">
          Sub-50ms semantic cache for LLM production pipelines.
        </p>
      </div>

      {/* Server-reported edge cases — dismissible, never shown speculatively */}
      {notice && (
        <div
          className="w-full mb-space-md bg-surface-container-high rounded-[0.125rem] p-space-sm flex items-start gap-space-sm shadow-sm"
          role="status"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-secondary-container mt-1.5 shrink-0" />
          <p className="flex-1 font-code-sm text-code-sm text-secondary-fixed">
            {notice}
          </p>
          <button
            aria-label="Dismiss notice"
            className="text-outline hover:text-on-surface text-label-sm font-code-sm p-0.5 transition-colors"
            onClick={() => setNotice(null)}
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {/* Auth unit */}
      <div className="w-full bg-surface-container rounded-[0.125rem] shadow-xl overflow-hidden">
        <div className="p-space-lg">
          {/* Mode switch. Modelled as a radio group: picking one of two is exactly
              what this is, and it avoids implying tab panels that don't
              exist. Arrow keys move and select, as a radio group should. */}
          <div
            aria-label="Account access"
            className="relative grid grid-cols-2 p-1 bg-surface-container-lowest rounded-[0.125rem] mb-space-lg"
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
                return
              event.preventDefault()
              const next =
                event.key === "Home"
                  ? "signin"
                  : event.key === "End"
                    ? "signup"
                    : isSignup
                      ? "signin"
                      : "signup"
              switchMode(next)
              tabRefs.current[next === "signup" ? 1 : 0]?.focus()
            }}
            role="radiogroup"
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-1 bottom-1 left-1 w-[calc(50%_-_0.25rem)] rounded-[0.125rem] bg-surface-container shadow-sm transition-transform duration-300 ease-out",
                isSignup && "translate-x-full",
              )}
            />
            {(["signin", "signup"] as const).map((value, index) => (
              <button
                aria-checked={mode === value}
                className={cn(
                  "relative py-1.5 font-label-md text-label-md transition-colors rounded-[0.125rem] text-center",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
                  mode === value
                    ? "text-on-surface"
                    : "text-outline hover:text-on-surface",
                )}
                key={value}
                onClick={() => switchMode(value)}
                ref={(node) => {
                  tabRefs.current[index] = node
                }}
                role="radio"
                tabIndex={mode === value ? 0 : -1}
                type="button"
              >
                {COPY[value].tab}
              </button>
            ))}
          </div>

          {/* OAuth */}
          <div className="flex flex-col gap-space-xs mb-space-md">
            <button
              className="w-full flex items-center justify-center gap-space-sm py-2 px-space-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-[0.125rem] transition-colors font-label-md text-label-md group shadow-sm"
              onClick={() => social("github")}
              type="button"
            >
              <GitHubMark className="w-4 h-4 fill-current text-on-surface group-hover:text-primary transition-colors" />
              <span>Continue with GitHub</span>
            </button>
            <button
              className="w-full flex items-center justify-center gap-space-sm py-2 px-space-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-[0.125rem] transition-colors font-label-md text-label-md group shadow-sm"
              onClick={() => social("google")}
              type="button"
            >
              <GoogleMark className="w-4 h-4" />
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Hairline split. Two flex hairlines rather than one line with an
              absolutely-positioned label: `position:absolute` drops the label
              out of the flex flow and it falls back to the content-box origin,
              which clipped the text on the hairline. */}
          <div className="flex items-center gap-space-sm my-space-md">
            <div className="h-px flex-1 bg-surface-container-highest" />
            <span className="font-code-sm text-code-sm text-outline">or</span>
            <div className="h-px flex-1 bg-surface-container-highest" />
          </div>

          {/* Credentials */}
          <form className="space-y-space-md" onSubmit={handleSubmit}>
            {/* Name — signup only, collapsed via grid-rows so the CTA doesn't jump */}
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isSignup ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="pb-space-md">
                  <label
                    className="font-label-sm text-label-sm text-outline tracking-wider uppercase block mb-1"
                    htmlFor={`${uid}-name`}
                  >
                    Name
                  </label>
                  <input
                    autoComplete="name"
                    className="w-full bg-surface-container-lowest text-on-surface font-code-md text-code-md px-space-sm py-2 rounded-[0.125rem] transition-colors placeholder:text-outline focus:outline-none focus:bg-surface-container-high focus-visible:ring-2 focus-visible:ring-primary-container/50"
                    disabled={!isSignup}
                    id={`${uid}-name`}
                    name="name"
                    placeholder="Ada Lovelace"
                    tabIndex={isSignup ? 0 : -1}
                    type="text"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                className="font-label-sm text-label-sm text-outline tracking-wider uppercase block mb-1"
                htmlFor={`${uid}-email`}
              >
                Work email
              </label>
              <input
                autoComplete="email"
                className="w-full bg-surface-container-lowest text-on-surface font-code-md text-code-md px-space-sm py-2 rounded-[0.125rem] transition-colors placeholder:text-outline focus:outline-none focus:bg-surface-container-high focus-visible:ring-2 focus-visible:ring-primary-container/50"
                id={`${uid}-email`}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="eng@company.com"
                required
                type="email"
              />
            </div>

            <div>
              <label
                className="font-label-sm text-label-sm text-outline tracking-wider uppercase block mb-1"
                htmlFor={`${uid}-password`}
              >
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  className="w-full bg-surface-container-lowest text-on-surface font-code-md text-code-md px-space-sm py-2 pr-10 rounded-[0.125rem] transition-colors placeholder:text-outline focus:outline-none focus:bg-surface-container-high focus-visible:ring-2 focus-visible:ring-primary-container/50"
                  id={`${uid}-password`}
                  minLength={8}
                  name="password"
                  placeholder="••••••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-space-sm text-outline hover:text-on-surface font-code-sm text-code-sm px-1 py-0.5 rounded-[0.125rem] transition-colors"
                  onClick={() => setShowPassword((value) => !value)}
                  type="button"
                >
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
            </div>

            <button
              className="w-full py-2.5 px-space-md bg-primary-container hover:bg-secondary-container text-on-primary font-headline-sm text-headline-sm rounded-[0.125rem] shadow-md transition-all flex items-center justify-center gap-space-xs active:translate-y-px disabled:opacity-70 disabled:pointer-events-none"
              disabled={console_.kind === "pending"}
              type="submit"
            >
              <span>
                {console_.kind === "pending" ? copy.pending : copy.cta}
              </span>
              <span className="font-code-md text-code-md">→</span>
            </button>
          </form>
        </div>

        {/* Status console — full-bleed foot of the auth unit */}
        <div
          aria-live="polite"
          className="border-t border-surface-container-highest bg-surface-container-lowest px-space-md py-space-sm flex items-center gap-space-sm"
        >
          <span
            aria-hidden
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              console_.kind === "error"
                ? "bg-error"
                : console_.kind === "ok"
                  ? "bg-emerald-400"
                  : "bg-tertiary",
            )}
          />
          <span
            className={cn(
              "font-code-sm text-code-sm truncate min-w-0",
              consoleTone,
            )}
          >
            {consoleText}
          </span>
          <span
            aria-hidden
            className="font-code-sm text-code-sm text-tertiary animate-pulse shrink-0"
          >
            ▍
          </span>
        </div>
      </div>

      {/* Trust */}
      <div className="w-full flex flex-col items-center gap-space-xs mt-space-lg text-center">
        <div className="flex items-center gap-space-xs text-outline font-code-sm text-code-sm">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-outline" />
          <span>prompts hashed client-side — raw text never stored</span>
        </div>
        <div className="flex items-center gap-space-sm text-outline font-body-sm text-body-sm mt-space-xs">
          <Link
            className="hover:text-on-surface transition-colors"
            href="/#security"
          >
            How the zero-knowledge path works
          </Link>
        </div>
      </div>
    </div>
  )
}