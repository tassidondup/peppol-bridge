# KORLO — AU e-Invoicing for Australian SMBs

### Product Specification · 2026

**Market:** Australia (primary) · New Zealand (secondary)
**Stack:** Next.js · Supabase · Xero/MYOB/QuickBooks OAuth · Storecove/MessageXchange · Claude API
**Regulatory driver:** ATO Peppol mandate — July 2026 (live)
**Accounting platforms:** Xero · MYOB · QuickBooks Online · Reckon · Zoho Books · FreshBooks · Rounded · PDF fallback (all others)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [The Problem](#2-the-problem)
3. [How Peppol Works (Technical)](#3-how-peppol-works-technical)
4. [Core Features](#4-core-features)
   - 4.1 [PDF → Peppol Converter](#41-pdf--peppol-converter)
   - 4.2 [Xero Integration](#42-xero-integration)
   - 4.3 [MYOB Integration](#43-myob-integration)
   - 4.4 [Free Validator Tool](#44-free-validator-tool--lead-magnet)
   - 4.5 [Incoming Invoice Receiver](#45-incoming-invoice-receiver)
   - 4.6 [Peppol Directory Registration](#46-peppol-directory-registration)
5. [Accounting Platform Landscape](#5-accounting-platform-landscape)
   - 5.1 [Market Share](#51-market-share)
   - 5.2 [Integration Roadmap by Phase](#52-integration-roadmap-by-phase)
   - 5.3 [Platform-by-Platform Analysis](#53-platform-by-platform-analysis)
   - 5.4 [The PDF Fallback Strategy](#54-the-pdf-fallback-strategy)
6. [ATO eInvoicing Ready Certification](#6-ato-einvoicing-ready-certification)
   - 6.1 [Two Separate Registrations — Don't Confuse Them](#61-two-separate-registrations--dont-confuse-them)
   - 6.2 [Ready vs Ready+](#62-ready-vs-ready)
   - 6.3 [What the Assessment Requires](#63-what-the-assessment-requires)
   - 6.4 [When to Apply](#64-when-to-apply)
   - 6.5 [NZ Listing is Free and Simultaneous](#65-nz-listing-is-free-and-simultaneous)
7. [SMB Support Reduction Strategy](#7-smb-support-reduction-strategy)
   - 7.1 [Where Support Tickets Actually Come From](#71-where-support-tickets-actually-come-from)
   - 7.2 [The Three Must-Build Features That Kill Support](#72-the-three-must-build-features-that-kill-support)
   - 7.3 [Rejection Code Translation Table](#73-rejection-code-translation-table)
   - 7.4 [Support Volume Reality Check](#74-support-volume-reality-check)
8. [Architecture & Tech Stack](#8-architecture--tech-stack)
9. [The AI Layer — PDF Parsing](#9-the-ai-layer--pdf-parsing)
10. [Cost Model & Margins](#10-cost-model--margins)
11. [Pricing & Monetisation](#11-pricing--monetisation)
12. [Build Roadmap](#12-build-roadmap)
13. [What You Learn Building This](#13-what-you-learn-building-this)
14. [Market & Competition](#14-market--competition)
15. [Distribution Strategy](#15-distribution-strategy)
16. [Risks & Kill Conditions](#16-risks--kill-conditions)
17. [Quick Reference](#17-quick-reference)
18. [User Roles & Multi-Tenancy Model](#18-user-roles--multi-tenancy-model)
    - 18.1 [What is a Bookkeeper (AU Context)](#181-what-is-a-bookkeeper-au-context)
    - 18.2 [Unified Account Model — Launch Strategy](#182-unified-account-model--launch-strategy)
    - 18.3 [Bookkeeper Split Mode — Phase 4](#183-bookkeeper-split-mode--phase-4)
    - 18.4 [Role Permissions](#184-role-permissions)
    - 18.5 [The Founder Concept](#185-the-founder-concept)
19. [SMB + Bookkeeper Operational Scenarios](#19-smb--bookkeeper-operational-scenarios)
    - 19.1 [Flow A — SMB Invites Bookkeeper](#191-flow-a--smb-invites-bookkeeper)
    - 19.2 [Flow B — Bookkeeper Creates Org, Invites SMB](#192-flow-b--bookkeeper-creates-org-invites-smb)
    - 19.3 [ABN Conflict — Org Claim Flow](#193-abn-conflict--org-claim-flow)
20. [Billing Model Decisions](#20-billing-model-decisions)
    - 20.1 [Hybrid Billing — Who Pays](#201-hybrid-billing--who-pays)
    - 20.2 [Bookkeeper Plan — Flat Rate Confirmed](#202-bookkeeper-plan--flat-rate-confirmed)
    - 20.3 [Volume Tier Roadmap](#203-volume-tier-roadmap)
21. [Mobile App — React Native](#21-mobile-app--react-native)
    - 21.1 [Platform Decision](#211-platform-decision)
    - 21.2 [Core Mobile Features](#212-core-mobile-features)
    - 21.3 [Offline Support Strategy](#213-offline-support-strategy)
22. [Credit Note Flow](#22-credit-note-flow)
23. [Operational UX Patterns](#23-operational-ux-patterns)
    - 23.1 [Wrong Org Context Guard](#231-wrong-org-context-guard)
    - 23.2 [Founder Leaves Organisation Guard](#232-founder-leaves-their-own-organisation-guard)
24. [Improvements Backlog](#24-improvements-backlog)
    - 24.1 [Network Health Status Page](#241-network-health-status-page)
    - 24.2 [Send Test Invoice to Yourself](#242-send-test-invoice-to-yourself-onboarding-feature)
    - 24.3 [Xero/MYOB Daily Reconciliation Job](#243-xeromyob-daily-reconciliation-job)
25. [Research & Reference Materials](#25-research--reference-materials)

---

## 1. Product Overview

**KORLO** is a thin, clean SaaS layer that lets Australian SMBs send and receive Peppol-compliant e-invoices — from their existing Xero or MYOB account — without ever touching XML, without becoming a Peppol expert, and without paying enterprise Access Point pricing.

### The one-sentence pitch

> _"Send a Peppol invoice from any accounting software in 90 seconds. We handle the XML, the network, and the compliance."_

### What it is not

- Not an accounting platform (Xero/MYOB stay as the source of truth)
- Not a full Access Point (you partner with one)
- Not a tax agent or lodgement service (users submit their own BAS/TPAR)
- Not a document management system

### The USB-C analogy

Peppol is the government mandating everyone use USB-C. Most businesses still have a drawer full of Micro-USB cables (PDF invoices via email). KORLO is the adapter in the box — plug your existing setup in, it works.

---

## 2. The Problem

### The regulatory situation

From **1 July 2026**, all Non-Corporate Commonwealth Entities (NCEs) must:

- Process at least 30% of invoices received via Peppol
- Send invoices via Peppol by December 2026

This means any Australian business supplying a federal government agency is under real pressure to send Peppol-compliant invoices. Private sector B2B is voluntary — but large corporates are beginning to mirror government requirements on their own supply chains.

The ATO estimates **A$22.5 billion in annual economic benefit** at full Peppol adoption. Treasury put A$23.3M into active promotion. The mandate is real, the pain is real, the deadline has passed.

### Why SMBs are stuck

**They don't know what Peppol is.**
"I send invoices from Xero, what do you mean it's not compliant?"

**Xero and MYOB technically support it — but it's buried.**
Activating Peppol in Xero requires: finding the setting, understanding PINT A-NZ format, choosing an Access Point, registering your ABN on the Peppol Directory, configuring your endpoint. Most SMB owners have never heard of an Access Point.

**Existing Access Points are enterprise-priced and enterprise-complicated.**
Avalara, Comarch, MessageXchange, Exedee all target mid-market and up. Their onboarding assumes an IT department. Their pricing starts at AUD $200–$800/month.

**The SMB gap is wide open.**
~300,000+ AU businesses in the Peppol-affected space. Nobody is serving the under-$2M revenue segment with a clean, affordable, self-serve product.

### The invoice rejection moment

The product's primary acquisition trigger is not "prepare for the mandate" — that window has partially passed. The primary trigger is now:

> _"My government client just rejected my invoice. They said it needs to be sent via Peppol. What does that even mean?"_

This is a high-intent, high-urgency customer who will pay immediately for a solution that just works.

---

## 3. How Peppol Works (Technical)

Understanding this properly shapes every architecture decision.

### The four-corner model

```
[Sender / Your Customer]                    [Receiver / Their Customer]
         |                                            |
[Sender's Access Point] ←── Peppol Network ──→ [Receiver's Access Point]
```

- **Corner 1:** Sender (the SMB using your product)
- **Corner 2:** Sender's Access Point (Storecove, MessageXchange, etc. — what you partner with)
- **Corner 3:** Receiver's Access Point (whoever their customer uses)
- **Corner 4:** Receiver (the government department or corporate)

You sit between Corner 1 and Corner 2. You never touch Corner 3 or Corner 4 directly.

### The document standard

**PINT A-NZ** (Peppol International BIS 3.0, Australia-New Zealand profile) is the only accepted format from 15 May 2025. It is a specific profile of **UBL 2.1 XML** — Universal Business Language.

A Peppol invoice is essentially a very strict XML file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:peppol:pint:billing-1@aunz-1</cbc:CustomizationID>
  <cbc:ProfileID>urn:peppol:bis:billing</cbc:ProfileID>
  <cbc:ID>INV-2026-0042</cbc:ID>
  <cbc:IssueDate>2026-07-15</cbc:IssueDate>
  <!-- ... supplier, customer, line items, tax totals ... -->
</Invoice>
```

Your job: take a Xero invoice (JSON from their API) → transform it into valid PINT A-NZ XML → send to your Access Point's API → they deliver it across the network.

### The Peppol Directory

Before a business can send or receive Peppol invoices, their ABN must be registered on the **Peppol Directory** (also called Service Metadata Publisher / SMP). This maps their ABN to their Access Point endpoint.

Registration is done through their chosen Access Point. Your product handles this for them as part of onboarding.

### Validation layers

A valid Peppol invoice must pass three layers:

1. **Schema validation** — XML is well-formed and matches the UBL 2.1 XSD schema
2. **Schematron validation** — business rules (e.g. if GST is present, the tax amount must equal the taxable amount × rate)
3. **PINT A-NZ rules** — AU-specific requirements (ABN format, GST treatment, mandatory fields)

Your validator tool runs all three layers. Most competitors' validators only run layer 1.

---

## 4. Core Features

### 4.1 PDF → Peppol Converter

**The entry point for businesses not on Xero/MYOB, or for invoices from other systems.**

Flow:

1. User uploads a PDF invoice
2. Claude API extracts structured data (invoice number, date, ABN, line items, GST amounts, totals)
3. **Correction step** — show extracted data in editable form. User verifies. Critical: never auto-send without review.
4. System generates PINT A-NZ compliant XML
5. XML validated against schema + schematron + PINT rules
6. User reviews validation result
7. Sent via Access Point API to Peppol network
8. Status tracked: pending → delivered → acknowledged / rejected

**Why the correction step is non-negotiable:**
If the AI misreads a GST amount or ABN, and you send without review, the invoice is either rejected by the network (minor problem) or accepted with wrong data (tax compliance problem for the user). Always require human confirmation before send.

---

### 4.2 Xero Integration

**The primary integration. Xero has ~1M+ AU users.**

Flow:

1. User connects Xero account via OAuth 2.0
2. Dashboard shows all approved/awaiting-payment invoices
3. User selects invoice(s) to send via Peppol
4. System pulls full invoice data from Xero API
5. Transforms Xero JSON → PINT A-NZ XML (no PDF step needed — data is already structured)
6. Validates XML
7. Sends via Access Point
8. Updates invoice status in dashboard
9. Optional: write delivery status back to Xero custom field

**Key Xero-specific considerations:**

- Xero's API has a new **usage-based pricing model** (2026) — budget for this in your cost model
- OAuth tokens expire — implement silent refresh and handle the `invalid_grant` error gracefully
- Xero contacts must have ABNs populated — add an "ABN missing" warning state in the UI
- Handle credit notes, partial payments, and foreign currency invoices — these are edge cases that take disproportionate development time

---

### 4.3 MYOB Integration

**Secondary integration. MYOB AccountRight has strong AU SMB penetration, especially in trades and construction.**

Same flow as Xero, different API surface:

- MYOB AccountRight API (cloud) vs AccountRight desktop — cloud only for v1
- Different OAuth 2.0 implementation — less polished developer docs than Xero
- Different data model for tax codes — requires different mapping logic
- No App Marketplace review process as strict as Xero — easier to list initially

> ⚠️ Budget an extra week for MYOB compared to estimates. Their API documentation has gaps and their developer support response time is slower.

---

### 4.4 Free Validator Tools — Lead Magnet

There are two distinct validator tools here. They are often confused because both involve "validating" something Peppol-related. They serve completely different users.

---

#### 4.4.1 ABN Peppol Lookup Tool — Phase 0 Public Lead Magnet

**The single most important acquisition feature. Ship this first, before anything else. Build time: ~2 hours.**

This is what you build for Mick. No XML. No technical knowledge. One input, one answer.

**What it does:**

```
Enter an ABN:  [ 51 824 753 556 ]  [Check →]

✅ Department of Finance is registered on the Peppol network
   Endpoint: 0151:51824753556
   They can receive eInvoices right now.

   → Ready to send them an invoice? [Get started free]
```

Under the hood it's two API calls:

1. ABR API — validate the ABN is real and active
2. Peppol Directory (SMP lookup) — check if that ABN has a registered endpoint

**Why it works as a lead magnet:**

- Mick just won a government contract. His PM said "we only accept Peppol now." He Googles "is Department of Finance on Peppol" and lands here. 10 seconds, problem solved.
- High-intent users — they're already trying to comply
- SEO goldmine: "Is [department name] on Peppol?" gets searched thousands of times monthly as the mandate rolls out
- Ecosio is a European company — they're not targeting "is Department of Defence on Peppol" searches. You can own this SEO niche.
- Email capture: "Save this result" or "Get notified when they go live"
- Conversion hook: if endpoint found → "Send them an invoice now" CTA → signup flow
- Free forever — always-on top-of-funnel

**What it is NOT:** A PINT A-NZ XML validator. It never touches XML. Mick has never seen a UBL file and never will.

**Build this in Week 1. Everything else follows.**

---

#### 4.4.2 PINT A-NZ XML Validator — Internal Development Tool + Optional DSP Feature

This is what _you_ use while building the XML generator in Phase 1. It can also be surfaced as a free tool for other developers (DSPs) building Peppol integrations — a secondary SEO/acquisition channel in the developer community.

**What it does:**

- Takes a raw UBL XML invoice file as input
- Runs all three validation layers:
  1. **XSD schema validation** — is the XML well-formed and structurally correct?
  2. **Schematron validation** — do the business rules pass?
  3. **PINT A-NZ rules** — do the AU-specific requirements pass?
- Returns: pass / fail + specific error list with rule IDs and plain-English explanations

**Who uses this:**

- **You** — during Phase 1 build, to test every XML your generator produces
- **Other DSPs** — developers building competing tools or custom integrations who need to validate their XML. Small but technically sophisticated audience.
- **NOT Mick** — SMB owners have no idea what XML is

**When to build it publicly:** Phase 1, after the ABN lookup tool is live. It's a 4–6 hour build on top of the validation engine you're already writing for your own product.

---

#### 4.4.3 Development Validation Tools — What You Use, Not What You Build

During Phase 1 and Phase 2, you need to validate your generated XML before it touches Storecove. Two external tools handle this. Neither replaces your own validator — they're your testing environment.

**Tool 1 — Peppol Practical (peppol.helger.com)**

_What it is:_ A free web service built and maintained by Philip Helger, an OpenPeppol technical contributor. Supports PINT A-NZ 1.1.2 (the current version). Widely used by Peppol developers globally.

_Why use it:_ The most reliable independent validator for PINT A-NZ rules. Gives you the exact schematron rule ID that failed (e.g. `PINT-R001`) so you can look it up in the compliance spec. Faster than deploying your own validator during early development.

_How to use it:_

```bash
# POST your XML to the web service API
curl -X POST https://peppol.helger.com/public/locale-en_US/menuitem-validation-ws2 \
  -H "Content-Type: application/xml" \
  --data-binary @your-invoice.xml \
  -d "vesid=org.peppol.pint.aunz:invoice:1.1.2"

# VESID for PINT A-NZ invoice: org.peppol.pint.aunz:invoice:1.1.2
# VESID for PINT A-NZ credit note: org.peppol.pint.aunz:creditnote:1.1.2
```

_Limitations:_ Rate-limited — don't hammer it in automated test runs. Use it for manual spot-checking and debugging. For automated test suites, run your own schematron rules locally.

_When to use it:_

- Phase 1 Week 3–4: Every invoice your XML generator produces, test here first
- Phase 2: When Storecove rejects something unexpected, post the XML here to isolate whether it's a spec issue or an AP routing issue
- Any time you add a new document type (credit note, self-billing invoice)

---

**Tool 2 — ecosio XML Validator (ecosio.com/en/peppol-and-xml-document-validator)**

_What it is:_ A browser-based validator maintained by ecosio, an Austrian e-invoicing company. Uses Philip Helger's validation engine under the hood but wraps it in a clean UI. Upload XML in browser, get a formatted validation report.

_Why use it:_ Better for non-automated debugging. The UI shows each failed rule with its description, the element path, and a suggested fix. Faster to work through errors visually than parsing raw API responses.

_How to use it:_

1. Go to `ecosio.com/en/peppol-and-xml-document-validator`
2. Upload your XML file
3. Select document type: **Peppol PINT A-NZ Invoice** (or Credit Note)
4. Click Validate
5. Read the error list — each error shows rule ID, description, and the failing XML path

_When to use it:_

- Phase 1: Quick sanity checks when iterating on the XML generator
- When Peppol Practical API gives a cryptic error and you need to see it formatted
- Debugging edge cases (mixed GST rates, zero-rated items, attachments)

---

**Tool comparison:**

|                            | ABN Peppol Lookup  | XML Validator (yours) | Peppol Practical        | ecosio                  |
| -------------------------- | ------------------ | --------------------- | ----------------------- | ----------------------- |
| **Who uses it**            | SMB owners         | Other DSPs / devs     | You (during dev)        | You (during dev)        |
| **Input**                  | ABN number         | UBL XML file          | UBL XML via API         | UBL XML file upload     |
| **Phase built**            | Phase 0            | Phase 1               | External — use now      | External — use now      |
| **You build it?**          | ✅ Yes             | ✅ Yes                | ❌ No — Philip Helger's | ❌ No — ecosio's        |
| **Conversion opportunity** | ✅ Direct → signup | 🟡 Dev audience       | ❌ None — their product | ❌ None — their product |
| **Cost**                   | Free to run        | Free to run           | Free to call            | Free to use             |

---

### 4.5 Incoming Invoice Receiver

**Phase 2 feature — but plan for it architecturally from day one.**

Businesses don't just need to _send_ Peppol invoices — they also need to _receive_ them from their own suppliers. From December 2026, government departments must send invoices via Peppol.

What it does:

- Registers the user's ABN as a Peppol _receiver_ on the Directory (via Access Point)
- Incoming Peppol invoices arrive at the Access Point, get forwarded to your webhook
- Display in dashboard as received invoices
- Option to push to Xero/MYOB as a bill (accounts payable)
- Email notification for each received invoice

This doubles the value proposition: _"Send and receive Peppol invoices from one dashboard."_

---

### 4.6 Peppol Directory Registration

**Onboarding flow — happens once per business.**

Most SMBs don't know they need to register their ABN on the Peppol Directory before they can receive invoices. Your product handles this transparently during signup:

1. User enters their ABN
2. System validates ABN via ABR API (real-time, free)
3. Check if ABN already registered on Peppol Directory (via SMP lookup)
4. If not registered: initiate registration via Access Point API
5. Registration typically confirmed within 24 hours
6. User notified when their endpoint is live

Make this feel like a 2-minute setup wizard, not a compliance form.

---

## 5. Accounting Platform Landscape

The original spec focused on Xero and MYOB — but the AU accounting software market is broader. Here's the full picture and how to prioritise integration work.

---

### 5.1 Market Share

| Platform              | AU Market Share | Subscribers (est.) | Notes                                                      |
| --------------------- | --------------- | ------------------ | ---------------------------------------------------------- |
| **Xero**              | ~60%            | 4M+                | Dominant. Cloud-first. Accountant favourite.               |
| **MYOB**              | ~20–25%         | 1.2M               | AU-founded. Strong in payroll, trades, inventory.          |
| **QuickBooks Online** | ~15%            | ~750k              | Intuit (US). Simple onboarding. Growing.                   |
| **Reckon**            | Small           | ~100k est.         | AU-founded. Cheapest ($8/mo). Micro-businesses, tradies.   |
| **Zoho Books**        | Small/growing   | ~50k est.          | Strong in Zoho-ecosystem businesses. Indian-owned AU SMBs. |
| **FreshBooks**        | Small           | ~40k est.          | Service businesses, freelancers.                           |
| **Rounded**           | Micro           | ~20k est.          | Sole traders under $75k revenue (pre-GST threshold).       |
| **Thriday**           | Emerging        | Growing            | All-in-one challenger. Business account + accounting.      |
| **Sage**              | Small           | ~30k est.          | More common in enterprise and NZ.                          |
| **DEAR / Cin7**       | Niche           | —                  | Inventory-heavy (retail, manufacturing).                   |

> Xero + MYOB + QuickBooks = ~95% of the addressable AU market. Build these three and you've covered virtually everyone worth targeting.

---

### 5.2 Integration Roadmap by Phase

Rather than trying to integrate everything at once, phase it by market impact:

| Phase       | Platform          | Coverage added    | Priority                                   |
| ----------- | ----------------- | ----------------- | ------------------------------------------ |
| **Phase 1** | Xero              | +60%              | 🔴 Non-negotiable                          |
| **Phase 3** | MYOB              | +20–25%           | 🔴 Non-negotiable                          |
| **Phase 4** | QuickBooks Online | +15%              | 🟠 High — biggest growth unlock            |
| **Phase 5** | Reckon            | +2–3%             | 🟡 If bookkeeper tier demands it           |
| **Phase 5** | Zoho Books        | +1–2%             | 🟡 Low priority unless user demand         |
| **Always**  | PDF fallback      | Covers all others | 🟢 Built in Phase 1 — serves everyone else |

**The key insight:** Your PDF → Peppol converter is your implicit integration for every platform you haven't built a native connector for yet. A Rounded user, FreshBooks user, or Thriday user can export a PDF invoice and use your product today — without you building a single API integration for their platform.

---

### 5.3 Platform-by-Platform Analysis

#### Xero — Build First

- **API quality:** ⭐⭐⭐⭐⭐ Best developer experience in AU accounting
- **OAuth:** Standard OAuth 2.0, Xero Node SDK available
- **App Store:** Xero App Marketplace — 4–8 week review, strict but worth it
- **Key quirk:** Usage-based API pricing introduced 2026 — monitor per-customer API call volume
- **Peppol status:** Native Peppol exists but is buried and poorly discoverable — your UX wedge
- **Build effort:** Medium (3–4 weeks for solid integration)

#### MYOB — Build Second

- **API quality:** ⭐⭐⭐ Functional but less polished docs than Xero
- **OAuth:** OAuth 2.0, AccountRight API (cloud) only for v1 — skip desktop
- **App Marketplace:** Less strict review than Xero — easier to list initially
- **Key quirk:** Tax code model differs significantly from Xero — `TaxCode` mapping requires a dedicated lookup table for GST treatment
- **Peppol status:** Supported but similarly buried
- **Build effort:** Medium-High (add 1 extra week vs Xero estimate)

#### QuickBooks Online — Build Third (Hidden Opportunity)

- **API quality:** ⭐⭐⭐⭐ Intuit has good developer docs globally
- **OAuth:** Standard OAuth 2.0, well-documented
- **App Store:** QuickBooks App Store — global review process
- **Key quirk:** US-based company means AU-specific features (GST, BAS, TPAR) are sometimes lagging. Their Peppol integration for AU is not well publicised — **the gap is real**
- **Peppol status:** Limited native support — significant opportunity
- **Build effort:** Medium (similar to Xero once you've done the first two)
- **Why prioritise:** ~750k AU users with almost no clean Peppol solution. QuickBooks App Store is less competitive than Xero's for AU-specific tools. First-mover advantage is available here.

#### Reckon — Phase 5 / On-Demand

- **API quality:** ⭐⭐ Exists but limited third-party ecosystem
- **OAuth:** Available but less documented
- **Target user:** Tradies, micro-businesses, sole traders — exactly the demographic getting caught by the mandate after winning a government contract
- **Peppol status:** No native support known
- **Build effort:** High relative to market size
- **Recommendation:** Serve Reckon users via PDF fallback until bookkeeper-tier demand justifies a native integration

#### Zoho Books — Phase 5 / Low Priority

- **API quality:** ⭐⭐⭐ Strong API (Zoho ecosystem is developer-friendly globally)
- **Target user:** Businesses already in Zoho CRM/Zoho People ecosystem — often Indian-owned AU SMBs
- **Peppol status:** No native AU Peppol support
- **Build effort:** Medium
- **Recommendation:** Watch for demand signals. If 5+ users request it, build it. Until then, PDF fallback.

#### FreshBooks, Rounded, Thriday — PDF Fallback Only (v1–v3)

- All three have smaller user bases and less mature APIs
- Your PDF converter already serves them — no native integration needed until significant demand
- Rounded specifically targets pre-GST sole traders who are less likely to need Peppol (Peppol becomes relevant once you cross the $75k GST threshold and start doing government work)

---

### 5.4 The PDF Fallback Strategy

**This is your secret weapon for every platform you haven't integrated yet.**

Any business on any accounting software can:

1. Export their invoice as a PDF (every platform supports this)
2. Upload to KORLO
3. Claude extracts the structured data
4. User corrects and confirms
5. Sent via Peppol network

This means on day one of launch, you serve 100% of the AU market — not just Xero users. The native integrations (Xero, MYOB, QuickBooks) are convenience upgrades that remove the PDF step. But they're not blockers to serving customers.

**Marketing angle:** _"Works with any accounting software. Xero and MYOB users get one-click sending."_

This is a meaningful differentiator vs. competitors who only serve Xero or only serve MYOB.

---

### 5.5 The Bookkeeper Multi-Platform Reality

The median Australian accounting professional now uses 5+ different technology platforms. A bookkeeper managing 30 clients might have:

- 15 clients on Xero
- 8 clients on MYOB
- 5 clients on QuickBooks
- 2 clients on Reckon

Your **Bookkeeper tier** solves this directly: one dashboard, all platforms, all clients. A bookkeeper who uses three accounting platforms pays you once and manages everything in one place. This is a stronger moat than any single platform integration — and it's the reason the Bookkeeper tier is priced at AUD $149/month rather than $79.

---

## 6. ATO eInvoicing Ready Certification

One of the most commonly confused topics for first-time Peppol builders. Here's what is and isn't required.

---

### 6.1 Two Separate Registrations — Don't Confuse Them

There are two completely separate registrations in the AU Peppol ecosystem:

|                       | Accredited Peppol Service Provider                           | eInvoicing Ready Product                            |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| **What it is**        | Being the network itself (an Access Point / SMP)             | Having your software listed as certified            |
| **Who it's for**      | Storecove, MessageXchange, Exedee — the infrastructure layer | Software products like Xero, MYOB, and your product |
| **Required for you?** | ❌ No — skip entirely                                        | ✅ Optional but strongly recommended                |
| **Effort**            | Months of compliance work + OpenPeppol membership fees       | Weeks of testing + one application form             |
| **ATO register**      | Peppol Service Provider Register                             | eInvoicing Ready Product Register                   |

**You are not becoming a Peppol Service Provider.** That is Storecove's job. You are a Digital Service Provider (DSP) that partners with an accredited Service Provider — which means you qualify to apply for the eInvoicing Ready Product listing instead.

---

### 6.2 Ready vs Ready+

The ATO issues two tiers of certification:

**eInvoicing Ready**
The base certification. Your product can:

- Send or receive a valid PINT A-NZ invoice through an accredited AU/NZ Peppol Service Provider
- Validate the sender's and receiver's ABN
- Register a business onto the Peppol network to receive eInvoices (with their consent)

**eInvoicing Ready+**
The premium certification. Everything in Ready, plus:

- Support for best-practice optional fields that large buyers require: delivery address, purchase order reference, contract number, buyer reference, project reference
- Defined in the A-NZ Invoice Content Industry Practice Statement (DOCX available from ATO)

> ⚠️ **Target Ready+ from day one.** It's the same application form — just more fields to support in your XML generator. The "+" badge signals you're serious and positions you above basic tools on the register. Large buyers (government departments, corporate procurement teams) specifically filter for Ready+ products.

---

### 6.3 What the Assessment Requires

The ATO assessment is practical, not theoretical. They will check:

1. **Live send demonstration** — send a valid PINT A-NZ invoice through your connected Accredited Service Provider in production (not just sandbox)
2. **ABN validation** — your product validates the sender's and receiver's ABN via ABR API
3. **Peppol Directory registration** — your product can register a user's ABN as a Peppol endpoint (with their consent)
4. **Screenshots** — UI screenshots of each of the above flows
5. **Privacy policy** — must explicitly reference how you handle invoice and business data
6. **For Ready+** — screenshots showing best-practice fields are supported in your send flow

**How to apply:**

- Download the AU eInvoicing product application form from `softwaredevelopers.ato.gov.au/einvoicing-ready-product-assessment`
- Complete and email to `eInvoicing@ato.gov.au`
- Or submit via Online Services for DSPs (if registered as a DSP)

**Turnaround:** The ATO contacts you once reviewed. Typically 2–4 weeks.

**Validity:** 12 months. Annual renewal required — but minimal effort if no major product changes. The ATO contacts you 1 month before expiry. If changes are minimal, you simply verify the product still meets the same criteria.

---

### 6.4 When to Apply

**Do not apply during Phase 0, 1, or 2.** The ATO tests actual functionality.

Apply at the **end of Phase 2** — once you have:

- A working production Peppol send via Storecove (not just sandbox)
- ABN validation live
- Peppol Directory registration flow working
- A real user who has successfully sent at least one invoice

| Phase           | Certification action                                                                 |
| --------------- | ------------------------------------------------------------------------------------ |
| Phase 0–1       | Build — ignore certification entirely                                                |
| Phase 2         | Build the three required capabilities (send, ABN validation, Directory registration) |
| End of Phase 2  | **Apply for eInvoicing Ready+ assessment** — email `eInvoicing@ato.gov.au`           |
| Phase 3         | Listing appears on ATO register — add badge to marketing site, App Store listings    |
| 12 months later | Annual renewal (minimal if no major changes)                                         |

**Why timing matters:** If you apply before Phase 2 is complete, you'll fail the assessment and need to reapply — adding weeks of delay to your ATO register listing. There is no benefit to applying early.

---

### 6.5 NZ Listing is Free and Simultaneous

Software products that meet the eInvoicing Ready criteria and indicate they'd like to be listed on the New Zealand register only need to complete **one application form**. Tick the NZ box on the same form — you're listed on both AU and NZ registers simultaneously.

Given NZ is already in your target market and uses the same PINT A-NZ standard, this is a free market expansion that costs zero extra effort.

**Contact for questions:**

- Australian Peppol Authority: `eInvoicing@ato.gov.au`
- New Zealand Peppol Authority: `support@nzpeppol.govt.nz`

Both teams are approachable. Worth emailing early with a quick: _"I'm building an SMB Peppol tool partnering with Storecove as our Access Point — can you confirm the current assessment requirements?"_ Government tech teams actively want more software products to get certified and will help.

---

## 7. SMB Support Reduction Strategy

SMB owners and tradies are not technical — but that doesn't mean they generate overwhelming support. The support doesn't come from Peppol being complicated. It comes from **the ten things that go wrong around Peppol** that have nothing to do with your product quality. Build these three features early and 70% of support becomes self-service.

---

### 7.1 Where Support Tickets Actually Come From

| Ticket Type                        | Root Cause                                                        | Your Fault?  | Frequency        |
| ---------------------------------- | ----------------------------------------------------------------- | ------------ | ---------------- |
| "My invoice was rejected"          | Receiver's ABN not on Peppol Directory — their problem, not yours | ❌ No        | 🔴 Very High     |
| "Xero isn't connecting"            | OAuth token expired silently — `invalid_grant` error              | ❌ No        | 🟠 High          |
| "My ABN is showing invalid"        | Wrong ABN in their Xero contact record                            | ❌ No        | 🟠 High          |
| "Where did my invoice go?"         | Delivery pending (30s–10min) — they don't know it's normal        | ❌ No        | 🟡 Medium        |
| "Invoice not showing in dashboard" | Invoice still in Draft in Xero, not Approved                      | ❌ No        | 🟡 Medium        |
| Billing confusion                  | "I thought I had unlimited invoices"                              | ⚠️ Partially | 🟡 Medium        |
| "How do I get started?"            | Onboarding gap — connected Xero, then stopped                     | ⚠️ Partially | 🟢 Low after FAQ |

**The pattern:** Almost every ticket is caused by something outside your codebase — the receiver's setup, the user's Xero data quality, OAuth token expiry, or delivery timing anxiety. Your job is to make each of these self-diagnosable before the user reaches for the email button.

---

### 7.2 The Three Must-Build Features That Kill Support

#### Feature 1 — Rejection Reason Translator

**Eliminates ~40% of all support tickets. Build this in Phase 2.**

Every possible Peppol network rejection code must have a plain-English explanation with a specific fix. Never show the raw error.

**What the network returns:**

```
PEPPOL_NETWORK_ERROR: Receiver endpoint not found for
participant ID: 0151:12345678901
```

**What your UI must show:**

> ⚠️ **Invoice not delivered — Receiver not on Peppol network**
>
> The business you're invoicing hasn't set up their Peppol endpoint yet. This is common for organisations still completing their eInvoicing setup.
>
> **What to do:**
>
> 1. Contact [Department/Business Name] and ask them to confirm their Peppol endpoint is active
> 2. Check the [ATO Peppol Directory](https://www.ato.gov.au) to see if they're registered
> 3. Once they confirm, click Retry — no need to create a new invoice
>
> [Retry] [Email their accounts team] [Send as PDF instead]

The translation layer is a simple lookup table: `errorCode → { title, explanation, steps, actions }`. Every known rejection code mapped before launch. Add new ones as they appear in production.

**Known AU Peppol rejection codes to pre-map:**

- `RECEIVER_NOT_FOUND` — endpoint not registered
- `INVALID_DOCUMENT_FORMAT` — PINT A-NZ spec violation
- `INVALID_CUSTOMIZATION_ID` — wrong `CustomizationID` value
- `DUPLICATE_DOCUMENT` — same invoice number sent twice
- `INVALID_ABN` — ABN failed checksum or not active
- `NETWORK_TIMEOUT` — Access Point couldn't reach receiver's AP
- `DOCUMENT_REJECTED` — receiver's system rejected (rare, usually data issue)

---

#### Feature 2 — Proactive Status Emails

**Eliminates ~25% of tickets — the "where did my invoice go?" anxiety tickets. Build this in Phase 2.**

Don't make SMB owners check the dashboard. Push every status change to their inbox automatically.

**Email sequence per invoice:**

| Status                   | Email subject                                     | Timing        |
| ------------------------ | ------------------------------------------------- | ------------- |
| Submitted to network     | 📤 Invoice #INV-042 submitted to Peppol network   | Immediate     |
| Delivered to receiver    | ✅ Invoice #INV-042 delivered to [Dept Name]      | Within 5 min  |
| Acknowledged by receiver | 🎉 Invoice #INV-042 accepted — payment processing | Within 30 min |
| Rejected                 | ⚠️ Invoice #INV-042 needs attention               | Immediate     |
| Pending > 30 min         | ⏳ Still processing — this can take up to 1 hour  | At 30 min     |

An SMB owner who gets the ✅ email never opens a support ticket. They only ticket when they're anxious and don't know what's happening. Proactive communication removes the anxiety before it becomes a ticket.

**Implementation:** Resend (already in your stack) + Supabase Edge Function watching the `invoice_status` table for changes. ~2 hours to build.

---

#### Feature 3 — Onboarding Wizard

**Eliminates the "how do I get started?" tickets. Build this in Phase 1.**

The blank-screen-after-signup moment is where 30% of new users quietly churn without ever sending an invoice. They connected Xero, don't know what to do next, and feel too embarrassed to ask.

A 4-step progress wizard shown on first login:

```
Step 1 of 4 — Connect your accounting software
[Connect Xero] [Connect MYOB] [I'll upload PDFs]
✅ Done

Step 2 of 4 — Verify your business ABN
Your ABN: 12 345 678 901 ✅ Valid — Tashi's Painting Pty Ltd
[Looks right, continue]

Step 3 of 4 — Register on the Peppol network
This lets government departments find and pay you electronically.
[Register my business — takes 2 minutes]
⏳ Registering... ✅ Done — you're on the network

Step 4 of 4 — Send your first invoice
Select an invoice from Xero to send as a test.
[Choose invoice] → [Preview] → [Send]
🎉 Your first Peppol invoice is on its way!
```

Each step has a "Why do I need this?" tooltip. Step 3 especially — most SMB owners don't know what "registering on the Peppol network" means and it sounds scary. The tooltip says: _"This is a one-time setup. It tells the government's invoicing system where to send payment confirmations. It only takes 2 minutes and you never have to do it again."_

---

### 7.3 Rejection Code Translation Table

Pre-map these before your first production customer. Add to a `rejection_codes.ts` config file — easy to update without a deploy.

```typescript
const REJECTION_CODES: Record<string, RejectionExplanation> = {
  RECEIVER_NOT_FOUND: {
    title: "Recipient not on Peppol network",
    explanation:
      "The business or department you're invoicing hasn't set up their Peppol endpoint yet.",
    steps: [
      "Contact their accounts team and ask them to confirm their Peppol endpoint is active",
      "Check the ATO Peppol Directory to see if they're registered",
      "Once confirmed, use the Retry button — no need to create a new invoice",
    ],
    canRetry: true,
    urgency: "medium",
  },
  INVALID_DOCUMENT_FORMAT: {
    title: "Invoice format issue",
    explanation:
      "Your invoice has a formatting issue that prevents it being accepted by the network.",
    steps: [
      "Check that all required fields are filled in (ABN, invoice date, due date, line items)",
      "Contact support with your invoice number and we'll identify the issue",
    ],
    canRetry: false,
    urgency: "high",
  },
  DUPLICATE_DOCUMENT: {
    title: "Invoice already sent",
    explanation:
      "An invoice with this number was already sent successfully. Check your sent invoices.",
    steps: [
      "Check your Sent Invoices tab — the original may have been delivered",
      "If you need to send a correction, create a credit note and a new invoice",
    ],
    canRetry: false,
    urgency: "low",
  },
  NETWORK_TIMEOUT: {
    title: "Network timeout — please retry",
    explanation:
      "The Peppol network couldn't reach the recipient's system. This is usually temporary.",
    steps: [
      "Wait 10 minutes and click Retry",
      "If it fails again after 3 attempts, contact support",
    ],
    canRetry: true,
    urgency: "low",
  },
  // ... add all known codes
};
```

---

### 7.4 Support Volume Reality Check

With the three features above built:

| Stage     | Customers | Tickets/week (without features) | Tickets/week (with features) | Time cost       |
| --------- | --------- | ------------------------------- | ---------------------------- | --------------- |
| Phase 1–2 | 0–20      | 5–8                             | 1–2                          | ~15 min/week    |
| Phase 3   | 20–50     | 10–20                           | 2–4                          | ~30 min/week    |
| Phase 4   | 50–150    | 30–50                           | 5–10                         | ~60–90 min/week |
| Scale     | 150–300   | 80–120                          | 10–20                        | ~2 hrs/week     |

**Without the three features**, support at 150 customers becomes a part-time job that eats your build time. **With them**, it stays manageable as a solo founder up to ~300 customers.

The tipping point where you'd consider a part-time VA for support is around 300+ customers. Well beyond where you need to worry today.

**One more thing — the pre-written FAQ**
Write your FAQ _before_ your first customer, not after your tenth support ticket. Sections to cover from day one:

- Why was my invoice rejected? (link to rejection translator)
- My Xero connection broke — how do I reconnect?
- How long does delivery take?
- My invoice isn't showing in the dashboard
- How do I know the invoice was received?
- How do I cancel or change my plan?

Add the FAQ URL to every automated email footer. Half your tickets will disappear before they're written.

---

## 8. Architecture & Tech Stack

### Architectural Decision — Access Point Partnership

**Do not become a Peppol Access Point yourself.**

Becoming an ATO-accredited Access Point requires:

- Formal ATO registration process (months)
- Ongoing compliance and security audits
- Infrastructure for the Peppol AS4 messaging protocol
- Minimum viable scale requirements
  **Partner with an existing certified AU Access Point instead:**

| Provider           | Developer Docs  | Sandbox      | Per-invoice cost (est.) | Notes                                         |
| ------------------ | --------------- | ------------ | ----------------------- | --------------------------------------------- |
| **Storecove**      | ⭐⭐⭐⭐⭐ Best | ✅ Free      | ~$0.20–$0.30            | Recommended for v1. REST API, excellent docs. |
| **MessageXchange** | ⭐⭐⭐          | ✅ Available | ~$0.25–$0.40            | AU-focused, strong local support              |
| **Exedee**         | ⭐⭐⭐          | ✅ Available | ~$0.30–$0.50            | AU-founded, good SMB relationships            |
| **B2BE**           | ⭐⭐            | Limited      | Enterprise              | Too enterprise for v1                         |

**Start with Storecove.** Their REST API is the cleanest, their sandbox is comprehensive, and their documentation is the best in the market. Negotiate a reseller agreement once you have traction (typically 3–6 months in).

---

### Full Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  Next.js 15 (App Router) · React 19 · TypeScript strict    │
│  Tailwind CSS v4 · shadcn/ui (Radix, Nova) · pnpm          │
│  Zustand · react-pdf                                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   BACKEND / API ROUTES                       │
│  Next.js API Routes (Edge Functions for low latency)        │
│  Invoice transformation engine (TypeScript)                  │
│  XML generation + validation (libxmljs2 / custom)           │
│  ABN validation (ABR API)                                   │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
┌──────▼─────┐  ┌─────▼──────┐  ┌──▼──────────────────────┐
│  SUPABASE  │  │ CLAUDE API │  │   EXTERNAL INTEGRATIONS  │
│            │  │            │  │                          │
│ Postgres   │  │ PDF parsing│  │  Storecove API (Peppol)  │
│ Auth       │  │ Structured │  │  Xero Node SDK (OAuth)   │
│ Storage    │  │ extraction │  │  MYOB AccountRight API   │
│ Edge Fn    │  │ Correction │  │  ABR JSON API (free)     │
│ RLS        │  │ confidence │  │  Resend (email)          │
└────────────┘  └────────────┘  │  Lemon Squeezy (billing) │
                                └──────────────────────────┘
```

**Phase 3 monorepo (Turborepo):**

```
apps/
  web/     ← Next.js (current repo structure moves here)
  mobile/  ← React Native (Phase 3)
packages/
  contracts/  ← API contract types (shared)
  types/      ← Domain types (shared)
  utils/      ← Shared utility functions
```

Turborepo is introduced at Phase 3 only. Do not set it up before then.

### Layer-by-Layer Detail

**Frontend**
| Technology | Role | Why |
|-----------|------|-----|
| Next.js 15 App Router | Framework | SSR for SEO ("peppol invoice xero"), edge for low latency |
| React 19 | UI | Your native stack |
| TypeScript strict | Language | Non-negotiable for financial software |
| Tailwind CSS v4 | Styling | Rapid iteration. Uses `@import "tailwindcss"` and CSS `@theme` variables — no `tailwind.config.js` |
| shadcn/ui (Radix, Nova preset) | Component library | Accessible Radix primitives (ARIA, keyboard nav, focus trapping). Components in `/components/ui/` — never modify directly, extend. Decision D-034. |
| pnpm | Package manager | Turborepo-native for Phase 3 monorepo. Strict phantom dependency detection. Decision D-035. |
| `react-pdf` | PDF preview rendering | Show users what their invoice looks like |
| Zustand | State | Multi-step form state for invoice wizard |

**Database & Auth**
| Technology | Role | Why |
|-----------|------|-----|
| Supabase Postgres | Primary DB | Invoice records, audit logs, company profiles |
| Supabase Auth | Authentication | Magic link — no password friction for SMB users |
| Supabase Storage | File storage | PDF uploads, XML archives, attachment storage |
| Supabase RLS | Data isolation | Row Level Security for multi-tenant (critical for financial data) |
| Supabase Edge Functions | Background jobs | Async status polling, retry logic, webhooks |

**Invoice Engine**
| Technology | Role | Why |
|-----------|------|-----|
| Custom TypeScript | PINT A-NZ XML generator | No library exists — build it yourself |
| `libxmljs2` or `fast-xml-parser` | XML parsing + validation | Schema (XSD) validation |
| Custom schematron engine | Business rule validation | Peppol schematron rules |
| `zod` | Runtime type validation | Validate invoice data shape before XML generation |

**External APIs**
| Technology | Role | Cost |
|-----------|------|------|
| Storecove REST API | Peppol network delivery | ~$0.20–$0.30/invoice |
| Xero Node SDK | Accounting integration | Free (usage-based API costs from Xero) |
| MYOB AccountRight API | Accounting integration | Free |
| ABR JSON API | ABN lookup + validation | Free (no auth required) |
| Claude API (Haiku) | PDF invoice parsing | ~$0.01/PDF |
| OpenAI Whisper | — | Not needed for this product |

**Infrastructure**
| Technology | Role | Cost |
|-----------|------|------|
| Vercel | Hosting + edge functions | Free tier → $20/mo Pro |
| Resend | Transactional email | Free tier (3k/mo) |
| Lemon Squeezy | Payments + AU GST | 5% + $0.50/transaction |
| Sentry | Error monitoring | Free tier |
| Turborepo | Monorepo build system | Free (Phase 3 only — Decision D-036) |

---

## 9. The AI Layer — PDF Parsing

### Why Claude for PDF extraction

Xero and MYOB integrations give you perfectly structured data — no AI needed. But two use cases require PDF parsing:

1. **Businesses not on Xero/MYOB** (still a large market)
2. **Invoices from other systems** (legacy ERP exports, international supplier invoices)

Claude's document API handles multi-page PDFs with mixed layouts reliably. Alternatives (AWS Textract, Google Document AI) are more expensive and require more infrastructure.

### The extraction prompt pattern

```
You are an invoice data extractor for Australian tax compliance.
Extract the following fields from this invoice PDF.
Return ONLY valid JSON matching this schema. No markdown, no explanation.

Required fields:
- invoiceNumber (string)
- issueDate (YYYY-MM-DD)
- dueDate (YYYY-MM-DD or null)
- supplierABN (11 digits, no spaces or hyphens)
- supplierName (string)
- supplierAddress (object: street, suburb, state, postcode, country)
- customerABN (11 digits or null if not present)
- customerName (string)
- customerAddress (object)
- lineItems (array of: description, quantity, unitPrice, gstApplicable boolean, lineTotal)
- subtotal (number, 2 decimal places)
- gstAmount (number, 2 decimal places)
- total (number, 2 decimal places)
- currency (ISO 4217, default "AUD")
- notes (string or null)

Validation rules to apply before returning:
- supplierABN must pass the ATO ABN checksum algorithm
- gstAmount should equal approximately 10% of GST-applicable line items
- total should equal subtotal + gstAmount

If any required field cannot be determined with confidence, set it to null
and add a "warnings" array listing what needs manual verification.
```

### The confidence + correction flow

```
PDF uploaded
     ↓
Claude extracts structured data
     ↓
Server-side validation:
  - ABN checksum check (deterministic — don't trust LLM for this)
  - GST arithmetic check (subtotal × 0.1 ≈ gstAmount)
  - Required fields present
     ↓
Confidence score calculated per field:
  - HIGH: extracted cleanly, passes all validation
  - MEDIUM: extracted but could not fully validate
  - LOW: missing or failed validation — highlight in UI
     ↓
Show correction UI:
  - All fields editable
  - LOW confidence fields highlighted in amber
  - "Could not read" fields highlighted in red
  - ABN lookup button: verify ABN against ABR in real-time
     ↓
User confirms → XML generation proceeds
```

**Never skip the correction step.** A wrong GST amount on a sent invoice is a tax compliance issue for your customer. You are not liable (you're a prep tool) but the UX damage from a wrong invoice is severe.

### Cost per PDF extraction

| Model             | Cost per PDF  | Quality    | Notes                                         |
| ----------------- | ------------- | ---------- | --------------------------------------------- |
| Claude 3 Haiku    | ~$0.005–$0.01 | ⭐⭐⭐⭐   | Best cost/quality for simple invoices         |
| Claude 3.5 Sonnet | ~$0.02–$0.04  | ⭐⭐⭐⭐⭐ | Use for complex layouts (tables, multi-page)  |
| GPT-4o mini       | ~$0.005–$0.01 | ⭐⭐⭐     | Cheaper but less consistent on AU tax formats |

Route simple invoices to Haiku, complex ones to Sonnet. Save Sonnet for fallback when Haiku returns >2 low-confidence fields.

---

## 10. Cost Model & Margins

### Per-invoice cost breakdown

| Component                              | Cost       | Notes                        |
| -------------------------------------- | ---------- | ---------------------------- |
| Storecove API (send)                   | ~$0.25     | Per sent invoice             |
| Storecove API (receive)                | ~$0.15     | Per received invoice         |
| Claude Haiku (PDF only)                | ~$0.01     | Only for PDF-source invoices |
| ABR API                                | $0.00      | Free                         |
| Supabase DB                            | ~$0.001    | Negligible at SMB scale      |
| Storage (PDF/XML archive)              | ~$0.002    | S3-equivalent pricing        |
| **Total per sent invoice (Xero/MYOB)** | **~$0.25** |                              |
| **Total per sent invoice (PDF)**       | **~$0.26** |                              |

### Monthly margin analysis

| Plan               | Price    | Included invoices | AP cost | Gross margin |
| ------------------ | -------- | ----------------- | ------- | ------------ |
| Starter $29/mo     | AUD $29  | 30 invoices       | $7.50   | **74%**      |
| Pro $79/mo         | AUD $79  | 150 invoices      | $37.50  | **53%**      |
| Bookkeeper $149/mo | AUD $149 | 500 invoices      | $125    | **16%**      |

> ⚠️ **The Bookkeeper tier needs volume-based AP pricing.** Negotiate a flat monthly rate with Storecove at ~500+ invoices/month (typically AUD $50–80 flat) rather than per-invoice pricing. This lifts Bookkeeper margin to ~47%.

### Break-even analysis

| Customers        | Monthly revenue | Monthly AP cost | Vercel/Infra | Net profit |
| ---------------- | --------------- | --------------- | ------------ | ---------- |
| 10 (all Starter) | $290            | $75             | $20          | **$195**   |
| 30 (mix)         | $1,200          | $300            | $20          | **$880**   |
| 100 (mix)        | $4,500          | $1,100          | $40          | **$3,360** |
| 200 (mix)        | $9,000          | $2,200          | $60          | **$6,740** |

Healthy margins even without volume discounts. The unit economics are solid.

---

## 11. Pricing & Monetisation

### Tiers

**Free — $0/month**

- Unlimited use of the Peppol Validator tool
- 3 invoices/month via Peppol (enough to test, not enough to replace a paid plan)
- PDF extraction and validation (no sending)
- ABN verification tool
- Peppol readiness report

**Starter — AUD $29/month**

- 30 Peppol invoices/month (send + receive)
- Xero OR MYOB integration (one account)
- PDF → Peppol conversion
- Delivery status tracking + email notifications
- Audit log (5 years retention — ATO requirement)
- Peppol Directory registration included

**Pro — AUD $79/month**

- 150 Peppol invoices/month
- Xero AND MYOB integration (both)
- Bulk send (select multiple invoices, send in one click)
- Incoming invoice → Xero/MYOB push (accounts payable auto-creation)
- Priority email support
- Custom sender reference

**Bookkeeper — AUD $149/month**

- 500 invoices/month across unlimited client businesses
- White-label option (your branding, not ours)
- Client dashboard (manage all clients from one login)
- CSV bulk import (for clients not on Xero/MYOB)
- Monthly usage reports per client
- Dedicated onboarding call

### Overage pricing

- Starter: AUD $0.60/invoice over 30
- Pro: AUD $0.40/invoice over 150
- Bookkeeper: AUD $0.25/invoice over 500

### One-time onboarding fee (optional)

For businesses that want a guided setup:

- AUD $199 one-time: 45-minute Zoom onboarding + first invoice sent together
- Solves the "I don't understand what I'm doing" anxiety that blocks SMB conversions
- High margin (your time + zero variable cost)
- Positions you as the trusted expert, not just a SaaS tool

---

## 12. Build Roadmap

### Phase 0 — Weeks 1–2: Research + Validator Lead Magnet

**Difficulty: 🟢 Easy | Time: ~4–6 hrs total**

**Tasks:**

- Sign up for Storecove sandbox account (free, instant)
- Download PINT A-NZ specification from ATO website — read the first 40 pages
- **Build ABN Peppol Lookup Tool** (enter ABN → is this business on the Peppol network?) — see [Section 4.4.1](#441-abn-peppol-lookup-tool--phase-0-public-lead-magnet)
  - Two API calls: ABR validation + SMP Directory lookup
  - CTA on result: "Send them an invoice → [Get started free]"
  - Email capture: "Get notified when they go live" (for ABNs not yet on the network)
- Landing page: "Send Peppol invoices from Xero in 90 seconds"
- 3 SEO blog posts: "Peppol invoice July 2026 explained", "Xero Peppol setup guide", "Is [agency] on the Peppol network?"
- Email capture on validator (Resend)
- Set up Peppol Practical and ecosio accounts — your XML testing tools for Phase 1 (see [Section 4.4.3](#443-development-validation-tools--what-you-use-not-what-you-build))
- Post to: r/AusFinance, r/AusBusiness, r/smallbusiness, LinkedIn, bookkeeper Facebook groups

**Success metric:** 50 email signups from the ABN lookup tool in 2 weeks

**Honest truth:** The ABN lookup tool is 2 hours to build. One form, two API calls, one result. Don't over-engineer it. A plain HTML page with a text input converts just as well as a polished React app — ship it first, prettify later. Read the PINT A-NZ spec before writing a single line of product code. Pages 1–40 cover everything you need for Phase 1. Don't skim this — every hour spent here saves 3 hours of rework later.

---

### Phase 1 — Weeks 3–8: XML Engine + Xero Integration

**Difficulty: 🟡 Medium | Time: ~3 hrs/day**

**Tasks:**

- Build TypeScript PINT A-NZ XML generator
  - Start with simplest case: single GST rate (10%), AUD, standard invoice, no attachments
  - Layer in: credit notes, zero-rated items, foreign currency (later)
- Implement all three validation layers:
  - Schema (XSD) validation
  - Schematron business rule validation
  - PINT A-NZ specific rules
- **Test every generated XML against Peppol Practical API during development** — see [Section 4.4.3](#443-development-validation-tools--what-you-use-not-what-you-build). Use VESID `org.peppol.pint.aunz:invoice:1.1.2`. Fix all failures before moving to Phase 2.
- **Build public PINT A-NZ XML Validator** — see [Section 4.4.2](#442-pint-a-nz-xml-validator--internal-development-tool--optional-dsp-feature). Surface your own validation engine as a public tool for DSPs. Secondary SEO channel for the developer audience.
- ABN validation via ABR JSON API + checksum algorithm
- Xero OAuth 2.0 integration (Xero Node SDK)
  - Connect Xero account
  - Pull approved/awaiting-payment invoices
  - Map Xero invoice JSON → internal invoice model → PINT A-NZ XML
- Supabase auth (magic link)
- Multi-tenant data model (one user can manage one business in v1)
- Basic dashboard: list invoices, select to send
- Onboarding wizard (4-step first-login flow) — see [Section 7.2 Feature 3](#72-the-three-must-build-features-that-kill-support)

**Success metric:** Generate a schema-valid PINT A-NZ XML from a real Xero invoice. Peppol Practical returns zero errors on your output. Public XML validator live and indexed.

**Honest truth:** The XML generation takes longer than you expect. Edge cases alone (credit notes, partial payments, mixed GST treatments) will each add 2–4 days. Tackle them strictly in order of frequency — standard invoices first, edge cases last. Use Peppol Practical and ecosio on every single invoice type before calling it done — not just the happy path.

**Week-by-week breakdown:**

- Week 3: XML generator for simplest case + schema validation + first Peppol Practical test
- Week 4: Schematron + PINT A-NZ rules — iterate until Peppol Practical returns zero errors
- Week 5: ABN lookup integration + ABN checksum + public XML validator live
- Week 6: Xero OAuth + invoice pull
- Week 7: Xero → XML transformation + test every Xero field mapping against Peppol Practical
- Week 8: Basic dashboard UI + Supabase auth + multi-tenant model

---

### Phase 2 — Weeks 9–13: Access Point Integration + Actual Sending

**Difficulty: 🔴 Hard | This is the hardest phase**

**Tasks:**

- Integrate Storecove API for actual Peppol network delivery
- Peppol Directory registration flow (register sender's ABN via Storecove)
- Status tracking: pending → submitted → delivered → acknowledged / rejected
- Webhook handler for Storecove delivery status updates
- Status polling fallback (if webhook misses — it happens)
- Retry logic with exponential backoff (1 min → 5 min → 30 min → 4 hrs → 24 hrs)
- Dead letter queue for permanently failed invoices
- Rejection response translator (cryptic network codes → plain English) — see [Section 7.3](#73-rejection-code-translation-table) for pre-mapped codes
- Immutable audit log for every send attempt (required for ATO compliance)
- Email notifications: delivery confirmed, rejected with explanation — see [Section 7.2](#72-the-three-must-build-features-that-kill-support) for full email sequence

**Success metric:** Successfully send a real invoice through Peppol network in sandbox, receive acknowledgement. All three ATO certification requirements met (send, ABN validation, Directory registration).

**Honest truth:** Plan for one full week just debugging the first successful sandbox send. Storecove's error messages are descriptive but the Peppol network's rejection responses are not. When Storecove returns an unexpected error, **post your XML to ecosio first** (see [Section 4.4.3](#443-development-validation-tools--what-you-use-not-what-you-build)) — if ecosio shows zero errors, the issue is AP routing or endpoint configuration, not your XML. If ecosio shows errors, fix those first before calling Storecove. This isolation step saves hours of back-and-forth. Common first-time issues:

- ABN not registered on Peppol Directory (receiver doesn't have an endpoint)
- Customisation ID mismatch (wrong PINT A-NZ profile identifier — must be exactly `urn:peppol:pint:billing-1@aunz-1`)
- Missing mandatory extension fields specific to AU
- Timestamp format (UTC vs AEST — the spec says UTC, some implementations are lenient, others aren't)

**At the end of Phase 2:** Apply for ATO eInvoicing Ready+ certification — email `eInvoicing@ato.gov.au` with the completed application form. The listing typically appears 2–4 weeks later. See [Section 6](#6-ato-einvoicing-ready-certification) for the full certification guide.

**Week-by-week breakdown:**

- Week 9: Storecove API integration (sandbox), first send attempt
- Week 10: Debug first successful send, status polling
- Week 11: Webhook handler + retry logic
- Week 12: Rejection handling + error translation
- Week 13: Audit log + email notifications

---

### Phase 3 — Weeks 14–17: PDF Parser + MYOB + Payments

**Difficulty: 🟡 Medium**

**Tasks:**

- Claude API PDF extraction integration
- Confidence scoring + correction UI
- ABN pre-pass on extracted data (verify before showing to user)
- MYOB AccountRight OAuth integration
- MYOB → XML transformation (different field mapping from Xero)
- Lemon Squeezy payment integration
- Freemium limits enforced (3 free invoices/month)
- Upgrade flow and billing management

**Success metric:** First paying customer (AUD $29/mo Starter)

**Honest truth:** MYOB's API documentation has gaps. Their `TaxCode` model is different from Xero's — what Xero calls "GST" maps to different codes in MYOB depending on the account type. Budget a week just for the GST mapping table.

---

### Phase 4 — Month 5–6: QuickBooks + Bookkeeper Tier + Xero App Store

**Difficulty: 🟡 Medium | Mostly process + one new integration**

**Tasks:**

- **QuickBooks Online OAuth integration** — similar pattern to Xero, adds ~15% market coverage
- Multi-client dashboard for bookkeepers (manage all client businesses from one login)
- White-label option
- Bulk send UI (select all invoices, send in one click)
- Incoming invoice receiver (register as Peppol receiver)
- Incoming → Xero/MYOB/QuickBooks bill push (accounts payable)
- Xero App Store application (submit early — review takes 4–8 weeks)
- MYOB App Marketplace listing
- QuickBooks App Store listing

**Success metric:** 20 paying customers (AUD $580+ MRR)

**Honest truth:** Xero's App Store review is thorough — they check OAuth implementation, privacy policy, error handling, UI quality, and security. A rejection adds 4–8 weeks. Submit when genuinely polished. QuickBooks App Store is less strict — list there first to build social proof before the Xero review.

---

### MRR + Milestone Timeline

| Milestone                                       | Realistic          | Optimistic  | Pessimistic |
| ----------------------------------------------- | ------------------ | ----------- | ----------- |
| Working validator live                          | Week 2             | Week 1      | Week 3      |
| First successful Peppol send                    | Week 13            | Week 10     | Week 18     |
| **ATO eInvoicing Ready+ application submitted** | **End of Phase 2** | **Week 11** | **Week 20** |
| **Listed on ATO eInvoicing Ready register**     | **Month 4**        | **Month 3** | **Month 6** |
| First paying customer                           | Month 5            | Month 3     | Month 8     |
| 10 customers (~$290 MRR)                        | Month 7            | Month 5     | Month 12    |
| 50 customers (~$1,900 MRR)                      | Month 12           | Month 9     | Month 18    |
| 150 customers (~$6,000 MRR)                     | Month 18–20        | Month 14    | Maybe never |

---

## 13. What You Learn Building This

### B2B OAuth at Production Depth

Xero and MYOB use OAuth 2.0 with real-world complexity:

- **Token refresh handling** — silent refresh before expiry, graceful handling of `invalid_grant`
- **Multi-tenant OAuth** — one application, many connected businesses, isolated token storage
- **Webhook security** — HMAC signature verification for Xero/Storecove webhook payloads
- **Rate limiting** — Xero's 60 req/min limit means you need a queue for bulk operations
- **Scope management** — requesting minimum necessary permissions, handling scope changes

This pattern (OAuth B2B integration) is the foundation of the entire fintech and enterprise SaaS ecosystem. Every Stripe integration, every accounting plugin, every HR system integration uses this same architecture.

---

### XML / EDI Document Standards

You will deeply understand:

- **UBL 2.1** (Universal Business Language) — the global standard for electronic business documents
- **XSD schema validation** — validating XML structure programmatically
- **Schematron** — expressing and validating business rules in XML (e.g. "if tax category is S, tax rate must be 10%")
- **The difference between syntactic and semantic validity** — XML can be well-formed but still wrong

These skills transfer to: EDI (electronic data interchange), FHIR (healthcare data), financial reporting standards (XBRL), and any enterprise integration work.

---

### AI-Assisted Document Parsing in Production

Not toy RAG demos — real production document intelligence:

- **Prompt engineering for structured extraction** — getting reliable JSON output from messy real-world PDFs
- **Confidence scoring** — when to trust the AI, when to ask the human
- **Validation pipelines** — always verify LLM output with deterministic rules (ABN checksum, arithmetic checks)
- **Model routing** — send simple docs to cheap models, complex docs to expensive models
- **Fallback handling** — what to do when Claude returns malformed JSON

This is directly applicable to: contract intelligence, medical record processing, financial statement analysis, legal document review — the highest-value enterprise AI use cases.

---

### Compliance-Aware Software Design

Financial software must be designed differently from consumer apps:

- **Immutable audit logs** — never UPDATE or DELETE a sent invoice record
- **Idempotency keys** — what happens if the network call fails halfway? The invoice must not be sent twice
- **Data retention** — ATO requires 5 years minimum for tax records
- **Error states as first-class citizens** — rejected invoices need clear user-facing explanations and retry paths
- **Separation of concerns** — UI never touches the XML generation directly; all business logic in the server layer

These patterns appear in: banking, healthcare, legal technology, government systems — any domain where audit trails matter.

---

### Multi-Tenant SaaS Architecture

Each customer is a business with isolated data:

- **Row Level Security (RLS)** in Postgres — `WHERE organisation_id = auth.uid()` on every query
- **Tenant isolation patterns** — no cross-tenant data leakage possible
- **Scoped background jobs** — retry logic that respects tenant boundaries
- **Per-tenant billing** with Lemon Squeezy's organisation model

This is the architecture of every B2B SaaS product ever built. Once you understand it in one product, you understand it everywhere.

---

### Background Job Orchestration

Invoice delivery is asynchronous:

- **Polling vs webhooks** — when to use each, how to handle both
- **Retry queues with exponential backoff** — standard pattern for unreliable external APIs
- **Dead letter queues** — permanent failure handling, user notification
- **Job deduplication** — preventing double-sends when retries fire
- **Supabase Edge Functions** as a serverless job runner

---

### Accounting Domain Knowledge

After building this you will genuinely understand:

- How Xero and MYOB model invoices, contacts, tax codes, and accounts
- Australian GST rules — what's taxable, exempt, zero-rated, and why
- ABN structure and the ATO checksum algorithm
- The difference between a tax invoice (>$82.50) and a simplified invoice
- TPAR implications (which ties directly back to the TPAR-in-a-Box idea)
- Why accountants care so much about chart-of-accounts structure

This knowledge makes you significantly more valuable to any AU fintech client or accounting software company.

---

## 14. Market & Competition

### Market Size

- ~300,000+ AU businesses in Peppol-affected industries (building, IT, cleaning, courier, security, road freight + government suppliers)
- ~1M+ AU businesses on Xero
- ~600,000+ AU businesses on MYOB
- Target sweet spot: businesses supplying government departments or large corporates — maybe 50,000–80,000 SMBs in immediate pain

At AUD $29–$79/month average, even 1% penetration of the immediate-pain market = **$14,500–$39,500 MRR.**

### Competitors

| Competitor            | Target               | Price              | Gap                                                     |
| --------------------- | -------------------- | ------------------ | ------------------------------------------------------- |
| Avalara               | Mid-enterprise       | $200–$800+/mo      | Too expensive, too complex for SMBs                     |
| Comarch               | Enterprise           | Enterprise pricing | Not for SMBs at all                                     |
| MessageXchange Direct | SMB/enterprise       | $30–$200/mo        | Poor UX, no guided onboarding                           |
| Exedee                | SMB                  | $15–$99/mo         | Limited Xero/MYOB integration                           |
| Storecove Direct      | Developer/enterprise | Per-invoice        | No end-user product — just an API                       |
| Xero Native Peppol    | Xero users           | Bundled (unclear)  | Buried in settings, poor discoverability, complex setup |
| **KORLO**             | **AU SMBs**          | **$29–$149/mo**    | **Clean UX, guided setup, bookkeeper tier**             |

### Why incumbents don't own this space

- **Avalara, Comarch:** Too enterprise-priced and complex. Will never serve a 3-person building company.
- **Xero native:** It exists but it's buried. The discoverability and UX are poor. Xero's job is to build accounting software, not Peppol-specialist tooling.
- **MessageXchange Direct:** Strong in enterprise. No consumer-grade UX. No guided onboarding.
- **Storecove:** An API company. No end-user product.

**The AU SMB UX gap is real and unoccupied.**

---

## 15. Distribution Strategy

### Primary: The Free Validator Tool

The validator is not just a lead magnet — it's a free tool that lives permanently at the top of the funnel.

- SEO: "peppol invoice validator", "is my invoice peppol compliant", "peppol xero", "peppol myob"
- Google search for these terms in 2026 has high commercial intent — people searching are trying to comply _today_
- Every validation generates an email capture ("Save your validation report")
- Power users who validate 5+ invoices manually will convert to paid

**Build the validator in Week 1. Index it by Week 2. It compounds forever.**

---

### Secondary: Bookkeeper Communities

Bookkeepers are force multipliers. One bookkeeper managing 30 SMB clients = 30 potential paying accounts from one relationship.

Key communities:

- **ICB (Institute of Certified Bookkeepers)** — largest AU bookkeeper association, member newsletter, events
- **Australian Bookkeepers Network** — Facebook group (50,000+ members), very active
- **Bookkeeper Hub** — online community, CPE courses
- **MYOB community forums** — very active, bookkeeper-heavy

Approach: sponsor an ICB webinar (~AUD $500), write a guest post for their newsletter, offer 3 months free for ICB members. One webinar can generate 20–50 qualified leads.

---

### Tertiary: SEO Content Strategy

Write once, rank forever:

**High-intent keywords (commercial):**

- `peppol invoice xero` (low competition, high intent)
- `peppol myob` (almost no competition)
- `peppol einvoicing small business australia`
- `how to send peppol invoice`
- `peppol access point australia small business`
- `xero peppol setup 2026`

**Informational keywords (top of funnel):**

- `peppol mandate australia 2026`
- `peppol vs pdf invoice australia`
- `einvoicing australia requirements`
- `PINT A-NZ format explained`

3 posts/month minimum from Month 2 onwards.

---

### Quarterly: Accounting Industry Events

- **AccountEx Australia** — annual accounting technology expo
- **Xero Roadshows** — regional events for Xero partners and users
- **MYOB Partner Connect** — annual partner event
- **ICB National Conference**

Sponsoring one per year (~AUD $1,000–$3,000) puts you in front of 200–500 bookkeepers and accountants simultaneously.

---

### ATO eInvoicing Ready Register

The ATO maintains a list of "eInvoicing Ready" software providers. Getting listed here:

- Provides government-backed credibility
- Drives organic inbound from businesses specifically looking for compliant tools
- Free to apply

Apply once you have a working product and Xero App Store listing.

---

## 16. Risks & Kill Conditions

### 🔴 Critical Risks

**Xero builds this natively and makes it prominent**

Xero has Peppol support. The risk is they improve discoverability and UX significantly.

_Mitigation:_ Focus on the bookkeeper tier (multi-client management) — Xero will never build that. Focus on MYOB users — Xero won't serve them. Build the "Xero + MYOB + PDF" unified layer that neither platform will build.

---

**B2B sales cycle is slow (the biggest day-to-day frustration)**

Unlike developer tools, SMBs don't sign up at midnight and pay instantly. The cycle: finds validator via Google → validates an invoice → returns next week → signs up for free → sends 3 free invoices → upgrades to paid. This takes 2–6 weeks per customer.

_Mitigation:_ Invest in the free tier UX heavily — make the free experience so good that upgrade is obvious. Add an in-app prompt: "You've used 2 of your 3 free invoices this month. Upgrade to send unlimited."

---

**Access Point per-invoice costs compress Bookkeeper margin**

At 500 invoices/month at $0.25 each = $125 in pass-through costs on a $149 plan.

_Mitigation:_ Negotiate a flat monthly rate with Storecove at volume. Typically achievable at 500+ invoices/month. Until then, the Bookkeeper tier is a loss leader that pays back through LTV and word-of-mouth.

---

**Mandate scope never expands to private B2B**

Currently the mandate only covers government NCEs. Private sector is voluntary. If adoption stays voluntary, the addressable market grows slowly.

_Mitigation:_ The mandatory wedge (government suppliers) is already large. Don't wait for B2B mandate — position for the "your government client rejected your invoice" use case which is happening now.

---

**Xero API pricing changes make your margins unviable**

Xero changed to usage-based API pricing in early 2026. High-volume usage could add unexpected costs.

_Mitigation:_ Monitor Xero API usage per customer. Build in a circuit breaker — if a single customer generates abnormal API calls (scraping behaviour), rate-limit them.

---

### 🟡 Moderate Risks

**Storecove raises their per-invoice pricing**

You're dependent on your Access Point partner's pricing.

_Mitigation:_ Build the abstraction layer cleanly from day one so you can swap Access Point providers without touching your product code. Don't hard-code Storecove anywhere — use an interface.

```typescript
interface PeppolAccessPoint {
  sendInvoice(
    xml: string,
    senderABN: string,
    receiverABN: string,
  ): Promise<DeliveryResult>;
  checkDeliveryStatus(documentId: string): Promise<DeliveryStatus>;
  registerEndpoint(abn: string): Promise<RegistrationResult>;
}
```

**Regulatory change: Peppol mandate extended or delayed**

Government mandates can be delayed, softened, or amended. A delay reduces urgency.

_Mitigation:_ The validator tool still has value regardless of mandate status. Pivot messaging to "your large client may require this soon" if the mandate softens.

**Support burden from non-technical SMB users**

SMB owners are not developers. When something goes wrong, they don't read error messages — they call you. A single bad batch of rejections can generate 20 support tickets.

_Mitigation:_ Invest in rejection message translation — every possible Peppol network rejection code must have a plain-English explanation with a specific fix. Write the FAQ before the support tickets arrive.

---

## 17. Quick Reference

|                                   |                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| **Product name**                  | Korlo                                                                               |
| **Primary market**                | Australia (NZ secondary)                                                            |
| **Regulatory driver**             | ATO Peppol mandate — July 2026 (live)                                               |
| **Architecture**                  | Access Point reseller (Storecove) + multi-platform accounting layer                 |
| **Accounting platforms**          | Xero (P1) · MYOB (P3) · QuickBooks (P4) · Reckon/Zoho/others via PDF fallback       |
| **ATO certification**             | eInvoicing Ready+ — apply end of Phase 2 at `eInvoicing@ato.gov.au`                 |
| **Certification type**            | DSP partnering with accredited Service Provider (NOT becoming an Access Point)      |
| **Certification validity**        | 12 months, annual renewal                                                           |
| **NZ listing**                    | Free and simultaneous — tick one box on AU application form                         |
| **AI usage**                      | Claude API for PDF invoice extraction only                                          |
| **Cost per invoice (send)**       | ~AUD $0.25–$0.30 (pass-through to Access Point)                                     |
| **Cost per PDF extraction**       | ~$0.01 (Claude Haiku)                                                               |
| **Starting capital needed**       | AUD <$5k                                                                            |
| **Time to validator live**        | Week 2                                                                              |
| **Time to first Peppol send**     | Week 13 (realistic)                                                                 |
| **Time to ATO listing**           | ~Month 4 (realistic)                                                                |
| **Time to first paying customer** | ~Month 5 (realistic)                                                                |
| **Target MRR at 24 months**       | $6,000–$9,000 (150–200 customers)                                                   |
| **Pricing tiers**                 | Free · AUD $29 Starter · AUD $79 Pro · AUD $149 Bookkeeper                          |
| **Bookkeeper billing model**      | Flat rate — unlimited client orgs at $149/mo                                        |
| **Volume tier direction**         | Data-driven — `has_external_bookkeeper` analytics drive timing                      |
| **Hybrid billing rule**           | `billing_owner_user_id = NULL` (org pays) OR `= bookkeeper_id` — mutually exclusive |
| **Multi-tenancy model**           | Unified Account Model at launch · Bookkeeper Split Mode in Phase 4 (additive)       |
| **User roles**                    | owner · admin · bookkeeper · viewer                                                 |
| **Founder protection**            | Org creator cannot be removed or downgraded by invited members                      |
| **ABN conflict resolution**       | `org_claim_requests` flow — ABR name match + owner approval                         |
| **Mobile platform**               | React Native (iOS + Android)                                                        |
| **Mobile offline**                | Read all invoices + create/edit drafts offline — sync on reconnect                  |
| **Mobile auth storage**           | `react-native-keychain` — token hash in DB, never raw token                         |
| **Mobile push**                   | FCM (Android) + APNs (iOS) — `device_tokens` table                                  |
| **Payments**                      | Lemon Squeezy (AU GST auto-handled)                                                 |
| **Auth**                          | Supabase magic link + email/password + Google OAuth                                 |
| **Primary DB**                    | Supabase Postgres with RLS — 36 tables                                              |
| **Schema reference**              | `database-schema.md` v2.2.0                                                         |
| **Hosting**                       | Vercel (edge functions)                                                             |
| **Primary distribution**          | Free validator SEO + bookkeeper communities + ATO Ready register                    |
| **Key moat**                      | AU SMB UX + bookkeeper multi-platform tier + founder-protected access control       |
| **Kill condition**                | Xero makes native Peppol prominent + bookkeeper-ready                               |

---

### Side-by-Side: KORLO vs FRONTLINE

| Dimension                | Korlo                                          | FRONTLINE (Mock Interview)   |
| ------------------------ | ---------------------------------------------- | ---------------------------- |
| **Urgency**              | 🟢 Real pain right now                         | 🟡 Perennial, not urgent     |
| **Revenue per customer** | 🟢 AUD $29–$149/mo                             | 🟡 USD $19/mo                |
| **Sales cycle**          | 🔴 Weeks (B2B trust)                           | 🟢 Minutes (self-serve)      |
| **Visibility for jobs**  | 🔴 Low (compliance tool)                       | 🟢 High (AI product)         |
| **AI learning depth**    | 🟡 Practical document parsing                  | 🟢 Voice, agents, evals, RAG |
| **Content maintenance**  | 🟢 Low (spec rarely changes)                   | 🔴 High (React changes fast) |
| **Moat**                 | 🟢 AU regulatory + multi-platform PDF fallback | 🟡 Calibration + content     |
| **Build difficulty**     | 🔴 Harder (XML + OAuth + network)              | 🟡 Medium (voice pipeline)   |

**Strategic recommendation:** Build the Peppol validator (2 hrs) this weekend to test demand. Build FRONTLINE as your parallel AI-learning vehicle. By month 6 you may have both generating income and two portfolio pieces that each tell a different story about your engineering capability.

---

## 18. User Roles & Multi-Tenancy Model

### 18.1 What is a Bookkeeper (AU Context)

A bookkeeper is a professional who manages the day-to-day financial records of multiple small businesses simultaneously — as a contractor or outsourced service. They are **not** the business owner.

| Person                   | Who they are                         | What they do                                                        |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------- |
| **Business owner (SMB)** | Mick — owns the painting business    | Runs the business, earns the money                                  |
| **Bookkeeper**           | Jane — contractor serving 15 clients | Records transactions, sends invoices, reconciles bank, prepares BAS |
| **Accountant**           | David at Smith & Partners            | Lodges tax returns, financial advice, end-of-year                   |

**Why bookkeepers matter for this product:**

- Regulated by the TPB — BAS agents hold formal registration
- A single bookkeeper typically manages **10–50 small business clients** simultaneously
- Communities: ICB (Institute of Certified Bookkeepers), Australian Bookkeepers Network (50k+ Facebook members)
- One bookkeeper recommending this product = 10–50 businesses. Force multiplier acquisition channel.
- Higher LTV, lower churn, lower support burden per client vs direct SMB acquisition

---

### 18.2 Unified Account Model — Launch Strategy

**Decision:** All users manage one or more organisations. An SMB owner has one. A bookkeeper has many. The schema and UI treat them identically at launch — there is no "account type."

**Why this is right for launch:**

- Simpler schema — one model serves everyone
- Faster to build — no branching onboarding logic
- SMB owners are just bookkeepers with one client (themselves)
- Bookkeeper multi-client dashboard comes in Phase 4, not Phase 1

---

### 18.3 Bookkeeper Split Mode — Phase 4

When the Bookkeeper tier fully launches (Phase 4), two distinct personas are introduced:

- **SMB Owner persona** — logs in, lands on their org's dashboard directly
- **Bookkeeper persona** — logs in, lands on a client list first

**What changes (additive only — zero migration):**

- `profiles.user_type` column: `'smb_owner'` | `'bookkeeper'`
- `organisation_members.is_external_manager` column: `true` when a bookkeeper manages an org as a client
- New bookkeeper dashboard view
- New onboarding fork: "My own business" vs "Managing clients"

---

### 18.4 Role Permissions

| Permission                  | owner | admin | bookkeeper | viewer |
| --------------------------- | ----- | ----- | ---------- | ------ |
| View invoices               | ✅    | ✅    | ✅         | ✅     |
| Send invoices               | ✅    | ✅    | ✅         | ❌     |
| Create/edit invoices        | ✅    | ✅    | ✅         | ❌     |
| Connect accounting platform | ✅    | ✅    | ❌         | ❌     |
| Manage team members         | ✅    | ✅    | ❌         | ❌     |
| Manage billing              | ✅    | ❌    | ❌         | ❌     |
| Delete organisation         | ✅    | ❌    | ❌         | ❌     |
| Remove/downgrade founder    | ❌    | ❌    | ❌         | ❌     |
| Remove themselves (leave)   | ✅    | ✅    | ✅         | ✅     |

> DB stores `'bookkeeper'`. UI shows **"Bookkeeper / Accountant"**.

---

### 18.5 The Founder Concept

Every organisation has exactly one **founder** — the person who created it. Founders are permanently protected: they cannot be removed or downgraded by any invited member including other owners.

**Why this matters:**

- Flow A: Mick creates org → Mick is founder → Jane joins. Jane cannot remove Mick.
- Flow B: Jane creates org for Mick → Jane is founder → Mick joins as owner. Mick cannot accidentally lock Jane out.

Prevents the most common multi-user disaster: an invited owner removing the real business owner from their own account.

---

## 19. SMB + Bookkeeper Operational Scenarios

### 19.1 Flow A — SMB Invites Bookkeeper

Mick has his own account. He invites Jane to help manage invoices.

```
Mick creates org → Settings → Team → Invite Member
Enter Jane's email → role: Bookkeeper → Jane accepts
```

| Attribute                 | Value                                   |
| ------------------------- | --------------------------------------- |
| Mick's `is_founder`       | `true`                                  |
| Jane's `is_founder`       | `false`                                 |
| Jane's `invited_by`       | `mick_user_id`                          |
| `billing_owner_user_id`   | `NULL` — Mick pays his own Starter plan |
| `has_external_bookkeeper` | `true`                                  |
| If Jane leaves            | Mick completely unaffected              |
| If Mick leaves            | Jane loses access to this org           |

---

### 19.2 Flow B — Bookkeeper Creates Org, Invites SMB

Jane onboards a new client (Mick). Mick has no account yet.

```
Jane (Bookkeeper plan) → Add Client → Create org for Mick
Jane invites Mick as Owner → Mick accepts
```

| Attribute                 | Value                                        |
| ------------------------- | -------------------------------------------- |
| Jane's `is_founder`       | `true`                                       |
| Mick's `is_founder`       | `false`                                      |
| Mick's `invited_by`       | `jane_user_id`                               |
| `billing_owner_user_id`   | `jane_user_id` — Jane's plan covers this org |
| `has_external_bookkeeper` | `false` — Jane is founder, not external      |
| If Jane's plan lapses     | Mick's org loses subscription coverage       |
| Mick wants independence   | Must go through Org Claim flow               |

---

### 19.3 ABN Conflict — Org Claim Flow

When an SMB tries to sign up and their ABN is already registered (Jane created it):

```
Mick signs up → ABN uniqueness check fires
UI: "This ABN is already registered. Claim ownership or request access."
        ↓
Mick submits claim → ABR name match verification passes
Jane notified → approves
        ↓
Mick becomes owner of existing org (same invoice history — nothing lost)
Jane stepped down to bookkeeper role
```

**Billing on approval:**

| `transfer_billing` | Result                                                     |
| ------------------ | ---------------------------------------------------------- |
| `false`            | Jane still pays — Mick is owner, Jane's plan covers it     |
| `true`             | Mick gets free-tier subscription. Jane's count decrements. |

**Auto-approve case:** If Jane created the org but it has no other owner, and ABR name match passes — the claim auto-approves without requiring Jane's manual decision.

---

## 20. Billing Model Decisions

### 20.1 Hybrid Billing — Who Pays

An organisation's billing attaches to either the org itself or a bookkeeper user — **never both simultaneously.**

| State                         | Who pays                     | Schema                                 |
| ----------------------------- | ---------------------------- | -------------------------------------- |
| SMB manages their own org     | Mick pays directly           | `billing_owner_user_id = NULL`         |
| Bookkeeper manages client org | Jane pays via flat-rate plan | `billing_owner_user_id = jane_user_id` |

Transition between these states only via the `org_claim_requests` flow.

---

### 20.2 Bookkeeper Plan — Flat Rate Confirmed

**Decision: AUD $149/month flat rate — unlimited client orgs.**

Flat rate regardless of client count. A bookkeeper with 3 clients pays the same as one with 40.

**Why:** Simple to sell. No billing anxiety at tier boundaries. Bookkeepers don't hesitate to add clients. Industry standard (Xero Partner, Karbon, Practice Ignition all flat rate).

**Rejected alternatives:** per-client tiers (adds anxiety), per-user seats (conflicts with flat-rate model).

---

### 20.3 Volume Tier Roadmap

**Current model:** Flat rate with fixed invoice limits per tier.
**Future direction:** Volume tiers based on `invoices_sent_mtd` when data justifies it.

The infrastructure (`invoices_sent_mtd`, `invoices_limit`, `has_external_bookkeeper`) already exists in the schema. Introducing volume tiers means updating `invoices_limit` per plan — zero schema migration.

**The data trigger:** When analytics show bookkeeper-managed orgs consistently send 3–4× more invoices than self-managed orgs, volume tiers are justified. Until then, flat rate ships faster and creates less support overhead.

---

## 21. Mobile App — React Native

### 21.1 Platform Decision

**React Native confirmed** (not Flutter). Reasons: same TypeScript/React stack, faster to ship, shared business logic with web, first-class Supabase support.

**Platforms:** iOS and Android simultaneously from day one.

---

### 21.2 Core Mobile Features

The primary use case: SMB owner finishes a job on-site, sends the invoice immediately from their phone.

| Feature                                          | Priority  |
| ------------------------------------------------ | --------- |
| Send Peppol invoice from phone                   | 🔴 Core   |
| Invoice status (delivered/acknowledged/rejected) | 🔴 Core   |
| Push notification — invoice rejected             | 🔴 Core   |
| Push notification — invoice delivered            | 🟠 High   |
| Camera scan → PDF → Peppol                       | 🟠 High   |
| File picker → PDF → Peppol                       | 🟠 High   |
| Create draft invoice offline                     | 🟡 Medium |
| Multiple device sessions + remote sign-out       | 🟡 Medium |
| Force app update enforcement                     | 🟢 Ops    |

**Not in mobile v1:** Xero/MYOB connection management, team member invites, billing management.

---

### 21.3 Offline Support Strategy

**Decision: Offline read + write for drafts.**

**Works offline:** View all sent invoices (cached) · Contact list (last 30 days) · Create/edit draft invoices

**Requires network:** Sending Peppol invoices · Xero/MYOB sync · ABN lookups

**Conflict rule:** A sent invoice is always server-authoritative. If a draft was sent from web while offline edits exist on mobile — server wins, offline edits discarded with clear notification.

**Local storage:** WatermelonDB (SQLite) for documents · MMKV for session/auth state

**Session security:** Raw tokens in `react-native-keychain` only. DB stores SHA-256 hash. Tokens never touch the database.

---

## 22. Credit Note Flow

### The Three-Invoice Chain

When a sent invoice needs correcting, the flow is always: original invoice → credit note → replacement invoice. Never edit a sent Peppol invoice in place — it's immutable on the network.

```
INV-043 sent and acknowledged by Dept of Finance
        ↓
Scope changes — Mick needs to correct the amount
        ↓
Step 1: Create credit note (CN-001) referencing INV-043
        related_document_id = INV-043
        relationship_type   = 'credit_note_for'
        total_amount        = -(INV-043 total)  ← negative amount, cancels the original
        ↓
Step 2: Send CN-001 via Peppol
        Government receiver matches it to INV-043 and nets to zero
        ↓
Step 3: Create new invoice (INV-044) with correct amounts
        Send via Peppol — this is the payable invoice
```

**UI flow:**

- "Cancel and reissue" button on any acknowledged/delivered invoice
- System auto-creates the credit note draft — user reviews, sends
- System auto-opens new invoice draft pre-populated from the original — user edits amounts, sends
- Dashboard shows the three-invoice chain linked together

**What the Peppol network requires:**

- Credit note must include the original invoice's document number in `billing_reference`
- Credit note amounts must be negative in the PINT A-NZ XML
- Replacement invoice is a fresh document — not a version of the original

**Schema:** `related_document_id` + `relationship_type = 'credit_note_for'` on `documents` already handles this. The three-document chain is queryable in one join.

---

## 23. Operational UX Patterns

### 23.1 Wrong Org Context Guard

Bookkeepers managing 25+ clients face a real risk: being in the wrong org context and sending an invoice from Client A's account when they meant Client B.

**Mitigation — pre-send confirmation screen:**

Every Peppol send (single and bulk) shows a confirmation step:

```
┌─────────────────────────────────────────────┐
│  Confirm invoice send                        │
│                                              │
│  Sending as:                                 │
│  🏢 Mick's Painting Pty Ltd                  │
│  ABN: 12 345 678 901                         │
│                                              │
│  Invoice: INV-043                            │
│  To: Department of Finance                   │
│  Amount: AUD $4,200.00 (incl. GST)           │
│                                              │
│  [Cancel]          [Send Invoice →]          │
└─────────────────────────────────────────────┘
```

One additional click, zero friction for correct sends. Catches wrong-org errors before they reach the network. Not a schema change — a mandatory UI pattern for all send flows.

### 23.2 Founder Leaves Their Own Organisation Guard

Before allowing a founder to leave their own org (`deleted_at` set on their member row), the application must check for at least one other active owner.

**Application-level guard:**

```typescript
const canFounderLeave = async (orgId: string, founderId: string) => {
  const { count } = await supabase
    .from("organisation_members")
    .select("id", { count: "exact" })
    .eq("org_id", orgId)
    .eq("role", "owner")
    .eq("is_founder", false) // other owners, not the founder
    .is("deleted_at", null)
    .not("accepted_at", "is", null);

  return count > 0;
};

// If canFounderLeave() returns false:
// Show: "You must transfer ownership to another team member before leaving.
//        Go to Settings → Team to assign a new owner."
```

This prevents org orphaning — a state where no owner exists and the org becomes unmanageable.

---

## 24. Improvements Backlog

These are confirmed good ideas but not critical path. Prioritise when the product is stable post-Phase 2.

### 24.1 Network Health Status Page

Build `status.yourproduct.com.au` showing:

- Storecove API uptime (last 24hrs)
- Recent delivery success rate across all transmissions
- Any known issues with specific receivers (e.g. "ATO endpoints slow — monitoring")

**Why it reduces support significantly:** When Mick's invoice bounces, his first instinct is to google "is Peppol down." A status page means he finds your page, sees a known issue with an ETA, and waits calmly instead of opening a ticket.

**Cost to build:** ~2 hours using a tool like Instatus ($0/month free tier) or a simple Supabase query to your `peppol_status_events` table.

---

### 24.2 "Send Test Invoice to Yourself" Onboarding Feature

During onboarding, let the user send a test Peppol invoice to a Storecove sandbox receiver before their first real send.

**Why it matters:** The "it actually worked!" moment is your single best retention tool. A user who has successfully sent a test invoice converts to paying at a dramatically higher rate than one who hasn't. Removes the fear of "what if I accidentally send a real invoice to the wrong department?"

**Implementation:** Storecove provides sandbox endpoints. A "Send test invoice" button in the onboarding wizard (Step 4) that sends to a Storecove test ABN — no real network delivery. Shows the full status flow: submitted → delivered → acknowledged. Takes ~1 hour to implement.

---

### 24.3 Xero/MYOB Daily Reconciliation Job

Add a daily background job that compares invoice statuses between your DB and Xero/MYOB for the last 30 days, flagging any discrepancies.

```
job_type: 'xero.reconcile_invoice_statuses'
Schedule: Daily at 3am AEST
Action:
  - Pull last 30 days of invoices from Xero API
  - Compare status with documents table
  - Flag discrepancies (e.g. "marked paid in Xero but unpaid in our DB")
  - Log to audit_logs, notify org owner if significant
```

**Why:** Xero webhooks occasionally miss status changes. This catches any drift so Mick's dashboard always reflects reality. The `document_payments` sync is your first line of defence — this is the safety net.

---

## 25. Research & Reference Materials

All PINT A-NZ spec research, regulatory documentation, and API references are maintained in a **NotebookLM notebook** called "Korlo" (ID: `f0224748-53da-4239-a79c-1eefe84ec805`).

Query it before writing any Peppol code. IBT numbers, schematron rule IDs, UBL element paths, and ATO certification requirements are exact — guessing them causes invoice rejections.

| Source                        | Covers                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `bis.pdf`                     | PINT A-NZ BIS spec — mandatory fields, UBL structure, IBT numbers, tax codes |
| `compliance.pdf`              | Schematron business rules — the exact rules your XML must pass               |
| `release-notes.pdf`           | Spec version history — what changed between releases                         |
| Storecove API docs            | Integration implementation — payload format, endpoints, webhooks             |
| ABR web services              | ABN lookup API — response format, field names, GUID auth                     |
| ATO DSP eInvoicing page       | DSP certification pathway — Ready vs Ready+, AP vs DSP partner               |
| eInvoicing Ready assessment   | Certification requirements — evidence and screenshots needed                 |
| ATO eInvoicing for government | Mandate timeline — which NCEs must comply when                               |
| NZ einvoicing.govt.nz         | NZ-specific requirements — NZBN scheme, MBIE certification                   |
| Peppol BIS 3.0 global docs    | Global Peppol network context                                                |
| Peppol Practical validation   | XML validator docs — VESID strings, API usage                                |

**External validation tools used during development:**

- **Peppol Practical** — `peppol.helger.com` — API-based PINT A-NZ XML validator. VESID: `org.peppol.pint.aunz:invoice:1.1.2`
- **ecosio validator** — `ecosio.com/en/peppol-and-xml-document-validator` — browser-based XML validator with formatted error output

See [Section 4.4.3](#443-development-validation-tools--what-you-use-not-what-you-build) for full usage details.

---

_Last updated: May 2026 · Built in Sydney, Australia_
_Regulatory references: ATO eInvoicing, PINT A-NZ specification v1.1.2, Storecove AU API docs, ATO eInvoicing Ready Product Assessment_
_ATO contact: eInvoicing@ato.gov.au · NZ Peppol Authority: support@nzpeppol.govt.nz_
_Schema reference: database-schema.md v2.2.0 — 36 tables across web + mobile_
