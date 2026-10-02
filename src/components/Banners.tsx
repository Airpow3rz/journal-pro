// Rappels : bilan de la semaine (vendredi 16 h) et sauvegarde mensuelle.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useReview, useSettings } from '../hooks/data';
import { backupDue, currentWeekKey, weeklyReviewDue } from '../lib/reminders';
import { Icon } from './ui/Icon';

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

  return (
    <>
      {loaded && weeklyReviewDue(now, review) && (
        <Link to={`/bilans?type=week&key=${weekKey}`} className="banner" style={{ textDecoration: 'none' }}>
          <Icon name="chart" />
          <span className="grow"><strong>Faire le bilan de la semaine</strong><br /><span className="small muted">5 minutes pour garder une trace de vos réussites.</span></span>
          <Icon name="right" size={18} />
        </Link>
      )}
      {backupDue(now, settings, taskCount > 0) && (
        <Link to="/parametres#sauvegarde" className="banner warn" style={{ textDecoration: 'none' }}>
          <Icon name="download" />
          <span className="grow"><strong>Pensez à sauvegarder vos données</strong><br />
            <span className="small muted">{settings.lastBackupAt ? 'Dernière sauvegarde il y a plus d’un mois.' : 'Aucune sauvegarde pour le moment.'}</span></span>
          <Icon name="right" size={18} />
        </Link>
      )}
    </>
  );
}
