# Peppol Bridge — Agentic Workflow Master Summary
**Date:** May 2026 | **Status:** Pre-Phase 0 | **Schema:** v2.2.0

This document summarises every decision, recommendation, and implementation plan discussed and agreed upon for the Peppol Bridge agentic development workflow.

---

## 1. Files Created (Already Done)

### `CLAUDE.md` — repo root
The standing orders file. Claude Code reads it automatically at every session start.

**What it contains:**
- Full regulatory context (Peppol, PINT A-NZ, ABN/NZBN, Storecove)
- Tech stack (confirmed, do not revisit)
- Absolute rules — amounts in cents as bigint, RLS always active, soft delete only, audit logs append-only
- All 18 confirmed decisions quick-reference
- All 14 existing DB functions (don't reimplement these)
- Supabase patterns and TypeScript rules
- File/folder conventions
- Phase roadmap
- Checkpoint protocol
- Pricing reference
- Full 36-table domain map
- Regulatory quick reference

**Location:** `/CLAUDE.md` in repo root

---

### `/tasks/task-phase-0-abn-peppol-lookup.md` — first task file
The Phase 0 feature work order.

**What it contains:**
- Pre-task checklist (read CLAUDE.md, schema sections, decisions)
- NotebookLM research — confirmed ABR API fields, endpoint, response format
- Confirmed Peppol Directory participant ID format (`iso6523-actorid-upis::0151:{abn}`)
- ABN checksum validation algorithm (pre-filled, no guessing)
- LLM Council pre-task deliberation placeholder
- Known risks (pre-filled)
- Must NOT do list
- Exact file structure with paths
- Supabase cache patterns (upsert, not insert)
- Rate limiting instructions
- Environment variables required
- Three checkpoint definitions
- Council checkpoints (what needs deliberation, what doesn't)
- Full acceptance criteria checklist
- MEMORY.md update instructions after task completion

**Location:** `/tasks/task-phase-0-abn-peppol-lookup.md`

---

### Requirements Files
Three requirements files created:

| File | Location | Purpose |
|------|----------|---------|
| `PROJECT.md` | `/requirements/PROJECT.md` | Top-level project requirements — the why behind the product |
| `requirements-analyst.md` | `.claude/agents/requirements-analyst.md` | Agent that drives requirements discussions |
| `abn-lookup requirements` | `/requirements/features/abn-lookup/requirements.md` | Phase 0 feature requirements with semantic slugs |

---

## 2. Repo Structure to Create

```
/
├── CLAUDE.md                               ← created ✅
├── MEMORY.md                               ← create (empty, ready for [LEARN] tags)
├── requirements/
│   ├── PROJECT.md                          ← created ✅
│   ├── phases/
│   │   └── phase-0.md                     ← write before phase starts
│   └── features/
│       └── abn-lookup/
│           ├── requirements.md            ← created ✅
│           └── discussion-log.md          ← agent writes during discussion
├── tasks/
│   └── task-phase-0-abn-peppol-lookup.md  ← created ✅
│   └── (Phase 1+ features split into three files per feature:)
│       ├── task-{feature}.contract.md     ← API contract, produced in plan mode first
│       ├── task-{feature}-backend.md      ← backend session task file
│       └── task-{feature}-frontend.md     ← frontend session task file
├── contracts/                              ← API contracts (Phase 1+)
│   └── {feature}.contract.md             ← locked before either session starts
├── quality_reports/
│   └── session_logs/                       ← agent writes here after each feature
├── .github/
│   └── workflows/
│       ├── claude-pr-review.yml           ← auto review on every PR (Phase 1)
│       ├── claude-issue-to-pr.yml         ← @claude mention triggers implementation
│       ├── claude-security-review.yml     ← OWASP review on /lib/peppol/** changes
│       └── claude-release-notes.yml       ← auto CHANGELOG on release tag
├── .claude/
│   ├── settings.json                       ← hooks config
│   ├── agents/                             ← subagents
│   │   ├── security-reviewer.md           ← write from scratch (use write-a-skill)
│   │   ├── schema-guard.md                ← write from scratch (use write-a-skill)
│   │   ├── peppol-validator.md            ← write from scratch (use write-a-skill)
│   │   ├── backend-engineer.md            ← parallel sessions (Phase 1+)
│   │   ├── frontend-engineer.md           ← parallel sessions (Phase 1+)
│   │   ├── requirements-analyst.md       ← created ✅
│   │   ├── planner.md                    ← from ECC
│   │   └── architect.md                  ← from ECC
│   ├── skills/                            ← domain skills
│   │   ├── gstack/                        ← from GStack (installed via ./setup)
│   │   ├── mattpocock/                    ← from Matt Pocock (installed via npx)
│   │   ├── strategic-compact/SKILL.md    ← from ECC
│   │   ├── deep-research/SKILL.md        ← from ECC
│   │   ├── council/SKILL.md              ← from ECC
│   │   ├── analyze-repo/SKILL.md         ← from ECC
│   │   └── workflow-discovery/SKILL.md   ← from ECC
│   └── hooks/
│       ├── session-start.js              ← from ECC
│       ├── session-end.js                ← from ECC
│       ├── protect-config.js             ← from ECC
│       └── detect-secrets.js             ← from ECC
└── .claude/settings.json                  ← hooks wired up
```

---

## 3. Subagents to Build (`.claude/agents/`)

### `security-reviewer.md`
- **Role:** Read-only. Reviews for RLS bypasses, hardcoded secrets, service role misuse in client code.
- **Triggers:** Automatically after every feature is built.
- **Extra:** Calls `council` skill (jury mode) on any RLS policy change or amounts handling.
- **Source:** Use Matt Pocock's `write-a-skill` to generate this with proper structure and progressive disclosure.

### `schema-guard.md`
- **Role:** Reads `database-schema.md` before responding. Only job: confirm whether a proposed DB change conflicts with existing tables, columns, or functions.
- **Triggers:** Before any migration or schema suggestion.
- **Source:** Use Matt Pocock's `write-a-skill` to generate this.

### `peppol-validator.md`
- **Role:** Stops Claude Code from guessing IBT numbers, UBL paths, tax codes, schematron rules. Forces a human confirmation before writing any Peppol spec value.
- **Triggers:** Auto-invoked when editing any file in `/lib/peppol/**`.
- **Source:** Use Matt Pocock's `write-a-skill` to generate this — unique to this project, no existing template.

### ~~`tdd-enforcer.md`~~ → **replaced by Matt Pocock `/tdd` skill**
- **Role:** Red-green-refactor loop. Write failing test first, minimal implementation to pass, refactor only after green.
- **Why Matt Pocock wins:** His `tdd` skill is TypeScript-specific, includes guidance on good vs bad tests, mocking patterns, deep modules philosophy, and vertical slices. 20k+ developers use it. Writing a custom agent from ECC's frontmatter format would produce a weaker version.
- **Source:** `npx skills@latest add mattpocock/skills/tdd`

### `requirements-analyst.md` ← created ✅
- **Role:** Drives requirements discussions with the product owner. Reads PROJECT.md + spec + decisions log before asking questions. Challenges assumptions. Drafts requirements docs.
- **Triggers:** Manually invoked when starting a new feature or phase.
- **Source:** Already created.

### `planner.md` (from ECC)
- **Role:** Runs on Opus. Auto-activates for complex feature requests. Produces structured implementation plan with requirements analysis, architecture review, step breakdown with real file paths, and risk identification.
- **Source:** Copy directly from ECC `agents/planner.md`.

### `architect.md` (from ECC)
- **Role:** For architectural decisions (Phase 2+ — Storecove integration, webhook handling, document versioning). Reads existing code and produces architectural recommendations.
- **Source:** Copy directly from ECC `agents/architect.md`.

---

## 4. Skills to Install (`.claude/skills/`)

### From ECC

| Skill | What it does |
|-------|-------------|
| `strategic-compact` | Suggests `/compact` at logical breakpoints. Reduces token burn on Pro plan. |
| `deep-research` | Parallel research agents + synthesis. Replaces manual multi-angle Claude.ai queries. |
| `council` | Four-voice deliberation using subagents. Replaces LLM Council/OpenRouter for everyday decisions. |
| `analyze-repo` | Reads codebase structure before planning. Feeds context to `planner` agent. |
| `workflow-discovery` | Finds existing code patterns before building anything new. Code-layer equivalent of `schema-guard`. |

```bash
git clone https://github.com/affaan-m/everything-claude-code /tmp/ecc

cp /tmp/ecc/skills/strategic-compact/SKILL.md .claude/skills/strategic-compact/SKILL.md
cp -r /tmp/ecc/.agents/skills/deep-research .claude/skills/
cp /tmp/ecc/skills/council/SKILL.md .claude/skills/council/SKILL.md
cp /tmp/ecc/skills/analyze-repo/SKILL.md .claude/skills/analyze-repo/SKILL.md
cp /tmp/ecc/skills/workflow-discovery/SKILL.md .claude/skills/workflow-discovery/SKILL.md
cp /tmp/ecc/agents/planner.md .claude/agents/planner.md
cp /tmp/ecc/agents/architect.md .claude/agents/architect.md
cp /tmp/ecc/hooks/session-start.js .claude/hooks/
cp /tmp/ecc/hooks/session-end.js .claude/hooks/
cp /tmp/ecc/hooks/protect-config.js .claude/hooks/
cp /tmp/ecc/hooks/detect-secrets.js .claude/hooks/
```

### From GStack

| Skill (slash command) | Role | When to use |
|-----------------------|------|------------|
| `/office-hours` | YC Partner | Before every new phase. Pressure-tests product direction, challenges premises, produces design doc. |
| `/autoplan` | Review Pipeline | Before every major feature. Runs CEO → design → eng review in one command. |
| `/plan-eng-review` | Eng Manager | Forces architecture diagrams, data flow, edge cases before coding. Hidden assumptions surface early. |
| `/cso` | Chief Security Officer | OWASP Top 10 + STRIDE audit. Run at every Feature Complete checkpoint. Critical for compliance SaaS. |
| `/review` | Staff Engineer | Code review at Integration and Feature Complete checkpoints. Alongside security-reviewer subagent. |
| `/investigate` | Debugger | Iron Law: no fixes without investigation. Use when something breaks and you have no context. |
| `/document-release` | Technical Writer | After every feature ships — keeps CLAUDE.md, requirements docs, spec in sync. |
| `/retro` | Eng Manager | Weekly review of what shipped, what drifted, what to fix. |
| `/careful` | Safety Guardrails | Warns before `rm -rf`, `DROP TABLE`, force-push, `git reset --hard`. |
| `/guard` | Full Safety | Combines `/careful` + `/freeze`. Use for all production DB work and schema migrations. |

**GStack skills to skip for now:**
- `/codex` — requires OpenAI Codex CLI, already have LLM Council for multi-model review
- `/design-*` skills — low priority until Phase 1 UI exists
- `/canary`, `/benchmark` — post-Phase 1 when deployed
- `/browse`, `/setup-browser-cookies` — not needed yet

**Install GStack (one command):**
```bash
git clone https://github.com/garrytan/gstack ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup
```

The `./setup` script handles symlinks, global state, and Claude Code registration automatically. Run `/gstack-upgrade` at the start of each phase to stay current.

### From Matt Pocock

Matt Pocock is the creator of Total TypeScript. These skills focus on workflow enforcement — TypeScript-first, production-grade, no vibe coding.

**Install setup skill first (scaffolds per-repo config other skills need):**
```bash
npx skills@latest add mattpocock/skills/setup-matt-pocock-skills
```

| Skill | What it does | When to use |
|-------|-------------|------------|
| `tdd` | Red-green-refactor loop. TypeScript-specific guidance on good/bad tests, mocking, vertical slices. Replaces planned tdd-enforcer. | Every feature implementation |
| `git-guardrails-claude-code` | Blocks `git push --force`, `git reset --hard`, `git clean -f`. Complements existing hooks (different scope). | Setup once per repo |
| `setup-pre-commit` | Husky + lint-staged + Prettier + tsc + tests. Runs before every commit regardless of who commits. | Setup once per repo |
| `prd-to-issues` | Breaks any requirements doc or task file into independently-shippable GitHub issues via vertical slices. | After every requirements doc is approved |
| `ubiquitous-language` | Extracts a DDD-style glossary from conversation. Critical for Peppol domain terms — IBT, UBL, PINT A-NZ, AP, SMP, scheme ID. | After requirements discussions, feed into CLAUDE.md |
| `write-a-skill` | Generates properly structured skills with progressive disclosure and frontmatter. Use to create security-reviewer, schema-guard, peppol-validator. | When writing any new custom skill |
| `triage-issue` | Investigate bug → identify root cause → file GitHub issue with TDD fix plan. Complements GStack `/investigate`. | When a bug needs formalising as a tracked issue |
| `zoom-out` | Pulls agent back to higher-level perspective on unfamiliar code. Useful at 10pm when lost in detail. | Mid-session when context is lost |
| `caveman` | Ultra-compressed communication mode. Cuts token usage ~75%. Complements ECC `strategic-compact`. | Long sessions on Pro plan |
| `request-refactor-plan` | Creates a detailed refactor plan with tiny commits via user interview, filed as a GitHub issue. | Phase 2+ when refactoring Phase 1 code |

**Install core picks:**
```bash
npx skills@latest add mattpocock/skills/tdd
npx skills@latest add mattpocock/skills/git-guardrails-claude-code
npx skills@latest add mattpocock/skills/setup-pre-commit
npx skills@latest add mattpocock/skills/prd-to-issues
npx skills@latest add mattpocock/skills/ubiquitous-language
npx skills@latest add mattpocock/skills/write-a-skill
npx skills@latest add mattpocock/skills/triage-issue
npx skills@latest add mattpocock/skills/zoom-out
npx skills@latest add mattpocock/skills/caveman
```

**Matt Pocock skills to skip:**
- `write-a-prd` — your `requirements-analyst` agent is more sophisticated (semantic slugs, traceability, regulatory constraints, NotebookLM integration)
- `grill-me` — overlaps with `requirements-analyst` + GStack `/office-hours`, both more powerful
- `design-an-interface` — GStack `/design-shotgun` already in workflow, same concept
- `diagnose` — GStack `/investigate` has Iron Law + structured hypothesis testing, more rigorous
- `migrate-to-shoehorn` — Pocock-specific TypeScript tooling, not relevant to this project
- `scaffold-exercises` — course/tutorial tooling, irrelevant
- `obsidian-vault` — you use NotebookLM, not Obsidian
- `improve-codebase-architecture` — useful Phase 2+ once codebase exists, revisit then

---

## 5. GBrain — Persistent Codebase Memory

GBrain is GStack's companion project — a PostgreSQL-backed knowledge graph that gives Claude Code persistent, searchable memory of your codebase and decisions across sessions.

Since you already have Supabase, use the **existing URL path** — GBrain runs inside the same Supabase project. No new infrastructure.

**Setup:**
```bash
npm install -g gbrain
gbrain init
# Choose: Supabase existing URL
# Paste your Supabase Session Pooler URL
# GBrain auto-registers as an MCP server for Claude Code
```

**Day-to-day usage:**
- `gbrain sources add . --strategy code` — initial index of your repo
- `/sync-gbrain` — re-index after each feature (GStack slash command)
- Claude Code calls `gbrain search` as a first-class MCP tool before writing new code

**What it replaces vs what it complements:**

| | MEMORY.md | GBrain |
|--|-----------|--------|
| Domain knowledge (Peppol, ABN rules) | ✅ You write | ❌ |
| Regulatory constraints | ✅ You write | ❌ |
| Code patterns (TypeScript, Supabase) | Partial | ✅ Auto-indexed |
| Cross-session persistence | Manual | Automatic |
| Searchable by Claude Code | Via session-start hook | First-class MCP tool |

---

## 5b. GitNexus — Structural Code Intelligence (Add at Phase 1)

> **Do not install at Phase 0.** An empty codebase produces a meaningless knowledge graph. Add at Phase 1 once `/lib/abr/`, `/lib/peppol/`, and `/app/lookup/` exist.

GitNexus is a zero-server code intelligence engine. Where GBrain stores semantic patterns, GitNexus builds a structural knowledge graph — every AST, call chain, dependency, and cluster — using Tree-sitter parsing and Leiden community detection. Everything stays on your machine (LadybugDB in `.gitnexus/`). No external dependencies, no data leaves the box.

**What makes it different from GBrain:**
- GBrain: searchable semantic patterns ("how is this used?")
- GitNexus: structural relationships ("what calls this? what breaks if I change it?")
- GitNexus has blast radius analysis — `gitnexus impact normalise_document_number` tells Claude Code exactly which files are affected before touching a shared utility. The compliance-SaaS killer feature.
- GitNexus auto-generates SKILL.md files per detected functional area (in `.claude/skills/generated/`) so Claude Code always has targeted context for the exact module it's working in — without you writing those skill files manually.
- PostToolUse hook auto-reindexes after every commit. GBrain requires manual `/sync-gbrain`.

**Setup (Phase 1):**
```bash
npm install -g gitnexus
npx gitnexus setup          # auto-detects Claude Code, writes MCP config once globally
gitnexus analyze --skills   # index codebase + generate SKILL.md per functional area
gitnexus serve              # start MCP + web UI bridge (port 3000)
```

**Day-to-day:**
- `gitnexus analyze --skills` — re-run when codebase structure changes meaningfully (roughly once per phase)
- PostToolUse hooks handle incremental reindex automatically after each commit
- `gitnexus impact {functionName}` — blast radius before touching shared utilities
- Review `.claude/skills/generated/` after each `--skills` run before committing — auto-generated skills can contain stale descriptions if Leiden clusters oddly

**GBrain vs GitNexus — full comparison:**

| | GitNexus | GBrain | MEMORY.md |
|--|----------|--------|-----------|
| Storage | Local LadybugDB | Supabase (existing) | File |
| What it knows | Code structure, ASTs, call chains | Semantic patterns | Domain/regulatory facts |
| How it learns | Auto — Tree-sitter parses code | Semi-auto — `gbrain sources add` | Manual `[LEARN]` tags |
| Freshness | Auto-reindexes after every commit | Manual `/sync-gbrain` | Manual |
| Blast radius | ✅ `gitnexus impact` | ❌ | ❌ |
| Auto SKILL.md | ✅ Per functional area | ❌ | ❌ |
| External dependency | None — fully local | Supabase (you already have it) | None |
| Privacy | Everything local | Your own Supabase instance | Local file |
| When to add | Phase 1 | Phase 0 | Phase 0 |

**Makes partially redundant:** ECC `analyze-repo` and `workflow-discovery` skills — GitNexus does the same job at AST depth. Keep those skills as lightweight fallbacks, use GitNexus as primary for structural queries.

---

## 6. Hooks (`.claude/settings.json`)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm tsc --noEmit 2>&1 | tail -20"
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/protect-config.js"
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/detect-secrets.js"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "if echo \"$CLAUDE_TOOL_INPUT\" | grep -q '\\-\\-no-verify'; then echo 'BLOCKED: --no-verify is not permitted'; exit 1; fi"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "if echo \"$CLAUDE_TOOL_INPUT\" | grep -q 'supabase db push'; then echo 'SCHEMA CHECKPOINT: Stop and show migration SQL before pushing.'; exit 1; fi"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm tsc --noEmit 2>&1 | tail -20"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-start.js"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-end.js"
          }
        ]
      },
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Update MEMORY.md with any [LEARN] tags from this session'"
          }
        ]
      }
    ]
  }
}
```

**What each hook does:**
- `tsc` on every file write — TypeScript errors surface immediately, not 20 errors stacked at the end. Uses `pnpm tsc` not `npx tsc`.
- `protect-config` — blocks edits to `.eslintrc`, `tsconfig.json`, `biome.json` etc. Forces Claude to fix the actual code
- `detect-secrets` — scans for `sk-`, `ghp_`, `AKIA`, `SUPABASE_SERVICE_ROLE`, `ABR_GUID` before writing to any file
- `--no-verify` block — prevents bypassing git hooks
- `supabase db push` block — enforces schema checkpoint protocol, Claude cannot push a migration without you seeing it first
- `session-start` — loads context from previous session (ECC memory persistence)
- `session-end` — saves session patterns to instincts (ECC continuous learning)

**Note:** Each hook entry uses the correct Claude Code schema — `"hooks"` array with `"type": "command"` — not the old `"command"` string format which causes a settings error on startup.

---

## 7. Memory System

### `MEMORY.md` — repo root (manual, domain knowledge)
Lessons learned. Written manually using `[LEARN]` tags. Read at session start via session-start hook.

**Format:**
```markdown
[LEARN] ABR JSON API returns JSONP format — callback() wrapper must be stripped before JSON.parse()
[LEARN] abn_lookup_cache upsert must use onConflict: 'abn' — ABN has unique index
[LEARN] Peppol Directory "not found" copy must say "not confirmed on Peppol" not "not registered"
[LEARN] Service role key is ONLY permitted in Route Handlers, never in client components
```

### ECC Instincts System (automatic, generic code patterns)
Session-end hook automatically extracts TypeScript/Next.js patterns into reusable instincts with confidence scoring.

### GBrain (automatic, codebase knowledge)
Persistent PostgreSQL-backed memory of your codebase. Searchable by Claude Code via MCP. Re-indexed after each feature via `/sync-gbrain`.

### GStack `/learn` (GStack workflow patterns)
Manages what GStack learned across sessions — review, search, prune, export.

### Three layers together:
- **MEMORY.md** → domain/regulatory knowledge → you write manually
- **ECC instincts** → generic TypeScript/Next.js patterns → auto-extracted
- **GBrain** → codebase-specific patterns and code definitions → auto-indexed

### Session Logs
After each feature, agent writes to `quality_reports/session_logs/YYYY-MM-DD-{feature}.md`.

---

## 8. Requirements System

### Hierarchy
```
requirements/PROJECT.md             ← foundation, written once ✅
    ↓
