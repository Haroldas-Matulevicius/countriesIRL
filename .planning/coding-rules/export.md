# Coding Rules: Export (SVG→PNG, owned by this repo since 03-11 / D-34)

**Read when touching:** `exportMapPng`, the rasterisation pipeline, the font-embedding seam,
PNG quality, size contracts, error handling, filename format.

**There is no third-party rasteriser.** `html2canvas` was removed by plan `03-11` (D-34).
`src/utils/export.ts` owns the whole path: serialise the frozen clone → SVG-as-image →
`drawImage` → `toBlob`. Everything below describes that path; the html2canvas analysis this file
used to carry is expired and deleted, not superseded in place.

---

## Size Contract: 1080×1080

**Every exported PNG must be exactly 1080×1080 pixels.** Instagram square format.

**This is non-negotiable.** If export is 1080×1079 or 1081×1080, the check fails.

The pipeline enforces it three times, deliberately:

1. `exportMapPng` sizes its own canvas to `EXPORT_SIZE` (1080) — no third party decides.
2. The dimensions are **read back** after assignment, before encoding. A browser that clamps or
   zeroes a canvas (canvas-size limits exist) would otherwise encode a wrong-size PNG; the
   read-back guard returns `invalid-dimensions` instead.
3. `tests/e2e/export.spec.ts` parses the downloaded bytes' `IHDR` (`width` at byte 16, `height`
   at byte 20) for the exact 1080 square. A `toBlob` success proves nothing about size.

**The scale geometry is a contract, not an implementation detail.** The clone's intrinsic size
stays `EXPORT_FRAME_SIZE` (540) and the 2D context scales by `EXPORT_SCALE` (2):

```typescript
canvas.width = EXPORT_SIZE;                      // 1080
canvas.height = EXPORT_SIZE;
context.fillStyle = EXPORT_BACKGROUND_COLOR;     // opaque white first
context.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
context.scale(EXPORT_SCALE, EXPORT_SCALE);       // 2
context.drawImage(svgImage, 0, 0, EXPORT_FRAME_SIZE, EXPORT_FRAME_SIZE); // 540
```

Because every `path.scene-path` carries `vector-effect: non-scaling-stroke`, stroke widths
resolve in the 540-unit viewport: `EXPORT_BORDER_WIDTH` (0.75) is 0.75 units at 540, which the
scale-2 context rasterises to the same crisp 1.5px line at 1080 the retired pipeline produced.
Serialising the clone at 1080 intrinsic instead would silently HALVE every border weight —
that is why the 540-intrinsic / scale-2 shape must not be "simplified" to a 1080 canvas draw.

---

## Rasterisation Pipeline Contract

**Flow (all inside `exportMapPng`, which stays pure — it clones an already-frozen composition
and never reaches into live state):**

1. **Refuse before any work.** Disconnected source, ≠1 canonical SVG, sibling/duplicate legend —
   all checked synchronously before a frame or clone exists.
2. **Clone and prepare.** `cloneNode(true)`, re-assert the 1080 viewBox and the 540 frame size,
   hard-set `background`/`backgroundColor` and `colorScheme = 'light'` inline on BOTH the export
   frame and the cloned SVG.
3. **Inject fonts, then sanitize.** `injectExportFontFace(clone, collectCompositionFonts(clone))`
   inserts one `<style>` as the clone's FIRST child; `sanitizeExportClone` then strips semantics
   (and is thereby proven to preserve the `<style>`).
4. **Verify the prepared clone.** `isPreservedComposition` — camera and legend both present, in
   camera-before-legend order, transforms unchanged. The leading `<style>` shifts both indices
   equally, so the order check holds.
5. **Append the frame to `document.body`.** The frame is a `div[aria-hidden="true"]` — this is
   the observation seam the e2e suite's `MutationObserver` reads; do not remove it.
6. **Serialise and rasterise.** `serialiseCloneToImageUrl`: `"data:image/svg+xml," +
   encodeURIComponent(new XMLSerializer().serializeToString(clone))` — the exact shape the OQ-1
   spike proved in installed Chrome (a 64,576-char base64 font `src` hits no length limit).
   Load it into an `Image`, `drawImage` per the size contract above, `canvas.toBlob`.
7. **Download and hand off.** Object URL → connected anchor → `click()` → one named, bounded
   100ms macrotask (`waitForDownloadHandoff`) before resolving success.
8. **Clean in `finally`.** Remove the anchor, revoke the object URL, remove the frame — nested
   `finally` so every step runs even when an earlier one throws.

