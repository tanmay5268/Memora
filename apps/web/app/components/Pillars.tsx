import { Icon, type IconName } from "./Icon"

const pillars = [
  {
    icon: "speed",
    title: "Sub-50ms Semantic Matching",
    description:
      "Evaluates vector similarity with a customizable cosine threshold (≥ 0.88) directly at low-latency edge clusters. Eliminates multi-second inference bottlenecks on repetitive agent loops.",
    metric: "P99 Latency: ",
    metricValue: "32.1ms globally",
  },
  {
    icon: "enhanced_encryption",
    title: "Zero-Knowledge Client Hashing",
    description:
      "Raw prompts and sensitive user PII never leave your private infrastructure unhashed. SHA-256 normalized vector embeddings guarantee complete zero data exposure.",
    metric: "Security: ",
    metricValue: "SOC-2 & GDPR compliant",
  },
  {
    icon: "terminal",
    title: "3-Line Drop-in SDK",
    description:
      "Transparently wraps existing standard SDKs (Google GenAI, OpenAI, Anthropic). No proprietary agent orchestrators, no changes to internal prompt formatting or syntax.",
    metric: "Compatibility: ",
    metricValue: "Zero vendor lock-in",
  },
] satisfies { icon: IconName; title: string; description: string; metric: string; metricValue: string }[]

export function Pillars() {
  return (
    <section
      className="w-full px-[2rem] py-[2rem] max-w-7xl mx-auto scroll-mt-16"
      id="how-it-works"
    >
      <div className="mb-[2rem]">
        <div className="font-label-sm text-label-sm text-primary uppercase tracking-wider mb-1">
          Architectural Foundations
        </div>
        <h2 className="font-headline-lg text-headline-lg text-on-background">
          Built for high-throughput AI engineering.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[1.5rem]">
        {pillars.map((pillar) => (
          <div
            key={pillar.title}
            className="bg-surface-container-low p-[1.5rem] rounded-[0.5rem] flex flex-col justify-between shadow-md hover:bg-surface-container hover:border-surface-variant border border-surface-container-high/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group cursor-default"
          >
            <div>
              <div className="w-10 h-10 rounded-[0.125rem] bg-surface-container-high flex items-center justify-center text-primary mb-[1.5rem] group-hover:bg-primary-container group-hover:text-on-primary transition-all duration-200">
                <Icon className="text-[24px]" name={pillar.icon} />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-background mb-[0.5rem] group-hover:text-primary transition-colors">
                {pillar.title}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {pillar.description}
              </p>
            </div>
            <div className="mt-[1.5rem] pt-[1rem] font-code-sm text-code-sm text-on-surface-variant border-t border-surface-container-high/40">
              {pillar.metric}{" "}
              <span className="text-primary font-medium">
                {pillar.metricValue}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}