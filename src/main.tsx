/// <reference types="vite/client" />

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from './components/ErrorBoundary';
import { MapEditor } from './components/editor/MapEditor';
import { FatalErrorState } from './components/FatalErrorState';
import './styles/theme.css';
import './styles/App.css';
import './styles/MapCanvas.css';
/*
 * The seven surfaces `Controls.css` split into, plus the toast, in the order
 * the single file declared them. Order is pinned rather than incidental: two
 * rules of equal specificity are decided by source order, so an alphabetised
 * or reshuffled list is a silent restyle. Where a rule crossed two surfaces the
 * split gave it ONE home, so nothing here depends on a rule in a later file.
 */
import './styles/controls/controls.css';
import './styles/controls/selectionPanel.css';
import './styles/controls/colorPicker.css';
/* `04-01`: the new `map-style` flyout, placed beside the other colour surface. */
import './styles/controls/mapStyle.css';
import './styles/controls/countryList.css';
import './styles/controls/saveLoad.css';
import './styles/controls/toast.css';
import './styles/controls/legendEditor.css';
import './styles/controls/locateCountry.css';
/*
 * Last, so the shell's structural rules win over the surface rules above it.
 * Assertion 20 in `src/styles/uiContract.test.ts` compares this list against a
 * recursive walk of `src/styles` AS SETS - a stylesheet in one and not the
 * other is the defect, in either direction.
 */
import './styles/editor.css';

function reloadPage(): void {
  window.location.reload();
}

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('CountriesIRL root element was not found.');
}

/*
 * The host's job, and all of it: place one element and mount one component.
 * The page-level reload affordance stays here rather than inside the editor -
 * reloading the page is the host's decision, and an editor that took it would
 * be assuming it owns the page it is mounted into.
 */
createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary fallback={<FatalErrorState onReload={reloadPage} />}>
      <MapEditor />
    </ErrorBoundary>
  </StrictMode>,
);
