# Coding Rules: Export (PNG Export via html2canvas)

**Read when touching:** exportMapPng utility, PNG quality, size contracts, error handling, filename format.

---

## Size Contract: 1080×1080

**Every exported PNG must be exactly 1080×1080 pixels.** Instagram square format.

**This is non-negotiable.** If export is 1080×1079 or 1081×1080, the check fails.

```typescript
// ✅ Good — explicit width/height before export
const canvas = await html2canvas(clone, {
  backgroundColor: '#ffffff',
  scale: 2,  // 2x DPI for crispness
  width: 1080,
  height: 1080,
});

// At this point, canvas.width === 1080 and canvas.height === 1080
```

**DPI scaling for quality.** html2canvas default `scale: 1` renders at screen DPI (~96 DPI). Instagram posts are often viewed at 1.5–2x pixel density. Use `scale: 2` to render at 192 DPI, then canvas.toBlob() downsamples to 1080×1080 for download.

```typescript
// ✅ Good — 2x scale for crisp output
const canvas = await html2canvas(clone, {
  scale: 2,  // Renders at 2x internally, then downsampled
  width: 540,  // Effective size is 540×2 = 1080
  height: 540,
});
```

**Never hardcode dimensions in the SVG itself.** The SVG should render at any size; we control the final size via html2canvas options.

---

## html2canvas Contract

**Export signature:**

```typescript
async function exportMapPng(
  source: HTMLElement,
  date?: Date,
): Promise<ExportResult>
```

**Flow:**

1. **Find and clone the SVG.** Don't modify the original (the creator may export again).
2. **Create a temporary HTML frame.** Append the map-only clone to the document body offscreen.
3. **Call html2canvas.** Capture the 540×540 HTML frame at scale 2.
4. **Validate and encode.** Require an exact 1080×1080 canvas, then use `canvas.toBlob()`.
5. **Connect the download anchor.** Create the object URL and anchor, set `href` and `download`, then append the anchor to `document.body` before calling `click()`.
6. **Await browser handoff after a truthful click.** Only after `click()` returns successfully, await one named, bounded 100ms macrotask before resolving success.
7. **Clean in `finally`.** After the handoff, remove the anchor, revoke the object URL, and remove the frame. If `click()` throws, skip the handoff wait and use the same `finally` immediately.

```typescript
const DOWNLOAD_HANDOFF_DELAY_MS = 100;

function waitForDownloadHandoff(): Promise<void> {
  return new Promise<void>((resolve): void => {
    setTimeout(resolve, DOWNLOAD_HANDOFF_DELAY_MS);
  });
}

let downloadAnchor: HTMLAnchorElement | null = null;
let objectUrl: string | null = null;

try {
  objectUrl = URL.createObjectURL(blob);
  downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', objectUrl);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  await waitForDownloadHandoff();
  return { ok: true, filename };
} finally {
  try {
    downloadAnchor?.remove();
  } finally {
    try {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    } finally {
      exportFrame.remove();
    }
  }
}
```

**Do not remove a successfully clicked anchor or revoke its object URL synchronously.** Chromium may not finish handing the native download to its download manager before the current task ends. Success is truthful only after the connected click succeeds and the bounded handoff completes.

**Always contain expected failures.** html2canvas, PNG encoding, object-URL creation, or anchor click can fail; return the typed `ExportResult` reason while `finally` releases every resource.

---

## Prepared-Composition Clone Contract (Phase 2)

The export utility is **pure**: it clones an already-prepared, already-frozen DOM. It never
freezes the camera, never acquires or releases a `CameraFreezeLease`, and never mutates the
live composition. Lease orchestration lives in the export transaction, not here.

**Canonical shape it requires** (`MapCanvas` renders exactly this):

```
div.map-export-source
└── svg.map-canvas                 ← exactly one; more or fewer is `source-not-found`
    ├── g[data-layer="camera"]     ← must come FIRST
    │   ├── g[data-layer="outgoing-scenes"]
    │   └── g[data-layer="countries"]
    └── g[data-layer="legend"]     ← at most one, and it must be INSIDE the svg
```

**Refuse rather than export a wrong picture.** `invalid-composition` is returned when:

