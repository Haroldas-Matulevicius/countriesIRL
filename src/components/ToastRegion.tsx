import type { ToastMessage } from '../types/ui';
import {
  LEGEND_LABEL_FIT_MESSAGE,
  LEGEND_OVERFLOW_MESSAGE,
} from '../utils/legend';
import { APPROVED_PERIOD_ANNOUNCEMENTS } from '../utils/periods';

const EXPORT_FAILURE_MESSAGE =
  'The PNG could not be created. Refresh the page and try Export PNG again.';
const FALLBACK_ERROR_MESSAGE =
  'The operation could not be completed. Please try again.';
const FALLBACK_STATUS_MESSAGE = 'Map updated.';
const FALLBACK_WARNING_MESSAGE = 'The operation completed with a warning.';
const LEGACY_LOAD_WARNING =
  'Older saved map loaded with a modern world view. Save it again to keep the full composition.';
const REPAIRED_COMPOSITION_WARNING =
  'Saved map loaded, but some unavailable settings were restored to safe defaults.';
const PARTIAL_LOAD_WARNING =
  'Saved map loaded, but some invalid saved colors were omitted.';
const APPROVED_LOAD_WARNING_MESSAGES = [
  LEGACY_LOAD_WARNING,
  REPAIRED_COMPOSITION_WARNING,
  PARTIAL_LOAD_WARNING,
  `${LEGACY_LOAD_WARNING} ${REPAIRED_COMPOSITION_WARNING}`,
  `${LEGACY_LOAD_WARNING} ${PARTIAL_LOAD_WARNING}`,
  `${REPAIRED_COMPOSITION_WARNING} ${PARTIAL_LOAD_WARNING}`,
  `${LEGACY_LOAD_WARNING} ${REPAIRED_COMPOSITION_WARNING} ${PARTIAL_LOAD_WARNING}`,
] as const;

const APPROVED_STATIC_MESSAGES = new Set<string>([
  'No countries selected.',
  'Color change undone.',
  'Color change redone.',
  'All colors reset. Use Undo Color Change to restore them.',
  'Map saved to this browser.',
  'Saved map replaced.',
  'Saved map loaded.',
  'Saved map deleted.',
  'PNG downloaded at 1080 × 1080.',
  'This browser blocked local saves. You can keep editing and export a PNG, but maps cannot be saved here.',
  'Browser storage is full. Delete an older saved map, then save this map again.',
  'Some saved maps could not be read and were left out of the list. Your current map is unchanged.',
  ...APPROVED_LOAD_WARNING_MESSAGES,
  'Legend added. Open Legend to edit labels.',
  'Legend position updated.',
  'Legend order updated.',
  'Legend moved to Top left.',
  'Legend moved to Top right.',
  'Legend moved to Bottom left.',
  'Legend moved to Bottom right.',
  EXPORT_FAILURE_MESSAGE,
  // A legend-blocked export names the actual problem and its clearing action
  // instead of telling the user to refresh (which would destroy the unsaved
  // map). Both strings are the exact output of `getLegendBlockingMessage`, so
  // the allowlist stays fail-closed on anything else.
  LEGEND_LABEL_FIT_MESSAGE,
  LEGEND_OVERFLOW_MESSAGE,
  // Reset View and the period switch announce approved copy only: a period
  // label supplied by the catalog can never reach the live region.
  ...APPROVED_PERIOD_ANNOUNCEMENTS,
]);

