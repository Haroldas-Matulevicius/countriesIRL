import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_BORDER_COLOR } from '../constants/colors';
import {
  EXPORT_BORDER_COLOR_ATTRIBUTE,
  EXPORT_FRAME_SIZE,
  EXPORT_SCALE,
  EXPORT_SIZE,
  EXPORT_STROKE_WEIGHT_ATTRIBUTE,
} from '../constants/config';
import { strokeWidthFor } from '../constants/mapStyle';
import {
  EXPORT_BORDER_WIDTH,
  EXPORT_FONT_FACE_BUILDERS,
  EXPORT_FONT_FACE_SUPPRESSION_FLAG,
  collectCompositionFonts,
  createExportFilename,
  exportMapPng,
  injectExportFontFace,
} from './export';

/*
 * Deliberately NOT `SELECTED_BORDER_COLOR`. Every map border is black now, so a
 * fixture painted with the selection token would equal `DEFAULT_BORDER_COLOR`
 * and both directions of the stroke contract - "the clone is normalized" and
 * "the live composition is untouched" - would pass without the code doing
 * anything. This sentinel is a colour the exporter must overwrite in the clone
 * and must never write back to the source.
 */
/**
 * A value no other layer in the fixture uses, so an assertion on it cannot be
 * accidentally satisfied by the export background, the legend ink, or a
 * country fill.
 */
const SURFACE_FILL_SENTINEL = '#123456';
const SOURCE_STROKE_SENTINEL = '#0F766E';
/**
 * 04-09. Distinct from every stroke the coastline contract can produce, on
 * purpose: `MESH_STROKE_WIDTH_SENTINEL` is not `0.75` (the fallback), not `2`
 * (`bold`), and not absent (`none`), so an exporter that began normalising the
 * mesh would be caught on the NUMBER rather than on a passing coincidence.
 */
const MESH_STROKE_SENTINEL = '#7C3AED';
const MESH_STROKE_WIDTH_SENTINEL = '0.9';
const HIGHLIGHT_SELECTED_WIDTH = '2.5';
/*
 * 04-10. The band gradient ids and the stop colour, as sentinels.
 *
 * The ids are spelled here rather than imported from `MapCanvas` on purpose:
 * this fixture stands in for a composition the exporter is HANDED, and an
 * assertion that both sides read the same constant could not fail if the
 * renderer stopped writing the reference at all. The real-app counterpart is
 * `export.spec.ts`'s `band` gate, which measures pixels.
 *
 * The stop colour is a distinctive non-default so "the stop survived" cannot be
 * satisfied by a default value the sanitizer happened to leave behind.
 */
const BAND_TOP_GRADIENT_ID = 'countriesirl-band-top';
const BAND_BOTTOM_GRADIENT_ID = 'countriesirl-band-bottom';
const BAND_STOP_COLOR_SENTINEL = '#F5EFE6';
const BAND_HANDLE_STROKE_SENTINEL = '#2E7D32';

const DOWNLOAD_HANDOFF_DELAY_MS = 100;
const LEGEND_FONT_FAMILY_DECLARATION =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

class FakeStyleDeclaration {
  public cssText = '';
  public position = '';
  public inset = '';
  public left = '';
  public top = '';
  public width = '';
  public height = '';
  public overflow = '';
  public pointerEvents = '';
  public background = '';
  public backgroundColor = '';
  public colorScheme = '';
  public opacity = '';
  public border = '';
  public margin = '';
  public padding = '';
  public boxSizing = '';
  public transition = '';
  public filter = '';
  public outline = '';
  public fontFamily = '';

  public setProperty(name: string, value: string): void {
    Reflect.set(this, name.replaceAll('-', ''), value);
  }

  /**
   * `04-08`: the sanitizer REMOVES the inline stroke at `none` rather than
   * writing a zero. Camel-cased so `stroke-width` clears the same `strokeWidth`
   * property the production code assigns; an empty string is what
   * `CSSStyleDeclaration` reads back for an unset property.
   */
  public removeProperty(name: string): string {
    const key = name.replaceAll(/-([a-z])/gu, (_match, letter: string): string =>
      letter.toUpperCase(),
    );
    const previous = String(Reflect.get(this, key) ?? '');
    Reflect.set(this, key, '');
    return previous;
  }
}

class FakeElement {
  public readonly attributes = new Map<string, string>();
  public readonly children: FakeElement[] = [];
  public readonly style = new FakeStyleDeclaration();
  public parentElement: FakeElement | null = null;
  public textContent: string | null = '';
  public isConnected: boolean;
  public wasRemoved = false;
  public removeCallCount = 0;
  public wasClicked = false;
  public wasConnectedWhenClicked = false;
  public clickError: Error | null = null;

  public constructor(
    public readonly tagName: string,
    isConnected = false,
  ) {
    this.isConnected = isConnected;
  }

  /**
   * The real DOM always gives a connected element an owner document, and the
   * legend guard reads it to catch a legend hoisted *above* the export source
   * (0 legends in the source and 0 in the SVG is otherwise indistinguishable
   * from an uncolored map that legitimately has none). The font injection
   * reads it too, for `createElementNS`. The stub has to offer it or neither
   * path can be exercised here at all.
   */
  public get ownerDocument(): unknown {
    return Reflect.get(globalThis, 'document');
  }

  public get classList(): { remove: (...tokens: string[]) => void } {
    return {
      remove: (...tokens: string[]): void => {
        const classes = new Set(
          (this.getAttribute('class') ?? '').split(/\s+/u).filter(Boolean),
        );
        tokens.forEach((token: string): void => {
          classes.delete(token);
        });
        if (classes.size > 0) {
          this.setAttribute('class', [...classes].join(' '));
        } else {
          this.removeAttribute('class');
        }
      },
    };
  }

  public get firstChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public appendChild<T extends FakeElement>(child: T): T {
    child.parentElement = this;
    child.setConnected(this.isConnected);
    this.children.push(child);
    return child;
  }

  public insertBefore<T extends FakeElement>(
    child: T,
    reference: FakeElement | null,
  ): T {
    child.parentElement = this;
    child.setConnected(this.isConnected);
    const index =
      reference === null ? this.children.length : this.children.indexOf(reference);
    this.children.splice(index < 0 ? this.children.length : index, 0, child);
    return child;
  }

  public remove(): void {
    this.wasRemoved = true;
    this.removeCallCount += 1;
    this.setConnected(false);
    if (this.parentElement) {
      const index = this.parentElement.children.indexOf(this);
      if (index >= 0) {
        this.parentElement.children.splice(index, 1);
      }
      this.parentElement = null;
    }
  }

  public click(): void {
    this.wasClicked = true;
    this.wasConnectedWhenClicked = this.isConnected;
    if (this.clickError) {
      throw this.clickError;
    }
  }

  public cloneNode(deep: boolean): FakeElement {
    const clone = new FakeElement(this.tagName);
    this.attributes.forEach((value: string, name: string): void => {
      clone.setAttribute(name, value);
    });
    clone.textContent = this.textContent;
    Object.assign(clone.style, this.style);
    if (deep) {
      this.children.forEach((child: FakeElement): void => {
        clone.appendChild(child.cloneNode(true));
      });
    }
    return clone;
  }

  public querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  public querySelectorAll(selector: string): FakeElement[] {
    const matches: FakeElement[] = [];
    const selectors = selector.split(',').map((value: string): string => value.trim());

    const visit = (element: FakeElement): void => {
      element.children.forEach((child: FakeElement): void => {
        if (selectors.some((candidate: string): boolean => child.matches(candidate))) {
          matches.push(child);
        }
        visit(child);
      });
    };

    visit(this);
    return matches;
  }

  public matches(selector: string): boolean {
    return selector
      .split(',')
      .map((value: string): string => value.trim())
      .some((candidate: string): boolean => this.matchesSingle(candidate));
  }

  private matchesSingle(selector: string): boolean {
    if (selector === '*') {
      return true;
    }

    const pattern =
      /^(?<tag>[A-Za-z][\w-]*)?(?<classes>(?:\.[\w-]+)*)(?<attributes>(?:\[[^\]]+\])*)$/u;
    const parsed = pattern.exec(selector);
    if (parsed?.groups === undefined) {
      return false;
    }

    const { tag, classes, attributes } = parsed.groups;
    if (tag !== undefined && this.tagName !== tag.toUpperCase()) {
      return false;
    }

    const ownClasses = new Set(
      (this.getAttribute('class') ?? '').split(/\s+/u).filter(Boolean),
    );
    const requiredClasses = (classes ?? '')
      .split('.')
      .filter((value: string): boolean => value.length > 0);
    if (
      requiredClasses.some(
        (required: string): boolean => !ownClasses.has(required),
      )
    ) {
      return false;
    }

    const attributeClauses = (attributes ?? '').match(/\[[^\]]+\]/gu) ?? [];
    return attributeClauses.every((clause: string): boolean => {
      const attributeMatch = /^\[([^=\]]+)(?:="([^"]*)")?\]$/u.exec(clause);
      const attributeName = attributeMatch?.[1];
      if (attributeName === undefined) {
        return false;
      }
      const expectedValue = attributeMatch?.[2];
      const value = this.getAttribute(attributeName);
      return expectedValue === undefined
        ? value !== null
        : value === expectedValue;
    });
  }

  private setConnected(isConnected: boolean): void {
    this.isConnected = isConnected;
    this.children.forEach((child: FakeElement): void => {
      child.setConnected(isConnected);
    });
  }
}

class FakeRenderingContext {
  public fillStyle = '';
  public readonly scaleCalls: Array<readonly [number, number]> = [];
  public readonly fillRectCalls: Array<
    readonly [number, number, number, number]
  > = [];
  public readonly drawImageCalls: Array<ReadonlyArray<unknown>> = [];

