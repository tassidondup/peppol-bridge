# Memory

## Phase 0 — ABN Peppol Lookup

- ABR API returns JSONP — response is `callback({...})`, wrapper must be stripped before `JSON.parse()`
- ABR API returns `Gst: null` (not `""`) for non-GST-registered businesses — type must be `string | null`, not `string`
- `directory.peppol.eu/search/1.0/json?participant=iso6523-actorid-upis%3A%3A0151%3A{abn}` is the correct Peppol registration check endpoint — registered = `total-result-count > 0`. `peppol.helger.com` returns HTTP 400 (May 2026) and must not be used (D-038)
- Peppol Directory "not found" copy must say "not confirmed on Peppol" — never "not registered". A business can be on Peppol without appearing in the Directory.
- Next.js 15+ `searchParams` in Server Components is `Promise<{...}>` — must be awaited before accessing properties

## Phase 0 — Landing Page

- **next-themes hydration:** Always add `suppressHydrationWarning` to the `<html>` element. Always use `resolvedTheme` (not `theme`) in toggle logic — `theme` returns `"system"` when the user hasn't manually picked, breaking the toggle intermittently.
- **Inline style hydration warning:** `style={{ background: value }}` causes React hydration mismatches — browsers expand the CSS `background` shorthand into ~8 longhand properties on the client. Use Tailwind classes (e.g. `bg-[#EEF2FF]`) instead.
- **Font stack (confirmed):** Plus Jakarta Sans (headings, weights 600/700/800) + DM Sans (body). Space Grotesk was tried and rejected. Inter was replaced by DM Sans.
- **Tailwind v4 circular font variable:** In `@theme inline {}`, never write `--font-sans: var(--font-sans)` — circular self-reference, falls back to Times New Roman. Point to the Next.js-injected variable: `--font-sans: var(--font-dm-sans)`.
- **TrustBar copy:** Never claim "Registered Peppol Access Point" — Peppol Bridge uses Storecove as its AP (D-003). Correct phrasing: "Certified Access Point via Storecove".