**Failure mapping — each real failure mode surfaces as a typed `ExportResult` reason:**

| Failure | Reason | Retry |
|---|---|---|
| SVG image fails to load/decode | `capture-failed` | yes |
| `getContext('2d')` returns null | `capture-failed` | yes |
| canvas dimensions read back ≠ 1080 | `invalid-dimensions` | yes |
| `toBlob` yields null, object URL throws, anchor click throws | `encoding-failed` | yes |
| structural refusals (see clone contract) | `source-not-found` / `invalid-composition` | **no** |

**Do not remove a successfully clicked anchor or revoke its object URL synchronously.** Chromium
may not finish handing the native download to its download manager before the current task ends.
Success is truthful only after the connected click succeeds and the bounded handoff completes.

---

## The Sandbox Boundary — why fonts are embedded, and why the PNG cannot follow the theme

**The single most important fact about this path:** an SVG loaded as an image from a
`data:image/svg+xml` URL is an **isolated document**. It sees none of the host document's
stylesheets — no `@font-face`, no `.dark` rules, no custom properties — and it can issue **no
request**, including a same-origin one. Everything the PNG needs must be INSIDE the serialised
subtree: presentation attributes, inline styles, and the injected `<style>`.

Two consequences, both load-bearing:

1. **Fonts must ride inside the clone.** `theme.css`'s `@font-face` styles the editor chrome and
   never reaches the export. `src/styles/interFontFace.ts` provides the vendored Inter bytes as
   a build-time `data:font/woff2;base64,…` string (Vite `?inline`), and `injectExportFontFace`
   embeds them per export. WebKit/Safari is the documented exception to this technique (it
   treats data URIs in SVG-as-image as external files); Safari is outside certification scope,
   and **this technique is never described as cross-browser**. Verified in installed Chrome 151
   only.
2. **The exported PNG is theme-independent BY CONSTRUCTION.** No host CSS — token, `.dark` rule,
   media query — can reach the rasterised pixels, because none of it is in the serialised
   subtree. The hard-set inline `background`/`colorScheme` on the frame and clone, and the
   canvas's own white `fillRect`, are the remaining defence layers; the placement of the frame
   outside `.map-editor` matters less than it did, but stays. Assertion 24
   (`tests/e2e/responsive.spec.ts`) remains the browser-level tripwire against a future
   rasterisation change that reads live computed styles — see plan `03-11`'s probe 9 record for
   what does and does not redden it against this path.

### The font-embedding seam is GENERALISED (D-34a)

`collectCompositionFonts(clone)` walks the clone and returns the distinct named families it
actually references (`font-family` attributes and inline styles, generic keywords excluded).
`injectExportFontFace(clone, families)` embeds an `@font-face` for each family the
`EXPORT_FONT_FACE_BUILDERS` registry has bytes for. **Only Inter is registered in Phase 3.**
Phase 4's text tools add registry entries; they do not re-open the rasterisation path.

**The test-only suppression seam.** `EXPORT_FONT_FACE_SUPPRESSION_FLAG` is a `globalThis`
sentinel that makes `injectExportFontFace` a no-op. It exists so assertion 25 can export a
font-suppressed control run and go RED when the injection is deleted. It is set only from
Playwright (`addInitScript`/`evaluate`); nothing in the product writes it, it is not read from
storage, and no creator-facing control reaches it. Keep it that way.

### Coverage is latin-only, and that is recorded, not hidden (CF-2)

The vendored subset stops at `U+00FF` (48,432 B raw / 64,576 B base64 — `src/assets/README.md`
holds provenance, SHA-256, and the measured cost of widening). Latin-ext glyphs — `Ł ą ę ś ż`
(Polish), `č ė š ų ū ž` (Lithuanian), `ě ř ů` (Czech), `č ć đ š ž` (Balkan), `ā ē ģ ķ` (Latvian),
`ș ț` (Romanian) — fall back to the generic stack **mid-string**, in the editor and in the
exported PNG. Bundled Natural Earth names are ASCII; the real exposure is creator-typed legend
labels in native orthography. A test in `tests/e2e/export.spec.ts` documents the observed
fallback so it is a known outcome, not a surprise. **No claim of full Unicode coverage may be
made anywhere.** These bytes ship inside every export bundle; widening to latin-ext (+85,272 B
raw / +113,696 B base64) is a recorded owner decision for v1.1, not an executor's.

---

## Prepared-Composition Clone Contract

