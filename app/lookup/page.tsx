import type { Metadata } from "next";
import { LookupForm } from "@/components/lookup/LookupForm";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { validateAbn } from "@/lib/abr/validate";
import { fetchAbrDetails } from "@/lib/abr/client";
import { checkPeppolRegistration } from "@/lib/peppol/directory";
import type { LookupResultState } from "@/types/lookup";

export const metadata: Metadata = {
  title: "ABN Peppol Lookup — Check if a Business is on the Peppol Network",
  description:
    "Check if any Australian business is registered on the Peppol e-invoicing network. Enter their ABN to find out instantly — free, no account required.",
  alternates: { canonical: "https://korlo.com.au/lookup" },
  openGraph: {
    title: "Free ABN Peppol Lookup — Is Your Supplier on the Peppol Network?",
    description:
      "Enter any ABN to instantly check Peppol registration status. Powered by the Peppol Directory and Australian Business Register.",
    url: "https://korlo.com.au/lookup",
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
    return {
      state: "abn_cancelled",
      abn,
      entity_name: abrData.EntityName ?? "",
    };
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

export default async function LookupPage({ searchParams }: Props) {
  const { abn: rawAbn } = await searchParams;
  const serverResult = rawAbn ? await resolveServerResult(rawAbn) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB] dark:bg-[#071A0E]">
      <Nav />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl space-y-10">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[1.2px] text-[#10B981]">
              Free lookup tool
            </p>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.8px] text-[#052E16] dark:text-white">
              Is your supplier on Peppol?
            </h1>
            <p className="text-[#6B7280]">
              Enter their ABN to check if they can receive e-invoices via the
              Australian Peppol network.
            </p>
          </div>
          <LookupForm initialAbn={rawAbn} initialResult={serverResult} />
          <p className="text-center text-xs text-[#6B7280]">
            ABN data sourced from the{" "}
            <a
              href="https://abr.business.gov.au"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[#052E16] dark:hover:text-white"
            >
              Australian Business Register
            </a>
            . Peppol registration data from the{" "}
            <a
              href="https://directory.peppol.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[#052E16] dark:hover:text-white"
            >
              Peppol Directory
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