- a `[data-layer="legend"]` group exists in the export source but **outside** the canonical
  SVG (a sibling overlay is silently dropped by `cloneNode`, so the PNG would ship with no
  legend — this is exactly the defect class that produced the clipped-legend regression);
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
| `[data-layer="outgoing-scene(s)"]` (mid-crossfade predecessor) | `g[data-layer="camera"]` and its `transform` |
| `[data-editor-only]` (legend hit area, nudge handles) | every `path.scene-path`, including `country-path--decorative` wrapped repeats |
| `<title>`, `<desc>`, `<metadata>` | `d`, `fill`, `transform`, and all `data-*` geometry markers |
| **all** `aria-*` attributes | the live legend `<g>` with its exact `transform`, text, and fills |
| `role`, `tabindex`, `focusable`, `id` | |
| `selected` / `hovered` / `focused` classes and `data-selected` / `data-hovered` / `data-focused` | |

**Normalize borders across `path.scene-path`, not `path.country-path`.** Wrapped repeats carry
`scene-path country-path--decorative`; the `.country-path` selector does **not** match them.
Normalizing only `country-path` leaves the selection border (`#111827`, 2px) baked onto every
wrapped copy of a selected country while the primary copy renders the default 1px `#9CA3AF` —
a visible seam in the PNG.

**`id` stripping is reference-aware, and must stay that way.** An id nothing points at is
editor semantics; an id something points at is **paint**. Before removing any `id`, collect
every reference in the clone — `url(#…)` in any attribute or inline style, and `href` /
`xlink:href` beginning with `#` — and keep the ids they resolve. A blanket strip renders
correctly on screen and ships a PNG with the gradient, clip path, mask, marker, or filter
silently gone, because the reference is resolved by `html2canvas` *after* sanitization.

A test that asserts `clone.ids === 0` **confirms** that break instead of catching it. Assert
instead that no surviving `url(#…)` or `href="#…"` reference dangles.

**Zero legends is not a missing legend.** `isSingleCanonicalComposition` refuses a duplicated
legend and a legend that exists in the source but not in the canonical SVG. It deliberately
allows zero-on-both-sides: an uncolored map has no legend entries and must still export a white
square. Do not "tighten" this to `=== 1`.

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
— all *before* it creates a frame or calls html2canvas. A second copy of those rules in the
transaction is a drift hazard, not a safety net. The transaction only refuses a `null` source
(`export-source-unavailable`), which the utility cannot see.

**Failure reasons stay truthful:** a throw before the capture begins is `preparation-failed`, a
throw once html2canvas is running is `export-failed`, and the five `ExportFailureReason` values
are passed through unchanged.

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

**No spaces or special characters.** Keep it clean for non-technical users' file systems.

---

## Error Handling

> **Superseded in Phase 2.** `alert()` is not how the app reports anything — outcomes go through
> `ToastRegion`, whose allowlist rejects any string it does not recognize, and the reason is
> branched per the table above. The Phase 1 shape below is kept for release-evidence continuity
> only; do not copy it into new code.

**Errors in export should alert the user but not crash the app.**

```typescript
// ✅ Good — user gets feedback
const handleExport = async () => {
  try {
    await exportMapPng(svgRef.current, filename);
    alert('Map exported successfully!');
  } catch (error) {
    alert('Export failed. See console for details.');
    console.error(error);
  }
};

// ❌ Bad — silent failure, user has no idea
const handleExport = async () => {
  await exportMapPng(svgRef.current, filename).catch(() => {});
};
```

**Common failures:**

| Error | Cause | Mitigation |
|---|---|---|
| "SVG element not found" | svgRef.current is null | Ensure MapCanvas is rendered before export button is enabled |
| "Canvas blob creation failed" | Browser out of memory | Return `encoding-failed` and offer a retry. **Never recommend refreshing the page** — the composition lives only in browser memory, so a refresh destroys every unsaved colour, camera, period, and legend. This row said "recommend refreshing the page" until 2026-07-26, contradicting the rule three sections above; the contradiction is the point of this note. |
| Network timeout | html2canvas trying to fetch resources | Avoid external image URLs in SVG; embed base64 or use data URIs |

---

## Background Color Contract

**Always export with a white background (`#ffffff`).**

```typescript
const canvas = await html2canvas(clone, {
  backgroundColor: '#ffffff',  // NOT transparent, NOT light gray
  scale: 2,
});
```

**Why white?** Instagram's square format looks best with a white background. Users can overlay it on any background in their editor. Transparent PNGs (alpha channel) are harder for non-technical creators to work with.

