# Archives — Index & Conventions

> Single entry point for navigating archived planning artifacts. Established 2026-07-25
> alongside the Phase 2 doc reorganization.

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

When a new milestone closes, add one row.

> **In-flight archive note:** v1.0 uses the in-flight pattern — `ROADMAP-ARCHIVE.md` is
> populated mid-milestone with verbatim closed-phase blocks moved out of the active
> `ROADMAP.md`, and `milestones/v1.0/phases/` holds closed phase directories. The active
> `ROADMAP.md` keeps only pending and in-progress phases in full detail; closed phases
> keep a one-line row in the Progress table with a pointer into the archive. At close,
> this in-flight file becomes the natural `ROADMAP-AT-CLOSE.md` snapshot.

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
