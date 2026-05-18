const STAGES = [
  {
    title: "Commonwealth agencies — now",
    desc: "All Australian Government agencies must be able to receive Peppol e-invoices from suppliers.",
    iconBgClass: "bg-[#EEF2FF]",
    iconColor: "#4F46E5",
  },
  {
    title: "Large enterprise — in progress",
    desc: "Major corporates trading with government are being encouraged or required to adopt Peppol.",
    iconBgClass: "bg-[#FEF3C7]",
    iconColor: "#D97706",
  },
  {
    title: "SMBs — get ready now",
    desc: "Adoption is expanding. SMBs who get Peppol-ready now avoid a last-minute scramble and open up new business opportunities.",
    iconBgClass: "bg-[#E6FAF7]",
    iconColor: "#00C2A8",
  },
];

export function MandateContext() {
  return (
    <section className="border-b border-[#E5E7EB] bg-[#F8F9FB] px-6 py-[72px] dark:border-white/10 dark:bg-[#0C1120]">
      <div className="mx-auto max-w-[1100px]">
        <div className="grid items-center gap-16 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[1.2px] text-[#00C2A8]">Why now</p>
            <h2 className="font-[family-name:var(--font-plus-jakarta)] mb-4 text-[clamp(26px,3.5vw,36px)] font-bold tracking-[-0.6px] text-[#0F1F3D] dark:text-white">
              The ATO&apos;s e-invoicing mandate is rolling out across Australia.
            </h2>
            <p className="mb-4 text-base leading-[1.75] text-[#6B7280]">
              The Australian Government has adopted Peppol as the national
              e-invoicing standard. Large enterprises are already required to
              receive Peppol invoices — and the requirements are expanding to SMBs.
            </p>
            <p className="text-base leading-[1.75] text-[#6B7280]">
              Most businesses don&apos;t know where to start. That&apos;s exactly
              why we built Peppol Bridge.
            </p>
          </div>
          <div className="flex flex-col gap-3.5">
            {STAGES.map((stage) => (
              <div
                key={stage.title}
                className="flex gap-3.5 rounded-xl border border-[#E5E7EB] bg-white px-5 py-[18px] dark:border-white/10 dark:bg-[#111827]"
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${stage.iconBgClass}`}
                >
                  <svg width="18" height="18" fill="none">
                    <circle cx="9" cy="9" r="7" stroke={stage.iconColor} strokeWidth="1.5"/>
                    <path d="M6 9l2 2 4-4" stroke={stage.iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-[#0F1F3D] dark:text-white">{stage.title}</h4>
                  <p className="text-[13px] leading-[1.5] text-[#6B7280]">{stage.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