**The Phase 2 legend ships, and it is part of the canonical SVG before `exportMapPng` is
called** — see the clone contract above. A legend that is a *sibling* of `svg.map-canvas` is a
hard `invalid-composition` refusal, never a silently legend-less PNG.

---

## Performance & Timeouts

**Export should complete in <3 seconds.** If it takes longer, the UX feels broken.

**html2canvas is synchronous.** It blocks the main thread. For Phase 1 (1080×1080, single SVG), this is acceptable. Phase 2 might offload to a Web Worker if batch exports (timelapse) are too slow.

**No progress bars in Phase 1.** Just a loading spinner or disabled button state.

```typescript
const [exporting, setExporting] = useState(false);

const handleExport = async () => {
  setExporting(true);
  try {
    await exportMapPng(svgRef.current, filename);
    alert('Exported!');
  } catch (error) {
    alert('Export failed.');
  } finally {
    setExporting(false);
  }
};

return (
  <button onClick={handleExport} disabled={exporting}>
    {exporting ? '📥 Exporting...' : '📥 Export PNG'}
  </button>
);
```

---

## Browser Compatibility

**html2canvas works in all modern browsers.** No IE11, but Phase 1 doesn't support IE anyway.

**CORS issues.** If the SVG ever includes external images (Phase 2+), they must be same-origin or have CORS headers. html2canvas can't export cross-origin images.

**Canvas size limit.** Most browsers cap canvas at ~16384×16384. 1080×1080 is nowhere near that, so no issue.

---

## Testing

**Manual export tests:**

- [ ] Color 5 countries
- [ ] Click "Export PNG"
- [ ] File downloads as `CountriesIRL_<date>.png`
- [ ] File is exactly 1080×1080 pixels (check image properties)
- [ ] Image quality is crisp (not blurry, not pixelated)
- [ ] Colors match the map on screen
- [ ] Upload to Instagram; confirm it displays correctly in feed

### Browser evidence: `tests/e2e/export.spec.ts` + `fixtures/export.html`

**Never stub `html2canvas` in the browser slice.** The fixture composes the **real**
`MapCanvas` (real geo data → real 248 × 3 wrapped paths) and the **real** `LegendOverlay`,
then calls the **real** `exportMapPng`. A handcrafted fixture SVG can silently drift from
`MapCanvas` and keep passing while production breaks.

**A fixture cannot prove legend placement — only the real app can.**
`fixtures/export.html` passes its own `legendSlot: h(LegendOverlay, …)` into `MapCanvas`, which
re-implements `App`'s wiring. Asserting `svg.map-canvas > [data-layer="legend"]` there proves
only that `MapCanvas` fills the slot it is handed; it stays green while `App` renders the legend
as a sibling and **every** export refuses with `invalid-composition`. So the containment
assertions must also run against `page.goto('/')`:

```ts
await expect(mapListbox.locator('[data-layer="legend"]')).toHaveCount(0);
await expect(page.locator('svg.map-canvas > [data-layer="legend"]')).toHaveCount(1);
// the legend must not be announced as a map option
element.closest('[role="listbox"]') === null
```

Rule of thumb: **when a fixture re-implements the wiring under test, its assertion is about the
fixture.** Keep one real-app counterpart for every structural contract the composition root owns.

**"No legend in the source" is only innocent when the page has none either.** The structural gate
compares legend counts in the export source against the canonical SVG, and a legend hoisted
*above* the source — a refactor that lifts `<LegendOverlay/>` to App's `workspace__map` div —
gives `0 === 0`, which used to be accepted as "a composition that never had a legend" and shipped
a legend-less PNG under a success toast. Widen the zero case to `source.ownerDocument`: zero in
the source is accepted only when the document has zero too. This is safe to read because
`exportMapPng` requires a connected source and runs the check before any clone is appended.

**Id references live in `<style>` text as well as attributes.** `collectReferencedIds` walks
attribute values, which covers `fill`/`clip-path`/`filter`/`marker-*`/inline `style` and
`href`/`xlink:href`. A `<style>` element inside the SVG holds `.swatch { fill: url(#grad) }` as
*text content*, so its target id would be stripped and the gradient would vanish from the PNG
while the on-screen map stayed correct. Scan `textContent` for `<style>` too — and if you ever
narrow the walk, narrow the JSDoc in the same edit. A comment claiming coverage the code lacks is
how this stayed latent.

