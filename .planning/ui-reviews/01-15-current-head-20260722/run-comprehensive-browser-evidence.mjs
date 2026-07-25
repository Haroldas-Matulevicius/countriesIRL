import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import { inflateSync } from 'node:zlib';

const ARTIFACT_ROOT = 'C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/ui-reviews/01-15-current-head-20260722/comprehensive';
const BASE_URL = 'http://127.0.0.1:5173';
const CURRENT_HEAD = '9c871fdb1f3a3a0087a091ee91848b4fd5ed2f57';
const EXPECTED_PATHS = 57;
const VIEWPORT_MARGIN = 8;
const browsers = [
  {
    id: 'chrome-150',
    name: 'Google Chrome',
    executable: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    expectedPrefix: 'Chrome/150.',
    port: 9415,
  },
  {
    id: 'edge-150',
    name: 'Microsoft Edge',
    executable: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    expectedPrefix: 'Edg/150.',
    port: 9416,
  },
];

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function poll(description, callback, timeoutMilliseconds = 15000, intervalMilliseconds = 40) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMilliseconds) {
    try {
      const value = await callback();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMilliseconds);
  }
  throw new Error(
    `Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`,
  );
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
        for (const pending of this.pending.values()) {
          pending.reject(new Error('CDP socket closed'));
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
    callbacks.forEach((callback) => callback(message.params ?? {}, message.sessionId));
  }

  on(method, callback) {
    const callbacks = this.listeners.get(method) ?? [];
    callbacks.push(callback);
    this.listeners.set(method, callbacks);
  }

  send(method, params = {}, sessionId) {
    assert(this.socket !== null, 'CDP connection is not open');
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

async function waitForDebugger(port) {
  return poll(
    `browser debugger ${port}`,
    async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (!response.ok) {
        return null;
      }
      const value = await response.json();
      return value.webSocketDebuggerUrl ? value : null;
    },
    30000,
    100,
  );
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send(
    'Runtime.evaluate',
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    },
    sessionId,
  );
  if (result.exceptionDetails !== undefined) {
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        'Runtime evaluation failed',
    );
  }
  return result.result?.value;
}

async function waitForValue(cdp, sessionId, description, expression, timeoutMilliseconds = 15000) {
  return poll(
    description,
    async () => {
      const value = await evaluate(cdp, sessionId, expression);
      return value || null;
    },
    timeoutMilliseconds,
    40,
  );
}

async function setViewport(cdp, sessionId, width, height, deviceScaleFactor = 1) {
  await cdp.send(
    'Emulation.setDeviceMetricsOverride',
    {
      width,
      height,
      screenWidth: width,
      screenHeight: height,
      deviceScaleFactor,
      mobile: false,
    },
    sessionId,
  );
  await delay(180);
}

async function setMedia(cdp, sessionId, colorScheme = 'light', reducedMotion = 'no-preference') {
  await cdp.send(
    'Emulation.setEmulatedMedia',
    {
      media: 'screen',
      features: [
        { name: 'prefers-color-scheme', value: colorScheme },
        { name: 'prefers-reduced-motion', value: reducedMotion },
      ],
    },
    sessionId,
  );
  await delay(120);
}

async function navigateReady(cdp, sessionId, url = BASE_URL) {
  await cdp.send('Page.navigate', { url }, sessionId);
  await waitForValue(
    cdp,
    sessionId,
    'CountriesIRL title and 57 map paths',
    `document.title === 'CountriesIRL Map Generator' && document.querySelectorAll('path.country-path').length === ${EXPECTED_PATHS}`,
    20000,
  );
  await delay(180);
}

async function clickText(cdp, sessionId, text) {
  const serialized = JSON.stringify(text);
  const clicked = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === ${serialized});
      if (!button) return false;
      button.click();
      return true;
    })()`,
  );
  assert(clicked, `Button not found: ${text}`);
  await delay(70);
}

async function clickAria(cdp, sessionId, ariaLabel) {
  const serialized = JSON.stringify(ariaLabel);
  const clicked = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const button = document.querySelector('button[aria-label=' + ${JSON.stringify(JSON.stringify(ariaLabel))} + ']') ??
        [...document.querySelectorAll('button')].find((candidate) => candidate.getAttribute('aria-label') === ${serialized});
      if (!button) return false;
      button.click();
      return true;
    })()`,
  );
  assert(clicked, `Button not found: ${ariaLabel}`);
  await delay(70);
}

async function dismissToast(cdp, sessionId) {
  const dismissed = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === 'Dismiss Message');
      if (!button) return false;
      button.click();
      return true;
    })()`,
  );
  if (dismissed) {
    await delay(50);
  }
}

async function setInputValue(cdp, sessionId, selector, value) {
  const changed = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!(input instanceof HTMLInputElement)) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );
  assert(changed, `Input not found: ${selector}`);
  await delay(70);
}

async function key(cdp, sessionId, keyValue, code = keyValue, modifiers = 0) {
  await cdp.send(
    'Input.dispatchKeyEvent',
    { type: 'keyDown', key: keyValue, code, modifiers },
    sessionId,
  );
  await cdp.send(
    'Input.dispatchKeyEvent',
    { type: 'keyUp', key: keyValue, code, modifiers },
    sessionId,
  );
  await delay(60);
}

async function screenshot(_cdp, _sessionId, filePath) {
  writeFileSync(`${filePath}.skipped.txt`, 'Viewport geometry is recorded in JSON; focused browser screenshots are stored in the sibling focused evidence directory.\n');
}

function readPngChunks(buffer) {
  assert(buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', 'Invalid PNG signature');
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    chunks.push({ type, data: buffer.subarray(offset + 8, offset + 8 + length) });
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
  const header = chunks.find((chunk) => chunk.type === 'IHDR')?.data;
  assert(header !== undefined, 'PNG IHDR missing');
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const bitDepth = header[8];
  const colorType = header[9];
  assert(bitDepth === 8 && colorType === 6, `Unexpected PNG format ${bitDepth}/${colorType}`);
  const compressed = Buffer.concat(
    chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data),
  );
  const raw = inflateSync(compressed);
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  let alphaMinimum = 255;
  let alphaMaximum = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let presetPixels = 0;
  let nearBlackPixels = 0;
  const presetColors = new Set([
    '220,38,38',
    '22,163,74',
    '37,99,235',
    '250,204,21',
    '192,38,211',
    '8,145,178',
    '234,88,12',
    '124,58,237',
    '107,114,128',
  ]);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * stride;
    const previousOffset = (y - 1) * stride;
    for (let byteIndex = 0; byteIndex < stride; byteIndex += 1) {
      const rawValue = raw[sourceOffset + byteIndex];
      const left = byteIndex >= bytesPerPixel ? pixels[rowOffset + byteIndex - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[previousOffset + byteIndex] : 0;
      const upLeft = y > 0 && byteIndex >= bytesPerPixel
        ? pixels[previousOffset + byteIndex - bytesPerPixel]
        : 0;
      let value;
      switch (filter) {
        case 0: value = rawValue; break;
        case 1: value = (rawValue + left) & 255; break;
        case 2: value = (rawValue + up) & 255; break;
        case 3: value = (rawValue + Math.floor((left + up) / 2)) & 255; break;
        case 4: value = (rawValue + paeth(left, up, upLeft)) & 255; break;
        default: throw new Error(`Unsupported PNG filter ${filter}`);
      }
      pixels[rowOffset + byteIndex] = value;
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
      if (presetColors.has(`${red},${green},${blue}`)) {
        presetPixels += 1;
      }
      if (red < 64 && green < 64 && blue < 64) {
        nearBlackPixels += 1;
      }
      if (alpha > 0 && (red < 250 || green < 250 || blue < 250)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
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
    bounds: { minX, minY, maxX, maxY },
    margins: {
      left: minX,
      right: width - 1 - maxX,
      top: minY,
      bottom: height - 1 - maxY,
    },
    center,
    centered: Math.abs(center.x - 539.5) <= 2 && Math.abs(center.y - 539.5) <= 2,
    presetPixels,
    nearBlackPixels,
  };
}

async function exportAndAnalyze({
  cdp,
  sessionId,
  browserRoot,
  label,
  downloads,
  downloadProgress,
}) {
  const downloadRoot = join(browserRoot, label);
  rmSync(downloadRoot, { recursive: true, force: true });
  mkdirSync(downloadRoot, { recursive: true });
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadRoot,
    eventsEnabled: true,
  });
  const downloadsBefore = downloads.length;
  const startedAt = Date.now();
  await clickText(cdp, sessionId, 'Export PNG');
  const download = await poll(
    `${label} download initiation`,
    async () => (downloads.length > downloadsBefore ? downloads.at(-1) : null),
    10000,
    20,
  );
  const completed = await poll(
    `${label} download completion`,
    async () =>
      downloadProgress.find(
        (entry) => entry.guid === download.guid && entry.state === 'completed',
      ) ?? null,
    15000,
    20,
  );
  const filePath = join(downloadRoot, download.suggestedFilename);
  await poll(`${label} downloaded file`, async () => existsSync(filePath), 5000, 20);
  await waitForValue(
    cdp,
    sessionId,
    `${label} export controls recovered`,
    `(() => {
      const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === 'Export PNG');
      return button && !button.disabled && button.getAttribute('aria-busy') === 'false';
    })()`,
  );
  const toast = await evaluate(
    cdp,
    sessionId,
    `document.querySelector('[data-severity]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''`,
  );
  const analysis = analyzePng(filePath);
  await dismissToast(cdp, sessionId);
  return {
    label,
    startedAt,
    completedAt: completed.receivedAt,
    elapsedMilliseconds: completed.receivedAt - startedAt,
    suggestedFilename: download.suggestedFilename,
    filePath,
    toast,
    analysis,
  };
}

