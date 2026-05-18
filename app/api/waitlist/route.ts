import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WaitlistResponse = { ok: true } | { ok: false; error: string };

// ─── Validation ───────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

// ─── Handler ──────────────────────────────────────────────────────────────────
// D-037: No Supabase, no DB writes, no deduplication in Phase 0.
// Resend handles delivery only — notification to owner + confirmation to submitter.

export async function POST(
  request: Request,
): Promise<NextResponse<WaitlistResponse>> {
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
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email address" },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.WAITLIST_TO_EMAIL;

  if (!apiKey || !toEmail) {
    console.error("[waitlist] RESEND_API_KEY or WAITLIST_TO_EMAIL is not set");
    return NextResponse.json(
      { ok: false, error: "Could not save your spot — try again" },
      { status: 502 },
    );
  }

  const resend = new Resend(apiKey);

  try {
    // Notify owner
    await resend.emails.send({
      from: "Peppol Bridge <onboarding@resend.dev>",
      to: toEmail,
      subject: `New waitlist signup: ${email}`,
      text: `New waitlist signup\n\nEmail: ${email}\nTime: ${new Date().toISOString()}`,
    });

    // Confirm to submitter
    await resend.emails.send({
      from: "Peppol Bridge <onboarding@resend.dev>",
      to: email,
      subject: "You're on the Peppol Bridge waitlist",
      text: `Hi,\n\nYou're on the list. We'll email you when Peppol Bridge launches.\n\nIn the meantime, you can check if any Australian business is on the Peppol network:\nhttps://peppolbridge.com.au/lookup\n\n— Peppol Bridge`,
    });
  } catch (err) {
    console.error("[waitlist] Resend error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, error: "Could not save your spot — try again" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
