# Product

## Register

brand

## Users

Australian SMB owners and bookkeepers. Not technical. Arrive via invoice rejection, ATO mandate anxiety, or word of mouth from their accountant. Primary device is often a phone. They fear complexity and jargon; they trust tools that look like they understand local business.

## Product Purpose

Peppol Bridge makes Australian Peppol e-invoicing accessible to SMBs who can't afford to ignore the July 2026 mandate but don't have an IT team. Phase 0 captures leads via an ABN lookup tool and waitlist. Phase 1 onward delivers the full invoicing product. Success looks like: a business owner signs up, connects Xero, and sends their first compliant invoice without reading a manual.

## Brand Personality

Approachable, simple, Australian. The tone is a local accountant who happens to know the tech — confident without being corporate, plain-spoken without dumbing things down. Not startup energy. Not government energy. The kind of tool you'd recommend to your neighbour's small business.

## References

Xero: the fintech credibility and local trust that Australian SMBs already have. Competent, clean, nothing to prove. That's the register to aim for.

## Anti-references

- Generic SaaS clones: Notion/Linear purple gradients, glassmorphism, hero metrics, identical icon-card grids.
- Government / ATO visual language: dated, bureaucratic, low-contrast, compliance-hostile.
- Enterprise bloatware: dense, cold, SAP/Oracle energy.
- Crypto / Web3: neon on black, aggressive motion, speculative framing.

## Design Principles

1. **Compliance without dread.** Every screen should make the regulatory complexity feel solved, not surfaced. The user should feel calm, not warned at.
2. **Earned trust over performed credibility.** No badges, seals, or star ratings as decoration. Trust comes from clarity of information and correctness of detail.
3. **Local specificity.** ABN, GST, ATO — use the right Australian terms, spell them right, never genericise. This product exists because of a specific regulatory context.
4. **One job per screen.** SMB owners are context-switching constantly. Every view should have one clear primary action and no competing priorities.
5. **Speed to value.** Time from landing to "I understand what this does and what it costs me" should be under 30 seconds.

## Accessibility & Inclusion

WCAG 2.1 AA. Colour is never the sole means of conveying status (use icon + label alongside colour for Peppol registration states). Minimum 4.5:1 contrast ratio on all body text.

## Build Phases

| Phase | Focus | Status |
| ----- | ----- | ------ |
| **0** | ABN lookup tool · Landing page · Email capture | In progress |
| **1** | PINT A-NZ XML generation · Xero OAuth · Dashboard · Auth | Planned |
| **2** | Peppol send via Storecove · Webhooks · Lemon Squeezy billing | Planned |
| **3** | Peppol receive · MYOB integration · Mobile (React Native) | Planned |
| **4** | Bookkeeper Split Mode · Multi-client dashboard · API keys | Planned |
