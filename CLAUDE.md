# CLAUDE.md — Peppol Bridge

> **Read this file completely before writing a single line of code.**

---

## What This Project Is

An AU Peppol e-invoicing SaaS for Australian SMBs and bookkeepers. **Product name: Peppol Bridge.**

**Regulatory context — never forget:**

- Peppol is a government-mandated B2B/B2G e-invoicing network. AU mandate is live (July 2026).
- Document format: **UBL 2.1 XML**, **PINT A-NZ** profile. Customisation ID: `urn:peppol:pint:billing-1@aunz-1`
- **Wrong IBT numbers, wrong UBL paths, wrong tax codes = rejected invoices.**
- AU identifier: ABN (11 digits), Peppol scheme `0151`. Full endpoint: `0151:12345678901`
- NZ identifier: NZBN (13 digits), Peppol scheme `0088`
- Access Point partner: **Storecove** — we do not run our own AP. Never suggest this.

---

## Authoritative Reference Files

Read before touching any domain. Do not rely on memory.

| File                    | When to read it                                                     |
| ----------------------- | ------------------------------------------------------------------- |
| `decisions-log.md`      | Before suggesting any architecture, schema, or product decision     |
| `peppol-bridge-spec.md` | Before building any feature — check if it's already specced         |
| `database-schema.md`    | Before every DB-related task — tables, columns, functions, triggers |

**If a table, column, function, or trigger already exists in `database-schema.md` — use it. Do not reinvent it.**
**All existing DB functions are listed in `database-schema.md` — check there before writing a new one.**

---

## Tech Stack

Do not suggest alternatives. These are confirmed decisions.

| Layer        | Choice                                                          |
| ------------ | --------------------------------------------------------------- |
| Frontend     | Next.js + TypeScript (App Router)                               |
| UI           | shadcn/ui — components in `/components/ui/`                     |
| CSS          | Tailwind CSS v4                                                 |
| Backend      | Supabase (PostgreSQL 15, Auth, Storage, Edge Functions)         |
| Access Point | Storecove                                                       |
| Billing      | Lemon Squeezy (Merchant of Record — handles AU GST)             |
| Email        | Resend + React Email                                            |
| PDF          | Claude API — Haiku (simple) → Sonnet (complex/low confidence)   |
| Auth         | Supabase — magic link + email/password + Google OAuth           |
| Hosting      | Vercel                                                          |
| Mobile       | React Native — Phase 3 only                                     |
| Monorepo     | Turborepo — Phase 3 only, when React Native joins               |

---

## Absolute Rules — Never Violate These

### Money

- All amounts stored as **cents in `bigint`**. `10000` = $100.00. Never floats. Ever.
- Every amount column is paired with `currency_code text DEFAULT 'AUD'`

### Database

- **RLS is always active on every table.** Never bypass with service role in client code.
- Service role only in Edge Functions and `SECURITY DEFINER` functions.
- Always use `get_user_org_ids()` in RLS policies — never raw `auth.uid()` against `org_id`.
- All mutable tables use **soft delete**: `deleted_at timestamptz`. Never hard-delete.
- Always filter `deleted_at IS NULL` (and `archived_at IS NULL` where applicable).
- Audit logs are **append-only** via `create_audit_log()` SECURITY DEFINER. Never INSERT directly.
- All DB writes with side effects go through SECURITY DEFINER functions.

### Schema changes

- Always `ALTER TABLE` — never rewrite a full table definition.
- Confirm column/table doesn't exist in `database-schema.md` before suggesting it.

### Peppol / regulatory

- **Never guess IBT numbers, schematron rule IDs, UBL element paths, or ATO certification requirements.** Stop and flag if uncertain.

### Security

- Never store raw session tokens. DB stores SHA-256 hash only (D-026).
- Never expose service role key in client code.

---

## Confirmed Decisions — Do Not Revisit

| Decision | What was decided |
| -------- | ---------------- |
| D-005 | Unified Account Model — no "account type" until Phase 4 |
| D-006 | Bookkeeper Split Mode is Phase 4 — two additive columns only |
| D-007 | Roles: `owner`, `admin`, `bookkeeper`, `viewer`. DB stores `'bookkeeper'`, UI shows "Bookkeeper / Accountant" |
| D-008 | Founder protection — `is_founder = true`, unique index, cannot be removed or downgraded |
| D-009 | One org per ABN — unique index at DB level |
| D-010 | ABN conflict → `org_claim_requests` flow, not a new org |
| D-011 | `billing_owner_user_id` NULL = org pays, NOT NULL = bookkeeper pays |
| D-013 | Volume tiers are data-driven — same columns, zero migration when they arrive |
| D-016 | All amounts in cents as `bigint` |
| D-017 | Sender/receiver details frozen in `document_versions` at send time — legal requirement |
| D-018 | `is_current` on `document_versions` managed by trigger — never set manually |
| D-019 | Audit logs append-only via `create_audit_log()` |
| D-020 | Feature flags via `feature_flags` + `feature_flag_overrides` tables |
| D-021 | Document number uniqueness via `normalise_document_number()` |
| D-022 | `abn_status_at_send` snapshot on `document_versions` — immutable proof |
| D-026 | Mobile: token hash in DB only, raw token in OS keychain only |
| D-027 | Offline: read cached + write drafts only. Sent invoices always server-authoritative |
| D-037 | No Supabase in Phase 0 — Resend only for waitlist |
| D-038 | Peppol Directory API: `directory.peppol.eu/search/1.0/json` — `total-result-count > 0` = registered |