  public scale(x: number, y: number): void {
    this.scaleCalls.push([x, y]);
  }

  public fillRect(x: number, y: number, width: number, height: number): void {
    this.fillRectCalls.push([x, y, width, height]);
  }

  public drawImage(...call: unknown[]): void {
    this.drawImageCalls.push(call);
  }
}

interface FakeCanvasOptions {
  contextUnavailable?: boolean;
  blob?: Blob | null;
  /** Simulates a browser clamping an oversized canvas: assignments are ignored. */
  lockDimensionsTo?: { width: number; height: number };
}

class FakeCanvas {
  public readonly tagName = 'CANVAS';
  public readonly context = new FakeRenderingContext();
  public readonly toBlob = vi.fn(
    (callback: (blob: Blob | null) => void, type?: string): void => {
      expect(type).toBe('image/png');
      callback(
        this.options.blob === undefined ? new Blob(['png']) : this.options.blob,
      );
    },
  );
  private assignedWidth = 0;
  private assignedHeight = 0;

  public constructor(private readonly options: FakeCanvasOptions) {}

  public set width(value: number) {
    this.assignedWidth = this.options.lockDimensionsTo?.width ?? value;
  }

  public get width(): number {
    return this.assignedWidth;
  }

  public set height(value: number) {
    this.assignedHeight = this.options.lockDimensionsTo?.height ?? value;
  }

  public get height(): number {
    return this.assignedHeight;
  }

  public getContext(kind: string): FakeRenderingContext | null {
    expect(kind).toBe('2d');
    return this.options.contextUnavailable === true ? null : this.context;
  }
}

class FakeDocument {
  public readonly body = new FakeElement('BODY', true);
  public readonly createdElements: FakeElement[] = [];
  public readonly createdCanvases: FakeCanvas[] = [];
  public nextAnchorClickError: Error | null = null;
  public canvasOptions: FakeCanvasOptions = {};

  public querySelectorAll(selector: string): FakeElement[] {
    return this.body.querySelectorAll(selector);
  }

  public createElement(tagName: string): FakeElement | FakeCanvas {
    if (tagName === 'canvas') {
      const canvas = new FakeCanvas(this.canvasOptions);
      this.createdCanvases.push(canvas);
      return canvas;
    }
    const element = new FakeElement(tagName.toUpperCase());
    if (tagName === 'a') {
      element.clickError = this.nextAnchorClickError;
    }
    this.createdElements.push(element);
    return element;
  }

  public createElementNS(_namespace: string, tagName: string): FakeElement {
    const element = new FakeElement(tagName.toUpperCase());
    this.createdElements.push(element);
    return element;
  }
}

/**
 * Every clone handed to `XMLSerializer` lands here, which is the new path's
 * capture seam: the serialised element IS the sanitized clone, and its parent
 * is the export frame.
 */
const serializedClones: FakeElement[] = [];
const loadedImageUrls: string[] = [];
let failNextSvgImageLoad = false;

class FakeXMLSerializer {
  public serializeToString(node: unknown): string {
    serializedClones.push(node as FakeElement);
    return '<svg data-serialized="true"/>';
  }
}

class FakeImage {
  public onload: (() => void) | null = null;
  public onerror: ((error?: unknown) => void) | null = null;
  public width = 0;
  public height = 0;
  private assignedSrc = '';

  public set src(value: string) {
    this.assignedSrc = value;
    loadedImageUrls.push(value);
    queueMicrotask((): void => {
      if (failNextSvgImageLoad) {
        this.onerror?.(new Error('load failed'));
      } else {
        this.onload?.();
      }
    });
  }

  public get src(): string {
    return this.assignedSrc;
  }
}

const CAMERA_TRANSFORM = 'translate(120 -40) scale(2.5)';
const LEGEND_TRANSFORM = 'translate(64 820)';
const WRAPPED_OFFSET_TRANSFORM = 'translate(1080 0)';

interface FakeSource {
  source: HTMLElement;
  sourceElement: FakeElement;
  sourceSvg: FakeElement;
  camera: FakeElement;
  countries: FakeElement;
  legend: FakeElement;
  sourcePath: FakeElement;
  wrappedPath: FakeElement;
  nonSelectablePath: FakeElement;
  outgoingLayer: FakeElement;
}

