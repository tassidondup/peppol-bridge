const SIGNALS = [
  "ATO e-invoicing aligned",
  "Certified Access Point via Storecove",
  "Australian company, Australian support",
  "GST & ABN compliant invoicing",
];

export function TrustBar() {
  return (
    <div className="border-b border-t border-[#E5E7EB] bg-white py-[18px] px-6 dark:border-white/10 dark:bg-[#0C1120]">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-8">
        {SIGNALS.map((signal) => (
          <div key={signal} className="flex items-center gap-2 text-[13px] font-medium text-[#6B7280] dark:text-[#9CA3AF]">
            <svg width="16" height="16" fill="none" className="shrink-0 text-[#00C2A8]">
              <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM.5 8a7.5 7.5 0 1 1 15 0A7.5 7.5 0 0 1 .5 8zm10.56-2.56a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06l.97.97 2.97-2.97a.75.75 0 0 1 1.06 0z" fill="currentColor"/>
            </svg>
            {signal}
          </div>
        ))}
      </div>
    </div>
  );
}
