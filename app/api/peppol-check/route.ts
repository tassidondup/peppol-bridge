import { NextResponse } from "next/server";
import { validateAbn } from "@/lib/abr/validate";
import { checkPeppolRegistration } from "@/lib/peppol/directory";

// ─── Response type ────────────────────────────────────────────────────────────

// "registered: false" means "not confirmed on Peppol" — not "definitely not registered".
// Publishing to the Peppol Directory is required in AU but not globally enforced.
export type PeppolCheckResponse =
  | { ok: true; registered: true; endpoint_id: string }
  | { ok: true; registered: false }
  | { ok: false; error: string };

// ─── Handler ─────────────────────────────────────────────────────────────────
// D-037: No Supabase, caching, or rate limiting in Phase 0.
// Cache (peppol_endpoint_cache 1hr TTL) and rate limiting (rate_limit_buckets)
// are added in Phase 1 when Supabase is fully provisioned.

export async function GET(
  request: Request,
): Promise<NextResponse<PeppolCheckResponse>> {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("abn") ?? "";

  const validation = validateAbn(raw);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }
  const { normalised: abn } = validation;

  let result;
  try {
    result = await checkPeppolRegistration(abn);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Peppol Directory check failed — try again" },
      { status: 502 },
    );
  }

  if (result.isRegistered) {
    return NextResponse.json({
      ok: true,
      registered: true,
      endpoint_id: result.participantId,
    });
  }

  return NextResponse.json({ ok: true, registered: false });
}
