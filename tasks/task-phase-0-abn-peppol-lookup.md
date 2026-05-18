# Task: Phase 0 — ABN Peppol Lookup Tool

**Phase:** 0 (Lead magnet — ships before auth, before billing, before any database writes)
**Estimated time:** 2–3 hours
**Branch:** `feat/phase-0-abn-lookup`

---

## Pre-Task Checklist (complete before writing a single line of code)

- [ ] Read `CLAUDE.md` fully
- [ ] Read `database-schema.md` §12 (caching tables) — both cache tables already exist
- [ ] Read `decisions-log.md` D-009 (ABN uniqueness), D-016 (amounts in cents)
- [ ] Review NotebookLM research below — all spec values confirmed
- [ ] Review LLM Council pre-task deliberation notes below

---

## NotebookLM Research — Confirmed Values

> These were verified before this task was written. Do NOT guess or deviate from these values.

### ABR API

- **Endpoint:** `https://abr.business.gov.au/json/AbnDetails.aspx?abn={abn}&callback=callback&guid={guid}`
- **Auth:** GUID required — free registration at abr.business.gov.au/Tools/WebServices
- **Key response fields:**
  - `AbnStatus` → `"Active"` or `"Cancelled"` (this is the field to check)
  - `EntityName` → legal entity name (e.g. `"BUNNINGS GROUP LIMITED"`)
  - `EntityTypeCode` → e.g. `"PUB"`, `"IND"`, `"PRV"`
  - `EntityTypeName` → human readable e.g. `"Australian Public Company"`
  - `Gst` → GST registration date string, or empty if not registered
  - `AddressState` → state abbreviation e.g. `"NSW"`
  - `BusinessName` → array of trading names (may be empty)
  - `Message` → empty string on success, error description on failure
- **ABN format rule:** Strip all spaces before sending. `"12 620 650 553"` → `"12620650553"`
- **ABN validation:** 11 digits. Checksum algorithm exists — validate format before calling API
- **Cache TTL:** 24 hours — use `abn_lookup_cache` table (already exists in schema)
- **Protocol:** HTTPS only — HTTP was removed Feb 2020

### Peppol Directory

- **Participant ID format for AU:** `iso6523-actorid-upis::0151:{abn}`
  - Example (ATO): `iso6523-actorid-upis::0151:51824753556`
- **AU scheme ID (ICD):** `0151`
- **NZ scheme ID (ICD):** `0088` (out of scope for Phase 0)
- **Directory query approach:** Use the official Peppol Directory search API (D-038)
  - Endpoint: `https://directory.peppol.eu/search/1.0/json?participant=iso6523-actorid-upis%3A%3A0151%3A{abn}`
  - Registered = `total-result-count > 0` in the JSON response
  - ~~peppol.helger.com~~ — third-party, broken as of May 2026 (HTTP 400), do not use
- **Cache TTL:** 1 hour — use `peppol_endpoint_cache` table (already exists in schema)
- **Important:** Not every registered Peppol receiver appears in the Directory — publishing is required in AU but not globally enforced. A "not found" result means "not confirmed registered" not "definitely not on Peppol."

### ABN Validation Algorithm (must implement, not call API for invalid ABNs)

```
1. Strip spaces and hyphens
2. Must be exactly 11 digits
3. Subtract 1 from first digit
4. Multiply each digit by its weighting factor:
   Weights: [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
5. Sum all weighted products
6. If sum is divisible by 89 → valid ABN
```

---

## LLM Council Pre-Task Deliberation (\* Not required for Phase 0 — known risks pre-filled below.)

> Run this in Claude.ai via the LLM Council MCP before writing the task file.
> Query: _"What are the failure modes of an ABN + Peppol Directory lookup tool that a solo developer building their first Peppol product is most likely to miss?"_

**Council synthesis (run and paste result here before starting):**

```
[ Run in Claude.ai: consult_council with the query above ]
[ Paste synthesis result here ]
[ This becomes your Known Risks section ]
```

**Pre-filled known risks based on general knowledge (supplement with council result):**

- ABR API GUID is required but easy to forget in production env vars
- ABN checksum validation must happen client-side before the API call — avoid burning rate limits on invalid input
- Peppol Directory "not found" ≠ "not on Peppol" — copy must reflect this nuance
- ABR JSONP callback format (`callback(...)`) must be unwrapped before parsing
- Cache table writes must handle concurrent requests (upsert, not insert)
- The tool is a public page — no auth, so rate limiting matters from day one
- `abn_lookup_cache` and `peppol_endpoint_cache` require service role to write — this is a Next.js Route Handler, not client code

---

## Must NOT Do

