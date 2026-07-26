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
- more than one legend group exists;
- the sanitized clone has lost the camera or legend group, reordered them, or changed either
  group's `transform`.

The post-sanitize check is not a tautology: it is the tripwire that catches a **future**
sanitize rule that deletes or reorders a required layer.

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

**Do not blanket-strip `id` if the SVG ever gains `url(#…)` references.** Today the canonical
SVG has no `<defs>`, gradients, clip paths, or `<use>`, so ids are pure editor semantics. If a
gradient or clip path is ever added, id-stripping must become reference-aware first.

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

**No spaces or special characters.** Keep it clean for non-technical users' file systems.

---

## Error Handling

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
| "Canvas blob creation failed" | Browser out of memory | Rare; recommend refreshing the page |
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

**If Phase 2 adds a legend, include it in the export.** Legend should be part of the SVG before calling exportMapPng.

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

## Phase 2: Batch Timelapse Export

**Future contract for Phase 2:**

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

*Last updated: 2026-07-25 — added the Phase 2 prepared-composition clone contract, the named-filename sanitizer order, and the browser export-evidence rules. Prior: 2026-07-21 — corrected connected-anchor download handoff and finally cleanup.*

*Full edit history: `git log -p -- .planning/coding-rules/export.md`.*
