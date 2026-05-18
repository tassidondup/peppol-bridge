# Session Log — Phase 0 ABN Peppol Lookup

**Date:** 2026-05-18
**Task file:** `tasks/task-phase-0-abn-peppol-lookup.md`
**Status:** Complete (Phase 0 scope — caching and rate limiting deferred to Phase 1 per D-037)

---

## What Was Built

| File | Description |
|---|---|
| `lib/abr/validate.ts` | Pure ABN checksum validation — weights `[10,1,3,5,7,9,11,13,15,17,19]`, subtract 1 from first digit, sum % 89 === 0 |
| `lib/abr/client.ts` | ABR API fetch — strips `callback(...)` JSONP wrapper, reads `ABR_GUID` from env |
| `lib/abr/types.ts` | `AbrResponse` and `AbrCacheRow` interfaces |
| `lib/peppol/directory.ts` | Peppol Directory check via `directory.peppol.eu` search API |
| `app/api/abn-lookup/route.ts` | Route Handler — validates ABN, calls ABR, returns `AbnLookupResponse` |
| `app/api/peppol-check/route.ts` | Route Handler — validates ABN, calls Peppol Directory, returns `PeppolCheckResponse` |
| `types/lookup.ts` | Discriminated union for all five `LookupResultState` variants |
| `components/lookup/LookupResult.tsx` | Pure display component — all five result states |
| `components/lookup/Cta.tsx` | CTA varies by result state — links to `/waitlist` |
| `components/lookup/LookupForm.tsx` | Client component — form with no-JS fallback, `useTransition` for async state |
| `app/lookup/page.tsx` | Server component — SSR for `?abn=` param, passes `initialResult` to `LookupForm` |

---

## Decisions Made During This Session

**D-037 · No Supabase, no caching, no rate limiting in Phase 0**
- Decided mid-session after initial build included Supabase imports
- All caching (`abn_lookup_cache`, `peppol_endpoint_cache`) and rate limiting (`rate_limit_buckets`) deferred to Phase 1
- See `decision-log.md` D-037

**D-038 · Peppol Directory API: directory.peppol.eu instead of peppol.helger.com**
- `peppol.helger.com/api/ppidexistence/digitprod/` returned HTTP 400 during testing
- Switched to official OpenPeppol-operated directory: `https://directory.peppol.eu/search/1.0/json?participant=...`
- Registered = `total-result-count > 0` in the JSON response
- See `decision-log.md` D-038

---

## Bugs Found and Fixed

1. **`ABR_GUID` not set** — Route Handler catch block was swallowing the error silently. Added `console.error` logging. Root cause: `.env.local` didn't exist. Created template file.
2. **`Gst: string` wrong type** — Live ABR API returns `"Gst": null` for non-GST-registered businesses, not `""`. Fixed to `Gst: string | null`.
3. **`peppol.helger.com` returning 400** — Switched to `directory.peppol.eu` (see D-038).

---

## LEARN Tags

- ABR API returns JSONP — `callback({...})` wrapper must be stripped before `JSON.parse()`
- ABR API returns `Gst: null` (not `""`) for non-GST-registered businesses
- `directory.peppol.eu` is the authoritative Peppol Directory API — `total-result-count > 0` = registered
- Peppol "not found" copy must say "not confirmed on Peppol" — never "not registered"
- Next.js 15+ `searchParams` in Server Components is `Promise<{...}>` — must be awaited

---

## Acceptance Criteria Status

| Criterion | Status |
|---|---|
| `tsc --noEmit` passes with zero errors | ✅ |
| ABN validates client-side before API call | ✅ |
| Invalid ABN shows error without calling ABR | ✅ |
| "Not confirmed" copy (not "not registered") | ✅ |
| `/lookup?abn=51824753556` auto-runs SSR lookup | ✅ |
| No `console.log` in production paths | ✅ |
| No hardcoded secrets — all from env vars | ✅ |
| Page renders without JS | ✅ |
| All five result states display correctly | ✅ |
| ABR response cached 24hr TTL | ⏭ Phase 1 (D-037) |
| Peppol check cached 1hr TTL | ⏭ Phase 1 (D-037) |
| Rate limiting 429 + `Retry-After` | ⏭ Phase 1 (D-037) |
