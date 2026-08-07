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
resolve in the 540-unit viewport: the composition's weight in user units at 540 rasterises through
the scale-2 context to twice that at 1080. `EXPORT_BORDER_WIDTH` (0.75) — the `thin` step since
`04-08`, and the FALLBACK when a source declares no contract — gives the same crisp 1.5px line the
retired pipeline produced.
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
`injectExportFontFace(clone, families)` embeds the CSS for each family the
`EXPORT_FONT_FACE_BUILDERS` registry has bytes for. **Only Inter is registered.**
Phase 4's text tools add registry entries; they do not re-open the rasterisation path.

**A named family the registry does not know renders as fallback — SILENTLY.** This is the trap
`04-UI-SPEC.md` § 6.8 raises, and it is real: `collectCompositionFonts` reports the family,
`injectExportFontFace` looks it up, misses, and embeds nothing; the export then rasterises in
whatever the isolated document falls back to, with **no error, no refusal, and no toast**. The
creator sees their chosen typeface on screen and downloads a different one. **If a font picker
ever ships, derive its option list from `EXPORT_FONT_FACE_BUILDERS.keys()` — never from a separate
list**, which is a drift hazard wearing the shape of a feature.

### Two faces, ONE family, ONE registry entry (04-04, D4-15)

`buildExportFontFaceCss()` returns **two** `@font-face` rules for `Inter`, each scoped by its own
`unicode-range`: the vendored latin subset and the vendored latin-ext subset. Google Fonts always
splits Inter by range, so a single file covering both is not obtainable from it, and producing one
needs a subsetting toolchain (`pyftsubset` / `fonttools` / `woff2_compress`) **measured absent on
this machine**. The two-face route needs none of it.

- **The registry does not change, and must not.** It maps family → CSS, so one family emitting
  several faces is a property of the *builder*. A second registry entry would mean a second
  **family** — a design decision the owner has not made. `export.test.ts` asserts
  `EXPORT_FONT_FACE_BUILDERS.size` against the literal 1 for exactly this reason.
- **The latin face needs an explicit `unicode-range` too.** Without one it matches every codepoint
  and the two faces — same family, same weight, same style — collapse to "last declaration wins"
  instead of dividing the character space. This is why the latin rule gained a range it did not
  have before 04-04.
- **Both ranges are pasted verbatim from the live fetch** recorded in `src/assets/README.md`. A
  hand-typed range is a **silent coverage hole**: the rule parses, the face is present, the glyphs
  still fall back. `export.test.ts` asserts the two ranges are not equal to each other, because a
  duplicated range is a no-op that still counts as two faces.
- **Always inlined, never conditional on composition content.** `src/utils/export.ts` is the most
  safety-critical file in the repo; a content-dependent branch makes the export non-deterministic
  in exchange for a saving that does not change the PNG at all. (The *family*-level conditionality
  in `collectCompositionFonts` is a different, structural thing and it stays.)
- **`src/styles/theme.css` carries the matching pair.** The clone cannot see that stylesheet, so
  the two must be kept in step by hand — a range present in one and not the other makes the editor
  and the download disagree about which glyphs fall back.

**Measured cost, on the right artifact.** Both files are same-origin vendored bytes with recorded
SHA-256s: latin 48,432 B raw / 64,576 B base64; latin-ext 85,272 B raw / 113,696 B base64. Adding
the second face grew the injected `<style>` from 64,714 to 178,942 characters (**+114,228**) and the
serialised `encodeURIComponent` data URL by **+121,418** characters. Measured on the built bundle
(one-face control vs two-face, same `vite build`): `index.js` **560.48 kB → 674.41 kB (+113.93 kB
raw, +86.01 kB gzipped)**; the CSS bundle is byte-unchanged at 50.34 kB, because the editor's faces
reference the woff2 files by URL rather than inlining them. **The exported PNG's file size
is unaffected**: the base64 rides in the bundle and the intermediate SVG, and the PNG encoder is
handed a raster, never a font byte. The Phase 3-era "+113 KB per export" framing named the wrong
artifact and is corrected here and in `src/assets/README.md`. Headroom is two orders of magnitude —
a 3,000,269-character data URL loaded fine in installed Chrome.

**The test-only suppression seam.** `EXPORT_FONT_FACE_SUPPRESSION_FLAG` is a `globalThis`
sentinel that makes `injectExportFontFace` a no-op. It exists so assertion 25 can export a
font-suppressed control run and go RED when the injection is deleted. It is set only from
Playwright (`addInitScript`/`evaluate`); nothing in the product writes it, it is not read from
storage, and no creator-facing control reaches it. Keep it that way.

