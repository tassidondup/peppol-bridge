import type { Metadata } from "next";
import { BulkChecker } from "@/components/bulk/BulkChecker";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Bulk ABN Peppol Checker — Check Your Client List for Free",
  description:
    "Upload a CSV of ABNs to bulk-check Peppol e-invoicing registration status across your entire client or supplier list. Free, no account needed. Up to 50 ABNs at once.",
  alternates: { canonical: "https://korlo.com.au/bulk" },
  openGraph: {
    title: "Bulk ABN Peppol Checker — Free for Australian Businesses",
    description:
      "Check your entire client list for Peppol registration in one upload. Free, no account needed. Up to 50 ABNs at once.",
    url: "https://korlo.com.au/bulk",
  },
};

export default function BulkPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB] dark:bg-[#071A0E]">
      <Nav />
      <main className="flex-1">
        <section className="mx-auto max-w-[860px] px-6 py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[1.2px] text-[#10B981]">
            Bulk lookup — free
          </p>
          <h1 className="font-[family-name:var(--font-plus-jakarta)] mb-4 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1px] text-[#052E16] dark:text-white">
            Check your whole client list for Peppol.
          </h1>
          <p className="mb-10 max-w-[580px] text-[17px] leading-[1.7] text-[#6B7280]">
            Upload a CSV with one ABN per row. We&apos;ll check each one against
            the ABR and the Peppol Directory — up to 50 at a time. Download the
            results when done.
          </p>
          <BulkChecker />
        </section>
      </main>
      <Footer />
    </div>
  );
}
