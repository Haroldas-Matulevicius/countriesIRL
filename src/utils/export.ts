import { DEFAULT_BORDER_COLOR } from '../constants/colors';
import {
  EXPORT_FONT_FACE_SUPPRESSION_FLAG,
  EXPORT_FRAME_SIZE,
  EXPORT_SCALE,
  EXPORT_SIZE,
} from '../constants/config';
import {
  EXPORT_FONT_FAMILY,
  buildExportFontFaceCss,
} from '../styles/interFontFace';
import type { ExportResult } from '../types/ui';

const EXPORT_BACKGROUND_COLOR = '#FFFFFF';
const EXPORT_FILENAME_PREFIX = 'CountriesIRL_';
const EXPORT_FILENAME_SUFFIX = '.png';
const MAX_FILENAME_NAME_TOKEN_LENGTH = 60;
const PNG_MIME_TYPE = 'image/png';
const SVG_VIEWBOX = `0 0 ${EXPORT_SIZE} ${EXPORT_SIZE}`;
const SVG_PRESERVE_ASPECT_RATIO = 'xMidYMid meet';
/**
 * The pre-`04-08` fixed border width, retained as the FALLBACK the sanitizer
 * uses when a source declares no stroke contract of its own — see
 * `readStrokeContract`. Exported so `src/utils/mapStyle.test.ts` can pin
 * `strokeWidthFor('thin')` to it rather than retyping `0.75`, which is what
 * makes `thin` provably the no-visual-change step.
 */
export const EXPORT_BORDER_WIDTH = '0.75';
const DOWNLOAD_HANDOFF_DELAY_MS = 100;

const CAMERA_LAYER_SELECTOR = '[data-layer="camera"]';
const LEGEND_LAYER_SELECTOR = '[data-layer="legend"]';
const OUTGOING_SCENE_SELECTOR =
  '[data-layer="outgoing-scenes"],[data-layer="outgoing-scene"]';
const EDITOR_ONLY_SELECTOR = '[data-editor-only]';
const NON_VISUAL_ELEMENT_SELECTOR = 'title,desc,metadata';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SVG_IMAGE_DATA_URL_PREFIX = 'data:image/svg+xml,';
// Wrapped Pacific copies carry `scene-path` but not `country-path`; both must be
// normalized or a date-line composition exports with mismatched borders.
const SCENE_PATH_SELECTOR = 'path.scene-path,path.country-path';

const EDITOR_STATE_CLASSES = [
  'selected',
  'hovered',
  'focused',
  'is-selected',
  'is-hovered',
  'is-focused',
] as const;

// Duplicate accessibility semantics and editor tab stops are stripped; the
// geometry that carries them is never removed (UI-SPEC section 14).
const SEMANTIC_ONLY_ATTRIBUTES = [
  'role',
  'tabindex',
  'focusable',
  'id',
  'data-selected',
  'data-hovered',
  'data-focused',
] as const;

const ARIA_ATTRIBUTE_PREFIX = 'aria-';

/**
 * TEST-ONLY suppression seam for the export font embedding. Assertion 25
 * (tests/e2e/export.spec.ts) exports the same composition twice — once
 * normally, once with the embedded `@font-face` suppressed — and asserts the
 * two rasters differ; without this seam that gate cannot go RED. Nothing in
 * the product writes the flag: it is set only by a Playwright
 * `addInitScript`/`evaluate`, it is not read from storage, and no
 * creator-facing control reaches it. The flag NAME lives in
 * `constants/config.ts` so specs can import it without the font bytes.
 */
export { EXPORT_FONT_FACE_SUPPRESSION_FLAG } from '../constants/config';

function isExportFontFaceSuppressed(): boolean {
  return (
    Reflect.get(globalThis, EXPORT_FONT_FACE_SUPPRESSION_FLAG) === true
  );
}

