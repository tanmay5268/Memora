const benchmarks = [
  {
    label: "Median Edge Latency",
    value: "18.4ms",
    delta: "-98.7%",
    deltaAccent: true,
  },
  {
    label: "Cosine Similarity",
    value: "≥ 0.88",
    delta: "Normalized",
    deltaAccent: false,
  },
  {
    label: "Agent Loop Hit Rate",
    value: "94.2%",
    delta: "Zero LLM egress",
    deltaAccent: true,
  },
  {
    label: "Provider Key Exposure",
    value: "0.00%",
    delta: "Client-side only",
    deltaAccent: false,
  },
]

export function Benchmarks() {
  return (
    <section className="w-screen hero-anim-5 bg-surface-container-lowest py-[1rem] border-y border-surface-container-high/40">
      <div className="max-w-7xl mx-auto px-[2rem] grid grid-cols-2 md:grid-cols-4 gap-[1.5rem]">
        {benchmarks.map((benchmark) => (
          <div
            key={benchmark.label}
            className="flex flex-col group transition-transform duration-200 hover:-translate-y-0.5"
          >
            <span className="font-code-sm text-code-sm text-on-surface-variant uppercase tracking-wider group-hover:text-primary transition-colors">
              {benchmark.label}
            </span>
            <div className="flex items-baseline gap-[0.5rem] mt-1">
              <span className="font-headline-lg text-headline-lg text-on-background">
                {benchmark.value}
              </span>
              <span
                className={`font-code-sm text-code-sm ${
                  benchmark.deltaAccent
                    ? "text-primary"
                    : "text-on-surface-variant"
                }`}
              >
                {benchmark.delta}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}