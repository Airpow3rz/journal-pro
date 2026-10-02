// Rappels : bilan de la semaine (vendredi 16 h) et sauvegarde mensuelle.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { exportBackup, markBackupDone } from '../db/backup';
import { activeCounters } from '../lib/counters';
import { toDay, today } from '../lib/dates';
import { saveFile } from '../lib/download';
import { isWorkingDay } from '../lib/workdays';
import { useToast } from './ui/Toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useReview, useSettings } from '../hooks/data';
import { backupDue, currentWeekKey, weeklyReviewDue } from '../lib/reminders';
import { Icon } from './ui/Icon';

const DISMISS_KEY = 'journal-pro-fin-de-journee-masquee';

/** Heure courante rafraîchie chaque minute (pour que la bannière apparaisse à 16 h pile). */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    const onVis = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  return now;
}

export function Banners() {
  const now = useNow();
  const weekKey = currentWeekKey(now);
  const review = useReview(weekKey);
  const settings = useSettings();
  const taskCount = useLiveQuery(() => db.tasks.count(), []) ?? 0;
  const loaded = useLiveQuery(() => db.reviews.count(), []) !== undefined;
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  // Rappel de fin de journée : à partir de 17 h un jour travaillé, si rien n'est saisi.
  const day = toDay(now);
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(DISMISS_KEY); } catch { return null; } });
  const todayTaskCount = useLiveQuery(() => db.tasks.where('date').equals(day).count(), [day]);
  const todayCounts = useLiveQuery(() => db.dailyCounts.get(day).then((c) => c ?? null), [day]);
  const hasTaskToday = !!todayTaskCount;
  const countersEmpty = activeCounters(settings).length > 0 && !Object.values(todayCounts?.values ?? {}).some((v) => v > 0);
  const endOfDay = now.getHours() >= 17 && isWorkingDay(day, settings) && dismissed !== day && todayTaskCount !== undefined && todayCounts !== undefined
    ? (!hasTaskToday && countersEmpty ? 'Aucune tâche ni compteur saisis aujourd’hui.'
      : !hasTaskToday ? 'Aucune tâche saisie aujourd’hui.'
      : countersEmpty ? 'Les compteurs du jour ne sont pas remplis.' : null)
    : null;

  return (
    <>
      {loaded && weeklyReviewDue(now, review) && (
        <Link to={`/bilans?type=week&key=${weekKey}`} className="banner" style={{ textDecoration: 'none' }}>
          <Icon name="chart" />
          <span className="grow"><strong>Faire le bilan de la semaine</strong><br /><span className="small muted">5 minutes pour garder une trace de vos réussites.</span></span>
          <Icon name="right" size={18} />
        </Link>
      )}
      {endOfDay && (
        <div className="banner">
          <Icon name="info" />
          <span className="grow"><strong>Fin de journée</strong><br />
            <span className="small muted">{endOfDay}</span></span>
          <button className="btn small primary" onClick={() => {
            if (!hasTaskToday) navigate('/tache/nouvelle');
            else document.getElementById('compteurs')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}>{hasTaskToday ? 'Compteurs' : 'Saisir'}</button>
          <button className="btn icon ghost" style={{ width: 32, minHeight: 32 }} aria-label="Masquer pour aujourd’hui"
            onClick={() => { try { localStorage.setItem(DISMISS_KEY, day); } catch { /* indisponible */ } setDismissed(day); }}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
      {backupDue(now, settings, taskCount > 0) && (
        <div className="banner warn">
          <Icon name="download" />
          <span className="grow"><strong>Sauvegarde du mois</strong><br />
            <span className="small muted">{settings.lastBackupAt ? 'Dernière sauvegarde il y a plus d’un mois.' : 'Aucune sauvegarde pour le moment.'}</span></span>
          <button className="btn small primary" disabled={saving} onClick={async () => {
            setSaving(true);
            try {
              const data = await exportBackup();
              await saveFile(new Blob([JSON.stringify(data)], { type: 'application/json' }), `journal-pro-sauvegarde-${today()}.json`);
              await markBackupDone();
              toast('Sauvegarde exportée');
            } finally { setSaving(false); }
          }}>{saving ? '…' : 'Sauvegarder'}</button>
        </div>
      )}
    </>
  );
}
