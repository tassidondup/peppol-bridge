import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LookupResultState } from "@/types/lookup";

interface Props {
  result: LookupResultState;
  onReset?: () => void;
}

export function Cta({ result, onReset }: Props) {
  if (result.state === "invalid_abn" || result.state === "abr_error") {
    return null;
  }

  if (result.state === "abn_cancelled") {
    return (
      <div className="flex justify-center">
        <Button variant="outline" onClick={onReset}>
          Check another ABN
        </Button>
      </div>
    );
  }

  if (result.state === "peppol_registered") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/waitlist">Send them a Peppol invoice — free</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          No account required to get started
        </p>
      </div>
    );
  }

  // peppol_not_confirmed
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href="/waitlist">Help them get on Peppol</Link>
      </Button>
      <p className="text-xs text-muted-foreground">
        Join the waitlist — we&apos;ll guide you through Peppol registration
      </p>
    </div>
  );
}
