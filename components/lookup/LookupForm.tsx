"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LookupResult } from "./LookupResult";
import { Cta } from "./Cta";
import { validateAbn, normaliseAbn } from "@/lib/abr/validate";
import type { LookupResultState } from "@/types/lookup";
import type { AbnLookupResponse } from "@/app/api/abn-lookup/route";
import type { PeppolCheckResponse } from "@/app/api/peppol-check/route";

interface Props {
  initialAbn?: string;
  initialResult?: LookupResultState | null;
  basePath?: string;
}

export function LookupForm({
  initialAbn,
  initialResult,
  basePath = "/lookup",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [raw, setRaw] = useState(initialAbn ?? "");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResultState | null>(
    initialResult ?? null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function handleReset() {
    setResult(null);
    setRaw("");
    setInlineError(null);
    router.replace(basePath);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function runLookup(normalisedAbn: string) {
    // Fetch ABR details
    const abnRes = await fetch(`/api/abn-lookup?abn=${normalisedAbn}`);
    const abnData: AbnLookupResponse = await abnRes.json();

    if (!abnData.ok) {
      setResult({ state: "abr_error", abn: normalisedAbn });
      return;
    }

    if (abnData.abn_status === "Cancelled") {
      setResult({
        state: "abn_cancelled",
        abn: normalisedAbn,
        entity_name: abnData.entity_name,
      });
      return;
    }

    // ABN is active — check Peppol
    const peppolRes = await fetch(`/api/peppol-check?abn=${normalisedAbn}`);
    const peppolData: PeppolCheckResponse = await peppolRes.json();

    if (!peppolData.ok) {
      // Peppol check failed but ABN is valid — show not_confirmed rather than error
      setResult({
        state: "peppol_not_confirmed",
        abn: normalisedAbn,
        entity_name: abnData.entity_name,
        entity_type: abnData.entity_type,
        state_code: abnData.state_code,
      });
      return;
    }

    if (peppolData.registered) {
      setResult({
        state: "peppol_registered",
        abn: normalisedAbn,
        entity_name: abnData.entity_name,
        entity_type: abnData.entity_type,
        gst_registered: abnData.gst_registered,
        state_code: abnData.state_code,
      });
    } else {
      setResult({
        state: "peppol_not_confirmed",
        abn: normalisedAbn,
        entity_name: abnData.entity_name,
        entity_type: abnData.entity_type,
        state_code: abnData.state_code,
      });
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validation = validateAbn(raw);
    if (!validation.valid) {
      setInlineError(validation.error);
      return;
    }

    setInlineError(null);
    const { normalised } = validation;

    // Update URL so the result is shareable
    router.replace(`${basePath}?abn=${normalised}`);

    startTransition(async () => {
      await runLookup(normalised);
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRaw(e.target.value);
    // Clear inline error as soon as the user edits
    if (inlineError) setInlineError(null);
    // Clear stale result when input changes
    if (result) setResult(null);
  }

  const isLoading = isPending;
  const normalisedForDisplay = normaliseAbn(raw);
  const showInlineValidation =
    normalisedForDisplay.length === 11 && !validateAbn(raw).valid;

  return (
    <div className="w-full space-y-6">
      {/* method+action: native GET submit for no-JS path. JS intercepts via onSubmit. */}
      <form
        method="GET"
        action={basePath}
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-2"
      >
        <div className="flex-1 space-y-1">
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            name="abn"
            placeholder="Enter an ABN — e.g. 51 824 753 556"
            value={raw}
            onChange={handleChange}
            aria-label="Australian Business Number"
            aria-describedby={inlineError ? "abn-error" : undefined}
            aria-invalid={!!inlineError || showInlineValidation}
            className="font-mono text-base h-11"
            autoFocus
            autoComplete="off"
          />
          {(inlineError || showInlineValidation) && (
            <p id="abn-error" className="text-xs text-destructive px-1">
              {inlineError ?? "Invalid ABN"}
            </p>
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-11 sm:shrink-0"
          disabled={isLoading || raw.trim() === ""}
        >
          {isLoading ? "Checking…" : "Check ABN"}
        </Button>
      </form>

      {result && (
        <div className="space-y-4">
          <LookupResult result={result} />
          <Cta result={result} onReset={handleReset} />
        </div>
      )}
    </div>
  );
}
