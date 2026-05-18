# CLAUDE.md — Peppol Bridge

> **Read this file completely before writing a single line of code.**
> This is not optional. Every section exists because a bad assumption would cause a real bug, a security hole, or a rejected invoice.

---

## What This Project Is

An AU Peppol e-invoicing SaaS for Australian SMBs and bookkeepers.
Working title: **PEPPOL BRIDGE** (final name TBD).

**Regulatory context you must never forget:**

- Peppol is a government-mandated B2B/B2G e-invoicing network. AU mandate is live (July 2026).
- The document format is **UBL 2.1 XML** using the **PINT A-NZ** profile.
- Customisation ID: `urn:peppol:pint:billing-1@aunz-1`
- **Wrong IBT numbers, wrong UBL paths, wrong tax codes = rejected invoices = angry customers.**
- AU identifier: ABN (11 digits), Peppol scheme `0151`. Full endpoint: `0151:12345678901`
- NZ identifier: NZBN (13 digits), Peppol scheme `0088`
- Access Point partner: **Storecove** (we do not run our own AP — never suggest this)

---

## Authoritative Reference Files

Before touching any domain, read the relevant file first. Do not rely on memory.

| File                    | When to read it                                                     |
| ----------------------- | ------------------------------------------------------------------- |
| `decisions-log.md`      | Before suggesting any architecture, schema, or product decision     |
| `peppol-bridge-spec.md` | Before building any feature — check if it's already specced         |
| `database-schema.md`    | Before every DB-related task — tables, columns, functions, triggers |

**If a table, column, function, or trigger already exists in `database-schema.md` — use it. Do not reinvent it.**

---

## Tech Stack

Do not suggest alternatives to these. They are confirmed decisions.

| Layer           | Choice                                                            |
| --------------- | ----------------------------------------------------------------- |
| Frontend        | Next.js + TypeScript (App Router)                                 |
| UI components   | shadcn/ui — components live in `/components/ui/`                  |
| CSS             | Tailwind CSS v4                                                   |
| Backend         | Supabase (PostgreSQL 15, Auth, Storage, Edge Functions, Realtime) |
| Mobile          | React Native (iOS + Android) — Phase 3                            |
| Monorepo        | Turborepo — Phase 3 only, when React Native joins. Not before.    |
| Access Point    | Storecove                                                         |
| Billing         | Lemon Squeezy (Merchant of Record — handles AU GST)               |
| Email           | Resend + React Email                                              |
| PDF extraction  | Claude API — Haiku (simple) → Sonnet (complex / low confidence)   |
| Auth            | Supabase — magic link + email/password + Google OAuth             |
| Hosting         | Vercel (Edge Functions)                                           |
| Mobile auth     | react-native-keychain — token hash in DB only, never raw token    |
| Offline storage | WatermelonDB (docs) + MMKV (session)                              |
| Error tracking  | Sentry                                                            |

---

## Absolute Rules — Never Violate These

These are non-negotiable. If a task seems to require violating one, stop and flag it.

### Money

- All amounts are stored as **cents in `bigint`**. `10000` = $100.00. Never floats. Ever.
- Every amount column is paired with `currency_code text DEFAULT 'AUD'`
- If you write `amount: number` or `price: float` anywhere, it is wrong.

### Database

- **RLS is always active on every table.** Never bypass with service role in client code.
- Service role is only permitted in Edge Functions and `SECURITY DEFINER` functions.
- Always use `get_user_org_ids()` helper in RLS policies — never raw `auth.uid()` comparisons against `org_id`.
- All mutable tables use **soft delete**: `deleted_at timestamptz`. Never hard-delete rows.
- Always filter `WHERE deleted_at IS NULL` in queries — soft-deleted rows are invisible to users.
- Also check `archived_at IS NULL` where applicable.
- Audit logs are **append-only**. Write only via `create_audit_log()` SECURITY DEFINER function. Never INSERT directly.
- All DB writes with side effects (member changes, claim approvals, billing transfers) go through SECURITY DEFINER functions.

### Schema changes

- Always show `ALTER TABLE` statements — never rewrite a full table definition.
- Before suggesting a new column, confirm it doesn't already exist in `database-schema.md`.
- Before suggesting a new table, confirm it doesn't already exist.

