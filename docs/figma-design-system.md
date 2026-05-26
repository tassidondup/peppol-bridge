# Korlo — Figma Design System Rules

> For use with the Figma MCP. Read this before generating or implementing any design.

---

## Stack at a Glance

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 |
| Component base | shadcn/ui v4 |
| Variant API | class-variance-authority (CVA) |
| Class merging | clsx + tailwind-merge via `cn()` |
| Icons | lucide-react |
| Primitives | radix-ui |
| Fonts | Plus Jakarta Sans (headings) · DM Sans (body) · Geist Mono (monospace) |
| Theme | Light + dark via next-themes · CSS custom properties |

---

## 1. Design Tokens

### Brand palette — use these exact values

```
Navy     #0F1F3D   → --navy         Primary text, dark backgrounds, buttons
Teal     #00C2A8   → --teal         Brand accent, CTAs, badges, active states
Teal Mid #00A894   → --teal-mid     Teal hover state
Teal Bg  #E6FAF7   → --teal-light   Teal tinted backgrounds, success states
Brand BG #F8F9FB   → --brand-bg     Page background (light mode)
Text     #1A1A2E   → --brand-text   Primary body text
Muted    #6B7280   → --brand-muted  Secondary text, captions, labels
Border   #E5E7EB   → --brand-border Dividers, input borders, card borders
```

### Tailwind v4 token usage

Tokens are exposed as Tailwind utilities via `@theme inline` in `globals.css`:

```css
/* Use as Tailwind classes: */
bg-navy          → #0F1F3D
text-teal        → #00C2A8
bg-teal-light    → #E6FAF7
bg-brand-bg      → #F8F9FB
```

**When Figma maps don't align with a token, use the hex directly** — Tailwind v4 supports arbitrary values without `[]` escaping in some cases, but prefer `bg-[#0F1F3D]` for one-off values.

### Radius scale

```
--radius: 0.625rem (10px base)
--radius-sm:  ~6px    rounded-sm
--radius-md:  ~8px    rounded-md
--radius-lg:  10px    rounded-lg     ← default for inputs, buttons
--radius-xl:  ~14px   rounded-xl     ← cards
--radius-2xl: ~18px   rounded-2xl    ← sections
--radius-3xl: ~22px   rounded-3xl    ← hero containers
--radius-4xl: ~26px   rounded-4xl    ← large feature blocks
```

### shadcn semantic tokens (light / dark)

```
--background      #F8F9FB / oklch(0.145)
--foreground      oklch(0.145) / oklch(0.985)
--primary         oklch(0.205) / oklch(0.922)
--muted           oklch(0.97) / oklch(0.269)
--muted-foreground oklch(0.556) / oklch(0.708)
--border          oklch(0.922) / oklch(1 0 0 / 10%)
--destructive     oklch(0.577 0.245 27.325)
--ring            oklch(0.708) / oklch(0.556)
```

---

## 2. Typography

### Font families

| Role | Font | CSS variable | Tailwind class |
|------|------|-------------|----------------|
| Headings / display | Plus Jakarta Sans | `--font-plus-jakarta` | `font-[family-name:var(--font-plus-jakarta)]` |
| Body / UI | DM Sans | `--font-dm-sans` | `font-sans` (default) |
| Monospace / ABNs | Geist Mono | `--font-geist-mono` | `font-mono` |

### Heading sizes (fluid, clamp-based)

```
Hero H1:   clamp(34px, 4.5vw, 52px)  font-extrabold tracking-[-1.5px]
Section H2: clamp(26px, 4vw, 38px)    font-bold     tracking-[-0.8px]
CTA H2:    clamp(30px, 4vw, 48px)    font-extrabold tracking-[-1px]
Card H3:   17px                       font-bold
```

### Font weights in use

- Plus Jakarta Sans: 600 (semibold), 700 (bold), 800 (extrabold)
- DM Sans: regular (loaded via next/font, all weights)

### Overline / label style

```
text-xs font-semibold uppercase tracking-[1.2px] text-[#00C2A8]
```
Used above section headings as a category label.

---

## 3. Component Architecture

### Rules for all components