function createSource(): FakeSource {
  const sourceElement = new FakeElement('DIV', true);
  sourceElement.setAttribute('class', 'map-export-source');
  const svg = new FakeElement('SVG');
  svg.setAttribute('viewBox', '10 20 30 40');
  svg.setAttribute('class', 'map-canvas focused');

  const camera = new FakeElement('G');
  camera.setAttribute('data-layer', 'camera');
  camera.setAttribute('transform', CAMERA_TRANSFORM);

  const outgoingLayer = new FakeElement('G');
  outgoingLayer.setAttribute('data-layer', 'outgoing-scenes');
  outgoingLayer.setAttribute('aria-hidden', 'true');
  const outgoingScene = new FakeElement('G');
  outgoingScene.setAttribute('data-layer', 'outgoing-scene');
  const outgoingPath = new FakeElement('PATH');
  outgoingPath.setAttribute('class', 'outgoing-scene-path');
  outgoingScene.appendChild(outgoingPath);
  outgoingLayer.appendChild(outgoingScene);
  camera.appendChild(outgoingLayer);

  const countries = new FakeElement('G');
  countries.setAttribute('data-layer', 'countries');
  countries.setAttribute('role', 'listbox');
  countries.setAttribute('aria-label', 'Map, Modern');
  countries.setAttribute('aria-multiselectable', 'true');

  const sourcePath = new FakeElement('PATH');
  sourcePath.setAttribute(
    'class',
    'scene-path country-path selected hovered focused is-selected is-hovered is-focused',
  );
  sourcePath.setAttribute('id', 'country-FR');
  sourcePath.setAttribute('d', 'M0 0 L10 0 L10 10 Z');
  sourcePath.setAttribute('fill', '#DC2626');
  sourcePath.setAttribute('stroke', SOURCE_STROKE_SENTINEL);
  sourcePath.setAttribute('stroke-width', '3');
  sourcePath.setAttribute('data-path-kind', 'logical');
  sourcePath.setAttribute('data-country-id', 'FR');
  sourcePath.setAttribute('role', 'option');
  sourcePath.setAttribute('aria-selected', 'true');
  sourcePath.setAttribute('aria-label', 'France, current color #DC2626');
  sourcePath.setAttribute('focusable', 'true');
  sourcePath.setAttribute('tabindex', '0');
  sourcePath.setAttribute('data-selected', 'true');
  const pathTitle = new FakeElement('TITLE');
  pathTitle.setAttribute('data-label', 'France, #DC2626');
  sourcePath.appendChild(pathTitle);

  // The Pacific/date-line repeat of the same selected country: visually
  // required, but it must not carry duplicate accessibility semantics or the
  // selection border treatment into the PNG.
  const wrappedPath = new FakeElement('PATH');
  wrappedPath.setAttribute('class', 'scene-path country-path--decorative selected');
  wrappedPath.setAttribute('d', 'M0 0 L10 0 L10 10 Z');
  wrappedPath.setAttribute('fill', '#DC2626');
  wrappedPath.setAttribute('stroke', SOURCE_STROKE_SENTINEL);
  wrappedPath.setAttribute('stroke-width', '2');
  wrappedPath.setAttribute('transform', WRAPPED_OFFSET_TRANSFORM);
  wrappedPath.setAttribute('data-path-kind', 'decorative');
  wrappedPath.setAttribute('aria-hidden', 'true');
  wrappedPath.setAttribute('focusable', 'false');
  wrappedPath.setAttribute('tabindex', '-1');

  const nonSelectablePath = new FakeElement('PATH');
  nonSelectablePath.setAttribute('class', 'scene-path map-unit-path');
  nonSelectablePath.setAttribute('d', 'M20 20 L30 20 L30 30 Z');
  nonSelectablePath.setAttribute('fill', '#E5E7EB');
  nonSelectablePath.setAttribute('vector-effect', 'non-scaling-stroke');
  nonSelectablePath.setAttribute('data-path-kind', 'decorative');
  nonSelectablePath.setAttribute('aria-hidden', 'true');

  countries.appendChild(sourcePath);
  countries.appendChild(wrappedPath);
  countries.appendChild(nonSelectablePath);
  camera.appendChild(countries);

  /*
   * 04-09's two camera-inside layers, both in the fixture because both are new
   * routes into (and out of) the PNG and "by construction" is not evidence.
   *
   * The MESH must SURVIVE with its own stroke. It carries neither `scene-path`
   * nor `country-path`, so the exporter's stroke normaliser - which resolves
   * the COASTLINE contract - must not touch it. The sentinel width below is
   * deliberately NOT the coastline width the same fixture declares, so a
   * normaliser that started matching it would be caught on the number.
   */
  const borders = new FakeElement('G');
  borders.setAttribute('data-layer', 'borders');
  borders.setAttribute('aria-hidden', 'true');
  borders.setAttribute('pointer-events', 'none');
  borders.setAttribute('fill', 'none');
  const meshPath = new FakeElement('PATH');
  meshPath.setAttribute('class', 'border-mesh-path');
  meshPath.setAttribute('d', 'M40 40 L60 60');
  meshPath.setAttribute('stroke', MESH_STROKE_SENTINEL);
  meshPath.setAttribute('stroke-width', MESH_STROKE_WIDTH_SENTINEL);
  meshPath.setAttribute('vector-effect', 'non-scaling-stroke');
  borders.appendChild(meshPath);
  camera.appendChild(borders);

  /*
   * The HIGHLIGHT layer must be GONE. It is the selected country's outline, so
   * if the sanitizer ever stopped removing `data-editor-only` wholesale this is
   * the element that would ship a 2.5-unit selection ring into a creator's
   * published image.
   */
  const highlight = new FakeElement('G');
  highlight.setAttribute('data-layer', 'highlight');
  highlight.setAttribute('data-editor-only', 'true');
  highlight.setAttribute('aria-hidden', 'true');
  highlight.setAttribute('pointer-events', 'none');
  highlight.setAttribute('fill', 'none');
  const highlightPath = new FakeElement('PATH');
  highlightPath.setAttribute(
    'class',
    'map-highlight-path map-highlight-path--selected',
  );
  highlightPath.setAttribute('d', 'M0 0 L10 0 L10 10 Z');
  highlightPath.setAttribute('stroke-width', HIGHLIGHT_SELECTED_WIDTH);
  highlightPath.setAttribute('vector-effect', 'non-scaling-stroke');
  highlight.appendChild(highlightPath);
  camera.appendChild(highlight);

  /*
   * D4-03's water layer, a SIBLING of the camera and the first painted child
   * (`04-UI-SPEC.md` section 6.5). It is in this fixture so the sanitizer is
   * proven not to strip it or its inline `fill` - the failure mode is a
   * silently white ocean in the download while the editor looks correct.
   */
  const surface = new FakeElement('RECT');
  surface.setAttribute('data-layer', 'surface');
  surface.setAttribute('x', '0');
  surface.setAttribute('y', '0');
  surface.setAttribute('width', '1080');
  surface.setAttribute('height', '1080');
  surface.setAttribute('fill', SURFACE_FILL_SENTINEL);
  svg.appendChild(surface);

  /*
   * 04-10 / D4-16. The band gradients, and the ONE thing that keeps them alive:
   * the rects below reference them by `fill="url(#...)"`, which is exactly what
   * `collectReferencedIds` scans for. Strip the `id` and the `<defs>` subtree is
   * still in the clone but resolves to NOTHING - a dangling reference and a PNG
   * that silently lost its band while the editor looks correct.
   */
  const paintDefs = new FakeElement('DEFS');
  paintDefs.setAttribute('data-layer', 'paint');
  ([
    [BAND_TOP_GRADIENT_ID, '0', '1'],
    [BAND_BOTTOM_GRADIENT_ID, '1', '0'],
  ] as ReadonlyArray<readonly [string, string, string]>).forEach(
    ([gradientId, y1, y2]): void => {
      const gradient = new FakeElement('LINEARGRADIENT');
      gradient.setAttribute('id', gradientId);
      gradient.setAttribute('x1', '0');
      gradient.setAttribute('y1', y1);
      gradient.setAttribute('x2', '0');
      gradient.setAttribute('y2', y2);
      ([
        ['0%', '1'],
        ['100%', '0'],
      ] as ReadonlyArray<readonly [string, string]>).forEach(
        ([offset, opacity]): void => {
          const stop = new FakeElement('STOP');
          stop.setAttribute('offset', offset);
          // INLINE LITERALS, never a `var()`: the isolated export document sees
          // no host stylesheet, so a token here renders as nothing at all.
          stop.setAttribute('stop-color', BAND_STOP_COLOR_SENTINEL);
          stop.setAttribute('stop-opacity', opacity);
          gradient.appendChild(stop);
        },
      );
      paintDefs.appendChild(gradient);
    },
  );
  svg.appendChild(paintDefs);
  svg.appendChild(camera);

  // The bands themselves: OUTSIDE the camera, before the legend (U-8).
  const bands = new FakeElement('G');
  bands.setAttribute('data-layer', 'bands');
  bands.setAttribute('aria-hidden', 'true');
  bands.setAttribute('pointer-events', 'none');
  ([
    ['top', '0', BAND_TOP_GRADIENT_ID],
    ['bottom', '960', BAND_BOTTOM_GRADIENT_ID],
  ] as ReadonlyArray<readonly [string, string, string]>).forEach(
    ([edge, y, gradientId]): void => {
      const bandRect = new FakeElement('RECT');
      bandRect.setAttribute('data-band', edge);
      bandRect.setAttribute('x', '0');
      bandRect.setAttribute('y', y);
      bandRect.setAttribute('width', '1080');
      bandRect.setAttribute('height', '120');
      bandRect.setAttribute('fill', `url(#${gradientId})`);
      bands.appendChild(bandRect);
    },
  );
  svg.appendChild(bands);

  const legend = new FakeElement('G');
  legend.setAttribute('data-layer', 'legend');
  legend.setAttribute('transform', LEGEND_TRANSFORM);
  const legendText = new FakeElement('TEXT');
  legendText.setAttribute('data-label', 'Visited France');
  legendText.setAttribute('fill', '#111827');
  // Mirrors LegendOverlay's rendered declaration: the composition names the
  // family, and the seam collects what the composition names (D-34a).
  legendText.setAttribute('font-family', LEGEND_FONT_FAMILY_DECLARATION);
  const editorHitArea = new FakeElement('RECT');
  editorHitArea.setAttribute('data-editor-only', 'true');
  editorHitArea.setAttribute('role', 'button');
  editorHitArea.setAttribute('aria-label', 'Move legend');
  legend.appendChild(legendText);
  legend.appendChild(editorHitArea);
  svg.appendChild(legend);

  /*
   * A7's resize affordances. They must be GONE, and the line carries an INLINE
   * `stroke` so that absence is a claim about paint rather than about markup:
   * `04-09` measured that an editor-only element painted only from a stylesheet
   * survives the clone, renders nothing in the isolated document, and leaves
   * its removal gate measuring zero either way.
   */
  const bandHandles = new FakeElement('G');
  bandHandles.setAttribute('data-layer', 'band-handles');
  bandHandles.setAttribute('data-editor-only', 'true');
  const handleLine = new FakeElement('LINE');
  handleLine.setAttribute('stroke', BAND_HANDLE_STROKE_SENTINEL);
  handleLine.setAttribute('stroke-width', '3');
  const handleHitArea = new FakeElement('RECT');
  handleHitArea.setAttribute('role', 'slider');
  handleHitArea.setAttribute('tabindex', '0');
  handleHitArea.setAttribute('aria-label', 'Top band');
  handleHitArea.setAttribute('fill', 'transparent');
  bandHandles.appendChild(handleLine);
  bandHandles.appendChild(handleHitArea);
  svg.appendChild(bandHandles);

  sourceElement.appendChild(svg);

  return {
    source: sourceElement as unknown as HTMLElement,
    sourceElement,
    sourceSvg: svg,
    camera,
    countries,
    legend,
    sourcePath,
    wrappedPath,
    nonSelectablePath,
    outgoingLayer,
  };
}

function getCreatedElement(documentMock: FakeDocument, tagName: string): FakeElement {
  const element = documentMock.createdElements.find(
    (candidate: FakeElement): boolean => candidate.tagName === tagName,
  );
  if (!element) {
    throw new Error(`Expected ${tagName} to be created`);
  }
  return element;
}

function getSerializedClone(): FakeElement {
  const clone = serializedClones[0];
  if (clone === undefined) {
    throw new Error('No clone was serialised for rasterisation.');
  }
  return clone;
}

describe('createExportFilename', (): void => {
  const date = new Date('2026-07-21T23:59:59.000Z');

  it('uses the exact UTC date filename contract', (): void => {
    expect(createExportFilename(date)).toBe('CountriesIRL_2026-07-21.png');
  });

  it('prefixes a sanitized composition name', (): void => {
    expect(createExportFilename(date, 'My Europe Trip')).toBe(
      'My_Europe_Trip_2026-07-21.png',
    );
  });

  it('removes unsupported filesystem characters and collapses underscores', (): void => {
    expect(createExportFilename(date, '../My:Map*?"<>|\\ / Trip')).toBe(
      'MyMap_Trip_2026-07-21.png',
    );
  });

  it('caps the name token at 60 characters without a trailing separator', (): void => {
    const longName = `${'a'.repeat(59)} tail`;

    const filename = createExportFilename(date, longName);

    expect(filename).toBe(`${'a'.repeat(59)}_2026-07-21.png`);
    expect(filename.split('_2026')[0]).toHaveLength(59);
  });

  it('falls back to the unnamed contract when nothing survives sanitization', (): void => {
    expect(createExportFilename(date, '///')).toBe(
      'CountriesIRL_2026-07-21.png',
    );
  });
});

