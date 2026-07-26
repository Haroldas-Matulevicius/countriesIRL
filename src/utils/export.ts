import html2canvas from 'html2canvas';

import { DEFAULT_BORDER_COLOR } from '../constants/colors';
import {
  EXPORT_FRAME_SIZE,
  EXPORT_SCALE,
  EXPORT_SIZE,
} from '../constants/config';
import type { ExportResult } from '../types/ui';

const EXPORT_BACKGROUND_COLOR = '#FFFFFF';
const EXPORT_FILENAME_PREFIX = 'CountriesIRL_';
const EXPORT_FILENAME_SUFFIX = '.png';
const MAX_FILENAME_NAME_TOKEN_LENGTH = 60;
const PNG_MIME_TYPE = 'image/png';
const SVG_VIEWBOX = `0 0 ${EXPORT_SIZE} ${EXPORT_SIZE}`;
const SVG_PRESERVE_ASPECT_RATIO = 'xMidYMid meet';
const EXPORT_BORDER_WIDTH = '1';
const DOWNLOAD_HANDOFF_DELAY_MS = 100;

const CAMERA_LAYER_SELECTOR = '[data-layer="camera"]';
const LEGEND_LAYER_SELECTOR = '[data-layer="legend"]';
const OUTGOING_SCENE_SELECTOR =
  '[data-layer="outgoing-scenes"],[data-layer="outgoing-scene"]';
const EDITOR_ONLY_SELECTOR = '[data-editor-only]';
const NON_VISUAL_ELEMENT_SELECTOR = 'title,desc,metadata';
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
      path.removeAttribute('vector-effect');
      path.style.stroke = DEFAULT_BORDER_COLOR;
      path.style.strokeWidth = EXPORT_BORDER_WIDTH;
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

  sanitizeExportClone(clonedNode);
  exportFrame.appendChild(clonedNode);

  return exportFrame;
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

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(exportFrame, {
        backgroundColor: EXPORT_BACKGROUND_COLOR,
        width: EXPORT_FRAME_SIZE,
        height: EXPORT_FRAME_SIZE,
        scale: EXPORT_SCALE,
        windowWidth: EXPORT_FRAME_SIZE,
        windowHeight: EXPORT_FRAME_SIZE,
      });
    } catch {
      return { ok: false, reason: 'capture-failed' };
    }

    if (canvas.width !== EXPORT_SIZE || canvas.height !== EXPORT_SIZE) {
      return { ok: false, reason: 'invalid-dimensions' };
    }

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
