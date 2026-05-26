const STEPS = [
  {
    num: "1",
    title: "Connect Xero, MYOB, or QuickBooks",
    desc: "Link your accounting software in one click. Your invoices, contacts, and GST settings carry across — nothing to re-enter.",
  },
  {
    num: "2",
    title: "Verify your ABN",
    desc: "We register your ABN on the Peppol network automatically. No IT team, no paperwork, no manual configuration. Takes under 2 minutes.",
  },
  {
    num: "3",
    title: "Send your first invoice — get paid in 5 days",
    desc: "Select an invoice, hit Send. It arrives directly in the agency's payment system. Government agencies must pay Peppol invoices within 5 business days.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1100px] px-6 py-[88px]">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[1.2px] text-[#10B981]">
        How it works
      </p>
      <h2 className="font-[family-name:var(--font-plus-jakarta)] mb-[52px] text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.8px] text-[#052E16] dark:text-white">
        Three steps from signup to getting paid faster.
      </h2>
      <div className="grid gap-7 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <div
            key={step.num}
            style={{ transitionDelay: `${i * 60}ms` }}
            className="group relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(16,185,129,0.14)] before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] before:bg-[#10B981] before:opacity-0 before:transition-opacity hover:before:opacity-100 dark:border-white/8 dark:bg-[#0F2318] dark:hover:shadow-[0_12px_32px_rgba(16,185,129,0.10)]"
          >
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#ECFDF5] font-[family-name:var(--font-plus-jakarta)] text-base font-bold text-[#10B981] dark:bg-[#10B981]/15">
              {step.num}
            </div>
            <h3 className="font-[family-name:var(--font-plus-jakarta)] mb-2 text-[17px] font-bold text-[#052E16] dark:text-white">
              {step.title}
            </h3>
            <p className="text-sm leading-[1.65] text-[#6B7280]">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