requirements/phases/phase-N.md      ← per phase, before phase starts
    ↓
requirements/features/{slug}/       ← per feature, before task file
  requirements.md                   ← semantic slug requirements ✅ (abn-lookup done)
  discussion-log.md                 ← agent-driven discussion audit trail
    ↓
tasks/task-{feature}.md             ← every requirement slug maps to acceptance criterion ✅
    ↓
Code
```

### Requirement Slug Format
`{feature-slug}:{requirement-slug}`
Example: `abn-lookup:not-confirmed-copy`

Self-describing, grep-able, directly traceable to task file acceptance criteria.

### Requirements Analyst Agent
Invoked when starting a new feature. Reads PROJECT.md + spec + decisions log before asking questions. Drives back-and-forth discussion, challenges assumptions, flags regulatory values for NotebookLM verification, drafts the doc, marks Approved only after explicit sign-off.

---

## 9. NotebookLM Integration

### Notebook Map
| Question type | Notebook |
|---|---|
| IBT numbers, UBL paths, tax codes, schematron rules | Peppol Bridge (`f0224748`) |
| Storecove API payload, webhooks | Peppol Bridge |
| ABR API fields, status codes | Peppol Bridge |
| ATO certification criteria | Peppol Bridge |
| Claude Code hooks, subagents, CLAUDE.md patterns | Claude Code and AI Agent Dev Resources (`e529448b`) |
| SDK usage, tool calling, streaming | Claude Code Agent SDK and CLI (`b2ce2e98`) |
| Parallel agents, high-throughput | Harness Engineering (`cbb11aec`) |
| Orchestration, agentic OS | AI Agentic OS (`cafc1a86`) |

### Role A — Pre-task research (Claude.ai)
Before writing every task file: query NotebookLM → fill confirmed values → Claude Code receives pre-verified facts, never guesses.

### Role B — Mid-task spec gate (Claude Code)
`peppol-validator` subagent enforces this — stops before writing any IBT number, UBL path, tax code, or scheme ID and asks for confirmation.

---

## 10. LLM Council Integration

### When to use ECC `council` skill (free, everyday decisions)
- Architecture decisions, pre-task failure mode deliberation, ambiguous design questions
- Runs inside Claude Code via subagents — no extra cost

### When to use LLM Council via OpenRouter (paid, compliance-critical)
- Peppol XML generation code review
- Storecove integration code review
- Schema migrations touching billing/amounts (`council-gate` jury mode)
- New RLS policies (`council-gate` jury mode)

**Note:** GStack's `/cso` (OWASP + STRIDE) handles the security audit layer. Use both at Feature Complete: `/cso` for security patterns, LLM Council for compliance-specific code review.

**Install:**
```bash
pip install "llm-council-core[mcp]"
llm-council setup-key
claude mcp add llm-council --scope user -- llm-council
```

**Cost estimate:** AUD $15-25/month on OpenRouter used selectively.

---

## 11. ECC Security Scan (Run Before Coding Starts)

```bash
# Scan your .claude/ config before Phase 0 starts
npx ecc-agentshield scan

