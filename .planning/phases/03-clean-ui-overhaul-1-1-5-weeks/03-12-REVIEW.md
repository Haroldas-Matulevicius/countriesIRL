# Phase 3 — Independent Review (plan `03-12`)

**Date:** 2026-08-06
**Range reviewed:** `git diff acceptance-02-28..HEAD` (tag → `fe5f946060707c48c3d9591d368b5f3f8f90dd4d`)
**HEAD at review:** `6b1032c` — `docs(3-11): complete the export-path ownership plan`
**Reviewer configuration:** **`independent`** — a fresh agent session with no execution history in this phase.

> **This review is a disconfirmation exercise, not a sign-off.** Every SUMMARY claim below was
> treated as unverified until checked against the tree. Where a SUMMARY was right, that is
> recorded as a verified PASS; where the tree disagrees with a document, the tree wins.

---

## Reviewer independence

### Checkpoint: Task 1 — `checkpoint:decision`, gate `blocking`

**Selection: `independent`.** Recorded 2026-08-06.

**(a) The structural fact.** Each of `03-01` through `03-11` executed in a separate subagent with
its own fresh context. This review runs in a twelfth, newly spawned agent. Its entire knowledge of
Phase 3 comes from reading the repository — the plans, the summaries, the source, the tests, and
the git history — not from having written any of it.

**(b) Commit authorship under review.** `git log --format='%an %ae' acceptance-02-28..HEAD`:

| Author | Commits |
|---|---|
| `Haroldas Matulevicius <matul@Mac.lan>` | 78 |
| `Haroldas <haroldas444@gmail.com>` | 13 |
| **Total in range** | **91** |

Of those 91, **56** (`a16ea39^..HEAD`) are Phase 3 *execution* commits (`03-01`…`03-11`). The
remaining 35 are Phase 2's documentation tail and Phase 3's planning commits, which predate any
execution work. **A later reader must not attribute the 35 to Phase 3** — the tag `acceptance-02-28`
marks the Phase 2 *verified build*, not the Phase 3 *start line*, and six of those 35 commits touch
Phase 2's own evidence directory (see § Immutable Safety Constraints, constraint 5).

**(c) Explicit statement.** **I authored none of the commits under review.** I wrote no source file,
no test, no stylesheet, and no summary in this phase. The only files this review creates are
`03-12-REVIEW.md` and `03-12-SUMMARY.md`.

### Owner authorization held

At session start the owner said, verbatim:

> "I am going to sleep, so if something comes up, find best solution."

and

> "I want you to complete this fully."

**This is a BLANKET, IN-ADVANCE, SIGHT-UNSEEN PROCEED-AUTHORIZATION.** It authorizes proceeding.
It is **not** a content review and it is **not** hash-bound (Immutable Safety Constraint 8). The
owner reviewed no content, inspected no diff, and performed no check of any kind — physical,
visual, or otherwise — in this session or in any Phase 3 session.

---

## Gate evidence (numbers)

