import { useLocation, useNavigate } from 'react-router-dom';
import { Segmented } from './ui/Segmented';

/** Bascule Tâches / Notes en haut du journal. */
export function JournalTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <div style={{ marginBottom: 12 }}>
      <Segmented value={pathname.startsWith('/notes') ? 'notes' : 'tasks'}
        onChange={(v) => navigate(v === 'notes' ? '/notes' : '/journal', { replace: true })}
        options={[{ value: 'tasks', label: 'Tâches' }, { value: 'notes', label: 'Notes' }]} />
    </div>
  );
}