The export utility is **pure**: it clones an already-prepared, already-frozen DOM. It never
freezes the camera, never acquires or releases a `CameraFreezeLease`, and never mutates the
live composition. Lease orchestration lives in the export transaction, not here.

**Canonical shape of the SOURCE it requires** (`MapCanvas` renders exactly this):

```
div.map-export-source
└── svg.map-canvas                 ← exactly one; more or fewer is `source-not-found`
    ├── g[data-layer="camera"]     ← must come BEFORE the legend
    │   ├── g[data-layer="outgoing-scenes"]
    │   └── g[data-layer="countries"]
    └── g[data-layer="legend"]     ← at most one, and it must be INSIDE the svg
```

**Canonical shape of the sanitized CLONE** (what the rasteriser is handed) adds one element:

```
svg.map-canvas
├── style                          ← injected export @font-face(s); FIRST child
├── g[data-layer="camera"]         ← still before the legend; transform preserved
└── g[data-layer="legend"]         ← transform preserved
```

The leading `<style>` is legitimate and expected: `isPreservedComposition` checks *order*
(camera index < legend index), which a first-child insertion preserves because it shifts both
indices equally. A doc or test that asserts `g[data-layer="camera"]` is the clone's literal
first child is asserting the pre-03-11 shape and is wrong.

**Refuse rather than export a wrong picture.** `invalid-composition` is returned when:

- a `[data-layer="legend"]` group exists in the export source but **outside** the canonical
  SVG (a sibling overlay is silently dropped by `cloneNode`, so the PNG would ship with no
  legend — this is exactly the defect class that produced the clipped-legend regression);
- a legend exists anywhere in the document while the source has none (a legend hoisted above
  the export source is the same defect wearing a different hat — the zero-on-both-sides case is
  accepted only when `source.ownerDocument` has zero too);
- more than one legend group exists (a composition with **no** legend at all is allowed — see
  the zero-legend rule below);
- the sanitized clone has lost the camera or legend group, reordered them, or changed either
  group's `transform`.

The post-sanitize check is not a tautology: it is the tripwire that catches a **future**
sanitize rule that deletes or reorders a required layer.

### Every refusal reason needs its own creator-facing message

**A synchronous refusal must never be reported as the generic export failure.** The generic copy
(*"The PNG could not be created. Your map is unchanged. Try Export PNG again."*) offers a retry,
which is wrong for a refusal decided before capture: the retry re-enters the identical
synchronous refusal, forever. That is the permanently stuck export gate wearing a different hat.

**No export message may ever say "Refresh the page."** The composition lives **only in browser
memory**, so refreshing destroys every unsaved color, camera, period, and legend — the advice is
destructive, not corrective, even for a genuinely transient capture failure.

| Reason | Message shape | Retry offered |
|---|---|---|
| `legend-blocked` | the blocking condition itself (`getLegendBlockingMessage`) | no |
| `invalid-composition` | names the layout problem, states the map is unchanged, gives the repair action | no |
| `capture-failed`, `encoding-failed`, `invalid-dimensions`, `source-not-found` | generic transient failure | yes |

So: **branch on the reason** in the outcome handler, add each new message to the `ToastRegion`
allowlist, and never write "Refresh the page" into copy for a reason that a refresh cannot
clear.

### Strip semantics, never geometry

Every visible wrapped copy is load-bearing. The Pacific / date-line composition is built from
`±360°`-offset repeats of the same geography; deleting them because they are "duplicates"
tears a seam through the exported map.

| Removed from the clone | Kept in the clone |
|---|---|
| `[data-layer="outgoing-scene(s)"]` (mid-crossfade predecessor) | the injected export `<style>` (first child) |
| `[data-editor-only]` (legend hit area, nudge handles) | `g[data-layer="camera"]` and its `transform` |
| `<title>`, `<desc>`, `<metadata>` | every `path.scene-path`, including `country-path--decorative` wrapped repeats |
| **all** `aria-*` attributes | `d`, `fill`, `transform`, and all `data-*` geometry markers |
| `role`, `tabindex`, `focusable`, `id` | the live legend `<g>` with its exact `transform`, text, and fills |
| `selected` / `hovered` / `focused` classes and `data-selected` / `data-hovered` / `data-focused` | |

**Normalize borders across `path.scene-path`, not `path.country-path`.** Wrapped repeats carry
`scene-path country-path--decorative`; the `.country-path` selector does **not** match them.
Normalizing only `country-path` leaves the selection border (2px) baked onto every wrapped
copy of a selected country while the primary copy renders the default 0.75px — a visible seam
in the PNG.

