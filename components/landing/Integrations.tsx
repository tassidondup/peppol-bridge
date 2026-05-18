const INTEGRATIONS = [
  { name: "Xero", status: "Launching first", color: "#13B5EA", bg: "#E0F4FD" },
  { name: "MYOB", status: "Coming soon", color: "#6C2D91", bg: "#F3E8FF" },
  { name: "QuickBooks", status: "Coming soon", color: "#2CA01C", bg: "#DCFCE7" },
  { name: "REST API", status: "For developers", color: "#FF6B35", bg: "#FFF7ED" },
];

export function Integrations() {
  return (
    <section className="border-b border-t border-[#E5E7EB] bg-white px-6 py-16 dark:border-white/10 dark:bg-[#0C1120]">
      <div className="mx-auto max-w-[1100px] text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[1.2px] text-[#00C2A8]">
          Integrations
        </p>
        <h2 className="font-[family-name:var(--font-plus-jakarta)] mb-3 text-[clamp(24px,3vw,34px)] font-bold tracking-[-0.6px] text-[#0F1F3D]">
          Works with the tools you already use.
        </h2>
        <p className="mb-11 text-base text-[#6B7280]">
          No rekeying data. No switching apps. Peppol Bridge plugs into your
          existing workflow.
        </p>
        <div className="grid grid-cols-2 justify-center gap-5 sm:grid-cols-4">
          {INTEGRATIONS.map((int) => (
            <div
              key={int.name}
              className="flex items-center justify-center gap-3 rounded-[14px] border border-[#E5E7EB] bg-[#F8F9FB] px-6 py-[22px] text-[15px] font-semibold text-[#0F1F3D] dark:border-white/10 dark:bg-[#111827] dark:text-white"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: int.bg }}
              >
                <svg width="20" height="20">
                  <circle cx="10" cy="10" r="10" fill={int.color} />
                </svg>
              </div>
              <div className="text-left">
                <div>{int.name}</div>
                <span className="mt-0.5 block text-[11px] font-normal text-[#6B7280]">
                  {int.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
