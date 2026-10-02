import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ensureRecurringTodos } from './db/recurring';
import { ensureSeed } from './db/seed';
import { today } from './lib/dates';
import './styles/global.css';

// Service worker : met l'app en cache pour le hors-ligne et applique les mises à jour automatiquement.
registerSW({ immediate: true });

const refreshRecurring = () => ensureRecurringTodos(today()).catch(console.error);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshRecurring(); });

ensureSeed().then(refreshRecurring).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
