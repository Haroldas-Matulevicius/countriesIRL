import { MoonIcon } from '../icons/MoonIcon';
import { SunIcon } from '../icons/SunIcon';
import type { EditorThemeMode } from '../../types/ui';

const TOGGLE_GLYPH_SIZE = 20;

/**
 * The accessible name states the DESTINATION, not the current state. "Dark
 * theme" on a control that switches to dark reads, to a screen-reader user, as
 * a label for where they already are.
 */
const TOGGLE_LABELS: Readonly<Record<EditorThemeMode, string>> = {
  light: 'Switch to dark theme',
  dark: 'Switch to light theme',
};

interface ThemeToggleProps {
  readonly mode: EditorThemeMode;
  readonly onToggle: () => void;
}

/**
 * D-30. A NEUTRAL control, deliberately: per D-05 the rail's one Apple Blue
 * surface is `Export PNG`, so the toggle gets the ghost treatment instead -
 * transparent background, `--themely-nav-ink` glyph, Porcelain on hover.
 *
 * It reads no operating-system colour preference, not even to seed a first-run
 * default. The standalone app opens light, the creator's explicit choice is
 * persisted through the storage adapter, and a future host that owns `.dark`
 * has no OS listener here to fight.
 */
export function ThemeToggle({ mode, onToggle }: ThemeToggleProps): JSX.Element {
  const label = TOGGLE_LABELS[mode];

  return (
    <button
      type="button"
      className="tool-rail__action theme-toggle"
      data-theme-toggle="true"
      aria-label={label}
      aria-pressed={mode === 'dark'}
      onClick={onToggle}
    >
      {mode === 'dark' ? (
        <MoonIcon size={TOGGLE_GLYPH_SIZE} />
      ) : (
        <SunIcon size={TOGGLE_GLYPH_SIZE} />
      )}
      <span className="rail-tooltip" data-editor-only="true" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}
