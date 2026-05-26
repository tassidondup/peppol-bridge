import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-[rgba(249,250,251,0.92)] backdrop-blur-[12px] dark:border-white/8 dark:bg-[rgba(7,26,14,0.92)]">
      <div className="mx-auto flex h-[60px] max-w-[1100px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#052E16] dark:bg-[#10B981]/20">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="2" y="7" width="3" height="8" rx="1.5" fill="white" />
              <rect x="13" y="7" width="3" height="8" rx="1.5" fill="white" />
              <rect x="4" y="9" width="10" height="2" rx="1" fill="#10B981" />
              <circle cx="3.5" cy="5" r="2.5" fill="white" />
              <circle cx="14.5" cy="5" r="2.5" fill="white" />
            </svg>
          </div>
          <span className="font-[family-name:var(--font-plus-jakarta)] text-[17px] font-bold tracking-[-0.3px] text-[#052E16] dark:text-white">
            Korlo
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/bulk"
            className="text-sm text-[#6B7280] hover:text-[#052E16] dark:text-[#9CA3AF] dark:hover:text-white"
          >
            Bulk check
          </Link>
          <Link
            href="/#faq"
            className="text-sm text-[#6B7280] hover:text-[#052E16] dark:text-[#9CA3AF] dark:hover:text-white"
          >
            FAQ
          </Link>
          <ThemeToggle />
          <Link
            href="/#waitlist"
            className="rounded-lg bg-[#052E16] px-[18px] py-2 text-sm font-medium text-white hover:bg-[#064E3B] dark:bg-[#10B981] dark:hover:bg-[#059669]"
          >
            Join waitlist
          </Link>
        </div>
      </div>
    </header>
  );
}