### Peppol / regulatory details

- **Never guess IBT numbers, schematron rule IDs, UBL element paths, or ATO certification requirements.**
- These have exact right answers. A wrong IBT number causes invoice rejection.
- If uncertain about any PINT A-NZ spec detail, say so explicitly. Do not fabricate.

### Security

- Never store raw session tokens. DB stores SHA-256 hash only (D-026).
- Never expose service role key in client-side code.
- Never suggest building an Access Point — we use Storecove (D-003).

---

## Confirmed Decisions Quick Reference

These are decided. Do not revisit unless explicitly asked.

| Decision | What was decided                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| D-005    | Unified Account Model — no "account type" until Phase 4                                                       |
| D-006    | Bookkeeper Split Mode is Phase 4 — two additive columns only                                                  |
| D-007    | Roles: `owner`, `admin`, `bookkeeper`, `viewer`. DB stores `'bookkeeper'`, UI shows "Bookkeeper / Accountant" |
| D-008    | Founder protection — `is_founder = true`, unique index, cannot be removed or downgraded                       |
| D-009    | One org per ABN — unique index at DB level                                                                    |
| D-010    | ABN conflict → `org_claim_requests` flow, not a new org                                                       |
| D-011    | `billing_owner_user_id` NULL = org pays, NOT NULL = bookkeeper pays. Mutually exclusive.                      |
| D-013    | Volume tiers are data-driven — not now. Same columns, zero migration when they arrive.                        |
| D-016    | All amounts in cents as `bigint`                                                                              |
| D-017    | Sender/receiver details frozen in `document_versions` at send time — legal requirement                        |
| D-018    | `is_current` on `document_versions` managed by trigger — never set manually                                   |
| D-019    | Audit logs append-only via `create_audit_log()`                                                               |
| D-020    | Feature flags via `feature_flags` + `feature_flag_overrides` tables                                           |
| D-021    | Document number uniqueness via `normalise_document_number()`                                                  |
| D-022    | `abn_status_at_send` snapshot on `document_versions` — immutable proof                                        |
| D-026    | Mobile: token hash in DB only, raw token in OS keychain only                                                  |
| D-027    | Offline: read all cached + write drafts only. Sent invoices always server-authoritative.                      |

---

## Existing Functions — Use These, Don't Rewrite Them

| Function                                                          | What it does                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `handle_new_user()`                                               | Auto-creates profile on Supabase signup                      |
| `handle_org_created()`                                            | Auto-inserts founder member row on org creation              |
| `is_org_founder(org_id)`                                          | RLS helper — checks if current user is founder               |
| `get_user_org_ids()`                                              | RLS helper — returns all org IDs current user is a member of |
| `get_user_org_role(org_id)`                                       | Returns current user's role in a given org                   |
| `approve_org_claim(claim_id, decided_by)`                         | Atomic ownership transfer                                    |
| `is_feature_enabled(key, org_id)`                                 | Feature flag check                                           |
| `refresh_bookkeeper_org_count(user_id)`                           | Keeps subscription org count accurate                        |
| `update_org_bookkeeper_status()`                                  | Trigger — keeps `has_external_bookkeeper` accurate           |
| `handle_bookkeeper_plan_cancellation(user_id)`                    | Moves stranded orgs to free tier on cancel                   |
| `update_document_payment_status()`                                | Trigger — keeps `documents.amount_paid` in sync              |
| `update_estimated_annual_revenue()`                               | Trigger — fires on payments, checks GST threshold            |
| `normalise_document_number(text)`                                 | Strips hyphens/spaces for uniqueness checks                  |
| `increment_access_point_usage(org_id, direction, provider, cost)` | Atomic AP usage counter                                      |
| `create_audit_log()`                                              | SECURITY DEFINER — only way to write audit logs              |

---

## Supabase Patterns — Always Use These

```typescript
// Always import with proper typing
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Always filter soft-deleted rows
const { data, error } = await supabase
  .from("documents")
  .select("id, document_number, status, total_amount, currency_code")
  .eq("org_id", orgId)
  .is("deleted_at", null)
  .order("issued_at", { ascending: false });

// Always pair amount fields with currency_code in selects
// Never use .single() without handling PGRST116 "no rows" error
// RLS is always active — never bypass it with service role in client code
```

