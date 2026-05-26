import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LookupResultState } from "@/types/lookup";

interface Props {
  result: LookupResultState;
  onReset?: () => void;
  /** Where "Notify me" scrolls or navigates to. "#waitlist" scrolls in-page; "/waitlist" navigates. */
  notifyHref?: string;
}

export function Cta({ result, onReset, notifyHref = "#waitlist" }: Props) {
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

  // peppol_not_confirmed — all other states returned early above
  const { abn, entity_name: entityName } = result as Extract<
    LookupResultState,
    { state: "peppol_not_confirmed" }
  >;

  const isInPage = notifyHref.startsWith("#");

  function handleNotify() {
    if (isInPage) {
      document.getElementById(notifyHref.slice(1))?.scrollIntoView({ behavior: "smooth" });
      window.dispatchEvent(new CustomEvent("korlo:notify", { detail: { abn } }));
    } else {
      window.location.href = notifyHref;
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Button size="lg" className="w-full sm:w-auto" onClick={handleNotify}>
        {entityName
          ? `Notify me when ${entityName} registers`
          : "Notify me when they register"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Join the waitlist — we&apos;ll alert you when they go live on Peppol
      </p>
    </div>
  );
}
