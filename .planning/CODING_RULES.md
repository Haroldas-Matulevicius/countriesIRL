# Coding Rules — Index

> **Engine doc (version-agnostic).** Describes current behavior; updated in place when behavior changes — never archived per milestone.
> See `../CLAUDE.md` for the project documentation index.

**Single source of truth for coding standards in CountriesIRL Phase 1.** Load the matching section file below before writing/reviewing code. Always read `general.md` first.

Last updated: 2026-07-21 — initial index for Phase 1. Full edit history: `git log -p -- .planning/CODING_RULES.md`.

---

## Sections

| File | Read when touching... |
|---|---|
| [`general.md`](coding-rules/general.md) | **Always first** — core principles, TypeScript discipline, naming conventions, forbidden patterns, imports, testing expectations. |
| [`frontend.md`](coding-rules/frontend.md) | React components, hooks, D3 integration, SVG rendering, Tailwind styling, performance (useCallback, memoization). Pairs with MapCanvas + ColorPicker + Controls + CountryList. |
| [`data.md`](coding-rules/data.md) | GeoJSON loading/validation, country lookup, feature ID contract, type safety for GeoFeature. useGeoData hook + MapCanvas integration. |
| [`export.md`](coding-rules/export.md) | PNG export via html2canvas, 1080×1080 size contract, 2x DPI scaling for crispness, filename format, error handling. exportMapPng utility + Controls button. |
| [`storage.md`](coding-rules/storage.md) | localStorage persistence, max 10 saved maps, 5MB quota, serialization format, load/save/delete flows. useLocalStorage hook + SaveLoad component. |

---

## Update Process

These files are manually maintained. After any new pattern, convention change, or correction, update the relevant section file.

**Footer hygiene — keep `Last updated:` lines from accreting.** Each file's `Last updated:` line keeps only the **two most recent** entries and ends with a pointer to git:

> Full edit history: `git log -p -- <path-to-file>`.

When you'd add a third entry, drop the oldest in the same edit. This applies to all `coding-rules/*.md` files and `../CLAUDE.md`.
