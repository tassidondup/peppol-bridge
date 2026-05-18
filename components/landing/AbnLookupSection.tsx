import { LookupForm } from "@/components/lookup/LookupForm";
import type { LookupResultState } from "@/types/lookup";

interface Props {
  initialAbn?: string;
  initialResult?: LookupResultState | null;
}

export function AbnLookupSection({ initialAbn, initialResult }: Props) {
  return (
    <section className="bg-[#0F1F3D] px-6 py-20">
      <div className="mx-auto max-w-[780px] text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[1.2px] text-[#00C2A8]">
          Free lookup tool
        </p>
        <h2 className="font-[family-name:var(--font-plus-jakarta)] mb-3 text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.8px] text-white">
          Is your ABN registered on the Peppol network?
        </h2>
        <p className="mb-9 text-base leading-[1.65] text-white/60">
          Enter any Australian Business Number to instantly check its Peppol
          directory status. No account needed — it&apos;s free.
        </p>
        <div className="rounded-[20px] border-[1.5px] border-white/10 bg-white/5 p-8">
          <LookupForm
            initialAbn={initialAbn}
            initialResult={initialResult}
            basePath="/"
          />
          <p className="mt-4 text-xs text-white/35">
            Powered by the OpenPeppol directory. Results are live from the global Peppol participant registry.
          </p>
        </div>
      </div>
    </section>
  );
}
