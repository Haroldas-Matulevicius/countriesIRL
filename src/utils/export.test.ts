import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_BORDER_COLOR,
  SELECTED_BORDER_COLOR,
} from '../constants/colors';
import {
  EXPORT_FRAME_SIZE,
  EXPORT_SCALE,
  EXPORT_SIZE,
} from '../constants/config';
import { createExportFilename, exportMapPng } from './export';

const html2canvasMock = vi.hoisted(() => vi.fn());
const DOWNLOAD_HANDOFF_DELAY_MS = 100;

vi.mock('html2canvas', () => ({
  default: html2canvasMock,
}));

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

  public setProperty(name: string, value: string): void {
    Reflect.set(this, name.replaceAll('-', ''), value);
  }
}

class FakeElement {
  public readonly attributes = new Map<string, string>();
  public readonly children: FakeElement[] = [];
  public readonly style = new FakeStyleDeclaration();
  public parentElement: FakeElement | null = null;
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

class FakeDocument {
  public readonly body = new FakeElement('BODY', true);
  public readonly createdElements: FakeElement[] = [];
  public nextAnchorClickError: Error | null = null;

  public createElement(tagName: string): FakeElement {
    const element = new FakeElement(tagName.toUpperCase());
    if (tagName === 'a') {
      element.clickError = this.nextAnchorClickError;
    }
    this.createdElements.push(element);
    return element;
  }
}

interface FakeCanvasOptions {
  width?: number;
  height?: number;
  blob?: Blob | null;
}

function createCanvas(options: FakeCanvasOptions = {}): HTMLCanvasElement {
  const canvas = {
    width: options.width ?? EXPORT_SIZE,
    height: options.height ?? EXPORT_SIZE,
    toBlob: vi.fn((callback: BlobCallback, type?: string): void => {
      expect(type).toBe('image/png');
      callback(options.blob === undefined ? new Blob(['png']) : options.blob);
    }),
  };
  return canvas as unknown as HTMLCanvasElement;
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
  sourcePath.setAttribute('stroke', SELECTED_BORDER_COLOR);
  sourcePath.setAttribute('stroke-width', '3');
  sourcePath.setAttribute('vector-effect', 'non-scaling-stroke');
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
  wrappedPath.setAttribute('stroke', SELECTED_BORDER_COLOR);
  wrappedPath.setAttribute('stroke-width', '2');
  wrappedPath.setAttribute('vector-effect', 'non-scaling-stroke');
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

describe('exportMapPng', (): void => {
  let documentMock: FakeDocument;
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach((): void => {
    documentMock = new FakeDocument();
    createObjectURLMock = vi.fn((): string => 'blob:countriesirl-export');
    revokeObjectURLMock = vi.fn();
    vi.stubGlobal('document', documentMock);
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });
    html2canvasMock.mockReset();
  });

  afterEach((): void => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('captures an HTML map-only frame at 540 square and scale 2', async (): Promise<void> => {
    const { source, sourceElement, sourcePath } = createSource();
    const canvas = createCanvas();
    html2canvasMock.mockResolvedValue(canvas);

    const result = await exportMapPng(source, new Date('2026-07-21T12:00:00.000Z'));

    expect(result).toEqual({ ok: true, filename: 'CountriesIRL_2026-07-21.png' });
    expect(html2canvasMock).toHaveBeenCalledOnce();
    const [capturedFrame, options] = html2canvasMock.mock.calls[0] as [
      FakeElement,
      Record<string, unknown>,
    ];
    expect(capturedFrame.tagName).toBe('DIV');
    expect(capturedFrame.tagName).not.toBe('SVG');
    expect(options).toEqual({
      backgroundColor: '#FFFFFF',
      width: EXPORT_FRAME_SIZE,
      height: EXPORT_FRAME_SIZE,
      scale: EXPORT_SCALE,
      windowWidth: EXPORT_FRAME_SIZE,
      windowHeight: EXPORT_FRAME_SIZE,
    });
    expect(capturedFrame.style.width).toBe(`${EXPORT_FRAME_SIZE}px`);
    expect(capturedFrame.style.height).toBe(`${EXPORT_FRAME_SIZE}px`);
    expect(capturedFrame.style.backgroundColor).toBe('#FFFFFF');
    expect(capturedFrame.children).toHaveLength(1);

    const clonedSvg = capturedFrame.children[0];
    expect(clonedSvg?.getAttribute('viewBox')).toBe('0 0 1080 1080');
    expect(clonedSvg?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(clonedSvg?.getAttribute('width')).toBe('540');
    expect(clonedSvg?.getAttribute('height')).toBe('540');
    const clonedPath = clonedSvg?.querySelector('path.country-path');
    expect(clonedPath?.getAttribute('fill')).toBe('#DC2626');
    expect(clonedPath?.getAttribute('stroke')).toBe(DEFAULT_BORDER_COLOR);
    expect(clonedPath?.getAttribute('stroke-width')).toBe('1');
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

    const clonedCamera = clonedSvg?.querySelector('[data-layer="camera"]');
    expect(clonedCamera?.getAttribute('transform')).toBe(CAMERA_TRANSFORM);
    expect(clonedSvg?.querySelector('[data-layer="outgoing-scenes"]')).toBeNull();
    expect(clonedSvg?.querySelector('[data-layer="outgoing-scene"]')).toBeNull();
    expect(clonedSvg?.querySelector('[data-layer="countries"]')?.getAttribute('role')).toBeNull();

    const clonedLegend = clonedSvg?.querySelector('[data-layer="legend"]');
    expect(clonedLegend).not.toBeNull();
    expect(clonedLegend?.getAttribute('transform')).toBe(LEGEND_TRANSFORM);
    expect(clonedLegend?.querySelector('TEXT')?.getAttribute('data-label')).toBe(
      'Visited France',
    );
    expect(clonedLegend?.querySelector('TEXT')?.getAttribute('fill')).toBe('#111827');
    expect(clonedLegend?.querySelector('[data-editor-only]')).toBeNull();

    const clonedLayers = (clonedSvg?.children ?? []).map(
      (child: FakeElement): string | null => child.getAttribute('data-layer'),
    );
    expect(clonedLayers).toEqual(['camera', 'legend']);

    const anchor = getCreatedElement(documentMock, 'A');
    expect(anchor.getAttribute('href')).toBe('blob:countriesirl-export');
    expect(anchor.getAttribute('download')).toBe('CountriesIRL_2026-07-21.png');
    expect(anchor.wasClicked).toBe(true);
    expect(anchor.wasRemoved).toBe(true);
    expect(capturedFrame.wasRemoved).toBe(true);
    expect(revokeObjectURLMock).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:countriesirl-export');

    expect(sourceElement.isConnected).toBe(true);
    expect(sourcePath.getAttribute('class')).toContain('selected');
    expect(sourcePath.getAttribute('stroke')).toBe(SELECTED_BORDER_COLOR);
  });

  it('keeps every visible wrapped path and strips only its duplicate semantics', async (): Promise<void> => {
    const { source } = createSource();
    html2canvasMock.mockResolvedValue(createCanvas());

    await expect(
      exportMapPng(source, new Date('2026-07-21T12:00:00.000Z')),
    ).resolves.toEqual({ ok: true, filename: 'CountriesIRL_2026-07-21.png' });

    const capturedFrame = html2canvasMock.mock.calls[0]?.[0] as FakeElement;
    const clonedSvg = capturedFrame.children[0];
    const clonedPaths = clonedSvg?.querySelectorAll('path') ?? [];

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
      expect(path.getAttribute('stroke-width')).toBe('1');
      expect(path.getAttribute('vector-effect')).toBeNull();
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
    html2canvasMock.mockResolvedValue(createCanvas());

    await expect(
      exportMapPng(source, new Date('2026-07-21T12:00:00.000Z'), 'Baltic  Tour!'),
    ).resolves.toEqual({ ok: true, filename: 'Baltic_Tour_2026-07-21.png' });

    expect(getCreatedElement(documentMock, 'A').getAttribute('download')).toBe(
      'Baltic_Tour_2026-07-21.png',
    );
  });

  it('leaves the live composition untouched after sanitizing the clone', async (): Promise<void> => {
    const { source, sourcePath, wrappedPath, camera, countries, outgoingLayer } =
      createSource();
    html2canvasMock.mockResolvedValue(createCanvas());

    await exportMapPng(source, new Date('2026-07-21T12:00:00.000Z'));

    expect(sourcePath.getAttribute('role')).toBe('option');
    expect(sourcePath.getAttribute('tabindex')).toBe('0');
    expect(sourcePath.getAttribute('stroke')).toBe(SELECTED_BORDER_COLOR);
    expect(sourcePath.querySelector('title')).not.toBeNull();
    expect(wrappedPath.getAttribute('aria-hidden')).toBe('true');
    expect(camera.getAttribute('transform')).toBe(CAMERA_TRANSFORM);
    expect(countries.getAttribute('role')).toBe('listbox');
    expect(outgoingLayer.wasRemoved).toBe(false);
    expect(outgoingLayer.parentElement).toBe(camera);
  });

  it('refuses a composition whose legend renders as a sibling overlay', async (): Promise<void> => {
    const { source, sourceElement, legend } = createSource();
    legend.remove();
    sourceElement.appendChild(legend);

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'invalid-composition',
    });

    expect(html2canvasMock).not.toHaveBeenCalled();
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

    expect(html2canvasMock).not.toHaveBeenCalled();
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

    expect(html2canvasMock).not.toHaveBeenCalled();
    expect(getCreatedElement(documentMock, 'DIV').wasRemoved).toBe(true);
  });

  it('keeps the connected download live through the bounded browser handoff', async (): Promise<void> => {
    vi.useFakeTimers();
    const { source } = createSource();
    html2canvasMock.mockResolvedValue(createCanvas());
    let didResolve = false;

    const exportPromise = exportMapPng(
      source,
      new Date('2026-07-21T12:00:00.000Z'),
    );
    void exportPromise.then((): void => {
      didResolve = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

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

  it('fails before encoding when canvas dimensions are not exactly 1080 square', async (): Promise<void> => {
    const { source } = createSource();
    const canvas = createCanvas({ width: EXPORT_SIZE, height: EXPORT_SIZE - 1 });
    html2canvasMock.mockResolvedValue(canvas);

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'invalid-dimensions',
    });

    expect(canvas.toBlob).not.toHaveBeenCalled();
    expect(createObjectURLMock).not.toHaveBeenCalled();
    expect(getCreatedElement(documentMock, 'DIV').wasRemoved).toBe(true);
  });

  it('surfaces a null PNG blob and removes the temporary frame', async (): Promise<void> => {
    const { source } = createSource();
    html2canvasMock.mockResolvedValue(createCanvas({ blob: null }));

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'encoding-failed',
    });

    expect(createObjectURLMock).not.toHaveBeenCalled();
    expect(getCreatedElement(documentMock, 'DIV').wasRemoved).toBe(true);
  });

  it('surfaces html2canvas rejection and removes the temporary frame', async (): Promise<void> => {
    const { source } = createSource();
    html2canvasMock.mockRejectedValue(new Error('capture failed'));

    await expect(exportMapPng(source)).resolves.toEqual({
      ok: false,
      reason: 'capture-failed',
    });

    expect(createObjectURLMock).not.toHaveBeenCalled();
    expect(getCreatedElement(documentMock, 'DIV').wasRemoved).toBe(true);
  });

  it('cleans immediately without a handoff wait if the connected click fails', async (): Promise<void> => {
    vi.useFakeTimers();
    const { source } = createSource();
    documentMock.nextAnchorClickError = new Error('download blocked');
    html2canvasMock.mockResolvedValue(createCanvas());

    await expect(exportMapPng(source)).resolves.toEqual({
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

    expect(html2canvasMock).not.toHaveBeenCalled();
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

    expect(html2canvasMock).not.toHaveBeenCalled();
  });
});
