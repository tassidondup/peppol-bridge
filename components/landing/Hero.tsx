import { WaitlistForm } from "./WaitlistForm";

export function Hero() {
  return (
    <section className="mx-auto max-w-[1100px] px-6 py-[88px] pb-[72px]">
      <div className="grid items-center gap-[72px] md:grid-cols-2">
        {/* Left */}
        <div>
          {/* Pulse badge */}
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-[#E6FAF7] px-3 py-1.5 text-[13px] font-medium text-[#007A6B] dark:bg-[#00C2A8]/10 dark:text-[#00C2A8]">
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#00C2A8]" />
            Accepting waitlist signups
          </div>
          <h1 className="font-[family-name:var(--font-plus-jakarta)] mb-5 text-[clamp(34px,4.5vw,52px)] font-extrabold leading-[1.1] tracking-[-1.5px] text-[#0F1F3D] dark:text-white">
            Peppol e-invoicing.{" "}
            <span className="text-[#00C2A8]">Built for Australian SMBs.</span>
          </h1>
          <p className="mb-7 max-w-[440px] text-[17px] leading-[1.7] text-[#6B7280]">
            Not enterprise software. Not an API. A simple product that makes
            your business Peppol-ready — from signup to your first compliant
            invoice in minutes.
          </p>
          {/* Works with pills */}
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#6B7280]">Works with</span>
            {[
              { name: "Xero", color: "#13B5EA" },
              { name: "MYOB", color: "#6C2D91" },
              { name: "QuickBooks", color: "#2CA01C" },
            ].map((app) => (
              <div
                key={app.name}
                className="flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-semibold text-[#0F1F3D] dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <svg width="14" height="14"><circle cx="7" cy="7" r="7" fill={app.color}/></svg>
                {app.name}
              </div>
            ))}
          </div>
          <WaitlistForm />
          <p className="mt-2.5 text-[13px] text-[#6B7280]">No spam. We&apos;ll reach out when you&apos;re up.</p>
        </div>

        {/* Right: Invoice card visual */}
        <div className="relative hidden md:block">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.10)] text-[13px]">
            <div className="mb-[18px] flex items-start justify-between">
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">Tax Invoice</div>
                <div className="text-sm font-semibold text-[#0F1F3D]">INV-2025-0042</div>
              </div>
              <div className="rounded-md bg-[#E6FAF7] px-2.5 py-1 text-[11px] font-semibold text-[#007A6B]">
                Delivered via Peppol ✓
              </div>
            </div>
            {[
              { label: "From", value: "Apex Consulting Pty Ltd" },
              { label: "ABN", value: "51 824 753 556" },
              { label: "To", value: "Horizon Group Pty Ltd" },
            ].map((row) => (
              <div key={row.label} className="mb-2 flex justify-between">
                <span className="text-[#6B7280]">{row.label}</span>
                <span className="font-medium text-[#0F1F3D]">{row.value}</span>
              </div>
            ))}
            <div className="my-3.5 h-px bg-[#E5E7EB]" />
            {[
              { label: "Strategy consulting — June", value: "$4,500.00" },
              { label: "GST (10%)", value: "$450.00" },
            ].map((row) => (
              <div key={row.label} className="mb-2 flex justify-between">
                <span className="text-[#6B7280]">{row.label}</span>
                <span className="font-medium text-[#0F1F3D]">{row.value}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t-[1.5px] border-[#E5E7EB] pt-3">
              <span className="font-semibold text-[#0F1F3D]">Total due</span>
              <span className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[#0F1F3D]">$4,950.00</span>
            </div>
          </div>
          <div className="absolute -bottom-[18px] left-1/2 -translate-x-1/2 flex items-center gap-2.5 rounded-xl bg-[#0F1F3D] px-4 py-3 text-[13px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.18)] whitespace-nowrap">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <svg width="16" height="16" fill="none"><path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.5l-3.7 1.9.7-4.1L2 5.4l4.2-.8L8 1z" fill="#00C2A8"/></svg>
            </div>
            <div>
              <div className="text-[11px] text-white/55">ATO-aligned</div>
              <div className="font-semibold">Peppol-ready ✓</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
