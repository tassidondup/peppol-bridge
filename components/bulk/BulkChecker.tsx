"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { normaliseAbn, validateAbn } from "@/lib/abr/validate";
import type { BulkCheckResponse, BulkCheckRow } from "@/app/api/bulk-check/route";

const MAX_ABNS = 50;

type Phase = "idle" | "loading" | "done" | "error";

function parseAbnsFromCsv(text: string): { abns: string[]; totalFound: number } {
  const all: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    for (const cell of line.split(",")) {
      const candidate = normaliseAbn(cell.trim());
      if (/^\d{9,11}$/.test(candidate)) {
        all.push(candidate);
        break;
      }
    }
  }
  return { abns: all.slice(0, MAX_ABNS), totalFound: all.length };
}

function downloadCsv(rows: BulkCheckRow[]) {
  const header = "ABN,Entity Name,ABN Status,Peppol Registered,Endpoint ID,Error";
  const lines = rows.map((r) => {
    if (!r.ok) {
      return [r.abn, "", "", "", "", `"${r.error}"`].join(",");
    }
    return [
      r.abn,
      `"${r.entity_name}"`,
      r.abn_status,
      r.peppol_registered ? "Yes" : "No",
      r.endpoint_id ?? "",
      "",
    ].join(",");
  });
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `peppol-bulk-check-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkChecker() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [abns, setAbns] = useState<string[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [results, setResults] = useState<BulkCheckRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setErrorMsg("Please upload a CSV file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { abns: found, totalFound: total } = parseAbnsFromCsv(text);
      if (found.length === 0) {
        setErrorMsg("No valid ABNs found in the file. Make sure each row has an 11-digit ABN.");
        return;
      }
      setErrorMsg(null);
      setAbns(found);
      setTotalFound(total);
      setPhase("idle");
      setResults([]);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleRun() {
    if (abns.length === 0) return;
    setPhase("loading");
    setResults([]);
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/bulk-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ abns }),
        });
        const data: BulkCheckResponse = await res.json();
        if (!data.ok) {
          setErrorMsg(data.error);
          setPhase("error");
          return;
        }
        setResults(data.results);
        setPhase("done");
      } catch {
        setErrorMsg("Network error — please try again.");
        setPhase("error");
      }
    });
  }

  function handleReset() {
    setPhase("idle");
    setAbns([]);
    setTotalFound(0);
    setResults([]);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const registered = results.filter((r) => r.ok && r.peppol_registered).length;
  const notRegistered = results.filter((r) => r.ok && !r.peppol_registered).length;
  const failed = results.filter((r) => !r.ok).length;

  return (
    <div className="space-y-8">
      {/* Upload zone */}
      {phase !== "done" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-16 transition-colors",
            dragOver
              ? "border-[#10B981] bg-[#ECFDF5]"
              : "border-[#E5E7EB] bg-white hover:border-[#10B981]/50 dark:border-white/10 dark:bg-white/5",
          ].join(" ")}
        >
          <svg width="40" height="40" fill="none" viewBox="0 0 40 40">
            <rect width="40" height="40" rx="10" fill="#ECFDF5" />
            <path d="M20 12v12M14 18l6-6 6 6" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 28h16" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#052E16] dark:text-white">
              {abns.length > 0
                ? `${abns.length} ABN${abns.length === 1 ? "" : "s"} ready`
                : "Drop your CSV here, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              One ABN per row · up to {MAX_ABNS} · CSV only
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      )}

      {errorMsg && (
        <p className="text-sm text-red-500">{errorMsg}</p>
      )}

      {totalFound > MAX_ABNS && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          Your file has {totalFound} ABNs — only the first {MAX_ABNS} will be checked.
          Split your list into batches of {MAX_ABNS} to check the rest.
        </div>
      )}

      {/* Actions */}
      {abns.length > 0 && phase !== "done" && (
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={handleRun}
            disabled={isPending || phase === "loading"}
          >
            {phase === "loading"
              ? `Checking ${abns.length} ABNs…`
              : `Check ${abns.length} ABN${abns.length === 1 ? "" : "s"}`}
          </Button>
          <Button variant="outline" size="lg" onClick={handleReset}>
            Clear
          </Button>
        </div>
      )}

      {/* Loading state */}
      {phase === "loading" && (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-white/10">
            <div className="h-full animate-pulse rounded-full bg-[#10B981]" style={{ width: "60%" }} />
          </div>
          <p className="text-xs text-[#6B7280]">
            This takes ~{Math.ceil(abns.length * 0.6)} seconds — please wait.
          </p>
        </div>
      )}

      {/* Results */}
      {phase === "done" && results.length > 0 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "On Peppol", value: registered, color: "text-[#065F46]", bg: "bg-[#ECFDF5]" },
              { label: "Not on Peppol", value: notRegistered, color: "text-[#052E16] dark:text-white", bg: "bg-white dark:bg-white/5" },
              { label: "Lookup failed", value: failed, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/10" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border border-[#E5E7EB] dark:border-white/10 ${s.bg} px-5 py-4`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-[#6B7280]">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button size="lg" onClick={() => downloadCsv(results)}>
              Download results CSV
            </Button>
            <Button variant="outline" size="lg" onClick={handleReset}>
              Check another list
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] dark:border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8F9FB] dark:border-white/10 dark:bg-white/5">
                  {["ABN", "Entity name", "ABN status", "Peppol"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/10">
                {results.map((row, i) => (
                  <tr key={i} className="bg-white dark:bg-transparent">
                    {row.ok ? (
                      <>
                        <td className="px-4 py-3 font-mono text-xs text-[#052E16] dark:text-white">{row.abn}</td>
                        <td className="px-4 py-3 text-[#052E16] dark:text-white">{row.entity_name || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={[
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                            row.abn_status === "Active"
                              ? "bg-[#ECFDF5] text-[#065F46]"
                              : "bg-red-50 text-red-600 dark:bg-red-900/20",
                          ].join(" ")}>
                            {row.abn_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={[
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                            row.peppol_registered
                              ? "bg-[#ECFDF5] text-[#065F46]"
                              : "bg-[#F3F4F6] text-[#6B7280] dark:bg-white/10",
                          ].join(" ")}>
                            {row.peppol_registered ? "✓ Registered" : "Not registered"}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono text-xs text-[#052E16] dark:text-white">{row.abn}</td>
                        <td className="px-4 py-3 text-xs text-red-500" colSpan={3}>{row.error}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
