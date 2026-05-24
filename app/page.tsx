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

export const metadata: Metadata = {
  title: "Korlo — Send Peppol invoices from Xero in 90 seconds",
  description:
    "Australian businesses must accept Peppol e-invoices from July 2026. Korlo makes sending them from Xero take 90 seconds.",
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
    <div className="flex min-h-screen flex-col bg-[#F8F9FB] dark:bg-[#0C1120]">
      <Nav />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <AbnLookupSection initialAbn={rawAbn} initialResult={serverResult} />
        <MandateContext />
        <HowItWorks />
        <Integrations />
        <FaqSection />

        {/* Bottom CTA */}
        <section id="waitlist" className="mx-auto max-w-[1100px] px-6 py-24 text-center">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] mb-3.5 text-[clamp(30px,4vw,48px)] font-extrabold tracking-[-1px] text-[#0F1F3D] dark:text-white">
            Be first when we launch.
          </h2>
          <p className="mb-10 text-[17px] text-[#6B7280]">
            We&apos;re building Korlo for Australian businesses who want compliance
            without the complexity. Waitlist members get early access pricing.
          </p>
          <div className="mx-auto max-w-[480px]">
            <WaitlistForm />
            <p className="mt-2.5 text-[13px] text-[#6B7280]">No spam. Unsubscribe anytime. 🇦🇺</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
