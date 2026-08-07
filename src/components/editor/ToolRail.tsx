import type { ReactNode, RefObject } from 'react';

import { TOOL_DEFINITIONS } from '../../constants/tools';
import type { ToolId } from '../../types/ui';
import { DropletIcon } from '../icons/DropletIcon';
import { FolderIcon } from '../icons/FolderIcon';
import { LayersIcon } from '../icons/LayersIcon';
import { ListIcon } from '../icons/ListIcon';
import { PaletteIcon } from '../icons/PaletteIcon';
import { RedoIcon } from '../icons/RedoIcon';
import { UndoIcon } from '../icons/UndoIcon';
import { ToolRailRow, type ToolRailIconHandle } from './ToolRailRow';

/** D-28: 20px, always through the `size` prop, never through className sizing. */
const RAIL_GLYPH_SIZE = 20;

type IconRenderer = (iconRef: RefObject<ToolRailIconHandle>) => ReactNode;

/**
 * Glyph per tool, keyed on the tool id rather than on the row's position in the
 * list. `03-UI-SPEC` section "Tool inventory and icon selection" owns this
 * mapping; the labels come from `constants/tools.ts` so the rail, the panel
 * title, and the stored-preference validator cannot disagree.
 */
const TOOL_ICONS: Readonly<Record<ToolId, IconRenderer>> = {
  colors: (iconRef): ReactNode => (
    <PaletteIcon ref={iconRef} size={RAIL_GLYPH_SIZE} />
  ),
  'map-style': (iconRef): ReactNode => (
    <DropletIcon ref={iconRef} size={RAIL_GLYPH_SIZE} />
  ),
  countries: (iconRef): ReactNode => (
    <ListIcon ref={iconRef} size={RAIL_GLYPH_SIZE} />
  ),
  legend: (iconRef): ReactNode => (
    <LayersIcon ref={iconRef} size={RAIL_GLYPH_SIZE} />
  ),
  saved: (iconRef): ReactNode => (
    <FolderIcon ref={iconRef} size={RAIL_GLYPH_SIZE} />
  ),
};

interface ToolRailProps {
  readonly panelId: string;
  readonly openTool: ToolId | null;
  readonly onSelectTool: (tool: ToolId) => void;
  readonly registerToolRow: (
    tool: ToolId,
    element: HTMLButtonElement | null,
  ) => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly isMapReady: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  /** D-12 identity block. Pinned above the tools; it never scrolls away. */
  readonly header: ReactNode;
  /** D-13 Export + D-30 theme toggle. Pinned below; never scrolls away. */
  readonly footer: ReactNode;
}

/**
 * The 56px icon strip (D-16). Always present, at every width, in every layout.
 *
 * It is chrome (`data-editor-only="true"`) and never reaches the export clone.
 * Only `.tool-rail__tools` scrolls: the header and the footer are pinned
 * siblings of that scroll container, which is what makes "never scrolls away"
 * a structural property rather than a styling promise.
 */
export function ToolRail({
  panelId,
  openTool,
  onSelectTool,
  registerToolRow,
  canUndo,
  canRedo,
  isMapReady,
  onUndo,
  onRedo,
  header,
  footer,
}: ToolRailProps): JSX.Element {
  return (
    <div className="tool-rail" data-editor-only="true">
      {header}

      <div className="tool-rail__tools">
        {TOOL_DEFINITIONS.map(({ id, label }): JSX.Element => (
          <ToolRailRow
            key={id}
            rowId={id}
            label={label}
            isExpanded={openTool === id}
            controlsId={panelId}
            renderIcon={TOOL_ICONS[id]}
            onActivate={(): void => onSelectTool(id)}
            rowRef={(element): void => registerToolRow(id, element)}
          />
        ))}

        {/*
          The two pinned non-tool rows: same recipe, no `aria-expanded`,
          because they expand nothing. Labels are unchanged from Phase 2 - the
          e2e locators and the toast allowlist are keyed to them.
        */}
        <ToolRailRow
          rowId="undo"
          label="Undo Color Change"
          isDisabled={!isMapReady || !canUndo}
          renderIcon={(iconRef): ReactNode => (
            <UndoIcon ref={iconRef} size={RAIL_GLYPH_SIZE} />
          )}
          onActivate={onUndo}
        />
        <ToolRailRow
          rowId="redo"
          label="Redo Color Change"
          isDisabled={!isMapReady || !canRedo}
          renderIcon={(iconRef): ReactNode => (
            <RedoIcon ref={iconRef} size={RAIL_GLYPH_SIZE} />
          )}
          onActivate={onRedo}
        />
      </div>

      {footer}
    </div>
  );
}
