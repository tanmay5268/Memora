import { Icon } from "./Icon"

const DOCS_URL = "https://github.com/tanmay5268/Memora/blob/main/packages/memorasdk/README.md"

export function FinalCTA() {
  return (
    <section className="w-full px-[2rem] py-[4rem] max-w-7xl mx-auto">
      <div className="relative bg-surface-container-low rounded-[0.5rem] p-[1.5rem] md:p-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-[2rem] border border-surface-container-high">
        {/* Ambient Orange Accent Flare */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary-container opacity-10 blur-3xl pointer-events-none" />

        <div className="max-w-xl z-10">
          <h2 className="font-display text-display text-on-background tracking-tight mb-[0.5rem]">
            Start caching in production today.
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-[1rem]">
            Get your verified API key in under 90 seconds. 10,000 cached requests
            every single month on the free tier.
          </p>
          <div className="flex items-center gap-[1rem] font-code-sm text-code-sm text-on-surface-variant">
            <span>Zero CC setup</span>
            <span>•</span>
            <span>Immediate key issuance</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[1rem] z-10 w-full sm:w-auto">
          <a
            className="inline-flex items-center justify-center gap-[0.5rem] h-12 px-[2rem] bg-primary-container text-white font-label-md text-label-md rounded-[0.125rem] hover:bg-secondary-container active:scale-[0.98] transition-all duration-150 shadow-glow-primary-xl hover:shadow-glow-primary-xl-hover group"
            href="/signup"
          >
            <span>Create Your Free API Key</span>
            <Icon
              className="text-[18px] group-hover:translate-x-1 transition-transform duration-200"
              name="arrow_forward"
            />
          </a>
          <a
            className="inline-flex items-center justify-center h-12 px-[1rem] bg-surface-container-highest text-on-surface font-label-md text-label-md rounded-[0.125rem] hover:bg-surface-variant active:scale-[0.98] transition-all duration-150 border border-surface-container-high"
            href={DOCS_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            View Docs &amp; Benchmarks
          </a>
        </div>
      </div>
    </section>
  )
}