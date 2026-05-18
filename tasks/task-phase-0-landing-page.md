# Task — Phase 0: Landing Page + Email Capture

**Phase:** 0
**Depends on:** task-phase-0-abn-peppol-lookup.md (complete)
**Status:** ~90% complete — final UI polish remaining
**Schema version:** 2.2.0

---

## What Was Built

### Pages

| Route | Status | Notes |
| ----- | ------ | ----- |
| `/` | ✅ Built | Full landing page — see sections below |
| `/waitlist` | ✅ Built | Branded, dark mode, dynamic headline via `?reason=` |
| `/api/waitlist` | ✅ Built | Zod validation, Resend dual-email (notification + confirmation) |

### Landing Page Sections (in order)

| Section | Status | Notes |
| ------- | ------ | ----- |
| `Nav` | ✅ | Logo, FAQ anchor, ThemeToggle, "Join waitlist" CTA |
| `Hero` | ✅ | Two-column: copy + waitlist form left, invoice card visual right |
| `TrustBar` | ✅ | 4 trust signals; "Certified Access Point via Storecove" |
| `AbnLookupSection` | ✅ | ABN lookup embedded on `/` (not just linked to `/lookup`) |
| `MandateContext` | ✅ | "Why now" — ATO rollout stages with status icons |
| `HowItWorks` | ✅ | 3-step cards with hover teal top-border animation |
| `Integrations` | ✅ | Xero / MYOB / QuickBooks / REST API — equal-width grid |
| `FaqSection` | ✅ | Accordion, 6 FAQs |
| `WaitlistForm` (bottom CTA) | ✅ | Second waitlist capture at bottom of page |
| `Footer` | ✅ | Logo, copyright, Privacy / Terms / Contact links |

### Components

```
components/
  landing/
    Hero.tsx
    TrustBar.tsx
    AbnLookupSection.tsx
    MandateContext.tsx
    HowItWorks.tsx
    Integrations.tsx
    FaqSection.tsx
    WaitlistForm.tsx
  layout/
    Nav.tsx
    Footer.tsx
  ui/
    theme-provider.tsx    ← next-themes wrapper
    theme-toggle.tsx      ← Sun/Moon toggle, uses resolvedTheme
```

### Design Divergence from Original Spec

The original spec described a zinc/Geist typographic design. The actual build used a Figma Make reference instead:

- **Colour:** Navy (`#0F1F3D`) + Teal (`#00C2A8`) brand palette, light bg `#F8F9FB`
- **Fonts:** Plus Jakarta Sans (headings) + DM Sans (body) — not Geist
- **Dark mode:** Full dark variant throughout (`dark:bg-[#0C1120]`)
- **ABN lookup:** Embedded in a dark navy section on `/` — not just a link to `/lookup`
- **Sections:** More than spec — added TrustBar, MandateContext, Integrations, FAQ

These divergences are intentional and approved.

---

## Environment Variables

```bash
ABR_GUID=...              # ABR API — in .env.local ✅
RESEND_API_KEY=...        # Resend — in .env.local ✅
WAITLIST_TO_EMAIL=...     # Notification inbox — in .env.local ✅
PEPPOL_DIRECTORY_BASE_URL=https://directory.peppol.eu  # optional override
```

---

## Acceptance Criteria

- [x] `pnpm tsc --noEmit` passes with zero errors
- [x] Landing page (`/`) renders — no Next.js default content
- [x] Inline waitlist form submits and shows confirmation state
- [x] `/waitlist` page renders for direct visits
- [x] `/waitlist?reason=send` and `?reason=notify` show correct headline variant
- [x] Successful submission shows confirmation, hides form
- [x] Invalid email shows inline error without clearing input
- [x] `RESEND_API_KEY` missing → 502, not unhandled exception
- [x] No hardcoded emails, API keys, or secrets
- [x] No `console.log` in production paths
- [x] No Supabase imports anywhere (D-037)
- [x] Dark mode works throughout
- [x] Theme toggle works reliably (suppressHydrationWarning + resolvedTheme)
- [ ] Mobile layout — final check on real device
- [ ] Final UI polish pass (impeccable polish remaining)

---

## Remaining Work (~10%)

1. **Mobile device test** — check on an actual phone, not just DevTools
2. **Final polish pass** — any spacing/typography issues surfaced during real-device review
3. **Session log** — write to `quality_reports/session_logs/2026-05-18-phase-0-landing-page.md`

---

## Key Decisions Made During This Task

| Decision | What was decided |
| -------- | ---------------- |
| D-037 | No Supabase in Phase 0 — Resend only |
| D-038 | Peppol Directory API: `directory.peppol.eu` (not `peppol.helger.com` which returned 400) |
| — | ABN lookup embedded on `/` via `basePath` prop on `LookupForm` — no separate `/lookup` link in nav |
| — | Font stack: Plus Jakarta Sans (headings) + DM Sans (body) |

---

## After This Task Is Done

- [ ] Write session log to `quality_reports/session_logs/2026-05-18-phase-0-landing-page.md`
- [ ] Mark Phase 0 complete in `peppol-bridge-spec.md`
- [ ] Begin Phase 1 task file

---

_Task version: 1.1 · Phase 0 · May 2026_
_References: peppol-bridge-spec.md §4.4.1, §12 · DESIGN.md · decision-log.md D-037, D-038_