# Deep analysis — run once, costs tokens
npx ecc-agentshield scan --opus --stream
```

102 static analysis rules. Catches prompt injection risks, misconfigured agents, token exfiltration vectors in your agent configs.

---

## 12. Remote Control Stack

### For active sessions (laptop open)
**Native Remote Control** (`/rc`) — free with Pro, one session, doesn't survive laptop sleep.

### For persistence (laptop closed)
**Claude Code Routines** (free with Pro — 5/day + unlimited webhook triggers)
Best for: nightly audits, PR triage, deploy checks, doc drift.

**VPS + tmux + Tailscale** (Oracle Always-Free or Hetzner CX22 ~AUD $7.50/mo)
Best for: long-running sessions needing local tooling, MCP servers, dev DB.
Oracle has Sydney + Melbourne regions (AU data residency). Hetzner is cheapest.

### Mobile control
**Happy Coder** (free, open source) — E2E encrypted, push notifications, voice input.
**Claude Code Channels — Telegram** (free) — more hackable, requires Bun.

### Not recommended
- **OpenClaw** — OAuth banned April 2026, 3 high CVEs
- **Tactic Remote** — paid, Happy Coder is better

---

## 13. The Full Daily Workflow (10pm sessions)

```
PHASE START (once per phase — Claude.ai + GStack)
├── /office-hours — YC-style pressure test of phase direction
│   └── Produces design doc to ~/.gstack/projects/
└── /autoplan — CEO → design → eng review in one command
    └── Produces structured phase plan before feature work starts

