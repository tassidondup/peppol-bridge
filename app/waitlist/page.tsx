import type { Metadata } from "next";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { WaitlistForm } from "@/components/landing/WaitlistForm";

export const metadata: Metadata = {
  title: "Join the Korlo Waitlist — Early Access to AU Peppol e-Invoicing",
  description:
    "Get early access to Korlo and be first to send Peppol e-invoices to Australian government agencies from Xero, MYOB, or QuickBooks. Waitlist members get early access pricing.",
  alternates: { canonical: "https://korlo.com.au/waitlist" },
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ reason?: string }>;
}

const HEADLINES: Record<string, { heading: string; sub: string }> = {
  send: {
    heading: "Ready to send Peppol invoices?",
    sub: "Join the waitlist and be first when we launch.",
  },
  notify: {
    heading: "We'll notify you when they join Peppol",
    sub: "Leave your email and we'll let you know as soon as they're reachable.",
  },
};

const DEFAULT = {
  heading: "Get early access to Korlo",
  sub: "We're building Korlo for Australian businesses who want compliance without the complexity. Waitlist members get early access pricing.",
};

export default async function WaitlistPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const copy = (reason ? HEADLINES[reason] : undefined) ?? DEFAULT;

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB] dark:bg-[#071A0E]">
      <Nav />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[440px]">
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 py-1.5 text-[13px] font-medium text-[#065F46] dark:bg-[#10B981]/10 dark:text-[#10B981]">
              <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#10B981]" />
              Accepting waitlist signups
            </div>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] mb-3 text-[clamp(26px,4vw,36px)] font-bold tracking-[-0.6px] text-[#052E16] dark:text-white">
              {copy.heading}
            </h1>
            <p className="text-[15px] leading-[1.65] text-[#6B7280]">
              {copy.sub}
            </p>
          </div>
          <WaitlistForm />
          <p className="mt-3 text-[13px] text-[#6B7280]">No spam. Unsubscribe anytime. 🇦🇺</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
