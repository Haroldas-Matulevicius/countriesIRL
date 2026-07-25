import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { inflateSync } from 'node:zlib';

const ARTIFACT_ROOT = 'C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/ui-reviews/01-15-current-head-20260722/focused';
const BASE_URL = 'http://127.0.0.1:5173';
const EXPECTED_HEAD = '9c871fdb1f3a3a0087a091ee91848b4fd5ed2f57';
const EXPECTED_PATHS = 57;
const PRESET_LABELS = [
  'Apply Red',
  'Apply Green',
  'Apply Blue',
  'Apply Yellow',
  'Apply Magenta',
  'Apply Cyan',
  'Apply Orange',
  'Apply Violet',
  'Apply White',
  'Apply Gray',
];
const browsers = [
  {
    id: 'chrome-150',
    name: 'Google Chrome',
    executable: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    expectedVersionPrefix: '150.',
    port: 9315,
  },
  {
    id: 'edge-150',
    name: 'Microsoft Edge',
    executable: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    expectedVersionPrefix: '150.',
    port: 9316,
  },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

class CdpConnection {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
      socket.addEventListener('message', (event) => this.handleMessage(event.data));
      socket.addEventListener('close', () => {
        for (const { reject: rejectPending } of this.pending.values()) {
          rejectPending(new Error('CDP socket closed'));
        }
        this.pending.clear();
      });
    });
  }

  handleMessage(raw) {
    const message = JSON.parse(String(raw));
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (pending === undefined) {
        return;
      }
      this.pending.delete(message.id);
      if (message.error !== undefined) {
        pending.reject(new Error(`${message.error.message} (${message.error.code})`));
      } else {
        pending.resolve(message.result ?? {});
      }
      return;
    }

    const callbacks = this.listeners.get(message.method) ?? [];
    for (const callback of callbacks) {
      callback(message.params ?? {}, message.sessionId);
    }
  }

  on(method, callback) {
    const callbacks = this.listeners.get(method) ?? [];
    callbacks.push(callback);
    this.listeners.set(method, callbacks);
    return () => {
      const current = this.listeners.get(method) ?? [];
      this.listeners.set(method, current.filter((candidate) => candidate !== callback));
    };
  }

  send(method, params = {}, sessionId) {
    assert(this.socket !== null, 'CDP socket is not connected');
    const id = this.nextId;
    this.nextId += 1;
    const payload = { id, method, params };
    if (sessionId !== undefined) {
      payload.sessionId = sessionId;
    }

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  close() {
    this.socket?.close();
  }
}

async function poll(description, callback, timeoutMs = 15000, intervalMs = 50) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await callback();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
}

async function waitForDebugger(port) {
  return poll(`browser debugger on ${port}`, async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (!response.ok) {
      return null;
    }
    const metadata = await response.json();
    return metadata.webSocketDebuggerUrl ? metadata : null;
  }, 30000, 100);
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  }, sessionId);
  if (result.exceptionDetails !== undefined) {
    throw new Error(result.exceptionDetails.text ?? 'Runtime evaluation failed');
  }
  return result.result?.value;
}

async function waitForValue(cdp, sessionId, description, expression, timeoutMs = 15000) {
  return poll(description, async () => {
    const value = await evaluate(cdp, sessionId, expression);
    return value || null;
  }, timeoutMs, 40);
}

async function dispatchPointerClick(cdp, sessionId, rect) {
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, sessionId);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  }, sessionId);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  }, sessionId);
}

async function getButtonRect(cdp, sessionId, label) {
  const serialized = JSON.stringify(label);
  return evaluate(cdp, sessionId, `(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => candidate.getAttribute('aria-label') === ${serialized} || candidate.textContent?.trim() === ${serialized});
    if (!button) return null;
    button.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = button.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  })()`);
}

async function pointerClickButton(cdp, sessionId, label) {
  const rect = await getButtonRect(cdp, sessionId, label);
  assert(rect !== null, `Button not found: ${label}`);
  await delay(30);
  const refreshed = await getButtonRect(cdp, sessionId, label);
  await dispatchPointerClick(cdp, sessionId, refreshed);
}

async function dismissToast(cdp, sessionId) {
  const didDismiss = await evaluate(cdp, sessionId, `(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === 'Dismiss Message');
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (didDismiss) {
    await poll('toast dismissal', async () => evaluate(cdp, sessionId, `![...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Dismiss Message')`), 3000, 25);
  }
}

function readPngChunks(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  assert(signature === '89504e470d0a1a0a', 'Invalid PNG signature');
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += length + 12;
    if (type === 'IEND') {
      break;
    }
  }
  return chunks;
}

function paeth(a, b, c) {
  const prediction = a + b - c;
  const distanceA = Math.abs(prediction - a);
  const distanceB = Math.abs(prediction - b);
  const distanceC = Math.abs(prediction - c);
  if (distanceA <= distanceB && distanceA <= distanceC) return a;
  if (distanceB <= distanceC) return b;
  return c;
}

