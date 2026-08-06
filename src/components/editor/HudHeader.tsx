import { MapIcon } from '../icons/MapIcon';

const PRODUCT_NAME = 'CountriesIRL Map Generator';
const PRODUCT_TAGLINE =
  'Color the world, frame your view, and export a polished map.';
const SAVED_LABEL = 'Saved';
const UNSAVED_LABEL = 'Unsaved changes';
const CHIP_GLYPH_SIZE = 20;

interface HudHeaderProps {
  /**
   * Composition identity owned by the composition root. It is set only on a
   * committed save or load, cleared by `Reset All Colors` and by deleting the
   * saved map it names, and never written by undo/redo. The layout move does
   * not change that - this component only displays it.
   */
  readonly compositionName: string | null;
  readonly isDirty: boolean;
}

/**
 * The first letter of each of the first two words, so `Baltic Tour 2026` reads
 * `BT`. Deliberately not an emoji, an avatar, or a colour hash: D-12 gives this
 * chip a Powder background and an Apple-Blue-free monogram, and the rail's one
 * accent is Export.
 */
function getMonogram(name: string): string | null {
  const initials = name
    .split(/\s+/u)
    .map((word): string => word.trim())
    .filter((word): boolean => word.length > 0)
    .slice(0, 2)
    .map((word): string => (word[0] ?? '').toUpperCase())
    .join('');

  return initials.length === 0 ? null : initials;
}

/**
 * The pinned identity block (D-12). Above the tools, never scrolling away.
 *
 * At 56px the name and the pill are `opacity: 0` and clipped by the rail's
 * width - they are removed from view by TRUNCATION, never by `display: none`,
 * so the block keeps its accessible content in both states. When the panel is
 * open the header widens over the panel track to 336px and shows the full
 * block; `.tool-panel__body` reserves that height so nothing is covered.
 *
 * The product name and tagline live here, visually hidden. `03-05` left them in
 * `AppHeader`'s `.panel-header`, which `03-06` retires along with the panel
 * header itself - the editor shell the UI-SPEC describes has no product
 * identity surface. They are kept rather than deleted because the document
 * needs exactly one `h1`, and losing a landmark between two plans is the defect
 * T-03-20 names.
 */
export function HudHeader({
  compositionName,
  isDirty,
}: HudHeaderProps): JSX.Element {
  const monogram =
    compositionName === null ? null : getMonogram(compositionName);

  return (
    <div className="tool-rail__header">
      <span className="hud-header__chip" aria-hidden="true">
        {monogram === null ? <MapIcon size={CHIP_GLYPH_SIZE} /> : monogram}
      </span>

      <div className="hud-header__identity">
        <h1 className="hud-header__product">{PRODUCT_NAME}</h1>
        <p className="hud-header__tagline">{PRODUCT_TAGLINE}</p>
        {compositionName === null ? null : (
          <span className="hud-header__name" title={compositionName}>
            {compositionName}
          </span>
        )}
      </div>

      {/*
        Two states, and there is no third. `Saved` means "no unsaved changes",
        which is what the composition root's dirty flag actually measures - it
        is not a claim that a stored record exists.
      */}
      <span className="hud-header__pill" data-dirty={isDirty ? 'true' : 'false'}>
        {isDirty ? UNSAVED_LABEL : SAVED_LABEL}
      </span>
    </div>
  );
}
