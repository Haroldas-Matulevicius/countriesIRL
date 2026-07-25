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