All four commands were **run by this reviewer** on 2026-08-06 against `6b1032c`, in the order
below. These are measured numbers, not numbers copied from a SUMMARY.

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` (`eslint .`) | **PASS** — exit 0, no diagnostics emitted |
| Unit | `npm test` (`vitest run`) | **PASS** — **42 test files, 637 tests, 637 passed, 0 failed**, 2.80s |
| Build | `npm run build` (`tsc -b && vite build`) | **PASS** — 1068 modules; `index.js` 555.69 kB (gzip 205.95 kB), `index.css` 47.51 kB (gzip 7.65 kB), `inter-latin-variable-8kRkwJBP.woff2` 48.43 kB |
| E2E | `npx playwright test --project=chrome --reporter=line` | **PASS** — **103 tests, 103 passed, 0 failed**, 2.1m, 13 spec files |
| Data integrity | `npm run data:world:check` | **PASS** — 248 units, 195 selectable core states |

One non-blocking build warning is emitted and is pre-existing: the JS chunk exceeds Vite's 500 kB
advisory threshold. It is not a regression introduced by this phase and no plan was scoped to
address it.

### Browser scope — Chrome only; Edge not certified — not installed

- **Chrome — certified.** `playwright.config.ts` declares the `chrome` project with
  `channel: 'chrome'`, i.e. the **installed** browser, not a bundled Chromium. Installed version,
  read by hand from `Google Chrome --version`: **151.0.7922.75**. The suite's own captured
  `userAgent` during the run was `HeadlessChrome/151.0.0.0`, consistent with that install under
  Chrome's reduced-UA format.
- **Edge not certified — not installed.** `/Applications` holds no `Microsoft*.app`, and
  `~/Library/Caches/ms-playwright` holds only `ffmpeg-1011`. The `msedge` project uses
  `channel: 'msedge'` (system Edge), so it cannot launch. `npx playwright test --project=msedge --list`
  enumerates 103 tests, which proves only that the *project is declared* — no Edge test was
  executed and **no Edge result is claimed**.
- **Firefox — unverified.** Never run in this repository. Not in the Playwright configuration.
- **Safari — unverified.** Never run in this repository. Not in the Playwright configuration.
  Safari is additionally the *documented exception* for `03-11`'s data-URI-font-in-SVG-image
  technique: recorded, not solved, and never described as cross-browser.
- **Previous-version certification — unverified.** Never run here.

**Browser versions are recorded by hand and are not machine evidence.** No evidence artifact in
this phase captures a browser version; the Phase 2 limitation (Node, npm, platform, arch only)
still applies.

**This review deliberately cites no Phase 2 Edge record.** That record is immutable Phase 2
evidence — to be annotated, never rewritten — and resolving how it came to exist on a machine with
no Edge installed is Phase 2's work, filed as a pending todo against Phase 2's evidence. Phase 3
neither repeats it nor relies on it.

---

## ZERO physical verification — stated plainly

**Nobody has looked at the restyled editor.** Not the light theme, not the dark theme, not the tool
rail, not the flyout panel, not the bottom bar or bottom sheet, not the map tooltip, not the
floating camera cluster, and **not a single exported PNG**. No touch-target check, no screen-reader
pass, and no visual judgement of any kind has been performed by a human at any point in Phase 3.

Every result in this document is an **automated** result. Immutable Safety Constraint 8 forbids
substituting an automated result for a physically performed check, and this review does not do so.
A green gate is evidence that the code does what the tests describe; it is **not** evidence that
the product looks right, reads right, or feels right. Phase 3 restyled essentially the whole
creator-facing surface, and the entire visual outcome of that work is **unreviewed**.

`Design.md` § 7 ("CountriesIRL-only anatomy") is marked **`[FOR REVIEW]`** at `Design.md:396` and
has never been reviewed. It is recorded as deferred item D-3.

---

## Findings ledger

Severity key: **HIGH** = blocks the phase or a creator; **MEDIUM** = a real defect that should be
fixed before the next phase builds on it; **LOW** = drift, weak gate, or doc inaccuracy;
**INFO** = verified fact worth recording, no action required.

| # | Sev | Subject | Location | Defect | Remedy |
|---|---|---|---|---|---|
| F-1 | **HIGH** (creator-facing; by design, needs UAT) | Legend label fit budget halved | `src/utils/legend.ts:86-92`, `:562-565` | `LEGEND_CHARACTERS_PER_LINE` went `{24,18,14}` → `{10,7,6}`. With a 2-line cap, labels longer than **20 / 14 / 12** chars (small/medium/large) are now **export-blocked**. At `medium` (the default) the previous effective ceiling was 36 chars against a 32-char input cap — i.e. **nothing could be blocked**. It is now 14. "Southern Europe" (15) is blocked. | Not a code defect — it is D-25/OQ-5's deliberate anti-clipping guarantee, correctly recorded at `03-11-SUMMARY.md:247,547`. **Must be exercised by a human in UAT**: type a 15-char label at medium and confirm the inline invalid state and the refusal read acceptably. If the budget is too tight for real use, the remedy is a wider label column, not a looser table. |
| F-2 | **MEDIUM** | Assertion 24 does not guard the token half of Live Invariant 9, and the UI-SPEC row reads as though it does | `03-UI-SPEC.md:1091`; gate at `tests/e2e/responsive.spec.ts:1459` | Verified structurally in the tree: `createExportFrame` appends the frame to `document.body` (`src/utils/export.ts:525`) — outside `.map-editor`, which is where D-30 scopes `.dark` — and hard-sets `background`/`background-color`/`colorScheme` inline on both the frame (`:398-400`) and the clone (`:414-416`), while `sanitizeExportClone` hard-sets stroke inline (`:336-349`). A `.dark { --map-surface: … }` regression therefore **cannot** redden assertion 24. Both `03-09` (probe A) and `03-11` (probe 9A) ran that exact break and captured it staying **GREEN**. | The executors' handling was exemplary — they reported it rather than repeating the plan's premise, and RED-proved assertion 24 on a *composite* defect instead. The residue is documentary: `03-UI-SPEC.md:1091`'s RED-probe column still says "make the export theme-sensitive on purpose (D-35)" via the token route, which is false. Amend that row, or annotate it, so the next reader does not treat assertion 24 as the token contract's browser guard. **Assertion 4 (`src/styles/uiContract.test.ts:1767`) is the only guard for the token axis, and it is real.** |
| F-3 | **MEDIUM** | `coding-rules/*.md` describe a rasteriser that no longer exists | `.planning/coding-rules/general.md:224`; `.planning/coding-rules/frontend.md:542`, `:735` | Three statements present `html2canvas` as live shipped behaviour: "PNG export in <3 seconds — html2canvas timeout should never fire"; "which html2canvas rasterizes differently than the browser paints it"; "html2canvas approximates effects differently than the browser paints them". `html2canvas` was removed by `03-11` (D-34) and appears nowhere in `package.json`, `package-lock.json`, `src/`, or `tests/`. The *rules* are still correct; their stated *reasons* are retired. | **FIXED by this review** — see § Changes made by this review. `export.md` was correctly rewritten by `03-11` and is accurate. |
| F-4 | **MEDIUM** | Two routing documents still list `html2canvas` in the stack | `CLAUDE.md:21`; `.planning/STATE.md:36` | Both stack lines read "…D3 v7 SVG; html2canvas; localStorage…". `CLAUDE.md` is the first file every agent reads. | **Not fixed here** — `CLAUDE.md` is outside this plan's authorized edit set, and `STATE.md` is hand-maintained by the orchestrator. Filed for the orchestrator: strike `html2canvas` from both stack lines and replace with the owned SVG→`data:` URL→`drawImage`→`toBlob` path. |
| F-5 | **LOW** (gate that cannot fail — in this plan's own verify block) | The scope-reduction audit command can never pass | `03-12-PLAN.md:208` | The command strips only `placeholder=`, `'placeholder'`, and `"placeholder"`, then matches `for now` and `placeholder` over the added lines. Two **false positives** survive and make it exit 1 unconditionally: a test assertion that *forbids* the phrase (`expect(markup).not.toMatch(/coming soon\|not yet\|for now\|will be/iu)`) and an identifier import (`CUSTOM_COLOR_PLACEHOLDER`). The gate reddens on the gate that enforces it. | Re-run with identifier-aware stripping (see § Scope-reduction audit — the corrected run is **clean**). If the command is kept, strip `[A-Z_]*PLACEHOLDER[A-Z_]*` and exclude lines inside negative assertions. |
| F-6 | **LOW** (gate that cannot fail — in this plan's own verify block) | The Phase 2 evidence guard cannot fail on the bug it covers | `03-12-PLAN.md:432` | `git diff --quiet HEAD -- .planning/phases/02-…/` compares the **working tree to HEAD**. Any *committed* change to Phase 2's evidence — which is exactly the threat T-03-61 names — passes it silently. It proves only that nothing is uncommitted. | Compare across the phase range instead. I ran the correct check: `git diff --stat 2b15bc7..HEAD -- .planning/phases/02-…/` is **empty**, so Phase 3 (planning *and* execution) changed nothing there. Result recorded under constraint 5 below. |
| F-7 | **LOW** | Two e2e specs shadow harness helpers they now import from | `tests/e2e/persistence.spec.ts:82`, `:6,:11,:12`; `tests/e2e/phase2-composition.spec.ts:61` | Both files import from `./support/appHarness` but re-declare `readCameraTransform`, `expectD3ZoomSynchronized`, `CAMERA_GROUP_SELECTOR`, `LOGICAL_PATH_SELECTOR`, and `LOGICAL_CORE_COUNT` as byte-equivalent local copies of harness exports (`tests/e2e/support/appHarness.ts:5-8,149,163`). Two definitions of one contract drift silently. | Delete the locals and import them. This is the pre-existing pending todo carried in `STATE.md`; Phase 3 *created* the harness and *edited* both files (+172 / +245 lines) without closing it, so the opportunity was present and passed. Not a Phase 3 regression — but it is now a duplication rather than an absence, which is worse. |
| F-8 | **LOW** | `dataBasePath` is unvalidated at the mountable boundary | `src/config/editorConfig.ts:42-54`; `src/components/editor/MapEditor.tsx:36-40` | `resolveEditorAssetUrls` accepts any string and concatenates. A host mounting `<MapEditor dataBasePath="https://third-party.example/" />` would make the editor issue **runtime third-party requests** — banned outright by `coding-rules/general.md` § Forbidden Patterns. Nothing asserts the base path stays same-origin. | Low in practice: the default is `/data/`, no host exists, and the world asset is sha256-verified against its manifest, so substituted geometry would fail integrity. Add a same-origin/relative-path guard (and a gate for it) **before** any host actually mounts this. Recorded now so it is not discovered by the embedding work. |
| F-9 | **INFO** | One refusal message is wrong for one unreachable input | `src/utils/legend.ts:660-667` | `getLegendBlockingMessage` returns `LEGEND_LABEL_FIT_MESSAGE` ("Shorten this label so it fits in the exported legend.") for `invalid-label`, which also covers an **empty** label — where "shorten" is the opposite of the correct advice. | Unreachable through the UI: `resolveLegendLabelCommit` (`src/components/LegendEditor.tsx:116-134`) rejects an empty draft first with a distinct `'Enter a legend label.'` and restores the prior label. Only a hand-crafted storage record reaches the wrong string. No action required; recorded so a future refactor does not remove the editor-side guard and inherit the wrong copy. |
| F-10 | **INFO** | Production export code reads a test-only global | `src/utils/export.ts:71-75`; `src/constants/config.ts:42-43` | `isExportFontFaceSuppressed()` reads `globalThis['__COUNTRIESIRL_TEST_ONLY_SUPPRESS_EXPORT_FONT_FACE__']`. Any script on the page (console, extension) could set it and silently get font-less PNGs under a success toast. | Accepted as the correct trade: assertion 25's pixel half **cannot go RED without this seam**, and a gate that cannot fail is the worse defect. The seam is documented at both sites, no product code writes it, and it is not read from storage. Localhost-only scope makes the exposure theoretical. Revisit if the editor is ever embedded or hosted. |
| F-11 | **INFO** | The review range is wider than Phase 3 | `git log acceptance-02-28..HEAD` | 91 commits in range; only 56 are Phase 3 execution. Six of the other 35 modify `.planning/phases/02-…/` (`5366367`, `82f9079`, `2e095a0`, `dbd711f`, `c30090b`, `10aaf49`) — all Phase 2's own documentation tail, landed before Phase 3 began. | No action. Recorded because a naive `git diff acceptance-02-28..HEAD -- .planning/phases/02-…/` shows 7 changed files and looks like a constraint violation. It is not one. |

**No finding is marked resolved on an executor's say-so.** F-2, F-5, F-6, F-7, F-8 and F-11 were each
established by running the check in the tree at `6b1032c`, not by reading a SUMMARY. F-3 was fixed by
this review and re-verified (§ Changes made by this review).

---

## The 13 review-focus items

### 1. Export size contract — exactly 1080×1080, and the assertion can fail — **PASS**

`EXPORT_SIZE = 1080` (`src/constants/config.ts:33`). `src/utils/export.ts:538-550` assigns
`canvas.width`/`canvas.height` and then **reads them back**, returning `invalid-dimensions` if a
browser clamped or zeroed the surface — the assertion is on the realised object, not the
assignment. `SVG_VIEWBOX` is `0 0 1080 1080` (`:19`); the clone renders at `EXPORT_FRAME_SIZE` 540
with `EXPORT_SCALE` 2. Downloaded-byte checks exist in `tests/e2e/shell.spec.ts:218` (1080 square
after a panel open/close cycle) and `tests/e2e/export.spec.ts`. **Can it fail?** Yes — it fails on
a real substitution of either dimension, and `shell.spec.ts:218` measures the decoded PNG rather
than the constant.

### 2. `html2canvas` fully gone — **PASS**

`grep -rn "html2canvas" package.json package-lock.json src tests scripts` returns **zero** matches.
The build produces no such chunk. The only surviving references are in prose documents (F-3, F-4).

### 3. No network at runtime; Inter is same-origin bundled — **PASS**

No `fonts.googleapis.com`, no `fonts.gstatic.com`, no `@import url(http…)` anywhere in `src/`,
`public/`, or `index.html` — the only hits are inside `src/assets/README.md`, which *documents the
provenance URL the bytes were fetched from at vendoring time* and explicitly states the ban. Three
runtime fetches exist (`src/utils/snapshotScene.ts:70`, `src/hooks/useSnapshotCatalog.ts:27`,
`src/hooks/useGeoData.ts:404`), all resolved from `DATA_BASE_PATH = '/data/'`
(`src/config/editorConfig.ts:23`) — same-origin. Inter ships as a **bundled 48.43 kB
`inter-latin-variable-*.woff2`** emitted into `dist/assets/`, inlined into the export clone as
base64 (`src/styles/interFontFace.ts`) so the isolated SVG-as-image document needs no request at
all. Caveat F-8 applies to a *host-supplied* base path only.

### 4. `exportMapPng` is still pure — **PASS**

Signature is `(source: HTMLElement, date?, mapName?)` (`src/utils/export.ts:490`). It reads nothing
from React state, no hook, no store, no provider. It clones an already-frozen composition
(`cloneNode(true)` at `:406`) and mutates only the clone. Its one document read —
`source.ownerDocument.querySelectorAll('[data-layer="legend"]')` at `:286` — happens **before** the
clone is created and appended (`:518`, `:525`), with the ordering justified in a comment at
`:281-283`; I verified the ordering in the code, not the comment. Cleanup is a nested
`finally` chain (`:596-608`) that removes anchor, object URL, and frame on **every** path.

### 5. Export membership by placement — **PASS**

`MapWorkspace.tsx` declares the typed `legendSlot` (`:52`) and `navigationSlot` (`:78`).
`legendSlot` renders **inside** `div.map-export-source` (`:163`); `navigationSlot` renders **outside**
it (`:191`). The comment at `:168-185` states the rule and marks the export frame as deliberately
*not* a slot. `03-05`'s probes 5 and 6 RED-proved both halves (navigation moved inside the
canonical SVG; legend hoisted above the camera layer). Belt-and-braces at runtime:
`isSingleCanonicalComposition` (`src/utils/export.ts:257-293`) refuses `invalid-composition` when a
legend exists in the document but not in the source — the widened comparison at `:284-290` closes
the `0 === 0` hole that once shipped a legend-less PNG.

### 6. Zero `prefers-color-scheme` reads — **PASS**

Three matches repository-wide, and **all three are gates or their prose**:
`src/App.test.tsx:599,605` (asserts the composed source does not contain it) and
`src/styles/uiContract.test.ts:1613` (assertion 1's comment). No stylesheet at-rule, no
`matchMedia` call, no seeding of a first-run default. Assertion 1 has **two** halves — the CSS
half RED-proved by `03-04` probe 2, the production-TS half added and RED-proved by `03-06` probe 5.
D-30 is fully honoured.

### 7. Approved snapshot catalog is exactly `Modern` — **PASS**

`public/data/snapshots/index.json` holds exactly **one** entry, `modern`, sha256-pinned.
`public/data/` is **byte-unchanged** across the whole range (`git diff --stat acceptance-02-28..HEAD -- public/data/`
is empty). `SNAPSHOT_CATALOG` (`src/constants/snapshots.ts:19-28`) remains a five-entry **label
registry** — reachability is decided by the approved manifest, and the file says so at `:9-14`.
Assertion 13 (`src/styles/uiContract.test.ts:1006`, `src/App.test.tsx:672`) proves the period
surface renders resolved manifest options only and that none of the four historical labels appears
within `.period-hud`; RED-proved by `03-07` probe 3. `03-07` additionally added an approved-id
filter to `getPeriodShortLabel`, RED-proved against a **planted `1914` record** (probe 4). No UI
surface and no Phase 3 document describes a historical snapshot as available. See constraint 3
below for the one residual fact.

### 8. Storage bounds before `JSON.parse`; adapter is the only site — **PASS**

`src/utils/storage.ts:736` checks `serialized.length > MAX_STORAGE_SERIALIZED_LENGTH` (1,000,000)
**before** the parse at `:177`, and post-parse structural bounds follow (`MAX_STORAGE_JSON_DEPTH`
32, `MAX_STORAGE_JSON_NODES` 50,000 at `:216-217`; `MAX_SAVED_MAPS` slice at `:767`). The two new
Phase 3 preference keys bound the **raw string** at `MAX_PREFERENCE_VALUE_LENGTH` 32 before it is
interpreted at all (`src/constants/config.ts:17-23`). **Exactly one** production reference to
`localStorage` exists in `src/` — `storage.ts:170` — confirming the one-storage-site gate `03-05`
landed. `MapEditor` takes a `StorageAdapter` prop so a host substitutes persistence wholesale.

### 9. Mountable boundary intact — **PASS**

`src/components/editor/MapEditor.tsx` names **no** host global: a grep for
`window.|document.|globalThis|localStorage|navigator|location` over that file returns **nothing**.
The empty-set assertion holds, and `MapEditor.test.tsx` enforces it as a plain text scan with the
comment discipline that keeps prose from reddening it (`:23-27`). No backend, auth, network, env,
deployment, or Themely import was added anywhere in `src/` — a grep for `themely|Themely` in
imports returns nothing (the token *namespace* `--themely-*` is CSS text, not a dependency). The
file's own comment at `:29-32` records that the absence of auth and network is deliberate and that
embedding needs a new explicit owner decision. F-8 is the one gap: the boundary is *clean* but the
`dataBasePath` prop is *unguarded*.

### 10. Gates that cannot fail — **TWO FOUND, both in this plan's own verify block; the phase's 28 assertions hold**

**Found: F-5** (`03-12-PLAN.md:208`) and **F-6** (`03-12-PLAN.md:432`), detailed in the findings
ledger. Both are in `03-12`'s verification, not in shipped test code. F-6 is the more serious of
the two because it purports to guard T-03-61 (Phase 2 evidence altered) and cannot.

**Sampled and cleared** — each of these was read in full and judged on whether it can fail on its
own subject:

- **Assertion 19, the contrast matrix** (`src/styles/uiContract.test.ts:2007`). `EXPECTED_CONTRAST_ROWS = 96`
  is a **literal**, deliberately *not* `PREFERENCE_CASES.length * TEXT_ON_SURFACE_PAIRS.length` —
  and the comment at `:1996-2004` records that the derived form was **measured** to stay green at
  zero rows. It also asserts each palette resolved to a non-empty set and pins both table lengths
  (6, 16). This is the strongest gate in the phase. **Cannot be satisfied vacuously.**
- **Assertion 21, the selector ceiling** (`:520`). A ceiling is satisfied by zero, so the floor is
  asserted **structurally**: every discovered stylesheet must contribute ≥1 selector (`:534-540`).
  A second test (`:571`) proves the counter reads *parsed* selectors and never comment text, using
  a fixture with a commented-out selector and a `@keyframes` step. **Cannot resolve to nothing.**
- **Assertion 25, the exported legend in Inter** (`tests/e2e/export.spec.ts:470`). Verified against
  all four required properties: it measures **rasterised pixels** from the downloaded PNG bytes
  (`:540-625`); crop bounds are **derived** from `resolveLegendRender` applied to live legend state
  (`:529-538`), never hard-coded; it has a **content floor** (`inkNormal > 500`, `inkSuppressed > 500`
  at `:629-636`) asserted **before** the inequality, precisely because two blank crops satisfy
  "they differ"; and it carries a **blank-crop discrimination control** (`:607-608`, `:649-651`)
  that validates the counting instrument itself. `03-11` captured its RED output with the
  `@font-face` injection deleted. **This is a correctly built pixel gate.**
- **Assertion 24, the export-independence gate** (`tests/e2e/responsive.spec.ts:1459`). It *can*
  fail — `03-09` probe B and `03-11` probe 9B both reddened it with a composite defect, and
  `03-11` probe 9C reddened it a third way (the exporter reading live computed styles). But it
  **cannot** fail on the token defect the UI-SPEC advertises. That is F-2, and it is a scope
  finding against the specification, not a broken test.
- **The self-referential source scan** (`responsive.spec.ts:1072-1094`). It reads its own file and
  asserts `emulateMedia({ colorScheme … })` is absent. It correctly excludes its own regex literal
  (the literal contains `emulateMedia\(`, with an escape between name and paren, so the pattern
  does not match itself). Fragile but sound, and `03-09` probe C RED-proved it by re-adding a real
  emulation call.
- **Assertion 20, glob-vs-import** (`:411`). `03-10` probe 4 is specifically "the one that
  discriminates a SET from a COUNT" — a count-preserving rename — which is the exact vacuity this
  class invites.
- **Assertion 11, frame ↔ viewBox** (`tests/e2e/shell.spec.ts:148`). Worth naming as a **success of
  this discipline**: `03-03` probe 4 found assertion 11 **GREEN against its own probe** as
  specified (`Math.abs(diff) <= 1` accepted a 1px inset), reported it, and tightened the tolerance.
  That is the process working.

No pattern search surfaced anything else: `grep` for `.length * .length` returns only assertion
19's *warning comment about that hazard*; `toBeGreaterThan(0)` hits are all non-emptiness floors
guarding other assertions, not standalone claims; no pixel probe asserts cross-context equality
alone; no probe throws at import.

### 11. Honesty audit — **PASS, no overclaim found**

- **Physical/visual/screen-reader claims:** a scan of all eleven summaries, `Design.md`, and
  `.planning/coding-rules/*.md` for language asserting a performed visual, manual, or
  screen-reader check found **exactly one** match, and it is a **disclaimer**:
  `03-02-SUMMARY.md:97` — *"The owner reviewed no content, inspected no diff, and performed no
  physical check of any kind…"*. That is exemplary and is the correct shape.
- **Browser certification claims:** every Edge / Firefox / Safari mention across the phase is a
  **negative** statement (`03-01:421`, `03-04:742`, `03-05:568,648`, `03-08:405`, `03-09:167,171,696`,
  `03-10:156,546`). Not one claims a pass.
- **"Historical snapshot shipped":** none. The catalog holds one entry, `public/data/` is
  untouched, and no document reads otherwise.
- **Owner approval described as a content review:** none. `03-11-SUMMARY.md:66` records the D-34
  and D-25 gates as answered "on the recorded blanket in-advance authorization" — labelled
  correctly. `03-02-SUMMARY.md:97` is explicit.
- **Test and gate naming:** no test name, `describe` block, or code comment asserts a human
  performed anything.

The executors were more careful about this than the plans required. Recorded as a genuine strength.

### 12. Creator-visible behaviour change flagged by `03-11` — **CONFIRMED TRUE; surfaced for UAT**

Verified in the tree, not taken on the SUMMARY's word:

- **The claim is true.** `LEGEND_CHARACTERS_PER_LINE = { small: 10, medium: 7, large: 6 }`
  (`src/utils/legend.ts:86-92`); `getLabelLineCount` divides by it (`:195-197`);
  `validateLegend` raises `label-does-not-fit` when the count exceeds **2** (`:560-565`). The
  budget is therefore 2×N = **20 / 14 / 12** characters. `LEGEND_LABEL_MAX_LENGTH` remains 32
  (`:21`), so a creator can *type* a label the exporter will *refuse*.
- **The refusal is honest and actionable.** `LEGEND_LABEL_FIT_MESSAGE` = *"Shorten this label so it
  fits in the exported legend."* (`:640-641`). It names the problem and the fix, tells the user
  nothing about internals, and never says "refresh the page".
- **It is routed through `ToastRegion`.** Both legend strings are in the allowlist
  (`src/components/ToastRegion.tsx:3-4,70-71`) with positive coverage in `ToastRegion.test.tsx:63-90`.
- **No retry is offered**, correctly — this refusal is decided synchronously and would refuse
  identically forever. `ToastRegion.test.tsx:300` asserts the overflow message carries no
  "Try Export Again".
- **The creator is warned before export.** `LegendEditor.tsx:209` computes the same blocking
  message and surfaces it inline per row (`[data-entry-invalid]`), so the block is visible in the
  editor rather than only at export time. The export gate reads it at `src/App.tsx:337`.
- **Assessment.** The mechanism is right and the copy is honest. What is unverified is whether
  **14 characters at the default size is enough for real map labels**. This phase changed a hard
  product constraint and nobody has typed a real label into the real UI. **This is the single item
  most in need of human UAT.**

### 13. `coding-rules/*.md` accuracy — **PARTIAL: `export.md` correct, two other files stale**

- **`export.md` — PASS.** Rewritten by `03-11`. Opens with *"There is no third-party rasteriser.
  `html2canvas` was removed by plan `03-11` (D-34)"* (`:6-8`) and describes the owned path. It
  carries exactly two "Last updated" entries (`:462`, `:469`), as the rule requires.
- **`general.md:224` and `frontend.md:542`, `:735` — FAIL.** F-3. Fixed by this review below.
- **`data.md`, `storage.md` — PASS.** Both describe shipped behaviour, including `storage.md`'s
  explicit record that the validator was **deliberately** left unchanged (OPEN ITEM 4).

---

## Live Invariants (9)

| # | Invariant | Verdict | Evidence |
|---|---|---|---|
| 1 | Selection/colour can never reach a country absent from the active scene | **PASS** | `commitScene` reconciliation and the required, intersected `ColorPicker.selectableCountryIds` are untouched by Phase 3; `transactions.spec.ts:238` (historical entity keeps its colour through undo/redo/remount/reload) is green in the Chrome run. |
| 2 | Undo/redo stores colours only, never selection | **PASS** | `src/providers/MapStateProvider.tsx:165-190`: `UNDO`/`REDO` restore **only** `state.colors` from `state.history` and move `historyIndex`. `history` is typed `ColorMap[]` (`:134`). `SELECT_COUNTRY` (`:192`) is a separate action that never writes history. |
| 3 | Nothing reads `legend.position` raw on a render or export path | **PASS** | `LegendOverlay.tsx:194` renders from `resolveLegendRender`, with the reason in a comment at `:190-193`; `:123` derives bounds the same way; drags clamp through `clampLegendPosition` (`:138`). The remaining raw reads are **not** render/export paths: `App.tsx:1081` (an editor label), `CompositionStateProvider.tsx:204,411` (canonicalisation/reducer), `LegendEditor.tsx:636,653,667` (radio `checked` state), and the save/load transactions (copying a stored value). `LegendEditor.tsx:333,347` go through `resolveLegendPosition`. |
| 4 | Exactly one `MapCanvasHandle` and one `svg.map-canvas` across the 1200px transition; lease released from the outermost `finally` | **PASS** | One `mapCanvasHandleRef` in `App.tsx:188`, bound via a single `bindMapCanvasHandle` (`:391`). `tests/e2e/transactions.spec.ts:68` ("every camera callback reaches the one bound handle across the 1200px remount") and `:131` ("every export refusal class releases the camera lease in one session") both green. `export.ts:596-608` is a nested `finally` chain covering anchor, object URL, and frame on every path — including the early synchronous refusals. `03-09` rebuilt the sub-1200px layout as a bottom bar/sheet **in the same grid cell**, which is what keeps the count at one. |
| 5 | `CountryList` and Locate keep the unfiltered 195-core catalog | **PASS** | `npm run data:world:check` reports 195 selectable core states; `LOGICAL_CORE_COUNT = 195` is asserted in the harness and specs. Out-of-scene rows remain disabled, not removed. |
| 6 | The period selector is catalog-driven; deferred snapshots stay structurally unreachable | **PASS** | Assertion 13, two-layer (`uiContract.test.ts:1006` + `App.test.tsx:672`), scoped to `.period-hud`, RED-proved by `03-07` probe 3. `03-07` strengthened it with the approved-id filter on `getPeriodShortLabel`, RED-proved against a planted `1914` record. One residual fact, recorded not absorbed — see constraint 3. |
| 7 | Export strips semantics, never geometry; a legend outside the canonical SVG is a hard refusal | **PASS** | `sanitizeExportClone` (`export.ts:295-357`) removes outgoing scenes, `[data-editor-only]`, `title/desc/metadata`, editor state classes, `role/tabindex/focusable/id/data-*`, and every `aria-*` — and removes **no** path. `collectReferencedIds` (`:195-236`) preserves an `id` that paint resolves through, including ids referenced from `<style>` text. Border normalisation targets `path.scene-path,path.country-path` (`:34`) with the wrapped-Pacific reason stated at `:32-33`. A sibling legend returns `invalid-composition` (`:507-509`), proved by `export.spec.ts:383`. |
| 8 | Legend opacity is a single 0–100 scale; a stored fraction is repaired and reported | **PASS** | `src/utils/legend.ts:25-30` states the one-scale rule; `isBackgroundOpacityValid` (`:203-215`) enforces 70–100 in steps of 5; `storage.ts:334-340` distinguishes percent from fractional and repairs with a warning. Untouched by Phase 3. |
| 9 | The mode-invariant set is declared exactly once in the unconditioned `:root` — **extended to `.dark`** | **PASS at the CSS level; see F-2 for the browser level** | Assertion 4 (`uiContract.test.ts:1767`) covers the full 18-token family across `.dark`, media queries, `@supports`, and nested blocks; assertion 5 (`:1792`) enforces exactly-once plus a live consumer; assertion 26 (`:1861`) pins `--accent-fill`. RED-proved four separate times: `03-04` probes 5, 6, 8, and `03-08` probe 2 (`--tooltip-surface`). **`general.md:31` correctly names `uiContract.test.ts` as the enforcement point** — it does *not* claim assertion 24 backs it up, so the canonical rules file is accurate. Only `03-UI-SPEC.md:1091` misleads. |

---

## Immutable Safety Constraints (10)

| # | Constraint | Verdict | Evidence |
|---|---|---|---|
| 1 | Historical geometry, rights, and factual approvals are never inferred, synthesized, or fabricated | **PASS** | No approval was created, inferred, or referenced as new in Phase 3. `public/data/` byte-unchanged across the range. |
| 2 | No unapproved historical geometry reaches `public/data/` or the production catalog | **PASS** | `git diff --stat acceptance-02-28..HEAD -- public/data/` is **empty**. The approved manifest still holds exactly one entry. |
| 3 | A BLOCKED packet is not a delivered snapshot; "deferred" is not "done" | **PASS, with one residual fact recorded** | Nothing in shipped UI or in any Phase 3 document reads as though a historical snapshot shipped. **Residual, deliberately left by `03-07` and correctly recorded:** `storage.ts:61-63` still builds `SNAPSHOT_IDS` from all five catalog entries and the record validator at `:483-484` still admits any of them, so a **hand-crafted** localStorage record naming `1914` is accepted by the validator. `03-07` filtered the **presentation layer only** (`getPeriodShortLabel`) and deliberately did not change the validator, on the sound ground that a data-layer behaviour change is out of a chrome phase's scope. **The presentation filter is not a validator fix.** Reaching this requires hand-editing browser storage, so it is a weak, local exposure and **not** a path by which a deferred snapshot becomes reachable in the product. It is pre-existing Phase 2 behaviour, not a Phase 3 regression. It is documented at `storage.md:491` and must be carried forward as an outstanding fact against the data layer. |
| 4 | Executor self-approval is forbidden for source/license and factual review | **PASS** | No source or factual approval was self-granted. R-V1 and R-V2 are vendoring gates, discharged as recorded below. |
| 5 | Any changed byte covered by an approval invalidates it until reviewed again | **PASS** | `git diff --stat 2b15bc7..HEAD -- .planning/phases/02-…/` is **empty** — Phase 3 planning *and* execution changed nothing in Phase 2's evidence directory. `git rev-list -n 1 acceptance-02-28` = `fe5f946060707c48c3d9591d368b5f3f8f90dd4d`, the bound SHA. The seven files that differ across the *tag* range were changed by six Phase 2 tail commits that predate Phase 3 (F-11). **`02-25` and `02-28` are both still OPEN** — `02-28-ACCEPTANCE-MATRIX.md:1,3,16` still reads "PREPARED — OPEN OWNER GATE… every remaining cell is `⬜ PENDING`". Phase 3 closed neither and was never authorized to. |
| 6 | The six historical region IDs are never silently merged | **PASS** | `HISTORICAL_REGION_IDS` (`src/constants/snapshots.ts:39-46`) still enumerates all six. Untouched. |
| 7 | Browser-only and localhost-only; no deployment, backend, auth, cloud, or secrets | **PASS** | No deploy command, no server, no auth, no `.env`. `MapEditor.tsx:29-32` records the absence as deliberate. No cross-origin request exists at runtime (F-8 is a *host-supplied* hypothetical, not a shipped call). |
| 8 | A blanket, sight-unseen approval authorizes proceeding; it is not a content review and is not hash-bound | **PASS** | Recorded correctly everywhere it is claimed: `03-02-SUMMARY.md:97`, `03-11-SUMMARY.md:66`. **This review's own authorization is recorded the same way, above.** |
| 9 | Browsers outside the Playwright configuration are unverified | **PASS** | See § Browser scope. Chrome certified at 151.0.7922.75; Edge not certified — not installed; Firefox, Safari, and previous versions recorded as never run. Stated affirmatively, not omitted. |
| 10 | A gate must be able to fail on the bug it covers | **PASS for shipped test code; TWO FAILURES in this plan's own verify block** | 60+ RED probes were captured with verbatim output across `03-02`…`03-11`. Three separate times an executor found a *prescribed* probe did not redden its subject and **reported it rather than repeating the plan's premise** (`03-03` probe 4 on assertion 11; `03-09` probe A on assertion 24; `03-11` probe 9A on assertion 24 under the new path). That is the constraint working as intended. F-5 and F-6 are the two failures, and both are in `03-12-PLAN.md`, not in shipped code. |

---

## `03-UI-SPEC.md` § What This Spec Does Not Change

| Item | Verdict | Evidence |
|---|---|---|
| Exactly 1080×1080 | **PASS** | Focus item 1. |
| Placement decides export membership; the two typed slots preserved verbatim | **PASS** | Focus item 5. `legendSlot`/`navigationSlot` still named exactly, `MapWorkspace.tsx:52,78`. |
| `SNAPSHOT_CATALOG` semantics and `resolvePeriodOptions` untouched | **PASS** | `snapshots.ts:19-28` still a five-entry label registry with reachability decided by the manifest; only the *URL derivation* moved into `editorConfig.ts`, which changes where the catalog is read from and nothing else (`snapshots.ts:8-14`). |
| One `MapCanvasHandle`, one `svg.map-canvas` | **PASS** | Live Invariant 4. |
| Undo/redo is colours only | **PASS** | Live Invariant 2. |
| One roving-tabindex writer | **PASS** | Assertion 27 (`uiContract.test.ts:912`) asserts the writer **set**, with the classifier exercised both ways in the same test; RED-proved by `03-06` probe 2 (a second writer in the rail). Rail rows are plain tab stops (`ToolRailRow.tsx:57`). |
| `ToastRegion` is the allowlist boundary | **PASS** | Assertion 23 (`uiContract.test.ts:1109`) pins the allowlist as hard numbers — 25 static entries, 4 patterns — and `03-07` probe 7 RED-proved it by introducing a status message with no test. Byte-unchanged by the phase. |

---

## Scope-reduction audit

**Search terms (from the plan):** `for now`, `placeholder`, `future enhancement`, `wired later`,
`skip for now`, `basic version`. **Added by this review:** `static for now`, `hardcoded for now`,
`\bv1\b`, `stub`, `TODO`, `FIXME`, `XXX`, `HACK`. **Corpus:** added (`+`) lines of
`git diff acceptance-02-28..HEAD -- src tests`, with the HTML-attribute and identifier forms of
`placeholder` stripped.

**Result: CLEAN. No scope reduction found.** Every hit was adjudicated:

| Term | Hits | Adjudication |
|---|---|---|
| `for now` | 1 | `expect(markup).not.toMatch(/coming soon\|not yet\|for now\|will be/iu)` — a gate **forbidding** the phrase. Not a reduction. |
| `placeholder` | 1 | `import { COLOR_PRESETS, CUSTOM_COLOR_PLACEHOLDER }` — an identifier for a real form-field attribute. Not a reduction. |
| `\bv1\b` | 1 | `it('uses the legacy line for V1 records only', …)` — the storage V1 migration path. Not a reduction. |
| `stub` | 25 | All in test scaffolding (`stubWindow(…)`, and a comment explaining what a partial stub would look like). Not a reduction. |
| `TODO` | 3 | All three are the phrase "recorded pending todo" in comments **pointing at** the `appHarness` duplication (F-7). Documentation of a known item, not a new one. |
| `future enhancement`, `wired later`, `skip for now`, `basic version`, `static for now`, `hardcoded for now`, `FIXME`, `XXX`, `HACK` | 0 | — |

**The plan's own command exits 1 on the two false positives above** — that is F-5, not a finding
against the phase.

---

## Cross-plan interaction hazards

The five hazards this aggregate review exists to catch, each checked directly:

| Hazard | Verdict | Evidence |
|---|---|---|
| A control relocated by `03-05` and never re-homed by `03-06`/`03-07` (the deleted-landmark class) | **PASS** | `03-07` carries an explicit reachability cross-check table mapping every relocated control to its destination panel, and assertion 15 counts `Reset View`, `Reset All Colors`, and the one filled primary action **in every one of the four panel states** (`App.test.tsx:616`, `rail.spec.ts:154`). RED-proved twice (`03-07` probes 5 and 6), with probe 5 recorded **honestly as insufficient** because the control was conditional — and probe 6 run on an always-rendered one. `Reset View` was tracked through two homes (`PeriodHud` interim → floating cluster in `03-08`) with the handoff named in both summaries. This is the class that previously shipped a deleted inspector landmark; it did not recur. |
| A token deleted in `03-04` whose consumer was migrated in one file and missed in another | **PASS** | Assertion 2 (`uiContract.test.ts:1679`) uses **name-boundary** matching (`(?<![\w-])--accent(?![\w-])`) so an alias cannot hide behind a prefix, and the boundary behaviour is itself asserted. Assertion 5 requires every surviving export token to have a **live consumer**, so a stranded token fails. RED-proved by `03-04` probes 3 and 6. `03-10` later added `--success`/`--warning` to the retired list in the same commit that collapsed them (`797e9b6`) — the rule landed with the behaviour. |
| A rule moved in `03-10` that was order-dependent and now applies differently | **PASS** | `03-10` pinned the stylesheet **import order** as an explicit cascade decision with `editor.css` last, and assertion 20 (`uiContract.test.ts:411`) compares the globbed file set against `main.tsx`'s parsed import set **as sets** — RED-proved on a stray file, a dropped import, **and a count-preserving rename** (probe 4), which is the probe that discriminates a set from a count. `03-10`'s summary also records the "one home per cross-cutting rule, except where a selector carries a second rule elsewhere" split rule. |
| An assertion added in an early plan that a later plan quietly narrowed or skipped | **PASS — the one real narrowing was declared** | Assertion 19's matrix went **18 → 16 pairs, 108 → 96 rows** when `03-10` collapsed `--success`/`--warning`. That is a genuine coverage reduction — and `03-10` recorded it in **two** places (`03-10-SUMMARY.md:62` and `:423`) with the reason, and `git log -S` confirms the literal changed in exactly that commit (`797e9b6`). Nothing was narrowed silently. No test file gained `.skip`, `.todo`, or `.fixme`; the unit suite runs 637 tests with 0 skipped and the Chrome suite 103 with 0 skipped. |
| A test file that re-declares helpers instead of importing `tests/e2e/support/appHarness.ts` | **FINDING — F-7** | Nine of thirteen e2e specs import the harness. `persistence.spec.ts` and `phase2-composition.spec.ts` import it **and still** re-declare `readCameraTransform`, `expectD3ZoomSynchronized`, `CAMERA_GROUP_SELECTOR`, `LOGICAL_PATH_SELECTOR`, and `LOGICAL_CORE_COUNT` as byte-equivalent copies. `export.spec.ts`, `legend.spec.ts`, `locate.spec.ts`, and `spike-export-font.spec.ts` do not import it, but they drive fixtures rather than the app and declare no duplicate app helpers. |

---

## Assertion ledger (28)

RED-proof column: **captured** = verbatim failing output recorded in the owning plan's SUMMARY.

| # | Assertion | Owning plan | Where it lives | RED proof captured? | Verdict |
|---|---|---|---|---|---|
| 1 | No stylesheet rule carries `prefers-color-scheme`; no production module reads it | `03-04` (CSS) + `03-06` (TS) | `src/styles/uiContract.test.ts:1580` | **Yes ×2** — `03-04` probe 2 (at-rule returns); `03-06` probe 5 (a `matchMedia` read in a production module) | **PASS** |
| 2 | No retired token name appears in any stylesheet | `03-04` | `src/styles/uiContract.test.ts:1679` | **Yes** — `03-04` probe 3; name-boundary behaviour separately asserted | **PASS** |
| 3 | Every `--themely-*` in `:root` has a `.dark` counterpart, except the fixed trio | `03-04` | `src/styles/uiContract.test.ts:1715` | **Yes** — `03-04` probe 4 | **PASS** |
| 4 | No export token declared outside the unconditioned `:root`, extended to `.dark` | `03-04` | `src/styles/uiContract.test.ts:1767` | **Yes ×3** — `03-04` probe 5; `03-08` probe 2 (`--tooltip-surface`); `03-09` probe A2 and `03-11` probe 9A2 (both by-design co-failures) | **PASS** |
| 5 | Every export token declared exactly once and has a live consumer | `03-04` | `src/styles/uiContract.test.ts:1792` | **Yes** — `03-04` probe 6 | **PASS** |
| 6 | Every `--motion-*` token has a consumer and is zeroed under reduced motion | `03-04` | `src/styles/uiContract.test.ts:1818` | **Yes ×2** — `03-04` probe 7; `03-09` probe F | **PASS** |
| 7 | Motion CSS ↔ TS lockstep | `03-02` | `src/lib/motion/tokens.test.ts:12,231` | **Yes** — `03-02` probe 1, two-way and self-counting | **PASS** |
| 8 | No hex/rgba literal in any component `.tsx`, closed exemption `LegendOverlay.tsx` | `03-04` | `src/styles/uiContract.test.ts:2214` | **Yes** — `03-04` probe 11 | **PASS** |
| 9 | Type-role consumer exemption closed at exactly `--text-display`, `--text-stat` | `03-04` | `src/styles/uiContract.test.ts:2291` | **Yes** — `03-04` probe 12 (a third exemption) | **PASS** |
| 10 | `[data-panel-open]` is exactly `'true'\|'false'`; track 0px closed / 280px open | `03-03` | `src/styles/uiContract.test.ts:604` | **Yes ×2** — `03-03` probes 1 (third value) and 2 (second writer) | **PASS** |
| 11 | `.map-frame` rect equals the projected viewBox corners via `getScreenCTM()` | `03-03` | `tests/e2e/shell.spec.ts:148` (helper `:72`) | **Yes, and the probe found the gate weak** — `03-03` probe 4 showed the as-specified tolerance accepted a 1px inset; tolerance tightened, then RED. Probe 5 additionally covered the frame moved inside the export source | **PASS** |
| 12 | The floating cluster does not intersect `.map-frame` at every viewport × every legend preset | `03-08` | `tests/e2e/navigation.spec.ts:303` | **Yes** — `03-08` probe 1 applied the UI-SPEC's own published formula and went RED at **every** gate viewport, which is how the spec's formula was proved wrong | **PASS** |
| 13 | Period surface renders manifest-derived options only; no historical label within `.period-hud` | `03-07` | `src/styles/uiContract.test.ts:1006`; `src/App.test.tsx:672` | **Yes** — `03-07` probe 3 (`SNAPSHOT_CATALOG` rendered in the surface) | **PASS** |
| 14 | The rehomed live region's markup is present and its `aria-describedby` id resolves | `03-07` | `src/App.test.tsx:709` | **Yes ×2** — `03-07` probe 1 (region deleted) and probe 2 (the load-bearing resolve half, on its own subject) | **PASS** |
| 15 | Exactly one `Reset View`, one `Reset All Colors`, one filled primary action in the composed DOM | `03-06` + `03-07` | `src/App.test.tsx:616`; `tests/e2e/rail.spec.ts:154` | **Yes ×3** — `03-06` probe 3; `03-07` probe 5 (recorded honestly as insufficient — conditional control) and probe 6 (always-rendered, RED in every panel state) | **PASS** |
| 16 | No positional selector styles an interactive control | `03-03` | `src/styles/uiContract.test.ts:973` | **Yes** — `03-03` probe 3 (a rail row styled by index) | **PASS** |
| 17 | `backdrop-filter` banned outright; no export-unsafe effect on exported content | `03-04` | `src/styles/uiContract.test.ts:2343` | **Yes ×2** — `03-04` probes 13 (hairline `box-shadow` on `.map-canvas`) and 14 (`backdrop-filter` returns, incl. at-rule conditions) | **PASS** |
| 18 | `touch-action: none` on `svg.map-canvas` and nowhere else — the ownership set | `03-09` | `src/styles/uiContract.test.ts:2505` | **Yes** — `03-09` probe D (`touch-action: none` on the bottom sheet) | **PASS** |
| 19 | Contrast matrix resolves through the real cascade for every mode × preference, asserts its own row count, no exceptions | `03-04` | `src/styles/uiContract.test.ts:2007` | **Yes ×2** — `03-04` probe 9 (matrix resolves to nothing) and probe 10 (accent fill flipped). Probe 9 is the one that **caught the derived row count staying green at zero rows** | **PASS** — narrowed 108→96 rows by `03-10`, declared in two places |
| 20 | Globbed stylesheets equal `main.tsx`-imported stylesheets | `03-10` | `src/styles/uiContract.test.ts:411` | **Yes ×3** — `03-10` probes 2 (stray file), 3 (dropped import), 4 (count-preserving rename, the set-vs-count discriminator) | **PASS** |
| 21 | Distinct-selector inventory is at most the recorded ceiling, so growth fails | `03-10` | `src/styles/uiContract.test.ts:520` | **Yes ×2** — `03-10` probe 5 (one dead rule) and probe 6 (the discrimination control) | **PASS** — with a structural floor at `:534-540` and a parser-mechanism test at `:571` |
| 22 | Every vendored icon exports a `forwardRef` component and a matching `*IconHandle`, sizes via `size`, carries the strokeWidth marker | `03-02` | `src/components/icons/iconContract.test.ts:105` | **Yes** — `03-02` probe 2 (handle dropped from one icon) | **PASS** |
| 23 | The `ToastRegion` allowlist and its positive-test count are unchanged by this phase | `03-07` | `src/styles/uiContract.test.ts:1109` | **Yes** — `03-07` probe 7 (a status message introduced without a test) | **PASS** — allowlist byte-unchanged, pinned as hard numbers |
| 24 | The export PNG is identical across `.dark` toggling, forced colors, and DPR | `03-09`, re-proved `03-11` | `tests/e2e/responsive.spec.ts:1459` | **Yes ×2 as required** — `03-09` probe B (composite: theme class above the mount root + `.dark .scene-path` fill) **and** `03-11` Task 7 probe 9B re-proved against the **replaced** rasterisation path, plus probe 9C (the exporter reading live computed styles). Both plans also captured probe A / 9A **staying green** on the token route and reported it | **PASS as a gate — see F-2 for its true scope.** The row citing only `03-09` would have been a finding; the `03-11` re-proof exists and is captured |
| 25 | The exported legend renders in Inter, measured on rasterised pixels | export plan (`03-11`) | `tests/e2e/export.spec.ts:470` | **Yes** — `03-11` Task 6 probe (`@font-face` injection deleted from the real path); `03-11` Task 5 probe additionally reddened the raster backstop with the pre-Inter constant | **PASS** — pixels, derived crop bounds, content floor, blank control. Verified property by property in the tree |
| 26 | `--accent-fill`/`--accent-fill-hover` declared once in `:root`, absent from `.dark`; Export fill `#0071e3` in both modes | `03-04` | `src/styles/uiContract.test.ts:1861` | **Yes ×2** — `03-04` probes 8 and 10; the 3.02:1 dark-mode ratio is **computed**, not quoted | **PASS** |
| 27 | The composed DOM contains exactly one roving-tabindex writer | `03-06` | `src/styles/uiContract.test.ts:912` | **Yes** — `03-06` probe 2 (a second writer in the rail); classifier exercised both ways in the same test | **PASS** |
| 28 | Every vendored icon file has a dated "read in full" provenance line; recorded set equals file set | `03-02` | `src/components/icons/iconContract.test.ts:172` | **Yes** — `03-02` probe 3 (two-way set equality) | **PASS** |

**28 of 28 assertions exist in the tree, are bound to an owning plan, and carry at least one
captured RED proof.** No assertion is recorded as a pass on the strength of its own existence.

---

## Decision coverage (D-01…D-35, D-34a)

Verdicts: **IMPLEMENTED** / **DEFERRED** (with the owner decision that deferred it). No row is MISSING.

| ID | Decision | Plan | Evidence | Verdict |
|---|---|---|---|---|
| D-01 | Adopt the Themely design system | `03-02` | Owner checkpoint answered `proceed`; `Design.md` created (`3196774`) | IMPLEMENTED |
| D-02 | Create CountriesIRL's own `Design.md` | `03-02` | `Design.md` at repo root, 779 lines; § 7 marked `[FOR REVIEW]` (deferred item D-3) | IMPLEMENTED |
| D-03 | `--themely-*` namespace verbatim | `03-02`, `03-04` | `src/styles/theme.css`; namespace allowlist gate, RED-proved by `03-04` probe 1 | IMPLEMENTED |
| D-04 | Themely cool palette, verbatim | `03-04` | `theme.css`; assertion 3 parity gate (`uiContract.test.ts:1715`) | IMPLEMENTED |
| D-05 | Apple Blue `#0071e3` the sole saturated accent | `03-04`, `03-06`, `03-08`, `03-10` | Assertion 26 (`:1861`); `03-10` collapsed `--success`/`--warning` onto neutral ink (`797e9b6`) | IMPLEMENTED |
| D-06 | Flat-with-hairlines elevation | `03-04`, `03-10` | `backdrop-filter` banned outright by assertion 17 (`:2343`) | IMPLEMENTED |
| D-07 | Themely radii | `03-04` | `theme.css` radius tokens; retired `--radius-large` on assertion 2's list | IMPLEMENTED |
| D-08 | Dark mode ported, class-based | `03-04`, `03-09` | `.dark` on the editor mount root; assertion 3 parity; assertion 24 theme axis | IMPLEMENTED |
| D-09 | Full type port, Inter self-hosted | `03-01`, `03-02`, `03-04` | `src/assets/inter-latin-variable.woff2` vendored, emitted to `dist/assets/` at 48.43 kB | IMPLEMENTED |
| D-10 | Retire `--font-label/body/heading/display` | `03-04` | Assertion 2 retired-token list; assertion 9 closed exemption set | IMPLEMENTED |
| D-11 | The top app bar dissolves entirely | `03-03`, `03-05`, `03-07` | `CompositionBar` deleted and rehomed as `PeriodHud`; shell grid in `editor.css` | IMPLEMENTED |
| D-12 | Composition identity + saved/dirty state in a pinned HUD header | `03-06` | `src/components/editor/HudHeader.tsx` | IMPLEMENTED |
| D-13 | Export a pinned primary button in the HUD footer | `03-06` | `src/components/editor/HudFooter.tsx`; assertion 15 counts exactly one filled action | IMPLEMENTED |
| D-14 | The period control stays visible | `03-07` | `src/components/editor/PeriodHud.tsx`; assertion 13 | IMPLEMENTED |
| D-15 | Rehome the `role="status" aria-live="polite"` period region | `03-07` | `PeriodHud.tsx:16`; assertion 14, both halves RED-proved | IMPLEMENTED |
| D-16 | Icon rail + single flyout panel | `03-03`, `03-06` | `ToolRail.tsx`, `ToolPanel.tsx`; assertion 10's two-valued track | IMPLEMENTED |
| D-17 | One tool open at a time | `03-06` | `tests/e2e/rail.spec.ts`; `openRailTool` harness | IMPLEMENTED |
| D-18 | First run opens with the panel closed | `03-06` | `LAST_OPEN_TOOL_KEY`; `closed` stored as a real value distinct from an absent key; `03-06` probe 1 RED-proved the absent-key default | IMPLEMENTED |
| D-19 | Rail ~56px, panel 280px | `03-03` | Assertion 10 pins `0px`/`280px`/`56px` (`uiContract.test.ts:604`) | IMPLEMENTED |
| D-20 | Below the breakpoint the rail becomes a bottom bar | `03-09` | `b7c2446`; one breakpoint copy in `useResponsiveLayout.ts`, two-valued `data-layout`, one writer | IMPLEMENTED |
| D-21 | Floating map controls bottom-right | `03-08` | `cd30062`; assertion 12 non-intersection at four viewports × five presets | IMPLEMENTED — **with a recorded deviation**: `Move Map` retained as a **fourth** control against D-21's three, on NFR11 keyboard-access grounds, condition recorded in `03-08` |
| D-22 | Tooltip is a dark ink chip | `03-08` | `6834e57`; four tokens fixed in the unconditioned `:root`; assertion 4 guards them; `03-08` probe 2 | IMPLEMENTED |
| D-23 | Kosovo cursor discipline carries forward | `03-08` | `37ae5ca`; `03-08` probes 3 and 4 (colour readout on the non-colourable branch; `pointer` on a non-colourable unit) | IMPLEMENTED |
| D-24 | The legend stays a canvas overlay inside the export-bearing composition | `03-05` | `MapWorkspace.tsx:163`; `03-05` probes 5 and 6 | IMPLEMENTED |
| D-25 | The legend adopts Themely typography | `03-11` | `4df10dc`; wrap tables collapsed to one derived constant; assertion 25 | IMPLEMENTED — **creator-visible consequence F-1** |
| D-26 | Full Themely motion port, CSS as source of truth | `03-02` | `src/lib/motion/tokens.ts` + assertion 7 lockstep | IMPLEMENTED |
| D-27 | Add `motion` v12 | `03-01` | `package.json` `motion` pinned at exactly **`12.40.0`** (verified) behind gate R-V1 | IMPLEMENTED |
| D-28 | Vendor the lucide-animated icons | `03-02` | `306047c`; `src/components/icons/` + `PROVENANCE.md`; assertions 22 and 28 | IMPLEMENTED |
| D-29 | Hover: instant background, animated glyph | `03-06` | `ToolRailRow.tsx`; background-only state with instant paint | IMPLEMENTED |
| D-30 | Theme toggle pinned in the rail footer sets `.dark`; **no** `prefers-color-scheme` read anywhere | `03-06` | `b461f4f`, `84d8eab`; `ThemeToggle.tsx`; `THEME_MODE_KEY` through `StorageAdapter`; assertion 1 both halves | IMPLEMENTED |
| D-31 | Tag `fe5f946` before any Phase 3 commit | `03-01` | `git rev-list -n 1 acceptance-02-28` = `fe5f946060707c48c3d9591d368b5f3f8f90dd4d` | IMPLEMENTED |
| D-32 | Full-bleed surface, centred 1:1 export frame | `03-03` | `7e2834d`; assertion 11 measures frame ↔ projected viewBox to 6e-14 px | IMPLEMENTED |
| D-33 | The phase gate runs Chrome-only and says so plainly | **`03-12` (this plan)** | § Gate evidence and § Browser scope above; the phrase "Edge not certified — not installed" is stated affirmatively and no Phase 2 Edge record is cited. `03-04`, `03-05`, `03-08`, `03-09`, `03-10`, `03-11` each carry the same scope statement | IMPLEMENTED |
| D-34 | Phase 3 owns the SVG→PNG export path; `html2canvas` removed | `03-11` | `752ac8b`; zero `html2canvas` references anywhere in code or lockfile | IMPLEMENTED |
| D-34a | Generalised inline font-embedding seam, not a hard-coded Inter branch | `03-11` | `export.ts:82-84` `EXPORT_FONT_FACE_BUILDERS` registry; `collectCompositionFonts` (`:124`) collects families the composition actually references | IMPLEMENTED |
| D-35 | Re-arm the export-independence gate the dark switch would disarm | `03-09`, re-proved `03-11` | `8be7485`; `responsive.spec.ts:1459` + the source scan at `:1072`; two RED proofs across two rasterisation paths | IMPLEMENTED — **scope corrected by F-2** |

**36 of 36 decision rows are IMPLEMENTED. Nothing was silently dropped, descoped, or reduced.**
The one deviation (D-21's fourth control) is a *widening* on accessibility grounds, recorded with
its condition, not a reduction.

### Owner-checkpoint decisions — authorization type recorded

Immutable Safety Constraint 8 requires recording **which** authorization is held. For every
Phase 3 owner checkpoint the answer is the same:

| Decision | Owner response | Authorization type |
|---|---|---|
| D-01 (adopt Themely) | `proceed` | **Blanket, in-advance, sight-unseen proceed-authorization.** Not a content review. Not hash-bound. |
| D-25 (legend typography) | `proceed` | **Blanket, in-advance, sight-unseen proceed-authorization.** Recorded verbatim as such at `03-11-SUMMARY.md:66`. |
| D-27 / R-V1 (`motion` install) | `proceed`, carrying the `too-new` verdict and the `13.0.0` warning | **Blanket, in-advance, sight-unseen proceed-authorization** — but the *technical* verdict was performed and carried, and the pin is exact. |
| D-34 (remove `html2canvas`) | `proceed` | **Blanket, in-advance, sight-unseen proceed-authorization.** |

**No owner content review exists for any Phase 3 decision.** `03-02-SUMMARY.md:97` states this
directly and correctly.

---

## Vendoring requirements (R-V1, R-V2)

| Req | Requirement | Verdict |
|---|---|---|
| **R-V1** | The `motion` checkpoint performed before the install, `too-new` verdict carried, `motion` pinned at exactly `12.40.0` | **CLOSED.** `node -e "require('./package.json').dependencies.motion"` → **`12.40.0`** — exact, no range specifier. The gate ran before `b44fe73` installed it. The `too-new` reasoning and the `13.0.0` warning are carried in `03-01`'s record. The **authorization type** is a blanket proceed-authorization, not a content review — recorded honestly. |
| **R-V2** | Every file under `src/components/icons/` carries a dated "read in full" provenance line; recorded set equals file set; the three previously PENDING upstream files carry a dated disposition | **CLOSED.** `PROVENANCE.md` carries 24 "read in full" lines covering the icon set. Assertion 28 (`iconContract.test.ts:172`) enforces the equality **two-way**, so a file without a line and a line without a file both fail; RED-proved by `03-02` probe 3. The gate is green in the 637-test unit run. |

## Recorded planner decisions — OPEN ITEM 3 and OPEN ITEM 4

| Item | Requirement | Verdict |
|---|---|---|
| **OPEN ITEM 3** | `02-22` action-order semantics recorded per semantic as preserved or superseded | **LANDED.** `03-07` carries a per-semantic table (`03-07-SUMMARY.md:142-145`) marking each as *preserved and strengthened*, *preserved*, or *superseded*, with the assertion that now covers it. |
| **OPEN ITEM 4** | The approved-id filter adopted on the saved-map short-label resolver; the storage validator **not** changed; the false comment deleted | **LANDED, and the residual is real.** The filter is on `getPeriodShortLabel`, RED-proved against a planted `1914` record (`03-07` probe 4). The validator at `storage.ts:61-63` and `:483-484` is deliberately unchanged, with the reason recorded at `storage.md:491`. **The residual fact, which must be carried forward:** the storage validator still admits a hand-crafted record carrying any of the five snapshot ids, including the four deferred ones — **only the label rendering is filtered.** Reaching it requires hand-editing browser storage, so it is a weak, local exposure and **not** a path by which a deferred snapshot becomes reachable. It is pre-existing Phase 2 behaviour. **A presentation filter is not a validator fix**, and no later reader may take it for one. |

---

## Changes made by this review

Only one change was made, and it is attributed here rather than folded into a finding's
"resolved" column. **No code was changed. No test was changed. `STATE.md` and `ROADMAP.md` were not
touched.**

**F-3 — `.planning/coding-rules/general.md` and `.planning/coding-rules/frontend.md`:** three
sentences presenting `html2canvas` as live shipped behaviour were corrected to describe the owned
SVG→`data:` URL→`drawImage`→`toBlob` path. The **rules themselves are unchanged** — only their
stated reasons, which had been retired by D-34. Made by this reviewer (an independent, non-author
agent), on 2026-08-06, in a commit of its own.

**Re-verification after the change:** `npm test` re-run — **42 files, 637 tests, 637 passed**, and
`npm run lint` clean. No gate reads these prose files, so no gate could have masked the error; that
is precisely why it survived eleven plans.

---

## Verdict

**Phase 3 achieved its goal.** The clean UI overhaul is implemented end to end: the token system,
the shell grid, the mountable editor boundary, the tool rail and single flyout, the panel
migration, the map chrome, the narrow-width arrangement, the stylesheet split, and — the largest
unplanned addition — full ownership of the SVG→PNG export path with `html2canvas` removed. All 36
tracked decisions are implemented, all 28 UI-SPEC contract assertions exist with at least one
captured RED proof, and the full gate is green on Chrome with the numbers recorded above.

**Three things make this a stronger phase than its gate numbers alone would show.** First, three
separate executors ran a *prescribed* RED probe, watched it fail to redden its subject, and
**reported the plan's premise as wrong** rather than repeating it — `03-03` on assertion 11,
`03-09` and `03-11` on assertion 24. Second, `03-08` proved the **approved UI-SPEC's own placement
formula** wrong with a RED probe at every gate viewport and shipped a corrected anchor. Third, the
honesty audit found **zero** overclaims across eleven summaries: no physical check claimed, no
browser certified that was not run, no historical snapshot described as shipped, no blanket
approval dressed up as a content review.

**The phase is not, however, finished — and it must not be recorded as if it were.**

1. **Zero physical verification.** Nobody has looked at any of it. An entire visual overhaul has
   been certified exclusively by automation. This is the largest outstanding risk in the phase and
   no automated result substitutes for it.
2. **F-1 is a real product constraint change** that reached shipping without a human ever typing a
   label into the real editor. 14 characters at the default size may or may not be workable.
3. **F-2, F-3, and F-4 leave three documents describing behaviour that no longer exists.** F-3 is
   fixed here; F-2 and F-4 are not, and F-4 sits in `CLAUDE.md` — the first file every future agent
   reads.
4. **F-5 and F-6 are two gates in this plan's own verification that cannot fail on the bug they
   cover.** Both were caught and worked around here; both should be fixed before `03-12`'s pattern
   is copied into a later review plan.

**Recommendation.** Phase 3's engineering is complete and sound. Record it as **engineering
complete, physically unverified** — and open a Phase 3 acceptance gate for the owner in the same
shape as `02-28`, covering at minimum: both themes, the rail and flyout, the bottom bar and sheet,
the map tooltip, the floating cluster, a real legend label at each of the three sizes, and a
downloaded PNG opened and looked at. Do **not** tick a plan whose findings are open, and do not
close `02-25` or `02-28` — Phase 3 touched neither and was never authorized to.

---

*Reviewed 2026-08-06 by an independent, non-author agent session. Range `acceptance-02-28..HEAD`
at `6b1032c`. Chrome 151.0.7922.75 only — Edge not certified — not installed; Firefox, Safari, and
previous-version certification have never been run in this repository and are not claimed.*
