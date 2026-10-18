"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Icon, type IconName } from "@/app/components/Icon"
import MemoraLogo from "@/app/icon.svg"
import { orpc, safe } from "@/lib/orpc"
import { createAuthClient } from "@workspace/auth/client"
import { toast } from "@workspace/ui/components/toast"
import { cn } from "@workspace/ui/lib/utils"

const REPO_URL = "https://github.com/tanmay5268/Memora"
const DOCS_URL = `${REPO_URL}/blob/main/packages/memorasdk/README.md`

const NAV = [
  { href: "/dashboard", label: "API Keys", icon: "key" },
  { href: "/dashboard/get-started", label: "Get Started", icon: "rocket_launch" },
] satisfies { href: string; label: string; icon: IconName }[]

type SessionUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

function initials(name: string | null | undefined, email: string | null | undefined) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("")
  }
  return (email?.[0] ?? "?").toUpperCase()
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-space-sm px-space-sm py-2 rounded-lg transition-colors",
              active
                ? "bg-surface-container text-primary font-medium border border-outline-variant"
                : "text-body-sm font-body-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
            )}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <Icon className="text-lg leading-none" name={item.icon} />
            <span>{item.label}</span>
          </Link>
        )
      })}

      {/* No settings route exists yet — rendered inert rather than as a dead link. */}
      <span
        aria-disabled="true"
        className="flex items-center justify-between px-space-sm py-2 rounded-lg text-body-sm font-body-sm text-outline cursor-not-allowed"
        title="Settings aren't available yet"
      >
        <span className="flex items-center gap-space-sm">
          <Icon className="text-lg leading-none" name="settings" />
          <span>Settings</span>
        </span>
        <span className="font-code-sm text-code-sm text-outline px-1 rounded border border-surface-container-high">
          v1
        </span>
      </span>
    </nav>
  )
}

function AccountChip({ user }: { user: SessionUser }) {
  const router = useRouter()
  const authClient = createAuthClient()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    const { error } = await authClient.signOut()
    if (error) {
      setSigningOut(false)
      toast.add({
        type: "error",
        title: "Couldn't sign out",
        description: "Try again in a moment.",
      })
      return
    }
    setOpen(false)
    // The session gate lives in the layout, so drop the server cache too.
    router.replace("/login")
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        className="w-full flex items-center justify-between p-space-xs rounded-lg bg-surface-container-low border border-surface-container-high text-left transition-colors hover:bg-surface-container"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex items-center gap-space-sm min-w-0">
          {user.image ? (
            <Image
              alt=""
              className="w-7 h-7 rounded-full object-cover border border-surface-container-high shrink-0"
              height={28}
              src={user.image}
              width={28}
            />
          ) : (
            <span className="w-7 h-7 rounded bg-surface-container flex items-center justify-center border border-surface-container-high text-label-sm font-label-sm text-on-surface-variant font-mono shrink-0">
              {initials(user.name, user.email)}
            </span>
          )}
          <span className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-surface truncate">
              {user.name ?? "Account"}
            </span>
            <span className="font-code-sm text-code-sm text-outline truncate">
              {user.email ?? ""}
            </span>
          </span>
        </span>
        <Icon className="text-outline text-base shrink-0" name="unfold_more" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-container border border-surface-container-high rounded-lg overflow-hidden z-10 shadow-xl">
          <a
            className="flex items-center gap-space-sm px-space-sm py-2 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
            href={REPO_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub repository
          </a>
          <button
            className="w-full flex items-center gap-space-sm px-space-sm py-2 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors border-t border-surface-container-high disabled:opacity-50"
            disabled={signingOut}
            onClick={handleSignOut}
            type="button"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  )
}

function SidebarContent({
  user,
  onNavigate,
}: {
  user: SessionUser
  onNavigate?: () => void
}) {
  return (
    <>
      <div className="flex flex-col">
        <Link
          className="h-14 px-space-md flex items-center border-b border-surface-container-high shrink-0"
          href="/"
        >
          <span className="flex items-center gap-space-sm min-w-0">
            <Image
              alt="Memora Logo"
              className="w-6 h-6 rounded-lg object-cover shrink-0"
              height={24}
              priority
              src={MemoraLogo}
              width={24}
            />
            <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface font-medium lowercase truncate">
              memora
            </span>
          </span>
        </Link>

        <div className="px-space-md pt-space-md">
          <div className="text-label-sm font-label-sm uppercase tracking-wider text-outline px-space-xs mb-space-xs">
            Core Workspace
          </div>
          <NavLinks onNavigate={onNavigate} />
        </div>
      </div>

      <div className="p-space-md border-t border-surface-container-high shrink-0">
        <AccountChip user={user} />
      </div>
    </>
  )
}

export function ConsoleShell({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [status, setStatus] = useState<{ label: string; ok: boolean } | null>(
    null,
  )

  const crumb = NAV.find((item) => pathname === item.href)?.label ?? "console"

  // A drawer left open behind a navigation would trap focus on mobile.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [drawerOpen])

  // Real health check against the app's own edge, not a hardcoded label.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [error, data] = await safe(orpc.health.check())
      if (cancelled) return
      // A typed error means the server answered; no data means it never did.
      if (error) setStatus({ label: "Edge degraded", ok: false })
      else if (!data) setStatus({ label: "Edge unreachable", ok: false })
      else setStatus({ label: "Systems nominal", ok: true })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-surface-container-lowest">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-surface-container-high z-50 hidden lg:flex flex-col justify-between">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-surface-container-lowest/80"
            onClick={() => setDrawerOpen(false)}
            type="button"
          />
          <aside className="relative h-full w-64 bg-surface-container-lowest border-r border-surface-container-high flex flex-col justify-between">
            <SidebarContent
              onNavigate={() => setDrawerOpen(false)}
              user={user}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="fixed top-0 left-0 right-0 lg:left-64 h-14 bg-surface-container-lowest border-b border-surface-container-high z-40 flex items-center justify-between px-space-md lg:px-space-lg">
          <div className="flex items-center gap-space-md min-w-0">
            <button
              aria-label="Open navigation"
              className="lg:hidden text-on-surface-variant hover:text-on-surface p-1 -ml-1"
              onClick={() => setDrawerOpen(true)}
              type="button"
            >
              <Icon className="text-xl leading-none" name="menu_book" />
            </button>

            <div className="flex items-center gap-space-xs text-body-sm font-body-sm text-outline min-w-0">
              <Link
                className="hover:text-on-surface transition-colors shrink-0"
                href="/dashboard"
              >
                console
              </Link>
              <span className="text-outline-variant">/</span>
              <span className="text-on-surface font-medium truncate">{crumb}</span>
            </div>

            {status && (
              <>
                <div className="h-4 w-px bg-surface-container-high hidden sm:block" />
                <div className="hidden sm:flex items-center gap-space-xs px-2 py-0.5 rounded border border-surface-container-high bg-surface-container-low">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      status.ok ? "bg-secondary" : "bg-error",
                    )}
                  />
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {status.label}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-space-md">
            <a
              className="hidden sm:flex items-center gap-1 text-body-sm font-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
              href={DOCS_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon className="text-base leading-none" name="menu_book" />
              <span>Docs</span>
            </a>
            <div className="h-4 w-px bg-surface-container-high hidden sm:block" />
            {user.image && (
              <Image
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-surface-container-high hidden sm:block"
                height={32}
                src={user.image}
                width={32}
              />
            )}
          </div>
        </header>

        <main className="w-full pt-14 bg-surface-container-lowest flex-1 px-space-md lg:px-space-lg py-space-lg">
          <div className="flex flex-col w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}