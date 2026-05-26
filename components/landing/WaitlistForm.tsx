"use client";

import { useState, useTransition, useEffect } from "react";
import type { WaitlistResponse } from "@/app/api/waitlist/route";

interface Props {
  agencyAbn?: string;
}

export function WaitlistForm({ agencyAbn: initialAgencyAbn }: Props) {
  const [email, setEmail] = useState("");
  const [agencyAbn, setAgencyAbn] = useState(initialAgencyAbn ?? "");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleNotify(e: Event) {
      const detail = (e as CustomEvent<{ abn: string }>).detail;
      if (detail?.abn) setAgencyAbn(detail.abn);
    }
    window.addEventListener("korlo:notify", handleNotify);
    return () => window.removeEventListener("korlo:notify", handleNotify);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (inlineError) setInlineError(null);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) {
      setInlineError("Please enter your email address");
      return;
    }

    startTransition(async () => {
      try {
        const body: Record<string, string> = { email: email.trim() };
        if (agencyAbn) body.agency_abn = agencyAbn;

        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data: WaitlistResponse = await res.json();

        if (!data.ok) {
          setInlineError(data.error);
          return;
        }

        setSubmitted(true);
      } catch {
        setInlineError("Could not save your spot — try again");
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-[#10B981]/30 bg-[#ECFDF5] px-5 py-4 text-sm font-medium text-[#065F46] dark:bg-[#10B981]/10 dark:text-[#10B981]">
        You&apos;re on the list. We&apos;ll be in touch. ✓
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1 space-y-1">
        <input
          type="email"
          inputMode="email"
          placeholder="your@email.com"
          value={email}
          onChange={handleChange}
          aria-label="Email address"
          aria-describedby={inlineError ? "waitlist-error" : undefined}
          aria-invalid={!!inlineError}
          disabled={isPending}
          autoComplete="email"
          className="h-11 w-full rounded-lg border-[1.5px] border-[#E5E7EB] bg-white px-4 text-sm text-[#052E16] outline-none placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)] disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30"
        />
        {inlineError && (
          <p id="waitlist-error" className="px-1 text-xs text-red-500">
            {inlineError}
          </p>
        )}
        {agencyAbn && (
          <p className="px-1 text-xs text-[#6B7280]">
            We&apos;ll notify you when ABN {agencyAbn} registers on Peppol.
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending || email.trim() === ""}
        className="relative h-11 shrink-0 overflow-hidden rounded-lg bg-[#10B981] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-50 after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-white/25 after:to-transparent hover:after:translate-x-full after:transition-transform after:duration-500 after:ease-out"
      >
        {isPending ? "Saving…" : "Join waitlist"}
      </button>
    </form>
  );
}
