"use client";

import { useState, useTransition } from "react";
import type { WaitlistResponse } from "@/app/api/waitlist/route";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (inlineError) setInlineError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) {
      setInlineError("Please enter your email address");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
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
      <div className="rounded-xl border border-[#00C2A8]/30 bg-[#E6FAF7] px-5 py-4 text-sm font-medium text-[#007A6B]">
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
          className="h-11 w-full rounded-lg border-[1.5px] border-[#E5E7EB] bg-white px-4 text-sm text-[#1A1A2E] outline-none placeholder:text-[#9CA3AF] focus:border-[#00C2A8] focus:shadow-[0_0_0_3px_rgba(0,194,168,0.12)] disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30"
        />
        {inlineError && (
          <p id="waitlist-error" className="px-1 text-xs text-red-500">
            {inlineError}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending || email.trim() === ""}
        className="h-11 shrink-0 rounded-lg bg-[#00C2A8] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#00A894] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Join waitlist"}
      </button>
    </form>
  );
}
