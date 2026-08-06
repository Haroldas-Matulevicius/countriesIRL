# Vendored icon provenance (R-V2, assertion 28)

Every file under `src/components/icons/` carries a dated `read in full` line below.
**A file with no provenance line may not be vendored** — `iconContract.test.ts` asserts the
recorded set and the directory listing are equal in **both** directions, so evidence and files
cannot drift apart.

## What each file was scanned for

`fetch(` · `XMLHttpRequest` · `navigator.sendBeacon` · `process.env` · `eval(` · `Function(` ·
dynamic `import(` of an external URL · any `http://` or `https://` occurrence · obfuscated
identifiers (any 40+ character run of `[A-Za-z0-9+/=_$]` outside an SVG path `d` attribute).

The scan set is recorded here, not just its verdict, so a later reader can tell what was and was
not looked for.

## How these files came to exist

The 14 glyph components were **authored in this repo** from lucide glyph path data, in the shape of
`themely/src/components/ui/search.tsx` (the exemplar, read in full 2026-08-06). **No registry
install, no network at build or run time, no file copied byte-for-byte across the repo boundary.**
The upstream Tailwind `className` strings were **translated, not copied** — this repo has no
Tailwind, and a copied `className` produces an element that looks wired up and renders unstyled
(`03-RESEARCH.md` P-5). Sizing is the `size` prop; colour is `currentColor`.

Their one runtime dependency is `motion/react`. Verified against the **resolved** tree in this
repository on 2026-08-06 — `motion@12.40.0` with a transitive `framer-motion@12.43.0` /
`motion-dom@12.43.0`, **not** Themely's 12.40.0 (see `03-01-SUMMARY.md` FINDING 1):
`motion` and `useAnimation` are functions and `motion.svg` / `motion.path` resolve.

---

## In-repo files

<!-- provenance:in-repo:begin -->
- `CheckIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `CrosshairIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `DownloadIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `FolderIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `LayersIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `ListIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `MapIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `MinusIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `MoonIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `PaletteIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `PlusIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `RedoIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `SunIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `UndoIcon.tsx` — read in full — flags: `xmlns="http://www.w3.org/2000/svg"` (the SVG namespace URI — an XML identifier, never dereferenced; no other pattern hit) — 2026-08-06
- `index.ts` — read in full — flags: none — 2026-08-06
- `iconContract.test.ts` — read in full — flags: it contains the literal strings `fetch(`, `XMLHttpRequest`, `navigator.sendBeacon`, `process.env`, `eval(`, `Function(` and `import(` — as the forbidden-pattern list it asserts the other files do NOT contain. Deliberate; it is the scanner, and it exempts only itself from that assertion — 2026-08-06
- `PROVENANCE.md` — read in full — flags: it names the scanned-for patterns above as prose, which is the point of the file — 2026-08-06
<!-- provenance:in-repo:end -->

---

## Upstream files — closing the three PENDING rows

`03-UI-SPEC.md` § Vendoring Safety recorded these three as
*"PENDING — not reviewed this session; no claim is made about them."* They live in the sibling
repository, **not** in this one, so they are recorded here separately and are deliberately outside
the two-way file-set equality above.

**All three were read in full on 2026-08-06, and no glyph was taken from any of them.** Their
disposition is `not vendored`. Recorded either way, because the PENDING rows close on evidence, not
on the absence of a decision.

<!-- provenance:upstream:begin -->
- `message-square-more.tsx` — not vendored; read in full — 126 lines; flags: `xmlns="http://www.w3.org/2000/svg"` only. Imports `motion/react`, `react`, and `@/lib/utils`. No network, env, or dynamic-execution construct — 2026-08-06
- `sparkles.tsx` — not vendored; read in full — 149 lines; flags: `xmlns="http://www.w3.org/2000/svg"` only. Imports `motion/react`, `react`, and `@/lib/utils`. No network, env, or dynamic-execution construct — 2026-08-06
- `square-pen.tsx` — not vendored; read in full — 102 lines; flags: `xmlns="http://www.w3.org/2000/svg"` only. Imports `motion/react`, `react`, and `@/lib/utils`. No network, env, or dynamic-execution construct — 2026-08-06
<!-- provenance:upstream:end -->

`search.tsx` (95 lines, same flags, same imports) was already recorded as reviewed in
`03-UI-SPEC.md`; it is the **shape exemplar** for every file above and was likewise re-read in full
on 2026-08-06. No glyph was taken from it either — only its structure.

---

## Three glyphs are vendored with no consumer

`CrosshairIcon.tsx`, `PlusIcon.tsx`, and `MinusIcon.tsx` are imported by nothing. The floating
camera cluster (D-21) draws its own inline glyphs, and wiring these components into it would put
entrance and hover animation on camera chrome D-21 does not describe.

Until `03-10` each of the three carried a `Consumer:` line naming *"the floating map controls"* —
a claim the code did not support, in the file that exists to be evidence. `03-08` recorded the
mismatch and deferred it; `03-10` **corrected the three lines** rather than wiring the glyphs, and
the choice is written here so a later reader can tell an unconsumed glyph from a forgotten one.

No gate requires an icon to have a consumer, and none was added: `iconContract.test.ts` asserts
inventory, sizing, provenance, and forbidden constructs, and a consumer assertion here would have
to be waived for exactly these three on its first run.

---

## Re-vendoring rule

The `strokeWidth` **2→1.5** local patch and its marker comment must be re-applied on any
re-vendor. Upstream ships `2`. The marker exists because a registry re-add silently overwrites the
patch, and a 2px glyph next to a 1.5px one is a difference nobody reads as a regression.

---

*Last updated: 2026-08-06 — the three unconsumed glyphs' `Consumer:` lines corrected: they named
the floating map controls, which import none of them; the choice to correct rather than wire is
recorded above (plan 03-10). Earlier the same day: created with the 14-glyph inventory, and the
three previously PENDING upstream rows closed with a dated `not vendored` disposition (plan 03-02).*