**Keep `vector-effect="non-scaling-stroke"` on every scene path in the clone.** The camera
layer wraps the geometry in `scale(zoom)`, and `zoom` runs to 24. A plain `stroke-width: 1`
inside that group is *1 user unit × zoom*, so the frame the creator set decided how heavy their
borders came out: a hairline on screen downloaded as an ~8px outline at 8x. Pinning the vector
effect resolves the stroke in viewport space instead — `EXPORT_BORDER_WIDTH` (0.75) at the 540
frame is 0.75 viewport units, which `EXPORT_SCALE` 2 rasterizes to a crisp 1.5px line at 1080 at
every zoom. `sanitizeExportClone` **sets** the attribute rather than inheriting it, and sets
`style.vectorEffect` too, because external CSS is not part of the serialised SVG image — an
externally-styled effect renders NOT AT ALL in the isolated document. The attribute was removed
from Phase 1 until 2026-07-27; that removal was the bug.

The gate is `clone.vectorEffects === WRAPPED_PATH_COUNT` in `tests/e2e/export.spec.ts` — a
count, not a `> 0`, so a path that loses the effect fails. Its unit twin only bites if the
fixture paths *lack* the attribute, so `export.test.ts` deliberately omits it from the source
paths: inheriting it would make the assertion pass with the exporter doing nothing.

**`id` stripping is reference-aware, and must stay that way.** An id nothing points at is
editor semantics; an id something points at is **paint**. Before removing any `id`, collect
every reference in the clone — `url(#…)` in any attribute or inline style, and `href` /
`xlink:href` beginning with `#` — and keep the ids they resolve. A blanket strip renders
correctly on screen and ships a PNG with the gradient, clip path, mask, marker, or filter
silently gone, because the reference is resolved **inside the isolated SVG image** *after*
sanitization.

A test that asserts `clone.ids === 0` **confirms** that break instead of catching it. Assert
instead that no surviving `url(#…)` or `href="#…"` reference dangles.

**Zero legends is not a missing legend.** `isSingleCanonicalComposition` refuses a duplicated
legend and a legend that exists in the source (or hoisted above it) but not in the canonical
SVG. It deliberately allows zero-everywhere: an uncolored map has no legend entries and must
still export a white square. Do not "tighten" this to `=== 1`.

---

## Export Transaction Ownership (Phase 2)

`useCompositionExportTransaction` owns everything the pure utility must not: the
`CameraFreezeLease`, the busy/activation locks, selected-scene finalization, the legend gate,
and the creator-facing outcome. Splitting it any other way is what produced the permanently
stuck export gate.

**Order is the contract:**

1. refuse a concurrent activation synchronously, before any `await`, and report nothing;
2. read the legend blocker **before** taking a lease — a blocked legend must never freeze the
   camera, and its message is reported as itself with no retry;
3. resolve the bound `MapCanvasHandle` once, then hold it for the whole activation;
4. `freezeAndSnapshot()` → commit `lease.camera` to the composition **synchronously, before**
   `finalizeSelectedScene()` and the clone, so the capture, an immediate save, and a responsive
   remount all read the same frozen semantic camera;
5. `getExportSource()` → hand the element to `exportMapPng` unchanged;
6. release the lease in the outermost `finally` on **every** path, then clear the busy lock,
   then report.

**Do not re-validate the source shape in the transaction.** `exportMapPng` already refuses a
disconnected source, a source without exactly one canonical SVG, and a sibling/duplicate legend
— all *before* it creates a frame or rasterises anything. A second copy of those rules in the
transaction is a drift hazard, not a safety net. The transaction only refuses a `null` source
(`export-source-unavailable`), which the utility cannot see.

**Failure reasons stay truthful:** a throw before the capture begins is `preparation-failed`, a
throw once rasterisation is running is `export-failed`, and the five `ExportFailureReason`
values are passed through unchanged.

---

## Filename Format

**Unnamed composition:** `CountriesIRL_<YYYY-MM-DD>.png`
**Named composition:** `<sanitized-name>_<YYYY-MM-DD>.png`

```typescript
createExportFilename(date);                    // "CountriesIRL_2026-07-21.png"
createExportFilename(date, 'My Europe Trip');  // "My_Europe_Trip_2026-07-21.png"
```

**Sanitize the name token in this exact order** — the order is the mitigation, not decoration:

