import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_BORDER_COLOR } from '../constants/colors';
import {
  EXPORT_FRAME_SIZE,
  EXPORT_SCALE,
  EXPORT_SIZE,
} from '../constants/config';
import {
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
const SOURCE_STROKE_SENTINEL = '#0F766E';

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
  svg.appendChild(camera);

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

  it('embeds one @font-face per referenced family the registry has bytes for', (): void => {
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
    expect(css.match(/@font-face/gu)).toHaveLength(1);
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
    expect(clonedLayers).toEqual([null, 'camera', 'legend']);
    expect(clonedSvg.children[0]?.tagName).toBe('STYLE');

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
    expect(clonedSvg.firstChild?.getAttribute('data-layer')).toBe('camera');
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

    const clonedSwatch = clonedSvg.querySelector('RECT');
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
    const clonedPaths = clonedSvg.querySelectorAll('path');

    expect(clonedPaths).toHaveLength(3);
    expect(
      clonedPaths.map((path: FakeElement): string | null =>
        path.getAttribute('data-path-kind'),
      ),
    ).toEqual(['logical', 'decorative', 'decorative']);

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
    const { source, sourceSvg, camera, legend } = createSource();
    camera.remove();
    sourceSvg.appendChild(camera);

    expect(sourceSvg.children).toEqual([legend, camera]);

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
});
