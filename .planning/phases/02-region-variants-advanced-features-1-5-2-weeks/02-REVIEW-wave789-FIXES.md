# Wave 7-9 Review — Fix Disposition

Fixes for [`02-REVIEW-wave789.md`](02-REVIEW-wave789.md) (2 HIGH, 4 MEDIUM, 8 LOW).

Primary checkout, `gsd/phase-01-pattern-map`. No worktree, no junction, hooks run, no
`--no-verify`.

| Commit | Findings |
|---|---|
| `0d7bfdf` | HIGH-1, HIGH-2 |
| `01e8e2c` | MEDIUM-1 |
| `101073e` | MEDIUM-2 |
| `44fa474` | MEDIUM-3 |
| `5830751` | MEDIUM-4 |
| `0d65945` | LOW-1 … LOW-8 |

Every finding was re-verified against HEAD before it was touched. **All fourteen still
reproduced** — the `02-24` UI-SPEC gap closure (`d23f5c8`, `7efb922`, `8ea9fe0`) moved line
numbers but resolved none of them. Nothing is reported as already-fixed.

---

## HIGH-1 / HIGH-2 — preference blocks defined only one scheme

**Fixed in one commit; one root cause, one file, one test.**

`theme.css` gave the three glass surfaces dark values inside `prefers-color-scheme: dark`, then
`prefers-reduced-transparency: reduce` and `prefers-contrast: more` reset them to light literals
with no dark counterpart. Both come later at equal specificity, so they won in dark mode. The
same contrast block set `--text-secondary` / `--text-muted` / `--border-default` to `#1f2937`
unconditionally.

Measured on the pre-fix stylesheet, by resolving the real cascade:

| Preference | Text on surface | Ratio |
|---|---|---|
| dark + reduced transparency | `--text-primary #f8fafc` on `--glass-app-bar #f8fafc` | **1.00:1** |
| dark + more contrast | `--text-secondary #1f2937` on `--surface-card #151b20` | **1.17:1** |

**Surfaces derive rather than repeat.** The preference blocks now set
`--glass-*: var(--surface-card)`. `--surface-card` already tracks the scheme, so a
one-scheme-only glass literal is no longer expressible. Cost: the app bar loses its `#f8fafc`
tint under those two preferences in light mode (it becomes `#ffffff`) — cosmetic, and under
"increase contrast" arguably the better direction.

**Text and border literals get a paired dark block.** `@media (prefers-contrast: more) and
(prefers-color-scheme: dark)` restates `--text-secondary: #f8fafc`, `--text-muted: #e2e8f0`,
`--border-default: #e2e8f0`. Derivation is unavailable here because "darken for contrast" has no
scheme-neutral form.

### The contract test pinned the bug green, so it was replaced

`not.toContain('rgba')` plus `blur === 0` are both true of a light hex. The old assertion could
not fail on its own subject.

`phase2CssContract.test.ts` now resolves `:root` through the real cascade for six
(scheme × preference) combinations, follows `var()` alias chains, and asserts a WCAG AA ratio
between resolved text and resolved surface — 54 pairings, with the count itself asserted so the
matrix cannot silently resolve to nothing. A second test requires every literal color in the
contrast block to have a dark counterpart, which is what catches `--border-default` (not text, so
it has no body ratio to meet, and pinning an arbitrary non-text ratio against a deliberately
subtle light hairline would have been noise).

**Proven RED against the pre-fix stylesheet:**

```
AssertionError: dark + reduced transparency: --text-primary (#f8fafc) on
--glass-app-bar (#f8fafc) is 1.00:1.: expected 1 to be greater than or equal to 4.5
Error: Missing rule ":root" under [@media (prefers-contrast: more) and (prefers-color-scheme: dark)].
```

Per `02-24` and the scope guard, `prefers-reduced-transparency` still has no Playwright
emulation. The CSS defect is fixed and statically proven; the **browser** evidence remains
`02-28`'s physical matrix. Nothing here is dressed up as browser evidence.

---

## MEDIUM-1 — focus escaped the load confirmation

`.save-load-confirm` is a *sibling* of the dialog, not a descendant, and carried no `tabIndex`.
Clicking its body text — the ordinary act of reading it — found no focusable ancestor and dropped
focus to `document.body`. The overlay's `onKeyDown` relies on bubbling, so from there Escape was
dead and the Tab trap unreachable; only `.save-load-dialog` is `inert`, so the next Tab reached
the app bar while the surface still claimed `aria-modal="true"`.

`tabIndex={-1}` on the confirmation. The wave-6 inert/Escape layering is untouched — the
confirmation still inerts the dialog behind it and Escape still dismisses only the innermost
layer, both re-asserted by the same test.