1. whitespace runs → `_`
2. drop everything outside `[A-Za-z0-9_-]` (kills `/`, `\`, `..`, `:`, `*`, `?`, `"`, `<`, `>`, `|`)
3. collapse repeated `_`
4. trim leading/trailing `_` and `-`
5. cap at **60** characters, then re-trim a trailing separator
6. if nothing survives, fall back to the unnamed `CountriesIRL_` form

**The date and `.png` suffix are fixed and never derived from user input.**

**The name comes from the composition root, not from the exporter.** It is the name of the
last committed save or load — set only when that transaction succeeds — and it is passed into
the export transaction as a `getCompositionName()` accessor. The exporter never owns it: save
and load read the same identity.

---

## Background Color Contract

**Always export with an opaque white background (`#FFFFFF`).** Three layers, each deliberate:
the canvas is `fillRect`'d white before the draw, the export frame hard-sets white inline, and
the cloned SVG hard-sets white inline. Do not "simplify" one away because the others cover it —
each alone keeps the PNG opaque and theme-independent, which is exactly why removing one is
invisible until the last one goes.

**Why white?** Instagram's square format looks best with a white background, and transparent
PNGs are harder for non-technical creators to work with.

**The legend ships inside the canonical SVG before `exportMapPng` is called** — see the clone
contract. A legend that is a *sibling* of `svg.map-canvas` is a hard `invalid-composition`
refusal, never a silently legend-less PNG.

**`LegendOverlay.tsx`'s colour literals are deliberate export-fixed values** (`THEME_COLORS`,
the `#9CA3AF` swatch stroke). They are exempted by name in the token contract (assertion 8).
Pointing them at `--themely-*` tokens would not "tokenize" the legend — inside the isolated
export document the `var()` would resolve to nothing at all (pitfall P-3).

---

## Testing

### The two-part font gate (assertion 25)

A markup-level "the clone names Inter" assertion is green whether or not the font resolves —
`LegendOverlay` has named Inter since Phase 2 while the export fell back silently. Assertion 25
is therefore two parts, and **Part 2 is the load-bearing half**:

1. **Structural, via `MutationObserver`:** the observed clone contains `svg.map-canvas > style`
   matching `/@font-face/` and `/src:\s*url\(data:font\/woff2;base64,/`, as the first child.
2. **Pixel inequality against a font-suppressed control:** export the same composition twice in
   one run (normal, and with `EXPORT_FONT_FACE_SUPPRESSION_FLAG` set), crop both PNGs to the
   legend region **derived from `resolveLegendRender`** (never hard-coded), and assert the crops
   differ beyond a noise threshold — with a content floor first (both crops carry ink) and a
   blank-crop discrimination control (both differ from a blank of the same size, which itself
   counts zero ink). Three empty regions satisfy a bare inequality perfectly; this repo has
   shipped that defect once already.

### Journey evidence: `tests/e2e/final-integration.spec.ts`

**One spec owns the interactions between domains; the focused specs own the domains.** Do not
re-assert a claim `export`, `persistence`, `history`, `legend`, `responsive`, or `transactions`
already makes — duplicated assertions add runtime and no signal. The journey covers only what a
single continuous session can catch: history position → exported pixels, a **real** `page.reload()`
→ `localStorage` → load → exported pixels, and legend labels, legend placement, and the camera
surviving that whole chain into the downloaded bytes.

### Browser evidence: `tests/e2e/export.spec.ts` + `fixtures/export.html`

**Never stub the rasterisation in the browser slice.** The fixture composes the **real**
`MapCanvas` (real geo data → real 248 × 3 wrapped paths) and the **real** `LegendOverlay`,
then calls the **real** `exportMapPng`. A handcrafted fixture SVG can silently drift from
`MapCanvas` and keep passing while production breaks.

**A fixture cannot prove legend placement — only the real app can.** `fixtures/export.html`
passes its own `legendSlot` into `MapCanvas`, which re-implements `App`'s wiring. Asserting
`svg.map-canvas > [data-layer="legend"]` there proves only that `MapCanvas` fills the slot it
is handed. The containment assertions must also run against `page.goto('/')`. Rule of thumb:
**when a fixture re-implements the wiring under test, its assertion is about the fixture.**
Keep one real-app counterpart for every structural contract the composition root owns.

**Id references live in `<style>` text as well as attributes.** `collectReferencedIds` scans
`textContent` for `<style>` too — the injected font `<style>` contains no `url(#…)` today, but
a future `.swatch { fill: url(#grad) }` would. If you ever narrow the walk, narrow the JSDoc in
the same edit.