---

## TypeScript Rules

- **Strict mode always on.** No `any`. No `// @ts-ignore`.
- Prefer explicit return types on functions.
- Enums for statuses, roles, and document types — match DB enum names exactly.
- `bigint` for all amount types in TypeScript interfaces mirroring the DB.
- Zod for all external input validation (API routes, form inputs, webhook payloads).

---

## UI Components — shadcn/ui + Tailwind v4 Rules

### shadcn/ui

- Components live in `/components/ui/` — installed via `npx shadcn@latest add [component]`
- **Never modify files in `/components/ui/` directly.** Extend them in `/components/` instead.
- Import from `@/components/ui/[component]` — not from the shadcn registry or npm directly
- Use the `cn()` utility from `@/lib/utils` for all conditional class merging — never string concatenation
- Before building any UI element, check if a shadcn component already exists for it
- Form fields always use `shadcn/ui` Form + React Hook Form + Zod — never raw `<input>` with manual state

```typescript
// Correct — using cn() for conditional classes
import { cn } from '@/lib/utils'
<div className={cn('base-class', isActive && 'active-class', className)} />

// Correct — shadcn import path
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Wrong — never import from shadcn registry directly
import { Button } from 'shadcn/ui' // ❌
```

### Tailwind CSS v4

- Uses `@import "tailwindcss"` in the root CSS file — **not** `@tailwind base/components/utilities`
- Theme customisation uses CSS `@theme` variables — **not** `tailwind.config.js` (v4 removed it)
- Design tokens are CSS custom properties: `--color-primary`, `--font-sans`, etc.
- Never use arbitrary values (`w-[437px]`) when a standard scale token fits
- Tailwind v4 uses Lightning CSS — no PostCSS config needed unless adding plugins

```css
/* Correct — Tailwind v4 entry point */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.6 0.15 240);
  --color-primary-foreground: oklch(0.98 0 0);
  --font-sans: "IBM Plex Sans", sans-serif;
  --font-mono: "IBM Plex Mono", monospace;
}

/* Wrong — Tailwind v3 syntax */
@tailwind base; /* ❌ */
@tailwind components; /* ❌ */
@tailwind utilities; /* ❌ */
```

### Turborepo (Phase 3 only — React Native)

- **Do not set up Turborepo before Phase 3.** Single Next.js app only until then.
- At Phase 3: repo splits into `apps/web` (Next.js) and `apps/mobile` (React Native)
- Shared packages will live in `packages/` — types, utils, and API contracts shared between web and mobile
- The contracts files in `/contracts/` become `packages/contracts/` at that point
- Do not pre-empt this structure in Phase 0–2 work

---

## File & Folder Conventions

```
/app                    — Next.js App Router pages and layouts
/app/api                — Route handlers (Edge Functions go here)
/components
  /ui                   — shadcn/ui installed components (never modify directly)
  /[feature]            — Feature-specific composed components
/lib
  /utils.ts             — cn() utility and shared pure functions
  /supabase             — Supabase client instances (server + client + middleware)
  /peppol               — XML generation, validation, Storecove integration
  /abr                  — ABR API client + response parsing
  /billing              — Lemon Squeezy webhook handlers
  /email                — Resend + React Email templates
/types
  /supabase.ts          — Generated Supabase types (never hand-edit)
  /domain.ts            — Application domain types
  /contracts            — API contract types (shared between frontend + backend)
/hooks                  — React hooks
/utils                  — Pure utility functions (no side effects)
/contracts              — API contract markdown files (source of truth for /types/contracts)
```

---

## Build Phases — What Exists When

Only build what belongs in the current phase. Do not build ahead.

