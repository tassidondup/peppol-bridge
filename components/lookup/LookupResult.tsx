import { cn } from "@/lib/utils";
import type { LookupResultState } from "@/types/lookup";

interface Props {
  result: LookupResultState;
}

function formatAbn(abn: string): string {
  // Display as XX XXX XXX XXX
  return `${abn.slice(0, 2)} ${abn.slice(2, 5)} ${abn.slice(5, 8)} ${abn.slice(8)}`;
}

export function LookupResult({ result }: Props) {
  if (result.state === "invalid_abn") {
    return (
      <ResultCard intent="error">
        <StatusIcon intent="error" />
        <div>
          <p className="font-medium text-destructive">Invalid ABN</p>
          <p className="text-sm text-muted-foreground mt-0.5">{result.error}</p>
        </div>
      </ResultCard>
    );
  }

  if (result.state === "abr_error") {
    return (
      <ResultCard intent="warning">
        <StatusIcon intent="warning" />
        <div>
          <p className="font-medium">ABN lookup failed</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            The ABR service is unavailable. Try again shortly.
          </p>
        </div>
      </ResultCard>
    );
  }

  if (result.state === "abn_cancelled") {
    return (
      <ResultCard intent="error">
        <StatusIcon intent="error" />
        <div>
          <p className="font-medium text-destructive">This ABN is cancelled</p>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">
            ABN {formatAbn(result.abn)} · {result.entity_name}
          </p>
        </div>
      </ResultCard>
    );
  }

  if (result.state === "peppol_not_confirmed") {
    return (
      <ResultCard intent="warning">
        <StatusIcon intent="warning" />
        <div>
          <p className="font-medium">{result.entity_name} is not confirmed on Peppol</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono">ABN {formatAbn(result.abn)}</span>
            {result.state_code ? ` · ${result.state_code}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Not found in the Peppol Directory. They may still be registered but not yet
            published.
          </p>
        </div>
      </ResultCard>
    );
  }

  // peppol_registered
  return (
    <ResultCard intent="success">
      <StatusIcon intent="success" />
      <div>
        <p className="font-medium text-green-700 dark:text-green-400">
          {result.entity_name} is on the Peppol network
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          <span className="font-mono">ABN {formatAbn(result.abn)}</span>
          {result.state_code ? ` · ${result.state_code}` : ""}
          {result.gst_registered ? " · GST registered" : ""}
        </p>
      </div>
    </ResultCard>
  );
}

// ─── Internal sub-components ─────────────────────────────────────────────────

type Intent = "success" | "warning" | "error";

function ResultCard({
  intent,
  children,
}: {
  intent: Intent;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        intent === "success" &&
          "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30",
        intent === "warning" &&
          "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
        intent === "error" &&
          "border-destructive/20 bg-destructive/5 dark:border-destructive/30",
      )}
    >
      {children}
    </div>
  );
}

function StatusIcon({ intent }: { intent: Intent }) {
  if (intent === "success") {
    return (
      <span className="mt-0.5 text-green-600 dark:text-green-400 shrink-0 text-lg leading-none">
        ✓
      </span>
    );
  }
  if (intent === "warning") {
    return (
      <span className="mt-0.5 text-amber-600 dark:text-amber-400 shrink-0 text-lg leading-none">
        ⚠
      </span>
    );
  }
  return (
    <span className="mt-0.5 text-destructive shrink-0 text-lg leading-none">✕</span>
  );
}
