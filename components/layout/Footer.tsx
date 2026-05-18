import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] px-6 py-8 dark:border-white/10 dark:bg-[#0C1120]">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#0F1F3D]">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="7" width="3" height="8" rx="1.5" fill="white"/>
              <rect x="13" y="7" width="3" height="8" rx="1.5" fill="white"/>
              <rect x="4" y="9" width="10" height="2" rx="1" fill="#00C2A8"/>
              <circle cx="3.5" cy="5" r="2.5" fill="white"/>
              <circle cx="14.5" cy="5" r="2.5" fill="white"/>
            </svg>
          </div>
          <span className="font-[family-name:var(--font-plus-jakarta)] text-sm font-bold text-[#0F1F3D] dark:text-white">
            Peppol <span className="text-[#00C2A8]">Bridge</span>
          </span>
        </Link>
        <p className="text-[13px] text-[#6B7280]">© 2026 Peppol Bridge. Made in Australia 🇦🇺</p>
        <div className="flex gap-5">
          <a href="#" className="text-[13px] text-[#6B7280] hover:text-[#1A1A2E] dark:hover:text-white">Privacy</a>
          <a href="#" className="text-[13px] text-[#6B7280] hover:text-[#1A1A2E] dark:hover:text-white">Terms</a>
          <a href="mailto:hello@peppolbridge.com.au" className="text-[13px] text-[#6B7280] hover:text-[#1A1A2E] dark:hover:text-white">Contact</a>
        </div>
      </div>
    </footer>
  );
}