### Coverage is latin + latin-ext, and the rest is recorded, not hidden (CF-2, closed by D4-15)

**Superseded 2026-08-06 by plan `04-04`.** CF-2 read: *the vendored subset stops at `U+00FF`, so
`Ł ą ę ś ż` (Polish), `č ė š ų ū ž` (Lithuanian), `ě ř ů` (Czech), `č ć đ š ž` (Balkan),
`ā ē ģ ķ` (Latvian) and `ș ț` (Romanian) fall back to the generic stack mid-string, in the editor
and in the exported PNG* — and it named widening as an owner decision. **D4-15 made that decision
and `04-04` executed it.** All of those glyphs sit inside `U+0100-02BA` and are now drawn by the
vendored latin-ext face, in the editor and in the export.

What has **not** changed:

- **No claim of full Unicode coverage may be made anywhere.** Greek, Cyrillic, Vietnamese
  precomposed forms (`U+1EA0-1EF9`), and CJK are separate Google Fonts subsets and are **not**
  vendored. A composition using them still falls back mid-string.
- The real exposure was always **creator-typed legend labels in native orthography** — bundled
  Natural Earth `properties.name` values are ASCII.
- **What the automated gate proves is bounded.** `tests/e2e/export.spec.ts` proves the two faces
  reach the clone and that a latin-ext string rasterises **differently** from the same string with
  the font suppressed. It does **not** prove the glyphs are *correct*. That is requirement **A12**,
  a ⛔ **physical check** — a human opening an exported PNG and looking at the diacritics —
  scheduled in plan `04-16`. It was one of the nine Phase 3 UAT cells **never performed**;
  **skipped is not passed, it cannot be inherited, and no automated result substitutes for it.**

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
├── rect[data-layer="surface"]     ← 04-01: water; inline fill; OUTSIDE the camera
├── defs[data-layer="paint"]       ← 04-10: band gradients; inline literal stops
├── g[data-layer="camera"]         ← still before the legend; transform preserved
├── g[data-layer="bands"]          ← 04-10: edge-anchored rects; url(#…) fills
└── g[data-layer="legend"]         ← transform preserved
```

`g[data-layer="band-handles"]` is in the SOURCE and never in the clone: it carries
`data-editor-only`, so the sanitizer removes it wholesale.

The leading `<style>` is legitimate and expected: `isPreservedComposition` checks *order*
(camera index < legend index), which a first-child insertion preserves because it shifts both
indices equally. A doc or test that asserts `g[data-layer="camera"]` is the clone's literal
first child is asserting the pre-03-11 shape and is wrong.

**A band is invisible on white water BY DESIGN, and a gate about it must account for that.**
`04-10`'s bands fade from `settings.surfaceColor` to transparent, so over water they fade from the
water colour *to the water colour*: measured at 239.626 with the band on and 239.626 with it off, on
`Warm paper` water. A band gate therefore needs a **non-white surface AND a column that crosses
land**, plus an assertion that its samples really are land — see `coding-rules/frontend.md`
§ The gradient bands for the two-probe (presence, then ordering) shape that separates a REMOVED band
from an INVERTED one.

**Sibling layers are structurally permitted, and `04-01` is the precedent.** The same index-shift
argument covers `rect[data-layer="surface"]`: it is inserted before the camera, so both indices
move together and camera-still-precedes-legend holds. The sanitizer leaves it alone by
construction — it is not `title,desc,metadata`, it carries no `data-editor-only`, it is not a
`path.scene-path`, and `fill` is not in `SEMANTIC_ONLY_ATTRIBUTES` — but "by construction" is not
evidence, so `export.test.ts` asserts the rect and its `fill` survive the clone and
`export.spec.ts`'s `water preset` gate asserts the colour on real downloaded pixels. `04-10`'s `defs[data-layer="paint"]` and `g[data-layer="bands"]` followed the same rule and paid the
same evidence: `export.test.ts` asserts the gradient ids survive AND that the rects still reference
them, and `export.spec.ts`'s `band` gate asserts the fade on real downloaded pixels.
`g[data-layer="text"]` (`04-11`) owes the same.

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
copy of a selected country while the primary copy renders the resting weight — a visible seam
in the PNG.

### The border rule is PASS-THROUGH-WITH-NEUTRALISATION (04-08, D4-08). Replace it; never delete it.

**What it used to do, and why that was a defect.** Until `04-08` the loop hard-set
`stroke: #000000` and `stroke-width: 0.75` on every scene path, as an attribute **and** as an
inline style. Read literally: **the exporter re-painted a black 0.75 border over whatever the
editor had rendered.** D4-08's "coastlines at `none`" and the phase goal — *"country outlines all
but disappear against water"* — were therefore **impossible in the PNG**: the editor would show
unstroked coasts and the download would ship black ones. That is the quieter-failure class this
whole file exists to prevent, arriving from inside the safety mechanism.

**What it does now.** `readStrokeContract(clone)` resolves the composition's choice and the loop
either writes it or removes the stroke entirely:

| Composition weight | Clone |
|---|---|
| `none` | `stroke` and `stroke-width` **removed**, as attribute and inline style |
| anything else | `stroke` = the composition's `borderColor`, `stroke-width` = `STROKE_WEIGHT_UNITS[weight]` |

**`none` OMITS the stroke rather than writing `stroke-width="0"`.** SVG's initial `stroke` is
`none`, so absence is what actually draws nothing in the isolated document — and it lets the gate
assert *absence* instead of a number a later rule could resurrect.

**Everything else in the loop survives verbatim, and this is the half that must never be lost:**

- **`vector-effect: non-scaling-stroke`, as attribute AND inline style, set unconditionally** —
  including at `none`, because the weight is composition state a creator changes between exports.
  This is the recorded fix for *"borders looked super thick in the download only"*.
- **`stroke-dasharray`, `transition`, and `filter` neutralised** — this is what stops a wrapped
  date-line repeat of a *selected* country from shipping its 2px selection border and focus dashes
  into the PNG. The editor still paints selection at 2px on screen; `04-09`'s `data-editor-only`
  highlight layer is the structural replacement.

**Deleting the loop instead of replacing it re-opens two defects this project has already paid
for.** `src/utils/export.test.ts` gates both halves in the same tests, and both were RED-proved by
mutation: restoring the hard-set reddens the pass-through assertions, and removing only the pin and
the three neutralisations reddens the survival assertions while the pass-through stays green.

**How the choice reaches a PURE exporter: two `data-*` attributes on the canonical SVG.**
`MapCanvas` writes `data-coastline-weight` and `data-border-color` on `svg.map-canvas`
(`EXPORT_STROKE_WEIGHT_ATTRIBUTE` / `EXPORT_BORDER_COLOR_ATTRIBUTE` in `constants/config.ts`, the
same dependency-free home the font suppression flag uses). `cloneNode` carries them, and
`sanitizeExportClone` reads them **off the clone**. `exportMapPng`'s signature does not widen and it
still knows nothing about composition state. The weight **name** travels rather than a number, so
`STROKE_WEIGHT_UNITS` is the one table the editor and the clone both resolve through and the two
cannot disagree about what `medium` means.

**The fallback is the pre-`04-08` contract** (black, `EXPORT_BORDER_WIDTH`). A source that declares
nothing exports the borders it always did rather than silently losing them; the e2e gates run the
real app, so a `MapCanvas` that stopped writing the attributes is caught on pixels rather than
resting on this default.

**The editor half is a CUSTOM PROPERTY, not a per-path inline style.** `MapCanvas` sets
`--map-border-weight` / `--map-border-resting` inline on `svg.map-canvas`, and `MapCanvas.css`'s
`.country-path` reads them. A per-path inline `style` would out-specify `.hovered` (1.5px),
`.selected` (2px), and `.focused` (3px) and silently delete every interaction affordance in the
editor. Neither property is declared in any stylesheet, so Live Invariant 9's mode-invariant token
set is untouched — they are composition state, not palette.

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

**`04-10` is the plan that made this bite, and the rule was already written down.** The band
gradients are the first referenced ids the product ships, and both `export.spec.ts` and
`fixtures/export.html` carried `ids === 0`. The replacement is three claims, because the obvious two
are vacuous when nothing is referenced at all:

| Claim | Why it is separate |
|---|---|
| no surviving id is **unreferenced** | an id nothing points at is still editor semantics and still goes |
| no surviving **reference dangles** | a `url(#…)` resolving to nothing is a layer missing from the PNG while the editor shows it |
| at least one reference **exists** | without this the two above are satisfied by a clone with no ids and no references |

**Measured evidence that the strip rule discriminates rather than blanket-keeping:** with the top
band on and the bottom band off, the sanitized clone carries **one** id. The bottom gradient has no
rect pointing at it and is correctly stripped.

**A `<defs>` subtree is not enough on its own.** The gradient can be present, correct, and inert:
the id goes, `fill="url(#band-top)"` still reads fine in the markup, and the band simply does not
rasterise. There is no error, no refusal, and no toast — the same silent-failure shape as an
unregistered font family.

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

**Amended by `04-01` (D4-03, carried disagreement CD-6). The three white layers guarantee
OPACITY; `[data-layer="surface"]` carries COLOUR. They are different jobs and neither replaces
the other.**

**The opacity floor — always three white layers (`#FFFFFF`).** Each deliberate: the canvas is
`fillRect`'d white before the draw, the export frame hard-sets white inline, and the cloned SVG
hard-sets white inline. Do not "simplify" one away because the others cover it — each alone keeps
the PNG opaque, which is exactly why removing one is invisible until the last one goes. **`04-01`
did not touch any of the three, and a creator-chosen water colour is not a reason to.** They are
what stands behind a partially transparent composition; the surface rect is not a substitute,
because a rect can be removed by a bug and a `fillRect` on the destination canvas cannot.

**The colour layer — `rect[data-layer="surface"]` inside `svg.map-canvas`.** `x=0 y=0
width=1080 height=1080`, a direct child of the canonical SVG, **outside** `[data-layer="camera"]`
(inside it, the water would pan and zoom with the map) and **before** it, so it paints beneath
everything. It carries the resolved composition water colour as an **inline `fill` attribute**.

**Never a CSS token, and this is measured rather than argued.** The serialised clone is
rasterised as an isolated document that sees no host stylesheet. Writing
`fill="var(--map-surface)"` on that rect exports **rgb(0, 0, 0)** — SVG default black — while the
editor still looks perfectly correct; so does omitting the `fill` entirely. Both were RED-proved
against the real downloaded bytes by `04-01`, and both produce a plausible-looking editor with a
ruined PNG, which is why the gate samples pixels rather than markup.

**`--map-surface`'s job is unchanged and is a different one.** It paints the editor gutter and the
loading skeleton — chrome, outside the canonical SVG — and **contributes zero pixels to the PNG**.
It stays in the mode-invariant `:root` set under Live Invariant 9. Do not point the surface rect at
it, and do not delete it because the rect exists.

**Why white as the default?** Instagram's square format looks best with a white background, and
transparent PNGs are harder for non-technical creators to work with. `DEFAULT_SURFACE_COLOR` is
`#FFFFFF` (the owner's Eurostat reference), so the out-of-the-box export is unchanged.

**Every shipped surface colour clears a luminance floor.** `MIN_COMPOSITION_SURFACE_LUMINANCE` in
`src/utils/contrast.ts`, so the single fixed composition ink `#111827` keeps WCAG AA 4.5:1 on it.
The floor ships at **0.2164**, not `04-UI-SPEC.md § 4.2`'s stated 0.216: the exact requirement is
0.21635148683120853 and 0.216 is that rounded DOWN, which passes a surface measuring 4.4941:1.

**Persistence is NOT wired.** `surfaceColor` is in-memory composition state only; the V2 record's
`settings.backgroundColor` stays pinned to `#FFFFFF` and the storage validator is unchanged. A
saved composition reloads with the default water. `04-14` owns the V3 record.

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

**One comparator, not one per gate.** `measureLegendCrops` in `tests/e2e/export.spec.ts` owns the
decode → crop → count → diff path for both font gates. Two decode paths in one spec is how a
"sampled pixel" assertion quietly starts measuring a differently decoded image from the one beside
it — the same reason `samplePngPoints` was generalised.

### The latin-ext gate (04-04) — and the probe string that could not fail

Two claims, gated separately because they are different claims: the clone **carries** two
`unicode-range` faces, and the embedded faces **draw** a latin-ext string.

**The probe label for the raster claim must be PURE latin-ext.** `04-04-PLAN.md` proposed
`Košice`, `Łódź`, `Magyarország`. Those strings are mostly latin-1, so embedding the font changes
their raster whether or not the latin-ext face ever resolves — the assertion stays **green** with
the latin-ext range narrowed to nothing, which is the "cannot fail on its own subject" shape this
repo keeps shipping. The label used is `ŠŁŹČĘȘ šłźčęș`: every **inked** glyph sits in
`U+0100-02BA`, so the diff can only move if the latin-ext face is selected. `ó` and `á` are
excluded on purpose — they are latin-1 and would contaminate the measurement.

**"Present" is not "selected", and one mutation separates them.** Pointing the latin-ext face's
`src` at the *latin* bytes leaves the structural claim perfectly green — two faces, one family,
both inlined, ranges distinct, `U+0100-02BA` covered — while the raster claim goes red. That
mutation, not the range-narrowing one, is what proves the raster claim is more than a restatement
of the structural one: narrowing the range reddens **both**, because the structural claim asserts
the range actually covers `U+0100-02BA`.

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

*Last updated: 2026-08-07 (latest) — **the reference-aware `id` rule got its first real subject** (D4-16, plan `04-10`). The canonical clone shape gained `defs[data-layer="paint"]` and `g[data-layer="bands"]`, with `g[data-layer="band-handles"]` named as source-only. § Strip semantics records that BOTH `export.spec.ts` and `fixtures/export.html` carried `clone.ids === 0` — the assertion this file already warned CONFIRMS the break — and the three claims that replaced it, including the non-vacuity check the obvious two need; plus the measured evidence that stripping discriminates (one surviving id with the bottom band off, not two) and the reminder that a `<defs>` subtree can be present, correct, and inert with no error anywhere. § Prepared-Composition Clone Contract gained the rule that a band is invisible on white water by design, so a band gate needs a non-white surface AND a land-crossing column, with the measured 239.626-either-way over open ocean and a pointer at `frontend.md`'s presence-then-ordering probe shape.*

*Last updated: 2026-08-07 and 2026-08-06, condensed per the two-entry rule — § Strip semantics gained **the border rule is
pass-through-with-neutralisation** (D4-08, plan `04-08`). `sanitizeExportClone`'s stroke loop no
longer hard-sets `#000000` / `0.75` over the creator's choice — the measured reason a quiet
coastline was unreachable in the PNG. It was **REPLACED, never deleted**: the `non-scaling-stroke`
pin (now set unconditionally, including at `none`) and the `stroke-dasharray` / `transition` /
`filter` neutralisations survive verbatim and are gated in the same tests, because they are the fix
for the recorded "super thick in the download only" defect and for the 2px selection border on
wrapped date-line repeats. Recorded with it: `none` **omits** the stroke rather than writing a zero
width; the composition declares its contract through `data-coastline-weight` / `data-border-color`
on the canonical SVG, so `exportMapPng` stays pure and its signature does not widen; the pre-`04-08`
values remain the fallback for a source that declares nothing; and the editor half rides on
`--map-border-weight` / `--map-border-resting` custom properties rather than per-path inline styles,
which would have out-specified the hover, selection, and focus rules. Live Invariant 9 is untouched
— neither property is declared in any stylesheet. § Size Contract's 0.75 is annotated as the `thin`
step rather than a fixed constant. Earlier: the font-embedding seam rewritten for
D4-15 (plan `04-04`): two `unicode-range`-scoped `@font-face` rules for the ONE `Inter` family, why
the latin face needed an explicit range it never had, why the registry stays at one entry, why both
ranges are pasted verbatim from the live fetch, why the second face is always inlined, the
silent-fallback trap (an unregistered named family renders as fallback with no error, so a future
font picker derives its options from `EXPORT_FONT_FACE_BUILDERS.keys()`), CF-2 superseded with A12
still an unperformed physical check owned by `04-16`, and the cost framing corrected onto the right
artifact (+114,228 characters of injected `<style>`, exported PNG size unaffected). Earlier the same
day, for D4-03 / CD-6 (plan `04-01`): the three white layers as the OPACITY floor and
`rect[data-layer="surface"]` as the COLOUR layer, `--map-surface`'s chrome-only job, two RED proofs
recorded inline (`var(--map-surface)` and a missing `fill` both export rgb(0, 0, 0) while the editor
looks correct), the canonical clone shape's sibling-layer rule, and persistence NOT wired until
`04-14`. Earlier, for D-34 (plan `03-11`): html2canvas removed and the whole serialise →
SVG-as-image → drawImage → toBlob path owned in `export.ts`; the leading injected `<style>`; the
generalised font-embedding seam (D-34a) with its test-only suppression flag; the sandbox boundary as
the structural reason for both font embedding and export theme-independence; the 540-intrinsic /
scale-2 geometry as the border-weight contract; and the 02-25/02-27 journey rules (region-disjoint
counting, discrimination controls, bytes follow history, no-refresh copy, legend inside the
canonical SVG).*

*Full edit history: `git log -p -- .planning/coding-rules/export.md`.*
