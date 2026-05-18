# Session Log — Phase 0: Landing Page

**Date:** 2026-05-18
**Status at end of session:** ~90% complete — mobile device test + final polish pass remaining

---

## What Was Built

Full landing page at `/` with the following sections: Nav, Hero (two-column with invoice card visual), TrustBar, AbnLookupSection (ABN lookup embedded, not linked), MandateContext, HowItWorks, Integrations, FaqSection, bottom WaitlistForm CTA, Footer.

`/waitlist` page built and branded. `/api/waitlist` route built with Zod validation and dual Resend emails (notification to owner + confirmation to submitter).

Dark/light mode toggle added to Nav via `next-themes` with `ThemeProvider` wrapping the layout.

---

## Design

Departed from the original zinc/Geist spec. Used a Figma Make reference design instead:
- Navy (`#0F1F3D`) + Teal (`#00C2A8`) brand palette
- Plus Jakarta Sans (headings) + DM Sans (body) — Space Grotesk was tried and rejected
- Full dark mode throughout

---

## Issues Found and Fixed

| Issue | Fix |
| ----- | --- |
| `peppol.helger.com` returning HTTP 400 | Switched to `directory.peppol.eu/search/1.0/json` (D-038) |
| Circular CSS font variable (`--font-sans: var(--font-sans)`) → Times New Roman fallback | Fixed to `var(--font-dm-sans)` |
| Theme toggle only working intermittently | Added `suppressHydrationWarning` to `<html>`; switched from `theme` to `resolvedTheme` |
| `MandateContext` inline `style={{ background }}` causing hydration warnings | Moved to Tailwind `bg-[#...]` classes |
| TrustBar: "Registered Peppol Access Point" (false — we use Storecove) | Changed to "Certified Access Point via Storecove" |
| Nav logo, Hero h1, HowItWorks h2 invisible in dark mode | Added `dark:text-white` to all |
| WaitlistForm input solid white in dark mode | Added `dark:bg-white/5 dark:border-white/10 dark:text-white` |
| Footer link hover goes darker in dark mode | Added `dark:hover:text-white` |
| Footer copyright: © 2025 | Fixed to © 2026 |
| Hero works-with pills no dark variant | Added `dark:border-white/10 dark:bg-white/5 dark:text-white` |
| ATO-aligned badge overlapping Total due on invoice card | Repositioned to `bottom-center` with `-translate-x-1/2` |
| Integrations cards unequal width (QuickBooks wider) | Switched from `flex flex-wrap` to `grid grid-cols-2 sm:grid-cols-4` |
| FAQ items no spacing | `gap-0.5` → `gap-3` |

---

## Other Work Done This Session

- **PRODUCT.md created** — register: brand, personality: "Approachable, simple, Australian", reference: Xero, anti-references confirmed
- **CLAUDE.md slimmed** — 361 → 218 lines (40% reduction). Removed derivable/duplicate content. Added D-037 and D-038.
- **`/impeccable polish`** run against the full landing page — 10 fixes applied
- **`impeccable teach`** run — PRODUCT.md written from scratch

---

## Remaining (~10%)

1. Mobile device test — real phone, not DevTools
2. Final UI polish pass from mobile review findings
3. Mark Phase 0 complete in `peppol-bridge-spec.md`