/**
 * The generalised font-embedding registry (D-34a): family name → the CSS that
 * embeds that family's bytes. Only Inter is registered; Phase 4's text tools
 * add entries here instead of re-opening the rasterisation path.
 *
 * **One entry, two faces (04-04).** `buildExportFontFaceCss` returns TWO
 * `@font-face` rules for Inter — latin and latin-ext, each scoped by its own
 * `unicode-range`. That is a property of the builder, not of the registry: the
 * map is family-to-CSS, so a family emitting several faces needs no second
 * entry and the mechanism is unchanged.
 *
 * **The trap this registry sets** (`04-UI-SPEC.md` § 6.8): a family a
 * composition NAMES but the registry does not KNOW renders as fallback,
 * silently — `collectCompositionFonts` reports it, the lookup misses, and the
 * export produces the wrong typeface with no error anywhere. If a font picker
 * ever ships, its option list must be derived from `.keys()` here, never from
 * a separate list that can drift.
 *
 * Exported for `export.test.ts`, which asserts the entry count against a
 * literal so "two faces" can never be mistaken for "two families".
 */
export const EXPORT_FONT_FACE_BUILDERS: ReadonlyMap<string, () => string> =
  new Map([[EXPORT_FONT_FAMILY, buildExportFontFaceCss]]);

const GENERIC_FONT_FAMILY_KEYWORDS: ReadonlySet<string> = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
  'inherit',
  'initial',
  'unset',
]);

