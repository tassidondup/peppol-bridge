import { NextResponse } from "next/server";
import { validateAbn } from "@/lib/abr/validate";
import { fetchAbrDetails } from "@/lib/abr/client";
import { checkPeppolRegistration } from "@/lib/peppol/directory";
import { z } from "zod";

// ─── Types ─────────────────────────────────────────────────────────────────

export type BulkCheckRow =
  | {
      ok: true;
      abn: string;
      entity_name: string;
      abn_status: string;
      peppol_registered: boolean;
      endpoint_id?: string;
    }
  | {
      ok: false;
      abn: string;
      error: string;
    };

export type BulkCheckResponse =
  | { ok: true; results: BulkCheckRow[] }
  | { ok: false; error: string };

const MAX_ABNS = 50;
const THROTTLE_MS = 300; // ~3 req/s — well within ABR's 50K/day quota

// ─── Handler ───────────────────────────────────────────────────────────────
// D-037: No Supabase, no persistence. Results are returned in-response only.

const schema = z.object({
  abns: z
    .array(z.string())
    .min(1, "Provide at least one ABN")
    .max(MAX_ABNS, `Maximum ${MAX_ABNS} ABNs per request`),
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(
  request: Request,
): Promise<NextResponse<BulkCheckResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { abns } = parsed.data;
  const results: BulkCheckRow[] = [];

  for (let i = 0; i < abns.length; i++) {
    if (i > 0) await sleep(THROTTLE_MS);

    const raw = abns[i];
    const validation = validateAbn(raw);

    if (!validation.valid) {
      results.push({ ok: false, abn: raw, error: validation.error });
      continue;
    }

    const { normalised: abn } = validation;

    let abrData;
    try {
      abrData = await fetchAbrDetails(abn);
    } catch {
      results.push({ ok: false, abn, error: "ABN lookup failed" });
      continue;
    }

    let peppolResult: { isRegistered: boolean; participantId: string } | null = null;
    try {
      peppolResult = await checkPeppolRegistration(abn);
    } catch {
      // ABR succeeded — degrade Peppol to unknown rather than failing the row
      peppolResult = null;
    }

    results.push({
      ok: true,
      abn,
      entity_name: abrData.EntityName ?? "",
      abn_status: abrData.AbnStatus ?? "Unknown",
      peppol_registered: peppolResult?.isRegistered ?? false,
      ...(peppolResult?.isRegistered
        ? { endpoint_id: peppolResult.participantId }
        : {}),
    });
  }

  return NextResponse.json({ ok: true, results });
}
