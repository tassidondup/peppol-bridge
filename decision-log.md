# Decisions Log

### Peppol Bridge — AU e-Invoicing SaaS

**Last updated:** May 2026
**Purpose:** Quick-reference for every major decision made. Not the full spec — just the decision, the reason, and what was rejected. Read this before asking "what did we decide about X."

---

## How to Read This

Each entry has three parts:

- **Decision** — what was decided, in one sentence
- **Why** — the reason that beat everything else
- **Rejected** — what was considered and ruled out

---

## Product Strategy

---

**D-001 · Target market: SMB owners first, designed for bookkeepers from day one**

- **Decision:** Ship to SMB owners first. Build the schema and product to support bookkeepers from the start, but launch the full bookkeeper multi-client dashboard in Phase 4.
- **Why:** Solo founder at 2–3 hrs/day cannot simultaneously do bookkeeper community outreach AND build the product. SMB owners convert faster (urgent pain, rejected invoices). Bookkeeper tier needs a polished product to recommend to clients — that takes Phase 1–3 to build.
- **Rejected:** Bookkeeper-first (slower traction), SMB-only (no force multiplier).

---

**D-002 · Geography: AU primary, NZ simultaneous in schema**

- **Decision:** AU is the primary market. NZ is designed into the schema from day one (NZBN, 0088 Peppol scheme, NZ GST 15%) but NZ-specific marketing waits until 10+ NZ customers are found organically.
- **Why:** Same PINT A-NZ standard, same Xero/MYOB dominance, same bookkeeper profile. Zero migration cost to support NZ if the schema is built right from the start.
- **Rejected:** AU-only schema (requires painful migration later), NZ-first (smaller market, less regulatory urgency).

---

**D-003 · Access Point: Partner with Storecove, do not become an AP**

- **Decision:** Use Storecove as the Access Point partner. Never become an ATO-accredited Access Point ourselves.
- **Why:** Becoming an AP requires months of ATO registration, security audits, AS4 messaging infrastructure, and minimum scale requirements. Storecove handles all of that. Per-invoice cost (~$0.25) is manageable at SMB scale and negotiable at volume.
- **Rejected:** Becoming own AP (months of compliance work before first customer), MessageXchange (also good — Storecove chosen for better developer docs and sandbox).

---

**D-004 · Product name: TBD — naming in progress**

