"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What is Peppol, and do I actually need it?",
    a: "Peppol is an international standard for electronic invoicing adopted by Australia as the national e-invoicing standard. If you invoice government agencies, or trade with businesses that are Peppol-enabled, you need to be registered. Early adoption makes you a more attractive supplier and future-proofs your invoicing process.",
  },
  {
    q: "Is Peppol e-invoicing mandatory for Australian SMBs?",
    a: "Australian Government agencies are required to be able to receive Peppol e-invoices from their suppliers. For SMBs, it's not universally mandatory yet — but the ATO is actively promoting adoption and requirements are expanding. If you supply to government or large enterprise buyers, it's likely already relevant to you.",
  },
  {
    q: "How is this different from just using Xero's Peppol feature?",
    a: "Xero's Peppol support is buried in settings and poorly documented — most users don't know it's there or how to configure it correctly. Korlo is a dedicated product with guided onboarding, clear status indicators, multi-entity support for bookkeepers, and better error handling.",
  },
  {
    q: "Do I need an IT team or technical knowledge?",
    a: "No. Korlo is built for business owners and bookkeepers — not developers. Setup takes minutes, not days. You enter your ABN, connect your accounting tool, and we handle everything on the technical side.",
  },
  {
    q: "I'm a bookkeeper managing multiple clients. How does that work?",
    a: "Korlo includes a multi-entity dashboard designed specifically for bookkeepers and BAS agents. You can manage Peppol registration, invoice status, and compliance for all your clients from a single login.",
  },
  {
    q: "When will Korlo launch, and how much will it cost?",
    a: "We're currently in pre-launch. Waitlist members will be first to access Korlo and will receive early access pricing. Join the waitlist and we'll keep you posted on timing and pricing as we approach launch.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="border-t border-[#E5E7EB] bg-[#F8F9FB] px-6 py-[88px] dark:border-white/10 dark:bg-[#0C1120]">
      <div className="mx-auto max-w-[780px]">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[1.2px] text-[#00C2A8]">
          Common questions
        </p>
        <h2 className="font-[family-name:var(--font-plus-jakarta)] mb-11 text-[clamp(26px,4vw,36px)] font-bold tracking-[-0.6px] text-[#0F1F3D] dark:text-white">
          Everything you need to know.
        </h2>
        <div className="flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-[#111827]"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-[15px] font-semibold text-[#0F1F3D] dark:text-white"
              >
                {faq.q}
                <ChevronDown
                  className={`h-[18px] w-[18px] shrink-0 text-[#6B7280] transition-transform ${openIndex === i ? "rotate-180" : ""}`}
                />
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 text-sm leading-[1.75] text-[#6B7280]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
