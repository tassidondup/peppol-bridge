import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-[rgba(248,249,251,0.92)] backdrop-blur-[12px] dark:border-white/10 dark:bg-[rgba(12,17,32,0.92)]">
      <div className="mx-auto flex h-[60px] max-w-[1100px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          {/* Bridge icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F1F3D]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="7" width="3" height="8" rx="1.5" fill="white"/>
              <rect x="13" y="7" width="3" height="8" rx="1.5" fill="white"/>
              <rect x="4" y="9" width="10" height="2" rx="1" fill="#00C2A8"/>
              <circle cx="3.5" cy="5" r="2.5" fill="white"/>
              <circle cx="14.5" cy="5" r="2.5" fill="white"/>
            </svg>
          </div>
          <span className="font-[family-name:var(--font-plus-jakarta)] text-[17px] font-bold tracking-[-0.3px] text-[#0F1F3D] dark:text-white">
            Peppol <span className="text-[#00C2A8]">Bridge</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <a href="#faq" className="text-sm text-[#6B7280] hover:text-[#1A1A2E] dark:text-[#9CA3AF] dark:hover:text-white">FAQ</a>
          <ThemeToggle />
          <a
            href="#waitlist"
            className="rounded-lg bg-[#0F1F3D] px-[18px] py-2 text-sm font-medium text-white hover:bg-[#162d52] dark:bg-[#00C2A8] dark:hover:bg-[#00A894]"
          >
            Join waitlist
          </a>
        </div>
      </div>
    </header>
  );
}
