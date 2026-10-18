const personas = [
  {
    label: "Persona A: The Speedrun Prototyper",
    tag: "Test & Dev Loops",
    title: "Iterating on Agent Pipelines without draining dev credits",
    quote:
      "I re-run 20-step multi-agent evaluations 50 times an hour. Without Memora, I hit LLM rate limits within 20 minutes and burn $80/day on repetitive prompt debugging. Now evaluation runs take 4 seconds instead of 4 minutes.",
    author: "Alex Chen",
    role: "Autonomous Agent Builder",
  },
  {
    label: "Persona B: Production Systems Lead",
    tag: "100k+ Queries/Day",
    title: "Eliminating redundant token drain in customer support bot",
    quote:
      "60% of incoming enterprise support questions are semantically identical variations of refund queries or password resets. Memora intercepts them in 18ms without invoking expensive Gemini Flash tokens repeatedly.",
    author: "Maya Patel",
    role: "VP of Infrastructure & AI Platform",
  },
]

export function Personas() {
  return (
    <section className="w-full px-[2rem] py-[2rem] max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[1.5rem]">
        {personas.map((persona) => (
          <figure
            key={persona.label}
            className="bg-surface-container-lowest p-[1.5rem] rounded-[0.5rem] flex flex-col justify-between shadow-lg border border-surface-container-high/60 hover:border-surface-variant transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
          >
            <div>
              <div className="flex items-center justify-between mb-[1.5rem] gap-2">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold">
                  {persona.label}
                </span>
                <span className="shrink-0 font-code-sm text-code-sm text-on-surface-variant px-2 py-0.5 rounded bg-surface-container-high">
                  {persona.tag}
                </span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-background mb-[0.5rem] group-hover:text-primary transition-colors">
                {persona.title}
              </h3>
              <blockquote className="font-body-md text-body-md text-on-surface-variant mb-[1.5rem] leading-relaxed">
                {persona.quote}
              </blockquote>
            </div>
            <figcaption className="font-code-sm text-code-sm text-on-surface-variant flex items-center gap-[0.5rem] pt-[1rem] border-t border-surface-container-high/40">
              <span className="text-primary font-medium">{persona.author}</span>
              <span>•</span>
              <span>{persona.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}