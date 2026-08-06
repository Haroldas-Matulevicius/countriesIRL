# Archives — Index & Conventions

> **Status:** v1.0 in flight; one capsule (`milestones/v1.0/`). Single entry point for navigating
> archived planning artifacts, and the home of the `.planning/` doc conventions.
> **Pointers:** [`ROADMAP.md`](ROADMAP.md) (Progress table is canonical for status and counts) ·
> [`STATE.md`](STATE.md) (live position) · [`MILESTONES.md`](MILESTONES.md) ·
> [`CODING_RULES.md`](CODING_RULES.md) → [`coding-rules/general.md`](coding-rules/general.md)
> (live invariants + immutable safety constraints) · [`../CLAUDE.md`](../CLAUDE.md).
> ────────────────────────────────────────

## How to navigate (default lookup pattern)

**Grep first, read narrowly, verify before quoting.**

1. **Grep across all archives** for the keyword you're chasing:
   ```
   Grep "<keyword>" .planning/milestones/
   ```
   This searches every per-milestone archive in one pass without loading any of them.

2. **Read only the matched file**, not the whole milestone capsule. The index table below
   lets you confirm which milestone owns the match.

3. **Verify the match is current.** Archive entries can be **reversed by later decisions**.
   Cross-check against:
   - The latest milestone's `DECISIONS-ARCHIVE.md` (most recent decisions trump older ones)
   - [`coding-rules/general.md`](coding-rules/general.md) (live rules — if there's a conflict, this wins)
   - [`CODING_RULES.md`](CODING_RULES.md) (live index)

Bulk-reading a whole archive without grepping first is a context-bloat anti-pattern.

---

## Per-Milestone Archive Index

| Milestone | Closed | ROADMAP | REQUIREMENTS | DECISIONS | Capsule |
|---|---|---|---|---|---|
| v1.0 — MVP | *in-flight* | [IN-FLIGHT ARCHIVE](milestones/v1.0/ROADMAP-ARCHIVE.md) | — | — | [`milestones/v1.0/`](milestones/v1.0/) |
| v1.1 — Clean Studio & Data-Driven Maps | *in-flight* | [IN-FLIGHT ARCHIVE](milestones/v1.1/ROADMAP-ARCHIVE.md) | — | — | [`milestones/v1.1/`](milestones/v1.1/) |

When a new milestone closes, add one row.

> **In-flight archive note:** v1.0 uses the in-flight pattern — `ROADMAP-ARCHIVE.md` is
> populated mid-milestone with verbatim closed-phase blocks moved out of the active
> `ROADMAP.md`, and `milestones/v1.0/phases/` holds closed phase directories. The active
> `ROADMAP.md` keeps only pending and in-progress phases in full detail; closed phases
> keep a one-line row in the Progress table with a pointer into the archive. At close,
> this in-flight file becomes the natural `ROADMAP-AT-CLOSE.md` snapshot.

---

## One Canonical Home Per Fact

**The rule:** every class of fact is maintained in exactly one file. Every other file that needs
it **links**, and never restates it. This is not stylistic — the same content was previously kept
in `STATE.md`, `HANDOFF.json`, and a phase `.continue-here.md` simultaneously, and the three
copies disagreed with each other about how many plans were complete.

| Fact | Canonical home | Everyone else |
|---|---|---|
| Phase/plan status, counts, verified gates | [`ROADMAP.md`](ROADMAP.md) § Progress | link to it |
| Engineering invariants + immutable safety constraints | [`coding-rules/general.md`](coding-rules/general.md) | link to it |
| Domain rules (React/D3/CSS, data + catalog, export, storage) | the matching [`coding-rules/*.md`](coding-rules/) | link to it |
| Live position, open owner gates, decisions, blockers, todos | [`STATE.md`](STATE.md) | link to it |
| Milestone outcomes + milestone-level deferrals | [`MILESTONES.md`](MILESTONES.md) | link to it |
| Session resumption + machine-specific hazards | the phase `.continue-here.md` | link to it |
| Per-plan execution narrative + evidence | the phase `02-NN-SUMMARY.md` files | link to them |
| Phase-local deferrals | the phase `deferred-items.md` | link to it |
| Where any doc lives, and what to load when | [`../CLAUDE.md`](../CLAUDE.md) | link to it |

**Retired artifacts — do not recreate:**

- `.planning/HANDOFF.json` (removed 2026-07-26) — a one-shot handoff that GSD's own resume flow
  deletes after a successful resumption. It had become a stale third copy of the contracts.
- `.planning/MEMORY.md` (removed 2026-07-26) — a stale index that duplicated this file and
  `CLAUDE.md` while pointing at documents that were never written. Routing lives in `CLAUDE.md`;
  archive navigation lives here.

---

## Three-Layer Doc Model

1. **Active live files at root** — current milestone only. Slim, breadcrumb-headed.
   [`ROADMAP.md`](ROADMAP.md), [`REQUIREMENTS.md`](REQUIREMENTS.md), [`STATE.md`](STATE.md),
   [`PROJECT.md`](PROJECT.md), [`MILESTONES.md`](MILESTONES.md).
2. **This index** (`ARCHIVES.md`) — navigation table + `.planning/` file-hygiene
   conventions. Grows by one index row per milestone, not with content.
3. **Per-milestone capsules** at `milestones/v{N}/` — frozen at close. Contain the actual
   archived content.

---

## What Lives in a Capsule

| File | Role |
|---|---|
| `CLOSE.md` | Retrospective — what shipped, deferred, absorbed, why |
| `ROADMAP-AT-CLOSE.md` | Frozen raw snapshot of active `ROADMAP.md` at the moment of close |
| `REQUIREMENTS-AT-CLOSE.md` | Frozen raw snapshot of active `REQUIREMENTS.md` |
| `ROADMAP-ARCHIVE.md` | Retrospective format with phase outcomes (Plans X/Y complete) |
| `REQUIREMENTS-ARCHIVE.md` | Completed REQ-IDs grouped by feature area |
| `DECISIONS-ARCHIVE.md` | Architectural decisions carried forward |
| `phases/` | Closed phase directories (PLAN/SUMMARY/CONTEXT/evidence) |
| `research/` | As-shipped research files |

---

## Engine Docs — Never Archived

These are version-agnostic and updated in place. They never move into a capsule:

- [`CODING_RULES.md`](CODING_RULES.md) — index into `coding-rules/*.md`
- [`coding-rules/`](coding-rules/) — general, frontend, data, export, storage
- [`../CLAUDE.md`](../CLAUDE.md) — routing table
- [`ARCHIVES.md`](ARCHIVES.md) — this file

---

## Reference-Only Files — NEVER auto-load

Kept for provenance, not for orientation. Do not pre-read them for ambient context, and do not
quote them as current:

| File | What it is |
|---|---|
| `CODEX_PROMPT.md` · `PHASE1_CODEX_BRIEF.md` | The spent Phase 1 implementation inputs. They describe a Europe-only app with a Vercel deployment target — **neither is true now.** They stay at `.planning/` root rather than moving into the v1.0 capsule because frozen Phase 1 artifacts (`01-CONTEXT.md`, `01-RESEARCH.md`, `01-PATTERNS.md`, `01-UI-SPEC.md`) cite them by that exact path, and archived evidence is not rewritten. |
| `config.json` | GSD workflow config, written at project kickoff 2026-07-21. Its narrative fields (`techStack.decided: false`, `constraints.scope: "Europe only (V1)"`, the historical period list) were never updated as the project moved on. **Treat only the workflow block as live**; everything else is superseded by `PROJECT.md`, `ROADMAP.md`, and the descope decision. |
| `phases/02-…/02-RESEARCH.md` · `02-PATTERNS.md` · `02-UI-SPEC.md` · `02-VALIDATION.md` | Phase 2 planning inputs, 50–80KB each. Grep them; never read one whole. The UI-SPEC is still **binding** on visual work — that is the one exception to "reference only". |

---

## `.planning/` File Hygiene

**Committed:**
- Planning sources of truth — `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md`, `PROJECT.md`,
  `MILESTONES.md`, `ARCHIVES.md`, `CODING_RULES.md`, `coding-rules/*`
- Phase directories — `PLAN.md`, `SUMMARY.md`, `CONTEXT.md`, review and checkpoint artifacts
- Debug notes, UI review markdown and JSON evidence
- Historical source-readiness manifests and evidence archives under `sources/historical/`

**Never committed** (see [`../.gitignore`](../.gitignore) and
[`ui-reviews/.gitignore`](ui-reviews/.gitignore)):
- `.claude/` — agent worktrees and session scratch
- Screenshot binaries (`*.png`, `*.webp`, …)
- Browser profiles, caches, and LevelDB artifacts (`*.db`, `*.pb`, `*.tflite`, `*.pma`, …)
- `**/verification-root/` — nested repo checkouts created by evidence harnesses

> Rationale, from the Phase 1 decision log: *"Executable evidence harnesses, profiles,
> cache files, and nested checkouts remain outside authoritative product evidence;
> existing immutable JSON/log history is retained unchanged."*

---

## Immutable Evidence Rule

Evidence bound to a commit SHA is **never rewritten**. If a later run supersedes it, add a
new artifact and annotate the old one — do not edit it. This applies to:

- Browser/PNG acceptance evidence under `ui-reviews/`
- Historical packet hashes and correction checkpoints
- Exact-commit verification records (`02-27-EXACT-COMMIT.json`)

Phase 1 preserved failed timing evidence at commit `c449e6e` under this rule even after
the timing gate was retired.

---

*Last updated: 2026-07-26 — added §One Canonical Home Per Fact (the rule the STATE/HANDOFF/.continue-here triplication broke), §Reference-Only Files, and the breadcrumb header; recorded the removal of `HANDOFF.json` and `MEMORY.md`.*
*Last updated: 2026-07-25 — established alongside the Phase 2 doc reorganization.*

*Full edit history: `git log -p -- .planning/ARCHIVES.md`.*
