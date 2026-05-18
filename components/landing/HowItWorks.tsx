const STEPS = [
  {
    num: "1",
    title: "Connect your ABN",
    desc: "Enter your ABN and we'll register your business on the Peppol network automatically. No IT team, no paperwork, no manual configuration.",
  },
  {
    num: "2",
    title: "Sync your accounting tool",
    desc: "Connect Xero, MYOB, or QuickBooks with one click. Your invoices, contacts, and GST settings carry across — nothing to re-enter.",
  },
  {
    num: "3",
    title: "Send & receive",
    desc: "Send ATO-compliant Peppol invoices to your customers. Receive theirs automatically. Everything syncs back to your accounting tool.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1100px] px-6 py-[88px]">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[1.2px] text-[#00C2A8]">
        How it works
      </p>
      <h2 className="font-[family-name:var(--font-plus-jakarta)] mb-[52px] text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.8px] text-[#0F1F3D] dark:text-white">
        From signup to your first Peppol invoice in minutes.
      </h2>
      <div className="grid gap-7 md:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.num}
            className="group relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-7 before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] before:bg-[#00C2A8] before:opacity-0 before:transition-opacity hover:before:opacity-100 dark:border-white/10 dark:bg-[#111827]"
          >
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#E6FAF7] font-[family-name:var(--font-plus-jakarta)] text-base font-bold text-[#00C2A8]">
              {step.num}
            </div>
            <h3 className="font-[family-name:var(--font-plus-jakarta)] mb-2 text-[17px] font-bold text-[#0F1F3D] dark:text-white">
              {step.title}
            </h3>
            <p className="text-sm leading-[1.65] text-[#6B7280]">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
