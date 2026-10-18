import { Icon, type IconName } from "./Icon"

const DOCS_URL = "https://github.com/tanmay5268/Memora/blob/main/packages/memorasdk/README.md"

const pipelineSteps = [
  {
    number: "01",
    label: "INGESTION",
    icon: "fingerprint",
    title: "Your App Agent",
    description:
      "Prompt payload arrives at client SDK. Local tokenizer computes deterministic hash.",
  },
  {
    number: "02",
    label: "ANONYMIZATION",
    icon: "lock",
    title: "Client SHA-256",
    description:
      "Raw strings stripped. Only normalized cryptographic vector signatures sent over TLS 1.3.",
  },
  {
    number: "03",
    label: "EDGE QUERY",
    icon: "schema",
    title: "Cosine Sim ≥ 0.88",
    description:
      "Sub-50ms lookup against cached completion embeddings across global edge regions.",
  },
  {
    number: "04",
    label: "RESOLUTION",
    icon: "done_all",
    title: "Hit or Direct Pass",
    description:
      "Instant cache return or fallback to foundation model via local client-side invocation.",
  },
] satisfies {
  number: string
  label: string
  icon: IconName
  title: string
  description: string
}[]

export function Architecture() {
  return (
    <section
      className="w-full px-[2rem] py-[2rem] max-w-7xl mx-auto scroll-mt-16"
      id="security"
    >
      <div className="bg-surface-container-lowest rounded-[0.5rem] p-[2rem] md:p-[2.5rem] shadow-2xl border border-surface-container-high/60 relative overflow-hidden">
        <div className="max-w-3xl mb-[2rem]">
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider">
            Enterprise Security Invariant
          </span>
          <h2 className="font-headline-lg text-headline-lg text-on-background mt-1 mb-[1rem]">
            Third-party LLM credentials never touch our servers.
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Unlike reverse proxies that require providing raw API master keys,
            Memora operates strictly as a semantic index. The client handles
            fallback calls directly using local provider keys.
          </p>
        </div>

        {/* Animated Traveling Data Flow Track */}
        <div className="relative mb-[1.5rem]">
          <div className="hidden md:block w-full h-[2px] bg-surface-container-high overflow-hidden rounded-full mb-3">
            <div className="pulse-beam w-48 h-full bg-gradient-to-r from-transparent via-primary-container to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-[1.5rem]">
            {pipelineSteps.map((step) => (
              <div
                key={step.number}
                className="bg-surface-container-low p-[1.5rem] rounded-[0.125rem] flex flex-col border border-surface-container-high/80 hover:border-primary-container/80 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group cursor-default"
              >
                <div className="flex items-center justify-between mb-[0.5rem]">
                  <span className="font-code-sm text-code-sm text-primary font-medium">
                    {step.number}. {step.label}
                  </span>
                  <Icon
                    className="text-[18px] text-on-surface-variant group-hover:text-primary transition-colors"
                    name={step.icon}
                  />
                </div>
                <span className="font-headline-sm text-headline-sm text-on-background mb-1 group-hover:text-primary transition-colors">
                  {step.title}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Inscription Note */}
        <div className="mt-[1.5rem] pt-[1rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[1rem] text-on-surface-variant font-code-sm text-code-sm border-t border-surface-container-high/40">
          <div className="flex items-center gap-[0.5rem]">
            <Icon className="text-primary text-[18px]" name="verified_user" />
            <span>Zero Prompt Data Retention Policy active by default.</span>
          </div>
          <a
            className="text-primary hover:text-secondary-container inline-flex items-center gap-1 group transition-colors"
            href={DOCS_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="underline underline-offset-4 decoration-primary-container group-hover:decoration-secondary-container">
              Read Security Whitepaper
            </span>
            <Icon
              className="text-[14px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              name="open_in_new"
            />
          </a>
        </div>
      </div>
    </section>
  )
}