---

## Supabase Patterns

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Always filter soft-deleted rows; always select currency_code with amounts
const { data, error } = await supabase
  .from("documents")
  .select("id, document_number, status, total_amount, currency_code")
  .eq("org_id", orgId)
  .is("deleted_at", null)
  .order("issued_at", { ascending: false });

// Never use .single() without handling PGRST116 "no rows" error
```

---

## UI Rules

- **shadcn/ui:** Never modify `/components/ui/` directly. Import from `@/components/ui/[component]`. Use `cn()` from `@/lib/utils` for conditional classes. Forms always use shadcn Form + React Hook Form + Zod.
- **Tailwind v4:** Uses `@import "tailwindcss"` — not `@tailwind base/components/utilities`. Theme via CSS `@theme {}` variables — no `tailwind.config.js`.
- **TypeScript:** Strict mode, no `any`, no `@ts-ignore`. Zod for all external input. `bigint` for all amount types.

---

## Build Phases

Only build what belongs in the current phase.

| Phase | Focus |
| ----- | ----- |
| **0** | ABN lookup tool · Landing page · Email capture |
| **1** | PINT A-NZ XML · Validation · Xero OAuth · Dashboard · Auth |
| **2** | Peppol send via Storecove · Webhooks · Billing (Lemon Squeezy) |
| **3** | Peppol receive · MYOB · Mobile (React Native) |
| **4** | Bookkeeper Split Mode · Multi-client dashboard · API keys |

Tables are tagged by phase in `database-schema.md` — don't create Phase 2+ tables in Phase 0/1 work.

---

## What "Done" Means

- [ ] `tsc --noEmit` passes with zero errors
- [ ] All amount fields use `bigint`, never `number` or `float`
- [ ] All queries filter `deleted_at IS NULL`
- [ ] RLS not bypassed in client code
- [ ] Error states handled (not just happy path)
- [ ] No `console.log` in production paths
- [ ] No hardcoded secrets or API keys

---

## Pricing Reference

| Plan       | Price       | Limit                     |
| ---------- | ----------- | ------------------------- |
| Free       | $0          | 3 invoices                |
| Starter    | AUD $29/mo  | 30 invoices               |
| Pro        | AUD $79/mo  | 150 invoices              |
| Bookkeeper | AUD $149/mo | Unlimited orgs, flat rate |

---

## Domain Table Map — 36 Tables

| Domain     | Tables |
| ---------- | ------ |
| Core       | `profiles`, `organisations`, `organisation_members`, `org_claim_requests`, `contacts` |
| Invoicing  | `documents`, `document_versions`, `document_line_items`, `document_payments`, `document_attachments`, `invoice_templates`, `recurring_invoice_schedules` |
| Peppol     | `peppol_transmissions`, `peppol_status_events` |
| Billing    | `subscriptions`, `access_point_usage` |
| Operations | `feature_flags`, `feature_flag_overrides`, `job_queue`, `webhook_deliveries`, `rate_limit_buckets` |
| Caching    | `abn_lookup_cache`, `peppol_endpoint_cache` |
| Reference  | `tax_codes`, `compliance_events`, `compliance_event_dismissals` |
| Growth     | `onboarding_progress`, `api_keys`, `audit_logs`, `notification_preferences`, `notifications` |
| Mobile     | `device_tokens`, `user_sessions`, `sync_queue`, `app_versions` |

---

## Regulatory Quick Reference

| Item | Value |
| ---- | ----- |
| Document standard | PINT A-NZ (UBL 2.1 XML) |
| Customisation ID | `urn:peppol:pint:billing-1@aunz-1` |
| AU scheme ID | `0151` |
| NZ scheme ID | `0088` |
| ABN lookup API | ABR API — `abn.business.gov.au` — cache 24 hrs |
| Peppol Directory | `directory.peppol.eu` — cache 1 hr TTL |
| GST threshold | $75k/year — warn at $65k annualised |
| GST rate (AU) | 10% |
| GST rate (NZ) | 15% |
| ATO certification | eInvoicing Ready+ (apply end of Phase 2) |
| ATO contact | eInvoicing@ato.gov.au |

---

_Schema version: 2.2.0 · Stack: Next.js + Supabase + Storecove + Lemon Squeezy_
_Full spec: peppol-bridge-spec.md · Full schema: database-schema.md · Decisions: decisions-log.md_

---

## Agent skills

### Issue tracker

Issues live in GitHub Issues for this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Using default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