- **Never modify** `/components/ui/` directly. These are shadcn primitives.
- Always import from `@/components/ui/[component]`
- Always use `cn()` from `@/lib/utils` for conditional or merged classes
- No class components. Functional + hooks only.
- No `React.FC`. Type props explicitly with named interfaces.

### Directory structure

```
components/
├── ui/           ← shadcn primitives (Button, Input, Badge, etc.) — DO NOT EDIT
├── layout/       ← Nav, Footer — shared across all pages
├── landing/      ← Hero, TrustBar, AbnLookupSection, HowItWorks, WaitlistForm, etc.
├── lookup/       ← LookupForm, LookupResult, Cta — ABN checker feature
└── bulk/         ← BulkChecker — CSV bulk lookup feature
```

### Available shadcn components

`Button` · `Input` · `Badge` · `Separator` · `ThemeToggle` · `ThemeProvider`

### Button variants

```tsx
<Button>                    // default: dark fill
<Button variant="outline">  // bordered, transparent bg
<Button variant="secondary">
<Button variant="ghost">
<Button variant="destructive">
<Button variant="link">

// Sizes:
<Button size="default">  // h-8
<Button size="sm">       // h-7
<Button size="lg">       // h-9  ← most CTAs use this
<Button size="icon">     // square

// Render as link:
<Button asChild><Link href="/...">...</Link></Button>
```

### cn() usage

```tsx
import { cn } from "@/lib/utils"

// Merge conditional classes — always use cn(), never string concatenation
className={cn(
  "base-class",
  isActive && "active-class",
  variant === "dark" && "dark-specific"
)}
```

---

## 4. Styling Approach

### Tailwind v4 — critical differences from v3

```css
/* globals.css — NOT tailwind.config.js */
@import "tailwindcss";        /* replaces @tailwind base/components/utilities */
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@theme inline { ... }        /* theme extensions live here */
```

- **No `tailwind.config.js`** — all config is in `globals.css` via `@theme`
- Dark mode uses `.dark` class via `@custom-variant dark (&:is(.dark *))`
- Arbitrary values: `bg-[#0F1F3D]`, `text-[17px]`, `tracking-[-1.5px]`

### Dark mode pattern

```tsx
// Always pair light and dark in same className
className="bg-white dark:bg-white/5"
className="text-[#0F1F3D] dark:text-white"
className="border-[#E5E7EB] dark:border-white/10"
className="text-[#6B7280] dark:text-[#9CA3AF]"
```

### Responsive breakpoints

Tailwind defaults: `sm` (640px) · `md` (768px) · `lg` (1024px) · `xl` (1280px)

Common patterns in this codebase:
```tsx
className="flex-col sm:flex-row"          // stack → row at sm
className="hidden md:block"               // hide below md
className="grid md:grid-cols-2"           // single → 2-col at md
className="grid md:grid-cols-3"           // single → 3-col at md
```

### Max-width containers

```
max-w-[1100px]   Main content width (landing sections)
max-w-[860px]    Narrower content (bulk page)
max-w-[780px]    Centered section headers
max-w-[580px]    Body copy max-width
max-w-[480px]    Form / CTA max-width
max-w-xl         Lookup page (640px)
```

---

## 5. Page Layout Pattern

```tsx
// Standard page shell
<div className="flex min-h-screen flex-col bg-[#F8F9FB] dark:bg-[#0C1120]">
  <Nav />
  <main className="flex-1">
    {/* sections */}
  </main>
  <Footer />
</div>

// Standard section
<section className="mx-auto max-w-[1100px] px-6 py-[88px]">
  ...
</section>

// Dark section (navy bg)
<section className="bg-[#0F1F3D] px-6 py-20">
  <div className="mx-auto max-w-[780px] text-center">
    ...
  </div>
</section>
```

---

## 6. Card Pattern