- Do NOT create any new tables — `abn_lookup_cache` and `peppol_endpoint_cache` already exist in `database-schema.md`
- Do NOT require authentication — this is a public lead-magnet page
- Do NOT hard-delete any rows
- Do NOT use floats for any amount (no amounts on this page anyway)
- Do NOT bypass RLS in client code — cache writes go through a Route Handler with service role
- Do NOT call the ABR API for ABNs that fail local checksum validation
- Do NOT show a confident "not on Peppol" message — say "not confirmed" instead
- Do NOT store any personally identifiable data beyond what ABR returns publicly

---

## Reads First (in order)

1. `CLAUDE.md` — full read required before any code
2. `database-schema.md` — find `abn_lookup_cache` and `peppol_endpoint_cache` tables
3. `peppol-bridge-spec.md` — Phase 0 section and any ABN lookup spec details

---

## Spec

### What it does

A fully public Next.js page (no login required). User enters an ABN. The tool:

1. Validates ABN format and checksum locally
2. Looks up the ABN in `abn_lookup_cache` — if cache hit and < 24hrs old, use it
3. If cache miss, calls ABR API to get entity name and ABN status
4. Writes result to `abn_lookup_cache`
5. Looks up Peppol registration in `peppol_endpoint_cache` — if cache hit and < 1hr old, use it
6. If cache miss, queries Peppol Directory via peppol.helger.com REST API
7. Writes result to `peppol_endpoint_cache`
8. Displays result with appropriate CTA

### Result states

| ABN valid | ABR status | Peppol status | Display                                       |
| --------- | ---------- | ------------- | --------------------------------------------- |
| ✅        | Active     | Registered    | "✅ [Entity Name] is on the Peppol network"   |
| ✅        | Active     | Not found     | "⚠️ [Entity Name] is not confirmed on Peppol" |
| ✅        | Cancelled  | —             | "❌ This ABN is cancelled"                    |
| ✅        | ABR error  | —             | "⚠️ ABN lookup failed — try again"            |
| ❌        | —          | —             | "❌ Invalid ABN" (client-side, no API call)   |

### CTA logic

- Peppol registered: "Send them a Peppol invoice free" → waitlist/email capture
- Not confirmed: "Help them get on Peppol" → email capture + share link
- Cancelled ABN: "Check another ABN"

### URL structure

- Page: `/lookup` or `/` (home page for Phase 0)
- Query param support: `/lookup?abn=12345678901` for shareable links
- On page load with `abn` param, auto-run the lookup

---

## File Structure

```
/app
  /lookup
    page.tsx          ← public page, Server Component
    /api
      /abn-lookup
        route.ts      ← Route Handler — ABR API + cache logic
      /peppol-check
        route.ts      ← Route Handler — Peppol Directory + cache logic

/lib
  /abr
    client.ts         ← ABR API fetch + JSONP unwrap
    validate.ts       ← ABN checksum validation (pure function, no side effects)
    types.ts          ← ABR response types

  /peppol
    directory.ts      ← Peppol Directory lookup via peppol.helger.com

/components
  /lookup
    AbnInput.tsx      ← Controlled input with inline validation feedback
    LookupResult.tsx  ← Result display component (all five states)
    Cta.tsx           ← CTA component (varies by result state)

/types
  /abr.ts             ← AbrResponse interface
  /peppol.ts          ← PeppolCheckResult interface
```

---

## Supabase Usage

Both cache tables use service role for writes — this is correct because:

- These are Route Handlers (server-side), not client code
- The public user has no session — RLS would block writes

```typescript
// Route Handler pattern — service role only in server-side Route Handlers
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← service role ONLY in Route Handlers
);

// Cache upsert pattern — handle concurrent requests
const { error } = await supabase.from("abn_lookup_cache").upsert(
  {
    abn: normalised_abn,
    entity_name: result.EntityName,
    abn_status: result.AbnStatus,
    raw_response: result,
    cached_at: new Date().toISOString(),
  },
  {
    onConflict: "abn", // abn has unique index
  },
);
```

### Cache check pattern

```typescript
// Always check cache before calling external API
const { data: cached } = await supabase
  .from("abn_lookup_cache")
  .select("entity_name, abn_status, cached_at")
  .eq("abn", normalisedAbn)
  .single()
  .throwOnError();

const cacheAge = cached
  ? (Date.now() - new Date(cached.cached_at).getTime()) / 1000 / 60 / 60
  : Infinity;

if (cached && cacheAge < 24) {
  return cached; // cache hit
}
// cache miss → call ABR API
```

---

## Rate Limiting

This is a public page. Add basic rate limiting to both Route Handlers using `rate_limit_buckets` table (already exists in schema).

