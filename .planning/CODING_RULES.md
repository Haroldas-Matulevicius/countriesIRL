# Coding Rules — Index

> **Engine doc (version-agnostic).** Describes current behavior; updated in place when behavior
> changes — never archived per milestone.
> **Pointers:** [`../CLAUDE.md`](../CLAUDE.md) (project routing table) ·
> [`ARCHIVES.md`](ARCHIVES.md) (archive navigation) ·
> [`ROADMAP.md`](ROADMAP.md) (Progress table is canonical for status and counts).
> ────────────────────────────────────────

**Single source of truth for coding standards in CountriesIRL.** Load the matching section file
below before writing or reviewing code. **Always read [`general.md`](coding-rules/general.md)
first** — it also carries the two contracts that bind every file:

- **§Live Invariants** — the nine engineering invariants a change can silently regress. Canonical
  here; `STATE.md` and the phase handoff link to it rather than restating it.
- **§Immutable Safety Constraints** — the ten non-negotiables covering historical evidence,
  approval semantics, browser certification, and localhost-only scope.

**Each section file carries Phase 1 material followed by Phase 2 rules. Where the two conflict,
the Phase 2 text wins** — it was written against shipped, tested behavior, while the Phase 1 text
was written before that behavior existed. Phase 1 text is kept because Phase 1 release evidence
cites it, not because it still describes the code.

Last updated: 2026-07-26 — pointed the index at `general.md`'s new §Live Invariants and §Immutable Safety Constraints; adopted the breadcrumb header. Prior: 2026-07-26 — reframed as version-agnostic; section descriptions matched to the current file contents and the Phase 2-wins precedence rule. Full edit history: `git log -p -- .planning/CODING_RULES.md`.

---

## Sections

| File | Read when touching... |
|---|---|
| [`general.md`](coding-rules/general.md) | **Always first** — §Live Invariants, §Immutable Safety Constraints, TypeScript discipline, naming, imports, forbidden patterns, error handling, testing expectations, and git + planning-file safety (including the gsd-sdk verbs that must never run here). |
| [`frontend.md`](coding-rules/frontend.md) | React components, hooks, D3 integration, SVG rendering, plain CSS + design tokens, preference media queries, responsive composition, map chrome vs. export isolation, layered modals, the action strip, creator-safe status copy, transaction hooks, and the composition root. Pairs with `App` + `MapCanvas` + `MapWorkspace` + `Controls` + `ColorPicker` + `CountryList` + `SaveLoad`. |
| [`data.md`](coding-rules/data.md) | World GeoJSON loading/validation, country lookup, the feature-ID contract, the hash-verified snapshot catalog, the approval-aware promotion path, and filesystem-identity keys in the preparation scripts. `useGeoData` + `MapCanvas` integration. |
| [`export.md`](coding-rules/export.md) | The **owned** SVG→PNG rasterisation path (`html2canvas` was removed by 03-11, D-34), the 1080×1080 size contract, the prepared-composition clone contract, the inline base64 font seam and its no-network rule, per-reason refusal messaging, export transaction ownership, filename format, and the browser/journey evidence rules. `exportMapPng` + `interFontFace` + `useCompositionExportTransaction` + `Controls`. |
| [`storage.md`](coding-rules/storage.md) | localStorage persistence, the bounded V2 record and its pre-parse limits, summary projections, migration, confirmation flows, and save/load failure copy. `StorageAdapter` + `SaveLoad`. |

There are exactly five section files. If you add a sixth, add its row here in the same commit.

---

## Update Process

These files are manually maintained. **Update the matching section file in the same commit that
lands the behavior** — batching rule updates to the end of a phase means the rules describe what
was planned rather than what shipped.

**Footer hygiene — keep `Last updated:` lines from accreting.** The rule body is the record; a
changelog line restating *when* a rule was added is redundant once the rule is written. Each file's
`Last updated:` keeps only the **two most recent** entries and ends with a pointer to git:

> Full edit history: `git log -p -- <path-to-file>`.

When you would add a third entry, drop the oldest in the same edit. **One changelog location per
file** — never a header line *and* a footer line. This applies to every `coding-rules/*.md` file,
this index, and [`../CLAUDE.md`](../CLAUDE.md).
