import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ensureSeed } from './db/seed';
import './styles/global.css';

// Service worker : met l'app en cache pour le hors-ligne et applique les mises à jour automatiquement.
registerSW({ immediate: true });

ensureSeed().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