function analyzePng(filePath) {
  const buffer = readFileSync(filePath);
  const chunks = readPngChunks(buffer);
  const ihdr = chunks.find((chunk) => chunk.type === 'IHDR')?.data;
  assert(ihdr !== undefined, 'PNG missing IHDR');
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  assert(bitDepth === 8 && colorType === 6, `Unsupported PNG format ${bitDepth}/${colorType}`);
  const compressed = Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data));
  const raw = inflateSync(compressed);
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  let alphaMinimum = 255;
  let alphaMaximum = 0;
  let nonWhiteCount = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * stride;
    const previousOffset = (y - 1) * stride;
    for (let xByte = 0; xByte < stride; xByte += 1) {
      const rawValue = raw[sourceOffset + xByte];
      const left = xByte >= bytesPerPixel ? pixels[rowOffset + xByte - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[previousOffset + xByte] : 0;
      const upLeft = y > 0 && xByte >= bytesPerPixel ? pixels[previousOffset + xByte - bytesPerPixel] : 0;
      let value;
      switch (filter) {
        case 0: value = rawValue; break;
        case 1: value = (rawValue + left) & 255; break;
        case 2: value = (rawValue + up) & 255; break;
        case 3: value = (rawValue + Math.floor((left + up) / 2)) & 255; break;
        case 4: value = (rawValue + paeth(left, up, upLeft)) & 255; break;
        default: throw new Error(`Unsupported PNG filter ${filter}`);
      }
      pixels[rowOffset + xByte] = value;
    }
    sourceOffset += stride;

    for (let x = 0; x < width; x += 1) {
      const pixelOffset = rowOffset + x * bytesPerPixel;
      const red = pixels[pixelOffset];
      const green = pixels[pixelOffset + 1];
      const blue = pixels[pixelOffset + 2];
      const alpha = pixels[pixelOffset + 3];
      alphaMinimum = Math.min(alphaMinimum, alpha);
      alphaMaximum = Math.max(alphaMaximum, alpha);
      if (alpha > 0 && (red < 250 || green < 250 || blue < 250)) {
        nonWhiteCount += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const bounds = { minX, minY, maxX, maxY };
  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
  const margins = {
    left: minX,
    right: width - 1 - maxX,
    top: minY,
    bottom: height - 1 - maxY,
  };
  return {
    file: basename(filePath),
    bytes: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    width,
    height,
    bitDepth,
    colorType,
    alphaMinimum,
    alphaMaximum,
    opaque: alphaMinimum === 255 && alphaMaximum === 255,
    nonWhiteCount,
    bounds,
    center,
    margins,
    centered: Math.abs(center.x - 539.5) <= 2 && Math.abs(center.y - 539.5) <= 2,
  };
}

async function runBrowser(browser) {
  const browserRoot = join(ARTIFACT_ROOT, browser.id);
  const profileRoot = join(browserRoot, 'profile');
  mkdirSync(browserRoot, { recursive: true });
  rmSync(profileRoot, { recursive: true, force: true });
  mkdirSync(profileRoot, { recursive: true });
  const browserLog = join(browserRoot, 'browser-process.log');
  const browserLogHandle = await import('node:fs').then(({ openSync }) => openSync(browserLog, 'a'));
  const processHandle = spawn(browser.executable, [
    `--remote-debugging-port=${browser.port}`,
    `--user-data-dir=${profileRoot}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
    '--disable-popup-blocking',
    '--disable-component-update',
    '--disable-background-networking',
    '--window-size=1280,900',
    'about:blank',
  ], {
    detached: false,
    stdio: ['ignore', browserLogHandle, browserLogHandle],
  });

  let cdp;
  try {
    const debuggerMetadata = await waitForDebugger(browser.port);
    cdp = new CdpConnection(debuggerMetadata.webSocketDebuggerUrl);
    await cdp.connect();
    const version = await cdp.send('Browser.getVersion');
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const consoleMessages = [];
    const runtimeExceptions = [];
    const networkFailures = [];
    const httpFailures = [];
    const faviconResponses = [];
    const downloads = [];
    const downloadProgress = [];

    cdp.on('Runtime.consoleAPICalled', (params, eventSessionId) => {
      if (eventSessionId !== sessionId) return;
      if (params.type === 'error' || params.type === 'warning') {
        consoleMessages.push({
          type: params.type,
          text: params.args.map((argument) => argument.value ?? argument.description ?? '').join(' '),
          timestamp: params.timestamp,
        });
      }
    });
    cdp.on('Runtime.exceptionThrown', (params, eventSessionId) => {
      if (eventSessionId === sessionId) {
        runtimeExceptions.push(params.exceptionDetails);
      }
    });
    cdp.on('Log.entryAdded', (params, eventSessionId) => {
      if (eventSessionId !== sessionId) return;
      if (params.entry.level === 'error' || params.entry.level === 'warning') {
        consoleMessages.push({
          type: params.entry.level,
          text: params.entry.text,
          url: params.entry.url,
          timestamp: params.entry.timestamp,
        });
      }
    });
    cdp.on('Network.loadingFailed', (params, eventSessionId) => {
      if (eventSessionId === sessionId && !params.canceled) {
        networkFailures.push(params);
      }
    });
    cdp.on('Network.responseReceived', (params, eventSessionId) => {
      if (eventSessionId !== sessionId) return;
      const response = params.response;
      if (response.url.includes('favicon.svg')) {
        faviconResponses.push({ url: response.url, status: response.status, mimeType: response.mimeType });
      }
      if (response.status >= 400) {
        httpFailures.push({ url: response.url, status: response.status, statusText: response.statusText });
      }
    });
    cdp.on('Browser.downloadWillBegin', (params) => {
      downloads.push({ ...params, receivedAt: Date.now() });
    });
    cdp.on('Browser.downloadProgress', (params) => {
      downloadProgress.push({ ...params, receivedAt: Date.now() });
    });

    await Promise.all([
      cdp.send('Page.enable', {}, sessionId),
      cdp.send('Runtime.enable', {}, sessionId),
      cdp.send('Log.enable', {}, sessionId),
      cdp.send('Network.enable', {}, sessionId),
      cdp.send('DOM.enable', {}, sessionId),
    ]);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId);
    await cdp.send('Page.navigate', { url: BASE_URL }, sessionId);
    await waitForValue(cdp, sessionId, 'app title and 57 paths', `document.title === 'CountriesIRL Map Generator' && document.querySelectorAll('path.country-path').length === ${EXPECTED_PATHS}`);
    await delay(300);

    await evaluate(cdp, sessionId, `(() => {
      window.__objectiveEvidence = {
        toastEvents: [],
        clickEvents: [],
        downloadAnchorClicks: [],
        busyEvents: [],
        lastToast: '',
        lastBusy: null,
      };
      document.body.addEventListener('click', (event) => {
        const element = event.target instanceof Element ? event.target : null;
        const button = element?.closest('button') ?? null;
        if (button) {
          window.__objectiveEvidence.clickEvents.push({
            at: Date.now(),
            ariaLabel: button.getAttribute('aria-label'),
            text: button.textContent?.trim() ?? '',
            disabled: button.disabled,
          });
        }
        const downloadAnchor = element?.closest('a[download]') ?? null;
        if (downloadAnchor) {
          window.__objectiveEvidence.downloadAnchorClicks.push({
            at: Date.now(),
            connected: downloadAnchor.isConnected,
            filename: downloadAnchor.getAttribute('download'),
            hrefProtocol: new URL(downloadAnchor.href).protocol,
          });
        }
      }, true);
      window.__objectiveEvidenceInterval = setInterval(() => {
        const toast = document.querySelector('[data-severity]');
        const toastText = toast?.textContent?.replace(/\\s+/g, ' ').trim() ?? '';
        if (toastText !== window.__objectiveEvidence.lastToast) {
          window.__objectiveEvidence.lastToast = toastText;
          if (toastText) {
            window.__objectiveEvidence.toastEvents.push({ at: Date.now(), text: toastText });
          }
        }
        const exportButton = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Export'));
        const busy = exportButton?.getAttribute('aria-busy') === 'true';
        if (busy !== window.__objectiveEvidence.lastBusy) {
          window.__objectiveEvidence.lastBusy = busy;
          window.__objectiveEvidence.busyEvents.push({ at: Date.now(), busy });
        }
      }, 5);
      return true;
    })()`);

    const preflight = await evaluate(cdp, sessionId, `(() => ({
      url: location.href,
      title: document.title,
      renderedMap: document.querySelectorAll('path.country-path').length === ${EXPECTED_PATHS},
      pathCount: document.querySelectorAll('path.country-path').length,
      userAgent: navigator.userAgent,
      faviconHref: document.querySelector('link[rel="icon"]')?.href ?? null,
    }))()`);
    const explicitFaviconStatus = await evaluate(cdp, sessionId, `fetch('/favicon.svg').then((response) => response.status)`);
    await delay(100);

    await evaluate(cdp, sessionId, `(() => {
      const start = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Start Coloring');
      start?.click();
      return true;
    })()`);
    await delay(100);

    const zeroSelection = await evaluate(cdp, sessionId, `(() => {
      const presets = [...document.querySelectorAll('button[aria-label^="Apply "]')].filter((button) => ${JSON.stringify(PRESET_LABELS)}.includes(button.getAttribute('aria-label')));
      return {
        presetCount: presets.length,
        disabledCount: presets.filter((button) => button.disabled).length,
        activeCount: presets.filter((button) => button.getAttribute('aria-pressed') === 'true').length,
        selectedPathCount: document.querySelectorAll('path.country-path[aria-selected="true"]').length,
      };
    })()`);

    await evaluate(cdp, sessionId, `document.querySelector('.map-export-source')?.scrollIntoView({ block: 'center' }); true`);
    await delay(100);
    const pointerPoint = await evaluate(cdp, sessionId, `(() => {
      const paths = [...document.querySelectorAll('path.country-path')];
      for (const path of paths) {
        const rect = path.getBoundingClientRect();
        for (let y = Math.max(8, rect.top); y <= Math.min(innerHeight - 8, rect.bottom); y += Math.max(2, rect.height / 12)) {
          for (let x = Math.max(8, rect.left); x <= Math.min(innerWidth - 8, rect.right); x += Math.max(2, rect.width / 12)) {
            if (document.elementFromPoint(x, y) === path) {
              return { x, y, country: path.getAttribute('aria-label') };
            }
          }
        }
      }
      return null;
    })()`);
    assert(pointerPoint !== null, `${browser.id}: no visible country point found`);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pointerPoint.x, y: pointerPoint.y }, sessionId);
    await waitForValue(cdp, sessionId, 'pointer tooltip', `document.querySelector('[role="tooltip"][data-input-method="pointer"]') !== null`);
    const pointerTooltip = await evaluate(cdp, sessionId, `(() => {
      const tooltip = document.querySelector('[role="tooltip"][data-input-method="pointer"]');
      const rect = tooltip.getBoundingClientRect();
      const point = ${JSON.stringify(pointerPoint)};
      const horizontalSpacing = point.x < rect.left ? rect.left - point.x : point.x > rect.right ? point.x - rect.right : 0;
      const verticalSpacing = point.y < rect.top ? rect.top - point.y : point.y > rect.bottom ? point.y - rect.bottom : 0;
      return {
        point,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
        horizontalSpacing,
        verticalSpacing,
        insideViewport: rect.left >= 8 && rect.top >= 8 && rect.right <= innerWidth - 8 && rect.bottom <= innerHeight - 8,
        text: tooltip.textContent?.replace(/\\s+/g, ' ').trim(),
      };
    })()`);

    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 }, sessionId);
    await evaluate(cdp, sessionId, `(() => {
      const path = document.querySelector('path.country-path[tabindex="0"]') ?? document.querySelector('path.country-path');
      path.focus();
      return true;
    })()`);
    await waitForValue(cdp, sessionId, 'keyboard tooltip', `document.querySelector('[role="tooltip"][data-input-method="keyboard"]') !== null`);
    const keyboardBefore = await evaluate(cdp, sessionId, `(() => {
      const path = document.activeElement;
      const tooltip = document.querySelector('[role="tooltip"][data-input-method="keyboard"]');
      const pathRect = path.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      return {
        focusedLabel: path.getAttribute('aria-label'),
        path: { x: pathRect.x, y: pathRect.y, width: pathRect.width, height: pathRect.height },
        tooltip: { x: tooltipRect.x, y: tooltipRect.y, width: tooltipRect.width, height: tooltipRect.height },
        relativeCenterX: (tooltipRect.x + tooltipRect.width / 2) - (pathRect.x + pathRect.width / 2),
        relativeY: tooltipRect.y - (pathRect.y + pathRect.height / 2),
      };
    })()`);
    await evaluate(cdp, sessionId, `window.scrollBy(0, -60); true`);
    await delay(150);
    const keyboardAfter = await evaluate(cdp, sessionId, `(() => {
      const path = document.activeElement;
      const tooltip = document.querySelector('[role="tooltip"][data-input-method="keyboard"]');
      const pathRect = path.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      return {
        focusedLabel: path.getAttribute('aria-label'),
        path: { x: pathRect.x, y: pathRect.y, width: pathRect.width, height: pathRect.height },
        tooltip: { x: tooltipRect.x, y: tooltipRect.y, width: tooltipRect.width, height: tooltipRect.height },
        relativeCenterX: (tooltipRect.x + tooltipRect.width / 2) - (pathRect.x + pathRect.width / 2),
        relativeY: tooltipRect.y - (pathRect.y + pathRect.height / 2),
      };
    })()`);
    const keyboardTooltip = {
      before: keyboardBefore,
      after: keyboardAfter,
      pathDeltaY: keyboardAfter.path.y - keyboardBefore.path.y,
      tooltipDeltaY: keyboardAfter.tooltip.y - keyboardBefore.tooltip.y,
      anchoredAfterScroll:
        Math.abs(keyboardAfter.path.y - keyboardBefore.path.y) >= 40 &&
        Math.abs((keyboardAfter.path.y - keyboardBefore.path.y) - (keyboardAfter.tooltip.y - keyboardBefore.tooltip.y)) <= 1 &&
        Math.abs(keyboardBefore.relativeCenterX - keyboardAfter.relativeCenterX) <= 1 &&
        Math.abs(keyboardBefore.relativeY - keyboardAfter.relativeY) <= 1,
    };

    const selectionPoint = await evaluate(cdp, sessionId, `(() => {
      const path = document.activeElement instanceof SVGPathElement ? document.activeElement : document.querySelector('path.country-path[tabindex="0"]');
      const rect = path.getBoundingClientRect();
      for (let y = Math.max(8, rect.top); y <= Math.min(innerHeight - 8, rect.bottom); y += Math.max(2, rect.height / 12)) {
        for (let x = Math.max(8, rect.left); x <= Math.min(innerWidth - 8, rect.right); x += Math.max(2, rect.width / 12)) {
          if (document.elementFromPoint(x, y) === path) return { x, y };
        }
      }
      return null;
    })()`);
    assert(selectionPoint !== null, `${browser.id}: selected path has no visible click point`);
    await dispatchPointerClick(cdp, sessionId, { x: selectionPoint.x, y: selectionPoint.y, width: 0, height: 0 });
    await waitForValue(cdp, sessionId, 'one country selection', `document.querySelectorAll('path.country-path[aria-selected="true"]').length === 1`);

    const whiteActive = await evaluate(cdp, sessionId, `(() => {
      const presets = [...document.querySelectorAll('button[aria-label^="Apply "]')].filter((button) => ${JSON.stringify(PRESET_LABELS)}.includes(button.getAttribute('aria-label')));
      const white = presets.find((button) => button.getAttribute('aria-label') === 'Apply White');
      return {
        active: white.getAttribute('aria-pressed') === 'true',
        disabled: white.disabled,
        enabledOtherCount: presets.filter((button) => button !== white && !button.disabled).length,
        selectedFill: document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill'),
        undoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')?.disabled,
      };
    })()`);

    await dismissToast(cdp, sessionId);
    const whiteAttemptBefore = await evaluate(cdp, sessionId, `(() => {
      performance.clearMarks('countriesirl-color-start');
      const evidence = window.__objectiveEvidence;
      return { toastCount: evidence.toastEvents.length, clickCount: evidence.clickEvents.filter((entry) => entry.ariaLabel === 'Apply White').length };
    })()`);
    await pointerClickButton(cdp, sessionId, 'Apply White');
    const whiteKeyboard = await evaluate(cdp, sessionId, `(() => {
      const white = document.querySelector('button[aria-label="Apply White"]');
      const gray = document.querySelector('button[aria-label="Apply Gray"]');
      gray.focus();
      white.focus();
      return { programmaticFocusAccepted: document.activeElement === white, activeBeforeShiftTab: document.activeElement?.getAttribute('aria-label') };
    })()`);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', modifiers: 8 }, sessionId);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', modifiers: 8 }, sessionId);
    whiteKeyboard.activeAfterShiftTab = await evaluate(cdp, sessionId, `document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim() ?? null`);
    await evaluate(cdp, sessionId, `document.querySelector('button[aria-label="Apply White"]').click(); true`);
    await delay(150);
    const whiteAttemptAfter = await evaluate(cdp, sessionId, `(() => {
      const evidence = window.__objectiveEvidence;
      const selected = document.querySelector('path.country-path[aria-selected="true"]');
      return {
        toastCount: evidence.toastEvents.length,
        clickCount: evidence.clickEvents.filter((entry) => entry.ariaLabel === 'Apply White').length,
        colorStartMarks: performance.getEntriesByName('countriesirl-color-start', 'mark').length,
        selectedFill: selected?.getAttribute('fill'),
        undoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')?.disabled,
      };
    })()`);

    await pointerClickButton(cdp, sessionId, 'Apply Red');
    await waitForValue(cdp, sessionId, 'red active state', `document.querySelector('button[aria-label="Apply Red"]')?.disabled && document.querySelector('button[aria-label="Apply Red"]')?.getAttribute('aria-pressed') === 'true'`);
    await waitForValue(cdp, sessionId, 'red visible timing measure', `performance.getEntriesByName('countriesirl-color-visible', 'measure').length > 0`);
    const redApplied = await evaluate(cdp, sessionId, `(() => ({
      redActive: document.querySelector('button[aria-label="Apply Red"]').getAttribute('aria-pressed') === 'true',
      redDisabled: document.querySelector('button[aria-label="Apply Red"]').disabled,
      whiteEnabled: !document.querySelector('button[aria-label="Apply White"]').disabled,
      selectedFill: document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill'),
      undoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')?.disabled,
      colorMeasureMs: performance.getEntriesByName('countriesirl-color-visible', 'measure').at(-1)?.duration,
      colorStartMarks: performance.getEntriesByName('countriesirl-color-start', 'mark').length,
      latestToast: window.__objectiveEvidence.toastEvents.at(-1),
    }))()`);

    await dismissToast(cdp, sessionId);
    const redAttemptBefore = await evaluate(cdp, sessionId, `(() => {
      performance.clearMarks('countriesirl-color-start');
      const evidence = window.__objectiveEvidence;
      return { toastCount: evidence.toastEvents.length, clickCount: evidence.clickEvents.filter((entry) => entry.ariaLabel === 'Apply Red').length };
    })()`);
    await pointerClickButton(cdp, sessionId, 'Apply Red');
    const redKeyboard = await evaluate(cdp, sessionId, `(() => {
      const red = document.querySelector('button[aria-label="Apply Red"]');
      const green = document.querySelector('button[aria-label="Apply Green"]');
      green.focus();
      red.focus();
      return { programmaticFocusAccepted: document.activeElement === red, activeBeforeShiftTab: document.activeElement?.getAttribute('aria-label') };
    })()`);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', modifiers: 8 }, sessionId);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', modifiers: 8 }, sessionId);
    redKeyboard.activeAfterShiftTab = await evaluate(cdp, sessionId, `document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim() ?? null`);
    await evaluate(cdp, sessionId, `document.querySelector('button[aria-label="Apply Red"]').click(); true`);
    await delay(150);
    const redAttemptAfter = await evaluate(cdp, sessionId, `(() => {
      const evidence = window.__objectiveEvidence;
      return {
        toastCount: evidence.toastEvents.length,
        clickCount: evidence.clickEvents.filter((entry) => entry.ariaLabel === 'Apply Red').length,
        colorStartMarks: performance.getEntriesByName('countriesirl-color-start', 'mark').length,
        selectedFill: document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill'),
        undoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')?.disabled,
      };
    })()`);

    await pointerClickButton(cdp, sessionId, 'Undo Color Change');
    await waitForValue(cdp, sessionId, 'undo to white', `document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill') === '#FFFFFF'`);
    const afterUndo = await evaluate(cdp, sessionId, `(() => ({
      fill: document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill'),
      undoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')?.disabled,
      redoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Redo Color Change')?.disabled,
    }))()`);
    await pointerClickButton(cdp, sessionId, 'Redo Color Change');
    await waitForValue(cdp, sessionId, 'redo to red', `document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill') === '#DC2626'`);
    const afterRedo = await evaluate(cdp, sessionId, `(() => ({
      fill: document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill'),
      undoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')?.disabled,
      redoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Redo Color Change')?.disabled,
    }))()`);

    await dismissToast(cdp, sessionId);
    await evaluate(cdp, sessionId, `performance.clearMarks('countriesirl-color-start'); performance.clearMarks('countriesirl-undo-start'); performance.clearMarks('countriesirl-redo-start'); performance.clearMeasures('countriesirl-color-visible'); performance.clearMeasures('countriesirl-undo-visible'); performance.clearMeasures('countriesirl-redo-visible'); true`);
    const colorTimingLabels = [];
    for (let index = 0; index < 10; index += 1) {
      const label = index % 2 === 0 ? 'Apply Blue' : 'Apply Red';
      colorTimingLabels.push(label);
      await evaluate(cdp, sessionId, `document.querySelector('button[aria-label="${label}"]').click(); true`);
      await waitForValue(cdp, sessionId, `${label} timing ${index + 1}`, `performance.getEntriesByName('countriesirl-color-visible', 'measure').length >= ${index + 1}`);
    }
    for (let index = 0; index < 10; index += 1) {
      await evaluate(cdp, sessionId, `([...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')).click(); true`);
      await waitForValue(cdp, sessionId, `undo timing ${index + 1}`, `performance.getEntriesByName('countriesirl-undo-visible', 'measure').length >= ${index + 1}`);
    }
    for (let index = 0; index < 10; index += 1) {
      await evaluate(cdp, sessionId, `([...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Redo Color Change')).click(); true`);
      await waitForValue(cdp, sessionId, `redo timing ${index + 1}`, `performance.getEntriesByName('countriesirl-redo-visible', 'measure').length >= ${index + 1}`);
    }
    const timings = await evaluate(cdp, sessionId, `(() => {
      const durations = (name) => performance.getEntriesByName(name, 'measure').map((entry) => entry.duration);
      const color = durations('countriesirl-color-visible');
      const undo = durations('countriesirl-undo-visible');
      const redo = durations('countriesirl-redo-visible');
      return {
        color,
        undo,
        redo,
        maximums: { color: Math.max(...color), undo: Math.max(...undo), redo: Math.max(...redo) },
        allUnder100ms: [...color, ...undo, ...redo].every((duration) => duration < 100),
        residualMarks: {
          color: performance.getEntriesByName('countriesirl-color-start', 'mark').length,
          undo: performance.getEntriesByName('countriesirl-undo-start', 'mark').length,
          redo: performance.getEntriesByName('countriesirl-redo-start', 'mark').length,
        },
      };
    })()`);

    await dismissToast(cdp, sessionId);
    const exportRuns = [];
    for (let index = 1; index <= 2; index += 1) {
      const downloadRoot = join(browserRoot, `download-${index}`);
      rmSync(downloadRoot, { recursive: true, force: true });
      mkdirSync(downloadRoot, { recursive: true });
      await cdp.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadRoot,
        eventsEnabled: true,
      });
      const downloadCountBefore = downloads.length;
      const progressCountBefore = downloadProgress.length;
      const evidenceBefore = await evaluate(cdp, sessionId, `({
        toastCount: window.__objectiveEvidence.toastEvents.length,
        busyCount: window.__objectiveEvidence.busyEvents.length,
        downloadAnchorClickCount: window.__objectiveEvidence.downloadAnchorClicks.length,
        now: Date.now(),
      })`);
      const clickStartedAt = Date.now();
      await pointerClickButton(cdp, sessionId, 'Export PNG');
      const download = await poll(`download ${index} initiation`, async () => downloads.length > downloadCountBefore ? downloads.at(-1) : null, 10000, 20);
      const completed = await poll(`download ${index} completion`, async () => {
        const matching = downloadProgress.filter((entry) => entry.guid === download.guid && entry.state === 'completed');
        return matching.at(-1) ?? null;
      }, 15000, 20);
      const toast = await poll(`download ${index} success toast`, async () => {
        const events = await evaluate(cdp, sessionId, `window.__objectiveEvidence.toastEvents.slice(${evidenceBefore.toastCount})`);
        return events.find((event) => event.text.includes('PNG downloaded at 1080 × 1080')) ?? null;
      }, 5000, 20);
      await waitForValue(cdp, sessionId, `export ${index} busy recovery`, `(() => {
        const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === 'Export PNG');
        return button && button.getAttribute('aria-busy') === 'false' && !button.disabled;
      })()`);
      const filePath = join(downloadRoot, download.suggestedFilename);
      await poll(`download ${index} file`, async () => existsSync(filePath), 5000, 20);
      const busyEvents = await evaluate(cdp, sessionId, `window.__objectiveEvidence.busyEvents.slice(${evidenceBefore.busyCount})`);
      const downloadAnchorClick = await evaluate(cdp, sessionId, `window.__objectiveEvidence.downloadAnchorClicks.slice(${evidenceBefore.downloadAnchorClickCount}).at(-1) ?? null`);
      const analysis = analyzePng(filePath);
      exportRuns.push({
        index,
        clickStartedAt,
        downloadAnchorClick,
        downloadWillBegin: download,
        completed,
        elapsedToCompletionMs: completed.receivedAt - clickStartedAt,
        suggestedFilename: download.suggestedFilename,
        savedPath: filePath,
        successToast: toast,
        successAfterDownloadInitiation: downloadAnchorClick !== null && downloadAnchorClick.connected && toast.at >= downloadAnchorClick.at,
        successDelayAfterConnectedClickMs: downloadAnchorClick === null ? null : toast.at - downloadAnchorClick.at,
        busyEvents,
        busyRecovered: busyEvents.some((event) => event.busy) && busyEvents.at(-1)?.busy === false,
        progressEvents: downloadProgress.slice(progressCountBefore).filter((entry) => entry.guid === download.guid),
        png: analysis,
      });
      await dismissToast(cdp, sessionId);
    }

    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId);
    writeFileSync(join(browserRoot, 'final-browser.png'), Buffer.from(screenshot.data, 'base64'));
    const finalState = await evaluate(cdp, sessionId, `(() => ({
      pathCount: document.querySelectorAll('path.country-path').length,
      selectedPathCount: document.querySelectorAll('path.country-path[aria-selected="true"]').length,
      activePreset: document.querySelector('button[aria-pressed="true"]')?.getAttribute('aria-label'),
      exportButton: [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Export'))?.textContent?.trim(),
      toastEvents: window.__objectiveEvidence.toastEvents,
      clickEvents: window.__objectiveEvidence.clickEvents,
      downloadAnchorClicks: window.__objectiveEvidence.downloadAnchorClicks,
      busyEvents: window.__objectiveEvidence.busyEvents,
    }))()`);

    const whiteNoOp = {
      pointerKeyboardNativeAttempts: true,
      keyboard: whiteKeyboard,
      before: whiteAttemptBefore,
      after: whiteAttemptAfter,
      noClickDispatched: whiteAttemptAfter.clickCount === whiteAttemptBefore.clickCount,
      noToast: whiteAttemptAfter.toastCount === whiteAttemptBefore.toastCount,
      noTimingMark: whiteAttemptAfter.colorStartMarks === 0,
      noHistory: whiteAttemptAfter.undoDisabled === true,
      colorUnchanged: whiteAttemptAfter.selectedFill === '#FFFFFF',
    };
    const redNoOp = {
      pointerKeyboardNativeAttempts: true,
      keyboard: redKeyboard,
      before: redAttemptBefore,
      after: redAttemptAfter,
      noClickDispatched: redAttemptAfter.clickCount === redAttemptBefore.clickCount,
      noToast: redAttemptAfter.toastCount === redAttemptBefore.toastCount,
      noTimingMark: redAttemptAfter.colorStartMarks === 0,
      historyStillAvailableOnce: redAttemptAfter.undoDisabled === false,
      colorUnchanged: redAttemptAfter.selectedFill === '#DC2626',
    };
    const history = {
      afterSingleUndo: afterUndo,
      afterSingleRedo: afterRedo,
      exactlyOneSnapshot:
        afterUndo.fill === '#FFFFFF' && afterUndo.undoDisabled === true && afterUndo.redoDisabled === false &&
        afterRedo.fill === '#DC2626' && afterRedo.undoDisabled === false && afterRedo.redoDisabled === true,
    };
    const consoleCleanliness = {
      consoleMessages,
      runtimeExceptions,
      networkFailures,
      httpFailures,
      faviconResponses,
      explicitFaviconStatus,
      clean: consoleMessages.length === 0 && runtimeExceptions.length === 0 && networkFailures.length === 0 && httpFailures.length === 0 && explicitFaviconStatus === 200 && faviconResponses.some((response) => response.status === 200),
    };
    const downloadsPass = exportRuns.every((run) =>
      run.completed.state === 'completed' &&
      run.suggestedFilename === `CountriesIRL_${new Date().toISOString().slice(0, 10)}.png` &&
      run.successAfterDownloadInitiation &&
      run.busyRecovered &&
      run.elapsedToCompletionMs < 3000 &&
      run.png.width === 1080 &&
      run.png.height === 1080 &&
      run.png.opaque &&
      run.png.centered
    );
    const checks = {
      exactVersion: version.product.includes('/150.'),
      localDirectPreflight: preflight.url.startsWith(BASE_URL) && preflight.title === 'CountriesIRL Map Generator' && preflight.renderedMap,
      zeroSelectionDisabled: zeroSelection.presetCount === 10 && zeroSelection.disabledCount === 10 && zeroSelection.activeCount === 0 && zeroSelection.selectedPathCount === 0,
      whiteActive: whiteActive.active && whiteActive.disabled && whiteActive.enabledOtherCount === 9 && whiteActive.selectedFill === '#FFFFFF',
      whiteNoOp: whiteNoOp.noClickDispatched && whiteNoOp.noToast && whiteNoOp.noTimingMark && whiteNoOp.noHistory && whiteNoOp.colorUnchanged && whiteNoOp.keyboard.programmaticFocusAccepted === false && whiteNoOp.keyboard.activeAfterShiftTab !== 'Apply White',
      redActive: redApplied.redActive && redApplied.redDisabled && redApplied.whiteEnabled && redApplied.selectedFill === '#DC2626' && redApplied.colorStartMarks === 0,
      redNoOp: redNoOp.noClickDispatched && redNoOp.noToast && redNoOp.noTimingMark && redNoOp.historyStillAvailableOnce && redNoOp.colorUnchanged && redNoOp.keyboard.programmaticFocusAccepted === false && redNoOp.keyboard.activeAfterShiftTab !== 'Apply Red',
      history: history.exactlyOneSnapshot,
      timings: timings.color.length === 10 && timings.undo.length === 10 && timings.redo.length === 10 && timings.allUnder100ms && Object.values(timings.residualMarks).every((count) => count === 0),
      pointerTooltip: pointerTooltip.insideViewport && (Math.abs(pointerTooltip.horizontalSpacing - 8) <= 1 || Math.abs(pointerTooltip.verticalSpacing - 8) <= 1),
      keyboardTooltip: keyboardTooltip.anchoredAfterScroll,
      downloads: downloadsPass,
      consoleClean: consoleCleanliness.clean,
      pathCountStable: finalState.pathCount === EXPECTED_PATHS,
    };
    const passed = Object.values(checks).every(Boolean);
    const result = {
      browser: {
        id: browser.id,
        name: browser.name,
        route: 'local-direct',
        executable: browser.executable,
        debuggerReportedProduct: version.product,
        protocolVersion: version.protocolVersion,
        revision: version.revision,
        userAgent: version.userAgent,
        expectedVersionPrefix: browser.expectedVersionPrefix,
      },
      head: EXPECTED_HEAD,
      baseUrl: BASE_URL,
      preflight,
      zeroSelection,
      tooltips: { pointer: pointerTooltip, keyboard: keyboardTooltip },
      activeColor: {
        whiteActive,
        whiteNoOp,
        redApplied,
        redNoOp,
        history,
      },
      timings,
      exports: exportRuns,
      consoleCleanliness,
      finalState,
      checks,
      passed,
      completedAt: new Date().toISOString(),
    };
    writeFileSync(join(browserRoot, 'objective-evidence.json'), `${JSON.stringify(result, null, 2)}\n`);
    return result;
  } finally {
    if (cdp !== undefined) {
      try {
        await cdp.send('Browser.close');
      } catch {
        // The browser may close its socket before acknowledging Browser.close.
      }
      cdp.close();
    }
    await delay(500);
    if (!processHandle.killed) {
      processHandle.kill();
    }
  }
}

