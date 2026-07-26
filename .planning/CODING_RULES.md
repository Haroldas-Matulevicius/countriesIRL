# Coding Rules — Index

> **Engine doc (version-agnostic).** Describes current behavior; updated in place when behavior changes — never archived per milestone.
> See `../CLAUDE.md` for the project documentation index.

**Single source of truth for coding standards in CountriesIRL.** Load the matching section file below before writing/reviewing code. Always read `general.md` first.

**Each section file carries Phase 1 material followed by Phase 2 rules. Where the two
conflict, the Phase 2 text wins** — it was written against shipped, tested behavior, while the
Phase 1 text was written before that behavior existed. Phase 1 text is kept because Phase 1
release evidence refers to it, not because it still describes the code.

Last updated: 2026-07-26 — reframed as version-agnostic; section descriptions now match the current file contents and the Phase 2-wins precedence rule. Prior: 2026-07-21 — initial index for Phase 1. Full edit history: `git log -p -- .planning/CODING_RULES.md`.

---

## Sections

| File | Read when touching... |
|---|---|
| [`general.md`](coding-rules/general.md) | **Always first** — core principles, TypeScript discipline, naming conventions, forbidden patterns, imports, testing expectations, git safety. |
| [`frontend.md`](coding-rules/frontend.md) | React components, hooks, D3 integration, SVG rendering, plain CSS + design tokens, preference media queries, responsive composition, map chrome vs. export isolation, layered modals, the action strip, creator-safe status copy, transaction hooks, and the composition root. Pairs with `App` + `MapCanvas` + `MapWorkspace` + `Controls` + `ColorPicker` + `CountryList` + `SaveLoad`. |
| [`data.md`](coding-rules/data.md) | World GeoJSON loading/validation, country lookup, feature ID contract, the hash-verified snapshot catalog, and filesystem-identity keys in the preparation scripts. `useGeoData` + `MapCanvas` integration. |
| [`export.md`](coding-rules/export.md) | PNG export via html2canvas, the 1080×1080 size contract, the prepared-composition clone contract, per-reason refusal messaging, export transaction ownership, filename format, and the browser evidence rules. `exportMapPng` + `useCompositionExportTransaction` + `Controls`. |
| [`storage.md`](coding-rules/storage.md) | localStorage persistence, the bounded V2 record and its pre-parse limits, summary projections, migration, confirmation flows, and save/load failure copy. `StorageAdapter` + `SaveLoad`. |

---

## Update Process

These files are manually maintained. After any new pattern, convention change, or correction, update the relevant section file.

**Footer hygiene — keep `Last updated:` lines from accreting.** Each file's `Last updated:` line keeps only the **two most recent** entries and ends with a pointer to git:

> Full edit history: `git log -p -- <path-to-file>`.

When you'd add a third entry, drop the oldest in the same edit. This applies to all `coding-rules/*.md` files and `../CLAUDE.md`.