**A pixel probe that only asserts equality passes on a blank canvas.** A comparison gate owes a
**content** assertion first, independent of where the sample grid lands:

```ts
expect(baseline.nonWhitePixels).toBeGreaterThan(MIN_NON_WHITE_PIXELS); // ~71k actual
expect(baseline.appliedRedPixels).toBeGreaterThan(MIN_APPLIED_RED_PIXELS); // ~1.1k actual
// only then: expect(dark.samples).toStrictEqual(baseline.samples)
```

Pick thresholds with a real margin over the measured value, and record the measured value in
the same change so the next author can tell a regression from a threshold that was always tight.

**Count colors in disjoint regions, never in the whole frame.** A legend swatch is painted in
the country's own colour; split the 1080 square into a legend corner box and a map column that
do not overlap and count per region (`tests/e2e/final-integration.spec.ts`). Measured at a 1.5×
world camera: France ≈ 1.1k map pixels, Germany ≈ 1.2k, one legend swatch ≈ 570 corner pixels.

**A cross-export equality needs a discrimination control in the same test.** Export the
*known-different* state (the blank page after a reload, before the load) in the same run and
assert it differs. Content floors alone prove something rasterized, not that the comparison can
tell two compositions apart.

**The exported bytes follow the history position, not the saved baseline.** Undo must remove
the undone colour *and its legend swatch* from the next PNG, asserted on pixels.

**Inspect the clone with a `MutationObserver` on `document.body`,** not by stubbing. The
export frame is a body-level `div[aria-hidden="true"]` containing the sanitized clone; it is
appended after sanitization and removed in `finally`, so the observer callback is the only
place it can be read without changing the code under test.

**Prove pixels, not promises.** `download.saveAs()` → parse the PNG `IHDR` for the exact 1080
square, then re-decode the bytes via `createImageBitmap` and sample all four corners for
`[255, 255, 255, 255]`.

**Failure branches are injected through real browser APIs**, each mapping to one reason:

| Injection | Reason |
|---|---|
| `HTMLCanvasElement.prototype.getContext = () => null` | `capture-failed` |
| `toBlob` callback with `null` | `encoding-failed` |
| `URL.createObjectURL` throws | `encoding-failed` |
| `HTMLAnchorElement.prototype.click` throws | `encoding-failed` |
| legend moved beside the canonical SVG | `invalid-composition` |

**Every failure test asserts zero leaked `body > div[aria-hidden="true"]` frames and zero
leaked `body > a[download]` anchors.** A leak here is the same defect class as the permanently
stuck export gate.

**Downloads are written under `.artifacts/playwright/` only** — that root is git-ignored, so
evidence never enters the repository. Downloaded PNGs from before a pipeline change are stale
evidence: clear `.artifacts/playwright/downloads/` before the first post-change run.

---

## Batch Timelapse Export (not built; deferred with the historical chain)

**Nothing below ships.** A timelapse is a sequence of historical snapshots, and the historical
geometry is deferred for missing rights-cleared source material. This sketch is retained as an
intent record only — it is not a contract, and no part of it may be cited as evidence that
historical snapshots exist.

**Draft contract, unimplemented:** `exportTimelapsePngs({ focusCountry, startYear, endYear,
interval, … })` → a ZIP of 1080×1080 PNGs named `CountriesIRL_<ISO>_<year>.png`.

---

*Last updated: 2026-08-06 — rewritten for D-34 (plan 03-11): html2canvas removed and the whole
serialise → SVG-as-image → drawImage → toBlob path owned in `export.ts`; the canonical clone
shape gains a leading injected `<style>`; the generalised font-embedding seam (D-34a) with its
test-only suppression flag; the sandbox boundary as the structural reason for both font
embedding and export theme-independence, replacing the expired `03-09` placement-and-hard-set
analysis; the 540-intrinsic / scale-2 geometry recorded as the border-weight contract; CF-2's
latin-only coverage limit recorded with no full-Unicode claim.*
*Last updated: 2026-08-06 (earlier) — `03-09`'s theme-independence-by-placement analysis (now
expired and replaced above); `EXPORT_BORDER_WIDTH` 0.75 with the `non-scaling-stroke` contract;
journey rules from 02-27 (region-disjoint counting, discrimination controls, bytes follow
history); no-refresh copy enforced and the Phase 2 legend inside the canonical SVG (02-25).*

*Full edit history: `git log -p -- .planning/coding-rules/export.md`.*