async function runBrowser(browser) {
  const browserRoot = join(ARTIFACT_ROOT, browser.id);
  const profileRoot = join(browserRoot, 'profile');
  rmSync(browserRoot, { recursive: true, force: true });
  mkdirSync(profileRoot, { recursive: true });
  const browserLogPath = join(browserRoot, 'browser-process.log');
  const browserLog = openSync(browserLogPath, 'a');
  const processHandle = spawn(
    browser.executable,
    [
      `--remote-debugging-port=${browser.port}`,
      `--user-data-dir=${profileRoot}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-sync',
      '--disable-popup-blocking',
      '--disable-component-update',
      '--disable-background-networking',
      '--window-size=1440,900',
      'about:blank',
    ],
    { detached: false, stdio: ['ignore', browserLog, browserLog] },
  );

  let cdp;
  try {
    const debuggerMetadata = await waitForDebugger(browser.port);
    cdp = new CdpConnection(debuggerMetadata.webSocketDebuggerUrl);
    await cdp.connect();
    const version = await cdp.send('Browser.getVersion');
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });

    const consoleMessages = [];
    const runtimeExceptions = [];
    const requests = [];
    const responses = [];
    const networkFailures = [];
    const downloads = [];
    const downloadProgress = [];

    cdp.on('Runtime.consoleAPICalled', (params, eventSessionId) => {
      if (eventSessionId !== sessionId) return;
      if (params.type === 'error' || params.type === 'warning') {
        consoleMessages.push({
          type: params.type,
          text: params.args
            .map((argument) => argument.value ?? argument.description ?? '')
            .join(' '),
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
    cdp.on('Network.requestWillBeSent', (params, eventSessionId) => {
      if (eventSessionId === sessionId) {
        requests.push({
          url: params.request.url,
          type: params.type,
          timestamp: params.timestamp,
        });
      }
    });
    cdp.on('Network.responseReceived', (params, eventSessionId) => {
      if (eventSessionId === sessionId) {
        responses.push({
          url: params.response.url,
          status: params.response.status,
          mimeType: params.response.mimeType,
          fromDiskCache: params.response.fromDiskCache,
        });
      }
    });
    cdp.on('Network.loadingFailed', (params, eventSessionId) => {
      if (eventSessionId === sessionId && !params.canceled) {
        networkFailures.push(params);
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
    await setViewport(cdp, sessionId, 1440, 900);
    await setMedia(cdp, sessionId, 'light', 'no-preference');
    await navigateReady(cdp, sessionId);

    const preflight = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        url: location.href,
        title: document.title,
        pathCount: document.querySelectorAll('path.country-path').length,
        userAgent: navigator.userAgent,
        favicon: document.querySelector('link[rel="icon"]')?.href ?? null,
        mapRole: document.querySelector('svg.map-canvas')?.getAttribute('role'),
        mapLabel: document.querySelector('svg.map-canvas')?.getAttribute('aria-label'),
      }))()`,
    );
    const favicon = await evaluate(
      cdp,
      sessionId,
      `fetch('/favicon.svg').then(async (response) => ({ status: response.status, contentType: response.headers.get('content-type'), bytes: (await response.arrayBuffer()).byteLength }))`,
    );

    const mapReadySamples = [];
    for (let sample = 0; sample < 5; sample += 1) {
      await cdp.send('Page.reload', { ignoreCache: true }, sessionId);
      await waitForValue(
        cdp,
        sessionId,
        `map-ready sample ${sample + 1}`,
        `performance.getEntriesByName('countriesirl-map-ready', 'measure').length > 0 && document.querySelectorAll('path.country-path').length === ${EXPECTED_PATHS}`,
        20000,
      );
      mapReadySamples.push(
        await evaluate(
          cdp,
          sessionId,
          `performance.getEntriesByName('countriesirl-map-ready', 'measure').at(-1).duration`,
        ),
      );
    }

    await evaluate(
      cdp,
      sessionId,
      `localStorage.clear(); location.reload(); true`,
    );
    await waitForValue(
      cdp,
      sessionId,
      'first-use onboarding',
      `document.querySelector('#onboarding-help') && document.querySelectorAll('path.country-path').length === ${EXPECTED_PATHS}`,
      20000,
    );
    const onboardingCopy = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('#onboarding-help')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''`,
    );
    const creatorFlowStartedAt = Date.now();
    await clickText(cdp, sessionId, 'Start Coloring');
    const onboardingFocus = await evaluate(
      cdp,
      sessionId,
      `document.activeElement?.getAttribute('aria-label') ?? null`,
    );
    const creatorColors = ['Apply Red', 'Apply Green', 'Apply Blue', 'Apply Orange', 'Apply Violet'];
    for (let index = 0; index < 5; index += 1) {
      await evaluate(
        cdp,
        sessionId,
        `document.querySelectorAll('path.country-path')[${index}].dispatchEvent(new MouseEvent('click', { bubbles: true })); true`,
      );
      await delay(40);
      await clickAria(cdp, sessionId, creatorColors[index]);
      await dismissToast(cdp, sessionId);
    }
    const creatorFlowCompletedAt = Date.now();
    const creatorFlowState = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        coloredCount: [...document.querySelectorAll('path.country-path')].filter((path) => path.getAttribute('fill') !== '#FFFFFF').length,
        dismissedStorage: localStorage.getItem('countriesirl_onboarding_dismissed'),
      }))()`,
    );
    await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
    await waitForValue(
      cdp,
      sessionId,
      'onboarding dismissal reload',
      `document.querySelectorAll('path.country-path').length === ${EXPECTED_PATHS}`,
    );
    const onboardingAbsentAfterReload = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('#onboarding-help') === null`,
    );
    await clickText(cdp, sessionId, 'Show Help');
    const helpReopened = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('#onboarding-help') !== null`,
    );
    await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
    await waitForValue(
      cdp,
      sessionId,
      'persisted dismissal after Show Help reload',
      `document.querySelectorAll('path.country-path').length === ${EXPECTED_PATHS}`,
    );
    const onboardingAbsentAfterHelpReload = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('#onboarding-help') === null`,
    );

    await clickText(cdp, sessionId, 'Clear Selection').catch(() => {});
    const zeroSelection = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const presets = [...document.querySelectorAll('button[aria-label^="Apply "]')];
        return {
          selectedCount: document.querySelectorAll('path.country-path[aria-selected="true"]').length,
          presetCount: presets.length,
          disabledPresetCount: presets.filter((button) => button.disabled).length,
          customDisabled: document.querySelector('.color-picker__custom input')?.disabled,
        };
      })()`,
    );
    await evaluate(
      cdp,
      sessionId,
      `document.querySelector('.country-list input[type="checkbox"]').click(); true`,
    );
    await delay(80);
    const effectiveWhite = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        whiteActive: document.querySelector('button[aria-label="Apply White"]')?.getAttribute('aria-pressed') === 'true',
        whiteDisabled: document.querySelector('button[aria-label="Apply White"]')?.disabled,
        enabledAlternatives: [...document.querySelectorAll('button[aria-label^="Apply "]')].filter((button) => button.getAttribute('aria-label') !== 'Apply White' && !button.disabled).length,
        undoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')?.disabled,
      }))()`,
    );
    await dismissToast(cdp, sessionId);
    const activeWhiteBefore = await evaluate(
      cdp,
      sessionId,
      `(() => {
        performance.clearMarks('countriesirl-color-start');
        performance.clearMeasures('countriesirl-color-visible');
        return {
          toast: document.querySelector('[data-severity]')?.textContent ?? '',
          fill: document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill'),
        };
      })()`,
    );
    await clickAria(cdp, sessionId, 'Apply White');
    const activeWhiteAfter = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        toast: document.querySelector('[data-severity]')?.textContent ?? '',
        fill: document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill'),
        marks: performance.getEntriesByName('countriesirl-color-start', 'mark').length,
        measures: performance.getEntriesByName('countriesirl-color-visible', 'measure').length,
        undoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')?.disabled,
      }))()`,
    );
    await clickAria(cdp, sessionId, 'Apply Red');
    await waitForValue(
      cdp,
      sessionId,
      'red application',
      `document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill') === '#DC2626'`,
    );
    await dismissToast(cdp, sessionId);
    const redState = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        redActive: document.querySelector('button[aria-label="Apply Red"]')?.getAttribute('aria-pressed') === 'true',
        redDisabled: document.querySelector('button[aria-label="Apply Red"]')?.disabled,
        whiteEnabled: !document.querySelector('button[aria-label="Apply White"]')?.disabled,
      }))()`,
    );
    await evaluate(
      cdp,
      sessionId,
      `performance.clearMarks('countriesirl-color-start'); performance.clearMeasures('countriesirl-color-visible'); true`,
    );
    await clickAria(cdp, sessionId, 'Apply Red');
    const activeRedAfter = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        toast: document.querySelector('[data-severity]')?.textContent ?? '',
        fill: document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill'),
        marks: performance.getEntriesByName('countriesirl-color-start', 'mark').length,
        measures: performance.getEntriesByName('countriesirl-color-visible', 'measure').length,
      }))()`,
    );
    await clickText(cdp, sessionId, 'Undo Color Change');
    const undoWhite = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        fill: document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill'),
        undoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')?.disabled,
      }))()`,
    );
    await clickText(cdp, sessionId, 'Redo Color Change');
    const redoRed = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill')`,
    );
    await dismissToast(cdp, sessionId);

    await evaluate(
      cdp,
      sessionId,
      `document.querySelectorAll('.country-list input[type="checkbox"]')[1].click(); document.querySelectorAll('.country-list input[type="checkbox"]')[2].click(); true`,
    );
    await delay(80);
    const checkboxSelectionCount = await evaluate(
      cdp,
      sessionId,
      `document.querySelectorAll('.country-list input[type="checkbox"]:checked').length`,
    );
    await clickText(cdp, sessionId, 'Select All Countries');
    const selectAllCount = await evaluate(
      cdp,
      sessionId,
      `document.querySelectorAll('.country-list input[type="checkbox"]:checked').length`,
    );
    await clickText(cdp, sessionId, 'Clear Selection');
    const clearedCount = await evaluate(
      cdp,
      sessionId,
      `document.querySelectorAll('.country-list input[type="checkbox"]:checked').length`,
    );
    await evaluate(
      cdp,
      sessionId,
      `document.querySelector('.country-list input[type="checkbox"]').click(); true`,
    );
    await delay(60);
    await clickAria(cdp, sessionId, 'Apply Green');
    await dismissToast(cdp, sessionId);

    const customResults = [];
    for (const value of ['#abc', '#1A2B3C', 'rgb(4, 5, 6)']) {
      await setInputValue(cdp, sessionId, '.color-picker__custom input', value);
      await clickText(cdp, sessionId, 'Apply Custom Color');
      customResults.push(
        await evaluate(
          cdp,
          sessionId,
          `(() => ({
            input: document.querySelector('.color-picker__custom input')?.value,
            fill: document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill'),
            toast: document.querySelector('[data-severity]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
          }))()`,
        ),
      );
      await dismissToast(cdp, sessionId);
    }
    const invalidResults = [];
    for (const value of ['not-a-color', 'rgb(256, 0, 0)']) {
      const before = await evaluate(
        cdp,
        sessionId,
        `document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill')`,
      );
      await setInputValue(cdp, sessionId, '.color-picker__custom input', value);
      const invalid = await evaluate(
        cdp,
        sessionId,
        `(() => ({
          before: ${JSON.stringify(before)},
          after: document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill'),
          error: document.querySelector('.color-picker__error')?.textContent?.trim() ?? '',
          ariaInvalid: document.querySelector('.color-picker__custom input')?.getAttribute('aria-invalid'),
          applyDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Apply Custom Color')?.disabled,
        }))()`,
      );
      invalidResults.push({ value, ...invalid });
    }

    await setInputValue(cdp, sessionId, '.color-picker__custom input', '#123456');
    await clickText(cdp, sessionId, 'Apply Custom Color');
    await dismissToast(cdp, sessionId);
    await evaluate(
      cdp,
      sessionId,
      `performance.clearMeasures('countriesirl-color-visible'); performance.clearMeasures('countriesirl-undo-visible'); performance.clearMeasures('countriesirl-redo-visible'); performance.clearMarks('countriesirl-color-start'); performance.clearMarks('countriesirl-undo-start'); performance.clearMarks('countriesirl-redo-start'); true`,
    );
    for (let index = 0; index < 10; index += 1) {
      const label = index % 2 === 0 ? 'Apply Blue' : 'Apply Red';
      await clickAria(cdp, sessionId, label);
      await waitForValue(
        cdp,
        sessionId,
        `color timing ${index + 1}`,
        `performance.getEntriesByName('countriesirl-color-visible', 'measure').length >= ${index + 1}`,
      );
    }
    for (let index = 0; index < 10; index += 1) {
      await clickText(cdp, sessionId, 'Undo Color Change');
      await waitForValue(
        cdp,
        sessionId,
        `undo timing ${index + 1}`,
        `performance.getEntriesByName('countriesirl-undo-visible', 'measure').length >= ${index + 1}`,
      );
    }
    for (let index = 0; index < 10; index += 1) {
      await clickText(cdp, sessionId, 'Redo Color Change');
      await waitForValue(
        cdp,
        sessionId,
        `redo timing ${index + 1}`,
        `performance.getEntriesByName('countriesirl-redo-visible', 'measure').length >= ${index + 1}`,
      );
    }
    const interactionTimings = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const durations = (name) => performance.getEntriesByName(name, 'measure').map((entry) => entry.duration);
        const color = durations('countriesirl-color-visible');
        const undo = durations('countriesirl-undo-visible');
        const redo = durations('countriesirl-redo-visible');
        return {
          color,
          undo,
          redo,
          maximums: { color: Math.max(...color), undo: Math.max(...undo), redo: Math.max(...redo) },
          residualMarks: {
            color: performance.getEntriesByName('countriesirl-color-start', 'mark').length,
            undo: performance.getEntriesByName('countriesirl-undo-start', 'mark').length,
            redo: performance.getEntriesByName('countriesirl-redo-start', 'mark').length,
          },
        };
      })()`,
    );

    await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
    await waitForValue(
      cdp,
      sessionId,
      'stress reload',
      `document.querySelectorAll('path.country-path').length === ${EXPECTED_PATHS}`,
    );
    await evaluate(
      cdp,
      sessionId,
      `document.querySelector('.country-list input[type="checkbox"]').click(); true`,
    );
    for (let index = 0; index < 55; index += 1) {
      await clickAria(cdp, sessionId, index % 2 === 0 ? 'Apply Red' : 'Apply Blue');
    }
    let boundedUndoCount = 0;
    while (
      !(await evaluate(
        cdp,
        sessionId,
        `([...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change'))?.disabled`,
      )) &&
      boundedUndoCount < 60
    ) {
      await clickText(cdp, sessionId, 'Undo Color Change');
      boundedUndoCount += 1;
    }
    for (let index = 0; index < 5; index += 1) {
      await clickText(cdp, sessionId, 'Redo Color Change');
    }
    await clickText(cdp, sessionId, 'Undo Color Change');
    await clickText(cdp, sessionId, 'Undo Color Change');
    await clickAria(cdp, sessionId, 'Apply Green');
    const branchRedoDisabled = await evaluate(
      cdp,
      sessionId,
      `([...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Redo Color Change'))?.disabled`,
    );
    await clickText(cdp, sessionId, 'Reset All Colors');
    const resetFill = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill')`,
    );
    await clickText(cdp, sessionId, 'Undo Color Change');
    const undoResetFill = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill')`,
    );
    const rapidStartedAt = Date.now();
    const rapidInteractionCount = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const paths = [...document.querySelectorAll('path.country-path')];
        let interactions = 0;
        for (let index = 0; index < 60; index += 1) {
          paths[index % 10].dispatchEvent(new MouseEvent('click', { bubbles: true }));
          interactions += 1;
          const enabledPreset = [...document.querySelectorAll('button[aria-label^="Apply "]')].find((button) => !button.disabled && button.getAttribute('aria-label') !== 'Apply White');
          enabledPreset?.click();
          interactions += 1;
          if (index % 10 === 9) {
            const undo = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change');
            const redo = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Redo Color Change');
            if (undo && !undo.disabled) { undo.click(); interactions += 1; }
            if (redo && !redo.disabled) { redo.click(); interactions += 1; }
          }
        }
        return interactions;
      })()`,
    );
    await delay(800);
    const stressState = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const paths = [...document.querySelectorAll('path.country-path')];
        const ids = paths.map((path) => path.getAttribute('data-country-id'));
        return {
          pathCount: paths.length,
          uniquePathIds: new Set(ids).size,
          selectedCount: paths.filter((path) => path.getAttribute('aria-selected') === 'true').length,
          rapidElapsedMilliseconds: ${Date.now()} - ${rapidStartedAt},
        };
      })()`,
    );

    localStorageSuccess: {
      await evaluate(cdp, sessionId, `localStorage.removeItem('countriesirl_maps'); true`);
      await clickText(cdp, sessionId, 'Save or Load Maps');
      await setInputValue(cdp, sessionId, 'input[name="map-name"]', 'First Map');
      await clickText(cdp, sessionId, 'Save Current Map');
      const saveFirstToast = await evaluate(
        cdp,
        sessionId,
        `document.querySelector('[data-severity]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''`,
      );
      await dismissToast(cdp, sessionId);
      await clickText(cdp, sessionId, 'Close Saved Maps');
      await clickAria(cdp, sessionId, 'Apply Orange');
      await dismissToast(cdp, sessionId);
      await clickText(cdp, sessionId, 'Save or Load Maps');
      await setInputValue(cdp, sessionId, 'input[name="map-name"]', 'Second Map');
      await clickText(cdp, sessionId, 'Save Current Map');
      const saveSecondToast = await evaluate(
        cdp,
        sessionId,
        `document.querySelector('[data-severity]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''`,
      );
      await dismissToast(cdp, sessionId);
      await setInputValue(cdp, sessionId, 'input[name="map-name"]', '  First Map  ');
      const replaceNotice = await evaluate(
        cdp,
        sessionId,
        `(() => ({
          notice: document.querySelector('.save-load-warning')?.textContent?.trim() ?? '',
          action: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Replace Saved Map')?.textContent?.trim() ?? '',
        }))()`,
      );
      await clickText(cdp, sessionId, 'Replace Saved Map');
      const replaceToast = await evaluate(
        cdp,
        sessionId,
        `document.querySelector('[data-severity]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''`,
      );
      await dismissToast(cdp, sessionId);
      await clickText(cdp, sessionId, 'Close Saved Maps');
      await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
      await waitForValue(
        cdp,
        sessionId,
        'saved maps after reload',
        `document.querySelectorAll('path.country-path').length === ${EXPECTED_PATHS}`,
      );
      await clickText(cdp, sessionId, 'Save or Load Maps');
      const savedNamesAfterReload = await evaluate(
        cdp,
        sessionId,
        `[...document.querySelectorAll('.saved-map-details strong')].map((element) => element.textContent?.trim())`,
      );
      await clickAria(cdp, sessionId, 'Load This Map: First Map');
      const historyAfterLoad = await evaluate(
        cdp,
        sessionId,
        `(() => ({
          undoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')?.disabled,
          redoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Redo Color Change')?.disabled,
          toast: document.querySelector('[data-severity]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
        }))()`,
      );
      await dismissToast(cdp, sessionId);
      await clickText(cdp, sessionId, 'Save or Load Maps');
      await clickAria(cdp, sessionId, 'Load This Map: Second Map');
      const secondLoadToast = await evaluate(
        cdp,
        sessionId,
        `document.querySelector('[data-severity]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''`,
      );
      await dismissToast(cdp, sessionId);
      await clickText(cdp, sessionId, 'Save or Load Maps');
      await clickAria(cdp, sessionId, 'Delete Saved Map: First Map');
      const deleteState = await evaluate(
        cdp,
        sessionId,
        `(() => ({
          names: [...document.querySelectorAll('.saved-map-details strong')].map((element) => element.textContent?.trim()),
          toast: document.querySelector('[data-severity]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
        }))()`,
      );
      await dismissToast(cdp, sessionId);
      await clickText(cdp, sessionId, 'Close Saved Maps');
      var persistenceSuccess = {
        saveFirstToast,
        saveSecondToast,
        replaceNotice,
        replaceToast,
        savedNamesAfterReload,
        historyAfterLoad,
        secondLoadToast,
        deleteState,
      };
    }

    const validCountryId = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('path.country-path')?.getAttribute('data-country-id')`,
    );
    await evaluate(
      cdp,
      sessionId,
      `localStorage.setItem('countriesirl_maps', JSON.stringify([{ name: 'Partial Map', colors: { [${JSON.stringify(validCountryId)}]: '#DC2626', STALE: 'not-a-color' }, timestamp: Date.now() }])); true`,
    );
    await clickText(cdp, sessionId, 'Save or Load Maps');
    await clickAria(cdp, sessionId, 'Load This Map: Partial Map');
    const partialLoad = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        fill: document.querySelector('path.country-path[data-country-id=${JSON.stringify(validCountryId)}]')?.getAttribute('fill'),
        status: document.querySelector('[data-severity]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
        severity: document.querySelector('[data-severity]')?.getAttribute('data-severity'),
      }))()`,
    );
    await dismissToast(cdp, sessionId);
    await evaluate(cdp, sessionId, `localStorage.setItem('countriesirl_maps', '{malformed'); true`);
    await clickText(cdp, sessionId, 'Save or Load Maps');
    const malformedStorage = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        warning: document.querySelector('.save-load-warning')?.textContent?.trim() ?? '',
        pathCount: document.querySelectorAll('path.country-path').length,
        exportDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Export PNG')?.disabled,
      }))()`,
    );
    await clickText(cdp, sessionId, 'Close Saved Maps');

    const startupOverride = await cdp.send(
      'Page.addScriptToEvaluateOnNewDocument',
      {
        source: `Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value() { throw new DOMException('Blocked', 'SecurityError'); } });`,
      },
      sessionId,
    );
    await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
    await waitForValue(
      cdp,
      sessionId,
      'startup storage blocked alert',
      `document.querySelector('[role="alert"]') && document.querySelectorAll('path.country-path').length === ${EXPECTED_PATHS}`,
      20000,
    );
    const startupBlocked = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        alert: document.querySelector('[role="alert"]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
        ariaLive: document.querySelector('[role="alert"]')?.getAttribute('aria-live'),
        pathCount: document.querySelectorAll('path.country-path').length,
        exportDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Export PNG')?.disabled,
        saveDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Save or Load Maps')?.disabled,
      }))()`,
    );
    await cdp.send(
      'Page.removeScriptToEvaluateOnNewDocument',
      { identifier: startupOverride.identifier },
      sessionId,
    );
    await navigateReady(cdp, sessionId);
    await dismissToast(cdp, sessionId);

    await evaluate(
      cdp,
      sessionId,
      `window.__originalStorageSetItem = Storage.prototype.setItem; Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value() { throw new DOMException('Blocked', 'SecurityError'); } }); true`,
    );
    await clickText(cdp, sessionId, 'Save or Load Maps');
    await setInputValue(cdp, sessionId, 'input[name="map-name"]', 'Blocked Save');
    const mapBeforeBlockedSave = await evaluate(
      cdp,
      sessionId,
      `[...document.querySelectorAll('path.country-path')].map((path) => path.getAttribute('fill'))`,
    );
    await clickText(cdp, sessionId, 'Save Current Map');
    const blockedWrite = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        error: document.querySelector('.save-load-error')?.textContent?.trim() ?? '',
        name: document.querySelector('input[name="map-name"]')?.value,
        fillsPreserved: JSON.stringify([...document.querySelectorAll('path.country-path')].map((path) => path.getAttribute('fill'))) === ${JSON.stringify(JSON.stringify(mapBeforeBlockedSave))},
        savedRows: document.querySelectorAll('.saved-map-row').length,
      }))()`,
    );
    await clickText(cdp, sessionId, 'Close Saved Maps');
    await clickText(cdp, sessionId, 'Show Help');
    await clickText(cdp, sessionId, 'Dismiss Help');
    const blockedOnboardingToast = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('[data-severity]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''`,
    );
    await dismissToast(cdp, sessionId);
    await evaluate(
      cdp,
      sessionId,
      `Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: window.__originalStorageSetItem }); true`,
    );
    await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
    await waitForValue(
      cdp,
      sessionId,
      'storage recovery before quota simulation',
      `document.querySelectorAll('path.country-path').length === ${EXPECTED_PATHS} && ![...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Save or Load Maps')?.disabled`,
      20000,
    );

    await evaluate(
      cdp,
      sessionId,
      `window.__originalStorageSetItem = Storage.prototype.setItem; Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value() { throw new DOMException('Full', 'QuotaExceededError'); } }); true`,
    );
    await clickText(cdp, sessionId, 'Save or Load Maps');
    await setInputValue(cdp, sessionId, 'input[name="map-name"]', 'Quota Save');
    const quotaMapBefore = await evaluate(
      cdp,
      sessionId,
      `[...document.querySelectorAll('path.country-path')].map((path) => path.getAttribute('fill'))`,
    );
    await clickText(cdp, sessionId, 'Save Current Map');
    const quotaWrite = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        error: document.querySelector('.save-load-error')?.textContent?.trim() ?? '',
        name: document.querySelector('input[name="map-name"]')?.value,
        fillsPreserved: JSON.stringify([...document.querySelectorAll('path.country-path')].map((path) => path.getAttribute('fill'))) === ${JSON.stringify(JSON.stringify(quotaMapBefore))},
        savedSectionVisible: document.querySelector('.saved-maps-section') !== null,
      }))()`,
    );
    await evaluate(
      cdp,
      sessionId,
      `Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: window.__originalStorageSetItem }); true`,
    );
    await clickText(cdp, sessionId, 'Close Saved Maps');

    await setViewport(cdp, sessionId, 1440, 900);
    await setMedia(cdp, sessionId, 'light', 'no-preference');
    const desktopLayout = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        layoutClass: document.querySelector('.workspace')?.className,
        order: [...document.querySelector('.workspace').children].flatMap((child) => child.matches('.workspace__control-column') ? ['.workspace__actions', '.workspace__selection-color', '.workspace__country-list'] : [child.className ? '.' + String(child.className).split(' ')[0] : child.tagName]),
        workspaceCount: document.querySelectorAll('.workspace').length,
        mapCount: document.querySelectorAll('svg.map-canvas').length,
        mapSquare: (() => { const rect = document.querySelector('.map-export-source').getBoundingClientRect(); return { width: rect.width, height: rect.height }; })(),
      }))()`,
    );
    await screenshot(cdp, sessionId, join(browserRoot, 'desktop-light.png'));
    const stateBeforeResize = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        fills: [...document.querySelectorAll('path.country-path')].map((path) => path.getAttribute('fill')),
        selected: [...document.querySelectorAll('path.country-path[aria-selected="true"]')].map((path) => path.getAttribute('data-country-id')),
        undoDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Undo Color Change')?.disabled,
      }))()`,
    );
    await setViewport(cdp, sessionId, 768, 1024);
    const tabletLayout = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        layoutClass: document.querySelector('.workspace')?.className,
        order: [...document.querySelector('.workspace').children].map((child) => '.' + String(child.className).split(' ')[0]),
        workspaceCount: document.querySelectorAll('.workspace').length,
        mapCount: document.querySelectorAll('svg.map-canvas').length,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        statePreserved: JSON.stringify([...document.querySelectorAll('path.country-path')].map((path) => path.getAttribute('fill'))) === ${JSON.stringify(JSON.stringify(stateBeforeResize.fills))},
      }))()`,
    );
    await screenshot(cdp, sessionId, join(browserRoot, 'tablet-light.png'));
    await setViewport(cdp, sessionId, 360, 800);
    const mobileLayout = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const mapRect = document.querySelector('.map-export-source').getBoundingClientRect();
        const targets = [...document.querySelectorAll('.workspace button, .color-picker input')].map((element) => {
          const rect = element.getBoundingClientRect();
          return { text: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? element.getAttribute('placeholder'), width: rect.width, height: rect.height };
        });
        return {
          layoutClass: document.querySelector('.workspace')?.className,
          order: [...document.querySelector('.workspace').children].map((child) => '.' + String(child.className).split(' ')[0]),
          workspaceCount: document.querySelectorAll('.workspace').length,
          mapCount: document.querySelectorAll('svg.map-canvas').length,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          mapSquare: { width: mapRect.width, height: mapRect.height },
          targetMinimums: { minimumWidth: Math.min(...targets.map((target) => target.width)), minimumHeight: Math.min(...targets.map((target) => target.height)), targets },
          statePreserved: JSON.stringify([...document.querySelectorAll('path.country-path')].map((path) => path.getAttribute('fill'))) === ${JSON.stringify(JSON.stringify(stateBeforeResize.fills))},
        };
      })()`,
    );
    await screenshot(cdp, sessionId, join(browserRoot, 'mobile-360-light.png'));

    await evaluate(
      cdp,
      sessionId,
      `(() => {
        const map = document.querySelector('.map-export-source');
        map.scrollIntoView({ block: 'start' });
        window.scrollBy(0, 70);
        return true;
      })()`,
    );
    await delay(120);
    const topPath = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const paths = [...document.querySelectorAll('path.country-path')];
        const path = paths.sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top)[0];
        path.focus();
        const rect = path.getBoundingClientRect();
        return { label: path.getAttribute('aria-label'), rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } };
      })()`,
    );
    await waitForValue(
      cdp,
      sessionId,
      'top-edge keyboard tooltip',
      `document.querySelector('[role="tooltip"][data-input-method="keyboard"]') !== null`,
    );
    const topTooltip = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const rect = document.querySelector('[role="tooltip"]').getBoundingClientRect();
        return { rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }, inside: rect.top >= ${VIEWPORT_MARGIN} && rect.left >= ${VIEWPORT_MARGIN} && rect.right <= innerWidth - ${VIEWPORT_MARGIN} && rect.bottom <= innerHeight - ${VIEWPORT_MARGIN}, belowAnchor: rect.top >= ${topPath.rect.top} };
      })()`,
    );

    await evaluate(
      cdp,
      sessionId,
      `document.querySelector('.map-export-source').scrollIntoView({ block: 'center' }); true`,
    );
    await delay(120);
    const rightPoint = await evaluate(
      cdp,
      sessionId,
      `(() => {
        for (let x = innerWidth - 12; x >= innerWidth / 2; x -= 3) {
          for (let y = 20; y < innerHeight - 20; y += 3) {
            const element = document.elementFromPoint(x, y);
            if (element?.matches('path.country-path')) return { x, y, label: element.getAttribute('aria-label') };
          }
        }
        return null;
      })()`,
    );
    assert(rightPoint !== null, `${browser.id}: no right-edge country point`);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rightPoint.x, y: rightPoint.y }, sessionId);
    await waitForValue(
      cdp,
      sessionId,
      'right-edge pointer tooltip',
      `document.querySelector('[role="tooltip"][data-input-method="pointer"]') !== null`,
    );
    const rightTooltip = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const rect = document.querySelector('[role="tooltip"]').getBoundingClientRect();
        return { rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }, inside: rect.top >= ${VIEWPORT_MARGIN} && rect.left >= ${VIEWPORT_MARGIN} && rect.right <= innerWidth - ${VIEWPORT_MARGIN} && rect.bottom <= innerHeight - ${VIEWPORT_MARGIN}, leftOfPointer: rect.right <= ${rightPoint.x} };
      })()`,
    );

    await evaluate(
      cdp,
      sessionId,
      `(() => { const map = document.querySelector('.map-export-source'); const rect = map.getBoundingClientRect(); window.scrollBy(0, rect.bottom - innerHeight + 75); return true; })()`,
    );
    await delay(120);
    const bottomPoint = await evaluate(
      cdp,
      sessionId,
      `(() => {
        for (let y = innerHeight - 12; y >= innerHeight / 2; y -= 3) {
          for (let x = 12; x < innerWidth - 12; x += 3) {
            const element = document.elementFromPoint(x, y);
            if (element?.matches('path.country-path')) return { x, y, label: element.getAttribute('aria-label') };
          }
        }
        return null;
      })()`,
    );
    assert(bottomPoint !== null, `${browser.id}: no bottom-edge country point`);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: bottomPoint.x, y: bottomPoint.y }, sessionId);
    await waitForValue(
      cdp,
      sessionId,
      'bottom-edge pointer tooltip',
      `document.querySelector('[role="tooltip"][data-input-method="pointer"]') !== null`,
    );
    const bottomTooltip = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const rect = document.querySelector('[role="tooltip"]').getBoundingClientRect();
        return { rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }, inside: rect.top >= ${VIEWPORT_MARGIN} && rect.left >= ${VIEWPORT_MARGIN} && rect.right <= innerWidth - ${VIEWPORT_MARGIN} && rect.bottom <= innerHeight - ${VIEWPORT_MARGIN}, abovePointer: rect.bottom <= ${bottomPoint.y} };
      })()`,
    );

    await setViewport(cdp, sessionId, 1300, 900);
    await evaluate(
      cdp,
      sessionId,
      `window.scrollTo(0, 0); [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Save or Load Maps').focus(); true`,
    );
    await clickText(cdp, sessionId, 'Save or Load Maps');
    await setViewport(cdp, sessionId, 1000, 900);
    await clickText(cdp, sessionId, 'Close Saved Maps');
    const desktopToCompactFocus = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        text: document.activeElement?.textContent?.trim() ?? '',
        saveControl: document.activeElement?.getAttribute('data-save-load-control'),
        connected: document.activeElement?.isConnected,
        layout: document.querySelector('.workspace')?.className,
      }))()`,
    );
    await clickText(cdp, sessionId, 'Save or Load Maps');
    await setViewport(cdp, sessionId, 1300, 900);
    await clickText(cdp, sessionId, 'Close Saved Maps');
    const compactToDesktopFocus = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        text: document.activeElement?.textContent?.trim() ?? '',
        saveControl: document.activeElement?.getAttribute('data-save-load-control'),
        connected: document.activeElement?.isConnected,
        layout: document.querySelector('.workspace')?.className,
      }))()`,
    );

    await setViewport(cdp, sessionId, 360, 800);
    await clickText(cdp, sessionId, 'Save or Load Maps');
    const mobileModal = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const rect = dialog.getBoundingClientRect();
        return { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }, role: dialog.getAttribute('role'), ariaModal: dialog.getAttribute('aria-modal'), initialFocus: document.activeElement?.getAttribute('name') };
      })()`,
    );
    const focusTrapForward = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
        focusable.at(-1).focus();
        return { first: focusable[0].textContent?.trim() || focusable[0].getAttribute('name'), last: focusable.at(-1).textContent?.trim() || focusable.at(-1).getAttribute('name') };
      })()`,
    );
    await key(cdp, sessionId, 'Tab', 'Tab');
    focusTrapForward.after = await evaluate(
      cdp,
      sessionId,
      `document.activeElement?.textContent?.trim() || document.activeElement?.getAttribute('name')`,
    );
    const focusTrapBackward = await evaluate(
      cdp,
      sessionId,
      `(() => { const dialog = document.querySelector('[role="dialog"]'); const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]; focusable[0].focus(); return { first: focusable[0].textContent?.trim() || focusable[0].getAttribute('name'), last: focusable.at(-1).textContent?.trim() || focusable.at(-1).getAttribute('name') }; })()`,
    );
    await key(cdp, sessionId, 'Tab', 'Tab', 8);
    focusTrapBackward.after = await evaluate(
      cdp,
      sessionId,
      `document.activeElement?.textContent?.trim() || document.activeElement?.getAttribute('name')`,
    );
    await key(cdp, sessionId, 'Escape', 'Escape');
    const escapeRestored = await evaluate(
      cdp,
      sessionId,
      `document.activeElement?.getAttribute('data-save-load-control') === 'true'`,
    );

    await setMedia(cdp, sessionId, 'dark', 'no-preference');
    const darkTheme = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        mediaMatches: matchMedia('(prefers-color-scheme: dark)').matches,
        cardBackground: getComputedStyle(document.querySelector('.workspace__actions section')).backgroundColor,
        mapBackground: getComputedStyle(document.querySelector('.map-export-source')).backgroundColor,
        pathCount: document.querySelectorAll('path.country-path').length,
      }))()`,
    );
    await screenshot(cdp, sessionId, join(browserRoot, 'mobile-360-dark.png'));
    await setMedia(cdp, sessionId, 'light', 'reduce');
    const reducedMotion = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
        pathTransition: getComputedStyle(document.querySelector('path.country-path')).transitionDuration,
        buttonTransition: getComputedStyle(document.querySelector('.workspace button')).transitionDuration,
      }))()`,
    );
    await setViewport(cdp, sessionId, 720, 900, 2);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 }, sessionId);
    await delay(120);
    const zoom200 = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        visualScale: visualViewport?.scale ?? null,
        innerWidth,
        innerHeight,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        controlsVisible: [...document.querySelectorAll('.workspace button')].filter((button) => { const rect = button.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; }).length,
        mapSquare: (() => { const rect = document.querySelector('.map-export-source').getBoundingClientRect(); return { width: rect.width, height: rect.height }; })(),
      }))()`,
    );
    await screenshot(cdp, sessionId, join(browserRoot, 'zoom-200.png'));
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }, sessionId);

    await setViewport(cdp, sessionId, 1280, 900);
    await setMedia(cdp, sessionId, 'light', 'no-preference');
    await evaluate(
      cdp,
      sessionId,
      `document.querySelector('path.country-path[tabindex="0"]').focus(); true`,
    );
    const keyboardStart = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        label: document.activeElement?.getAttribute('aria-label'),
        tabindexZeroCount: document.querySelectorAll('path.country-path[tabindex="0"]').length,
        focusedClass: document.activeElement?.classList.contains('focused'),
        tooltip: document.querySelector('[role="tooltip"]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
      }))()`,
    );
    await key(cdp, sessionId, 'ArrowRight', 'ArrowRight');
    const afterArrow = await evaluate(
      cdp,
      sessionId,
      `document.activeElement?.getAttribute('aria-label')`,
    );
    await key(cdp, sessionId, 'End', 'End');
    const afterEnd = await evaluate(
      cdp,
      sessionId,
      `document.activeElement?.getAttribute('aria-label')`,
    );
    await key(cdp, sessionId, 'Home', 'Home');
    const afterHome = await evaluate(
      cdp,
      sessionId,
      `document.activeElement?.getAttribute('aria-label')`,
    );
    await key(cdp, sessionId, 'Enter', 'Enter');
    const afterEnter = await evaluate(
      cdp,
      sessionId,
      `(() => ({ selectedCount: document.querySelectorAll('path.country-path[aria-selected="true"]').length, live: document.querySelector('[data-selection-live-region="true"]')?.textContent?.trim() ?? '' }))()`,
    );
    await key(cdp, sessionId, 'Escape', 'Escape');
    const afterEscape = await evaluate(
      cdp,
      sessionId,
      `(() => ({ selectedCount: document.querySelectorAll('path.country-path[aria-selected="true"]').length, live: document.querySelector('[data-selection-live-region="true"]')?.textContent?.trim() ?? '' }))()`,
    );
    await key(cdp, sessionId, ' ', 'Space');
    const afterSpace = await evaluate(
      cdp,
      sessionId,
      `document.querySelectorAll('path.country-path[aria-selected="true"]').length`,
    );
    const accessibility = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        mapRole: document.querySelector('svg.map-canvas')?.getAttribute('role'),
        mapMultiselectable: document.querySelector('svg.map-canvas')?.getAttribute('aria-multiselectable'),
        options: document.querySelectorAll('path.country-path[role="option"]').length,
        titledOptions: [...document.querySelectorAll('path.country-path')].filter((path) => path.querySelector('title')?.textContent).length,
        bulkCheckboxes: document.querySelectorAll('.country-list input[type="checkbox"]').length,
        liveRegion: document.querySelector('[data-selection-live-region="true"]')?.getAttribute('aria-live'),
        toastRegionCount: document.querySelectorAll('[data-severity]').length,
      }))()`,
    );

    await clickAria(cdp, sessionId, 'Apply Blue');
    await dismissToast(cdp, sessionId);
    await setMedia(cdp, sessionId, 'dark', 'no-preference');
    const coloredDarkExport = await exportAndAnalyze({
      cdp,
      sessionId,
      browserRoot,
      label: 'colored-dark-export',
      downloads,
      downloadProgress,
    });
    await setMedia(cdp, sessionId, 'light', 'no-preference');
    await clickText(cdp, sessionId, 'Reset All Colors');
    await dismissToast(cdp, sessionId);
    const whiteExport = await exportAndAnalyze({
      cdp,
      sessionId,
      browserRoot,
      label: 'all-white-export',
      downloads,
      downloadProgress,
    });

    const baselineConsoleCount = consoleMessages.length;
    const baselineExceptionCount = runtimeExceptions.length;
    const baselineNetworkFailureCount = networkFailures.length;
    const thirdPartyRequests = requests.filter((request) => {
      if (request.url.startsWith('data:') || request.url.startsWith('blob:')) return false;
      try {
        const url = new URL(request.url);
        return url.hostname !== '127.0.0.1' && url.hostname !== 'localhost';
      } catch {
        return true;
      }
    });
    await cdp.send(
      'Network.emulateNetworkConditions',
      {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
        connectionType: 'none',
      },
      sessionId,
    );
    await evaluate(
      cdp,
      sessionId,
      `document.querySelectorAll('path.country-path')[3].dispatchEvent(new MouseEvent('click', { bubbles: true })); true`,
    );
    await delay(60);
    await clickAria(cdp, sessionId, 'Apply Red');
    const offlineColorFill = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('path.country-path[aria-selected="true"]')?.getAttribute('fill')`,
    );
    await dismissToast(cdp, sessionId);
    await clickText(cdp, sessionId, 'Save or Load Maps');
    await setInputValue(cdp, sessionId, 'input[name="map-name"]', 'Offline Map');
    await clickText(cdp, sessionId, 'Save Current Map');
    const offlineSaveToast = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('[data-severity]')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''`,
    );
    await dismissToast(cdp, sessionId);
    await clickText(cdp, sessionId, 'Close Saved Maps');
    const offlineExport = await exportAndAnalyze({
      cdp,
      sessionId,
      browserRoot,
      label: 'offline-export',
      downloads,
      downloadProgress,
    });
    await cdp.send(
      'Network.emulateNetworkConditions',
      {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
        connectionType: 'wifi',
      },
      sessionId,
    );

    const offline = {
      boundary: 'already-loaded only; fresh disconnected reload not tested',
      thirdPartyRequests,
      colorFill: offlineColorFill,
      saveToast: offlineSaveToast,
      export: offlineExport,
      consoleMessagesDuringOffline: consoleMessages.slice(baselineConsoleCount),
      runtimeExceptionsDuringOffline: runtimeExceptions.slice(baselineExceptionCount),
      networkFailuresDuringOffline: networkFailures.slice(baselineNetworkFailureCount),
    };

    const normalConsoleMessages = consoleMessages.slice(0, baselineConsoleCount);
    const normalRuntimeExceptions = runtimeExceptions.slice(0, baselineExceptionCount);
    const normalNetworkFailures = networkFailures.slice(0, baselineNetworkFailureCount);
    const httpFailures = responses.filter((response) => response.status >= 400);
    const finalState = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        pathCount: document.querySelectorAll('path.country-path').length,
        duplicateIds: (() => { const ids = [...document.querySelectorAll('path.country-path')].map((path) => path.getAttribute('data-country-id')); return ids.length - new Set(ids).size; })(),
        workspaceCount: document.querySelectorAll('.workspace').length,
        mapCount: document.querySelectorAll('svg.map-canvas').length,
      }))()`,
    );

    const checks = {
      exactVersion: version.product.startsWith(browser.expectedPrefix),
      preflight:
        preflight.url.startsWith(BASE_URL) &&
        preflight.title === 'CountriesIRL Map Generator' &&
        preflight.pathCount === EXPECTED_PATHS &&
        favicon.status === 200 &&
        favicon.contentType?.includes('image/svg+xml'),
      mapReady:
        mapReadySamples.length === 5 && mapReadySamples.every((sample) => sample < 500),
      onboarding:
        onboardingCopy.includes('Start your map') &&
        onboardingCopy.includes('Select countries, choose a color, then export a square PNG for Instagram.') &&
        onboardingFocus?.includes('current color') &&
        creatorFlowState.coloredCount >= 5 &&
        creatorFlowCompletedAt - creatorFlowStartedAt < 120000 &&
        creatorFlowState.dismissedStorage === 'true' &&
        onboardingAbsentAfterReload &&
        helpReopened &&
        onboardingAbsentAfterHelpReload,
      activeColor:
        zeroSelection.presetCount === 10 &&
        zeroSelection.disabledPresetCount === 10 &&
        effectiveWhite.whiteActive &&
        effectiveWhite.whiteDisabled &&
        effectiveWhite.enabledAlternatives === 9 &&
        activeWhiteBefore.fill === activeWhiteAfter.fill &&
        activeWhiteAfter.marks === 0 &&
        activeWhiteAfter.measures === 0 &&
        activeWhiteAfter.undoDisabled &&
        redState.redActive &&
        redState.redDisabled &&
        redState.whiteEnabled &&
        activeRedAfter.fill === '#DC2626' &&
        activeRedAfter.marks === 0 &&
        activeRedAfter.measures === 0 &&
        undoWhite.fill === '#FFFFFF' &&
        undoWhite.undoDisabled &&
        redoRed === '#DC2626',
      selectionAndCustom:
        checkboxSelectionCount === 3 &&
        selectAllCount === EXPECTED_PATHS &&
        clearedCount === 0 &&
        customResults.map((result) => result.fill).join(',') === '#AABBCC,#1A2B3C,#040506' &&
        invalidResults.every(
          (result) =>
            result.before === result.after &&
            result.error === 'Enter #RGB, #RRGGBB, or rgb values from 0 to 255.' &&
            result.ariaInvalid === 'true' &&
            result.applyDisabled,
        ),
      interactionTimings:
        interactionTimings.color.length === 10 &&
        interactionTimings.undo.length === 10 &&
        interactionTimings.redo.length === 10 &&
        [...interactionTimings.color, ...interactionTimings.undo, ...interactionTimings.redo].every(
          (duration) => duration < 100,
        ) &&
        Object.values(interactionTimings.residualMarks).every((count) => count === 0),
      historyStress:
        boundedUndoCount === 50 &&
        branchRedoDisabled &&
        resetFill === '#FFFFFF' &&
        undoResetFill !== '#FFFFFF' &&
        rapidInteractionCount >= 100 &&
        stressState.pathCount === EXPECTED_PATHS &&
        stressState.uniquePathIds === EXPECTED_PATHS &&
        stressState.selectedCount <= 1,
      persistenceSuccess:
        persistenceSuccess.saveFirstToast.includes('Map saved to this browser.') &&
        persistenceSuccess.saveSecondToast.includes('Map saved to this browser.') &&
        persistenceSuccess.replaceNotice.notice ===
          'A saved map already uses this name. Saving will replace it.' &&
        persistenceSuccess.replaceNotice.action === 'Replace Saved Map' &&
        persistenceSuccess.replaceToast.includes('Saved map replaced.') &&
        persistenceSuccess.savedNamesAfterReload.includes('First Map') &&
        persistenceSuccess.savedNamesAfterReload.includes('Second Map') &&
        persistenceSuccess.historyAfterLoad.undoDisabled &&
        persistenceSuccess.historyAfterLoad.redoDisabled &&
        persistenceSuccess.historyAfterLoad.toast.includes('Saved map loaded.') &&
        persistenceSuccess.secondLoadToast.includes('Saved map loaded.') &&
        !persistenceSuccess.deleteState.names.includes('First Map') &&
        persistenceSuccess.deleteState.toast.includes('Saved map deleted.'),
      persistenceFailures:
        partialLoad.fill === '#DC2626' &&
        partialLoad.severity === 'warning' &&
        partialLoad.status.includes(
          'Saved map loaded, but some invalid saved colors were omitted.',
        ) &&
        malformedStorage.warning ===
          'Some saved maps could not be read and were left out of the list. Your current map is unchanged.' &&
        malformedStorage.pathCount === EXPECTED_PATHS &&
        startupBlocked.alert.includes('This browser blocked local saves.') &&
        startupBlocked.ariaLive === 'assertive' &&
        startupBlocked.pathCount === EXPECTED_PATHS &&
        startupBlocked.exportDisabled === false &&
        startupBlocked.saveDisabled === true &&
        blockedWrite.error.includes('This browser blocked local saves.') &&
        blockedWrite.name === 'Blocked Save' &&
        blockedWrite.fillsPreserved &&
        blockedOnboardingToast.includes('This browser blocked local saves.') &&
        quotaWrite.error.includes('Browser storage is full.') &&
        quotaWrite.name === 'Quota Save' &&
        quotaWrite.fillsPreserved &&
        quotaWrite.savedSectionVisible,
      responsive:
        desktopLayout.workspaceCount === 1 &&
        desktopLayout.mapCount === 1 &&
        desktopLayout.order[0] === '.workspace__map' &&
        Math.abs(desktopLayout.mapSquare.width - desktopLayout.mapSquare.height) < 1 &&
        tabletLayout.order.join(',') ===
          '.workspace__actions,.workspace__map,.workspace__selection-color,.workspace__country-list' &&
        tabletLayout.workspaceCount === 1 &&
        tabletLayout.mapCount === 1 &&
        !tabletLayout.horizontalOverflow &&
        tabletLayout.statePreserved &&
        mobileLayout.order.join(',') ===
          '.workspace__actions,.workspace__map,.workspace__selection-color,.workspace__country-list' &&
        mobileLayout.workspaceCount === 1 &&
        mobileLayout.mapCount === 1 &&
        !mobileLayout.horizontalOverflow &&
        Math.abs(mobileLayout.mapSquare.width - mobileLayout.mapSquare.height) < 1 &&
        mobileLayout.statePreserved,
      tooltipEdges:
        topTooltip.inside &&
        topTooltip.belowAnchor &&
        rightTooltip.inside &&
        rightTooltip.leftOfPointer &&
        bottomTooltip.inside &&
        bottomTooltip.abovePointer,
      modalFocus:
        desktopToCompactFocus.saveControl === 'true' &&
        desktopToCompactFocus.connected &&
        compactToDesktopFocus.saveControl === 'true' &&
        compactToDesktopFocus.connected &&
        mobileModal.rect.width === 360 &&
        mobileModal.rect.height === 800 &&
        mobileModal.ariaModal === 'true' &&
        mobileModal.initialFocus === 'map-name' &&
        focusTrapForward.after === focusTrapForward.first &&
        focusTrapBackward.after === focusTrapBackward.last &&
        escapeRestored,
      themeMotionZoom:
        darkTheme.mediaMatches &&
        darkTheme.mapBackground === 'rgb(255, 255, 255)' &&
        darkTheme.pathCount === EXPECTED_PATHS &&
        reducedMotion.mediaMatches &&
        reducedMotion.pathTransition === '0s' &&
        reducedMotion.buttonTransition === '0s' &&
        zoom200.visualScale === 2 &&
        !zoom200.horizontalOverflow &&
        zoom200.controlsVisible > 0 &&
        Math.abs(zoom200.mapSquare.width - zoom200.mapSquare.height) < 1,
      accessibility:
        keyboardStart.tabindexZeroCount === 1 &&
        keyboardStart.focusedClass &&
        keyboardStart.tooltip.includes('Current color') &&
        afterArrow !== keyboardStart.label &&
        afterEnd !== afterHome &&
        afterEnter.selectedCount === 1 &&
        afterEnter.live.includes('1 country selected') &&
        afterEscape.selectedCount === 0 &&
        afterEscape.live === 'No countries selected.' &&
        afterSpace === 1 &&
        accessibility.mapRole === 'listbox' &&
        accessibility.mapMultiselectable === 'true' &&
        accessibility.options === EXPECTED_PATHS &&
        accessibility.titledOptions === EXPECTED_PATHS &&
        accessibility.bulkCheckboxes === EXPECTED_PATHS &&
        accessibility.liveRegion === 'polite',
      exports:
        coloredDarkExport.elapsedMilliseconds < 3000 &&
        coloredDarkExport.analysis.width === 1080 &&
        coloredDarkExport.analysis.height === 1080 &&
        coloredDarkExport.analysis.opaque &&
        coloredDarkExport.analysis.centered &&
        coloredDarkExport.analysis.presetPixels > 0 &&
        coloredDarkExport.analysis.nearBlackPixels === 0 &&
        whiteExport.elapsedMilliseconds < 3000 &&
        whiteExport.analysis.width === 1080 &&
        whiteExport.analysis.height === 1080 &&
        whiteExport.analysis.opaque &&
        whiteExport.analysis.centered &&
        whiteExport.analysis.presetPixels === 0 &&
        whiteExport.analysis.nearBlackPixels === 0,
      offline:
        thirdPartyRequests.length === 0 &&
        offline.colorFill === '#DC2626' &&
        offline.saveToast.includes('Map saved to this browser.') &&
        offline.export.elapsedMilliseconds < 3000 &&
        offline.export.analysis.width === 1080 &&
        offline.export.analysis.height === 1080 &&
        offline.export.analysis.opaque,
      consoleNetwork:
        normalConsoleMessages.length === 0 &&
        normalRuntimeExceptions.length === 0 &&
        normalNetworkFailures.length === 0 &&
        httpFailures.length === 0,
      finalIntegrity:
        finalState.pathCount === EXPECTED_PATHS &&
        finalState.duplicateIds === 0 &&
        finalState.workspaceCount === 1 &&
        finalState.mapCount === 1,
    };

    const result = {
      browser: {
        id: browser.id,
        name: browser.name,
        route: 'local-direct',
        executable: browser.executable,
        product: version.product,
        protocolVersion: version.protocolVersion,
        revision: version.revision,
        userAgent: version.userAgent,
      },
      head: CURRENT_HEAD,
      baseUrl: BASE_URL,
      preflight,
      favicon,
      mapReadySamples,
      onboarding: {
        copy: onboardingCopy,
        focusAfterStart: onboardingFocus,
        elapsedMilliseconds: creatorFlowCompletedAt - creatorFlowStartedAt,
        state: creatorFlowState,
        absentAfterReload: onboardingAbsentAfterReload,
        helpReopened,
        absentAfterHelpReload: onboardingAbsentAfterHelpReload,
      },
      selectionAndColor: {
        zeroSelection,
        effectiveWhite,
        activeWhiteBefore,
        activeWhiteAfter,
        redState,
        activeRedAfter,
        undoWhite,
        redoRed,
        checkboxSelectionCount,
        selectAllCount,
        clearedCount,
        customResults,
        invalidResults,
      },
      interactionTimings,
      historyStress: {
        distinctEdits: 55,
        boundedUndoCount,
        branchRedoDisabled,
        resetFill,
        undoResetFill,
        rapidInteractionCount,
        stressState,
      },
      persistence: {
        success: persistenceSuccess,
        partialLoad,
        malformedStorage,
        startupBlocked,
        blockedWrite,
        blockedOnboardingToast,
        quotaWrite,
      },
      responsive: {
        desktopLayout,
        tabletLayout,
        mobileLayout,
        stateBeforeResize,
        tooltips: {
          top: { path: topPath, tooltip: topTooltip },
          right: { point: rightPoint, tooltip: rightTooltip },
          bottom: { point: bottomPoint, tooltip: bottomTooltip },
        },
        focusRestoration: { desktopToCompactFocus, compactToDesktopFocus },
        mobileModal,
        focusTrapForward,
        focusTrapBackward,
        escapeRestored,
        darkTheme,
        reducedMotion,
        zoom200,
      },
      keyboardAccessibility: {
        keyboardStart,
        afterArrow,
        afterEnd,
        afterHome,
        afterEnter,
        afterEscape,
        afterSpace,
        accessibility,
      },
      exports: { coloredDarkExport, whiteExport },
      offline,
      consoleNetwork: {
        normalConsoleMessages,
        normalRuntimeExceptions,
        normalNetworkFailures,
        httpFailures,
        thirdPartyRequests,
        responses,
      },
      finalState,
      checks,
      passed: Object.values(checks).every(Boolean),
      completedAt: new Date().toISOString(),
    };
    writeFileSync(
      join(browserRoot, 'comprehensive-evidence.json'),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    return result;
  } finally {
    if (cdp !== undefined) {
      try {
        await cdp.send('Browser.close');
      } catch {
        // Browser may close before acknowledging the command.
      }
      cdp.close();
    }
    await delay(500);
    if (!processHandle.killed) {
      processHandle.kill();
    }
    closeSync(browserLog);
  }
}