REQUIREMENTS PHASE (Claude.ai — per feature, ~20-30 min)
├── Invoke requirements-analyst agent
├── Back-and-forth discussion until requirements are solid
├── Run ubiquitous-language skill — extract Peppol/domain glossary if new terms appear
├── Query NotebookLM for spec facts
├── ECC council skill for ambiguous design decisions
├── Agent drafts requirements doc → you approve
├── Run prd-to-issues — break approved requirements into GitHub issues
└── Write task file from approved requirements doc

CODING SESSION (Claude Code — 2hr window)
├── claude --permission-mode auto
├── "Run /analyze-repo first, then read /tasks/[feature].md and start"
├── session-start hook loads MEMORY.md + ECC instincts + GBrain context
├── planner agent auto-activates, reads codebase, generates plan
│
├── SCHEMA CHECKPOINT (you review, 2 min)
│   ├── /guard active — blocks destructive DB commands
│   └── council skill (jury mode) on any DB changes
│
├── INTEGRATION CHECKPOINT (you review, 5 min)
│   └── tsc passes, data flow reviewed
│
├── FEATURE COMPLETE CHECKPOINT (you review, 15 min)
│   ├── /review — staff engineer code review (GStack)
│   ├── /cso — OWASP + STRIDE security audit (GStack)
│   ├── security-reviewer subagent — RLS + service role check
│   ├── council-gate fires on RLS / amounts changes (ECC)
│   └── LLM Council on compliance-critical files (Peppol XML, Storecove)
│
├── DEBUGGING (when something breaks)
│   ├── /investigate — root cause analysis, Iron Law: no fixes without investigation (GStack)
│   ├── /zoom-out — higher-level perspective if lost in detail (Matt Pocock)
│   └── triage-issue — formalise bug as GitHub issue with TDD fix plan (Matt Pocock)
│
└── SESSION END
    ├── /document-release — syncs CLAUDE.md, requirements, spec (GStack)
    ├── session-end hook saves instincts (ECC)
    ├── /sync-gbrain — re-indexes repo changes into GBrain
    ├── MEMORY.md updated with [LEARN] tags
    └── Session log written to quality_reports/session_logs/

