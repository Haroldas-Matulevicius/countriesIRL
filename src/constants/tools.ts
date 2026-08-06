import type { ToolId } from '../types/ui';

/**
 * The rail's tool inventory (03-UI-SPEC section "Component Contracts 1").
 *
 * One ordered list, read by the rail rows, by the panel title, and by the
 * stored-preference validator. A second list anywhere would let a tool exist in
 * the rail and not in the panel - or, worse, let a stored id resolve to a tool
 * the rail no longer renders.
 *
 * The `label` is the accessible name, the rail tooltip, and the panel title, in
 * that order of importance. `Close ${label}` is the panel's close control, so a
 * label change here changes four strings at once, on purpose.
 */
export interface ToolDefinition {
  readonly id: ToolId;
  readonly label: string;
}

export const TOOL_DEFINITIONS: ReadonlyArray<ToolDefinition> = [
  { id: 'colors', label: 'Colors' },
  { id: 'countries', label: 'Countries' },
  { id: 'legend', label: 'Legend' },
  { id: 'saved', label: 'Saved Maps' },
];

const TOOL_LABELS = new Map<ToolId, string>(
  TOOL_DEFINITIONS.map(({ id, label }): [ToolId, string] => [id, label]),
);

/**
 * The stored-preference vocabulary. `closed` is a real, writable value rather
 * than an absent key: a creator who closes the panel and reloads must get it
 * back closed, and "absent" already means "never chose" (D-18).
 */
export const CLOSED_TOOL_VALUE = 'closed';

export function isToolId(value: string): value is ToolId {
  return TOOL_LABELS.has(value as ToolId);
}

export function getToolLabel(tool: ToolId): string {
  const label = TOOL_LABELS.get(tool);
  if (label === undefined) {
    throw new Error(`"${tool}" is not in the rail's tool inventory.`);
  }
  return label;
}
