import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TabBar } from './components/TabBar';
import { ToastProvider } from './components/ui/Toast';
import { useSettings } from './hooks/data';
import Dossier from './pages/Dossier';
import Home from './pages/Home';
import Journal from './pages/Journal';
import NoteEdit from './pages/NoteEdit';
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

export default function App() {
  return (
    // HashRouter : les adresses (#/journal…) fonctionnent sur GitHub Pages et hors ligne sans configuration.
    <HashRouter>
      <ToastProvider>
        <ThemeSync />
        <ScrollToTop />
        <div className="app">
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
        </div>
      </ToastProvider>
    </HashRouter>
  );
}