- **Decision:** No name confirmed yet. Working title is PEPPOL BRIDGE.
- **Why:** Multiple candidates eliminated: Lodged (lodged.com.au taken), Aumatic (existing company at aumatic.com), Complio (complio.com = US healthcare company American DataBank founded 2004, plus two others). Style direction: short, brandable, not literally descriptive (Slack/Stripe/Xero style). Register `.com.au` + `.com` + `.co.nz` simultaneously once decided.
- **Rejected:** Descriptive names (too Peppol-specific, doesn't grow beyond it), existing brand conflicts.
- **Unchecked shortlist:** Koru, Celo, Vori, Levo, Nevo, Zivio, Tali.

---

## Multi-Tenancy & User Model

---

**D-005 · Multi-tenancy: Unified Account Model at launch**

- **Decision:** All users manage one or more organisations. No "account type" at launch. An SMB owner has one org. A bookkeeper has many. Same schema, same UI logic.
- **Why:** Simpler schema, faster to build, no branching onboarding logic. First 20 customers will be SMBs who found the validator — they'll tolerate the model. Bookkeeper Split Mode adds only two columns when needed.
- **Rejected:** Dual-mode from day one (2–3 extra weeks of build time), SMB-only model (requires migration when bookkeepers arrive).

---

**D-006 · Bookkeeper Split Mode: Phase 4, additive only**

- **Decision:** Phase 4 adds `profiles.user_type` (`smb_owner` | `bookkeeper`) and `organisation_members.is_external_manager` (bool). Two columns. Zero migration. Zero downtime.
- **Why:** All schema infrastructure already in place. The split is purely a UI routing change — SMB lands on org dashboard, bookkeeper lands on client list.
- **Rejected:** Building Split Mode in Phase 1 (premature — no bookkeeper customers yet to validate the UX).

---

**D-007 · Roles: owner, admin, bookkeeper, viewer**

- **Decision:** Four roles on every organisation. DB stores `'bookkeeper'`. UI shows "Bookkeeper / Accountant".
- **Why:** "Accountant" was the original name but "bookkeeper" is more precise for the AU market. The UI label is inclusive without changing the schema.
- **Rejected:** "Accountant" as DB value (imprecise — formal CPAs rarely have day-to-day Xero access), more roles at launch (unnecessary complexity).

---

**D-008 · Founder protection: org creator cannot be removed**

- **Decision:** Every org has exactly one founder (`is_founder = true`, unique index enforced at DB level). Founders cannot be removed or downgraded by any invited member including other owners. `is_org_founder()` RLS helper enforces this.
- **Why:** Prevents the most common multi-user disaster — invited owner accidentally locks the real business owner out of their own account. Critical for Flow B (Jane creates org, Mick joins as owner — Mick shouldn't be able to remove Jane).
- **Rejected:** No founder concept (easy to orphan an org), all-owners-equal model (creates unresolvable access disputes).

---

**D-009 · ABN uniqueness: one org per ABN, enforced at DB level**

- **Decision:** `UNIQUE INDEX idx_organisations_unique_abn ON organisations(tax_id, tax_id_type) WHERE tax_id IS NOT NULL AND deleted_at IS NULL`.
- **Why:** Without this, Jane can create Mick's org and Mick can also create his own — two orgs, same ABN, split invoice history, duplicate ABN on Peppol network. A DB constraint is the only safe guarantee — application checks can be bypassed by bugs.
- **Rejected:** Application-level check only (race conditions, code bugs can bypass it).

---

**D-010 · ABN conflict: org_claim_requests flow**

- **Decision:** When a signup ABN matches an existing org, the user gets a structured claim flow — not a new org. ABR name match verification + current owner approval. Auto-approve if the org has no SMB user yet and name match passes.
- **Why:** "Jane created Mick's org, Mick signs up later" is a common scenario. The only correct resolution is ownership transfer of the existing org — not creating a duplicate with split history.
- **Rejected:** Creating a second org (duplicate ABN), blocking the signup entirely (users just leave), manual support only (doesn't scale).

---

## Billing & Subscriptions

---

**D-011 · Billing: hybrid model — org pays OR bookkeeper pays**

- **Decision:** `billing_owner_user_id` on `organisations`. NULL = org pays its own subscription. NOT NULL = bookkeeper's flat-rate covers this org. Mutually exclusive — never both simultaneously. Transition only via org_claim_requests `transfer_billing` flag.
- **Why:** Single source of truth for billing ownership. One column answers "who pays for this org?" without any join.
- **Rejected:** Separate billing tables per user type (complex), always-org-pays (breaks bookkeeper model), always-user-pays (breaks SMB model).

---

**D-012 · Bookkeeper plan: flat rate AUD $149/month**

- **Decision:** Flat rate — unlimited client orgs at $149/month. No per-client tiers.
- **Why:** Simple to sell. No billing anxiety at tier boundaries. Bookkeepers don't hesitate to add clients. Industry standard (Xero Partner, Karbon, Practice Ignition all flat rate).
- **Rejected:** Per-client tiers (adds friction, doubles support burden), per-user seats (conflicts with flat-rate model), per-invoice for bookkeeper tier (unpredictable bills).

---

**D-013 · Volume tiers: data-driven, not now**

- **Decision:** Ship flat rate. Monitor `has_external_bookkeeper` + `invoices_sent_mtd` analytics. Introduce volume tiers when data shows bookkeeper-managed orgs send significantly more invoices. Same columns drive both models — zero migration.
- **Why:** Volume tier complexity doubles support burden before you have enough customers to justify it. Data should drive the decision, not guesswork.
- **Rejected:** Volume tiers at launch (premature complexity), per-invoice billing now (Lemon Squeezy usage billing complexity not worth it yet).

---

**D-014 · `invoices_sent_mtd` tracks against the org, not the bookkeeper**

- **Decision:** When Jane sends an invoice for Mick's org, it increments Mick's org subscription counter — not Jane's user subscription.
- **Why:** Volume tracks against the entity generating it. If volume tiers arrive, the org causing the volume pays — regardless of who presses send.
- **Rejected:** Tracking against who sent it (Jane's counter goes up for Mick's work — wrong signal for pricing decisions).

---

**D-015 · Bookkeeper cancellation: auto-move stranded orgs to free tier**

- **Decision:** When a bookkeeper plan cancels, `handle_bookkeeper_plan_cancellation()` auto-moves all covered orgs to free tier, clears `billing_owner_user_id`, notifies owners. 30-day warning sent before cancellation date.
- **Why:** Without this, SMB owners silently lose invoice sending ability when their bookkeeper cancels. They don't know why. Support tickets spike. Government client payments delayed.
- **Rejected:** Manual intervention only (doesn't scale), blocking bookkeeper cancellation until orgs are transferred (too harsh).

---

## Schema Design

---

**D-016 · All monetary amounts in cents as bigint**

- **Decision:** `total_amount bigint NOT NULL DEFAULT 0` where `10000` = $100.00 AUD. Every amount field paired with `currency_code text`.
- **Why:** Float arithmetic on money causes rounding errors (`0.1 + 0.2 = 0.30000000000000004`). GST calculations fail PINT A-NZ schematron validation with float precision errors.
- **Rejected:** `numeric(12,2)` (better than float but still risks precision loss), `float` (never use for money).

---

**D-017 · Snapshot pattern on document_versions**

- **Decision:** `sender_snapshot jsonb` and `receiver_snapshot jsonb` frozen at version creation time. Contact record changes never affect historical invoices.
- **Why:** Legal requirement. An invoice must reflect both parties at the time of sending. If Mick's address changes tomorrow, INV-042 must still show his old address.
- **Rejected:** Live reference to contacts table (contact changes retroactively alter sent invoices — legally invalid).

---

**D-018 · `is_current` trigger on document_versions**

- **Decision:** `is_current boolean NOT NULL DEFAULT true` updated by trigger on insert. Avoids `MAX(version_number)` subquery on every list view.
- **Why:** Dashboard list views query current versions constantly. A denormalised flag with a trigger is faster and consistency is guaranteed by the DB.
- **Rejected:** Always joining on MAX(version_number) (slow at scale), storing only latest version (loses history — legal requirement violated).

---

**D-019 · Audit logs: append-only via SECURITY DEFINER function**

- **Decision:** `audit_logs` has no `UPDATE` or `DELETE` RLS policies. All inserts go through `create_audit_log()` SECURITY DEFINER function only.
- **Why:** If code can write directly to `audit_logs`, developers can forget to call it on some code paths. The function is the only write path — compliance is structural.
- **Rejected:** Direct table inserts from application (audit trail not guaranteed), trigger-only logging (misses business context).

---

**D-020 · Feature flags from day one**

- **Decision:** `feature_flags` + `feature_flag_overrides` tables. All new features gated behind a flag. `is_feature_enabled(key, org_id)` helper used throughout codebase.
- **Why:** Kill switch for broken features without a deploy. Per-org beta access. Percentage rollouts. Not having this is technical debt from day one.
- **Rejected:** No feature flags at start (must add retroactively — harder), environment variables only (no per-org control).

---

**D-021 · Document number normalisation**

- **Decision:** `document_number_normalised` generated column using `LOWER(REGEXP_REPLACE(document_number, '[^A-Za-z0-9]', '', 'g'))`. Unique index on normalised form. "INV-042" = "INV042" = "inv042".
- **Why:** Xero sync and manual entry can produce the same invoice number in different formats. Without normalisation, a format-variant duplicate reaches the Peppol network and gets rejected.
- **Rejected:** Raw uniqueness on `document_number` only (allows format-variant duplicates), application-level normalisation only (race conditions can bypass it).

---

**D-022 · ABN status snapshot at send time**

- **Decision:** `abn_status_at_send text` and `receiver_abn_status_at_send text` on `document_versions`. Captured from `abn_lookup_cache` at transmission time. Immutable after version creation.
- **Why:** Legal protection. If Mick's ABN is later cancelled and a payment dispute arises, the snapshot proves the ABN was Active when the invoice was sent.
- **Rejected:** No snapshot (no defence if ABN is later disputed), re-checking ABN at dispute time (ABR is not a historical record — it only shows current status).

---

**D-023 · GST threshold monitoring**

- **Decision:** `estimated_annual_revenue` on `organisations` updated by trigger on every payment. Notification at $65k annualised (~87% of $75k threshold) when not yet GST-registered.
- **Why:** A tradie who crosses $75k and doesn't register within 21 days faces ATO penalties. Catching this is a genuine value-add. Bookkeepers love being the one who catches this.
- **Rejected:** No monitoring (missed compliance event), notifying at exactly $75k (too late — already crossed the threshold).

---

## Technology

---

**D-024 · Database: Supabase PostgreSQL 15**

- **Decision:** Supabase as the full backend — PostgreSQL 15, Auth, Storage, Edge Functions, Realtime.
- **Why:** Built-in RLS handles multi-tenant security at DB level. Auth free to 50k MAU. Storage for XML/PDF. Edge Functions for webhook handlers. Realtime for live status updates. All from one platform.
- **Rejected:** Firebase (no SQL, no RLS), AWS (too much infrastructure for solo), raw PostgreSQL on Render (no built-in auth/storage).

---

**D-025 · Mobile: React Native confirmed, not Flutter**

- **Decision:** React Native (iOS + Android simultaneously).
- **Why:** Same TypeScript/React patterns as the web app. Shared business logic. Faster to ship. First-class Supabase support. Strong ecosystem for required packages.
- **Rejected:** Flutter (different language/paradigm — slower for someone who already knows React), Expo-only (too limiting for react-native-keychain and vision camera).

---

**D-026 · Mobile auth: react-native-keychain, hash in DB**

- **Decision:** Session token in `react-native-keychain` (iOS Keychain / Android Keystore). DB stores only SHA-256 hash — never the raw token.
- **Why:** DB compromise exposes hashes only — not usable tokens. OS keychain is encrypted hardware-backed storage.
- **Rejected:** AsyncStorage (not encrypted, tokens in plaintext), raw token in DB (security anti-pattern).

---

**D-027 · Offline support: read all + write drafts only**

- **Decision:** Offline read for all cached invoices. Offline write for drafts only. Sent invoices always server-authoritative — server wins on conflict.
- **Why:** SMBs work on-site in low-signal areas. Draft creation is the most common mobile use case. Sending Peppol invoices requires a live Access Point — offline send is impossible by definition.
- **Rejected:** Online-only mobile (kills core on-site use case), full offline sync for sent invoices (immutable — no meaningful edit to sync back).

---

**D-028 · Payments: Lemon Squeezy**

- **Decision:** Lemon Squeezy for subscription billing.
- **Why:** Merchant of Record — handles AU GST automatically. No need to register for GST yourself until $75k. Simple webhook integration.
- **Rejected:** Stripe (manual GST handling), Paddle (similar but less AU documentation), building own billing (never do this).

---

**D-029 · Email: Resend**

- **Decision:** Resend for all transactional email.
- **Why:** Developer-friendly API, React Email for templates, generous free tier (3k/month), excellent deliverability.
- **Rejected:** SendGrid (complex, corporate pricing), SES (requires more AWS infrastructure).

---

**D-030 · PDF extraction: Claude API**

- **Decision:** Claude Haiku for simple invoices (~$0.01/PDF), Claude Sonnet for complex multi-page layouts. Route based on confidence score — if Haiku returns >2 low-confidence fields, escalate to Sonnet.
- **Why:** Best cost/quality for AU tax invoice formats. Native document API. Confidence scoring enables tiered routing.
- **Rejected:** AWS Textract (more expensive, more infrastructure), GPT-4o mini (less consistent on AU tax formats).

---

## Operational Decisions

---

**D-031 · Support reduction: three must-build features in Phase 2**

- **Decision:** (1) Rejection reason translator — every Peppol error code mapped to plain-English + fix. (2) Proactive status emails — push every status change. (3) Onboarding wizard — 4-step first-login flow.
- **Why:** Most SMB tickets are caused by things outside your control. These three make them self-diagnosable. Without them, support becomes a part-time job at 150+ customers.
- **Rejected:** Reactive support only (unsustainable at scale), chatbot (overkill and cost).

---

**D-032 · ATO certification: eInvoicing Ready+ (not Ready)**

- **Decision:** Target Ready+ (higher tier including receive). Apply at end of Phase 2. Email eInvoicing@ato.gov.au.
- **Why:** Ready+ appears on ATO's public software register — free marketing and trust signal. Receive capability required for + tier aligns with Phase 3 work.
- **Rejected:** Ready only (less visible on register), not certifying (misses free trust signal reaching exact target market).

---

**D-033 · Shared API layer: Supabase Edge Functions**

- **Decision:** Supabase Edge Functions are the shared API layer for all business logic. Next.js API routes handle web-only concerns (OAuth callbacks, inbound webhooks from Storecove/Lemon Squeezy). Both Next.js and React Native call Edge Functions identically via `supabase.functions.invoke()`. No separate API server or deployment.
- **Why:** A standalone API server means another deployment, duplicate auth middleware, and CORS config across three clients. Edge Functions are TypeScript, globally distributed, zero extra infra, and both clients already use the Supabase client. Webhook receivers (Next.js routes) are postboxes only — they validate the signature, write to DB, and return 200. Web and mobile consume the resulting data from DB via Supabase client, not from the webhook endpoint directly.
- **Rejected:** Standalone Express/Node API server (unnecessary infra for solo founder), Next.js API routes as shared API (web deployment dependency for mobile, wrong tool).

---

**D-034 · Component library: shadcn/ui with Radix**

- **Decision:** shadcn/ui as the component library. Radix component foundation. Nova preset (Lucide icons + Geist font). Components installed into `/components/ui/` via `pnpm dlx shadcn@latest add`. Never modify files in `/components/ui/` directly — extend in `/components/` instead.
- **Why:** Radix primitives handle accessibility (focus trapping, ARIA attributes, keyboard navigation, screen reader support) automatically — critical for a compliance product serving government agency suppliers under WCAG 2.1 AA. shadcn gives full ownership of component code (not a dependency) while providing a consistent, production-grade starting point. Nova/Geist is the most widely used preset — maximum ecosystem examples and community support. Geist Mono is useful for displaying ABNs, invoice numbers, and XML snippets.
- **Rejected:** Headless UI (less complete primitive set than Radix), Chakra UI (runtime CSS-in-JS overhead conflicts with Tailwind v4), MUI (opinionated styling conflicts with Tailwind), building from scratch (unnecessary for a solo founder).

---

**D-035 · Package manager: pnpm**

- **Decision:** pnpm as the package manager across all phases. `pnpm dlx` replaces `npx` for one-off CLI commands in this project.
- **Why:** Turborepo (Phase 3) is built for pnpm — the `workspace:*` protocol and workspace linking is native. pnpm is also stricter about phantom dependencies than npm (you can only import packages listed in your own `package.json`) which catches real bugs silently permitted by npm. Faster installs and significantly less disk usage via content-addressable store.
- **Rejected:** npm (not Turborepo-native, permissive about phantom dependencies), yarn (pnpm has overtaken it for new projects, especially monorepos), bun (too early for a production compliance product — ecosystem gaps in 2026).

---

**D-036 · Monorepo tooling: Turborepo at Phase 3, not before**

- **Decision:** Introduce Turborepo at Phase 3 when React Native joins the codebase. Before Phase 3: single Next.js app, flat repo structure. At Phase 3: `apps/web` (Next.js), `apps/mobile` (React Native), `packages/contracts`, `packages/types`, `packages/utils`.
- **Why:** Turborepo before Phase 3 adds tooling overhead with zero benefit — there is only one app to build. At Phase 3, shared code between web and mobile (API contracts, domain types, utility functions) justifies the monorepo structure. Turborepo remote caching also becomes valuable when CI runs both web and mobile builds simultaneously.
- **Rejected:** Turborepo from Phase 0 (premature — single app adds unnecessary config), separate repos for web and mobile (shared types would require npm publishing or git submodules), Nx (more configuration, less intuitive for a solo founder).

---

**D-037 · Phase 0 ABN/Peppol lookup: no Supabase, no caching, no rate limiting**

- **Decision:** The Phase 0 ABN Peppol Lookup Tool calls the ABR API and Peppol Directory directly on every request. No cache writes, no rate limiting via `rate_limit_buckets`. Supabase is not configured or connected in Phase 0.
- **Why:** Phase 0 ships before any infrastructure is provisioned. Supabase project setup, service role key management, and RLS policy deployment belong in Phase 1. Adding cache and rate limiting before the DB exists creates false dependencies and delays the lead magnet going live.
- **Rejected:** Partial Supabase setup in Phase 0 (introduces env var and deployment complexity with no user-facing benefit), in-memory/edge rate limiting (adds a dependency just to defer the real solution).
- **Deferred to Phase 1:** `abn_lookup_cache` (24hr TTL), `peppol_endpoint_cache` (1hr TTL), and `rate_limit_buckets` (10 req/min per IP) are all implemented in Phase 1 as part of the full Supabase integration.

---

**D-038 · Peppol Directory API: directory.peppol.eu instead of peppol.helger.com**

- **Decision:** Use the official Peppol Directory search API at `https://directory.peppol.eu/search/1.0/json?participant=iso6523-actorid-upis%3A%3A0151%3A{abn}` for Peppol registration checks. A `total-result-count > 0` indicates the participant is registered.
- **Why:** `directory.peppol.eu` is operated by OpenPeppol (the governing body) — it is the canonical, authoritative source. `peppol.helger.com` is a third-party wrapper by Philip Helger; it returned HTTP 400 in testing (May 2026) and carries no SLA or uptime guarantee. The official directory also returns richer data (document types supported, endpoint details) that will be useful when Phase 1 adds `peppol_endpoint_cache`.
- **Rejected:** `peppol.helger.com/api/ppidexistence/digitprod/` — third-party, currently broken (400), no SLA.

---

## Quick Decision Index

| Topic                              | Decision ID |
| ---------------------------------- | ----------- |
| Target market                      | D-001       |
| Geography                          | D-002       |
| Access Point                       | D-003       |
| Product name                       | D-004       |
| Multi-tenancy model                | D-005       |
| Bookkeeper Split Mode timing       | D-006       |
| User roles                         | D-007       |
| Founder protection                 | D-008       |
| ABN uniqueness                     | D-009       |
| ABN conflict resolution            | D-010       |
| Billing hybrid model               | D-011       |
| Bookkeeper flat rate               | D-012       |
| Volume tiers                       | D-013       |
| Invoice counter tracking           | D-014       |
| Bookkeeper cancellation protection | D-015       |
| Money as cents                     | D-016       |
| Snapshot pattern                   | D-017       |
| is_current trigger                 | D-018       |
| Audit log append-only              | D-019       |
| Feature flags                      | D-020       |
| Document number normalisation      | D-021       |
| ABN status snapshot                | D-022       |
| GST threshold monitoring           | D-023       |
| Database: Supabase                 | D-024       |
| Mobile: React Native               | D-025       |
| Mobile auth storage                | D-026       |
| Offline support scope              | D-027       |
| Payments: Lemon Squeezy            | D-028       |
| Email: Resend                      | D-029       |
| PDF extraction: Claude             | D-030       |
| Support reduction features         | D-031       |
| ATO certification tier             | D-032       |
| Shared API layer                   | D-033       |
| Component library                  | D-034       |
| Package manager                    | D-035       |
| Monorepo tooling                   | D-036       |
| Phase 0: no Supabase/cache/rate limiting | D-037  |
| Peppol Directory API choice              | D-038  |

---

## Open Decisions (Not Yet Made)

| #     | Question                         | Status                                                              |
| ----- | -------------------------------- | ------------------------------------------------------------------- |
| O-001 | Final product name               | Shortlist unchecked: Koru, Celo, Vori, Levo, Nevo, Zivio, Tali      |
| O-002 | Domain registration              | Blocked on O-001                                                    |
| O-003 | NZ marketing timing              | Data-driven — wait for 10+ organic NZ customers                     |
| O-004 | Volume tier introduction         | Data-driven — watch `has_external_bookkeeper` + `invoices_sent_mtd` |
| O-005 | Second accounting platform       | MYOB in Phase 3, QBO in Phase 4                                     |
| O-006 | Bookkeeper tier launch timing    | Phase 4 — after stable product and first 20 SMB customers           |
| O-007 | API key access for third parties | Phase 4 — schema ready, product not yet                             |

---

_Decisions log v1.2 · May 2026_
_Full product specification: peppol-bridge-spec.md_
_Full database schema: database-schema.md v2.2.0_
