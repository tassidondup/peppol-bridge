import type { Metadata } from "next";
import { LookupForm } from "@/components/lookup/LookupForm";
import { validateAbn } from "@/lib/abr/validate";
import { fetchAbrDetails } from "@/lib/abr/client";
import { checkPeppolRegistration } from "@/lib/peppol/directory";
import type { LookupResultState } from "@/types/lookup";

export const metadata: Metadata = {
  title: "Is your supplier on Peppol? — Peppol Bridge",
  description:
    "Check if any Australian business is registered on the Peppol e-invoicing network. Enter their ABN to find out instantly.",
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
    // Peppol check failed — degrade gracefully to not_confirmed
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

  // Server-side lookup when ?abn= is present — result renders without JS
  const serverResult = rawAbn ? await resolveServerResult(rawAbn) : null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl space-y-10">
        {/* Header */}
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Is your supplier on Peppol?
          </h1>
          <p className="text-muted-foreground">
            Enter their ABN to check if they can receive e-invoices via the
            Australian Peppol network.
          </p>
        </div>

        {/* Interactive form — takes over from the server result once JS loads */}
        <LookupForm initialAbn={rawAbn} initialResult={serverResult} />

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          ABN data sourced from the{" "}
          <a
            href="https://abr.business.gov.au"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Australian Business Register
          </a>
          . Peppol registration data from the{" "}
          <a
            href="https://directory.peppol.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Peppol Directory
          </a>
          .
        </p>
      </div>
    </main>
  );
}