mkdirSync(ARTIFACT_ROOT, { recursive: true });
const results = [];
for (const browser of browsers) {
  try {
    results.push(await runBrowser(browser));
  } catch (error) {
    const failure = {
      browser: browser.id,
      error: error instanceof Error ? error.stack ?? error.message : String(error),
      completedAt: new Date().toISOString(),
    };
    writeFileSync(
      join(ARTIFACT_ROOT, `${browser.id}-harness-failure.json`),
      `${JSON.stringify(failure, null, 2)}\n`,
    );
    results.push({ browser: { id: browser.id }, passed: false, harnessFailure: failure });
  }
}

const aggregate = {
  objective: 'Phase 1 Plan 01-15 complete current-code local browser acceptance',
  head: CURRENT_HEAD,
  baseUrl: BASE_URL,
  browsers: results.map((result) => ({
    id: result.browser.id,
    product: result.browser.product ?? null,
    route: result.browser.route ?? 'local-direct',
    passed: result.passed,
    failedChecks: result.checks
      ? Object.entries(result.checks)
          .filter(([, passed]) => !passed)
          .map(([name]) => name)
      : ['harnessFailure'],
  })),
  deferredBrowsers: {
    firefoxCurrent: 'unverified — deferred by user choice per D-61',
    safariCurrent: 'unverified — deferred by user choice per D-61',
    chromePrevious: 'unverified — deferred by user choice per D-61',
    edgePrevious: 'unverified — deferred by user choice per D-61',
    firefoxPrevious: 'unverified — deferred by user choice per D-61',
    safariPrevious: 'unverified — deferred by user choice per D-61',
  },
  dataDecision: {
    presentation: 'Natural Earth 5.1.1 Europe presentation user-approved per D-62',
    featureCount: 57,
    worldVariantInPhase1: false,
    northAmericaVariantInPhase1: false,
  },
  passed: results.length === browsers.length && results.every((result) => result.passed),
  checkpointSemantics: {
    summaryCreated: false,
    stateApproved: false,
    awaitingFinalHumanUatApproval: true,
    resumeSignal: 'approved',
  },
  completedAt: new Date().toISOString(),
};
writeFileSync(
  join(ARTIFACT_ROOT, 'aggregate-evidence.json'),
  `${JSON.stringify(aggregate, null, 2)}\n`,
);
console.log(JSON.stringify(aggregate, null, 2));
if (!aggregate.passed) {
  process.exitCode = 1;
}
