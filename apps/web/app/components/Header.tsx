import Image from "next/image"
import Link from "next/link"

import { Icon } from "./Icon"
import MemoraLogo from "@/app/icon.svg"

const REPO_URL = "https://github.com/tanmay5268/Memora"
const DOCS_URL = `${REPO_URL}/blob/main/packages/memorasdk/README.md`

const navItems = [
  { href: "#how-it-works", label: "How it Works", external: false },
  { href: "#integration", label: "Integration", external: false },
  { href: "#security", label: "Architecture & Security", external: false },
  { href: DOCS_URL, label: "Docs", external: true },
] as const

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-md border-b border-surface-container-high transition-colors">
      <div className="h-16 max-w-7xl mx-auto px-[2rem] flex items-center justify-between">
        <div className="flex items-center gap-[1rem]">
          <Link
            className="flex items-center gap-2.5 group transition-transform duration-150 active:scale-95"
            href="/"
          >
            <Image
              alt="Memora Logo"
              className="w-7 h-7 object-contain rounded-[0.125rem] group-hover:scale-105 transition-transform duration-200"
              height={28}
              priority
              src={MemoraLogo}
              width={28}
            />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[18px] tracking-tight text-on-background group-hover:text-primary transition-colors">
                memora
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 font-code-sm text-[11px] text-primary bg-primary-container/15 px-1.5 py-0.5 rounded-[0.125rem] border border-primary-container/30 uppercase tracking-wider">
                v2.4
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-surface-container-high/60 text-label-sm font-label-sm text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-wide text-emerald-400 font-code-sm text-code-sm">
              sub-50ms cache
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-[1.5rem]">
          {navItems.map((item) =>
            item.external ? (
              <a
                key={item.href}
                className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:bg-primary-container hover:after:w-full after:transition-all after:duration-200"
                href={item.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:bg-primary-container hover:after:w-full after:transition-all after:duration-200"
                href={item.href}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-[0.5rem] sm:gap-[1rem]">
          <a
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[0.125rem] bg-surface-container-low hover:bg-surface-container border border-surface-container-high text-on-surface-variant hover:text-on-surface text-code-sm font-code-sm transition-all group"
            href={REPO_URL}
            rel="noopener noreferrer"
            target="_blank"
            title="Star on GitHub"
          >
            <span className="text-primary group-hover:scale-110 transition-transform text-[13px]">
              ★
            </span>
            <span>Star</span>
            <span className="text-surface-variant">|</span>
            <span className="text-on-surface group-hover:text-primary transition-colors">
              1.4k
            </span>
          </a>

          <Link
            className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1"
            href="/login"
          >
            Sign In
          </Link>

          <Link
            className="inline-flex items-center justify-center gap-1.5 h-8 px-[1rem] bg-primary-container text-white font-label-md text-label-md rounded-[0.125rem] hover:bg-secondary-container active:scale-[0.98] transition-all duration-150 shadow-glow-primary hover:shadow-glow-primary-hover group"
            href="/signup"
          >
            <span>Get API Key</span>
            <Icon
              className="text-[15px] group-hover:translate-x-0.5 transition-transform duration-200"
              name="arrow_forward"
            />
          </Link>
        </div>
      </div>
    </header>
  )
}