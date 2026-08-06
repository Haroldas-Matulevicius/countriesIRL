/// <reference types="vite/client" />

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FatalErrorState } from './components/FatalErrorState';
import { CompositionStateProvider } from './providers/CompositionStateProvider';
import { MapStateProvider } from './providers/MapStateProvider';
import './styles/theme.css';
import './styles/App.css';
import './styles/MapCanvas.css';
import './styles/Controls.css';
/*
 * Last, so the shell's structural rules win over the page-measure rules the
 * app bar and inspector still carry. Note for 03-10: the successor contract
 * test globs `src/styles/**` and its assertion 20 compares that count with the
 * imports here - a stylesheet added to one and not the other is the defect.
 */
import './styles/editor.css';

function reloadPage(): void {
  window.location.reload();
}

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('CountriesIRL root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary fallback={<FatalErrorState onReload={reloadPage} />}>
      <MapStateProvider>
        <CompositionStateProvider>
          <App />
        </CompositionStateProvider>
      </MapStateProvider>
    </ErrorBoundary>
  </StrictMode>,
);