WEEKLY
└── /retro — review what shipped, what drifted, what to fix (GStack)

REMOTE MONITORING (phone)
├── Active session: Native /rc or Happy Coder
└── Background jobs: Claude Code Routines

GITHUB AUTOMATION (runs without you — Phase 1+)
├── Every PR opened/updated → claude-pr-review.yml posts structured review as comment
├── @claude mention on any issue → Claude implements + opens PR automatically
├── Changes to /lib/peppol/** → claude-security-review.yml runs OWASP-aligned review
└── Release tag pushed → claude-release-notes.yml generates CHANGELOG.md entry
```

---

## 14. Monthly Cost Budget

| Item | Cost |
|------|------|
| Claude Pro | AUD $31/mo |
| OpenRouter (LLM Council — selective use) | AUD $15-25/mo |
| Hetzner CX22 VPS (optional — Oracle Always-Free if you get it) | AUD $7.50/mo |
| Happy Coder | Free |
| ECC (everything-claude-code) | Free (MIT) |
| GStack | Free (MIT) |
| GBrain | Free (uses existing Supabase) |
| Matt Pocock skills | Free (MIT) |
| AgentShield | Free (open source) |
| GitNexus | Free (MIT, local) — Phase 1 |
| GitHub Actions (claude-code-action) | ~AUD $5–15/mo API usage — Phase 1 |
| **Total (Phase 0)** | **AUD $55–65/mo** |
| **Total (Phase 1+)** | **AUD $70–90/mo** |

AUD $660–780/year (Phase 0). Well inside $5k bootstrap budget with $4k+ remaining.

---

## 15. Task File Templates

### Phase 0 — Single task file (no frontend/backend split yet)

Every Phase 0 task file follows the structure shown in `tasks/task-phase-0-abn-peppol-lookup.md`.

---

### Phase 1+ — Three files per feature (parallel sessions)

From Phase 1 onwards, every feature with a meaningful frontend/backend split produces three files in plan mode before any coding starts:

```
contracts/{feature}.contract.md          ← 1. produced first, locked before sessions start
tasks/task-{feature}-backend.md          ← 2. backend session reads this
tasks/task-{feature}-frontend.md         ← 3. frontend session reads this
```

**Rule:** Both task files must reference the contract. Neither session touches the contract once locked. If either session needs a contract change — stop, flag it, update contract, bump version, restart.

---

### Contract File Template (`contracts/{feature}.contract.md`)

```markdown
# API Contract: [Feature Name]
**Status:** Draft → Locked
**Version:** 1.0
**Locked by:** [your name] on [date]
**Referenced by:** tasks/task-{feature}-backend.md, tasks/task-{feature}-frontend.md

## Endpoints

### [METHOD] /api/[path]
**Request:**
[query params, body shape, headers]

**Response — success (200):**
```json
{ exact shape here }
```

**Response — error states:**
```json
{ error shapes with codes }
```

**HTTP status codes:**
[status → meaning mapping]

## Shared TypeScript Types
```typescript
// Auto-generated to /types/contracts/{feature}.ts
// Edit this contract, not the generated file

export type [FeatureResponse] = [FeatureSuccess] | [FeatureError]

export interface [FeatureSuccess] {
  // exact fields
}

export interface [FeatureError] {
  error: '[ERROR_CODE_A]' | '[ERROR_CODE_B]'
  message: string
}
```

## Contract Rules
- Backend implements exactly this shape — no additions without version bump
- Frontend consumes exactly this shape — no as-casting around it
- Neither session modifies this file once Status is Locked
- Changes require: stop both sessions → update contract → bump version →
  patch whichever side needs it → restart
```

---

### Backend Task File Template (`tasks/task-{feature}-backend.md`)

```markdown
# Task: [Feature] — Backend
**Phase:** X | **Session:** Backend | **Branch:** feat/[feature]-backend
**Contract:** contracts/{feature}.contract.md — read this first
**Requirements:** requirements/features/{slug}/requirements.md

## Boundaries — You Own
- /app/api/**  (Route Handlers)
- /lib/**      (service layer)
- /types/contracts/**  (generate from contract)
- /supabase/migrations/**

## Boundaries — You Never Touch
- /components/**
- /app/(pages)/**  (page.tsx, layout.tsx)
- /hooks/**

## Pre-Task Checklist
- [ ] Read CLAUDE.md
- [ ] Read contracts/{feature}.contract.md — implement exactly this shape
- [ ] Read database-schema.md §[relevant sections]
- [ ] Read decisions-log.md [relevant D-XXX]
- [ ] NotebookLM research complete (spec values filled below)
- [ ] Generate /types/contracts/{feature}.ts from contract before writing code

## NotebookLM Research — Confirmed Values
[Fill before writing a single line of code]

## Spec
[Backend-only: Route Handler logic, external API calls, cache, DB writes]

## File Structure
[Backend files only — exact paths]

## Checkpoints
### Checkpoint 1 — Route Handler shape
Show me the response matches the contract shape exactly.
Do not build caching or DB writes yet.

### Checkpoint 2 — Full backend complete
Show me: cache logic, rate limiting, error handling.
tsc --noEmit must pass.

### Checkpoint 3 — Feature Complete
Run: /review + /cso + security-reviewer + council-gate (if RLS/amounts)
Stop. Frontend session reviews separately.

## Acceptance Criteria
- [ ] tsc --noEmit passes
- [ ] Response shape matches contract exactly — no deviations
- [ ] All requirement slugs fulfilled (backend-side only)
- [ ] /cso audit passed
- [ ] /review passed

## After This Task
[LEARN] tags to add to MEMORY.md
/sync-gbrain to re-index
Session log to write
```

---

### Frontend Task File Template (`tasks/task-{feature}-frontend.md`)

```markdown
# Task: [Feature] — Frontend
**Phase:** X | **Session:** Frontend | **Branch:** feat/[feature]-frontend
**Contract:** contracts/{feature}.contract.md — read this first
**Requirements:** requirements/features/{slug}/requirements.md

## Boundaries — You Own
- /components/**
- /app/(pages)/**  (page.tsx, layout.tsx — not route handlers)
- /hooks/**
- /styles/**

## Boundaries — You Never Touch
- /app/api/**  (Route Handlers — backend owns these)
- /lib/**      (service layer — backend owns these)
- /supabase/migrations/**

## Pre-Task Checklist
- [ ] Read CLAUDE.md
- [ ] Read contracts/{feature}.contract.md — build against this shape
- [ ] Read /types/contracts/{feature}.ts — use these types, do not redefine
- [ ] Read requirements doc — frontend-specific requirement slugs noted
- [ ] Use tdd skill (Matt Pocock)

## Contract Assumption
The backend Route Handler may not exist yet.
Build against the contract and /types/contracts/{feature}.ts.
Use a local mock or MSW for UI state testing if needed.
Never use `as` to work around the contract types.

## Spec
[Frontend-only: component states, error display, loading states, UX flow]

## All Result States
[Map every contract response → UI state]
e.g. AbnLookupSuccess with peppolRegistered=true → show registered result

## File Structure
[Frontend files only — exact paths]

## Checkpoints
### Checkpoint 1 — Component structure
Show me all result states rendered (use mock data matching contract shape).
No real API calls yet.

### Checkpoint 2 — Data fetching wired
Show me: fetch against /api/[path], typed against contract, all error states handled.

### Checkpoint 3 — Feature Complete
Run: /review + tdd (Matt Pocock)
Stop. Integration with backend reviewed separately.

## Acceptance Criteria
- [ ] tsc --noEmit passes
- [ ] All UI states typed against /types/contracts/{feature}.ts — no as-casting
- [ ] All requirement slugs fulfilled (frontend-side only)
- [ ] All contract error states handled — no unhandled error shapes
- [ ] /review passed

## After This Task
[LEARN] tags to add to MEMORY.md
Session log to write
```

---

## 16. Tool Roles — How Everything Fits Together

| Tool | Layer | Role |
|------|-------|------|
| `CLAUDE.md` | Standing orders | Domain rules, tech stack, absolute constraints — every session |
| `MEMORY.md` | Domain memory | Regulatory + project-specific lessons — manually curated |
| ECC instincts | Code memory | Generic TypeScript/Next.js patterns — auto-extracted |
| GBrain | Codebase memory | Searchable repo knowledge — auto-indexed via MCP |
| GStack `/learn` | Workflow memory | GStack session patterns across sessions |
| NotebookLM | Spec authority | Peppol/ATO/ABR facts — queried before task files |
| Requirements docs | Feature authority | What to build and why — drives task files |
| Task files | Build orders | How to build — drives Claude Code |
| ECC `council` skill | Everyday deliberation | Free, subagent-based, for design decisions |
| LLM Council (OpenRouter) | High-stakes deliberation | Multi-model, for compliance-critical code review |
| GStack `/cso` | Security audit | OWASP + STRIDE — every Feature Complete checkpoint |
| GStack `/review` | Code review | Staff engineer pass — every Feature Complete checkpoint |
| GStack `/autoplan` | Phase planning | CEO → design → eng before every phase |
| GStack `/office-hours` | Product direction | YC-style pressure test — before every phase |
| GStack `/plan-eng-review` | Architecture | Forces diagrams before coding — before every complex feature |
| GStack `/document-release` | Doc sync | Keeps all docs in sync after shipping |
| GStack `/retro` | Weekly review | What shipped, what drifted |
| GStack `/investigate` | Debugging | Systematic root cause — Iron Law: no fixes without investigation |
| GStack `/guard` | Safety | Wraps all production DB and schema work |
| ECC `security-reviewer` agent | RLS audit | Supabase-specific security — every Feature Complete |
| ECC AgentShield | Config security | Scans agent configs for injection risks — run once at setup |
| ECC `planner` agent | Feature planning | Reads codebase, generates step-by-step plan |
| ECC `architect` agent | Architecture | Phase 2+ architectural decisions |
| `backend-engineer` agent | Parallel sessions | Backend specialist — owns /app/api/ and /lib/ — Phase 1+ |
| `frontend-engineer` agent | Parallel sessions | Frontend specialist — owns /components/ and pages — Phase 1+ |
| Matt Pocock `tdd` | TDD enforcement | Red-green-refactor — every feature implementation |
| Matt Pocock `git-guardrails` | Git safety | Blocks force-push, reset --hard, clean -f |
| Matt Pocock `setup-pre-commit` | Commit safety | Husky hooks — runs before every commit |
| Matt Pocock `prd-to-issues` | Issue tracking | Breaks requirements into GitHub issues |
| Matt Pocock `ubiquitous-language` | Domain glossary | DDD glossary from requirements discussions — feeds CLAUDE.md |
| Matt Pocock `write-a-skill` | Skill authoring | Generates properly structured custom skills |
| Matt Pocock `triage-issue` | Bug pipeline | Bug → GitHub issue → TDD fix plan |
| Matt Pocock `zoom-out` | Debugging context | Higher-level perspective when lost in detail |
| Matt Pocock `caveman` | Token compression | ~75% response compression for long sessions |
| GitNexus | Structural analysis | AST parsing, call chains, blast radius — Phase 1+ |
| GitHub Action (`claude-code-action`) | CI automation | PR review, issue-to-PR, security review, release notes — Phase 1+ |

---

## 17. What NOT to Do (Decided Against)

| What | Why |
|------|-----|
| Install all 119 ECC skills | Token overhead shrinks 200k context window to ~70k |
| Use ECC multi-language agents (Go, Rust, Java) | Wrong stack — TypeScript only |
| Use OpenClaw as coding agent | OAuth banned April 2026, CVE history, compliance risk |
| Use GStack `/codex` | Requires OpenAI Codex CLI — already have LLM Council |
| Use GStack design skills before Phase 1 | No UI to audit yet — add post-Phase 0 |
| Use GStack `/canary` or `/benchmark` before Phase 1 | Nothing deployed yet |
| Install full GStack all at once | Install incrementally — planning + security skills first |
| Self-host an Access Point | D-003 confirmed — use Storecove |
| Use floats for amounts | D-016 — bigint cents only |
| Hard delete any rows | Soft delete everywhere |
| Service role key in client code | Server-side only (Route Handlers, Edge Functions) |
| Bypass RLS | Never in client code |
| Guess IBT numbers or UBL paths | Stop and verify with NotebookLM every time |
| Use Matt Pocock `write-a-prd` | requirements-analyst agent is more sophisticated — semantic slugs, traceability, regulatory constraints, NotebookLM |
| Use Matt Pocock `grill-me` | requirements-analyst + GStack `/office-hours` both more powerful and already integrated |
| Use Matt Pocock `design-an-interface` | GStack `/design-shotgun` already in workflow, same concept |
| Use Matt Pocock `diagnose` | GStack `/investigate` has Iron Law + hypothesis testing — more rigorous |
| Use Matt Pocock `improve-codebase-architecture` before Phase 2 | No codebase to improve yet |
| Use GitHub Actions with Opus model | Use Sonnet for CI — Opus is ~15x more expensive per token |
| Give GitHub Action `contents: write` unless it needs to push | Principle of least privilege — scope permissions tightly |
| Run GitHub Actions without `--max-turns` limit | Set max-turns 5–10 to prevent runaway jobs burning API credits |
| Hardcode `ANTHROPIC_API_KEY` in workflow YAML | Store in GitHub Secrets, never in workflow files |
| Add GitNexus before Phase 1 | Empty codebase produces meaningless graph — wait until real modules exist |

---

## 18. Open Items Still To Do

| Item | Action | Priority |
|------|--------|----------|
| Install Matt Pocock skills (core set) | `npx skills@latest add` — see §4 install commands | 🔴 First |
| Run `setup-matt-pocock-skills` | Scaffolds per-repo config before other MP skills work | 🔴 First |
| Install GStack | `git clone` + `./setup` | 🔴 First |
| Install GBrain | `gbrain init` using existing Supabase URL | 🔴 First |
| Create `MEMORY.md` | Empty file, ready for `[LEARN]` tags | 🔴 First |
| Clone ECC and copy skills + agents + hooks | See install commands in §4 | 🔴 First |
| Set up `.claude/settings.json` hooks | See §6 | 🔴 First |
| Write `security-reviewer.md` subagent | Use Matt Pocock `write-a-skill` to generate with proper structure | 🟡 Before Phase 0 |
| Write `schema-guard.md` subagent | Use Matt Pocock `write-a-skill` to generate | 🟡 Before Phase 0 |
| Write `peppol-validator.md` subagent | Use Matt Pocock `write-a-skill` to generate | 🟡 Before Phase 0 |
| Run `/office-hours` in GStack | Before Phase 0 kicks off | 🟡 Before Phase 0 |
| Fill LLM Council deliberation in Phase 0 task file | Run before handing to Claude Code | 🟡 Before Phase 0 |
| Run `gbrain sources add . --strategy code` | After initial repo structure is created | 🟢 Phase 0 start |
| Decide: Oracle Always-Free or Hetzner CX22 | For VPS + tmux persistence | 🟢 Phase 0 |
| Install Happy Coder on phone | For mobile session monitoring | 🟢 Phase 0 |
| Add GStack design skills | Once Phase 1 UI exists to audit | 🔵 Phase 1 |
| Add `/canary` and `/benchmark` | Once deployed to Vercel | 🔵 Phase 1+ |
| Write `backend-engineer.md` subagent | Use write-a-skill, boundaries from §20 | 🔵 Phase 1 |
| Write `frontend-engineer.md` subagent | Use write-a-skill, boundaries from §20 | 🔵 Phase 1 |
| Write first API contract file | Plan mode before first Phase 1 parallel feature | 🔵 Phase 1 |
| Install GitNexus | `npm install -g gitnexus` + `npx gitnexus setup` | 🔵 Phase 1 |
| Run `gitnexus analyze --skills` | First full index + SKILL.md generation | 🔵 Phase 1 start |
| Set up GitHub Actions (`claude-code-action`) | `/install-github-app` in Claude Code CLI | 🔵 Phase 1 |
| Add `claude-pr-review.yml` workflow | Auto review every PR | 🔵 Phase 1 |
| Add `claude-issue-to-pr.yml` workflow | @claude mention on issue → auto PR | 🔵 Phase 1 |
| Add `claude-security-review.yml` workflow | Path-specific review on `/lib/peppol/**` | 🔵 Phase 1 |
| Add `claude-release-notes.yml` workflow | Auto CHANGELOG.md on release tag | 🔵 Phase 2+ |
| Add Matt Pocock `request-refactor-plan` | When Phase 1 code needs refactoring | 🔵 Phase 2+ |
| Add Matt Pocock `improve-codebase-architecture` | When codebase has sufficient size to review | 🔵 Phase 2+ |

---

## 19. GitHub Workflow Integration (Phase 1+)

### The Official Action

`anthropics/claude-code-action` is a general-purpose Claude Code action for GitHub PRs and issues. It intelligently detects when to activate based on workflow context — whether responding to @claude mentions, issue assignments, or executing automation tasks. It runs entirely on your own GitHub runner. Your code never leaves GitHub's infrastructure.

**Setup (one command in Claude Code CLI):**
```bash
/install-github-app
# Guides you through GitHub App install + ANTHROPIC_API_KEY secret
```

**Important:** GitHub Actions use your `ANTHROPIC_API_KEY` (API billing) — separate from your Pro subscription. Always use Sonnet, never Opus for CI tasks. Set billing alerts on the Anthropic dashboard.

---

### Four Workflow Recipes for Peppol Bridge

**Recipe 1: Automatic PR Review on every push**
```yaml
# .github/workflows/claude-pr-review.yml
name: Claude PR Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: claude-sonnet-4-6          # never Opus in CI
          max_turns: "5"                    # prevent runaway jobs
          prompt: |
            Review this PR against the standards in CLAUDE.md.
            Check for: RLS bypasses, float amounts, hard deletes,
            service role key in client code, missing deleted_at filters.
            Rate findings as CRITICAL / HIGH / MEDIUM / LOW.
            Reference specific file paths and line numbers.
```

**Recipe 2: @claude mention → issue-to-PR automation (small fixes only)**
```yaml
# .github/workflows/claude-issue-to-pr.yml
name: Claude Issue Implementation
on:
  issue_comment:
    types: [created]

jobs:
  implement:
    if: contains(github.event.comment.body, '@claude')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: claude-sonnet-4-6
          max_turns: "8"
          # Action auto-detects @claude context and responds
```

**Recipe 3: Path-specific Peppol security review**
```yaml
# .github/workflows/claude-security-review.yml
name: Peppol Security Review
on:
  pull_request:
    paths:
      - 'lib/peppol/**'
      - 'lib/abr/**'
      - 'app/api/**'

jobs:
  security:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: claude-sonnet-4-6
          max_turns: "5"
          prompt: |
            This PR touches compliance-critical code.
            Run an OWASP-aligned review focused on:
            - Peppol spec values (IBT numbers, UBL paths, scheme IDs)
            - ABN validation logic
            - Any hardcoded spec values that should come from config
            - Service role key exposure
            Flag any guessed or unverified Peppol spec values as CRITICAL.
```

**Recipe 4: Auto-generate release notes on tag push**
```yaml
# .github/workflows/claude-release-notes.yml
name: Release Notes
on:
  push:
    tags: ['v*']

jobs:
  changelog:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: claude-sonnet-4-6
          max_turns: "3"
          prompt: |
            Generate release notes for this tag.
            Summarise changes since the last tag grouped by:
            Features, Bug Fixes, Compliance Updates, Breaking Changes.
            Prepend to CHANGELOG.md and commit with [skip ci].
```

---

### Key Rules for GitHub Actions

| Rule | Why |
|------|-----|
| Always use Sonnet in CI, never Opus | Opus is ~15x more expensive per token for batch work |
| Set `max_turns: "5"` to `"10"` on every job | Prevents runaway API spend if the agent loops |
| Add `[skip ci]` to any commit the action makes | Prevents the workflow from triggering itself in a loop |
| Store `ANTHROPIC_API_KEY` only in GitHub Secrets | Never in workflow YAML, never logged |
| Scope permissions to minimum needed | `contents: read` unless the action must push changes |
| Your local `.claude/` hooks do NOT run in CI | Re-implement critical guardrails as workflow steps if needed in CI |

---

### Routines vs GitHub Actions — Which to Use

Both can run Claude Code unattended. They serve different triggers:

| | Claude Code Routines | GitHub Actions |
|--|---------------------|----------------|
| Trigger | Schedule (cron) or webhook | GitHub event (PR, push, issue, tag) |
| Best for | Nightly audits, dependency checks, doc drift | PR review, issue-to-PR, path-specific checks |
| Runs on | Anthropic cloud infra | GitHub-hosted runners |
| Cost | Pro plan (included) | ANTHROPIC_API_KEY (API billing) |
| Local MCP access | ❌ | ❌ |
| Code context | Clones repo fresh each run | Checkout in runner |

Use Routines for time-based background work. Use GitHub Actions for event-based pipeline automation. They complement, not replace, each other.

---

## 20. Parallel Sessions — Backend + Frontend (Phase 1+)

### When to Use

From Phase 1 onwards, any feature with a clean backend/frontend split runs as two simultaneous Claude Code sessions. The API contract is the shared anchor — decided in plan mode before either session starts.

**Phase 0:** Single session. ABN lookup tool has no meaningful split.
**Phase 1+:** Two sessions. XML generator, dashboard, Xero OAuth, send flow all have clean splits.

---

### The Pattern

```
Plan Mode (you + Claude.ai, ~20 min)
    ├── requirements-analyst produces requirements doc
    ├── /plan-eng-review produces architecture + API shape
    └── You write: contracts/{feature}.contract.md  ← STATUS: LOCKED

            ↓ both sessions read the contract

Backend session (Terminal 1)          Frontend session (Terminal 2)
claude --permission-mode auto         claude --permission-mode auto
reads: backend-engineer.md            reads: frontend-engineer.md
reads: contract file                  reads: contract file
reads: task-{feature}-backend.md      reads: task-{feature}-frontend.md
owns:  /app/api/, /lib/               owns:  /components/, /app/(pages)/
never: .tsx pages                     never: /app/api/, /lib/

            ↓ both hit Feature Complete

Integration (you, ~15 min)
    ├── Point frontend at real backend
    ├── Run E2E against the contract
    └── If contract shape needs changing:
        update contract → bump version → patch whichever side needs it
```

---

### File Ownership (Conflict Prevention)

| Directory | Owner | Rule |
|-----------|-------|------|
| `/app/api/**` | Backend | Frontend never touches |
| `/lib/**` | Backend | Frontend never touches |
| `/supabase/migrations/**` | Backend | Frontend never touches |
| `/components/**` | Frontend | Backend never touches |
| `/app/(pages)/**` | Frontend | Backend never touches |
| `/hooks/**` | Frontend | Backend never touches |
| `/types/contracts/*.ts` | Neither — generated | Backend generates once, frontend reads |
| `/types/domain.ts` | First-needer | Append only, never modify existing types |
| `MEMORY.md` | Both | Append only, never rewrite existing lines |
| `CLAUDE.md` | Neither | Read-only for both sessions |
| `contracts/*.md` | Neither once locked | Changes require stopping both sessions |

---

### How to Start Two Sessions

```bash
# Terminal 1 — backend
cd ~/peppol-bridge
claude --permission-mode auto
# Paste: "You are the backend engineer. Read .claude/agents/backend-engineer.md,
# CLAUDE.md, and contracts/{feature}.contract.md.
# Then read tasks/task-{feature}-backend.md and start."

# Terminal 2 — frontend
cd ~/peppol-bridge
claude --permission-mode auto
# Paste: "You are the frontend engineer. Read .claude/agents/frontend-engineer.md,
# CLAUDE.md, and contracts/{feature}.contract.md.
# Then read tasks/task-{feature}-frontend.md and start."
```

---

### The Two Subagents

**`.claude/agents/backend-engineer.md`** — write using Matt Pocock `write-a-skill`

Key rules to include:
- Owns `/app/api/**`, `/lib/**`, `/types/contracts/**`, `/supabase/migrations/**`
- Never touches `/components/**`, `/app/(pages)/**`, `/hooks/**`, any `.tsx` UI file
- Reads contract before writing any endpoint — implements exactly that shape
- If contract needs changing: STOP and flag it, do not implement a different shape
- All CLAUDE.md rules apply (bigint cents, RLS, soft delete, service role only in Route Handlers)

**`.claude/agents/frontend-engineer.md`** — write using Matt Pocock `write-a-skill`

Key rules to include:
- Owns `/components/**`, `/app/(pages)/**`, `/hooks/**`, `/styles/**`
- Never touches `/app/api/**`, `/lib/**`, `/supabase/migrations/**`
- Types all fetch calls against `/types/contracts/*.ts` — never redefines contract types
- Never uses `as` to work around contract types — if types don't fit, stop and flag it
- Backend may not exist yet — build against contract + mock, not a running server
- Amounts arrive as bigint cents from backend — always format before display, never show raw cents

---

### What to Do When Contract Needs Changing

This will happen. The frontend discovers the response needs an extra field. The backend discovers a field name is ambiguous. The process:

1. **Both sessions stop** — flag the change, don't implement around it
2. **Update `contracts/{feature}.contract.md`** — bump version number
3. **Regenerate `/types/contracts/{feature}.ts`** — from the updated contract
4. **Patch whichever side needs updating** — usually one session, sometimes both
5. **Both sessions resume** with the updated contract

The version bump in the contract file is the paper trail. You can always see what changed and when.

---

### Time Saving in Practice

| Feature | Sequential time | Parallel time |
|---------|----------------|---------------|
| Xero OAuth (Phase 1) | ~3 hrs | ~1.5 hrs |
| Dashboard + data layer (Phase 1) | ~4 hrs | ~2 hrs |
| Peppol send flow (Phase 2) | ~5 hrs | ~2.5 hrs |

The saving is roughly half your wall-clock time for any feature with a clean split. At 2-3 hrs/day, that compounds significantly across a full phase.

---

*Summary compiled: May 2026 · Updated with GitNexus + GitHub Workflow + Parallel Sessions*
*References: CLAUDE.md, task-phase-0-abn-peppol-lookup.md, everything-claude-code repo, garrytan/gstack repo, mattpocock/skills repo, abhigyanpatwari/GitNexus, anthropics/claude-code-action*
