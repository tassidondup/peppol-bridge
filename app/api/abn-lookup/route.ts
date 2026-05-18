import { NextResponse } from "next/server";
import { validateAbn } from "@/lib/abr/validate";
import { fetchAbrDetails } from "@/lib/abr/client";

// ─── Response type ────────────────────────────────────────────────────────────

export type AbnLookupResponse =
  | {
      ok: true;
      abn: string;
      entity_name: string;
      entity_type: string | null;
      abn_status: "Active" | "Cancelled" | string;
      gst_registered: boolean;
      state_code: string | null;
    }
  | { ok: false; error: string };

// ─── Handler ─────────────────────────────────────────────────────────────────
// D-037: No Supabase, caching, or rate limiting in Phase 0.
// Cache (abn_lookup_cache 24hr TTL) and rate limiting (rate_limit_buckets)
// are added in Phase 1 when Supabase is fully provisioned.

export async function GET(
  request: Request,
): Promise<NextResponse<AbnLookupResponse>> {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("abn") ?? "";

  // Validate locally — never call ABR API for an invalid ABN
  const validation = validateAbn(raw);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }
  const { normalised: abn } = validation;

  let abrData;
  try {
    abrData = await fetchAbrDetails(abn);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[abn-lookup]", message);
    return NextResponse.json(
      { ok: false, error: "ABN lookup failed — try again" },
      { status: 502 },
    );
  }

  const gstRegistered = Boolean(abrData.Gst && abrData.Gst.trim() !== "");

  return NextResponse.json({
    ok: true,
    abn,
    entity_name: abrData.EntityName ?? "",
    entity_type: abrData.EntityTypeName ?? null,
    abn_status: abrData.AbnStatus ?? "Unknown",
    gst_registered: gstRegistered,
    state_code: abrData.AddressState ?? null,
  });
}