describe('the generalised font-embedding seam (D-34a)', (): void => {
  beforeEach((): void => {
    vi.stubGlobal('document', new FakeDocument());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, EXPORT_FONT_FACE_SUPPRESSION_FLAG);
  });

  it('collects the distinct named families the composition references', (): void => {
    const svg = new FakeElement('SVG');
    const inter = new FakeElement('TEXT');
    inter.setAttribute('font-family', LEGEND_FONT_FAMILY_DECLARATION);
    const duplicate = new FakeElement('TEXT');
    duplicate.setAttribute('font-family', "'Inter', serif");
    const other = new FakeElement('TEXT');
    other.style.fontFamily = 'Fraunces, system-ui';
    svg.appendChild(inter);
    svg.appendChild(duplicate);
    svg.appendChild(other);

    expect(
      collectCompositionFonts(svg as unknown as SVGSVGElement),
    ).toEqual([
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Fraunces',
    ]);
  });

  it('embeds the registered families and nothing else', (): void => {
    const svg = new FakeElement('SVG', true);
    svg.appendChild(new FakeElement('G'));

    injectExportFontFace(svg as unknown as SVGSVGElement, [
      'Inter',
      'Fraunces',
    ]);

    const style = svg.firstChild;
    expect(style?.tagName).toBe('STYLE');
    const css = style?.textContent ?? '';
    expect(css).toMatch(/@font-face/u);
    expect(css).toMatch(/font-family:'Inter'/u);
    expect(css).toMatch(/src:\s*url\(data:font\/woff2;base64,/u);
    // Only registered families are embedded; an unregistered one adds nothing.
    expect(css).not.toMatch(/Fraunces/u);
  });

  it('emits TWO unicode-range-scoped faces for the ONE Inter family (04-04)', (): void => {
    /*
     * Google Fonts splits Inter by unicode-range, so latin and latin-ext are
     * two vendored files and one family emits two faces. Both halves matter
     * and each is asserted separately:
     *
     *  - the COUNT is asserted against the literal 2, never against something
     *    derived from the code under test (a derived count is green at zero);
     *  - the two ranges must DIFFER, because a second face carrying the same
     *    range as the first is a no-op that still counts as two.
     */
    const svg = new FakeElement('SVG', true);
    svg.appendChild(new FakeElement('G'));

    injectExportFontFace(svg as unknown as SVGSVGElement, ['Inter']);

    const css = svg.firstChild?.textContent ?? '';
    expect(
      css.match(/@font-face/gu),
      'the injected style does not carry exactly two @font-face rules — ' +
        'latin-ext coverage is missing from the export clone',
    ).toHaveLength(2);
    expect(
      css.match(/font-family:'Inter'/gu),
      'the two faces do not both name Inter, so they are two families ' +
        'rather than one family split by unicode-range',
    ).toHaveLength(2);
    expect(
      css.match(/src:\s*url\(data:font\/woff2;base64,/gu),
      'a face is not carrying inlined woff2 bytes — the isolated export ' +
        'document can issue no request, so an un-inlined face draws nothing',
    ).toHaveLength(2);

    const ranges = [...css.matchAll(/unicode-range:([^;}]+)/gu)].map(
      (match: RegExpMatchArray): string => match[1].trim(),
    );
    expect(
      ranges,
      'a face is missing its unicode-range — without one the two faces ' +
        'collapse to "last declaration wins" instead of dividing the ' +
        'character space',
    ).toHaveLength(2);
    expect(
      ranges[0],
      'both faces carry the SAME unicode-range, so the second one can never ' +
        'be selected and adds bytes for nothing',
    ).not.toBe(ranges[1]);
    // The latin-ext block must actually cover the glyphs it exists for.
    expect(
      ranges.some((range: string): boolean => range.includes('U+0100-02BA')),
      'no face covers U+0100-02BA — the latin-ext diacritics D4-15 is about ' +
        'still fall back mid-string',
    ).toBe(true);
  });

  it('keeps the family registry at one entry — two faces is not two families', (): void => {
    /*
     * The registry is family-to-CSS. One family legitimately emitting two
     * faces must NOT show up here as a second entry: that would mean a second
     * family had been added, which is an owner decision, not a plan's.
     */
    expect(EXPORT_FONT_FACE_BUILDERS.size).toBe(1);
    expect([...EXPORT_FONT_FACE_BUILDERS.keys()]).toStrictEqual(['Inter']);
  });

  it('inserts nothing when no referenced family is registered', (): void => {
    const svg = new FakeElement('SVG', true);
    svg.appendChild(new FakeElement('G'));

    injectExportFontFace(svg as unknown as SVGSVGElement, ['Fraunces']);

    expect(svg.firstChild?.tagName).toBe('G');
  });

  it('honours the test-only suppression flag and never injects under it', (): void => {
    const svg = new FakeElement('SVG', true);
    svg.appendChild(new FakeElement('G'));
    Reflect.set(globalThis, EXPORT_FONT_FACE_SUPPRESSION_FLAG, true);

    injectExportFontFace(svg as unknown as SVGSVGElement, ['Inter']);

    expect(svg.firstChild?.tagName).toBe('G');
  });
});