**The export-unsafe-CSS guard must list every class the clone can carry, and prove the list.**
`EXPORT_CONTENT_PATTERN` is hand-maintained, so it rots the moment `MapCanvas` gains a path
class. It omitted `.map-unit-path` for a whole phase and nothing noticed, because
`.map-unit-path` and `.scene-path` have zero rules today — the omission only becomes a defect the
day someone adds `.map-unit-path { filter: brightness(0.98) }` to dim non-selectable units, which
html2canvas approximates differently than the browser paints it. Bind the list back to the
component (`expect(mapCanvasSource.includes("'map-unit-path'")).toBe(true)`) so removing a class
breaks the test rather than leaving it guarding a ghost.

**A pixel probe that only asserts equality passes on a blank canvas.** The theme-independence
gate exported in three browser contexts and compared 64 sample points across them. Three
identical all-white 1080×1080 squares satisfy that perfectly — and that is exactly the shape a
`foreignObject`/CORS or `isolation: isolate` regression produces, in every context at once. Every
creator ships a blank PNG, green.

So a comparison gate owes a **content** assertion first, and it must be independent of where the
sample grid lands:

```ts
expect(baseline.nonWhitePixels).toBeGreaterThan(MIN_NON_WHITE_PIXELS); // ~71k actual
expect(baseline.appliedRedPixels).toBeGreaterThan(MIN_APPLIED_RED_PIXELS); // ~1.1k actual
// only then: expect(dark.samples).toStrictEqual(baseline.samples)
```

Assert the positive claim (the composition rasterized, and the color the test applied reached the
PNG) before the relational one (all contexts agree). Pick thresholds with a real margin over the
measured value, and record the measured value in the same change so the next author can tell a
regression from a threshold that was always tight.

**Inspect the clone with a `MutationObserver` on `document.body`,** not by stubbing. The
export frame is a body-level `div[aria-hidden="true"]` containing the sanitized clone; it is
appended after sanitization and removed in `finally`, so the observer callback is the only
place it can be read without changing the code under test.

**Prove pixels, not promises.** `download.saveAs()` → parse the PNG `IHDR` (`width` at byte
16, `height` at byte 20) for the exact 1080 square, then re-decode the bytes in the page via
`createImageBitmap` and sample all four corners for `[255, 255, 255, 255]`. A `toBlob`
success alone proves nothing about size or opacity.

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
evidence never enters the repository.

**Edge cases:**

- [ ] Export twice in a row (both files should have the same name, second one should ask to overwrite)
- [ ] Export, then change colors, export again (both should have updated colors)
- [ ] Export with no countries colored (should export white map, not error)

---

## Batch Timelapse Export (not built; deferred with the historical chain)

**Nothing below ships.** A timelapse is a sequence of historical snapshots, and the historical
geometry is deferred for missing rights-cleared source material. This sketch is retained as an
intent record only — it is not a contract, and no part of it may be cited as evidence that
historical snapshots exist.

**Draft contract, unimplemented:**

```typescript
// Batch export 10 images of Lithuania's borders, 1500–1750, 25-year intervals
const images = await exportTimelapsePngs({
  focusCountry: 'LT',
  focusColor: '#FF0000',
  otherColor: '#FFFFFF',
  startYear: 1500,
  endYear: 1750,
  interval: 25,
});

// Returns: [Promise<Blob>, Promise<Blob>, ..., Promise<Blob>]
// Resolves when all 10 PNGs are downloaded
```

**Each image will be:**
- Named: `CountriesIRL_LT_1500.png`, `CountriesIRL_LT_1525.png`, ...
- Size: 1080×1080
- Content: Lithuania highlighted in red, all other countries in white

**Delivered as a ZIP file** for convenience (user can unzip → upload to Instagram).

---

*Last updated: 2026-07-26 — removed the "recommend refreshing the page" mitigation that contradicted this file's own no-refresh rule; marked the Phase 1 `alert()` error handling and the unbuilt timelapse sketch as superseded/deferred; the Phase 2 legend ships inside the canonical SVG (plan 02-25).*
*Last updated: 2026-07-26 — wave789 and wave 6 review rules: a zero-legend source is innocent only when the document has none either, `<style>` text carries id references, the export-unsafe-CSS guard is bound back to the component, a pixel probe must assert content before cross-context equality, reference-aware id stripping, the real-app legend-containment rule, and per-reason refusal messaging with no "Refresh the page" copy.*

*Full edit history: `git log -p -- .planning/coding-rules/export.md`.*