const SELECTION_MESSAGE_PATTERN = /^\d+ (?:country|countries) selected\.$/;
const COLOR_MESSAGE_PATTERN =
  /^Applied (?:Red|Green|Blue|Yellow|Magenta|Cyan|Orange|Violet|White|Gray|#[0-9A-F]{6}) to \d+ (?:country|countries)\.$/;
const CENTERED_MESSAGE_PATTERN =
  /^Centered on [\p{L}\p{N} .,'’()&-]{1,100}\.$/u;
/**
 * Legend labels accept any character up to 32 (`LegendEditor` + `legend.ts`),
 * so the guard bounds the label by length rather than allowlisting a partial
 * charset - an allowlist silently degraded legal labels such as
 * `Allies & "Central Powers"`, `Trip 2024 → 2025`, `50% visited`, `A–B route`,
 * or any emoji to the generic "Map updated.". React escapes the label when it
 * renders it as text; the guard stays fail-closed for control characters
 * (including newlines and bidi overrides) so an announcement can never be
 * spoofed across lines.
 */
const LEGEND_REORDER_MESSAGE_PATTERN =
  /^Moved ([^\p{Cc}\p{Cf}\p{Cn}\p{Co}\p{Cs}\p{Zl}\p{Zp}]{1,32}) to position (\d{1,2}) of (\d{1,2})\.$/u;

function isApprovedLegendReorderMessage(message: string): boolean {
  const match = LEGEND_REORDER_MESSAGE_PATTERN.exec(message);
  if (match === null) {
    return false;
  }
  const position = Number(match[2]);
  const count = Number(match[3]);
  return position >= 1 && count >= 1 && position <= count && count <= 30;
}

function countryCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'country' : 'countries'}`;
}

export const TOAST_MESSAGES = {
  noSelection: 'No countries selected.',
  selectionCount: (count: number): string =>
    `${countryCountLabel(count)} selected.`,
  presetApplied: (colorName: string, count: number): string =>
    `Applied ${colorName} to ${countryCountLabel(count)}.`,
  customColorApplied: (normalizedHex: string, count: number): string =>
    `Applied ${normalizedHex} to ${countryCountLabel(count)}.`,
  undo: 'Color change undone.',
  redo: 'Color change redone.',
  reset: 'All colors reset. Use Undo Color Change to restore them.',
  saved: 'Map saved to this browser.',
  replaced: 'Saved map replaced.',
  loaded: 'Saved map loaded.',
  deleted: 'Saved map deleted.',
  exportSucceeded: 'PNG downloaded at 1080 × 1080.',
  storageUnavailable:
    'This browser blocked local saves. You can keep editing and export a PNG, but maps cannot be saved here.',
  storageFull:
    'Browser storage is full. Delete an older saved map, then save this map again.',
  corruptStorage:
    'Some saved maps could not be read and were left out of the list. Your current map is unchanged.',
  exportFailed: EXPORT_FAILURE_MESSAGE,
} as const;

interface ToastRegionProps {
  message: ToastMessage | null;
  onDismiss: (messageId: string) => void;
}

function getStatusLabel(severity: ToastMessage['severity']): string {
  switch (severity) {
    case 'success':
      return 'Success';
    case 'info':
      return 'Information';
    case 'warning':
      return 'Warning';
    case 'error':
      return 'Error';
  }
}

function getSafeMessage(message: ToastMessage): string {
  if (
    APPROVED_STATIC_MESSAGES.has(message.message) ||
    SELECTION_MESSAGE_PATTERN.test(message.message) ||
    COLOR_MESSAGE_PATTERN.test(message.message) ||
    CENTERED_MESSAGE_PATTERN.test(message.message) ||
    isApprovedLegendReorderMessage(message.message)
  ) {
    return message.message;
  }

  if (message.severity === 'error') {
    return FALLBACK_ERROR_MESSAGE;
  }

  if (message.severity === 'warning') {
    return FALLBACK_WARNING_MESSAGE;
  }

  return FALLBACK_STATUS_MESSAGE;
}

export function ToastRegion({
  message,
  onDismiss,
}: ToastRegionProps): JSX.Element | null {
  if (message === null) {
    return null;
  }

  const isError = message.severity === 'error';
  const safeMessage = getSafeMessage(message);
  const canRetryExport =
    isError &&
    safeMessage === EXPORT_FAILURE_MESSAGE &&
    message.retry !== undefined;

  return (
    <section
      key={message.id}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      data-severity={message.severity}
    >
      <strong>{getStatusLabel(message.severity)}:</strong>{' '}
      <span>{safeMessage}</span>
      <div>
        {canRetryExport ? (
          <button type="button" onClick={message.retry}>
            Try Export Again
          </button>
        ) : null}
        <button type="button" onClick={() => onDismiss(message.id)}>
          Dismiss Message
        </button>
      </div>
    </section>
  );
}
