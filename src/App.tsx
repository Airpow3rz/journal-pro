import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LockScreen } from './components/LockScreen';
import { TabBar } from './components/TabBar';
import { db } from './db/db';
import { ToastProvider } from './components/ui/Toast';
import { useSettings } from './hooks/data';
import Dossier from './pages/Dossier';
import Home from './pages/Home';
import Journal from './pages/Journal';
import NoteEdit from './pages/NoteEdit';
import Onboarding from './pages/Onboarding';
import Notes from './pages/Notes';
import Reviews from './pages/Reviews';
import Settings from './pages/Settings';
import TaskEdit from './pages/TaskEdit';

/** Applique le thème choisi (automatique = suit le réglage du système). */
function ThemeSync() {
  const { theme } = useSettings();
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/** Délai en arrière-plan au-delà duquel l'app se reverrouille. */
const RELOCK_AFTER_MS = 60_000;

/**
 * Affiche l'écran de premier lancement, puis l'écran de verrouillage si un code est défini.
 * Un code créé pendant la session ne reverrouille pas immédiatement l'app.
 */
function Gate({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(() => db.settings.get('settings'), []);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    if (settings && unlocked === null) setUnlocked(!settings.pinHash);
  }, [settings, unlocked]);

  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > RELOCK_AFTER_MS) setUnlocked(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (!settings || unlocked === null) return null;
  if (!settings.onboarded) return <Onboarding settings={settings} />;
  if (settings.pinHash && !unlocked) return <LockScreen settings={settings} onUnlock={() => setUnlocked(true)} />;
  return <>{children}</>;
}

export default function App() {
  return (
    // HashRouter : les adresses (#/journal…) fonctionnent sur GitHub Pages et hors ligne sans configuration.
    <HashRouter>
      <ToastProvider>
        <ThemeSync />
        <ScrollToTop />
        <div className="app">
          <Gate>
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/tache/nouvelle" element={<TaskEdit key="new" />} />
            <Route path="/tache/:id" element={<TaskEdit />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/nouvelle" element={<NoteEdit key="new" />} />
            <Route path="/notes/:id" element={<NoteEdit />} />
            <Route path="/bilans" element={<Reviews />} />
            <Route path="/dossier" element={<Dossier />} />
            <Route path="/parametres" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ErrorBoundary>
          <TabBar />
          </Gate>
        </div>
      </ToastProvider>
    </HashRouter>
  );
}