The E2E case clicks the body text, asserts focus stayed inside, asserts Tab did not leave, then
asserts Escape dismisses only the confirmation. **Proven RED** against the pre-fix component
(`toHaveCount(1)` on `.save-load-confirm :focus` failed).

---

## MEDIUM-2 — the PNG gate passed on a blank export

Cross-context equality plus a 1080×1080 dimension check is satisfied by three identical all-white
squares, which is exactly what a `foreignObject`/CORS or `isolation` regression produces in every
context at once.

The probe now counts, over the whole image (grid-independent, unlike the review's suggested
`samples.some(...)`), pixels that are not the white frame and pixels holding the exact `#DC2626`
the test applies. Both are asserted as positive content **before** the contexts are compared, and
compared across contexts afterwards.

Both assertions were forced red to confirm they fire and to record the margins:

| Measure | Actual (Chrome) | Threshold |
|---|---:|---:|
| non-white pixels | 71,042 | 10,000 |
| applied `#DC2626` pixels | 1,157 | 200 |

---

## MEDIUM-3 — dead motion tokens (**wired, not deleted**)

**Decision: wire.** UI-SPEC 4.4 names all three tokens (`--motion-scene` 160ms,
`--motion-camera` 240ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`), so deleting them would be a
spec deviation, not a cleanup.

**One correction to the brief.** The task described a reduced-motion user "currently still
getting the 160ms crossfade". That is not accurate — `MapCanvas` already branched on
`prefersReducedMotion()`. The review states this correctly. But investigating it surfaced a
**larger** defect the review did not catch:

- `useCameraController`'s transition read `CAMERA_MOTION_DURATION_MS` and honoured
  `prefers-reduced-motion` **not at all**, animating for 240ms on Locate and Reset View — while
  UI-SPEC 17/18 require both to be immediate under reduced motion, and the contract test's
  `--motion-camera: 0ms` assertion read as proof that they were.
- `--easing-camera` was unread, so **both** transitions ran on d3's default `easeCubic` rather
  than the SPEC'd curve.

New `src/utils/motion.ts` reads each token off the rendered `svg`, parses the CSS `<time>`, and
solves the `cubic-bezier()` into a d3 easing function. The TS constants survive only as the
unstyled-environment fallback, and that path still checks the media query itself, so an
environment with no stylesheet cannot animate for a user who asked it not to.

Guards added so this cannot recur:

- the contract test asserts every `--motion-*` / `--easing-*` token has a consumer;
- `responsive.spec.ts` asserts the tokens resolve on the real `svg.map-canvas` at `0ms` under
  reduced motion **and** at `160ms` / `240ms` / the SPEC curve when not — the second case being
  what stops "0ms unconditionally" from satisfying the first.

---

## MEDIUM-4 — `.map-unit-path` outside the export guard

Added to `EXPORT_CONTENT_PATTERN`. Because the pattern is a hand-maintained list that rots
silently, it is now bound back to the component: the test asserts each listed class is still
rendered by `MapCanvas` **and** matched by the pattern, so removing a class breaks the test rather
than leaving the guard protecting a ghost.

---

## LOW findings

| # | Disposition |
|---|---|
| LOW-1 | **Closed, not just documented.** The zero-legend branch now compares against `source.ownerDocument`: zero in the source is accepted only when the document has zero too, so a legend hoisted *above* the export source is refused instead of shipping a legend-less PNG under a success toast. Safe to read the document — `exportMapPng` requires a connected source and runs the check before any clone is appended. Proven RED. |
| LOW-2 | **Fixed.** `collectReferencedIds` scans `<style>` `textContent` as well as attributes. The JSDoc already claimed this coverage. |
| LOW-3 | **Fixed.** Merged the duplicate `.app > header` mobile blocks; `findRule` now throws on a duplicate `(selector, conditions)` pair. This mattered beyond the header: the `.app { overflow-x }` guard could be defeated by appending a second `.app` rule — the exact regression it exists to prevent. |
| LOW-4 | **Deleted.** Neither `--map-fill-non-selectable` nor `--map-border-historical` appears in UI-SPEC; nothing referenced either; non-selectable units carry `DEFAULT_COLOR` from JS, and the historical chain is deferred. Wiring them would have invented a treatment into the render path. A "every `--map-*` token has a consumer" test replaces the false assurance their `FIXED_EXPORT_TOKENS` membership gave. |
| LOW-5 | **Fixed properly rather than by comment.** `App.handleExport` returns the promise, so `Controls`' activation lock covers the export instead of releasing one microtask after the click. The comment was also corrected to state the dependency. |
| LOW-6 | **Fixed.** `compositionName` is cleared by `Reset All Colors` and by deleting the saved map it names (new `SaveLoad` `onDeleted` callback — the delete is the child's event, so it reports upward rather than reaching into App state). Proven RED in Chrome: the third export downloaded `Baltic_Tour_2026_2026-07-26.png` for a deleted map. |
| LOW-7 | **Accepted as-is, and recorded rather than assumed benign.** `touch-action: none` is required for d3-zoom gesture ownership; removing it would break the pan/zoom the square exists for. It is not a scroll trap (the square is ~375px of a ~667px viewport, leaving the inspector as a scroll and pinch origin), but whether it is acceptable in the hand is a human judgement. New `02-28` matrix cell **B1.7** asks for both halves: the camera zooms, and the page is still magnifiable outside the square. |
| LOW-8 | **Assumptions asserted rather than documented.** The parser's constraints are now enforced: no quoted `;`, `{`, or `}` in any stylesheet, balanced braces, and a non-zero rule count. A desynchronised walk fails loudly instead of silently voiding every assertion in the file. |

---

## Live invariants

| # | Invariant | Status |
|---|---|---|
| 1 | Selection/color cannot reach a country outside the scene; history is colors-only | **Held.** `compositionName` is still App-local `useState` and still absent from every history snapshot. LOW-6 only added two *clear* sites. |
| 2 | No raw `legend.position` read | Untouched. |
| 3 | One `MapCanvasHandle`, one `svg.map-canvas` across 1200px | **Verified** — `transactions.spec.ts` and `responsive.spec.ts` green. |
| 4 | Legend inside the canonical SVG via `legendSlot` | **Strengthened, never weakened.** No containment assertion was moved, relaxed, or migrated to a fixture; LOW-1 added a refusal for the one arrangement the structural gate previously accepted. |
| 5 | 195-core catalog, rows disabled not removed | Untouched. |
| 6 | Catalog-driven period selector; historical deferred | Untouched. `--map-border-historical` was deleted *because* the chain is deferred. |
| 7 | Legend opacity single 0-100 scale | Untouched. |
| 8 | PNG 1080×1080, opaque, map-only, theme/DPR-independent | **Verified, and now non-vacuously** (MEDIUM-2). |
| 9 | `CameraFreezeLease` released in the outermost `finally` | **Verified** — the four-refusal-class sequence passes. LOW-5 changed only who awaits the promise, not the lease. |
| 10 | Exact landmark counts at both layouts | **Verified** — `responsive.spec.ts` green at every viewport. |
| 11 | Nested confirmations `inert`; Escape dismisses the innermost layer | **Preserved and re-asserted** in the same test as MEDIUM-1. |
| 12 | No "Refresh the page" in export messages | **Verified** — re-asserted by `transactions.spec.ts`. |
| 13 | 48px minimum touch targets | **Verified** — measured at 360px and 1440px. |
| 14 | No positional selectors on interactive elements | **Verified** — contract green. |

---

## Gates

| Gate | Result |
|---|---|
| `npx tsc -b` | clean |
| `npm run lint` | clean, zero warnings |
| `npx vitest run` | **516/516**, 38 files (was 514/514, 37) |
| `npm run build` | clean (pre-existing >500 kB chunk advisory only) |
| `npx playwright test --project=chrome` | **69/69** (was 68/68) |
| `npx playwright test --project=msedge` | **69/69** |

---

## Coding rules

Updated in the same commit as each behavioral change, per the owner's instruction.

`frontend.md` — a preference media query must define both schemes (derive surfaces, pair
literals); a token contract asserts a resolved relationship, not a shape; every focus host in a
layered modal owns its own `tabIndex={-1}`; a declared token needs a consumer and d3 transitions
read tokens too; one CSS rule per `(selector, conditions)` pair and `findRule` throws on a
second; a local lock is only as good as the promise it awaits; composition identity is cleared
when what it names stops existing.

`export.md` — a pixel probe that only asserts cross-context equality passes on a blank canvas, so
assert content first; a zero-legend source is innocent only when the document has none either;
`<style>` text carries id references too; the export-unsafe-CSS guard lists every path class
`MapCanvas` renders, bound back to the component.

---

## Note on process

While proving LOW-6 red I ran `git checkout --` on `src/components/SaveLoad.tsx`, which discarded
that file's uncommitted LOW-6 edits — the mistake this session was explicitly warned about. The
MEDIUM-1 fix in the same file was already committed and unaffected. The three lost edits were
re-applied immediately and re-verified green before the commit; no work reached a commit in a
reverted state. For the other RED probes I used a scratchpad copy and restored from it, which is
what I should have done here.

---

_Fixed: 2026-07-26_
_Source review: `02-REVIEW-wave789.md` (independent non-author, deep, pinned `d31d3ee..f33c6ea`)_