describe('exportMapPng', (): void => {
  let documentMock: FakeDocument;
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach((): void => {
    documentMock = new FakeDocument();
    createObjectURLMock = vi.fn((): string => 'blob:countriesirl-export');
    revokeObjectURLMock = vi.fn();
    serializedClones.length = 0;
    loadedImageUrls.length = 0;
    failNextSvgImageLoad = false;
    vi.stubGlobal('document', documentMock);
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });
    vi.stubGlobal('XMLSerializer', FakeXMLSerializer);
    vi.stubGlobal('Image', FakeImage);
  });

  afterEach((): void => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, EXPORT_FONT_FACE_SUPPRESSION_FLAG);
  });

  it('serialises the sanitized 540 clone and rasterises it onto a 1080 canvas at scale 2', async (): Promise<void> => {
    const { source, sourceElement, sourcePath } = createSource();

    const result = await exportMapPng(source, new Date('2026-07-21T12:00:00.000Z'));

    expect(result).toEqual({ ok: true, filename: 'CountriesIRL_2026-07-21.png' });

    // The rasterised image is the serialised clone, nothing else.
    expect(serializedClones).toHaveLength(1);
    expect(loadedImageUrls).toHaveLength(1);
    expect(loadedImageUrls[0]?.startsWith('data:image/svg+xml,')).toBe(true);

    // Exactly 1080x1080, painted white first, then the 540 clone at scale 2 -
    // the geometry that keeps `non-scaling-stroke` borders at their contract
    // weight.
    const canvas = documentMock.createdCanvases[0];
    expect(canvas).toBeDefined();
    expect(canvas?.width).toBe(EXPORT_SIZE);
    expect(canvas?.height).toBe(EXPORT_SIZE);
    expect(canvas?.context.fillStyle).toBe('#FFFFFF');
    expect(canvas?.context.fillRectCalls).toEqual([
      [0, 0, EXPORT_SIZE, EXPORT_SIZE],
    ]);
    expect(canvas?.context.scaleCalls).toEqual([[EXPORT_SCALE, EXPORT_SCALE]]);
    expect(canvas?.context.drawImageCalls).toHaveLength(1);
    expect(canvas?.context.drawImageCalls[0]?.slice(1)).toEqual([
      0,
      0,
      EXPORT_FRAME_SIZE,
      EXPORT_FRAME_SIZE,
    ]);

    const clonedSvg = getSerializedClone();
    const capturedFrame = clonedSvg.parentElement;
    expect(capturedFrame?.tagName).toBe('DIV');
    expect(capturedFrame?.getAttribute('aria-hidden')).toBe('true');
    expect(capturedFrame?.style.width).toBe(`${EXPORT_FRAME_SIZE}px`);
    expect(capturedFrame?.style.height).toBe(`${EXPORT_FRAME_SIZE}px`);
    expect(capturedFrame?.style.backgroundColor).toBe('#FFFFFF');
    expect(capturedFrame?.style.colorScheme).toBe('light');

    expect(clonedSvg.getAttribute('viewBox')).toBe('0 0 1080 1080');
    expect(clonedSvg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(clonedSvg.getAttribute('width')).toBe('540');
    expect(clonedSvg.getAttribute('height')).toBe('540');
    expect(clonedSvg.style.colorScheme).toBe('light');

    // The embedded @font-face rides as the clone's FIRST child, so the
    // isolated SVG-as-image document can resolve the legend's typeface.
    const fontStyle = clonedSvg.firstChild;
    expect(fontStyle?.tagName).toBe('STYLE');
    expect(fontStyle?.textContent).toMatch(/@font-face/u);
    expect(fontStyle?.textContent).toMatch(/font-family:'Inter'/u);
    expect(fontStyle?.textContent).toMatch(
      /src:\s*url\(data:font\/woff2;base64,/u,
    );

    const clonedPath = clonedSvg.querySelector('path.country-path');
    expect(clonedPath?.getAttribute('fill')).toBe('#DC2626');
    expect(clonedPath?.getAttribute('stroke')).toBe(DEFAULT_BORDER_COLOR);
    expect(clonedPath?.getAttribute('stroke-width')).toBe('0.75');
    // Pinned: without this the camera's `scale(zoom)` multiplies the border
    // width and the PNG ships fat outlines the screen never showed.
    expect(clonedPath?.getAttribute('vector-effect')).toBe('non-scaling-stroke');
    expect(clonedPath?.getAttribute('class')).toBe('scene-path country-path');
    expect(clonedPath?.getAttribute('d')).toBe('M0 0 L10 0 L10 10 Z');
    expect(clonedPath?.getAttribute('role')).toBeNull();
    expect(clonedPath?.getAttribute('id')).toBeNull();
    expect(clonedPath?.getAttribute('focusable')).toBeNull();
    expect(clonedPath?.getAttribute('aria-selected')).toBeNull();
    expect(clonedPath?.getAttribute('aria-label')).toBeNull();
    expect(clonedPath?.getAttribute('tabindex')).toBeNull();
    expect(clonedPath?.getAttribute('data-selected')).toBeNull();
    expect(clonedPath?.querySelector('title')).toBeNull();

    const clonedCamera = clonedSvg.querySelector('[data-layer="camera"]');
    expect(clonedCamera?.getAttribute('transform')).toBe(CAMERA_TRANSFORM);
    expect(clonedSvg.querySelector('[data-layer="outgoing-scenes"]')).toBeNull();
    expect(clonedSvg.querySelector('[data-layer="outgoing-scene"]')).toBeNull();
    expect(clonedSvg.querySelector('[data-layer="countries"]')?.getAttribute('role')).toBeNull();

    const clonedLegend = clonedSvg.querySelector('[data-layer="legend"]');
    expect(clonedLegend).not.toBeNull();
    expect(clonedLegend?.getAttribute('transform')).toBe(LEGEND_TRANSFORM);
    expect(clonedLegend?.querySelector('TEXT')?.getAttribute('data-label')).toBe(
      'Visited France',
    );
    expect(clonedLegend?.querySelector('TEXT')?.getAttribute('fill')).toBe('#111827');
    expect(clonedLegend?.querySelector('[data-editor-only]')).toBeNull();

    // The leading <style> shifts the camera and legend indices EQUALLY, so
    // camera-before-legend still holds and isPreservedComposition passed.
    const clonedLayers = clonedSvg.children.map(
      (child: FakeElement): string | null => child.getAttribute('data-layer'),
    );
    expect(clonedLayers).toEqual([
      null,
      'surface',
      'paint',
      'camera',
      'bands',
      'legend',
    ]);
    expect(clonedSvg.children[0]?.tagName).toBe('STYLE');

    /*
     * D4-03. The export completing at all is the isPreservedComposition
     * evidence - a refused composition never reaches a clone - but the layer
     * ORDER above is what makes that meaningful: a sibling inserted before the
     * camera shifts both indices equally, so camera-before-legend still holds.
     *
     * And the payload, which is the part a shifted index would not catch: the
     * rect survives sanitization WITH its inline fill. `fill` is not in
     * SEMANTIC_ONLY_ATTRIBUTES, the rect carries no `data-editor-only`, it is
     * not `title,desc,metadata`, and it is not a `path.scene-path`, so none of
     * the sanitizer's four removal passes touch it.
     */
    const clonedSurface = clonedSvg.querySelector('[data-layer="surface"]');
    expect(
      clonedSurface,
      'the surface layer was stripped from the clone; the PNG would ship a ' +
        'white ocean while the editor showed the creator colour.',
    ).not.toBeNull();
    expect(clonedSurface?.getAttribute('fill')).toBe(SURFACE_FILL_SENTINEL);
    expect(clonedSurface?.getAttribute('width')).toBe('1080');
    expect(clonedSurface?.getAttribute('height')).toBe('1080');

    const anchor = getCreatedElement(documentMock, 'A');
    expect(anchor.getAttribute('href')).toBe('blob:countriesirl-export');
    expect(anchor.getAttribute('download')).toBe('CountriesIRL_2026-07-21.png');
    expect(anchor.wasClicked).toBe(true);
    expect(anchor.wasRemoved).toBe(true);
    expect(capturedFrame?.wasRemoved).toBe(true);
    expect(revokeObjectURLMock).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:countriesirl-export');

    expect(sourceElement.isConnected).toBe(true);
    expect(sourcePath.getAttribute('class')).toContain('selected');
    expect(sourcePath.getAttribute('stroke')).toBe(SOURCE_STROKE_SENTINEL);
  });

  it('suppresses the font embedding under the test-only flag and still exports', async (): Promise<void> => {
    const { source } = createSource();
    Reflect.set(globalThis, EXPORT_FONT_FACE_SUPPRESSION_FLAG, true);

    await expect(
      exportMapPng(source, new Date('2026-07-21T12:00:00.000Z')),
    ).resolves.toEqual({ ok: true, filename: 'CountriesIRL_2026-07-21.png' });

    const clonedSvg = getSerializedClone();
    expect(clonedSvg.querySelector('STYLE')).toBeNull();
    // With no injected <style>, the water layer is the SVG's first child - it
    // is the first thing painted, which is what makes it the surface.
    expect(clonedSvg.firstChild?.getAttribute('data-layer')).toBe('surface');
  });

  it('keeps the ids that paint references and strips the rest', async (): Promise<void> => {
    const { source, sourceSvg, legend } = createSource();

    const defs = new FakeElement('DEFS');
    const gradient = new FakeElement('LINEARGRADIENT');
    gradient.setAttribute('id', 'legend-gradient');
    const clip = new FakeElement('CLIPPATH');
    clip.setAttribute('id', 'legend-clip');
    const symbol = new FakeElement('G');
    symbol.setAttribute('id', 'legend-symbol');
    const unusedGradient = new FakeElement('LINEARGRADIENT');
    unusedGradient.setAttribute('id', 'unused-gradient');
    defs.appendChild(gradient);
    defs.appendChild(clip);
    defs.appendChild(symbol);
    defs.appendChild(unusedGradient);
    sourceSvg.appendChild(defs);

    const swatch = new FakeElement('RECT');
    // Referenced by paint, so the id it points at is geometry, not semantics.
    swatch.setAttribute('id', 'legend-swatch');
    swatch.setAttribute('fill', 'url(#legend-gradient)');
    swatch.setAttribute('clip-path', 'url(#legend-clip)');
    const swatchUse = new FakeElement('USE');
    swatchUse.setAttribute('href', '#legend-symbol');
    legend.appendChild(swatch);
    legend.appendChild(swatchUse);

    await expect(
      exportMapPng(source, new Date('2026-07-21T12:00:00.000Z')),
    ).resolves.toEqual({ ok: true, filename: 'CountriesIRL_2026-07-21.png' });

    const clonedSvg = getSerializedClone();

    expect(
      clonedSvg.querySelector('[id="legend-gradient"]')?.getAttribute('id'),
    ).toBe('legend-gradient');
    expect(
      clonedSvg.querySelector('[id="legend-clip"]')?.getAttribute('id'),
    ).toBe('legend-clip');
    expect(
      clonedSvg.querySelector('[id="legend-symbol"]')?.getAttribute('id'),
    ).toBe('legend-symbol');
    // Nothing points at these two, so they stay pure editor semantics.
    expect(clonedSvg.querySelector('[id="unused-gradient"]')).toBeNull();
    expect(clonedSvg.querySelector('[id="legend-swatch"]')).toBeNull();
    expect(clonedSvg.querySelector('path.country-path')?.getAttribute('id')).toBeNull();

    // Addressed by its own paint reference, not by tag: `RECT` alone now also
    // matches the water surface, and a positional locator here would silently
    // start asserting about the wrong element.
    const clonedSwatch = clonedSvg.querySelector('[clip-path="url(#legend-clip)"]');
    expect(clonedSwatch?.getAttribute('fill')).toBe('url(#legend-gradient)');
    expect(clonedSwatch?.getAttribute('clip-path')).toBe('url(#legend-clip)');
    expect(clonedSvg.querySelector('USE')?.getAttribute('href')).toBe(
      '#legend-symbol',
    );

    // No surviving reference may dangle: a `url(#…)` whose target lost its id
    // renders on screen and disappears from the PNG.
    const clonedElements = [clonedSvg, ...clonedSvg.querySelectorAll('*')];
    const survivingIds = new Set(
      clonedElements
        .map((element: FakeElement): string | null => element.getAttribute('id'))
        .filter((id: string | null): id is string => id !== null),
    );
    const references = clonedElements.flatMap((element: FakeElement): string[] =>
      element.getAttributeNames().flatMap((name: string): string[] => {
        const value = element.getAttribute(name) ?? '';
        const urlReferences = [...value.matchAll(/url\(\s*['"]?#([^'")\s]+)/gu)]
          .map((match): string => match[1] ?? '');
        return name === 'href' && value.startsWith('#')
          ? [...urlReferences, value.slice(1)]
          : urlReferences;
      }),
    );
    expect(references.length).toBeGreaterThan(0);
    expect(
      references.filter((id: string): boolean => !survivingIds.has(id)),
    ).toEqual([]);
  });

  it('keeps every visible wrapped path and strips only its duplicate semantics', async (): Promise<void> => {
    const { source } = createSource();

    await expect(
      exportMapPng(source, new Date('2026-07-21T12:00:00.000Z')),
    ).resolves.toEqual({ ok: true, filename: 'CountriesIRL_2026-07-21.png' });

    const clonedSvg = getSerializedClone();
    const clonedPaths = clonedSvg.querySelectorAll(
      'path.scene-path,path.country-path',
    );

    expect(clonedPaths).toHaveLength(3);
    expect(
      clonedPaths.map((path: FakeElement): string | null =>
        path.getAttribute('data-path-kind'),
      ),
    ).toEqual(['logical', 'decorative', 'decorative']);
    /*
     * 04-09: the mesh is a FOURTH path in the clone and it is not a scene path.
     * Asserted here as well as in its own block so this test's narrowing above
     * is visibly a narrowing rather than a shrinking subject.
     */
    expect(clonedSvg.querySelectorAll('path')).toHaveLength(4);

    const wrapped = clonedPaths.filter(
      (path: FakeElement): boolean =>
        path.getAttribute('data-path-kind') === 'decorative',
    );
    wrapped.forEach((path: FakeElement): void => {
      expect(path.getAttribute('d')).not.toBeNull();
      expect(path.getAttribute('stroke')).toBe(DEFAULT_BORDER_COLOR);
      expect(path.getAttribute('stroke-width')).toBe('0.75');
      expect(path.getAttribute('vector-effect')).toBe('non-scaling-stroke');
      expect(path.getAttribute('aria-hidden')).toBeNull();
      expect(path.getAttribute('focusable')).toBeNull();
      expect(path.getAttribute('tabindex')).toBeNull();
      expect(path.getAttribute('role')).toBeNull();
    });
    expect(wrapped[0]?.getAttribute('transform')).toBe(WRAPPED_OFFSET_TRANSFORM);
    expect(wrapped[0]?.getAttribute('class')).toBe(
      'scene-path country-path--decorative',
    );
    expect(wrapped[0]?.getAttribute('fill')).toBe('#DC2626');
    expect(wrapped[1]?.getAttribute('fill')).toBe('#E5E7EB');
  });

  it('downloads a named composition under its sanitized filename', async (): Promise<void> => {
    const { source } = createSource();

    await expect(
      exportMapPng(source, new Date('2026-07-21T12:00:00.000Z'), 'Baltic  Tour!'),
    ).resolves.toEqual({ ok: true, filename: 'Baltic_Tour_2026-07-21.png' });

    expect(getCreatedElement(documentMock, 'A').getAttribute('download')).toBe(
      'Baltic_Tour_2026-07-21.png',
    );
  });

  it('leaves the live composition untouched after sanitizing the clone', async (): Promise<void> => {
    const { source, sourceSvg, sourcePath, wrappedPath, camera, countries, outgoingLayer } =
      createSource();

    await exportMapPng(source, new Date('2026-07-21T12:00:00.000Z'));

    expect(sourcePath.getAttribute('role')).toBe('option');
    expect(sourcePath.getAttribute('tabindex')).toBe('0');
    expect(sourcePath.getAttribute('stroke')).toBe(SOURCE_STROKE_SENTINEL);
    expect(sourcePath.querySelector('title')).not.toBeNull();
    expect(wrappedPath.getAttribute('aria-hidden')).toBe('true');
    expect(camera.getAttribute('transform')).toBe(CAMERA_TRANSFORM);
    expect(countries.getAttribute('role')).toBe('listbox');
    expect(outgoingLayer.wasRemoved).toBe(false);
    expect(outgoingLayer.parentElement).toBe(camera);
    // The base64 @font-face lives only in the throwaway clone, never in the
    // editor's live SVG.
    expect(sourceSvg.querySelector('STYLE')).toBeNull();
  });

  it('refuses a disconnected source before any work', async (): Promise<void> => {
    const { source, sourceElement } = createSource();
    sourceElement.remove();
    expect(sourceElement.isConnected).toBe(false);

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'source-not-found',
    });

    expect(serializedClones).toHaveLength(0);
    expect(documentMock.createdElements).toEqual([]);
  });

  it('refuses a composition whose legend renders as a sibling overlay', async (): Promise<void> => {
    const { source, sourceElement, legend } = createSource();
    legend.remove();
    sourceElement.appendChild(legend);

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'invalid-composition',
    });

    expect(serializedClones).toHaveLength(0);
  });

  it('refuses a legend hoisted above the export source entirely', async (): Promise<void> => {
    /*
     * The residual hole in the structural gate: a refactor that lifts
     * `<LegendOverlay/>` up to App's `workspace__map` div leaves 0 legends in
     * the export source and 0 in the SVG, so the "never had a legend" branch
     * used to accept it and ship a legend-less PNG under a success toast.
     */
    const { source, legend } = createSource();
    legend.remove();
    documentMock.body.appendChild(legend);

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'invalid-composition',
    });

    expect(serializedClones).toHaveLength(0);
  });

  it('still exports a composition that never had a legend', async (): Promise<void> => {
    // An uncolored map has no legend entries, so a legend-less composition is
    // a legitimate white square - never a refusal.
    const { source, legend } = createSource();
    legend.remove();

    await expect(
      exportMapPng(source, new Date('2026-07-21T12:00:00.000Z')),
    ).resolves.toEqual({ ok: true, filename: 'CountriesIRL_2026-07-21.png' });

    expect(serializedClones).toHaveLength(1);
  });

  it('refuses a composition carrying more than one legend group', async (): Promise<void> => {
    const { source, sourceSvg } = createSource();
    const duplicateLegend = new FakeElement('G');
    duplicateLegend.setAttribute('data-layer', 'legend');
    sourceSvg.appendChild(duplicateLegend);

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'invalid-composition',
    });

    expect(serializedClones).toHaveLength(0);
  });

  it('refuses a composition whose legend precedes the camera group', async (): Promise<void> => {
    const { source, sourceSvg, camera } = createSource();
    camera.remove();
    sourceSvg.appendChild(camera);

    // The water surface, the paint defs, and the bands are permitted siblings
    // and take no part in the order rule; what is refused is legend BEFORE
    // camera. `04-10` added three of those siblings, so the list is restated
    // rather than loosened - a `toContain` here would stop describing the very
    // arrangement the refusal is about.
    expect(
      sourceSvg.children.map(
        (child: FakeElement): string | null => child.getAttribute('data-layer'),
      ),
    ).toEqual([
      'surface',
      'paint',
      'bands',
      'legend',
      'band-handles',
      'camera',
    ]);

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'invalid-composition',
    });

    expect(serializedClones).toHaveLength(0);
    expect(getCreatedElement(documentMock, 'DIV').wasRemoved).toBe(true);
  });

  it('keeps the connected download live through the bounded browser handoff', async (): Promise<void> => {
    vi.useFakeTimers();
    const { source } = createSource();
    let didResolve = false;

    const exportPromise = exportMapPng(
      source,
      new Date('2026-07-21T12:00:00.000Z'),
    );
    void exportPromise.then((): void => {
      didResolve = true;
    });
    // Flush the microtask chain (image load, blob encoding) up to the timer.
    await vi.advanceTimersByTimeAsync(0);

    const frame = getCreatedElement(documentMock, 'DIV');
    const anchor = getCreatedElement(documentMock, 'A');
    expect(anchor.wasConnectedWhenClicked).toBe(true);
    expect(anchor.isConnected).toBe(true);
    expect(anchor.wasRemoved).toBe(false);
    expect(frame.isConnected).toBe(true);
    expect(revokeObjectURLMock).not.toHaveBeenCalled();
    expect(didResolve).toBe(false);
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(DOWNLOAD_HANDOFF_DELAY_MS - 1);

    expect(anchor.isConnected).toBe(true);
    expect(anchor.wasRemoved).toBe(false);
    expect(frame.isConnected).toBe(true);
    expect(revokeObjectURLMock).not.toHaveBeenCalled();
    expect(didResolve).toBe(false);

    await vi.advanceTimersByTimeAsync(1);

    await expect(exportPromise).resolves.toEqual({
      ok: true,
      filename: 'CountriesIRL_2026-07-21.png',
    });
    expect(didResolve).toBe(true);
    expect(anchor.isConnected).toBe(false);
    expect(anchor.removeCallCount).toBe(1);
    expect(frame.isConnected).toBe(false);
    expect(frame.removeCallCount).toBe(1);
    expect(revokeObjectURLMock).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:countriesirl-export');
  });

  it('fails as capture-failed when the SVG image cannot load, and cleans the frame', async (): Promise<void> => {
    const { source } = createSource();
    failNextSvgImageLoad = true;

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'capture-failed',
    });

    expect(documentMock.createdCanvases).toHaveLength(0);
    expect(createObjectURLMock).not.toHaveBeenCalled();
    expect(getCreatedElement(documentMock, 'DIV').wasRemoved).toBe(true);
  });

  it('fails as capture-failed when the 2D context is blocked', async (): Promise<void> => {
    const { source } = createSource();
    documentMock.canvasOptions = { contextUnavailable: true };

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'capture-failed',
    });

    expect(createObjectURLMock).not.toHaveBeenCalled();
    expect(getCreatedElement(documentMock, 'DIV').wasRemoved).toBe(true);
  });

  it('fails before encoding when the canvas cannot hold exactly 1080 square', async (): Promise<void> => {
    // A browser that clamps an oversized canvas ignores the size assignment;
    // the read-back guard is what stops a wrong-size PNG from encoding.
    const { source } = createSource();
    documentMock.canvasOptions = {
      lockDimensionsTo: { width: EXPORT_SIZE, height: EXPORT_SIZE - 1 },
    };

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'invalid-dimensions',
    });

    const canvas = documentMock.createdCanvases[0];
    expect(canvas?.toBlob).not.toHaveBeenCalled();
    expect(createObjectURLMock).not.toHaveBeenCalled();
    expect(getCreatedElement(documentMock, 'DIV').wasRemoved).toBe(true);
  });

  it('surfaces a null PNG blob and removes the temporary frame', async (): Promise<void> => {
    const { source } = createSource();
    documentMock.canvasOptions = { blob: null };

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'encoding-failed',
    });

    expect(createObjectURLMock).not.toHaveBeenCalled();
    expect(getCreatedElement(documentMock, 'DIV').wasRemoved).toBe(true);
  });

  it('cleans immediately without a handoff wait if the connected click fails', async (): Promise<void> => {
    vi.useFakeTimers();
    const { source } = createSource();
    documentMock.nextAnchorClickError = new Error('download blocked');

    const exportPromise = exportMapPng(source);
    await vi.advanceTimersByTimeAsync(0);

    await expect(exportPromise).resolves.toEqual({
      ok: false,
      reason: 'encoding-failed',
    });

    const frame = getCreatedElement(documentMock, 'DIV');
    const anchor = getCreatedElement(documentMock, 'A');
    expect(anchor.wasConnectedWhenClicked).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(frame.removeCallCount).toBe(1);
    expect(anchor.removeCallCount).toBe(1);
    expect(revokeObjectURLMock).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:countriesirl-export');
  });

  it('returns source-not-found without capture when the connected source has no SVG', async (): Promise<void> => {
    const source = new FakeElement('DIV', true) as unknown as HTMLElement;

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'source-not-found',
    });

    expect(serializedClones).toHaveLength(0);
    expect(documentMock.createdElements).toEqual([]);
  });

  it('rejects a source with duplicate canonical SVG roots', async (): Promise<void> => {
    const source = new FakeElement('DIV', true);
    source.appendChild(new FakeElement('SVG'));
    source.appendChild(new FakeElement('SVG'));

    await expect(
      exportMapPng(source as unknown as HTMLElement),
    ).resolves.toEqual({
      ok: false,
      reason: 'source-not-found',
    });

    expect(serializedClones).toHaveLength(0);
  });

