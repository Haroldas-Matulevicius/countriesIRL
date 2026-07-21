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
const PNG_MIME_TYPE = 'image/png';
const SVG_VIEWBOX = `0 0 ${EXPORT_SIZE} ${EXPORT_SIZE}`;
const SVG_PRESERVE_ASPECT_RATIO = 'xMidYMid meet';
const EXPORT_BORDER_WIDTH = '1';

const EDITOR_STATE_CLASSES = [
  'selected',
  'hovered',
  'focused',
  'is-selected',
  'is-hovered',
  'is-focused',
] as const;

const EDITOR_STATE_ATTRIBUTES = [
  'aria-selected',
  'tabindex',
  'data-selected',
  'data-hovered',
  'data-focused',
] as const;

function sanitizeEditorState(svg: SVGSVGElement): void {
  const elements: Element[] = [svg, ...svg.querySelectorAll('*')];

  elements.forEach((element: Element): void => {
    element.classList.remove(...EDITOR_STATE_CLASSES);
    EDITOR_STATE_ATTRIBUTES.forEach((attribute: string): void => {
      element.removeAttribute(attribute);
    });
  });

  svg.querySelectorAll<SVGPathElement>('path.country-path').forEach(
    (path: SVGPathElement): void => {
      path.setAttribute('stroke', DEFAULT_BORDER_COLOR);
      path.setAttribute('stroke-width', EXPORT_BORDER_WIDTH);
      path.removeAttribute('vector-effect');
      path.style.stroke = DEFAULT_BORDER_COLOR;
      path.style.strokeWidth = EXPORT_BORDER_WIDTH;
      path.style.transition = 'none';
      path.style.filter = 'none';
      path.style.outline = 'none';
    },
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

  sanitizeEditorState(clonedNode);
  exportFrame.appendChild(clonedNode);

  return exportFrame;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve): void => {
    canvas.toBlob(resolve, PNG_MIME_TYPE);
  });
}

export function createExportFilename(date: Date = new Date()): string {
  const isoDate = date.toISOString().slice(0, 10);
  return `${EXPORT_FILENAME_PREFIX}${isoDate}.png`;
}

export async function exportMapPng(
  source: HTMLElement,
  date: Date = new Date(),
): Promise<ExportResult> {
  if (!source.isConnected) {
    return { ok: false, reason: 'source-not-found' };
  }

  const sourceSvg = source.querySelector<SVGSVGElement>('svg');
  if (!sourceSvg) {
    return { ok: false, reason: 'source-not-found' };
  }

  let exportFrame: HTMLDivElement | null = null;
  let downloadAnchor: HTMLAnchorElement | null = null;
  let objectUrl: string | null = null;

  try {
    exportFrame = createExportFrame(sourceSvg);
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

    const filename = createExportFilename(date);

    try {
      objectUrl = URL.createObjectURL(blob);
      downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', objectUrl);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
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
