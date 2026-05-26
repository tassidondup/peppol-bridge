import type { Metadata } from "next";
import { validateAbn } from "@/lib/abr/validate";
import { fetchAbrDetails } from "@/lib/abr/client";
import { checkPeppolRegistration } from "@/lib/peppol/directory";
import type { LookupResultState } from "@/types/lookup";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { AbnLookupSection } from "@/components/landing/AbnLookupSection";
import { MandateContext } from "@/components/landing/MandateContext";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Integrations } from "@/components/landing/Integrations";
import { FaqSection } from "@/components/landing/FaqSection";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { RevealSection } from "@/components/ui/reveal-section";

export const metadata: Metadata = {
  title: "Korlo — Invoice government. Get paid in 5 days.",
  description:
    "AU government agencies pay Peppol invoices in 5 days — not 35. Korlo sends them from Xero, MYOB, or QuickBooks in 90 seconds.",
  alternates: { canonical: "https://korlo.com.au" },
  openGraph: {
    title: "Invoice government. Get paid in 5 days.",
    description:
      "AU government agencies pay Peppol invoices in 5 days — not 35. Korlo connects to Xero, MYOB, and QuickBooks.",
    url: "https://korlo.com.au",
  },
};

interface Props {
  searchParams: Promise<{ abn?: string }>;
}

async function resolveServerResult(
  rawAbn: string,
): Promise<LookupResultState | null> {
  const validation = validateAbn(rawAbn);
  if (!validation.valid) {
    return { state: "invalid_abn", error: validation.error };
  }

  const { normalised: abn } = validation;

  let abrData;
  try {
    abrData = await fetchAbrDetails(abn);
  } catch {
    return { state: "abr_error", abn };
  }

  if (abrData.AbnStatus === "Cancelled") {
    return { state: "abn_cancelled", abn, entity_name: abrData.EntityName ?? "" };
  }

  let peppolResult;
  try {
    peppolResult = await checkPeppolRegistration(abn);
  } catch {
    return {
      state: "peppol_not_confirmed",
      abn,
      entity_name: abrData.EntityName ?? "",
      entity_type: abrData.EntityTypeName ?? null,
      state_code: abrData.AddressState ?? null,
    };
  }

  if (peppolResult.isRegistered) {
    return {
      state: "peppol_registered",
      abn,
      entity_name: abrData.EntityName ?? "",
      entity_type: abrData.EntityTypeName ?? null,
      gst_registered: Boolean(abrData.Gst && abrData.Gst.trim() !== ""),
      state_code: abrData.AddressState ?? null,
    };
  }

  return {
    state: "peppol_not_confirmed",
    abn,
    entity_name: abrData.EntityName ?? "",
    entity_type: abrData.EntityTypeName ?? null,
    state_code: abrData.AddressState ?? null,
  };
}

export default async function HomePage({ searchParams }: Props) {
  const { abn: rawAbn } = await searchParams;
  const serverResult = rawAbn ? await resolveServerResult(rawAbn) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB] dark:bg-[#071A0E]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Korlo",
              url: "https://korlo.com.au",
              description: "AU Peppol e-invoicing SaaS for Australian SMBs and bookkeepers.",
              areaServed: "AU",
              foundingLocation: { "@type": "Country", name: "Australia" },
            },
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Korlo",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "AUD",
                description: "Free tier available. Paid plans from AUD $29/month.",
              },
              description:
                "Send Peppol e-invoices to Australian government agencies from Xero, MYOB, or QuickBooks in 90 seconds.",
              url: "https://korlo.com.au",
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is Peppol, and do I actually need it?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Peppol is an international standard for electronic invoicing adopted by Australia as the national e-invoicing standard. If you invoice government agencies, or trade with businesses that are Peppol-enabled, you need to be registered. Early adoption makes you a more attractive supplier and future-proofs your invoicing process.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is Peppol e-invoicing mandatory for Australian SMBs?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Australian Government agencies are required to be able to receive Peppol e-invoices from their suppliers. For SMBs, it's not universally mandatory yet — but the ATO is actively promoting adoption and requirements are expanding. If you supply to government or large enterprise buyers, it's likely already relevant to you.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How is this different from just using Xero's Peppol feature?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Xero's Peppol support is buried in settings and poorly documented — most users don't know it's there or how to configure it correctly. Korlo is a dedicated product with guided onboarding, clear status indicators, multi-entity support for bookkeepers, and better error handling.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Do I need an IT team or technical knowledge?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "No. Korlo is built for business owners and bookkeepers — not developers. Setup takes minutes, not days. You enter your ABN, connect your accounting tool, and we handle everything on the technical side.",
                  },
                },
                {
                  "@type": "Question",
                  name: "I'm a bookkeeper managing multiple clients. How does that work?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Korlo includes a multi-entity dashboard designed specifically for bookkeepers and BAS agents. You can manage Peppol registration, invoice status, and compliance for all your clients from a single login.",
                  },
                },
                {
                  "@type": "Question",
                  name: "When will Korlo launch, and how much will it cost?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "We're currently in pre-launch. Waitlist members will be first to access Korlo and will receive early access pricing. Join the waitlist and we'll keep you posted on timing and pricing as we approach launch.",
                  },
                },
              ],
            },
          ]),
        }}
      />
      <Nav />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <RevealSection>
          <AbnLookupSection initialAbn={rawAbn} initialResult={serverResult} />
        </RevealSection>
        <RevealSection>
          <MandateContext />
        </RevealSection>
        <RevealSection>
          <HowItWorks />
        </RevealSection>
        <RevealSection>
          <Integrations />
        </RevealSection>
        <RevealSection>
          <FaqSection />
        </RevealSection>

        {/* Bottom CTA */}
        <RevealSection>
          <section id="waitlist" className="mx-auto max-w-[1100px] px-6 py-24 text-center">
            <h2 className="font-[family-name:var(--font-plus-jakarta)] mb-3.5 text-[clamp(30px,4vw,48px)] font-extrabold tracking-[-1px] text-[#052E16] dark:text-white">
              Get paid in 5 days, not 35.
            </h2>
            <p className="mb-10 text-[17px] text-[#6B7280]">
              AU government agencies are required to pay Peppol invoices within 5
              business days. Korlo gets you on the network fast. Waitlist members
              get early access pricing.
            </p>
            <div className="mx-auto max-w-[480px]">
              <WaitlistForm />
              <p className="mt-2.5 text-[13px] text-[#6B7280]">No spam. Unsubscribe anytime. 🇦🇺</p>
            </div>
          </section>
        </RevealSection>
      </main>
      <Footer />
    </div>
  );
}