function parseFontFamilyList(value: string): string[] {
  return value
    .split(',')
    .map((family: string): string =>
      family.trim().replaceAll(/^['"]|['"]$/gu, '').trim(),
    )
    .filter(
      (family: string): boolean =>
        family.length > 0 &&
        !GENERIC_FONT_FAMILY_KEYWORDS.has(family.toLowerCase()),
    );
}

/**
 * D-34a: collect the distinct named font families this composition actually
 * references — `font-family` presentation attributes and inline styles — so
 * the embedding step is "embed each font the composition uses", never a
 * hard-coded Inter branch.
 */
export function collectCompositionFonts(
  svg: SVGSVGElement,
): ReadonlyArray<string> {
  const families: string[] = [];
  const seen = new Set<string>();
  const elements: Element[] = [svg, ...svg.querySelectorAll('*')];

  elements.forEach((element: Element): void => {
    const attributeValue = element.getAttribute('font-family') ?? '';
    const inlineValue =
      (element as Partial<SVGElement>).style?.fontFamily ?? '';
    [attributeValue, inlineValue].forEach((value: string): void => {
      parseFontFamilyList(value).forEach((family: string): void => {
        if (!seen.has(family)) {
          seen.add(family);
          families.push(family);
        }
      });
    });
  });

  return families;
}

/**
 * Insert one `<style>` carrying an `@font-face` per referenced family the
 * registry has bytes for, as the clone's FIRST child. The clone is rasterised
 * from a `data:image/svg+xml` URL — an isolated document that sees no host
 * stylesheet and can issue no request — so bytes inside the serialised
 * subtree are the only way any typeface reaches the exported PNG.
 *
 * `insertBefore(style, firstChild)` shifts the camera and legend indices
 * equally, so `isPreservedComposition`'s camera-before-legend order check
 * still holds; the canonical clone shape in `coding-rules/export.md` permits
 * this leading `<style>` by name.
 */
export function injectExportFontFace(
  svg: SVGSVGElement,
  families: ReadonlyArray<string>,
): void {
  if (isExportFontFaceSuppressed()) {
    return;
  }

  const fontFaceCss = families
    .map((family: string): string | null => {
      const buildFontFace = EXPORT_FONT_FACE_BUILDERS.get(family);
      return buildFontFace === undefined ? null : buildFontFace();
    })
    .filter((css: string | null): css is string => css !== null)
    .join('');

  if (fontFaceCss === '') {
    return;
  }

  const style = svg.ownerDocument.createElementNS(SVG_NAMESPACE, 'style');
  style.textContent = fontFaceCss;
  svg.insertBefore(style, svg.firstChild);
}

// `url(#gradient)` in a paint attribute or inline style, and `href="#clip"` on
// `<use>`, are the two ways an SVG resolves an element by id.
const URL_REFERENCE_PATTERN = /url\(\s*['"]?#([^'")\s]+)/gu;
const HASH_REFERENCE_ATTRIBUTES = ['href', 'xlink:href'] as const;

/**
 * Ids are editor semantics only until something points at one. A referenced id
 * is paint: strip it and the gradient, clip path, mask, marker, or filter it
 * resolves silently disappears from the PNG while the screen still looks right.
 */
function collectReferencedIds(elements: ReadonlyArray<Element>): Set<string> {
  const referenced = new Set<string>();

  elements.forEach((element: Element): void => {
    // A `<style>` inside the SVG holds its references in text, not attributes:
    // `.swatch { fill: url(#legend-gradient) }` would otherwise have its target
    // id stripped and the gradient would vanish from the PNG while the on-screen
    // map stayed correct. No such element exists in `MapCanvas` today; this
    // keeps the JSDoc above honest rather than aspirational.
    if (element.tagName.toLowerCase() === 'style') {
      [
        ...(element.textContent ?? '').matchAll(URL_REFERENCE_PATTERN),
      ].forEach((match): void => {
        const id = match[1];
        if (id !== undefined) {
          referenced.add(id);
        }
      });
    }

    element.getAttributeNames().forEach((name: string): void => {
      const value = element.getAttribute(name);
      if (value === null) {
        return;
      }
      if (
        (HASH_REFERENCE_ATTRIBUTES as ReadonlyArray<string>).includes(name) &&
        value.startsWith('#')
      ) {
        referenced.add(value.slice(1));
      }
      [...value.matchAll(URL_REFERENCE_PATTERN)].forEach((match): void => {
        const id = match[1];
        if (id !== undefined) {
          referenced.add(id);
        }
      });
    });
  });

  return referenced;
}

interface CompositionShape {
  cameraTransform: string | null;
  hasCameraLayer: boolean;
  hasLegendLayer: boolean;
  legendTransform: string | null;
}

function readCompositionShape(svg: SVGSVGElement): CompositionShape {
  const cameraLayer = svg.querySelector(CAMERA_LAYER_SELECTOR);
  const legendLayer = svg.querySelector(LEGEND_LAYER_SELECTOR);

  return {
    cameraTransform: cameraLayer?.getAttribute('transform') ?? null,
    hasCameraLayer: cameraLayer !== null,
    hasLegendLayer: legendLayer !== null,
    legendTransform: legendLayer?.getAttribute('transform') ?? null,
  };
}

function isSingleCanonicalComposition(
  source: HTMLElement,
  svg: SVGSVGElement,
): boolean {
  const sourceLegends = source.querySelectorAll(LEGEND_LAYER_SELECTOR).length;
  const svgLegends = svg.querySelectorAll(LEGEND_LAYER_SELECTOR).length;

  // Two legend groups mean the clone would bake a duplicate panel into the PNG.
  if (svgLegends > 1) {
    return false;
  }
  // A legend rendered as a sibling overlay instead of inside the canonical SVG
  // is silently dropped by the clone, so refuse rather than export a map with a
  // missing legend.
  if (sourceLegends !== svgLegends) {
    return false;
  }
  // Zero on both sides used to end the check, which left one hole: a legend
  // hoisted *above* the export source - say a refactor that moves
  // `<LegendOverlay/>` up to App's `workspace__map` div - yields 0 === 0, and
  // the PNG shipped legend-less under a success toast. Widen the comparison to
  // the document so "the source has no legend" is only accepted when the page
  // has none either.
  //
  // Safe to read the document here: `exportMapPng` requires a connected source
  // and runs this before the clone is ever appended, so no export frame of our
  // own can be counted.
  if (sourceLegends === 0) {
    const documentLegends =
      source.ownerDocument.querySelectorAll(LEGEND_LAYER_SELECTOR).length;
    // An uncolored map has no legend anywhere, and must still export a white
    // square. A legend that exists but is not in the source is the defect.
    return documentLegends === 0;
  }

  return true;
}

function sanitizeExportClone(svg: SVGSVGElement): void {
  svg.querySelectorAll(OUTGOING_SCENE_SELECTOR).forEach((element): void => {
    element.remove();
  });
  svg.querySelectorAll(EDITOR_ONLY_SELECTOR).forEach((element): void => {
    element.remove();
  });
  svg
    .querySelectorAll(NON_VISUAL_ELEMENT_SELECTOR)
    .forEach((element): void => {
      element.remove();
    });

  const elements: Element[] = [svg, ...svg.querySelectorAll('*')];
  const referencedIds = collectReferencedIds(elements);

  elements.forEach((element: Element): void => {
    element.classList.remove(...EDITOR_STATE_CLASSES);
    const elementId = element.getAttribute('id');
    SEMANTIC_ONLY_ATTRIBUTES.forEach((attribute: string): void => {
      if (
        attribute === 'id' &&
        elementId !== null &&
        referencedIds.has(elementId)
      ) {
        return;
      }
      element.removeAttribute(attribute);
    });
    element
      .getAttributeNames()
      .filter((name: string): boolean =>
        name.startsWith(ARIA_ATTRIBUTE_PREFIX),
      )
      .forEach((name: string): void => {
        element.removeAttribute(name);
      });
  });

  svg.querySelectorAll<SVGPathElement>(SCENE_PATH_SELECTOR).forEach(
    (path: SVGPathElement): void => {
      path.setAttribute('stroke', DEFAULT_BORDER_COLOR);
      path.setAttribute('stroke-width', EXPORT_BORDER_WIDTH);
      // The camera layer wraps this path in `scale(zoom)`. Without
      // `non-scaling-stroke` the border width is multiplied by that zoom, so a
      // composition framed at 8x exported ~8px-wide boundaries into the 1080
      // PNG while the screen still showed a hairline - the borders looked
      // "super thick" in the download only. Pinning the vector effect makes the
      // stroke resolve in viewport space: EXPORT_BORDER_WIDTH user units at the
      // 540px frame is EXPORT_BORDER_WIDTH CSS pixels, which scale 2 rasterizes
      // to a crisp line at 1080 regardless of how far the creator zoomed in.
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      path.style.stroke = DEFAULT_BORDER_COLOR;
      path.style.strokeWidth = EXPORT_BORDER_WIDTH;
      path.style.vectorEffect = 'non-scaling-stroke';
      path.style.strokeDasharray = 'none';
      path.style.transition = 'none';
      path.style.filter = 'none';
      path.style.outline = 'none';
      path.style.cursor = 'default';
    },
  );
}

function isPreservedComposition(
  svg: SVGSVGElement,
  expected: CompositionShape,
): boolean {
  const children = [...svg.children];
  const cameraIndex = children.findIndex((child: Element): boolean =>
    child.matches(CAMERA_LAYER_SELECTOR),
  );
  const legendIndex = children.findIndex((child: Element): boolean =>
    child.matches(LEGEND_LAYER_SELECTOR),
  );

  if (expected.hasCameraLayer !== cameraIndex >= 0) {
    return false;
  }
  if (expected.hasLegendLayer !== legendIndex >= 0) {
    return false;
  }
  if (cameraIndex >= 0 && legendIndex >= 0 && cameraIndex > legendIndex) {
    return false;
  }

  const actual = readCompositionShape(svg);
  return (
    actual.cameraTransform === expected.cameraTransform &&
    actual.legendTransform === expected.legendTransform
  );
}

function createExportFrame(sourceSvg: SVGSVGElement): HTMLDivElement {
  const exportFrame = document.createElement('div');
  exportFrame.setAttribute('aria-hidden', 'true');
  exportFrame.style.position = 'fixed';
  exportFrame.style.left = `-${EXPORT_FRAME_SIZE}px`;
  exportFrame.style.top = '0';
  exportFrame.style.width = `${EXPORT_FRAME_SIZE}px`;
  exportFrame.style.height = `${EXPORT_FRAME_SIZE}px`;
  exportFrame.style.overflow = 'hidden';
  exportFrame.style.pointerEvents = 'none';
  exportFrame.style.background = EXPORT_BACKGROUND_COLOR;
  exportFrame.style.backgroundColor = EXPORT_BACKGROUND_COLOR;
  exportFrame.style.colorScheme = 'light';
  exportFrame.style.border = '0';
  exportFrame.style.margin = '0';
  exportFrame.style.padding = '0';
  exportFrame.style.boxSizing = 'border-box';

  const clonedNode = sourceSvg.cloneNode(true) as SVGSVGElement;

  clonedNode.setAttribute('viewBox', SVG_VIEWBOX);
  clonedNode.setAttribute('preserveAspectRatio', SVG_PRESERVE_ASPECT_RATIO);
  clonedNode.setAttribute('width', String(EXPORT_FRAME_SIZE));
  clonedNode.setAttribute('height', String(EXPORT_FRAME_SIZE));
  clonedNode.style.width = `${EXPORT_FRAME_SIZE}px`;
  clonedNode.style.height = `${EXPORT_FRAME_SIZE}px`;
  clonedNode.style.background = EXPORT_BACKGROUND_COLOR;
  clonedNode.style.backgroundColor = EXPORT_BACKGROUND_COLOR;
  clonedNode.style.colorScheme = 'light';
  clonedNode.style.display = 'block';
  clonedNode.style.overflow = 'hidden';

  // Injected BEFORE sanitization so the sanitize step is proven to preserve
  // the <style>: it is not in NON_VISUAL_ELEMENT_SELECTOR, carries no
  // data-editor-only, and collectReferencedIds already reads <style> text.
  injectExportFontFace(clonedNode, collectCompositionFonts(clonedNode));
  sanitizeExportClone(clonedNode);
  exportFrame.appendChild(clonedNode);

  return exportFrame;
}

/**
 * Serialise the sanitized clone into the exact SVG-as-image shape the OQ-1
 * spike proved in installed Chrome: `"data:image/svg+xml," +
 * encodeURIComponent(XMLSerializer output)`. The resulting image is an
 * isolated document — the sandbox boundary that makes the exported PNG
 * structurally independent of every host stylesheet, theme class, and custom
 * property, and the reason the fonts must ride inside the subtree.
 */
function serialiseCloneToImageUrl(svg: SVGSVGElement): string {
  const serialised = new XMLSerializer().serializeToString(svg);
  return `${SVG_IMAGE_DATA_URL_PREFIX}${encodeURIComponent(serialised)}`;
}

function loadSvgImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject): void => {
    const image = new Image();
    image.onload = (): void => {
      resolve(image);
    };
    image.onerror = (): void => {
      reject(new Error('The export SVG image failed to load.'));
    };
    image.src = dataUrl;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve): void => {
    canvas.toBlob(resolve, PNG_MIME_TYPE);
  });
}

function waitForDownloadHandoff(): Promise<void> {
  return new Promise<void>((resolve): void => {
    setTimeout(resolve, DOWNLOAD_HANDOFF_DELAY_MS);
  });
}

function createFilenameNameToken(mapName: string): string {
  return mapName
    .replaceAll(/\s+/gu, '_')
    .replaceAll(/[^A-Za-z0-9_-]/gu, '')
    .replaceAll(/_{2,}/gu, '_')
    .replaceAll(/^[_-]+|[_-]+$/gu, '')
    .slice(0, MAX_FILENAME_NAME_TOKEN_LENGTH)
    .replaceAll(/[_-]+$/gu, '');
}

export function createExportFilename(
  date: Date = new Date(),
  mapName?: string,
): string {
  const isoDate = date.toISOString().slice(0, 10);
  const nameToken =
    mapName === undefined ? '' : createFilenameNameToken(mapName);
  const prefix = nameToken === '' ? EXPORT_FILENAME_PREFIX : `${nameToken}_`;

  return `${prefix}${isoDate}${EXPORT_FILENAME_SUFFIX}`;
}

export async function exportMapPng(
  source: HTMLElement,
  date: Date = new Date(),
  mapName?: string,
): Promise<ExportResult> {
  if (!source.isConnected) {
    return { ok: false, reason: 'source-not-found' };
  }

  const sourceSvgs = source.querySelectorAll<SVGSVGElement>('svg');
  if (sourceSvgs.length !== 1) {
    return { ok: false, reason: 'source-not-found' };
  }
  const sourceSvg = sourceSvgs[0];
  if (sourceSvg === undefined) {
    return { ok: false, reason: 'source-not-found' };
  }
  if (!isSingleCanonicalComposition(source, sourceSvg)) {
    return { ok: false, reason: 'invalid-composition' };
  }

  const expectedShape = readCompositionShape(sourceSvg);

  let exportFrame: HTMLDivElement | null = null;
  let downloadAnchor: HTMLAnchorElement | null = null;
  let objectUrl: string | null = null;

  try {
    exportFrame = createExportFrame(sourceSvg);

    const preparedSvg = exportFrame.querySelector<SVGSVGElement>('svg');
    if (preparedSvg === null || !isPreservedComposition(preparedSvg, expectedShape)) {
      return { ok: false, reason: 'invalid-composition' };
    }

    document.body.appendChild(exportFrame);

    // A transient rasterisation failure (image decode, blocked 2D context)
    // surfaces as the retryable capture-failed outcome; the synchronous
    // refusals above have already returned and never reach this point.
    let svgImage: HTMLImageElement;
    try {
      svgImage = await loadSvgImage(serialiseCloneToImageUrl(preparedSvg));
    } catch {
      return { ok: false, reason: 'capture-failed' };
    }

    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const renderingContext = canvas.getContext('2d');
    if (renderingContext === null) {
      return { ok: false, reason: 'capture-failed' };
    }

    // Read the dimensions BACK rather than trusting the assignment: a browser
    // that clamps or zeroes an oversized canvas would otherwise encode a PNG
    // that is not the contract. Exactly 1080x1080, always.
    if (canvas.width !== EXPORT_SIZE || canvas.height !== EXPORT_SIZE) {
      return { ok: false, reason: 'invalid-dimensions' };
    }

    // Same geometry as the retired pipeline, kept deliberately: the clone's
    // intrinsic size stays EXPORT_FRAME_SIZE (540) and the context scales by
    // EXPORT_SCALE (2), so `vector-effect: non-scaling-stroke` still resolves
    // EXPORT_BORDER_WIDTH in 540-unit viewport space and rasterises to the
    // same crisp 1.5px line at 1080 the border contract documents.
    renderingContext.fillStyle = EXPORT_BACKGROUND_COLOR;
    renderingContext.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
    renderingContext.scale(EXPORT_SCALE, EXPORT_SCALE);
    renderingContext.drawImage(
      svgImage,
      0,
      0,
      EXPORT_FRAME_SIZE,
      EXPORT_FRAME_SIZE,
    );

    let blob: Blob | null;
    try {
      blob = await canvasToPngBlob(canvas);
    } catch {
      return { ok: false, reason: 'encoding-failed' };
    }

    if (!blob) {
      return { ok: false, reason: 'encoding-failed' };
    }

    const filename = createExportFilename(date, mapName);

    try {
      objectUrl = URL.createObjectURL(blob);
      downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', objectUrl);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      await waitForDownloadHandoff();
    } catch {
      return { ok: false, reason: 'encoding-failed' };
    }

    return { ok: true, filename };
  } catch {
    return { ok: false, reason: 'capture-failed' };
  } finally {
    try {
      downloadAnchor?.remove();
    } finally {
      try {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      } finally {
        exportFrame?.remove();
      }
    }
  }
}