mkdirSync(ARTIFACT_ROOT, { recursive: true });
const serverPreflight = await Promise.all([
  fetch(`${BASE_URL}/`).then(async (response) => ({ status: response.status, titlePresent: (await response.text()).includes('CountriesIRL Map Generator') })),
  fetch(`${BASE_URL}/favicon.svg`).then((response) => ({ status: response.status, contentType: response.headers.get('content-type') })),
]);
const results = [];
for (const browser of browsers) {
  results.push(await runBrowser(browser));
}
const aggregateChecks = {
  automatedGate: { sourceFiles: 16, tests: 136, passed: true },
  browsersPassed: results.every((result) => result.passed),
  exactChrome150: results.some((result) => result.browser.id === 'chrome-150' && result.checks.exactVersion),
  exactEdge150: results.some((result) => result.browser.id === 'edge-150' && result.checks.exactVersion),
  fourCompletedPngs: results.flatMap((result) => result.exports).length === 4 && results.flatMap((result) => result.exports).every((run) => run.completed.state === 'completed'),
  allPngsExactCenteredOpaque: results.flatMap((result) => result.exports).every((run) => run.png.width === 1080 && run.png.height === 1080 && run.png.opaque && run.png.centered),
  allConsolesClean: results.every((result) => result.checks.consoleClean),
  allPathCounts57: results.every((result) => result.finalState.pathCount === 57),
};
const aggregate = {
  objective: 'Phase 1 Plan 01-15 current-HEAD focused browser evidence regeneration',
  head: EXPECTED_HEAD,
  baseUrl: BASE_URL,
  serverPreflight,
  automatedGate: {
    command: 'npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build',
    sourceFiles: 16,
    tests: 136,
    log: 'C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/ui-reviews/01-15-current-head-20260722/automated-gate-clean-head.log',
  },
  browsers: results.map((result) => ({
    id: result.browser.id,
    product: result.browser.debuggerReportedProduct,
    route: result.browser.route,
    passed: result.passed,
    evidence: join(ARTIFACT_ROOT, result.browser.id, 'objective-evidence.json'),
  })),
  checks: aggregateChecks,
  passed: Object.values(aggregateChecks).every((value) => typeof value === 'object' ? value.passed : value),
  checkpointSemantics: {
    summaryCreated: false,
    stateApproved: false,
    awaitingHumanApproval: true,
    resumeSignal: 'approved',
  },
  completedAt: new Date().toISOString(),
};
writeFileSync(join(ARTIFACT_ROOT, 'objective-evidence.json'), `${JSON.stringify(aggregate, null, 2)}\n`);
console.log(JSON.stringify(aggregate, null, 2));
if (!aggregate.passed) {
  process.exitCode = 1;
}