/* ------------------------------------------------------------------ *
 * 04-08 - the REPLACED stroke normalisation (D4-08)
 * ------------------------------------------------------------------ */

/**
 * Until `04-08` this loop hard-set `#000000` / `0.75` on every scene path, so
 * the exporter re-painted a black border over whatever the editor had rendered
 * and a quiet coastline was unreachable in the PNG.
 *
 * It was REPLACED, not deleted. Every test below asserts BOTH halves: the
 * composition's own weight reaches the clone, AND the three neutralisations
 * plus the `non-scaling-stroke` pin that the loop has always existed for
 * survive. Deleting the loop would pass the first half and fail the second,
 * which is exactly the regression this block is here to make impossible.
 */
function createSourceDeclaring(
  weight: string | null,
  borderColor: string | null,
): ReturnType<typeof createSource> {
  const fake = createSource();
  if (weight !== null) {
    fake.sourceSvg.setAttribute(EXPORT_STROKE_WEIGHT_ATTRIBUTE, weight);
  }
  if (borderColor !== null) {
    fake.sourceSvg.setAttribute(EXPORT_BORDER_COLOR_ATTRIBUTE, borderColor);
  }
  return fake;
}

/**
 * The paths the exporter's stroke normaliser claims - and ONLY those. Since
 * `04-09` the clone also carries `path.border-mesh-path`, which the normaliser
 * must leave alone: this helper narrows to the normaliser's own selector so a
 * mesh silently joining it shows up as a MISSING mesh below rather than as a
 * quietly larger loop here.
 */