Pattern:

- Key: `abn_lookup:{ip}` and `peppol_check:{ip}`
- Bucket: 10 requests per minute per IP
- Return 429 with `Retry-After` header on breach

Use `increment_access_point_usage()` for Peppol checks — it already exists as a SECURITY DEFINER function. Check `database-schema.md` for its exact signature before calling it.

---

## Environment Variables Required

```env
# Already needed for Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# New for this task
ABR_GUID=                    # Register free at abr.business.gov.au/Tools/WebServices
PEPPOL_HELGER_BASE_URL=https://peppol.helger.com/api  # or override for test
```

---

## Checkpoints

### Checkpoint 1 — ABR client (stop here, show me output)

After building `/lib/abr/client.ts` and `/lib/abr/validate.ts`:

- Show me the TypeScript interface for the ABR response
- Show me the ABN checksum validation function with 2 test cases (valid + invalid ABN)
- Show me how you're unwrapping the JSONP `callback(...)` wrapper
- Do NOT build the Route Handler or UI yet

### Checkpoint 2 — Route Handlers (stop here, show me output)

After building both Route Handlers:

- Show me the cache hit/miss flow as a code comment walkthrough
- Show me the rate limiting implementation
- Show me the full type of the JSON response each handler returns
- Do NOT build any UI components yet

### Checkpoint 3 — Feature Complete (stop here, wait for review)

After the full page is built:

- `tsc --noEmit` must pass with zero errors
- Show me all five result states rendered (use a `?abn=` param in dev to trigger each)
- Show me the shareable URL working (`/lookup?abn=51824753556` should auto-run)
- Stop. Do not start any other task.

---

## Council Checkpoints

No `council-review` required for this task — it contains no Peppol XML, no UBL elements, no schematron rules, and no financial data.

**Do run `council-gate` (jury mode) on:**

- The rate limiting implementation — confirm it can't be trivially bypassed
- The cache upsert logic — confirm no race condition can corrupt cached data

```bash
# Run after Checkpoint 2, before Checkpoint 3
consult_council jury_mode=true question="Does this rate limiting implementation using rate_limit_buckets in Supabase correctly prevent abuse of a public endpoint, and can it be bypassed by rotating IPs or forging headers?"
```

---

## Acceptance Criteria

A task is not done until ALL of these pass:

- [ ] `tsc --noEmit` passes with zero errors
- [ ] ABN input validates format and checksum client-side before any API call
- [ ] Invalid ABN shows error immediately without calling ABR API
- [ ] ABR response is cached in `abn_lookup_cache` with 24hr TTL
- [ ] Peppol check is cached in `peppol_endpoint_cache` with 1hr TTL
- [ ] Cache upsert uses `onConflict: 'abn'` to handle concurrent requests safely
- [ ] "Not found in Peppol Directory" copy says "not confirmed" NOT "not registered"
- [ ] `/lookup?abn=51824753556` auto-runs the lookup and shows ATO result
- [ ] Both Route Handlers return 429 + `Retry-After` header when rate limit exceeded
- [ ] Service role key is ONLY used in Route Handlers, never in client components
- [ ] No `console.log` left in production code paths
- [ ] No hardcoded API keys, GUIDs, or secrets — all from environment variables
- [ ] Page renders without JS (basic result should work server-side rendered)
- [ ] All five result states display correctly

---

## Known Constraints

- No authentication — this is intentional. Public lead magnet.
- No email capture form yet — just a placeholder CTA with a link to `/waitlist` (that page doesn't exist yet, link is fine)
- No Supabase Realtime — single request/response, no streaming needed
- No mobile-specific styling required for Phase 0 — responsive is enough
- No analytics events yet — placeholder comments are fine

---

## After This Task Is Done

Write to `MEMORY.md`:

```
[LEARN] ABR JSON API returns JSONP format — callback() wrapper must be stripped before JSON.parse()
[LEARN] abn_lookup_cache upsert must use onConflict: 'abn' — ABN has unique index
[LEARN] Peppol Directory "not found" copy must say "not confirmed on Peppol" not "not registered"
[LEARN] peppol.helger.com ppidexistence endpoint uses URL-encoded participant ID — encode the :: separators
```

Then write a session log to `quality_reports/session_logs/YYYY-MM-DD-phase-0-abn-lookup.md` with:

- What was built
- Any decisions made that weren't in this task file
- Any [LEARN] tags discovered during the session

---

_Task version: 1.0 · Phase 0 · Schema: 2.2.0 · May 2026_
_References: database-schema.md §12, peppol-bridge-spec.md Phase 0, CLAUDE.md_
