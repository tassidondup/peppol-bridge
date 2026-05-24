# Database Schema Design

### Korlo (AU e-Invoicing SaaS) — Supabase / PostgreSQL

**Last updated:** May 2026
**Database:** PostgreSQL 15 via Supabase
**Strategy:** Unified Account Model at launch (all users manage one or more orgs — SMBs just have one), designed for Bookkeeper Split Mode (distinct SMB + bookkeeper personas with separate UX routing) without migration
**Schema version:** 2.2.0 — founder protection + edge case mitigations (Items 1, 2, 3, 5, 14)
**Platform coverage:** Web (Next.js) · iOS (React Native) · Android (React Native)

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Schema Overview](#2-schema-overview)
3. [Entity Relationship Summary](#3-entity-relationship-summary)
4. [Core Tables](#4-core-tables)
   - 4.1 [profiles](#41-profiles)
   - 4.2 [organisations](#42-organisations)
   - 4.3 [organisation_members](#43-organisation_members)
   - 4.15 [org_claim_requests](#415-org_claim_requests)
   - 4.4 [accounting_connections](#44-accounting_connections)
   - 4.5 [contacts](#45-contacts)
   - 4.6 [documents](#46-documents)
   - 4.7 [document_versions](#47-document_versions)
   - 4.8 [document_line_items](#48-document_line_items)
   - 4.9 [peppol_transmissions](#49-peppol_transmissions)
   - 4.10 [peppol_status_events](#410-peppol_status_events)
   - 4.11 [subscriptions](#411-subscriptions)
   - 4.12 [audit_logs](#412-audit_logs)
   - 4.13 [notification_preferences](#413-notification_preferences)
   - 4.14 [notifications](#414-notifications)
5. [Row Level Security](#5-row-level-security)
6. [Indexes Strategy](#6-indexes-strategy)
7. [Edge Cases Handled](#7-edge-cases-handled)
8. [Bookkeeper Split Mode — Migration Path](#8-bookkeeper-split-mode--migration-path)
9. [Key Design Decisions](#9-key-design-decisions)
10. [Payment Tracking](#10-payment-tracking)
    - 10.1 [document_payments](#101-document_payments)
    - 10.2 [Amendments to documents](#102-amendments-to-documents)
11. [Feature Flags](#11-feature-flags)
    - 11.1 [feature_flags](#111-feature_flags)
    - 11.2 [feature_flag_overrides](#112-feature_flag_overrides)
12. [Caching Layer](#12-caching-layer)
    - 12.1 [abn_lookup_cache](#121-abn_lookup_cache)
    - 12.2 [peppol_endpoint_cache](#122-peppol_endpoint_cache)
13. [Operations & Infrastructure](#13-operations--infrastructure)
    - 13.1 [job_queue](#131-job_queue)
    - 13.2 [webhook_deliveries](#132-webhook_deliveries)
    - 13.3 [rate_limit_buckets](#133-rate_limit_buckets)
    - 13.4 [access_point_usage](#134-access_point_usage)
14. [Invoice Features](#14-invoice-features)
    - 14.1 [document_attachments](#141-document_attachments)
    - 14.2 [invoice_templates](#142-invoice_templates)
    - 14.3 [recurring_invoice_schedules](#143-recurring_invoice_schedules)
15. [Reference Data](#15-reference-data)
    - 15.1 [tax_codes](#151-tax_codes)
    - 15.2 [compliance_events](#152-compliance_events)
    - 15.3 [compliance_event_dismissals](#153-compliance_event_dismissals)
16. [Growth & API](#16-growth--api)
    - 16.1 [onboarding_progress](#161-onboarding_progress)
    - 16.2 [api_keys](#162-api_keys)
17. [Mobile Extensions — React Native](#17-mobile-extensions--react-native)
    - 17.1 [What changes and why](#171-what-changes-and-why)
    - 17.2 [device_tokens](#172-device_tokens)
    - 17.3 [user_sessions](#173-user_sessions)
    - 17.4 [sync_queue](#174-sync_queue)
    - 17.5 [app_versions](#175-app_versions)
    - 17.6 [Amendments to existing tables](#176-amendments-to-existing-tables)
    - 17.7 [Offline sync architecture](#177-offline-sync-architecture)
    - 17.8 [React Native integration notes](#178-react-native-integration-notes)
    - 17.9 [Push notification architecture](#179-push-notification-architecture)

---

## 1. Design Principles

| Principle                                   | Implementation                                                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Immutability for compliance**             | Sent invoices create new versions, never update in place. Audit logs are append-only with no UPDATE/DELETE permissions                          |
| **Monetary amounts in cents**               | All amounts stored as `bigint` (minor units) to avoid floating point errors. `10000` = $100.00 AUD                                              |
| **Currency always paired with amount**      | Every amount field is accompanied by a `currency_code` field. Defaults to 'AUD' but multi-currency ready                                        |
| **Soft delete + archive**                   | `deleted_at timestamptz` for soft delete, `archived_at timestamptz` for archive. Both on every mutable table                                    |
| **AU first, NZ ready**                      | `tax_id_type` enum covers ABN + NZBN. `country_code` on every address. No migration needed for NZ                                               |
| **Tenant isolation via RLS**                | Every table gated by `org_id IN (SELECT get_user_org_ids())`. No cross-tenant data leakage possible                                             |
| **Snapshots for legal records**             | Sender/receiver details denormalised onto `document_versions` at send time. Contact record changes don't affect historical invoices             |
| **Modularity**                              | Each domain (documents, peppol, billing, audit) is a self-contained set of tables. Adding new features doesn't require altering existing tables |
| **Payment separation from transmission**    | Invoice acknowledged ≠ invoice paid. `document_payments` tracks actual settlement independently from Peppol status                              |
| **Feature flags from day one**              | All new features gated behind `feature_flags` — enables safe rollout, instant kill switch, A/B testing                                          |
| **Cache external API calls**                | ABN lookups and Peppol Directory queries cached in DB — prevents latency spikes and quota exhaustion                                            |
| **Async job queue for all background work** | Retries, token refreshes, scheduled notifications — all via `job_queue`. Never synchronous in the request path                                  |
| **Onboarding as a first-class table**       | Funnel visibility from day one — `onboarding_progress` tracks every step so you know exactly where users drop off                               |

---

## 2. Schema Overview

```
auth.users (Supabase managed)
    │
    └── profiles (1:1 extension)
            │
            └── organisation_members (many-to-many via RBAC)
                        │
                        └── organisations
                                │
                                ├── accounting_connections (Xero, MYOB, QBO)
                                │
                                ├── contacts (counterparties)
                                │
                                ├── org_claim_requests (ABN ownership transfer)
                                │
                                ├── documents
                                │       │
                                │       ├── document_versions (v1, v2, v3...)
                                │       │       │
                                │       │       ├── document_line_items
                                │       │       └── document_attachments
                                │       │
                                │       ├── document_payments
                                │       │
                                │       └── peppol_transmissions
                                │               │
                                │               └── peppol_status_events
                                │
                                ├── subscriptions (hybrid: org OR user)
                                │
                                ├── audit_logs
                                │
                                ├── invoice_templates
                                │       └── recurring_invoice_schedules
                                │
                                ├── onboarding_progress
                                ├── access_point_usage
                                └── compliance_event_dismissals

profiles
    ├── subscriptions (bookkeeper flat-rate plan)
    ├── notifications
    ├── notification_preferences
    └── api_keys

Global / system tables (no org_id)
    ├── feature_flags
    │       └── feature_flag_overrides
    ├── abn_lookup_cache
    ├── peppol_endpoint_cache
    ├── job_queue
    ├── webhook_deliveries
    ├── rate_limit_buckets
    ├── tax_codes
    └── compliance_events
```

---

## 3. Entity Relationship Summary

```
profiles          ||--o{ organisation_members }o--|| organisations
organisations     ||--o{ accounting_connections
organisations     ||--o{ contacts
organisations     ||--o{ documents
documents         ||--o{ document_versions
document_versions ||--o{ document_line_items
documents         ||--o{ peppol_transmissions
peppol_transmissions ||--o{ peppol_status_events
organisations     ||--o| subscriptions  (or profiles --o| subscriptions)
organisations     ||--o{ audit_logs
profiles          ||--o{ notifications
profiles          ||--o{ notification_preferences
```

---

## 4. Core Tables

### 4.1 profiles

Extends Supabase's `auth.users`. One row per authenticated user.

```sql
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text NOT NULL,
  full_name       text,
  avatar_url      text,
  phone           text,
  timezone        text NOT NULL DEFAULT 'Australia/Sydney',
  preferred_locale text NOT NULL DEFAULT 'en-AU',

  -- Bookkeeper Split Mode preparation (DO NOT USE until Phase 4 launches)
  -- Keeping the column commented here as a reminder only
  -- user_type text DEFAULT 'smb_owner' CHECK (user_type IN ('smb_owner', 'bookkeeper'))

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz  -- soft delete
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**Edge cases handled:**

- Profile auto-created on Supabase signup (magic link, password, Google OAuth all trigger the same hook)
- `deleted_at` for soft delete — user can request account deletion without breaking historical invoice records
- `timezone` defaults to Sydney but NZ users will have `Pacific/Auckland`

---

### 4.2 organisations

A business entity. One SMB = one org. A bookkeeper's client = one org. The bookkeeper's own firm = one org.

```sql
-- Enums
CREATE TYPE tax_id_type AS ENUM ('ABN', 'NZBN');
CREATE TYPE country_code AS ENUM ('AU', 'NZ');

CREATE TABLE public.organisations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,

  -- Tax identity (AU: ABN 11 digits, NZ: NZBN 13 digits)
  tax_id          text,
  tax_id_type     tax_id_type NOT NULL DEFAULT 'ABN',
  tax_id_verified boolean NOT NULL DEFAULT false,
  tax_id_verified_at timestamptz,
  tax_id_verified_data jsonb, -- raw ABR/NZBN API response snapshot

  -- Peppol network
  peppol_endpoint_id    text UNIQUE,  -- e.g. '0151:12345678901' (AU) | '0088:9429000000000' (NZ)
  peppol_registered_at  timestamptz,
  peppol_scheme_id      text DEFAULT '0151', -- 0151 = AU ABN | 0088 = NZ NZBN

  -- Address
  address_line1   text,
  address_line2   text,
  suburb          text,
  state           text,  -- AU: NSW/VIC/QLD etc | NZ: Auckland/Wellington etc
  postcode        text,
  country         country_code NOT NULL DEFAULT 'AU',

  -- Contact
  email           text,
  phone           text,
  website         text,

  -- Preferences
  default_currency text NOT NULL DEFAULT 'AUD',  -- ISO 4217
  logo_url        text,
  invoice_prefix  text,  -- e.g. 'INV' → INV-0001
  invoice_sequence integer NOT NULL DEFAULT 1,  -- auto-increment for invoice numbers

  -- Billing ownership
  -- NULL = this org has its own subscription (SMB owner pays directly)
  -- NOT NULL = a bookkeeper user's flat-rate subscription covers this org
  --
  -- MUTUAL EXCLUSIVITY RULE (enforced by application, not DB constraint):
  -- billing_owner_user_id IS NOT NULL → bookkeeper pays via flat-rate plan
  -- billing_owner_user_id IS NULL     → org pays its own subscription
  -- These two states NEVER coexist simultaneously.
  -- Transition only via the org_claim_requests flow (transfer_billing flag).
  billing_owner_user_id uuid REFERENCES public.profiles(id),

  -- SMB ownership status
  -- false = only a bookkeeper manages this org — no SMB user account exists yet
  -- true  = the SMB owner themselves has an account and is a member of this org
  is_self_managed   boolean NOT NULL DEFAULT true,

  -- Populated when an SMB user successfully claims a bookkeeper-created org
  claimed_by_user_id uuid REFERENCES public.profiles(id),
  claimed_at         timestamptz,

  -- Immutable record of who created this org — set once at creation, never changed
  -- Used to protect the founder from being removed or downgraded by invited owners
  founded_by        uuid REFERENCES public.profiles(id),

  -- GST registration (Item 5 — GST threshold crossover mitigation)
  gst_registered            boolean NOT NULL DEFAULT false,
  gst_registered_at         date,
  -- Estimated annual revenue in cents — updated monthly from invoices_sent_mtd × 12
  -- Used to trigger GST threshold warning notification (~$65k annualised)
  estimated_annual_revenue  bigint,
  gst_threshold_warning_sent_at timestamptz,
  -- When the "you may be approaching GST threshold" notification was sent

  -- ABN status monitoring (Item 3 — ABN deregistered post-send mitigation)
  abn_status_changed_at     timestamptz,
  -- Populated when ABR lookup detects ABN status change from 'Active' → anything else
  -- Triggers notification to org owner and bookkeeper members

  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,  -- soft delete
  archived_at     timestamptz   -- archive
);

-- Validate ABN format (11 digits) when tax_id_type = ABN
-- Validate NZBN format (13 digits) when tax_id_type = NZBN
ALTER TABLE organisations ADD CONSTRAINT chk_tax_id_format
  CHECK (
    (tax_id_type = 'ABN' AND (tax_id IS NULL OR tax_id ~ '^\d{11}$')) OR
    (tax_id_type = 'NZBN' AND (tax_id IS NULL OR tax_id ~ '^\d{13}$'))
  );

CREATE INDEX idx_organisations_tax_id ON organisations(tax_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_organisations_peppol ON organisations(peppol_endpoint_id) WHERE deleted_at IS NULL;

-- One active org per ABN/NZBN — prevents duplicate orgs for the same real-world business
-- Application must handle the conflict gracefully with the org_claim_requests flow
CREATE UNIQUE INDEX idx_organisations_unique_abn
  ON organisations(tax_id, tax_id_type)
  WHERE tax_id IS NOT NULL
    AND deleted_at IS NULL;
```

**Edge cases handled:**

- `billing_owner_user_id` = NULL means the org pays its own subscription (SMB). NOT NULL means a bookkeeper's flat-rate plan covers it. This is the hybrid billing hook.
- `peppol_scheme_id` differs between AU (0151) and NZ (0088) — stored per org
- `invoice_sequence` for auto-incrementing invoice numbers per org — prevents gaps and duplicates
- ABN/NZBN format constraint enforced at DB level, not just application level
- `peppol_endpoint_id` is UNIQUE — one endpoint per network registration
- `UNIQUE INDEX` on `(tax_id, tax_id_type)` — one active org per ABN. If a second signup attempts the same ABN, the application catches the conflict and routes through the `org_claim_requests` flow instead of creating a duplicate
- `is_self_managed = false` signals bookkeeper-only management — no SMB user account yet. When the SMB owner claims the org, `is_self_managed` flips to `true` and `claimed_by_user_id` is populated

---

### 4.15 org_claim_requests

Handles the scenario where an SMB owner signs up and finds their ABN already registered by their bookkeeper. Provides a formal, verified ownership transfer workflow.

**The three scenarios this solves:**

| Scenario | Description                                        | Resolution                                                                     |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| **A**    | Mick signs up first, Jane (bookkeeper) joins later | Jane invited as member — no claim needed                                       |
| **B**    | Jane creates Mick's org first, Mick signs up later | ABN uniqueness fires → Mick submits claim → Jane approves → Mick becomes owner |
| **C**    | Jane manages Mick's org, Mick wants to take over   | Mick submits claim → Jane approves → ownership transfers, Jane steps back      |

```sql
CREATE TYPE claim_status AS ENUM (
  'pending',    -- claimant submitted, awaiting decision
  'approved',   -- current owner approved — claimant becomes owner
  'rejected',   -- current owner rejected the claim
  'cancelled',  -- claimant withdrew the request
  'expired'     -- no decision made within expires_at window
);

CREATE TABLE public.org_claim_requests (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES public.organisations(id),

  -- Who is claiming ownership
  claimant_user_id        uuid NOT NULL REFERENCES public.profiles(id),
  claimant_email          text NOT NULL,
  claimant_message        text,
  -- "Hi, I'm Mick — this is my painting business. My bookkeeper Jane set this up."

  -- Ownership verification
  -- Claimant must prove they own the ABN before claim is auto-approved
  -- or sent to the current owner for manual approval
  verification_method     text CHECK (
    verification_method IN (
      'abr_name_match',   -- entity name on ABR matches claimant's stated name
      'email_domain',     -- claimant email domain matches org website domain
      'manual_review'     -- support team verified manually
    )
  ),
  verification_passed     boolean,
  verification_data       jsonb,   -- ABR response or support notes used to verify
  verified_at             timestamptz,

  -- Current owner who must approve
  -- NULL if the org was created by a bookkeeper and has no SMB user yet
  -- In that case, auto-approve if verification passes
  current_owner_user_id   uuid REFERENCES public.profiles(id),

  -- Decision
  status                  claim_status NOT NULL DEFAULT 'pending',
  decided_by              uuid REFERENCES public.profiles(id),
  decided_at              timestamptz,
  rejection_reason        text,

  -- What happens on approval
  transfer_billing        boolean NOT NULL DEFAULT false,
  -- true  = move billing from bookkeeper flat-rate to claimant's own subscription
  -- false = billing stays with bookkeeper (they still pay for this client)

  -- Internal notes (support team use)
  notes                   text,

  -- Expiry — unanswered requests expire after 14 days
  expires_at              timestamptz NOT NULL
    DEFAULT (now() + interval '14 days'),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_claim_requests_org
  ON org_claim_requests(org_id, status);

CREATE INDEX idx_claim_requests_claimant
  ON org_claim_requests(claimant_user_id, status);

-- Only one active claim per org at a time
CREATE UNIQUE INDEX idx_claim_requests_one_active
  ON org_claim_requests(org_id)
  WHERE status = 'pending';
```

**What happens when a claim is approved:**

```sql
-- Run in a transaction on claim approval
CREATE OR REPLACE FUNCTION public.approve_org_claim(
  p_claim_id    uuid,
  p_decided_by  uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_claim   org_claim_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_claim FROM org_claim_requests WHERE id = p_claim_id;

  -- 1. Update claim status
  UPDATE org_claim_requests SET
    status      = 'approved',
    decided_by  = p_decided_by,
    decided_at  = now()
  WHERE id = p_claim_id;

  -- 2. Add claimant as owner of the org
  -- is_founder = false — Mick did not create this org, Jane did
  -- The original founder row (Jane's) stays intact
  INSERT INTO organisation_members (org_id, user_id, role, is_founder, accepted_at)
  VALUES (v_claim.org_id, v_claim.claimant_user_id, 'owner', false, now())
  ON CONFLICT (org_id, user_id)
  DO UPDATE SET role = 'owner', accepted_at = now(), deleted_at = NULL;

  -- 3. Downgrade previous owner to bookkeeper role (if they were an SMB owner)
  --    If they were a bookkeeper, they stay as bookkeeper (external manager in Phase 4)
  IF v_claim.current_owner_user_id IS NOT NULL THEN
    UPDATE organisation_members SET role = 'bookkeeper'
    WHERE org_id = v_claim.org_id
      AND user_id = v_claim.current_owner_user_id
      AND role = 'owner';
  END IF;

  -- 4. Mark org as self-managed, record the claim
  UPDATE organisations SET
    is_self_managed     = true,
    claimed_by_user_id  = v_claim.claimant_user_id,
    claimed_at          = now(),
    -- Transfer billing if requested
    billing_owner_user_id = CASE
      WHEN v_claim.transfer_billing THEN NULL  -- claimant pays own subscription
      ELSE billing_owner_user_id               -- bookkeeper still pays
    END
  WHERE id = v_claim.org_id;

  -- 5. If billing transferred: create free tier subscription for the org
  --    and record the billing transfer audit trail on it
  IF v_claim.transfer_billing THEN
    INSERT INTO subscriptions (
      subscriber_type,
      subscriber_id,
      plan,
      status,
      billing_transferred_from,
      billing_transferred_at
    )
    VALUES (
      'organisation',
      v_claim.org_id,
      'free',
      'active',
      v_claim.current_owner_user_id,  -- Jane — who previously paid
      now()
    )
    ON CONFLICT (subscriber_type, subscriber_id)
    DO UPDATE SET
      billing_transferred_from = v_claim.current_owner_user_id,
      billing_transferred_at   = now(),
      updated_at               = now();
    -- Claimant (Mick) starts on free tier
    -- Notification sent: "You've taken ownership. You're on the free plan — upgrade to send more invoices."
  END IF;

  -- 5. Audit log
  PERFORM public.create_audit_log(
    p_decided_by, v_claim.org_id,
    'org.claim_approved',
    'org_claim_request', p_claim_id,
    NULL,
    jsonb_build_object('claimant_user_id', v_claim.claimant_user_id,
                       'transfer_billing', v_claim.transfer_billing)
  );
END;
$$;
```

**Application decision tree for ABN conflict:**

```
User signs up → enters ABN
        ↓
CHECK: active org with this ABN exists?
        │
        ├── NO → create new org normally (is_self_managed = true)
        │
        └── YES
              │
              ├── User already a member of this org?
              │     └── Redirect to org dashboard
              │
              ├── Org has no current owner (is_self_managed = false)?
              │     └── "This looks like your business. Verify to claim it."
              │         → auto-approve if ABR name match passes
              │
              └── Org has an existing owner?
                    └── "This ABN is already registered.
                         Request access or claim ownership."
                    ├── Request access → invite flow (Scenario A)
                    └── Claim ownership → org_claim_requests (Scenario B/C)
```

**Edge cases handled:**

- `UNIQUE INDEX` on `org_id WHERE status = 'pending'` — only one active claim per org at a time. A second claim attempt tells the user "a claim is already pending."
- `current_owner_user_id = NULL` — bookkeeper-only org (no SMB user yet). If verification passes, auto-approve without human intervention.
- `transfer_billing = false` — claimant takes ownership but bookkeeper's subscription still covers this org. Useful when Jane manages billing on Mick's behalf.
- `expires_at` — unanswered claims expire after 14 days. A cron job sets `status = 'expired'` and notifies the claimant. They can re-submit.
- Previous owner downgraded to `bookkeeper` role not removed — their historical work stays attributed correctly in the audit log.

---

### 4.3 organisation_members

The RBAC join table. Defines who can access which organisation and what they can do.

```sql
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'bookkeeper', 'viewer');
-- UI display mapping (schema value → label shown in product):
-- 'owner'      → "Owner"
-- 'admin'      → "Administrator"
-- 'bookkeeper' → "Bookkeeper / Accountant"
-- 'viewer'     → "View Only"

CREATE TABLE public.organisation_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            org_role NOT NULL DEFAULT 'viewer',

  -- Founder flag — set to true only for the person who created the org
  -- Immutable after creation. Founders cannot be removed, downgraded, or
  -- overridden by any invited member including other owners.
  -- Flow A (Mick creates org):  Mick's row → is_founder = true
  -- Flow B (Jane creates org):  Jane's row → is_founder = true
  --                             Mick invited later → is_founder = false
  is_founder      boolean NOT NULL DEFAULT false,

  -- Invitation tracking
  -- NULL on invited_by = this member created the org themselves (is_founder = true)
  invited_by      uuid REFERENCES public.profiles(id),
  invite_token    text UNIQUE,
  invited_at      timestamptz,
  invite_expires_at timestamptz,
  accepted_at     timestamptz,  -- NULL = invite pending

  -- Bookkeeper Split Mode prep: external manager flag (Phase 4)
  -- When Bookkeeper Split Mode launches, uncomment:
  -- is_external_manager boolean NOT NULL DEFAULT false,
  -- When true: this member is a bookkeeper managing this org as a client (not an employee)

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,

  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_user_id ON organisation_members(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_members_org_id ON organisation_members(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_members_invite_token ON organisation_members(invite_token) WHERE invite_token IS NOT NULL;

-- Only one founder per org — DB-level guarantee
CREATE UNIQUE INDEX idx_org_members_one_founder
  ON organisation_members(org_id)
  WHERE is_founder = true AND deleted_at IS NULL;
```

**Auto-create founder member on org creation:**

When an org is created, the creator is automatically inserted as the founding owner. This happens via a trigger — the application never has to remember to do it manually.

```sql
CREATE OR REPLACE FUNCTION public.handle_org_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Auto-insert the org creator as founding owner
  INSERT INTO public.organisation_members (
    org_id,
    user_id,
    role,
    is_founder,
    invited_by,    -- NULL = not invited, they created it
    accepted_at    -- auto-accepted — no invite flow needed for founder
  ) VALUES (
    NEW.id,
    NEW.founded_by,
    'owner',
    true,
    NULL,
    now()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_org_created
  AFTER INSERT ON organisations
  FOR EACH ROW
  WHEN (NEW.founded_by IS NOT NULL)
  EXECUTE PROCEDURE public.handle_org_created();
```

**Helper function for RLS — checks if current user is the founder of a given org:**

```sql
CREATE OR REPLACE FUNCTION public.is_org_founder(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE org_id     = p_org_id
      AND user_id    = auth.uid()
      AND is_founder = true
      AND deleted_at IS NULL
  );
$$;
```

**Role permissions matrix:**

| Permission                  | owner | admin | bookkeeper | viewer | Notes                       |
| --------------------------- | ----- | ----- | ---------- | ------ | --------------------------- |
| View invoices               | ✅    | ✅    | ✅         | ✅     |                             |
| Send invoices               | ✅    | ✅    | ✅         | ❌     |                             |
| Create/edit invoices        | ✅    | ✅    | ✅         | ❌     |                             |
| Connect accounting platform | ✅    | ✅    | ❌         | ❌     |                             |
| Manage team members         | ✅    | ✅    | ❌         | ❌     |                             |
| Manage billing              | ✅    | ❌    | ❌         | ❌     |                             |
| Delete organisation         | ✅    | ❌    | ❌         | ❌     |                             |
| Remove/downgrade founder    | ❌    | ❌    | ❌         | ❌     | Founder is always protected |
| Remove themselves           | ✅    | ✅    | ✅         | ✅     | Any member can leave        |

**Edge cases handled:**

- `accepted_at IS NULL` = invite pending — no access until accepted
- `invite_expires_at` — invites auto-expire after 7 days. Cron cleans up.
- `deleted_at` on members = soft remove. Audit logs retain the reference.
- `is_founder = true` — set once on org creation, never changed. Protected by RLS and unique index.
- `invited_by = NULL` means the member created the org — correlates with `is_founder = true`
- `UNIQUE INDEX` on `(org_id) WHERE is_founder = true` — one founder per org, DB-enforced
- Flow A (Mick invites Jane): Jane's `is_founder = false`, `invited_by = mick_user_id`
- Flow B (Jane creates org, invites Mick): Jane's `is_founder = true`, Mick's `is_founder = false`
- `is_external_manager` commented out — Bookkeeper Split Mode (Phase 4) placeholder

---

### 4.4 accounting_connections

OAuth connections to Xero, MYOB, QuickBooks. Multiple connections per org allowed.

```sql
CREATE TYPE accounting_platform AS ENUM ('xero', 'myob', 'quickbooks', 'manual');
CREATE TYPE sync_status AS ENUM ('idle', 'syncing', 'error', 'disconnected');

CREATE TABLE public.accounting_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  platform        accounting_platform NOT NULL,

  -- OAuth tokens (stored encrypted via Supabase Vault)
  -- NEVER store raw tokens in plaintext columns
  vault_access_token_id  text,   -- Supabase Vault secret ID for access token
  vault_refresh_token_id text,   -- Supabase Vault secret ID for refresh token
  token_expires_at        timestamptz,
  token_scope             text,   -- granted OAuth scopes

  -- Platform tenant/org identifiers
  platform_tenant_id   text,   -- Xero: tenantId | MYOB: companyFileId | QBO: realmId
  platform_org_name    text,   -- display name from accounting platform
  platform_org_id      text,   -- organisation ID in the accounting platform
  platform_currency    text,   -- base currency in the accounting platform

  -- Webhook
  webhook_id           text,   -- registered webhook ID at the platform
  webhook_secret       text,   -- for verifying webhook signatures (encrypted)

  -- Sync state
  last_synced_at       timestamptz,
  last_sync_cursor     text,   -- pagination cursor / modified_since token for incremental sync
  sync_status          sync_status NOT NULL DEFAULT 'idle',
  sync_error           text,
  sync_error_at        timestamptz,

  -- Status
  is_active            boolean NOT NULL DEFAULT true,
  connected_by         uuid REFERENCES public.profiles(id),
  connected_at         timestamptz NOT NULL DEFAULT now(),
  disconnected_at      timestamptz,
  disconnected_by      uuid REFERENCES public.profiles(id),
  disconnected_reason  text,  -- 'user_action' | 'token_expired' | 'platform_revoked'

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz
);

-- One active connection per platform per org
CREATE UNIQUE INDEX idx_accounting_connections_active
  ON accounting_connections(org_id, platform)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX idx_accounting_connections_org_id
  ON accounting_connections(org_id) WHERE deleted_at IS NULL;
```

**Edge cases handled:**

- `vault_access_token_id` stores a Supabase Vault secret ID, not the token itself — tokens never in plaintext columns
- `last_sync_cursor` enables incremental sync — only pull changes since last sync, not full refresh
- `disconnected_reason` tracks WHY a connection broke — helps diagnose `invalid_grant` vs user-revoked vs platform API changes
- Multiple connections per org allowed (Xero AND MYOB simultaneously) — no UNIQUE constraint on `(org_id, platform)` unless active

---

### 4.5 contacts

Reusable counterparty records per organisation. The businesses you invoice or receive from.

```sql
CREATE TYPE contact_source AS ENUM ('manual', 'xero', 'myob', 'quickbooks', 'pdf_extraction');

CREATE TABLE public.contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  -- Identity
  name            text NOT NULL,
  tax_id          text,
  tax_id_type     tax_id_type DEFAULT 'ABN',
  tax_id_verified boolean NOT NULL DEFAULT false,
  tax_id_verified_at  timestamptz,

  -- Peppol
  peppol_endpoint_id   text,
  peppol_scheme_id     text DEFAULT '0151',
  peppol_verified      boolean NOT NULL DEFAULT false,
  peppol_verified_at   timestamptz,

  -- Address
  address_line1   text,
  address_line2   text,
  suburb          text,
  state           text,
  postcode        text,
  country         country_code DEFAULT 'AU',

  -- Contact details
  email           text,
  phone           text,

  -- Classification
  is_government   boolean NOT NULL DEFAULT false,
  is_supplier     boolean NOT NULL DEFAULT false,  -- receives our POs / sends us invoices
  is_customer     boolean NOT NULL DEFAULT true,   -- we invoice them

  -- Source
  source          contact_source NOT NULL DEFAULT 'manual',
  source_contact_id text,  -- ID from the accounting platform (for sync matching)
  accounting_connection_id uuid REFERENCES public.accounting_connections(id),

  -- Notes
  notes           text,
  tags            text[],  -- flexible tagging

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  archived_at     timestamptz
);

CREATE INDEX idx_contacts_org_id ON contacts(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_tax_id ON contacts(org_id, tax_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_peppol ON contacts(peppol_endpoint_id) WHERE peppol_endpoint_id IS NOT NULL;
-- Full-text search on contact name
CREATE INDEX idx_contacts_name_search ON contacts USING GIN (to_tsvector('english', name));
```

**Edge cases handled:**

- A contact can be both `is_supplier` AND `is_customer` (you both invoice them and receive invoices from them)
- `is_government = true` — used to display government-specific guidance in the UI (e.g. "this entity requires Peppol")
- `source_contact_id` — prevents duplicate contacts when syncing from Xero. Match on this before creating new records.
- `tags` as a Postgres array — allows flexible categorisation without a separate tags table
- `peppol_verified_at` — Peppol Directory lookups are cached. Re-verify on a schedule (weekly cron).

---

### 4.6 documents

Parent table for all document types. One row per logical document regardless of how many versions it has.

```sql
CREATE TYPE document_type AS ENUM ('invoice', 'credit_note', 'quote', 'estimate');
CREATE TYPE document_direction AS ENUM ('outbound', 'inbound');
CREATE TYPE document_status AS ENUM (
  'draft',           -- created, not sent
  'pending_send',    -- queued for transmission
  'submitted',       -- sent to Access Point
  'delivered',       -- Access Point confirmed delivery to receiver AP
  'acknowledged',    -- receiver's system accepted it
  'rejected',        -- receiver's system or network rejected it
  'cancelled',       -- cancelled before or after send
  'received',        -- inbound: we received this from someone else
  'archived'
);

CREATE TABLE public.documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  -- Document classification
  document_type    document_type NOT NULL DEFAULT 'invoice',
  direction        document_direction NOT NULL DEFAULT 'outbound',

  -- Document number
  document_number  text NOT NULL,
  -- Normalised for uniqueness checks — strips hyphens, spaces, leading zeros
  -- e.g. "INV-042" and "INV042" and "inv042" all normalise to "inv042"
  -- See normalise_document_number() function in Section 18
  document_number_normalised text GENERATED ALWAYS AS (
    LOWER(REGEXP_REPLACE(document_number, '[^A-Za-z0-9]', '', 'g'))
  ) STORED,
  -- Sequence number for generating document numbers
  sequence_number  integer,

  -- Version tracking
  current_version  integer NOT NULL DEFAULT 1,

  -- Document relationships
  -- credit_note → references original invoice
  -- amendment → references previous version's document
  related_document_id uuid REFERENCES public.documents(id),
  relationship_type   text CHECK (relationship_type IN ('credit_note_for', 'amendment_of', 'quote_for')),

  -- Counterparty reference (live reference — may change)
  contact_id       uuid REFERENCES public.contacts(id) ON DELETE SET NULL,

  -- Status
  status           document_status NOT NULL DEFAULT 'draft',

  -- Source platform
  source           contact_source NOT NULL DEFAULT 'manual',
  source_document_id text,  -- Invoice ID in Xero/MYOB/QBO
  accounting_connection_id uuid REFERENCES public.accounting_connections(id),

  -- Key dates
  issued_at        date NOT NULL,
  due_at           date,
  period_start     date,   -- service period start
  period_end       date,   -- service period end

  -- Currency
  currency_code    text NOT NULL DEFAULT 'AUD',  -- ISO 4217

  -- Amounts (always in minor units / cents)
  -- These mirror current_version amounts for quick querying without joining versions
  subtotal_amount  bigint NOT NULL DEFAULT 0,
  tax_amount       bigint NOT NULL DEFAULT 0,
  total_amount     bigint NOT NULL DEFAULT 0,

  -- Notes visible to recipient
  notes            text,
  -- Internal reference
  internal_ref     text,
  -- Buyer's purchase order reference
  buyer_ref        text,
  -- Contract reference
  contract_ref     text,
  -- Project reference
  project_ref      text,

  -- Timestamps
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  archived_at      timestamptz,

  -- Enforce unique document number per org on the NORMALISED form
  -- "INV-042" and "INV042" are treated as the same document number
  -- See Section 18 — Item 2 for the normalise_document_number() function
  UNIQUE(org_id, document_number_normalised)
);

-- Performance indexes
CREATE INDEX idx_documents_org_status
  ON documents(org_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_documents_org_type
  ON documents(org_id, document_type)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_documents_issued_at
  ON documents(org_id, issued_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_documents_contact
  ON documents(org_id, contact_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_documents_source
  ON documents(source, source_document_id)
  WHERE source_document_id IS NOT NULL;

-- Full-text search
CREATE INDEX idx_documents_search
  ON documents USING GIN (to_tsvector('english',
    COALESCE(document_number, '') || ' ' ||
    COALESCE(notes, '') || ' ' ||
    COALESCE(buyer_ref, '') || ' ' ||
    COALESCE(internal_ref, '')
  ));
```

**Edge cases handled:**

- `related_document_id` + `relationship_type` handles the credit note → invoice relationship cleanly. One query gets you the full chain.
- `contact_id ON DELETE SET NULL` — if a contact is soft-deleted, documents still exist and reference the snapshot in `document_versions`
- `source_document_id` — prevents creating duplicate documents when syncing from Xero/MYOB
- `buyer_ref`, `contract_ref`, `project_ref` — these are Ready+ fields required for large buyers. Stored at document level for quick access.
- Amount fields mirrored from `current_version` — avoids joining to `document_versions` for list views

---

### 4.7 document_versions

Immutable version snapshots. Every time a document is amended, a new version is created. Sent documents NEVER update in place.

```sql
CREATE TABLE public.document_versions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number   integer NOT NULL,

  -- Counterparty snapshots (denormalised at version creation time)
  -- These NEVER change even if the contact record is updated later
  -- This is legally required — the invoice must reflect who you invoiced at the time
  sender_snapshot  jsonb NOT NULL,
  -- Expected shape: {
  --   name, tax_id, tax_id_type, peppol_endpoint_id, peppol_scheme_id,
  --   address: { line1, line2, suburb, state, postcode, country },
  --   email, phone
  -- }
  receiver_snapshot jsonb NOT NULL,
  -- Same shape as sender_snapshot

  -- Full document data snapshot
  document_data    jsonb NOT NULL,
  -- Expected shape: {
  --   document_type, document_number, issued_at, due_at,
  --   currency_code, subtotal_amount, tax_amount, total_amount,
  --   notes, buyer_ref, contract_ref, project_ref,
  --   line_items: [{ line_number, description, quantity, unit_price, tax_rate, ... }]
  -- }

  -- Version metadata
  change_reason    text,   -- 'initial' | 'amendment' | 'correction' | 'auto_sync'
  change_summary   text,   -- human-readable summary of what changed
  changed_by       uuid REFERENCES public.profiles(id),
  is_current       boolean NOT NULL DEFAULT true,  -- denormalised for fast queries

  -- XML (outbound only)
  xml_storage_path       text,   -- path in Supabase Storage: org_id/doc_id/v1.xml
  xml_file_size_bytes    integer,
  xml_sha256_hash        text,   -- integrity check
  xml_generated_at       timestamptz,

  -- ABN status snapshot at time of send (Item 3 — ABN deregistered post-send mitigation)
  -- Captures sender and receiver ABN status from ABR at the moment of transmission
  -- Legal protection: proves ABN was 'Active' when invoice was sent
  -- Even if ABN is later cancelled, this snapshot is immutable
  abn_status_at_send     text,   -- 'Active' | 'Cancelled' | 'Unknown'
  receiver_abn_status_at_send text,

  -- Parsed JSON snapshot of XML (for querying without parsing XML)
  xml_parsed_snapshot    jsonb,

  -- Validation results
  xml_validation_result  jsonb,
  -- Expected shape: {
  --   schema_valid: boolean,
  --   schematron_valid: boolean,
  --   pint_aunz_valid: boolean,
  --   errors: [{ code, message, path, severity }],
  --   warnings: [{ code, message, path }],
  --   validated_at: timestamp
  -- }

  -- PDF (if source was PDF upload)
  pdf_storage_path       text,   -- original uploaded PDF path
  pdf_extraction_result  jsonb,  -- Claude API extraction result with confidence scores

  -- Status at time of this version
  status           document_status NOT NULL,

  created_at       timestamptz NOT NULL DEFAULT now(),

  -- No updated_at — versions are immutable after creation
  -- No deleted_at — versions cannot be deleted (legal requirement)
  -- No archived_at — versions cannot be archived

  UNIQUE(document_id, version_number)
);

-- Mark all previous versions as not current when new version is created
CREATE OR REPLACE FUNCTION public.set_previous_versions_not_current()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE document_versions
  SET is_current = false
  WHERE document_id = NEW.document_id
    AND id != NEW.id
    AND is_current = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_document_version_created
  AFTER INSERT ON document_versions
  FOR EACH ROW EXECUTE PROCEDURE public.set_previous_versions_not_current();

CREATE INDEX idx_doc_versions_document_id
  ON document_versions(document_id);

CREATE INDEX idx_doc_versions_current
  ON document_versions(document_id)
  WHERE is_current = true;
```

**Edge cases handled:**

- `sender_snapshot` and `receiver_snapshot` are frozen at version creation — legal requirement. Even if the contact's ABN changes tomorrow, the invoice shows what it showed when sent.
- `is_current` denormalised flag — avoids expensive `WHERE version_number = MAX(version_number)` subquery on every list view
- `xml_sha256_hash` — integrity verification. If the XML in storage ever changes (storage corruption, accidental overwrite), you can detect it.
- No `deleted_at` or `updated_at` — versions are truly immutable. The trigger enforces this intention.
- `pdf_extraction_result` stores Claude's confidence scores — useful for debugging extraction quality over time

---

### 4.8 document_line_items

Line items stored per version for full historical accuracy.

```sql
-- UN/ECE unit of measure codes (most common)
-- EA = Each, HUR = Hour, DAY = Day, WEE = Week, MON = Month
-- MTR = Metre, KGM = Kilogram, LTR = Litre

CREATE TABLE public.document_line_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id   uuid NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,

  -- Position
  line_number           integer NOT NULL,

  -- Item details
  description           text NOT NULL,
  item_code             text,   -- SKU or product code
  quantity              numeric(12, 4) NOT NULL DEFAULT 1,
  unit_code             text NOT NULL DEFAULT 'EA',  -- UN/ECE unit codes

  -- Pricing (in minor units / cents)
  unit_price            bigint NOT NULL,   -- price per unit in cents
  discount_percent      numeric(5, 2),    -- line-level discount %
  discount_amount       bigint,           -- line-level discount in cents

  -- Tax
  -- PINT A-NZ tax categories:
  -- S = Standard rate (GST 10%)
  -- Z = Zero-rated GST
  -- E = Exempt from GST
  -- AE = Reverse charge (not common in AU)
  -- K = VAT exempt for EEA intra-community (not AU)
  -- G = Free export (GST-free exports)
  -- O = Services outside scope
  tax_category          text NOT NULL DEFAULT 'S'
    CHECK (tax_category IN ('S', 'Z', 'E', 'AE', 'K', 'G', 'O')),
  tax_rate              numeric(5, 4) NOT NULL DEFAULT 0.1000,  -- 0.1000 = 10% GST
  tax_amount            bigint NOT NULL DEFAULT 0,  -- in cents

  -- Totals (in cents)
  line_amount           bigint NOT NULL,  -- exclusive of tax, after discount
  line_amount_inclusive bigint NOT NULL,  -- inclusive of tax

  -- Service period (optional, for time-based billing)
  period_start          date,
  period_end            date,

  -- Source reference from accounting platform
  source_line_id        text,

  -- Notes
  notes                 text,

  created_at            timestamptz NOT NULL DEFAULT now(),

  UNIQUE(document_version_id, line_number)
);

CREATE INDEX idx_line_items_version_id ON document_line_items(document_version_id);
```

**Edge cases handled:**

- `tax_rate` stored as `numeric(5, 4)` not percentage — `0.1000` not `10`. Prevents ambiguity.
- `discount_percent` AND `discount_amount` — some platforms use one, some use the other. Store both.
- `line_amount` vs `line_amount_inclusive` — PINT A-NZ requires tax-exclusive amounts on line items but many AU businesses think in tax-inclusive. Store both.
- `unit_code` using UN/ECE standard — required for PINT A-NZ compliance
- `period_start` / `period_end` — service-based invoices (consulting, subscriptions) need this for PINT A-NZ

---

### 4.9 peppol_transmissions

The actual Peppol network send/receive events. One per send attempt.

```sql
CREATE TYPE transmission_direction AS ENUM ('outbound', 'inbound');
CREATE TYPE transmission_status AS ENUM (
  'queued',        -- waiting to be sent
  'submitting',    -- currently being submitted to Access Point
  'submitted',     -- Access Point accepted it
  'delivered',     -- Access Point confirmed delivery to receiver's AP
  'acknowledged',  -- receiver's system accepted the document
  'rejected',      -- rejected (by network OR receiver)
  'failed',        -- technical failure (not a rejection — e.g. network timeout)
  'cancelled'      -- cancelled before submission
);

CREATE TYPE access_point_provider AS ENUM ('storecove', 'messagexchange', 'exedee');

CREATE TABLE public.peppol_transmissions (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id                uuid NOT NULL REFERENCES public.documents(id),
  document_version_id        uuid NOT NULL REFERENCES public.document_versions(id),
  org_id                     uuid NOT NULL REFERENCES public.organisations(id),

  -- Direction
  direction                  transmission_direction NOT NULL,

  -- Access Point
  access_point_provider      access_point_provider NOT NULL DEFAULT 'storecove',
  access_point_transmission_id text,  -- ID assigned by Storecove/MessageXchange
  access_point_raw_request   jsonb,  -- raw request sent to Access Point (for debugging)
  access_point_raw_response  jsonb,  -- raw response from Access Point (for debugging)

  -- Peppol network identifiers
  sender_peppol_id           text NOT NULL,   -- e.g. '0151:12345678901'
  receiver_peppol_id         text NOT NULL,

  -- Peppol document identifiers
  peppol_document_id         text,  -- UUID assigned by Peppol network
  peppol_profile_id          text NOT NULL
    DEFAULT 'urn:peppol:bis:billing',
  peppol_customization_id    text NOT NULL
    DEFAULT 'urn:peppol:pint:billing-1@aunz-1',

  -- Status
  status                     transmission_status NOT NULL DEFAULT 'queued',

  -- Rejection details
  rejection_code             text,
  rejection_reason_raw       text,   -- exact message from network
  rejection_reason_friendly  text,   -- translated human-readable message
  rejection_can_retry        boolean,

  -- Retry logic (exponential backoff)
  attempt_number             integer NOT NULL DEFAULT 1,
  max_attempts               integer NOT NULL DEFAULT 5,
  next_retry_at              timestamptz,
  -- Backoff schedule: 1min → 5min → 30min → 4hr → 24hr

  -- Timestamps
  queued_at                  timestamptz NOT NULL DEFAULT now(),
  submitted_at               timestamptz,
  delivered_at               timestamptz,
  acknowledged_at            timestamptz,
  rejected_at                timestamptz,
  failed_at                  timestamptz,
  cancelled_at               timestamptz,

  -- Who triggered this
  initiated_by               uuid REFERENCES public.profiles(id),
  -- NULL for inbound (no user triggered it — we received it)

  -- Idempotency key — prevents double-send on retry
  idempotency_key            text UNIQUE NOT NULL
    DEFAULT gen_random_uuid()::text,

  -- Bulk send batch tracking (Item 14)
  -- NULL for single sends — populated with a shared UUID for bulk send operations
  -- Lets you query "show me all transmissions from this bulk send job"
  batch_id                   uuid,

  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
  -- No deleted_at — transmissions are permanent audit records
);

CREATE INDEX idx_transmissions_document_id
  ON peppol_transmissions(document_id);

CREATE INDEX idx_transmissions_org_id
  ON peppol_transmissions(org_id);

CREATE INDEX idx_transmissions_status
  ON peppol_transmissions(status);

-- Partial index for retry queue — only rows that need retrying
CREATE INDEX idx_transmissions_retry_queue
  ON peppol_transmissions(next_retry_at)
  WHERE status = 'failed'
    AND attempt_number < max_attempts
    AND next_retry_at IS NOT NULL;

-- Partial index for pending status (dashboard queries)
CREATE INDEX idx_transmissions_pending
  ON peppol_transmissions(org_id, queued_at DESC)
  WHERE status IN ('queued', 'submitting', 'submitted');

-- Bulk send batch lookup (Item 14)
CREATE INDEX idx_transmissions_batch
  ON peppol_transmissions(batch_id)
  WHERE batch_id IS NOT NULL;
```

**Edge cases handled:**

- `idempotency_key` — if the same invoice is submitted twice (race condition, user double-click), the second insert fails with a unique constraint. The Access Point never sees a duplicate.
- `rejection_code` + `rejection_reason_raw` + `rejection_reason_friendly` — three separate fields. Raw for debugging, friendly for display.
- `rejection_can_retry` — some rejections are permanent (duplicate document), some are transient (network timeout). This flag drives whether the retry button shows in the UI.
- Separate timestamp fields per status (`submitted_at`, `delivered_at` etc.) — faster queries than parsing status event timeline for dashboards
- `access_point_raw_request` + `access_point_raw_response` — full request/response logged for debugging without needing to call the Access Point again

---

### 4.10 peppol_status_events

The status timeline for each transmission. One row per status change.

```sql
CREATE TABLE public.peppol_status_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transmission_id       uuid NOT NULL
    REFERENCES public.peppol_transmissions(id) ON DELETE CASCADE,

  -- Status at this event
  status                transmission_status NOT NULL,
  previous_status       transmission_status,  -- for timeline reconstruction

  -- Source of this event
  event_source          text NOT NULL
    CHECK (event_source IN ('webhook', 'poll', 'manual', 'system', 'access_point_callback')),

  -- Raw payload from Access Point (webhook body or poll response)
  raw_payload           jsonb,

  -- Human-readable message
  message               text,
  error_code            text,
  error_detail          text,

  -- For inbound: the document that arrived
  inbound_xml_path      text,  -- path to received XML in Supabase Storage

  -- Timestamp when the event actually occurred (may differ from created_at)
  occurred_at           timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
  -- No updated_at, deleted_at — status events are immutable
);

CREATE INDEX idx_status_events_transmission_id
  ON peppol_status_events(transmission_id);

CREATE INDEX idx_status_events_occurred_at
  ON peppol_status_events(occurred_at DESC);
```

---

### 4.11 subscriptions

Hybrid billing model — attaches to either an organisation (SMB owner) or a user (bookkeeper flat-rate).
Current model: **flat rate for all tiers.** Volume tier infrastructure is built in now so the transition requires zero migration when ready.

```sql
CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'pro', 'bookkeeper');
CREATE TYPE subscription_status AS ENUM (
  'active',
  'trialing',
  'past_due',
  'cancelled',
  'paused',
  'expired'
);

CREATE TABLE public.subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hybrid: subscriber is either an org OR a user
  -- SMB owner:   subscriber_type = 'organisation', subscriber_id = org.id
  -- Bookkeeper:  subscriber_type = 'user',         subscriber_id = profile.id
  subscriber_type         text NOT NULL CHECK (subscriber_type IN ('organisation', 'user')),
  subscriber_id           uuid NOT NULL,

  -- Plan
  plan                    subscription_plan NOT NULL DEFAULT 'free',
  status                  subscription_status NOT NULL DEFAULT 'active',

  -- Lemon Squeezy identifiers
  ls_subscription_id      text UNIQUE,
  ls_customer_id          text,
  ls_variant_id           text,
  ls_order_id             text,

  -- Billing period
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  trial_ends_at           timestamptz,
  renewal_date            timestamptz,

  -- Cancellation
  cancelled_at            timestamptz,
  cancel_at_period_end    boolean NOT NULL DEFAULT false,
  cancellation_reason     text,

  -- ── Usage tracking ──────────────────────────────────────────
  -- Current model: flat rate — limits enforced but no overage billing yet
  -- Future model: volume tiers — same columns drive tier upgrades automatically

  invoices_sent_mtd       integer NOT NULL DEFAULT 0,
  -- Month-to-date invoice count. Reset by cron at billing cycle start.
  -- Both SMB and bookkeeper actions increment this on the ORG subscription.
  -- This is the key metric for future volume tier transitions.

  invoices_limit          integer,
  -- NULL = unlimited (bookkeeper plan + future scale tier)
  -- 3    = free tier
  -- 30   = starter tier
  -- 150  = pro tier

  -- Billing cycle reset
  usage_reset_at          timestamptz,

  -- ── Bookkeeper plan fields ───────────────────────────────────
  organisations_count     integer NOT NULL DEFAULT 0,
  -- Kept in sync by on_org_billing_owner_changed trigger
  -- Flat rate now — drives future per-client overage if model changes

  organisations_limit     integer,
  -- NULL = unlimited (current flat rate model)

  -- ── Bookkeeper analytics (org subscriptions only) ────────────
  -- These columns only apply when subscriber_type = 'organisation'
  -- They track whether a bookkeeper is actively using this org's account
  -- Primary purpose: revenue gap analytics — see query in Key Design Decisions

  has_external_bookkeeper boolean NOT NULL DEFAULT false,
  -- true  = at least one bookkeeper role member exists on this org
  -- false = SMB manages entirely themselves
  -- Kept in sync by on_org_member_bookkeeper_change trigger

  external_bookkeeper_count integer NOT NULL DEFAULT 0,
  -- How many bookkeeper-role members are on this org
  -- Kept in sync by same trigger
  -- Seeds future per-bookkeeper add-on pricing if needed

  -- ── Billing transfer audit trail ────────────────────────────
  -- Populated when an SMB takes over billing from a bookkeeper
  -- (transfer_billing = true on org_claim_requests)

  billing_transferred_from uuid REFERENCES public.profiles(id),
  -- The bookkeeper user_id who previously paid for this org

  billing_transferred_at   timestamptz,
  -- When the transfer happened

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- One active subscription per subscriber
CREATE UNIQUE INDEX idx_subscriptions_active_subscriber
  ON subscriptions(subscriber_type, subscriber_id)
  WHERE status IN ('active', 'trialing', 'past_due');

CREATE INDEX idx_subscriptions_ls_id
  ON subscriptions(ls_subscription_id)
  WHERE ls_subscription_id IS NOT NULL;

-- Revenue gap analysis index
-- "Show me all org subscriptions — how many have a bookkeeper connected?"
CREATE INDEX idx_subscriptions_bookkeeper_analytics
  ON subscriptions(has_external_bookkeeper, invoices_sent_mtd)
  WHERE subscriber_type = 'organisation'
    AND status = 'active';
```

---

#### Bookkeeper org count — refresh function + trigger

Keeps `organisations_count` accurate whenever `billing_owner_user_id` changes on an org (e.g. SMB claims their org and transfers billing away from Jane).

```sql
-- Recalculates exact org count for a bookkeeper's subscription
CREATE OR REPLACE FUNCTION public.refresh_bookkeeper_org_count(
  p_user_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE subscriptions
  SET
    organisations_count = (
      SELECT COUNT(*)
      FROM organisations
      WHERE billing_owner_user_id = p_user_id
        AND deleted_at IS NULL
    ),
    updated_at = now()
  WHERE subscriber_type = 'user'
    AND subscriber_id   = p_user_id
    AND status IN ('active', 'trialing');
END;
$$;

-- Fires when billing_owner_user_id changes on any org
-- Decrements old bookkeeper's count, increments new one
CREATE OR REPLACE FUNCTION public.on_org_billing_owner_changed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Decrement old owner's count (Jane loses a client)
  IF OLD.billing_owner_user_id IS NOT NULL
    AND OLD.billing_owner_user_id IS DISTINCT FROM NEW.billing_owner_user_id
  THEN
    PERFORM public.refresh_bookkeeper_org_count(OLD.billing_owner_user_id);
  END IF;

  -- Increment new owner's count (new bookkeeper gains a client)
  IF NEW.billing_owner_user_id IS NOT NULL
    AND NEW.billing_owner_user_id IS DISTINCT FROM OLD.billing_owner_user_id
  THEN
    PERFORM public.refresh_bookkeeper_org_count(NEW.billing_owner_user_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_org_billing_owner_changed
  AFTER UPDATE OF billing_owner_user_id ON organisations
  FOR EACH ROW EXECUTE PROCEDURE public.on_org_billing_owner_changed();
```

---

#### Bookkeeper analytics — sync function + trigger

Keeps `has_external_bookkeeper` and `external_bookkeeper_count` accurate on org subscriptions whenever organisation_members changes.

```sql
CREATE OR REPLACE FUNCTION public.update_org_bookkeeper_status()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_org_id uuid := COALESCE(NEW.org_id, OLD.org_id);
  v_count  integer;
BEGIN
  -- Count active bookkeeper-role members who are NOT the org founder
  -- Founders who happen to have bookkeeper role (rare) are the account creator
  -- and should not be counted as "external bookkeepers" for analytics
  SELECT COUNT(*) INTO v_count
  FROM organisation_members
  WHERE org_id        = v_org_id
    AND role          = 'bookkeeper'
    AND is_founder    = false        -- exclude org creators
    AND deleted_at    IS NULL
    AND accepted_at   IS NOT NULL;

  UPDATE subscriptions SET
    has_external_bookkeeper   = (v_count > 0),
    external_bookkeeper_count = v_count,
    updated_at                = now()
  WHERE subscriber_type = 'organisation'
    AND subscriber_id   = v_org_id
    AND status IN ('active', 'trialing');

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Only fires when a bookkeeper-role member is added, removed, or changed
CREATE TRIGGER on_org_member_bookkeeper_change
  AFTER INSERT OR UPDATE OR DELETE ON organisation_members
  FOR EACH ROW
  WHEN (COALESCE(NEW.role, OLD.role) = 'bookkeeper')
  EXECUTE PROCEDURE public.update_org_bookkeeper_status();
```

---

#### Revenue gap analytics query

Run this any time to understand your pricing gap:

```sql
SELECT
  COUNT(*)
    FILTER (WHERE has_external_bookkeeper = false)        AS smb_only_orgs,
  COUNT(*)
    FILTER (WHERE has_external_bookkeeper = true)         AS bookkeeper_managed_orgs,
  ROUND(AVG(invoices_sent_mtd)
    FILTER (WHERE has_external_bookkeeper = false), 1)    AS avg_invoices_smb_only,
  ROUND(AVG(invoices_sent_mtd)
    FILTER (WHERE has_external_bookkeeper = true), 1)     AS avg_invoices_with_bookkeeper,
  -- Revenue gap: what you'd earn with volume tiers
  SUM(invoices_sent_mtd)
    FILTER (WHERE has_external_bookkeeper = true)         AS total_bookkeeper_invoices_mtd
FROM subscriptions
WHERE subscriber_type = 'organisation'
  AND status          = 'active';

-- When avg_invoices_with_bookkeeper >> avg_invoices_smb_only,
-- volume tier pricing is justified and the data backs the decision.
```

**Edge cases handled:**

- `subscriber_type` + `subscriber_id` pattern enables hybrid billing without separate tables
- `cancel_at_period_end` — user keeps access until `current_period_end` after cancelling
- `invoices_sent_mtd` reset by cron at billing cycle start — both SMB and bookkeeper sends increment the ORG subscription counter, not the bookkeeper's user subscription
- `organisations_count` kept accurate by `on_org_billing_owner_changed` trigger — never stale
- `has_external_bookkeeper` + `external_bookkeeper_count` kept accurate by `on_org_member_bookkeeper_change` trigger — fires only on bookkeeper-role changes, not all member changes
- `billing_transferred_from` + `billing_transferred_at` — immutable audit trail of billing transfers for support disputes
- `NULL` on `invoices_limit` = unlimited — flat rate today, volume tiers tomorrow, same column

---

### 4.12 audit_logs

Compliance-grade, append-only. No UPDATE or DELETE ever. The legal record.

```sql
CREATE TABLE public.audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  user_id         uuid REFERENCES public.profiles(id),
  org_id          uuid REFERENCES public.organisations(id),

  -- Action
  action          text NOT NULL,
  -- Naming convention: 'resource.verb'
  -- e.g. 'invoice.sent', 'invoice.rejected', 'org.created',
  --      'member.invited', 'member.role_changed', 'connection.disconnected',
  --      'subscription.upgraded', 'subscription.cancelled'

  -- Resource
  resource_type   text NOT NULL,
  resource_id     uuid,

  -- Change details
  old_values      jsonb,   -- state before
  new_values      jsonb,   -- state after
  diff            jsonb,   -- only the changed fields (computed at insert)

  -- Request context
  ip_address      inet,
  user_agent      text,
  request_id      text,    -- trace ID correlating logs across services
  session_id      text,

  -- Source
  source          text NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'api', 'system', 'webhook', 'cron')),

  -- Extra context
  metadata        jsonb,

  -- Immutable timestamp
  created_at      timestamptz NOT NULL DEFAULT now()

  -- INTENTIONALLY NO: updated_at, deleted_at, archived_at
  -- Audit logs are permanent and immutable
);

-- RLS: users can read their org's audit logs, NOBODY can write directly
-- All inserts go through a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_user_id     uuid,
  p_org_id      uuid,
  p_action      text,
  p_resource_type text,
  p_resource_id uuid,
  p_old_values  jsonb DEFAULT NULL,
  p_new_values  jsonb DEFAULT NULL,
  p_metadata    jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, org_id, action, resource_type, resource_id,
    old_values, new_values, metadata
  ) VALUES (
    p_user_id, p_org_id, p_action, p_resource_type, p_resource_id,
    p_old_values, p_new_values, p_metadata
  );
END;
$$;

-- Indexes optimised for compliance queries
CREATE INDEX idx_audit_logs_org_id
  ON audit_logs(org_id, created_at DESC);

CREATE INDEX idx_audit_logs_user_id
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX idx_audit_logs_resource
  ON audit_logs(resource_type, resource_id, created_at DESC);

CREATE INDEX idx_audit_logs_action
  ON audit_logs(action, created_at DESC);

-- Partial index for invoice actions (most common compliance query)
CREATE INDEX idx_audit_logs_invoice_actions
  ON audit_logs(org_id, created_at DESC)
  WHERE action LIKE 'invoice.%';
```

**Edge cases handled:**

- No `updated_at`, `deleted_at`, `archived_at` — intentional. Cannot be changed.
- All inserts via `SECURITY DEFINER` function — application never writes directly to the table
- RLS: `SELECT` allowed for org members. `INSERT` via function only. `UPDATE` / `DELETE` — no policy = denied for all.
- `diff` field — only the changed keys stored separately from full `old_values`/`new_values` for quick "what changed?" queries
- `request_id` — correlates this audit log entry to server logs, error tracking (Sentry), and other audit entries from the same request

---

### 4.13 notification_preferences

Per-user, per-org notification settings.

```sql
CREATE TABLE public.notification_preferences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id          uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  -- org_id = NULL means "applies to all orgs this user is a member of"
  -- org_id = specific means "only for this org"

  -- Invoice events
  on_invoice_delivered      boolean NOT NULL DEFAULT true,
  on_invoice_acknowledged   boolean NOT NULL DEFAULT true,
  on_invoice_rejected       boolean NOT NULL DEFAULT true,
  on_invoice_received       boolean NOT NULL DEFAULT true,
  on_invoice_pending_long   boolean NOT NULL DEFAULT true,  -- pending > 30 min
  on_invoice_overdue        boolean NOT NULL DEFAULT true,  -- payment due date passed

  -- Team events
  on_member_invited         boolean NOT NULL DEFAULT true,
  on_member_joined          boolean NOT NULL DEFAULT false,

  -- Billing events
  on_subscription_renewing  boolean NOT NULL DEFAULT true,  -- 7 days before renewal
  on_subscription_past_due  boolean NOT NULL DEFAULT true,
  on_usage_limit_warning    boolean NOT NULL DEFAULT true,  -- 80% of invoice limit

  -- Channels
  email_enabled             boolean NOT NULL DEFAULT true,
  in_app_enabled            boolean NOT NULL DEFAULT true,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id, org_id)
);
```

---

### 4.14 notifications

The notification inbox. One row per notification sent to a user.

```sql
CREATE TYPE notification_channel AS ENUM ('email', 'in_app');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read', 'dismissed');

CREATE TABLE public.notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id          uuid REFERENCES public.organisations(id) ON DELETE SET NULL,

  -- Content
  type            text NOT NULL,  -- e.g. 'invoice.delivered', 'invoice.rejected'
  title           text NOT NULL,
  body            text,
  action_url      text,  -- deep link e.g. /invoices/uuid

  -- Resource context
  resource_type   text,
  resource_id     uuid,

  -- Channel
  channel         notification_channel NOT NULL DEFAULT 'in_app',

  -- Status
  status          notification_status NOT NULL DEFAULT 'pending',
  read_at         timestamptz,
  dismissed_at    timestamptz,
  sent_at         timestamptz,
  failed_at       timestamptz,
  failure_reason  text,

  -- Deduplication (prevent sending same notification twice)
  dedup_key       text UNIQUE,
  -- e.g. 'invoice.delivered:transmission_id:user_id'

  -- External delivery reference
  email_message_id text,  -- Resend message ID

  metadata        jsonb,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE INDEX idx_notifications_resource
  ON notifications(resource_type, resource_id);
```

**Edge cases handled:**

- `dedup_key` — prevents sending the same notification twice if a webhook fires multiple times
- `email_message_id` — store Resend's message ID so you can look up delivery status later
- `action_url` — deep links into the app from email notifications

---

## 5. Row Level Security

The core principle: **users can only see and modify data for organisations they are an active, accepted member of.**

```sql
-- Enable RLS on every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peppol_transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peppol_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Core helper: get all org IDs the current user is an active member of
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE  -- result can be cached within a transaction
AS $$
  SELECT org_id
  FROM public.organisation_members
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
    AND accepted_at IS NOT NULL;
$$;

-- Helper: check user's role in a specific org
CREATE OR REPLACE FUNCTION public.get_user_org_role(p_org_id uuid)
RETURNS org_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role
  FROM public.organisation_members
  WHERE user_id = auth.uid()
    AND org_id = p_org_id
    AND deleted_at IS NULL
    AND accepted_at IS NOT NULL
  LIMIT 1;
$$;

-- ── PROFILES ──────────────────────────────────────────────────
-- Users can only read and update their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ── ORG CLAIM REQUESTS ───────────────────────────────────────
ALTER TABLE public.org_claim_requests ENABLE ROW LEVEL SECURITY;

-- Claimant can see and cancel their own claims
CREATE POLICY "claims_select_claimant" ON org_claim_requests
  FOR SELECT USING (claimant_user_id = auth.uid());

CREATE POLICY "claims_insert_authenticated" ON org_claim_requests
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND claimant_user_id = auth.uid()
  );

CREATE POLICY "claims_cancel_own" ON org_claim_requests
  FOR UPDATE USING (
    claimant_user_id = auth.uid()
    AND status = 'pending'
  );

-- Current org owner can see and decide on claims for their org
CREATE POLICY "claims_select_org_owner" ON org_claim_requests
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM organisation_members
      WHERE user_id = auth.uid()
        AND role = 'owner'
        AND deleted_at IS NULL
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "claims_decide_org_owner" ON org_claim_requests
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM organisation_members
      WHERE user_id = auth.uid()
        AND role = 'owner'
        AND deleted_at IS NULL
    )
    AND status = 'pending'
  );
-- Actual approval runs via approve_org_claim() SECURITY DEFINER function
-- to ensure all side effects (member insert, org update, audit log) run atomically

-- ── ORGANISATIONS ─────────────────────────────────────────────
CREATE POLICY "orgs_select_member" ON organisations
  FOR SELECT USING (id IN (SELECT get_user_org_ids()));

CREATE POLICY "orgs_insert_authenticated" ON organisations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "orgs_update_admin" ON organisations
  FOR UPDATE USING (
    get_user_org_role(id) IN ('owner', 'admin')
  );

CREATE POLICY "orgs_delete_owner" ON organisations
  FOR DELETE USING (
    get_user_org_role(id) = 'owner'
  );

-- ── ORGANISATION MEMBERS ──────────────────────────────────────
CREATE POLICY "members_select" ON organisation_members
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "members_insert_admin" ON organisation_members
  FOR INSERT WITH CHECK (
    get_user_org_role(org_id) IN ('owner', 'admin')
  );

CREATE POLICY "members_update_admin" ON organisation_members
  FOR UPDATE USING (
    -- Owners and admins can update members
    (get_user_org_role(org_id) IN ('owner', 'admin')
      -- BUT nobody can downgrade or soft-delete a founder
      AND NOT (
        OLD.is_founder = true
        AND auth.uid() != OLD.user_id  -- founder can only be modified by themselves
      )
    )
    OR user_id = auth.uid()  -- any member can accept their own invite or leave
  );

CREATE POLICY "members_delete_admin" ON organisation_members
  FOR DELETE USING (
    -- Owners and admins can remove members
    (get_user_org_role(org_id) IN ('owner', 'admin')
      AND is_founder = false  -- founders can NEVER be hard-deleted by others
    )
    OR user_id = auth.uid()  -- any member can remove themselves (leave org)
  );

-- ── DOCUMENTS ─────────────────────────────────────────────────
CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (
    get_user_org_role(org_id) IN ('owner', 'admin', 'bookkeeper')
  );

CREATE POLICY "documents_update" ON documents
  FOR UPDATE USING (
    get_user_org_role(org_id) IN ('owner', 'admin', 'bookkeeper')
    AND status = 'draft'  -- only drafts can be updated directly
  );

-- ── AUDIT LOGS ────────────────────────────────────────────────
-- Read only for org members, write only via SECURITY DEFINER function
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
-- No INSERT/UPDATE/DELETE policies — use the create_audit_log() function

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
```

---

## 6. Indexes Strategy

### Principles

- Every foreign key has an index
- Every status-based filter has an index (use partial indexes for non-null/specific values)
- Every `created_at` used in ordering has a DESC index
- Full-text search columns use GIN indexes
- Soft-deleted rows excluded from most indexes using `WHERE deleted_at IS NULL`

### Critical Performance Indexes

```sql
-- Most common dashboard query: "show me my org's invoices by status"
CREATE INDEX idx_documents_dashboard
  ON documents(org_id, status, issued_at DESC)
  WHERE deleted_at IS NULL;

-- Retry queue: "what transmissions need to be retried right now?"
CREATE INDEX idx_transmissions_retry_queue
  ON peppol_transmissions(next_retry_at)
  WHERE status = 'failed'
    AND attempt_number < max_attempts
    AND next_retry_at <= now();

-- Unread notifications badge count
CREATE INDEX idx_notifications_unread_count
  ON notifications(user_id)
  WHERE read_at IS NULL
    AND dismissed_at IS NULL;

-- Token expiry check: "which OAuth tokens expire in the next hour?"
CREATE INDEX idx_connections_token_expiry
  ON accounting_connections(token_expires_at)
  WHERE is_active = true
    AND deleted_at IS NULL;

-- Contact lookup by tax ID (ABN verification)
CREATE INDEX idx_contacts_tax_id_lookup
  ON contacts(org_id, tax_id, tax_id_type)
  WHERE deleted_at IS NULL
    AND tax_id IS NOT NULL;
```

---

## 7. Edge Cases Handled

| Edge Case                                              | How It's Handled                                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| User sends same invoice twice                          | `idempotency_key` UNIQUE constraint on `peppol_transmissions`                                                                      |
| Contact ABN changes after invoice sent                 | `sender_snapshot` / `receiver_snapshot` frozen on `document_versions`                                                              |
| User deletes a contact                                 | `contact_id ON DELETE SET NULL` on documents — snapshot still intact                                                               |
| OAuth token expires silently                           | `token_expires_at` index + cron job refreshes before expiry                                                                        |
| Bookkeeper manages 30 clients                          | `billing_owner_user_id` on org + `subscriber_type = 'user'` on subscription                                                        |
| Two users in same org                                  | RBAC via `organisation_members` — isolated by role                                                                                 |
| NZ customer added                                      | `tax_id_type = 'NZBN'`, `country = 'NZ'`, `peppol_scheme_id = '0088'` — no migration                                               |
| Credit note against invoice                            | `related_document_id` + `relationship_type = 'credit_note_for'`                                                                    |
| Invoice amended after creation                         | New row in `document_versions`, `is_current` updated via trigger                                                                   |
| Sent invoice can't be edited                           | RLS `UPDATE` policy: `AND status = 'draft'`                                                                                        |
| Webhook fires twice                                    | `dedup_key` on notifications, `idempotency_key` on transmissions                                                                   |
| Audit log tampered with                                | Append-only table, no `UPDATE`/`DELETE` RLS policies defined                                                                       |
| Multi-currency invoice                                 | `currency_code` on every amount field, defaults to org's `default_currency`                                                        |
| Invite link expires                                    | `invite_expires_at` on `organisation_members` + cron cleanup                                                                       |
| Free tier user exceeds invoice limit                   | `invoices_sent_mtd` vs `invoices_limit` checked at document send time                                                              |
| Storage corruption of XML                              | `xml_sha256_hash` on `document_versions` for integrity verification                                                                |
| Xero disconnected mid-sync                             | `sync_status = 'error'` + `disconnected_reason` on `accounting_connections`                                                        |
| Same user in two orgs                                  | Supported — `organisation_members` has one row per `(user_id, org_id)` pair                                                        |
| SMB signs up with ABN already registered by bookkeeper | ABN uniqueness index fires → application routes to `org_claim_requests` flow                                                       |
| Bookkeeper created org, SMB has no account yet         | `is_self_managed = false` — auto-approve claim if ABR name match passes                                                            |
| SMB wants to take over org from bookkeeper             | `org_claim_requests` → `approve_org_claim()` — previous owner downgraded to `bookkeeper` role                                      |
| Two simultaneous claim requests for same org           | `UNIQUE INDEX` on `(org_id) WHERE status = 'pending'` — second request rejected                                                    |
| Claim unanswered for 14 days                           | `expires_at` cron sets `status = 'expired'` — claimant can re-submit                                                               |
| User offline, creates invoice, loses phone             | `sync_queue` persists until synced. On reinstall + login, re-processes                                                             |
| Two devices edit same draft offline                    | `conflict` status set on `sync_queue`, user resolves in UI                                                                         |
| Flow A: Mick invites Jane                              | Jane's `is_founder = false`, `invited_by = mick_id` — `has_external_bookkeeper` flips to true                                      |
| Flow B: Jane creates org, invites Mick                 | Jane's `is_founder = true`, Mick's `is_founder = false` — `has_external_bookkeeper` stays false (Jane is founder, not external)    |
| Invited owner tries to remove founder                  | RLS `members_update_admin` blocks it — `OLD.is_founder = true AND auth.uid() != OLD.user_id`                                       |
| Two people try to become founder                       | `UNIQUE INDEX` on `(org_id) WHERE is_founder = true` — DB rejects second insert                                                    |
| Founder soft-deletes themselves                        | Allowed — they can leave their own org. But `is_founder` row preserved with `deleted_at` set — no other founder can be created.    |
| Push token expires / app uninstalled                   | Push fails → FCM/APNs returns `NotRegistered` → mark `invalidated_at`                                                              |
| User revokes all sessions remotely                     | All `user_sessions` set `is_active = false` → auto sign-out on all devices                                                         |
| Force app update required                              | `app_versions.is_minimum_required = true` → hard block screen on launch                                                            |
| iOS rotates APNs token                                 | `onTokenRefresh` upserts new token, old one gets `token_rotated` reason                                                            |
| Offline line item before parent document synced        | `depends_on_local_id` on `sync_queue` ensures parent syncs first                                                                   |
| Draft sent from web while mobile has offline edits     | Sync detects server `status = 'submitted'` → server wins → local discarded                                                         |
| Invoice acknowledged ≠ invoice paid                    | `document_payments` tracks actual settlement separately from Peppol status                                                         |
| Bookkeeper sends invoice for SMB org                   | `invoices_sent_mtd` increments on the ORG subscription, not Jane's user subscription — correct for volume tier tracking            |
| SMB has bookkeeper but same price as SMB without       | `has_external_bookkeeper` + `invoices_sent_mtd` reveal the revenue gap — data drives future volume tier decision                   |
| Billing transfers from Jane to Mick                    | `billing_transferred_from` + `billing_transferred_at` on new org subscription — permanent audit trail                              |
| Jane's org count after billing transfer                | `on_org_billing_owner_changed` trigger fires → `refresh_bookkeeper_org_count()` decrements Jane's count atomically                 |
| Mick takes over billing but has no subscription        | `approve_org_claim()` auto-creates free tier subscription for org — Mick never falls into billing limbo                            |
| bookkeeper_count drifts from reality                   | `on_org_member_bookkeeper_change` trigger recalculates from source of truth on every role change — never stale                     |
| Bookkeeper cancels plan — 12 orgs stranded             | `handle_bookkeeper_plan_cancellation()` auto-moves all affected orgs to free tier, notifies owners, clears `billing_owner_user_id` |
| "INV-042" and "INV042" treated as different numbers    | `document_number_normalised` generated column + `UNIQUE(org_id, document_number_normalised)` — both normalise to `inv042`          |
| ABN cancelled after invoice sent                       | `abn_status_at_send` snapshot on `document_versions` — immutable proof ABN was Active at send time                                 |
| ABN status changes detected late                       | `abn.reverify_active_orgs` monthly job re-verifies all ABNs, calls `process_abn_status_change()` on any drift                      |
| SMB approaching $75k GST threshold                     | `update_estimated_annual_revenue()` trigger fires on every payment, sends warning notification at $65k annualised                  |
| Bulk send partial failure                              | `batch_id` on `peppol_transmissions` — already-sent invoices skip on retry (idempotency_key), failed ones retry independently      |
| Feature broken in production                           | `feature_flags.is_killed = true` → instant kill switch, no deploy needed                                                           |
| ABN lookup adding latency to every request             | `abn_lookup_cache` with 24hr TTL — ~99% cache hits after warm-up                                                                   |
| Storecove pricing change compresses margin             | `access_point_usage` tracks exact costs per org per month for monitoring                                                           |
| Free user drops off after connecting Xero              | `onboarding_progress.last_step_completed` surfaces stall point for nudge email                                                     |

---

## 8. Bookkeeper Split Mode — Migration Path

**Unified Account Model (current):** Every user account can manage one or more organisations. An SMB owner happens to manage one. A bookkeeper manages many. The schema, RLS, and UI treat them identically — there is no "account type." This is what launches in Phase 1–3.

**Bookkeeper Split Mode (Phase 4):** Introduces distinct personas — `smb_owner` and `bookkeeper` — each with their own onboarding flow, dashboard, and pricing tier. A bookkeeper sees a client list first; an SMB owner sees their invoices directly. This requires two additive columns and two new RLS policies. Zero breaking changes.

When the Bookkeeper tier + dual-mode UI launches (Phase 4), these are the **only** changes needed:

### New columns (additive — no data migration)

```sql
-- profiles: add user_type
ALTER TABLE public.profiles
  ADD COLUMN user_type text DEFAULT 'smb_owner'
  CHECK (user_type IN ('smb_owner', 'bookkeeper'));

-- organisation_members: add external manager flag
ALTER TABLE public.organisation_members
  ADD COLUMN is_external_manager boolean NOT NULL DEFAULT false;
-- When true: this member is a bookkeeper managing this org as a client
```

### New RLS policies (additive)

```sql
-- Bookkeepers can see all orgs they manage as external managers
-- This is purely an addition — existing policies unchanged
CREATE POLICY "orgs_select_external_manager" ON organisations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM organisation_members
      WHERE user_id = auth.uid()
        AND is_external_manager = true
        AND deleted_at IS NULL
        AND accepted_at IS NOT NULL
    )
  );
```

### UI changes only (no schema changes)

- New "Bookkeeper Dashboard" view showing client list
- New onboarding fork: "My own business" vs "Managing clients"
- Role upgrade flow: SMB owner → Bookkeeper tier

**Zero data migration. Zero downtime. Zero risk.**

---

## 9. Key Design Decisions

| Decision                                                               | Rationale                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Amounts in cents (bigint)**                                          | Floating point arithmetic on money causes rounding errors. `10000` = $100.00 is unambiguous.                                                                                                                                                                                                                                                     |
| **Snapshot pattern on document_versions**                              | Legal requirement — the invoice must reflect the state at time of sending. Never reconstruct from live contact data.                                                                                                                                                                                                                             |
| **`is_current` flag on versions**                                      | Avoids `MAX(version_number)` subquery on every list view. Trigger keeps it consistent.                                                                                                                                                                                                                                                           |
| **Separate peppol_status_events table**                                | The transmission table stores the final state. The events table stores the full history. Both have value.                                                                                                                                                                                                                                        |
| **Audit logs via SECURITY DEFINER function**                           | App code cannot insert directly — prevents skipping audit log on code paths that forget to call it.                                                                                                                                                                                                                                              |
| **`get_user_org_ids()` helper function**                               | Centralises the membership check. If the logic changes (e.g. invite expiry), one function to update.                                                                                                                                                                                                                                             |
| **`dedup_key` on notifications**                                       | Webhooks from Storecove can fire multiple times. Idempotent notification delivery prevents inbox spam.                                                                                                                                                                                                                                           |
| **`billing_owner_user_id` on organisations**                           | The single field that makes hybrid billing work without a separate table or complex joins.                                                                                                                                                                                                                                                       |
| **Partial indexes on deleted_at**                                      | Queries that filter `WHERE deleted_at IS NULL` (the vast majority) use much smaller indexes.                                                                                                                                                                                                                                                     |
| **`is_founder` on organisation_members**                               | Distinguishes "person who created the org" from "person who was invited." Founder is DB-protected — cannot be removed or downgraded by anyone else. Solves the operational gap where Jane creates an org for Mick, Mick accepts owner invite, then could accidentally remove Jane.                                                               |
| **`founded_by` on organisations + auto-trigger**                       | Immutable record of org creator. Trigger auto-inserts the founder member row — application never forgets. Decouples org creation from member creation cleanly.                                                                                                                                                                                   |
| **`is_founder = false` excludes from `has_external_bookkeeper`**       | Jane creating an org and inviting Mick should not count as "has external bookkeeper" — Jane is the account creator, not an external professional. Only non-founder bookkeeper-role members are genuinely "external." This keeps revenue gap analytics clean.                                                                                     |
| **Flat rate now, volume tiers later — same columns**                   | `invoices_sent_mtd` and `invoices_limit` already exist. When analytics show bookkeeper-managed orgs send significantly more invoices, introduce volume tiers by updating `invoices_limit` per plan — zero schema migration required. The `has_external_bookkeeper` column makes the revenue gap quantifiable before making the pricing decision. |
| **`invoices_sent_mtd` increments on org subscription, not bookkeeper** | When Jane sends an invoice for Mick's org, it counts against Mick's org subscription limit — not Jane's flat-rate plan. This is the correct behaviour for volume tier fairness: the org that generates the volume pays for it regardless of who presses the send button.                                                                         |

---

## 10. Payment Tracking

### 10.1 document_payments

Tracks actual payment settlements against documents. Completely separate from Peppol transmission status — "acknowledged" by the network does NOT mean "paid."

```sql
CREATE TYPE payment_method AS ENUM (
  'bank_transfer',
  'bpay',
  'payid',
  'credit_card',
  'direct_debit',
  'cash',
  'cheque',
  'other'
);

CREATE TABLE public.document_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  org_id            uuid NOT NULL REFERENCES public.organisations(id),

  -- Payment details
  amount_paid       bigint NOT NULL,         -- in cents
  currency_code     text NOT NULL DEFAULT 'AUD',
  payment_method    payment_method,
  payment_reference text,
  -- e.g. BSB/account for bank transfer, PayID alias, BPAY reference

  -- Date
  paid_at           date NOT NULL,

  -- Source
  recorded_by       uuid REFERENCES public.profiles(id),
  source            text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'xero_sync', 'myob_sync', 'quickbooks_sync', 'bank_feed')),
  source_payment_id text,  -- ID from accounting platform if synced

  -- Notes
  notes             text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX idx_payments_document_id
  ON document_payments(document_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_payments_org_paid_at
  ON document_payments(org_id, paid_at DESC) WHERE deleted_at IS NULL;
```

---

### 10.2 Amendments to documents

Add payment tracking fields directly to `documents` for fast queries without joining `document_payments`:

```sql
ALTER TABLE public.documents
  ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overpaid', 'void')),

  ADD COLUMN amount_paid    bigint NOT NULL DEFAULT 0,
  -- Denormalised sum of document_payments — updated via trigger on insert/update/delete

  ADD COLUMN amount_due     bigint GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  -- Computed: what's still outstanding

  ADD COLUMN last_paid_at   date,
  ADD COLUMN fully_paid_at  timestamptz;
  -- fully_paid_at set when payment_status changes to 'paid'

-- Trigger to keep documents.amount_paid in sync with document_payments
CREATE OR REPLACE FUNCTION public.update_document_payment_status()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_total_paid   bigint;
  v_total_amount bigint;
  v_status       text;
BEGIN
  -- Recalculate total paid
  SELECT COALESCE(SUM(amount_paid), 0)
  INTO v_total_paid
  FROM document_payments
  WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
    AND deleted_at IS NULL;

  SELECT total_amount INTO v_total_amount
  FROM documents
  WHERE id = COALESCE(NEW.document_id, OLD.document_id);

  -- Determine payment status
  v_status := CASE
    WHEN v_total_paid = 0                        THEN 'unpaid'
    WHEN v_total_paid > 0 AND v_total_paid < v_total_amount THEN 'partial'
    WHEN v_total_paid = v_total_amount           THEN 'paid'
    WHEN v_total_paid > v_total_amount           THEN 'overpaid'
  END;

  UPDATE documents SET
    amount_paid    = v_total_paid,
    payment_status = v_status,
    last_paid_at   = (
      SELECT MAX(paid_at) FROM document_payments
      WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
        AND deleted_at IS NULL
    ),
    fully_paid_at = CASE
      WHEN v_status = 'paid' AND fully_paid_at IS NULL THEN now()
      WHEN v_status != 'paid' THEN NULL
      ELSE fully_paid_at
    END
  WHERE id = COALESCE(NEW.document_id, OLD.document_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_payment_change
  AFTER INSERT OR UPDATE OR DELETE ON document_payments
  FOR EACH ROW EXECUTE PROCEDURE public.update_document_payment_status();

-- Index for "show me all unpaid invoices" dashboard query
CREATE INDEX idx_documents_unpaid
  ON documents(org_id, due_at ASC)
  WHERE payment_status IN ('unpaid', 'partial')
    AND direction = 'outbound'
    AND deleted_at IS NULL;

-- Index for overdue invoices
CREATE INDEX idx_documents_overdue
  ON documents(org_id, due_at ASC)
  WHERE payment_status IN ('unpaid', 'partial')
    AND due_at < CURRENT_DATE
    AND deleted_at IS NULL;
```

---

## 11. Feature Flags

Roll out features safely. Kill broken features instantly. Give beta access to specific orgs. A/B test without deploys.

### 11.1 feature_flags

```sql
CREATE TABLE public.feature_flags (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key                     text NOT NULL UNIQUE,
  -- Naming convention: 'domain.feature_name'
  -- e.g. 'peppol.receive', 'integration.quickbooks', 'ui.bookkeeper_dashboard'

  description             text,
  -- Rollout
  is_enabled_globally     boolean NOT NULL DEFAULT false,
  rollout_percentage      integer NOT NULL DEFAULT 0
    CHECK (rollout_percentage BETWEEN 0 AND 100),
  -- 0 = off for everyone, 100 = on for everyone, 50 = random 50% of orgs

  -- Kill switch
  is_killed               boolean NOT NULL DEFAULT false,
  -- When true: overrides everything — feature is OFF for everyone regardless

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Seed with all planned features
INSERT INTO public.feature_flags (key, description, is_enabled_globally, rollout_percentage) VALUES
  ('peppol.send',                'Send Peppol invoices outbound',              true,  100),
  ('peppol.receive',             'Receive Peppol invoices inbound',            false,   0),
  ('peppol.bulk_send',           'Send multiple invoices simultaneously',      false,   0),
  ('integration.xero',           'Xero OAuth connection',                      true,  100),
  ('integration.myob',           'MYOB AccountRight connection',               false,   0),
  ('integration.quickbooks',     'QuickBooks Online connection',               false,   0),
  ('billing.bookkeeper_plan',    'Bookkeeper flat-rate plan tier',             false,   0),
  ('ui.bookkeeper_dashboard',    'Multi-client bookkeeper view',               false,   0),
  ('mobile.app_access',          'React Native mobile app access',             false,   0),
  ('feature.invoice_templates',  'Save and reuse invoice templates',           false,   0),
  ('feature.recurring_invoices', 'Scheduled recurring invoice generation',     false,   0),
  ('feature.document_attachments','Attach files to Peppol invoices',           false,   0),
  ('feature.compliance_calendar','AU/NZ compliance deadline reminders',        false,   0),
  ('api.external_access',        'External API key access',                    false,   0);
```

### 11.2 feature_flag_overrides

```sql
CREATE TABLE public.feature_flag_overrides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id uuid NOT NULL
    REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  -- Target: either an org (SMB or bookkeeper) or a specific user
  target_type     text NOT NULL CHECK (target_type IN ('organisation', 'user')),
  target_id       uuid NOT NULL,
  -- Override
  is_enabled      boolean NOT NULL,
  reason          text,
  -- e.g. 'beta_tester', 'early_access', 'blocked', 'pilot_program'
  expires_at      timestamptz,  -- auto-revoke beta access after a date
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feature_flag_id, target_type, target_id)
);

CREATE INDEX idx_flag_overrides_target
  ON feature_flag_overrides(target_type, target_id);

-- Helper function used in application code
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
  p_flag_key  text,
  p_org_id    uuid DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_flag    feature_flags%ROWTYPE;
  v_override feature_flag_overrides%ROWTYPE;
BEGIN
  SELECT * INTO v_flag FROM feature_flags WHERE key = p_flag_key;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_flag.is_killed THEN RETURN false; END IF;

  -- Check org-level override first
  IF p_org_id IS NOT NULL THEN
    SELECT * INTO v_override
    FROM feature_flag_overrides
    WHERE feature_flag_id = v_flag.id
      AND target_type = 'organisation'
      AND target_id = p_org_id
      AND (expires_at IS NULL OR expires_at > now());
    IF FOUND THEN RETURN v_override.is_enabled; END IF;
  END IF;

  -- Check user-level override
  SELECT * INTO v_override
  FROM feature_flag_overrides
  WHERE feature_flag_id = v_flag.id
    AND target_type = 'user'
    AND target_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now());
  IF FOUND THEN RETURN v_override.is_enabled; END IF;

  -- Fall back to global
  IF v_flag.is_enabled_globally THEN RETURN true; END IF;

  -- Percentage rollout (deterministic per org — same org always gets same answer)
  IF p_org_id IS NOT NULL AND v_flag.rollout_percentage > 0 THEN
    RETURN (abs(hashtext(p_org_id::text || v_flag.key)) % 100) < v_flag.rollout_percentage;
  END IF;

  RETURN false;
END;
$$;
```

---

## 12. Caching Layer

### 12.1 abn_lookup_cache

Cache ABR API responses. ABN data changes rarely — 24-hour TTL is appropriate.

```sql
CREATE TABLE public.abn_lookup_cache (
  abn               text PRIMARY KEY,   -- 11-digit ABN, no spaces

  -- Parsed ABR data
  entity_name       text,
  entity_type       text,               -- 'Individual/Sole Trader', 'Company', 'Partnership' etc.
  gst_registered    boolean,
  gst_from_date     date,
  abn_status        text,               -- 'Active' | 'Cancelled'
  abn_status_from   date,
  main_name         text,               -- trading name if different from entity name
  state_code        text,
  postcode          text,

  -- Raw ABR response (for fields not explicitly mapped above)
  raw_response      jsonb NOT NULL,

  -- Cache management
  fetched_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL
    DEFAULT (now() + interval '24 hours'),
  fetch_source      text DEFAULT 'abr_api'
    CHECK (fetch_source IN ('abr_api', 'manual_override'))
);

-- Partial index for cache validity check
CREATE INDEX idx_abn_cache_valid
  ON abn_lookup_cache(abn)
  WHERE expires_at > now();

-- Cron: DELETE FROM abn_lookup_cache WHERE expires_at < now() - interval '7 days'
```

### 12.2 peppol_endpoint_cache

Cache Peppol Directory lookups. Shorter TTL than ABN cache — businesses are actively registering/deregistering during the mandate rollout.

```sql
CREATE TABLE public.peppol_endpoint_cache (
  tax_id            text NOT NULL,
  tax_id_type       tax_id_type NOT NULL,

  -- Lookup result
  endpoint_found    boolean NOT NULL,
  endpoint_id       text,              -- e.g. '0151:12345678901'
  scheme_id         text,
  transport_profile text,              -- 'peppol-transport-as4-v2_0'
  document_types    text[],            -- supported document type IDs

  -- Raw Directory response
  raw_response      jsonb,

  -- Cache management
  fetched_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL
    DEFAULT (now() + interval '1 hour'),
  -- 1hr TTL: short enough to catch new registrations, long enough to avoid hammering the Directory

  PRIMARY KEY (tax_id, tax_id_type)
);

CREATE INDEX idx_peppol_cache_valid
  ON peppol_endpoint_cache(tax_id, tax_id_type)
  WHERE expires_at > now();
```

---

## 13. Operations & Infrastructure

### 13.1 job_queue

All background work — retries, token refreshes, scheduled sends, cleanup — runs through this table. Nothing async happens in the request path.

```sql
CREATE TYPE job_status AS ENUM (
  'pending', 'running', 'completed', 'failed', 'cancelled'
);

CREATE TABLE public.job_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job classification
  job_type        text NOT NULL,
  -- Naming convention: 'domain.action'
  -- 'peppol.retry_transmission'
  -- 'peppol.poll_status'
  -- 'oauth.refresh_xero_token'
  -- 'oauth.refresh_myob_token'
  -- 'notification.send_push'
  -- 'notification.send_email'
  -- 'billing.reset_usage_counters'
  -- 'billing.check_subscription_status'
  -- 'cleanup.expired_invites'
  -- 'cleanup.expired_sessions'
  -- 'cleanup.synced_sync_queue'
  -- 'abn.reverify_cache'
  -- 'peppol.reverify_endpoint_cache'
  -- 'recurring.generate_invoices'

  -- Job data (everything the job needs — no DB lookups at run time)
  payload         jsonb NOT NULL DEFAULT '{}',

  -- Scheduling
  scheduled_at    timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz,

  -- Retry with exponential backoff
  attempt_count   integer NOT NULL DEFAULT 0,
  max_attempts    integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz,
  -- Backoff: 1min → 5min → 30min → 4hr → 24hr

  -- Status
  status          job_status NOT NULL DEFAULT 'pending',
  error_message   text,
  error_stack     text,
  result          jsonb,

  -- Idempotency — prevents duplicate jobs from double-webhook or race conditions
  idempotency_key text UNIQUE,

  -- Context (for monitoring and filtering)
  org_id          uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  priority        integer NOT NULL DEFAULT 5,
  -- 1 = highest (payment failures), 5 = normal, 10 = lowest (cleanup)

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Worker pickup query
CREATE INDEX idx_job_queue_pickup
  ON job_queue(priority ASC, scheduled_at ASC)
  WHERE status = 'pending'
    AND scheduled_at <= now()
    AND attempt_count < max_attempts;

-- Monitor stuck jobs (running > 5 minutes = something went wrong)
CREATE INDEX idx_job_queue_stuck
  ON job_queue(started_at)
  WHERE status = 'running';

-- Cleanup completed jobs older than 7 days
CREATE INDEX idx_job_queue_cleanup
  ON job_queue(completed_at)
  WHERE status IN ('completed', 'cancelled');
```

### 13.2 webhook_deliveries

Log every inbound webhook from every provider. Essential for debugging "why didn't the notification fire?" or "why did Xero send this twice?"

```sql
CREATE TABLE public.webhook_deliveries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  provider          text NOT NULL
    CHECK (provider IN ('storecove', 'messagexchange', 'lemon_squeezy', 'xero', 'myob', 'quickbooks')),
  event_type        text NOT NULL,
  -- e.g. 'document.received', 'document.status_changed',
  --      'subscription.updated', 'payment.success'

  -- Raw payload
  raw_headers       jsonb,
  raw_body          jsonb NOT NULL,

  -- Signature verification
  signature_valid   boolean,
  signature_header  text,   -- which header was checked
  signature_error   text,

  -- Processing outcome
  status            text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'processed', 'failed', 'ignored')),
  processed_at      timestamptz,
  processing_error  text,
  processing_duration_ms integer,

  -- Job spawned from this webhook
  job_id            uuid REFERENCES public.job_queue(id),

  -- Deduplication
  provider_event_id text,
  is_duplicate      boolean NOT NULL DEFAULT false,

  -- Context
  org_id            uuid REFERENCES public.organisations(id),

  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Deduplication: same provider + same event ID = duplicate
CREATE UNIQUE INDEX idx_webhook_dedup
  ON webhook_deliveries(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE INDEX idx_webhook_provider_type
  ON webhook_deliveries(provider, event_type, created_at DESC);

-- Cleanup: keep 30 days of webhook logs
CREATE INDEX idx_webhook_cleanup
  ON webhook_deliveries(created_at)
  WHERE status IN ('processed', 'ignored');
```

### 13.3 rate_limit_buckets

Token bucket rate limiting. Protects Storecove API quota, ABR API quota, and prevents abuse.

```sql
CREATE TABLE public.rate_limit_buckets (
  bucket_type       text NOT NULL,
  -- 'org.peppol_send'         = Peppol sends per org per hour (limit: 100)
  -- 'org.abn_lookup'          = ABN lookups per org per minute (limit: 30)
  -- 'global.xero_api'         = Xero API calls across all orgs per minute (limit: 50)
  -- 'global.storecove_api'    = Storecove sends per minute (limit: 20)
  -- 'user.api_requests'       = API key requests per user per minute (limit: 60)

  bucket_key        text NOT NULL,
  -- org_id for org-scoped, user_id for user-scoped, 'global' for global

  -- Token bucket state
  tokens            integer NOT NULL,
  max_tokens        integer NOT NULL,
  refill_rate       integer NOT NULL,    -- tokens added per refill
  refill_interval   interval NOT NULL,  -- how often to refill

  -- Window tracking (for sliding window alternative)
  window_start      timestamptz NOT NULL DEFAULT now(),
  request_count     integer NOT NULL DEFAULT 0,

  last_refill_at    timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (bucket_type, bucket_key)
);
```

### 13.4 access_point_usage

Track exact Storecove/MessageXchange usage per org per month for cost monitoring and overage billing.

```sql
CREATE TABLE public.access_point_usage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  -- Billing month (always first day of month: 2026-07-01)
  month               date NOT NULL,

  -- Volume
  invoices_sent       integer NOT NULL DEFAULT 0,
  invoices_received   integer NOT NULL DEFAULT 0,
  failed_attempts     integer NOT NULL DEFAULT 0,
  -- Failed attempts don't always incur cost but useful to track

  -- Costs in cents AUD (at current Storecove rates)
  send_cost_cents     integer NOT NULL DEFAULT 0,
  receive_cost_cents  integer NOT NULL DEFAULT 0,
  total_cost_cents    integer GENERATED ALWAYS AS
    (send_cost_cents + receive_cost_cents) STORED,

  -- Provider
  provider            access_point_provider NOT NULL DEFAULT 'storecove',

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE(org_id, month, provider)
);

-- Increment trigger — called from Peppol transmission updates
CREATE OR REPLACE FUNCTION public.increment_access_point_usage(
  p_org_id    uuid,
  p_direction transmission_direction,
  p_provider  access_point_provider,
  p_cost_cents integer DEFAULT 25  -- default ~$0.25 per invoice
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_month date := date_trunc('month', now())::date;
BEGIN
  INSERT INTO access_point_usage (org_id, month, provider,
    invoices_sent, invoices_received, send_cost_cents, receive_cost_cents)
  VALUES (
    p_org_id, v_month, p_provider,
    CASE WHEN p_direction = 'outbound' THEN 1 ELSE 0 END,
    CASE WHEN p_direction = 'inbound'  THEN 1 ELSE 0 END,
    CASE WHEN p_direction = 'outbound' THEN p_cost_cents ELSE 0 END,
    CASE WHEN p_direction = 'inbound'  THEN p_cost_cents ELSE 0 END
  )
  ON CONFLICT (org_id, month, provider) DO UPDATE SET
    invoices_sent     = access_point_usage.invoices_sent +
      CASE WHEN p_direction = 'outbound' THEN 1 ELSE 0 END,
    invoices_received = access_point_usage.invoices_received +
      CASE WHEN p_direction = 'inbound' THEN 1 ELSE 0 END,
    send_cost_cents   = access_point_usage.send_cost_cents +
      CASE WHEN p_direction = 'outbound' THEN p_cost_cents ELSE 0 END,
    receive_cost_cents = access_point_usage.receive_cost_cents +
      CASE WHEN p_direction = 'inbound' THEN p_cost_cents ELSE 0 END,
    updated_at        = now();
END;
$$;

CREATE INDEX idx_ap_usage_org_month
  ON access_point_usage(org_id, month DESC);
```

---

## 14. Invoice Features

### 14.1 document_attachments

PINT A-NZ supports file attachments. Many government buyers require supporting docs — purchase orders, timesheets, delivery receipts.

```sql
CREATE TABLE public.document_attachments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id   uuid NOT NULL
    REFERENCES public.document_versions(id) ON DELETE CASCADE,
  org_id                uuid NOT NULL REFERENCES public.organisations(id),

  -- File
  filename              text NOT NULL,
  mime_type             text NOT NULL,
  -- PINT A-NZ allowed types: application/pdf, image/png, image/jpeg,
  --   text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  file_size_bytes       integer NOT NULL,
  storage_path          text NOT NULL,   -- Supabase Storage path

  -- PINT A-NZ fields
  peppol_attachment_id  text,            -- UUID for reference in the XML
  description           text,            -- human-readable description for recipient
  is_embedded           boolean NOT NULL DEFAULT true,
  -- true = base64 encoded inside the XML (PINT A-NZ requirement for most doc types)
  -- false = external URL reference (not recommended for compliance)

  -- Integrity
  sha256_hash           text,

  -- Upload source
  uploaded_by           uuid REFERENCES public.profiles(id),
  upload_source         text CHECK (
    upload_source IN ('web', 'ios', 'android', 'xero_sync', 'api')
  ),

  created_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

CREATE INDEX idx_attachments_version
  ON document_attachments(document_version_id) WHERE deleted_at IS NULL;
```

### 14.2 invoice_templates

Reusable invoice templates. Saves SMBs re-entering the same line items every time.

```sql
CREATE TABLE public.invoice_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  name                text NOT NULL,
  -- e.g. "Weekly Consulting", "Standard Cleaning Invoice", "Monthly Retainer"
  document_type       document_type NOT NULL DEFAULT 'invoice',

  -- Defaults applied when creating from template
  default_contact_id  uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  default_currency    text NOT NULL DEFAULT 'AUD',
  default_due_days    integer NOT NULL DEFAULT 30,
  default_notes       text,
  default_buyer_ref   text,
  default_contract_ref text,
  default_project_ref text,

  -- Line items as JSONB (mirrors document_line_items structure)
  line_items          jsonb NOT NULL DEFAULT '[]',
  -- Array of: { description, quantity, unit_code, unit_price, tax_category, tax_rate, item_code, notes }

  -- Usage tracking
  use_count           integer NOT NULL DEFAULT 0,
  last_used_at        timestamptz,

  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE INDEX idx_templates_org
  ON invoice_templates(org_id, use_count DESC)
  WHERE deleted_at IS NULL AND is_active = true;
```

### 14.3 recurring_invoice_schedules

Auto-generate invoices on a schedule. High-value feature for consulting, cleaning, maintenance businesses.

```sql
CREATE TABLE public.recurring_invoice_schedules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  template_id       uuid NOT NULL REFERENCES public.invoice_templates(id),
  name              text NOT NULL,

  -- Schedule
  frequency         text NOT NULL
    CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annually')),
  start_date        date NOT NULL,
  end_date          date,         -- NULL = runs indefinitely
  next_run_at       date NOT NULL,
  day_of_month      integer,      -- for monthly: run on day 1, 15, last, etc.

  -- Behaviour
  auto_send         boolean NOT NULL DEFAULT false,
  -- false = create draft for user to review and send manually
  -- true  = send automatically (only if contact has verified Peppol endpoint)

  -- Status
  is_active         boolean NOT NULL DEFAULT true,
  last_run_at       date,
  run_count         integer NOT NULL DEFAULT 0,
  failure_count     integer NOT NULL DEFAULT 0,
  last_failure_at   timestamptz,
  last_failure_reason text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX idx_recurring_next_run
  ON recurring_invoice_schedules(next_run_at ASC)
  WHERE is_active = true AND deleted_at IS NULL;
-- Used by daily cron job to find schedules due to run
```

---

## 15. Reference Data

### 15.1 tax_codes

Plain-English labels for PINT A-NZ tax categories. Used in the invoice UI and line item dropdowns.

```sql
CREATE TABLE public.tax_codes (
  code          text NOT NULL,
  -- S, Z, E, G, O, AE — PINT A-NZ tax category codes

  name          text NOT NULL,
  -- e.g. "Standard GST (10%)"

  description   text,
  -- e.g. "Applies to most goods and services supplied in Australia"

  rate          numeric(5, 4),
  -- 0.1000 = 10%, 0.0000 = exempt/zero
  -- NULL for AE (reverse charge — rate depends on the supply)

  country       country_code,
  -- NULL = applies to both AU and NZ
  -- 'AU' = AU-specific, 'NZ' = NZ-specific

  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,

  PRIMARY KEY (code, COALESCE(country::text, 'ALL'))
  -- Allows different rates per country (AU GST 10% vs NZ GST 15%)
);

INSERT INTO public.tax_codes
  (code, name, description, rate, country, sort_order)
VALUES
  ('S',  'Standard GST (10%)',   'Standard rate for most AU goods and services',    0.1000, 'AU', 1),
  ('S',  'Standard GST (15%)',   'Standard rate for most NZ goods and services',    0.1500, 'NZ', 1),
  ('Z',  'GST-Free',             'Zero-rated — GST applies at 0% (e.g. exports)',   0.0000, NULL, 2),
  ('E',  'GST Exempt',           'Outside the GST system (e.g. financial services)',0.0000, NULL, 3),
  ('G',  'Free Export',          'GST-free supplies made to non-residents',         0.0000, 'AU', 4),
  ('O',  'Outside GST Scope',    'Services outside the scope of GST entirely',      0.0000, NULL, 5),
  ('AE', 'Reverse Charge',       'Recipient accounts for GST (rare in AU)',         NULL,   NULL, 6);
```

### 15.2 compliance_events

AU/NZ regulatory deadlines. Powers the compliance calendar feature and proactive reminder notifications.

```sql
CREATE TABLE public.compliance_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country         country_code NOT NULL,
  event_type      text NOT NULL,
  -- 'tpar_due', 'bas_due', 'payday_super_live',
  -- 'peppol_mandate_milestone', 'privacy_act_change', 'aml_ctf_deadline'

  title           text NOT NULL,
  description     text,
  -- Plain-English explanation for SMB owners

  -- Applicability
  applies_to_industries text[],
  -- NULL = applies to all. e.g. ARRAY['building', 'cleaning', 'courier', 'IT']
  applies_to_all  boolean NOT NULL DEFAULT true,

  -- Dates
  due_date        date NOT NULL,
  warning_days    integer NOT NULL DEFAULT 30,
  -- Notify X days before due_date

  -- Reference
  ato_url         text,
  -- Official ATO/IRD guidance page

  -- Recurrence
  is_recurring    boolean NOT NULL DEFAULT false,
  recurrence_rule text,
  -- iCal RRULE for annual events: 'FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=28'
  -- (TPAR due 28 August every year)

  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed with known AU deadlines
INSERT INTO public.compliance_events
  (country, event_type, title, description, due_date, warning_days, is_recurring, recurrence_rule, applies_to_all)
VALUES
  ('AU', 'tpar_due',
   'TPAR Due — Taxable Payments Annual Report',
   'Report all payments made to contractors in building, cleaning, courier, IT, road freight, security and legal services.',
   '2026-08-28', 45, true, 'FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=28', false),

  ('AU', 'peppol_mandate_milestone',
   'Peppol e-Invoicing — Government Agencies Must Send Via Peppol',
   'From December 2026, all NCEs must issue invoices electronically via Peppol.',
   '2026-12-01', 60, false, NULL, false),

  ('AU', 'payday_super_live',
   'Payday Super Commenced',
   'Super must now be paid within 7 business days of each payday. SBSCH closed.',
   '2026-07-01', 90, false, NULL, true);
```

### 15.3 compliance_event_dismissals

Track which orgs have dismissed which compliance reminders.

```sql
CREATE TABLE public.compliance_event_dismissals (
  org_id                uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  compliance_event_id   uuid NOT NULL REFERENCES public.compliance_events(id) ON DELETE CASCADE,
  dismissed_by          uuid REFERENCES public.profiles(id),
  dismissed_at          timestamptz NOT NULL DEFAULT now(),
  snooze_until          date,
  -- NULL = dismissed permanently, date = remind me again on this date
  PRIMARY KEY (org_id, compliance_event_id)
);
```

---

## 16. Growth & API

### 16.1 onboarding_progress

Tracks exactly where users are in the activation funnel. Your single most important table for understanding why free users don't convert.

```sql
CREATE TABLE public.onboarding_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organisations(id) UNIQUE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id),

  -- Step 1: Organisation created
  org_created_at          timestamptz,

  -- Step 2: ABN verified against ABR
  abn_verified_at         timestamptz,

  -- Step 3: Connected accounting platform
  accounting_connected_at timestamptz,
  accounting_platform     accounting_platform,   -- which platform they connected

  -- Step 4: Registered on Peppol network
  peppol_registered_at    timestamptz,

  -- Step 5: Sent first Peppol invoice ← THE activation event
  first_invoice_sent_at   timestamptz,
  first_invoice_document_id uuid REFERENCES public.documents(id),

  -- Step 6: First invoice delivered (Peppol network confirmed)
  first_invoice_delivered_at timestamptz,

  -- Step 7: First invoice paid (retention event)
  first_invoice_paid_at   timestamptz,

  -- Subscription upgrade
  free_to_paid_at         timestamptz,
  plan_at_upgrade         subscription_plan,

  -- Stall detection
  last_step_completed     text,
  -- e.g. 'abn_verified' — used to send targeted nudge emails
  last_active_at          timestamptz NOT NULL DEFAULT now(),
  stall_nudge_sent_at     timestamptz,
  -- When we last sent a "you haven't finished setup" email

  -- Computed flags
  is_activated            boolean GENERATED ALWAYS AS
    (first_invoice_sent_at IS NOT NULL) STORED,
  is_converted            boolean GENERATED ALWAYS AS
    (free_to_paid_at IS NOT NULL) STORED,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Funnel analysis queries
CREATE INDEX idx_onboarding_not_activated
  ON onboarding_progress(last_active_at DESC)
  WHERE is_activated = false;

CREATE INDEX idx_onboarding_activated_not_converted
  ON onboarding_progress(first_invoice_sent_at DESC)
  WHERE is_activated = true AND is_converted = false;
```

### 16.2 api_keys

External API access for bookkeepers and enterprise clients who want to integrate their own systems. Scope-controlled, rate-limited.

```sql
CREATE TABLE public.api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by      uuid REFERENCES public.profiles(id),

  name            text NOT NULL,
  -- e.g. "Production", "Xero Webhook Integration", "Accounting Firm CRM"

  -- Key storage — raw key shown ONCE at creation, then only the hash is kept
  key_hash        text NOT NULL UNIQUE,   -- SHA-256(raw_key)
  key_prefix      text NOT NULL,          -- First 12 chars for display
  -- Display format: "sk_live_xxxxxxx..."
  -- Prefix allows user to identify which key is which without exposing it

  -- Environment
  environment     text NOT NULL DEFAULT 'live'
    CHECK (environment IN ('live', 'test')),

  -- Permissions
  scopes          text[] NOT NULL DEFAULT '{}',
  -- Granular scopes:
  -- 'invoices:read', 'invoices:write', 'invoices:send'
  -- 'contacts:read', 'contacts:write'
  -- 'organisation:read'

  -- Rate limiting
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  rate_limit_per_day    integer NOT NULL DEFAULT 5000,

  -- Restrictions
  allowed_ips     inet[],    -- NULL = no IP restriction
  allowed_origins text[],   -- NULL = no CORS restriction

  -- Status
  is_active       boolean NOT NULL DEFAULT true,
  last_used_at    timestamptz,
  last_used_ip    inet,
  use_count       bigint NOT NULL DEFAULT 0,

  -- Expiry
  expires_at      timestamptz,   -- NULL = never expires

  -- Revocation
  revoked_at      timestamptz,
  revoked_by      uuid REFERENCES public.profiles(id),
  revoke_reason   text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_org
  ON api_keys(org_id) WHERE is_active = true AND revoked_at IS NULL;

CREATE INDEX idx_api_keys_hash
  ON api_keys(key_hash) WHERE is_active = true;
```

---

## Updated: Row Level Security Additions

RLS policies for all new tables (append to existing RLS section):

```sql
-- ── DOCUMENT PAYMENTS ─────────────────────────────────────────
ALTER TABLE public.document_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select" ON document_payments
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "payments_insert" ON document_payments
  FOR INSERT WITH CHECK (
    get_user_org_role(org_id) IN ('owner', 'admin', 'bookkeeper')
  );

CREATE POLICY "payments_update" ON document_payments
  FOR UPDATE USING (
    get_user_org_role(org_id) IN ('owner', 'admin', 'bookkeeper')
  );

-- ── FEATURE FLAGS ─────────────────────────────────────────────
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;

-- Feature flags: readable by all authenticated users
CREATE POLICY "feature_flags_select" ON feature_flags
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Feature flag overrides: readable by all, writable by service role only
CREATE POLICY "feature_flag_overrides_select" ON feature_flag_overrides
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── CACHE TABLES ──────────────────────────────────────────────
-- ABN and Peppol cache: readable by all authenticated, writable by service role
ALTER TABLE public.abn_lookup_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peppol_endpoint_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abn_cache_select" ON abn_lookup_cache
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "peppol_cache_select" ON peppol_endpoint_cache
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── JOB QUEUE ─────────────────────────────────────────────────
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;

-- Job queue: org members can see their jobs, service role manages them
CREATE POLICY "job_queue_select" ON job_queue
  FOR SELECT USING (
    org_id IS NULL OR org_id IN (SELECT get_user_org_ids())
  );
-- No insert/update via client — all via service role or Edge Functions

-- ── WEBHOOK DELIVERIES ────────────────────────────────────────
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks_select" ON webhook_deliveries
  FOR SELECT USING (
    org_id IS NULL OR org_id IN (SELECT get_user_org_ids())
  );

-- ── DOCUMENT ATTACHMENTS ──────────────────────────────────────
ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_select" ON document_attachments
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "attachments_insert" ON document_attachments
  FOR INSERT WITH CHECK (
    get_user_org_role(org_id) IN ('owner', 'admin', 'bookkeeper')
  );

-- ── INVOICE TEMPLATES ─────────────────────────────────────────
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select" ON invoice_templates
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "templates_write" ON invoice_templates
  FOR ALL USING (
    get_user_org_role(org_id) IN ('owner', 'admin', 'bookkeeper')
  );

-- ── RECURRING SCHEDULES ───────────────────────────────────────
ALTER TABLE public.recurring_invoice_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_select" ON recurring_invoice_schedules
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "recurring_write" ON recurring_invoice_schedules
  FOR ALL USING (
    get_user_org_role(org_id) IN ('owner', 'admin', 'bookkeeper')
  );

-- ── REFERENCE TABLES (read-only for all) ──────────────────────
ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_codes_select_all" ON tax_codes
  FOR SELECT USING (true);

CREATE POLICY "compliance_events_select_all" ON compliance_events
  FOR SELECT USING (true);

-- ── COMPLIANCE DISMISSALS ─────────────────────────────────────
ALTER TABLE public.compliance_event_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dismissals_select" ON compliance_event_dismissals
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "dismissals_insert" ON compliance_event_dismissals
  FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));

-- ── ONBOARDING PROGRESS ───────────────────────────────────────
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_select" ON onboarding_progress
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
-- Updates via SECURITY DEFINER trigger only — not direct client writes

-- ── ACCESS POINT USAGE ────────────────────────────────────────
ALTER TABLE public.access_point_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_usage_select" ON access_point_usage
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

-- ── API KEYS ─────────────────────────────────────────────────
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select" ON api_keys
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "api_keys_insert" ON api_keys
  FOR INSERT WITH CHECK (
    get_user_org_role(org_id) = 'owner'
  );
-- Only org owners can create API keys

CREATE POLICY "api_keys_update" ON api_keys
  FOR UPDATE USING (
    get_user_org_role(org_id) = 'owner'
  );
```

---

## Updated: Complete Table Inventory

| #   | Table                         | Domain           | Phase |
| --- | ----------------------------- | ---------------- | ----- |
| 1   | `profiles`                    | Auth             | 1     |
| 2   | `organisations`               | Core             | 1     |
| 3   | `organisation_members`        | Core / RBAC      | 1     |
| 4   | `org_claim_requests`          | Core / Ownership | 1     |
| 5   | `accounting_connections`      | Integrations     | 1     |
| 6   | `contacts`                    | Core             | 1     |
| 7   | `documents`                   | Invoicing        | 1     |
| 8   | `document_versions`           | Invoicing        | 1     |
| 9   | `document_line_items`         | Invoicing        | 1     |
| 10  | `peppol_transmissions`        | Peppol           | 2     |
| 11  | `peppol_status_events`        | Peppol           | 2     |
| 12  | `subscriptions`               | Billing          | 1     |
| 13  | `audit_logs`                  | Compliance       | 1     |
| 14  | `notification_preferences`    | Notifications    | 1     |
| 15  | `notifications`               | Notifications    | 1     |
| 16  | `document_payments`           | Invoicing        | 1     |
| 17  | `feature_flags`               | Operations       | 1     |
| 18  | `feature_flag_overrides`      | Operations       | 1     |
| 19  | `abn_lookup_cache`            | Caching          | 1     |
| 20  | `peppol_endpoint_cache`       | Caching          | 2     |
| 21  | `job_queue`                   | Operations       | 2     |
| 22  | `webhook_deliveries`          | Operations       | 2     |
| 23  | `rate_limit_buckets`          | Operations       | 2     |
| 24  | `access_point_usage`          | Billing          | 2     |
| 25  | `document_attachments`        | Invoicing        | 3     |
| 26  | `invoice_templates`           | Invoicing        | 2     |
| 27  | `recurring_invoice_schedules` | Invoicing        | 3     |
| 28  | `tax_codes`                   | Reference        | 1     |
| 29  | `compliance_events`           | Reference        | 3     |
| 30  | `compliance_event_dismissals` | Reference        | 3     |
| 31  | `onboarding_progress`         | Growth           | 1     |
| 32  | `api_keys`                    | API              | 4     |
| 33  | `device_tokens`               | Mobile           | 3     |
| 34  | `user_sessions`               | Mobile / Auth    | 1     |
| 35  | `sync_queue`                  | Mobile / Offline | 3     |
| 36  | `app_versions`                | Mobile           | 3     |

**Total: 36 tables** across core, integrations, invoicing, Peppol, billing, operations, reference, growth, and mobile domains.

---

## 17. Mobile Extensions — React Native

All mobile-specific tables and amendments live here. One file — no split. Mobile-added columns on existing tables are annotated with `-- Added: mobile` in the SQL.

---

### 17.1 What Changes and Why

| Requirement                             | Schema change                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| Push notifications (FCM + APNs)         | New `device_tokens` table                                                           |
| Multiple devices + remote sign-out      | New `user_sessions` table                                                           |
| Offline drafts + sync                   | New `sync_queue` table                                                              |
| Force app update enforcement            | New `app_versions` table                                                            |
| Push as a notification channel          | `ALTER TYPE notification_channel ADD VALUE 'push'` + new columns on `notifications` |
| Push preferences per event              | New columns on `notification_preferences`                                           |
| Camera scan + file picker tracking      | New columns on `document_versions`                                                  |
| Track which platform created a document | New columns on `documents`                                                          |

**What does NOT change:**

- Core invoice/document table structure — only additive columns
- All existing RLS policies — only new policies added
- Billing / subscription tables — unchanged
- Audit log — push events added but table structure unchanged
- Bookkeeper Split Mode migration path — still just two columns

---

### 17.2 device_tokens

Stores FCM (Android) and APNs (iOS) push tokens per device per user. One user can have many devices. One device has one active token at a time.

```sql
CREATE TABLE public.device_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Push token
  token           text NOT NULL,
  platform        text NOT NULL CHECK (platform IN ('ios', 'android')),
  push_provider   text NOT NULL CHECK (push_provider IN ('apns', 'fcm')),

  -- Device fingerprint (from react-native-device-info)
  device_id       text NOT NULL,  -- DeviceInfo.getUniqueId() — persistent per install
  device_name     text,           -- DeviceInfo.getDeviceName() e.g. "Tashi's iPhone 15"
  device_model    text,           -- DeviceInfo.getModel() e.g. "iPhone15,3"
  os_version      text,           -- DeviceInfo.getSystemVersion()
  app_version     text,           -- DeviceInfo.getVersion() e.g. "1.2.3"
  app_build       text,           -- DeviceInfo.getBuildNumber() e.g. "42"

  -- Status
  is_active       boolean NOT NULL DEFAULT true,
  last_used_at    timestamptz NOT NULL DEFAULT now(),

  -- Token invalidation
  invalidated_at  timestamptz,
  invalidation_reason text CHECK (
    invalidation_reason IN (
      'unregistered',    -- device unregistered from push service
      'app_uninstalled', -- inferred from push failure
      'token_rotated',   -- new token issued by OS
      'user_logout'      -- user explicitly logged out
    )
  ),

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_device_tokens_user_active
  ON device_tokens(user_id)
  WHERE is_active = true AND invalidated_at IS NULL;

CREATE INDEX idx_device_tokens_token
  ON device_tokens(token)
  WHERE is_active = true;
```

**Token lifecycle:**

```
App installs → OS registers → FCM/APNs issues token
     ↓
Token stored in device_tokens (is_active = true)
     ↓
Token used for push notifications
     ↓
Token rotated by OS? → upsert with new token, invalidate old
App uninstalled? → push fails → mark invalidated_at
User logs out? → set is_active = false, invalidation_reason = 'user_logout'
```

**RLS:**

```sql
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_tokens_own" ON device_tokens
  FOR ALL USING (user_id = auth.uid());
```

---

### 17.3 user_sessions

Tracks active sessions across all devices. Powers the "active sessions" screen and remote sign-out. Applies to web and mobile sessions equally.

```sql
CREATE TABLE public.user_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Session token — store only the HASH, never the raw token
  -- Raw token lives in react-native-keychain (mobile) or httpOnly cookie (web)
  session_token_hash    text NOT NULL UNIQUE,
  -- Generate: SHA-256(supabase_session_access_token + user_id)

  -- Device fingerprint
  device_id             text,
  device_name           text,
  device_type           text CHECK (device_type IN ('mobile', 'tablet', 'web', 'desktop')),
  platform              text CHECK (platform IN ('ios', 'android', 'web', 'macos', 'windows')),
  app_version           text,
  browser               text,  -- web only: "Chrome 124", "Safari 17"

  -- Network context
  ip_address            inet,
  approximate_location  text,  -- "Sydney, AU" — from IP geolocation, never GPS-precise

  -- Activity
  last_active_at        timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL DEFAULT (now() + interval '30 days'),

  -- Revocation
  is_active             boolean NOT NULL DEFAULT true,
  revoked_at            timestamptz,
  revoked_by            uuid REFERENCES public.profiles(id),
  revoke_reason         text CHECK (
    revoke_reason IN (
      'user_logout', 'remote_revoke', 'token_expired', 'security_reset', 'admin_action'
    )
  ),

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_active
  ON user_sessions(user_id, last_active_at DESC)
  WHERE is_active = true;

CREATE INDEX idx_sessions_token_hash
  ON user_sessions(session_token_hash)
  WHERE is_active = true;

CREATE INDEX idx_sessions_expiry
  ON user_sessions(expires_at)
  WHERE is_active = true;
```

**RLS:**

```sql
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own" ON user_sessions
  FOR ALL USING (user_id = auth.uid());
-- UPDATE intentionally allowed on other devices — powers "sign out all devices"
```

---

### 17.4 sync_queue

The offline write queue. Offline changes land here first. When connectivity restores, the sync engine processes the queue in dependency order.

```sql
CREATE TYPE sync_operation AS ENUM ('create', 'update', 'delete', 'archive');
CREATE TYPE sync_status AS ENUM (
  'pending',    -- waiting for connectivity
  'syncing',    -- currently being processed
  'synced',     -- successfully applied to server
  'conflict',   -- server state conflicts with local change
  'failed',     -- unrecoverable error
  'cancelled'   -- user discarded the offline change
);

CREATE TABLE public.sync_queue (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  device_id           text NOT NULL,

  -- What to sync
  operation           sync_operation NOT NULL,
  resource_type       text NOT NULL,
  -- Supported: 'document', 'document_line_item', 'contact'
  -- NOT supported: 'peppol_transmission' (requires live network by definition)

  -- IDs
  local_id            text NOT NULL,   -- client-generated UUID
  server_id           uuid,            -- populated after successful sync

  -- Payload
  payload             jsonb NOT NULL,
  -- CREATE: full object · UPDATE: changed fields only · DELETE: {}

  -- Conflict detection
  sequence_number     bigint NOT NULL DEFAULT 0,
  client_updated_at   timestamptz NOT NULL,
  server_updated_at   timestamptz,  -- server state baseline at time of offline edit

  -- Conflict resolution
  has_conflict            boolean NOT NULL DEFAULT false,
  conflict_server_state   jsonb,
  conflict_resolution     text CHECK (
    conflict_resolution IN ('client_wins', 'server_wins', 'manual')
  ),
  conflict_resolved_at    timestamptz,

  -- Status
  status              sync_status NOT NULL DEFAULT 'pending',
  attempt_count       integer NOT NULL DEFAULT 0,
  last_attempted_at   timestamptz,
  synced_at           timestamptz,
  error_code          text,
  error_message       text,

  -- Dependency ordering
  -- A line item must wait until its parent document is synced first
  depends_on_local_id text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_queue_pending
  ON sync_queue(user_id, device_id, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX idx_sync_queue_conflicts
  ON sync_queue(user_id, org_id)
  WHERE has_conflict = true AND conflict_resolution IS NULL;

CREATE INDEX idx_sync_queue_cleanup
  ON sync_queue(synced_at)
  WHERE status = 'synced';
-- Cron: DELETE FROM sync_queue WHERE status = 'synced' AND synced_at < now() - interval '7 days'
```

**What can be created offline:**

| Resource              | Create? | Edit? | Delete? | Notes                           |
| --------------------- | ------- | ----- | ------- | ------------------------------- |
| Document (draft only) | ✅      | ✅    | ✅      | Only drafts — not sent invoices |
| Document line items   | ✅      | ✅    | ✅      | Depends on parent document      |
| Contact               | ✅      | ✅    | ❌      | No offline delete               |
| Peppol transmission   | ❌      | ❌    | ❌      | Requires live network           |
| Organisation settings | ❌      | ❌    | ❌      | Too risky offline               |
| Team members          | ❌      | ❌    | ❌      | Requires live auth              |

**RLS:**

```sql
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_queue_own" ON sync_queue
  FOR ALL USING (user_id = auth.uid());
```

---

### 17.5 app_versions

Force update enforcement. `is_minimum_required = true` is your kill switch for breaking API changes or critical security patches.

```sql
CREATE TABLE public.app_versions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform              text NOT NULL CHECK (platform IN ('ios', 'android')),
  version               text NOT NULL,       -- '1.2.3'
  version_code          integer NOT NULL,    -- iOS: CFBundleVersion · Android: versionCode

  -- Enforcement
  is_minimum_required   boolean NOT NULL DEFAULT false,
  -- true = hard block — cannot use app until updated
  is_recommended        boolean NOT NULL DEFAULT false,
  -- true = soft nudge — dismissable banner

  -- Content
  release_notes         text,
  release_notes_url     text,
  breaking_changes      text[],
  store_url             text,

  -- Status
  released_at           timestamptz NOT NULL DEFAULT now(),
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),

  UNIQUE(platform, version)
);

-- Seed on first deploy
INSERT INTO public.app_versions (platform, version, version_code, is_minimum_required, released_at)
VALUES ('ios', '1.0.0', 1, true, now()), ('android', '1.0.0', 1, true, now());
```

**RLS:**

```sql
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_versions_select_all" ON app_versions
  FOR SELECT USING (true);
-- Write via service role only
```

---

### 17.6 Amendments to Existing Tables

These are additive `ALTER TABLE` statements. All new columns are nullable or have defaults — no data migration required.

```sql
-- ── notifications: add push channel ───────────────────────────
-- Added: mobile
ALTER TYPE notification_channel ADD VALUE 'push';

ALTER TABLE public.notifications
  ADD COLUMN push_delivery_id       text,           -- FCM/APNs message ID
  ADD COLUMN push_sent_to_tokens    text[],         -- device token IDs push was sent to
  ADD COLUMN push_delivered_count   integer DEFAULT 0,
  ADD COLUMN push_failed_count      integer DEFAULT 0;

-- ── notification_preferences: push settings ───────────────────
-- Added: mobile
ALTER TABLE public.notification_preferences
  ADD COLUMN push_enabled                 boolean NOT NULL DEFAULT true,
  ADD COLUMN push_on_invoice_rejected     boolean NOT NULL DEFAULT true,
  ADD COLUMN push_on_invoice_delivered    boolean NOT NULL DEFAULT false,
  ADD COLUMN push_quiet_hours_enabled     boolean NOT NULL DEFAULT false,
  ADD COLUMN push_quiet_hours_start       time DEFAULT '22:00:00',
  ADD COLUMN push_quiet_hours_end         time DEFAULT '07:00:00';

-- ── document_versions: track upload source ────────────────────
-- Added: mobile
ALTER TABLE public.document_versions
  ADD COLUMN upload_source text CHECK (
    upload_source IN (
      'xero_sync', 'myob_sync', 'quickbooks_sync',
      'pdf_file_picker',  -- user selected PDF from files app
      'pdf_camera_scan',  -- user photographed a paper invoice
      'manual_entry', 'api'
    )
  ),
  ADD COLUMN upload_device_id           text,
  ADD COLUMN camera_scan_image_paths    text[],   -- original camera images before PDF processing
  ADD COLUMN extraction_model           text,     -- which Claude model was used
  ADD COLUMN extraction_duration_ms     integer;  -- performance monitoring

-- ── documents: track client origin ────────────────────────────
-- Added: mobile
ALTER TABLE public.documents
  ADD COLUMN created_from text DEFAULT 'web'
    CHECK (created_from IN ('web', 'ios', 'android', 'api', 'system')),
  ADD COLUMN created_on_device_id text,
  ADD COLUMN local_draft_id       text UNIQUE;
  -- Client-generated UUID from sync_queue — kept after sync for mobile→server correlation
```

---

### 17.7 Offline Sync Architecture

**Strategy: operation-based queue (not state-based sync)**

Store individual operations (create/update/delete) with delta payloads — not full document snapshots on every change. Like Git commits vs file snapshots.

**Why this fits the product:**

- Invoicing is not a collaborative real-time editing problem
- Most offline use case is "create a new draft on site without signal"
- Conflicts are rare — drafts are typically owned by one person
- Simple enough for a solo founder to maintain

**Local storage libraries:**

```
WatermelonDB   → SQLite-backed offline DB with sync  ← Recommended for documents
MMKV           → Fast key-value store                ← For session/auth state
```

**Conflict resolution rules:**

| Scenario                                        | Rule                                                      |
| ----------------------------------------------- | --------------------------------------------------------- |
| Offline draft, no server changes                | Client wins — no conflict                                 |
| Offline draft, server draft also edited         | Conflict — user resolves in side-by-side diff UI          |
| Offline draft, server invoice already sent      | Server wins — discard local. Sent invoices are immutable. |
| Offline contact edit, server contact edited     | Last-write-wins per field                                 |
| Offline create, same `document_number` conflict | Conflict — prompt user to rename                          |
| Offline delete, server already deleted          | No-op — mark synced (idempotent)                          |

**Sync flow:**

```
OFFLINE WRITE
─────────────
User creates/edits draft
        ↓
Write to WatermelonDB (local SQLite)
        ↓
Insert into sync_queue (status = 'pending')
        ↓
UI shows local state immediately (optimistic)


SYNC ON RECONNECT
──────────────────
Network restored (NetInfo listener)
        ↓
Process sync_queue WHERE status = 'pending' ORDER BY created_at ASC
        ↓
For each item:
  ├── depends_on_local_id? → wait for dependency to sync first
  ├── Fetch server state (UPDATE/DELETE only)
  ├── server.updated_at > baseline? → set has_conflict = true
  ├── No conflict → POST/PATCH to Supabase → status = 'synced'
  └── Error → increment attempt_count, schedule retry


CONFLICT RESOLUTION
────────────────────
Push: "1 invoice needs your attention"
User opens conflict screen → side-by-side diff
User picks: Keep mine / Use server / Edit manually
→ set conflict_resolution → re-queue as 'pending'
```

**Local ID → Server ID mapping:**

```typescript
// Before syncing a line item, ensure parent document is synced
const syncItem = async (item: SyncQueueItem) => {
  if (item.depends_on_local_id) {
    const parent = await getSyncQueueItem(item.depends_on_local_id);
    if (parent.status !== "synced") return "waiting_for_dependency";
    // Replace local parent ID with real server ID before sending
    item.payload = replaceLocalId(
      item.payload,
      item.depends_on_local_id,
      parent.server_id,
    );
  }
  return await applyToServer(item);
};

// After sync: find server record from mobile's local UUID
const { data } = await supabase
  .from("documents")
  .select("id")
  .eq("local_draft_id", localUUID)
  .single();
```

---

### 17.8 React Native Integration Notes

**Required packages:**

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "react-native-keychain": "^8.x",
    "@nozbe/watermelondb": "^0.27.x",
    "react-native-device-info": "^10.x",
    "@react-native-firebase/app": "^18.x",
    "@react-native-firebase/messaging": "^18.x",
    "react-native-document-picker": "^9.x",
    "react-native-vision-camera": "^4.x",
    "react-native-pdf": "^6.x",
    "react-native-netinfo": "^11.x"
  }
}
```

**Session token storage (react-native-keychain):**

```typescript
import * as Keychain from "react-native-keychain";
import { createHash } from "crypto";

const storeSession = async (session: Session) => {
  const sessionHash = createHash("sha256")
    .update(session.access_token + session.user.id)
    .digest("hex");

  // Raw token stored in encrypted OS keychain — never in DB
  await Keychain.setInternetCredentials(
    "supabase_session",
    session.user.id,
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
  );

  // Only hash stored in DB
  await supabase.from("user_sessions").upsert(
    {
      user_id: session.user.id,
      session_token_hash: sessionHash,
      device_id: await DeviceInfo.getUniqueId(),
      device_name: await DeviceInfo.getDeviceName(),
      device_type: DeviceInfo.isTablet() ? "tablet" : "mobile",
      platform: Platform.OS,
      app_version: DeviceInfo.getVersion(),
    },
    { onConflict: "session_token_hash" },
  );
};
```

**Push token registration:**

```typescript
import messaging from "@react-native-firebase/messaging";

const registerPushToken = async (userId: string) => {
  const token = await messaging().getToken();
  const deviceId = await DeviceInfo.getUniqueId();

  await supabase.from("device_tokens").upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      push_provider: Platform.OS === "ios" ? "apns" : "fcm",
      device_id: deviceId,
      device_name: await DeviceInfo.getDeviceName(),
      device_model: await DeviceInfo.getModel(),
      os_version: DeviceInfo.getSystemVersion(),
      app_version: DeviceInfo.getVersion(),
      app_build: DeviceInfo.getBuildNumber(),
    },
    { onConflict: "user_id, device_id" },
  );

  // iOS rotates tokens — handle refresh
  messaging().onTokenRefresh(async (newToken) => {
    await supabase
      .from("device_tokens")
      .update({ token: newToken, invalidation_reason: "token_rotated" })
      .eq("user_id", userId)
      .eq("device_id", deviceId);
  });
};
```

**Network detection:**

```typescript
import NetInfo from "@react-native-community/netinfo";

NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable) {
    syncEngine.processPendingQueue();
  }
});
```

---

### 17.9 Push Notification Architecture

**Flow: Invoice rejected → push notification**

```
Storecove webhook fires
        ↓
Supabase Edge Function: handle_peppol_webhook
        ↓
1. peppol_transmissions.status = 'rejected'
2. Insert peppol_status_events row
3. documents.status = 'rejected'
4. Insert audit_log entry
5. send_push_notification(org_id, document_id, 'invoice.rejected')
        ↓
send_push_notification:
  Query org members (owner, admin, bookkeeper)
  For each user:
    → Check notification_preferences.push_enabled + quiet hours
    → Query device_tokens WHERE user_id = ? AND is_active = true
    → Send via FCM/APNs
    → Insert notification (channel = 'push')
    → Insert notification (channel = 'in_app')
```

**Push payload:**

```json
{
  "notification": {
    "title": "Invoice rejected",
    "body": "INV-042 to Dept of Finance was rejected. Tap to see why."
  },
  "data": {
    "type": "invoice.rejected",
    "document_id": "uuid",
    "org_id": "uuid",
    "action_url": "appname://invoices/uuid",
    "notification_id": "uuid"
  },
  "apns": { "payload": { "aps": { "sound": "default", "badge": 1 } } },
  "android": {
    "priority": "high",
    "notification": { "channel_id": "invoice_alerts" }
  }
}
```

---

## 18. Edge Case Mitigations

Schema additions and functions that address the 5 critical edge cases identified in the product audit. Each is self-contained and additive.

---

### 18.1 Item 1 — Bookkeeper Cancels Plan, Client Orgs Stranded

When Jane's Bookkeeper plan cancels, her 12 client orgs (`billing_owner_user_id = jane`) must not silently lose access. Two-stage protection: 30-day warning, then graceful degradation to free tier on actual cancellation.

```sql
-- Handles bookkeeper plan cancellation gracefully
-- Called by job_queue worker when a bookkeeper subscription enters 'cancelled' state
CREATE OR REPLACE FUNCTION public.handle_bookkeeper_plan_cancellation(
  p_bookkeeper_user_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org record;
BEGIN
  -- Find all orgs covered by this bookkeeper's plan
  FOR v_org IN
    SELECT id, name FROM organisations
    WHERE billing_owner_user_id = p_bookkeeper_user_id
      AND deleted_at IS NULL
  LOOP
    -- 1. Move org to free tier — they keep access with limits
    INSERT INTO subscriptions (
      subscriber_type,
      subscriber_id,
      plan,
      status,
      billing_transferred_from,
      billing_transferred_at
    )
    VALUES (
      'organisation',
      v_org.id,
      'free',
      'active',
      p_bookkeeper_user_id,
      now()
    )
    ON CONFLICT (subscriber_type, subscriber_id) DO UPDATE SET
      plan                    = 'free',
      status                  = 'active',
      billing_transferred_from = p_bookkeeper_user_id,
      billing_transferred_at  = now(),
      updated_at              = now();

    -- 2. Clear billing ownership — org now manages its own subscription
    UPDATE organisations SET
      billing_owner_user_id = NULL,
      updated_at            = now()
    WHERE id = v_org.id;

    -- 3. Notify org owner(s)
    -- Notification: "Your bookkeeper's plan has ended. You've been moved to the free tier."
    INSERT INTO notifications (
      user_id, org_id, type, title, body, channel
    )
    SELECT
      om.user_id,
      v_org.id,
      'billing.bookkeeper_plan_cancelled',
      'Account plan changed',
      'Your bookkeeper''s plan has ended. Your account has been moved to the free tier. ' ||
      'Upgrade to continue sending invoices.',
      'email'
    FROM organisation_members om
    WHERE om.org_id     = v_org.id
      AND om.role       IN ('owner', 'admin')
      AND om.deleted_at IS NULL
      AND om.accepted_at IS NOT NULL;

    -- 4. Audit log
    PERFORM public.create_audit_log(
      p_bookkeeper_user_id, v_org.id,
      'billing.bookkeeper_plan_cancelled',
      'organisation', v_org.id,
      jsonb_build_object('previous_billing_owner', p_bookkeeper_user_id),
      jsonb_build_object('new_plan', 'free', 'billing_owner', NULL)
    );

  END LOOP;

  -- 5. Refresh bookkeeper's org count (now 0)
  PERFORM public.refresh_bookkeeper_org_count(p_bookkeeper_user_id);
END;
$$;
```

**30-day warning job — added to `job_queue` seed:**

```sql
-- Cron: runs daily, checks for bookkeeper subscriptions with cancel_at_period_end = true
-- For each, if period ends within 30 days, queue a warning notification job

-- job_type: 'billing.bookkeeper_plan_cancelling'
-- payload: { "bookkeeper_user_id": "uuid", "period_end": "2026-08-01", "affected_org_count": 12 }

-- job_type: 'billing.bookkeeper_plan_cancelled'
-- payload: { "bookkeeper_user_id": "uuid" }
-- Triggers handle_bookkeeper_plan_cancellation() on the actual cancellation date
```

---

### 18.2 Item 2 — Invoice Number Normalisation

Prevents "INV-042" and "INV042" and "inv042" from being treated as different invoice numbers. The `document_number_normalised` generated column is already on the `documents` table (see Section 4.6). This section documents the helper function and the uniqueness rule.

```sql
-- Normalise a document number to its canonical form
-- Used before any uniqueness check or duplicate detection
-- Strips: hyphens, spaces, underscores, forward slashes, dots
-- Lowercases everything
CREATE OR REPLACE FUNCTION public.normalise_document_number(
  p_number text
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT LOWER(REGEXP_REPLACE(p_number, '[^A-Za-z0-9]', '', 'g'));
$$;

-- The generated column on documents handles this automatically at insert/update:
-- document_number_normalised = LOWER(REGEXP_REPLACE(document_number, '[^A-Za-z0-9]', '', 'g'))
-- UNIQUE(org_id, document_number_normalised) enforces one canonical number per org

-- Examples:
-- 'INV-042'    → 'inv042'  ← same
-- 'INV042'     → 'inv042'  ← same
-- 'inv042'     → 'inv042'  ← same
-- 'INV 042'    → 'inv042'  ← same
-- 'INV_042'    → 'inv042'  ← same
-- 'INV/2026/42'→ 'inv202642' ← different from INV-042 (intentional — different numbering scheme)
```

**Conflict handling in the application:**

```typescript
// When insert fails with unique_violation on document_number_normalised:
// Show user: "An invoice with a similar number (INV042) already exists.
//            Your number 'INV-042' would be treated as a duplicate.
//            Please use a different number."
// Never silently rename — always ask the user
```

---

### 18.3 Item 3 — ABN Deregistered After Invoice Sent

Two-part mitigation: snapshot ABN status at send time (already added to `document_versions`), and a monthly re-verification job that flags orgs whose ABN has changed.

```sql
-- Monthly cron job: re-verify ABNs of all active orgs
-- Compares current ABR status with last known status in abn_lookup_cache
-- job_type: 'abn.reverify_active_orgs'

CREATE OR REPLACE FUNCTION public.process_abn_status_change(
  p_org_id      uuid,
  p_old_status  text,  -- 'Active'
  p_new_status  text   -- 'Cancelled'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 1. Record when the ABN status changed on the org
  UPDATE organisations SET
    abn_status_changed_at = now(),
    updated_at            = now()
  WHERE id = p_org_id;

  -- 2. Notify all org members (owner + admin + bookkeeper)
  INSERT INTO notifications (user_id, org_id, type, title, body, channel)
  SELECT
    om.user_id,
    p_org_id,
    'compliance.abn_status_changed',
    'ABN status changed',
    'Your ABN status has changed from ' || p_old_status || ' to ' || p_new_status || '. ' ||
    'Invoices sent after this date may be disputed. Contact the ATO for guidance.',
    ch.channel
  FROM organisation_members om
  CROSS JOIN (VALUES ('email'::text), ('in_app'::text)) AS ch(channel)
  WHERE om.org_id      = p_org_id
    AND om.role        IN ('owner', 'admin', 'bookkeeper')
    AND om.deleted_at  IS NULL
    AND om.accepted_at IS NOT NULL;

  -- 3. Audit log
  PERFORM public.create_audit_log(
    NULL, p_org_id,
    'compliance.abn_status_changed',
    'organisation', p_org_id,
    jsonb_build_object('abn_status', p_old_status),
    jsonb_build_object('abn_status', p_new_status)
  );
END;
$$;

-- The monthly job also populates abn_status_at_send on document_versions
-- when a document is being transmitted — captured from the abn_lookup_cache
-- at the moment the transmission is created, not after
```

**What `abn_status_at_send` protects:**

If Mick's ABN is later cancelled and a dispute arises about an invoice sent 6 months ago, `abn_status_at_send = 'Active'` on the `document_versions` row is your evidence that the ABN was valid at send time. Immutable — version rows are never updated after creation.

---

### 18.4 Item 5 — GST Threshold Crossover

Notifies SMB owners when they're approaching the $75k GST registration threshold. Fields are already added to `organisations` (see Section 4.2). This section documents the trigger that keeps `estimated_annual_revenue` accurate.

```sql
-- Updates estimated_annual_revenue on the org when a payment is recorded
-- Uses rolling 12-month annualisation: (total paid in last 12 months)
CREATE OR REPLACE FUNCTION public.update_estimated_annual_revenue()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_org_id       uuid := COALESCE(NEW.org_id, OLD.org_id);
  v_annual_rev   bigint;
  v_threshold    bigint := 7500000;  -- $75,000 in cents
  v_warning_pct  bigint := 6500000;  -- $65,000 in cents — warn at ~87% of threshold
BEGIN
  -- Sum all payments in the last 12 months for this org
  SELECT COALESCE(SUM(dp.amount_paid), 0) INTO v_annual_rev
  FROM document_payments dp
  JOIN documents d ON d.id = dp.document_id
  WHERE d.org_id      = v_org_id
    AND dp.paid_at    >= (CURRENT_DATE - interval '12 months')
    AND dp.deleted_at IS NULL;

  -- Update org's estimated annual revenue
  UPDATE organisations SET
    estimated_annual_revenue = v_annual_rev,
    updated_at               = now()
  WHERE id = v_org_id;

  -- Send GST threshold warning if:
  -- 1. Not already GST registered
  -- 2. Revenue >= $65k warning threshold
  -- 3. Warning not already sent in the last 30 days
  IF v_annual_rev >= v_warning_pct THEN
    UPDATE organisations SET
      gst_threshold_warning_sent_at = now()
    WHERE id                         = v_org_id
      AND gst_registered             = false
      AND (
        gst_threshold_warning_sent_at IS NULL
        OR gst_threshold_warning_sent_at < now() - interval '30 days'
      );

    IF FOUND THEN
      -- Insert notification for org owners
      INSERT INTO notifications (user_id, org_id, type, title, body, channel)
      SELECT
        om.user_id,
        v_org_id,
        'compliance.gst_threshold_warning',
        'GST registration threshold approaching',
        'Your estimated annual revenue is approaching $75,000. ' ||
        'You may need to register for GST. ' ||
        'Speak with your bookkeeper or accountant for advice.',
        'email'
      FROM organisation_members om
      WHERE om.org_id      = v_org_id
        AND om.role        IN ('owner', 'admin')
        AND om.deleted_at  IS NULL
        AND om.accepted_at IS NOT NULL;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_payment_update_gst_threshold
  AFTER INSERT OR UPDATE OR DELETE ON document_payments
  FOR EACH ROW EXECUTE PROCEDURE public.update_estimated_annual_revenue();
```

**Note:** This runs alongside the existing `on_payment_change` trigger on `document_payments`. Both fire on payment changes — one updates `documents.payment_status`, the other updates `organisations.estimated_annual_revenue`. Postgres supports multiple triggers on the same table.

---

### 18.5 Item 14 — Bulk Send Batch Tracking

The `batch_id` column is already added to `peppol_transmissions` (see Section 4.9). This section documents the job type and the application pattern.

```sql
-- job_type: 'peppol.bulk_send_batch'
-- payload: {
--   "org_id": "uuid",
--   "document_ids": ["uuid", "uuid", ...],  -- all docs to send
--   "batch_id": "uuid"                       -- shared UUID for this batch
-- }

-- The worker:
-- 1. Generates a batch_id UUID if not provided
-- 2. For each document_id: creates a peppol_transmission with batch_id = this batch_id
-- 3. Processes them sequentially (or in small parallel groups of 5)
-- 4. Each transmission is independently idempotent via idempotency_key
-- 5. On partial failure: remaining transmissions retry — already-sent ones skip (idempotency_key prevents re-send)
```

**Batch status query — powers the bulk send progress UI:**

```sql
-- Show status of all transmissions in a bulk send batch
SELECT
  batch_id,
  COUNT(*)                                          AS total,
  COUNT(*) FILTER (WHERE status = 'delivered')      AS delivered,
  COUNT(*) FILTER (WHERE status = 'acknowledged')   AS acknowledged,
  COUNT(*) FILTER (WHERE status = 'rejected')       AS rejected,
  COUNT(*) FILTER (WHERE status IN ('queued','submitting','submitted')) AS pending,
  COUNT(*) FILTER (WHERE status = 'failed')         AS failed
FROM peppol_transmissions
WHERE batch_id = $1
GROUP BY batch_id;

-- UI shows:
-- "Bulk send: 48 delivered · 2 rejected · 0 pending"
-- [Retry Failed] button only shows if failed > 0
-- Clicking [Retry Failed] reuses same batch_id — makes the whole batch re-queryable
```

---

### 18.6 New Job Types Summary

All new job types introduced by the above mitigations — add to your worker's job type registry:

```typescript
const JOB_TYPES = {
  // Item 1 — Bookkeeper cancellation
  BOOKKEEPER_PLAN_CANCELLING: "billing.bookkeeper_plan_cancelling",
  // payload: { bookkeeper_user_id, period_end, affected_org_count }
  // Action: send 30-day warning to all affected org owners

  BOOKKEEPER_PLAN_CANCELLED: "billing.bookkeeper_plan_cancelled",
  // payload: { bookkeeper_user_id }
  // Action: call handle_bookkeeper_plan_cancellation()

  // Item 3 — ABN monitoring
  ABN_REVERIFY_ACTIVE_ORGS: "abn.reverify_active_orgs",
  // payload: {}  (runs across all active orgs)
  // Schedule: monthly (1st of month)
  // Action: re-verify all ABNs, call process_abn_status_change() on any changes

  // Item 5 — GST threshold
  // (handled by trigger on document_payments — no job needed)
  // But add a monthly sweep job for orgs with no recent payments:
  GST_THRESHOLD_MONTHLY_SWEEP: "compliance.gst_threshold_sweep",
  // payload: {}
  // Action: recalculate estimated_annual_revenue for all orgs from last 12 months of payments

  // Item 14 — Bulk send
  PEPPOL_BULK_SEND_BATCH: "peppol.bulk_send_batch",
  // payload: { org_id, document_ids[], batch_id }
  // Action: create peppol_transmissions for each doc, process in order
} as const;
```

---

_Schema version: 2.2.0 · Supabase PostgreSQL 15 · May 2026_
_Launch strategy: Unified Account Model (Phase 1–3) → Bookkeeper Split Mode (Phase 4, additive migration)_
_Billing model: Flat rate now · Volume tiers when data justifies · Same columns drive both — zero migration_
_Platform coverage: Web · iOS (React Native) · Android (React Native)_
_Edge case mitigations: Section 18 — Items 1, 2, 3, 5, 14_