function clonedScenePaths(): FakeElement[] {
  return getSerializedClone().querySelectorAll(
    'path.scene-path,path.country-path',
  );
}

function clonedMeshPaths(): FakeElement[] {
  return getSerializedClone().querySelectorAll('path.border-mesh-path');
}

function expectInteractionStateNeutralised(paths: FakeElement[]): void {
  expect(
    paths.length,
    'a zero-length loop passes every assertion inside it.',
  ).toBe(3);
  paths.forEach((path: FakeElement): void => {
    // The recorded fix for "borders looked super thick in the download only".
    expect(path.getAttribute('vector-effect')).toBe('non-scaling-stroke');
    expect(Reflect.get(path.style, 'vectorEffect')).toBe('non-scaling-stroke');
    // The three neutralisations: focus ring, editor transition, editor filter.
    expect(Reflect.get(path.style, 'strokeDasharray')).toBe('none');
    expect(Reflect.get(path.style, 'transition')).toBe('none');
    expect(Reflect.get(path.style, 'filter')).toBe('none');
    // No selection class survives, so no wrapped repeat can be re-selected by
    // a stylesheet the isolated document will never see anyway.
    expect(path.getAttribute('class')).not.toMatch(/\bselected\b/u);
  });
}

describe('sanitizeExportClone honours the composition border contract', (): void => {
  it('omits the stroke entirely at `none`, on every scene path', async (): Promise<void> => {
    const { source } = createSourceDeclaring('none', DEFAULT_BORDER_COLOR);

    await expect(exportMapPng(source)).resolves.toMatchObject({ ok: true });

    const paths = clonedScenePaths();
    paths.forEach((path: FakeElement): void => {
      /*
       * ABSENCE, not a zero. SVG's initial `stroke` is `none`, so a removed
       * attribute is what actually draws nothing in the isolated document;
       * `stroke-width="0"` would satisfy a numeric assertion while leaving the
       * property present for a later rule to resurrect.
       */
      expect(
        path.getAttribute('stroke'),
        'a stroke attribute survived at coastlineWeight `none`, so the ' +
          'exporter is still painting a border the creator turned off.',
      ).toBeNull();
      expect(path.getAttribute('stroke-width')).toBeNull();
      expect(Reflect.get(path.style, 'stroke')).toBe('');
      expect(Reflect.get(path.style, 'strokeWidth')).toBe('');
    });
    // ...and the loop still did its actual job.
    expectInteractionStateNeutralised(paths);
  });

  it('passes a declared weight through from the one units table', async (): Promise<void> => {
    const { source } = createSourceDeclaring('medium', DEFAULT_BORDER_COLOR);

    await expect(exportMapPng(source)).resolves.toMatchObject({ ok: true });

    const paths = clonedScenePaths();
    const expectedWidth = String(strokeWidthFor('medium'));
    expect(expectedWidth).not.toBe(EXPORT_BORDER_WIDTH);
    paths.forEach((path: FakeElement): void => {
      expect(path.getAttribute('stroke-width')).toBe(expectedWidth);
      expect(Reflect.get(path.style, 'strokeWidth')).toBe(expectedWidth);
      expect(path.getAttribute('stroke')).toBe(DEFAULT_BORDER_COLOR);
    });
    expectInteractionStateNeutralised(paths);
  });

  it('passes a declared border colour through, overwriting the source sentinel', async (): Promise<void> => {
    const chosen = '#4B5563';
    const { source, sourcePath } = createSourceDeclaring('thin', chosen);

    await expect(exportMapPng(source)).resolves.toMatchObject({ ok: true });

    clonedScenePaths().forEach((path: FakeElement): void => {
      expect(path.getAttribute('stroke')).toBe(chosen);
      expect(Reflect.get(path.style, 'stroke')).toBe(chosen);
    });
    // Pure: the live composition is never written back to.
    expect(sourcePath.getAttribute('stroke')).toBe(SOURCE_STROKE_SENTINEL);
  });

  it('keeps the pre-04-08 contract when a source declares nothing', async (): Promise<void> => {
    const { source } = createSource();

    await expect(exportMapPng(source)).resolves.toMatchObject({ ok: true });

    clonedScenePaths().forEach((path: FakeElement): void => {
      expect(path.getAttribute('stroke')).toBe(DEFAULT_BORDER_COLOR);
      expect(path.getAttribute('stroke-width')).toBe(EXPORT_BORDER_WIDTH);
    });
  });

  it('ignores a weight name outside the vocabulary rather than writing it', async (): Promise<void> => {
    const { source } = createSourceDeclaring('enormous', DEFAULT_BORDER_COLOR);

    await expect(exportMapPng(source)).resolves.toMatchObject({ ok: true });

    clonedScenePaths().forEach((path: FakeElement): void => {
      expect(path.getAttribute('stroke-width')).toBe(EXPORT_BORDER_WIDTH);
    });
  });

  /**
   * The post-sanitize structural tripwire, re-asserted after the loop changed.
   * It is not a tautology: a sanitize rule that dropped or reordered the camera
   * or legend layer would turn a successful export into `invalid-composition`,
   * and the two `none` branches above are exactly the kind of edit that could.
   */
  it('leaves the composition preserved in both stroke branches', async (): Promise<void> => {
    for (const weight of ['none', 'bold']) {
      serializedClones.length = 0;
      const { source } = createSourceDeclaring(weight, DEFAULT_BORDER_COLOR);

      await expect(
        exportMapPng(source),
        `${weight} produced a refusal, so isPreservedComposition rejected the ` +
          'sanitized clone.',
      ).resolves.toMatchObject({ ok: true });

      const clone = getSerializedClone();
      expect(
        clone.children.map((child: FakeElement): string | null =>
          child.getAttribute('data-layer'),
        ),
      ).toEqual([null, 'surface', 'paint', 'camera', 'bands', 'legend']);
      expect(
        clone.querySelector('[data-layer="camera"]')?.getAttribute('transform'),
      ).toBe(CAMERA_TRANSFORM);
      expect(
        clone.querySelector('[data-layer="legend"]')?.getAttribute('transform'),
      ).toBe(LEGEND_TRANSFORM);
    }
  });
});

  /* ------------------------------------------------------------------ *
   * 04-09 - the two new camera-inside layers, across the sanitizer
   * ------------------------------------------------------------------ */

  describe('the interior mesh and the highlight layer cross the export boundary', (): void => {
    /**
     * **The mesh SURVIVES, with its own paint.**
     *
     * A layer that is stripped leaves an editor that looks right and a PNG that
     * is wrong - invisible to any check that only reads the live DOM. And its
     * stroke must be the mesh's own: the exporter's normaliser resolves the
     * COASTLINE contract, so a mesh it claimed would be re-stroked to the
     * coastline weight in the download and DELETED OUTRIGHT at `none`.
     */
    it('keeps the interior mesh, unnormalised, with its inline stroke', async (): Promise<void> => {
      // `none` is the shipped coastline default AND the destructive branch: it
      // REMOVES stroke and stroke-width. If the mesh were normalised here it
      // would lose its border entirely, which is the regression 04-09 closes.
      const { source } = createSourceDeclaring('none', DEFAULT_BORDER_COLOR);

      await expect(exportMapPng(source)).resolves.toMatchObject({ ok: true });

      const meshPaths = clonedMeshPaths();
      expect(
        meshPaths.length,
        'the interior mesh did not survive the clone, so the exported map has ' +
          'no lines between countries while the editor shows them.',
      ).toBe(1);

      const mesh = meshPaths[0];
      expect(mesh?.getAttribute('stroke')).toBe(MESH_STROKE_SENTINEL);
      expect(mesh?.getAttribute('stroke-width')).toBe(MESH_STROKE_WIDTH_SENTINEL);
      expect(mesh?.getAttribute('d')).toBe('M40 40 L60 60');
      // The zoom pin rides on the element itself, set by `MapCanvas`; the
      // exporter never touches this path, so nothing re-asserts it downstream.
      expect(mesh?.getAttribute('vector-effect')).toBe('non-scaling-stroke');

      // In the SAME run, the scene paths took the `none` branch. Without this,
      // the mesh assertions above would also pass against an exporter whose
      // stroke loop had simply stopped running.
      clonedScenePaths().forEach((path: FakeElement): void => {
        expect(path.getAttribute('stroke')).toBeNull();
        expect(path.getAttribute('stroke-width')).toBeNull();
      });

      // And the group's inherited paint survives too - a mesh that lost
      // `fill="none"` would flood every enclosed region with SVG default black.
      const borders = getSerializedClone().querySelector('[data-layer="borders"]');
      expect(borders?.getAttribute('fill')).toBe('none');
    });

    /**
     * **The highlight layer is GONE, wholesale.**
     *
     * The fixture's highlight path is the SELECTED country's outline at 2.5
     * units, so this is the assertion that a creator's published image cannot
     * carry the editor's selection ring. RED-proved by deleting
     * `data-editor-only` from the group.
     */
    it('removes the highlight layer, so interaction state cannot reach the PNG', async (): Promise<void> => {
      const { source, sourceSvg } = createSource();

      // The source really does carry it, or the absence below is about nothing.
      expect(
        sourceSvg.querySelectorAll('[data-layer="highlight"]'),
      ).toHaveLength(1);
      expect(
        sourceSvg.querySelectorAll('path.map-highlight-path'),
      ).toHaveLength(1);

      await expect(exportMapPng(source)).resolves.toMatchObject({ ok: true });

      const clone = getSerializedClone();
      expect(
        clone.querySelectorAll('[data-editor-only]'),
        'an editor-only element survived the sanitizer, so every affordance ' +
          'carrying that attribute is now a published pixel.',
      ).toHaveLength(0);
      expect(
        clone.querySelectorAll('[data-layer="highlight"]'),
        'the selection ring reached the export clone.',
      ).toHaveLength(0);
      expect(clone.querySelectorAll('path.map-highlight-path')).toHaveLength(0);
      // Nothing anywhere in the clone carries the selected width, so the check
      // cannot be satisfied by a highlight path that merely lost its class.
      expect(
        clone
          .querySelectorAll('path')
          .filter(
            (path: FakeElement): boolean =>
              path.getAttribute('stroke-width') === HIGHLIGHT_SELECTED_WIDTH,
          ),
      ).toHaveLength(0);

      // The layer BELOW it survived in the same run, so this is not a clone that
      // simply lost its camera contents.
      expect(clonedMeshPaths()).toHaveLength(1);
    });

    /**
     * **`isPreservedComposition` still returns true with all of them present.**
     *
     * It compares only the INDICES of the camera and legend children of the SVG
     * plus their transforms, so both new layers - which are camera CHILDREN, not
     * SVG children - are structurally invisible to it. Asserted rather than
     * argued, because the argument is the kind that stays convincing after it
     * stops being true.
     */
    it('keeps the composition preserved with surface, borders and highlight present', async (): Promise<void> => {
      const { source, sourceSvg } = createSource();

      const cameraChildren = (
        sourceSvg.querySelector('[data-layer="camera"]')?.children ?? []
      ).map((child: FakeElement): string | null => child.getAttribute('data-layer'));
      expect(cameraChildren).toEqual([
        'outgoing-scenes',
        'countries',
        'borders',
        'highlight',
      ]);

      await expect(
        exportMapPng(source),
        'the export refused, so isPreservedComposition rejected a clone that ' +
          'carries the two new camera layers.',
      ).resolves.toMatchObject({ ok: true });

      const clone = getSerializedClone();
      expect(
        clone.children.map((child: FakeElement): string | null =>
          child.getAttribute('data-layer'),
        ),
      ).toEqual([null, 'surface', 'paint', 'camera', 'bands', 'legend']);
      expect(
        clone.querySelector('[data-layer="camera"]')?.getAttribute('transform'),
      ).toBe(CAMERA_TRANSFORM);
      expect(
        clone.querySelector('[data-layer="legend"]')?.getAttribute('transform'),
      ).toBe(LEGEND_TRANSFORM);
      // The camera keeps its surviving children in order: the outgoing scene and
      // the highlight are removed, the countries and the borders are not.
      expect(
        (clone.querySelector('[data-layer="camera"]')?.children ?? []).map(
          (child: FakeElement): string | null => child.getAttribute('data-layer'),
        ),
      ).toEqual(['countries', 'borders']);
    });
  });

  /* ---------------------------------------------------------------- *
   * 04-10 - the band gradients cross the export boundary, the handles do not
   * ---------------------------------------------------------------- */

  describe('the gradient bands cross the export boundary', (): void => {
    /**
     * **The silent-failure gate.** `sanitizeExportClone` strips every `id`
     * unless `collectReferencedIds` found something pointing at it. A gradient
     * whose id is stripped does not error and does not warn - the `<defs>`
     * subtree is still there, the `fill="url(#...)"` still reads fine in the
     * markup, and the reference resolves to NOTHING inside the isolated export
     * document. The editor keeps its band and the download loses it.
     *
     * Both halves are asserted in one test on purpose: an id that survives
     * beside a rect that lost its reference is just as broken as the reverse,
     * and asserting them apart lets one pass while the pair is meaningless.
     */
    it('keeps both gradient ids alive because the band rects reference them', async (): Promise<void> => {
      const { source } = createSource();

      await expect(exportMapPng(source)).resolves.toMatchObject({ ok: true });

      const clone = getSerializedClone();
      const gradients = clone.querySelectorAll('lineargradient');
      expect(gradients).toHaveLength(2);
      expect(
        gradients.map((gradient: FakeElement): string | null =>
          gradient.getAttribute('id'),
        ),
        'a gradient id was stripped by the sanitizer, so its `url(#...)` now ' +
          'dangles and the exported PNG has silently lost that band.',
      ).toEqual([BAND_TOP_GRADIENT_ID, BAND_BOTTOM_GRADIENT_ID]);

      const bandRects = clone.querySelectorAll('rect[data-band]');
      expect(bandRects).toHaveLength(2);
      expect(
        bandRects.map((rect: FakeElement): string | null =>
          rect.getAttribute('fill'),
        ),
      ).toEqual([
        `url(#${BAND_TOP_GRADIENT_ID})`,
        `url(#${BAND_BOTTOM_GRADIENT_ID})`,
      ]);

      /*
       * The general form the clone contract asks for: not `ids === 0`, which
       * CONFIRMS the break, but "no surviving reference dangles". It covers
       * every future gradient, mask, marker, and clip path as well as these two.
       */
      const survivingIds = new Set(
        [clone, ...clone.querySelectorAll('*')]
          .map((element: FakeElement): string | null => element.getAttribute('id'))
          .filter((id: string | null): id is string => id !== null),
      );
      const references = [clone, ...clone.querySelectorAll('*')].flatMap(
        (element: FakeElement): string[] =>
          element
            .getAttributeNames()
            .flatMap((name: string): string[] =>
              [...(element.getAttribute(name) ?? '').matchAll(/url\(#([^)]+)\)/gu)].map(
                (match): string => match[1] ?? '',
              ),
            ),
      );
      expect(references.length).toBeGreaterThan(0);
      expect(
        references.filter((id: string): boolean => !survivingIds.has(id)),
        'a `url(#...)` in the sanitized clone points at an id that is no ' +
          'longer there, so whatever it painted is missing from the PNG.',
      ).toEqual([]);
    });

    /**
     * The stops are the PAINT, and they must arrive as inline literals. A
     * `stop-color` the sanitizer stripped, or one that was written as a `var()`
     * upstream, produces a band that rasterises as nothing while the editor
     * still shows it - the same measured trap `04-01` recorded for the water
     * rect's `fill`.
     */
    it('carries the inline literal stops, opaque to transparent, into the clone', async (): Promise<void> => {
      const { source } = createSource();

      await expect(exportMapPng(source)).resolves.toMatchObject({ ok: true });

      const stops = getSerializedClone().querySelectorAll('stop');
      expect(stops).toHaveLength(4);
      stops.forEach((stop: FakeElement): void => {
        expect(stop.getAttribute('stop-color')).toBe(BAND_STOP_COLOR_SENTINEL);
        expect(stop.getAttribute('stop-color')).not.toContain('var(');
      });
      expect(
        stops.map((stop: FakeElement): string | null =>
          stop.getAttribute('stop-opacity'),
        ),
      ).toEqual(['1', '0', '1', '0']);
    });

    /**
     * A7's handles are affordances, and `data-editor-only` is the whole
     * guarantee that they cannot become published pixels. The line's inline
     * `stroke` is what makes this a claim about paint: without it the handle
     * would survive into a document that renders nothing anyway, and this
     * assertion would be green for the wrong reason.
     */
    it('removes the band drag handles, so an affordance cannot reach the PNG', async (): Promise<void> => {
      const { source, sourceSvg } = createSource();

      expect(
        sourceSvg.querySelectorAll('[data-layer="band-handles"]'),
        'the fixture has no handles, so their absence below proves nothing.',
      ).toHaveLength(1);
      expect(sourceSvg.querySelectorAll('[role="slider"]')).toHaveLength(1);

      await expect(exportMapPng(source)).resolves.toMatchObject({ ok: true });

      const clone = getSerializedClone();
      expect(clone.querySelectorAll('[data-layer="band-handles"]')).toHaveLength(
        0,
      );
      expect(clone.querySelectorAll('[role="slider"]')).toHaveLength(0);
      expect(clone.querySelectorAll('line')).toHaveLength(0);
      expect(
        [clone, ...clone.querySelectorAll('*')].filter(
          (element: FakeElement): boolean =>
            element.getAttribute('stroke') === BAND_HANDLE_STROKE_SENTINEL,
        ),
        'the handle line survived the sanitizer with its inline stroke, so ' +
          'the creator downloads a resize affordance drawn across their map.',
      ).toHaveLength(0);
    });
  });
});