| Phase | Ships                                                                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** | ABN Peppol Lookup Tool (lead magnet) · Landing page · Email capture                                                                                |
| **1** | PINT A-NZ XML generator · Validation (XSD + Schematron + PINT A-NZ) · ABN lookup · Xero OAuth · Public validator · Basic dashboard · Auth          |
| **2** | Peppol send via Storecove · Directory registration · Status tracking · Webhooks · Rejection translator · Onboarding wizard · Lemon Squeezy billing |
| **3** | Peppol receive · MYOB integration · Mobile (React Native) · PDF upload/camera                                                                      |
| **4** | Bookkeeper Split Mode · Multi-client dashboard · QBO · API keys                                                                                    |

**Tables tagged by phase in `database-schema.md` — don't create Phase 2+ tables in Phase 0/1 work.**

---

## Checkpoint Protocol

Stop and wait for review at these points. Do not proceed past a checkpoint autonomously.

1. **Schema checkpoint** — Before any DB change. Show the `ALTER TABLE` or migration SQL. Wait for approval.
2. **Integration checkpoint** — After API/service layer is built, before building UI. Show the data flow.
3. **Feature complete checkpoint** — Full feature built. Stop. Do not start the next task.

If a task requires a Peppol spec decision (IBT number, tax code, schematron rule), **stop and flag it** — do not guess. This is a compliance product.

---

## What "Done" Means for Every Task

A task is not done until:

- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)
- [ ] All amount fields use `bigint`, never `number` or `float`
- [ ] All queries filter `deleted_at IS NULL`
- [ ] RLS is not bypassed in client code
- [ ] Error states are handled (not just happy path)
- [ ] No `console.log` left in production paths
- [ ] No hardcoded secrets or API keys

---

## Pricing Reference

| Plan       | Price       | Invoice limit             |
| ---------- | ----------- | ------------------------- |
| Free       | $0          | 3 invoices                |
| Starter    | AUD $29/mo  | 30 invoices               |
| Pro        | AUD $79/mo  | 150 invoices              |
| Bookkeeper | AUD $149/mo | Unlimited orgs, flat rate |

---

## Domain Table Map — 36 Tables

| Domain     | Tables                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core       | `profiles`, `organisations`, `organisation_members`, `org_claim_requests`, `contacts`                                                                    |
| Invoicing  | `documents`, `document_versions`, `document_line_items`, `document_payments`, `document_attachments`, `invoice_templates`, `recurring_invoice_schedules` |
| Peppol     | `peppol_transmissions`, `peppol_status_events`                                                                                                           |
| Billing    | `subscriptions`, `access_point_usage`                                                                                                                    |
| Operations | `feature_flags`, `feature_flag_overrides`, `job_queue`, `webhook_deliveries`, `rate_limit_buckets`                                                       |
| Caching    | `abn_lookup_cache`, `peppol_endpoint_cache`                                                                                                              |
| Reference  | `tax_codes`, `compliance_events`, `compliance_event_dismissals`                                                                                          |
| Growth     | `onboarding_progress`, `api_keys`, `audit_logs`, `notification_preferences`, `notifications`                                                             |
| Mobile     | `device_tokens`, `user_sessions`, `sync_queue`, `app_versions`                                                                                           |

---

## Regulatory Quick Reference

| Item                     | Value                                         |
| ------------------------ | --------------------------------------------- |
| Document standard        | PINT A-NZ (UBL 2.1 XML)                       |
| Customisation ID         | `urn:peppol:pint:billing-1@aunz-1`            |
| AU scheme ID             | `0151`                                        |
| NZ scheme ID             | `0088`                                        |
| AU identifier            | ABN (11 digits)                               |
| NZ identifier            | NZBN (13 digits)                              |
| ABN lookup API           | ABR API — `abn.business.gov.au` — cache 24hrs |
| Peppol Directory cache   | 1 hour TTL                                    |
| GST threshold            | $75k/year — warn at $65k annualised           |
| GST rate (AU)            | 10%                                           |
| GST rate (NZ)            | 15%                                           |
| ATO certification target | eInvoicing Ready+ (apply end of Phase 2)      |
| ATO contact              | eInvoicing@ato.gov.au                         |

---

_Schema version: 2.2.0 · Stack: Next.js + Supabase + Storecove + Lemon Squeezy_
_Last updated: May 2026_
_Full spec: peppol-bridge-spec.md · Full schema: database-schema.md · Decisions: decisions-log.md_