```tsx
// Standard card
<div className="rounded-2xl border border-[#E5E7EB] bg-white p-7
                dark:border-white/10 dark:bg-[#111827]">

// Card with teal top-border on hover
<div className="group relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-7
                before:absolute before:left-0 before:right-0 before:top-0
                before:h-[3px] before:bg-[#00C2A8] before:opacity-0
                before:transition-opacity hover:before:opacity-100
                dark:border-white/10 dark:bg-[#111827]">

// Frosted card on dark background
<div className="rounded-[20px] border-[1.5px] border-white/10 bg-white/5 p-8">

// Status badge — success
<span className="inline-flex items-center rounded-md bg-[#E6FAF7] px-2.5 py-1
                 text-[11px] font-semibold text-[#007A6B]">

// Status badge — muted
<span className="inline-flex items-center rounded-md bg-[#F3F4F6] px-2 py-0.5
                 text-xs font-medium text-[#6B7280]">
```

---

## 7. Form / Input Pattern

```tsx
// Standard input (on light bg)
<input className="h-11 w-full rounded-lg border-[1.5px] border-[#E5E7EB] bg-white
                  px-4 text-sm text-[#1A1A2E] outline-none
                  placeholder:text-[#9CA3AF]
                  focus:border-[#00C2A8] focus:shadow-[0_0_0_3px_rgba(0,194,168,0.12)]
                  disabled:opacity-50
                  dark:border-white/10 dark:bg-white/5 dark:text-white
                  dark:placeholder:text-white/30" />

// shadcn Input (inherits border-input, bg-transparent etc.)
<Input className="font-mono text-base h-11 text-white" />

// Primary CTA button (custom, not shadcn — used in WaitlistForm)
<button className="h-11 shrink-0 rounded-lg bg-[#00C2A8] px-5
                   text-sm font-semibold text-white
                   hover:bg-[#00A894] disabled:opacity-50">
```

---

## 8. Icon System

- **Library:** `lucide-react` v1.16
- **No custom icon files** — inline SVG used for brand-specific marks (logo, invoice card)
- Import pattern: `import { SomeIcon } from "lucide-react"`
- Default size from Button: `[&_svg:not([class*='size-'])]:size-4`
- Override: `<Icon className="size-5" />`

### Inline SVG usage (brand marks only)

```tsx
// Logo mark — always inline, never an img tag
<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
  <rect x="2" y="7" width="3" height="8" rx="1.5" fill="white" />
  ...
</svg>
```

---

## 9. Asset Management

- **Public directory:** `/public/` — static assets served at `/`
- **No CDN configured** — assets served from Vercel edge
- **No image optimisation component used yet** — use `next/image` for any new images
- **Fonts:** Google Fonts via `next/font/google` — no self-hosted font files

---

## 10. Figma → Code Mapping

When implementing a Figma design, map as follows:

| Figma | Code |
|-------|------|
| Frame background `#F8F9FB` | `bg-[#F8F9FB] dark:bg-[#0C1120]` |
| Frame background `#0F1F3D` | `bg-[#0F1F3D]` (no dark variant — already dark) |
| Text `#0F1F3D` | `text-[#0F1F3D] dark:text-white` |
| Text `#6B7280` | `text-[#6B7280]` |
| Text `#00C2A8` | `text-[#00C2A8]` |
| Stroke `#E5E7EB` | `border border-[#E5E7EB] dark:border-white/10` |
| Fill `#00C2A8` button | `bg-[#00C2A8] hover:bg-[#00A894] text-white` |
| Fill `#0F1F3D` button | `bg-[#0F1F3D] hover:bg-[#162d52] text-white` |
| Border radius 8px | `rounded-lg` |
| Border radius 12px | `rounded-xl` |
| Border radius 16–20px | `rounded-2xl` |
| Heading font | `font-[family-name:var(--font-plus-jakarta)]` |
| Body font | `font-sans` (DM Sans — default) |
| Mono font | `font-mono` (Geist Mono) |
| Section padding | `px-6 py-[88px]` or `px-6 py-20` |
| Card padding | `p-7` or `p-8` |

---

## 11. What NOT to do

- Do not add `tailwind.config.js` — v4 uses `globals.css` only
- Do not edit `/components/ui/` files — import them as-is
- Do not use `React.FC`
- Do not use `any` — use `unknown` and narrow
- Do not hardcode colours outside the palette above without flagging it
- Do not add inline `style={{}}` for things achievable with Tailwind
- Do not create new font imports — use the 4 already loaded in `layout.tsx`
- Do not use `enum` — use string literal unions
