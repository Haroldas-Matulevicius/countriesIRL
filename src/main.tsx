/// <reference types="vite/client" />

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { MapStateProvider } from './providers/MapStateProvider';
import './styles/theme.css';
import './styles/App.css';
import './styles/MapCanvas.css';
import './styles/Controls.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('CountriesIRL root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <MapStateProvider>
      <App />
    </MapStateProvider>
  </StrictMode>,
);
