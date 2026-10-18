const REPO_URL = "https://github.com/tanmay5268/Memora"
const API_SPECS_URL = `${REPO_URL}/blob/main/packages/memorasdk/README.md`

// Placeholder destinations: these pages do not exist yet, so each link points at
// the closest real artifact. Swap in real routes once they ship.
const footerLinks = [
  { href: "#integration", label: "Telemetry", external: false },
  { href: "#security", label: "Compliance", external: false },
  { href: API_SPECS_URL, label: "API Specs", external: true },
  { href: REPO_URL, label: "Privacy & Terms", external: true },
] as const

export function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest border-t border-surface-container-high py-[2rem]">
      <div className="max-w-7xl mx-auto px-[2rem] flex flex-col md:flex-row items-center justify-between gap-[1rem]">
        <div className="flex items-center gap-[1.5rem]">
          <div className="flex items-center gap-[0.5rem] font-code-sm text-code-sm text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Latency SLA 99.99% &lt;12ms</span>
          </div>
          <span className="hidden md:inline text-surface-container-highest">
            |
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            © {new Date().getFullYear()} Memora Systems Inc.
          </span>
        </div>

        <div className="flex items-center gap-[1rem] font-label-sm text-label-sm text-on-surface-variant">
          {footerLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                className="hover:text-on-surface transition-colors"
                href={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ) : (
              <a
                key={link.href}
                className="hover:text-on-surface transition-colors"
                href={link.href}
              >
                {link.label}
              </a>
            ),
          )}
        </div>
      </div>
    </footer>
  )
}