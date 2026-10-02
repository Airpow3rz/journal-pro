// Accueil : bouton « + Tâche », modèles favoris, série de jours ouvrés, aperçu de la semaine.
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banners } from '../components/Banners';
import { TaskCard } from '../components/TaskCard';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { useCategories, useSettings, useTasks, useTemplates } from '../hooks/data';
import { addDays, capitalize, formatDuration, formatLong, parseDay, today } from '../lib/dates';
import { periodKey, periodRange } from '../lib/periods';
import { computeStats, pct, tasksInRange } from '../lib/stats';
import { computeStreak, isWorkingDay } from '../lib/workdays';

const DAY_LETTERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

export default function Home() {
  const navigate = useNavigate();
  const tasks = useTasks();
  const categories = useCategories();
  const settings = useSettings();
  const templates = useTemplates();
  const day = today();
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const week = periodRange('week', periodKey('week', day));
  const weekTasks = useMemo(() => tasksInRange(tasks ?? [], week.start, week.end), [tasks, week.start, week.end]);
  const stats = useMemo(() => computeStats(weekTasks, categories), [weekTasks, categories]);
  const streak = useMemo(() => computeStreak(new Set((tasks ?? []).map((t) => t.date)), day, settings), [tasks, day, settings]);

  const perDay = [0, 1, 2, 3, 4].map((i) => {
    const d = addDays(week.start, i);
    return { d, n: weekTasks.filter((t) => t.date === d).length, working: isWorkingDay(d, settings) };
  });
  const maxPerDay = Math.max(3, ...perDay.map((p) => p.n));
  const todayTasks = (tasks ?? []).filter((t) => t.date === day);
  const hour = new Date().getHours();

  return (
    <div className="page">
      <PageHeader title={hour < 18 ? 'Bonjour' : 'Bonsoir'} />
      <p className="muted" style={{ marginTop: -12, marginBottom: 16 }}>{capitalize(formatLong(day))}</p>

      <Banners />

      <button className="btn big-add" onClick={() => navigate('/tache/nouvelle')}>
        <Icon name="plus" size={26} /> Tâche
      </button>

      {templates.length > 0 && (
        <>
          <div className="section-title">Modèles favoris</div>
          <div className="chips-scroll">
            {templates.map((t) => (
              <button key={t.id} className="chip" onClick={() => navigate(`/tache/nouvelle?modele=${t.id}`)}>
                <Icon name="bolt" size={15} /> {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Cette semaine</div>
      <div className="card">
        <div className="streak">
          <Icon name="flame" size={30} className="" />
          <div>
            <div className="streak-num">{streak.count}</div>
            <div className="tiny muted">jour{streak.count > 1 ? 's' : ''} ouvré{streak.count > 1 ? 's' : ''} consécutif{streak.count > 1 ? 's' : ''}</div>
          </div>
          <div className="spacer" />
          <div className="small muted" style={{ textAlign: 'right', maxWidth: 170 }}>
            {!streak.todayIsWorkingDay ? 'Jour non travaillé : la série est préservée.'
              : streak.todayDone ? 'Journée renseignée ✓' : 'Une saisie aujourd’hui prolonge la série.'}
          </div>
        </div>
        <div className="week-dots">
          {perDay.map((p, i) => (
            <div key={p.d} className={`week-dot ${p.d === day ? 'today' : ''} ${p.working ? '' : 'off'}`}
              title={p.working ? `${p.n} tâche(s)` : 'Jour non travaillé'}>
              <div className="bar"><i style={{ height: `${(p.n / maxPerDay) * 100}%` }} /></div>
              {DAY_LETTERS[i]} {parseDay(p.d).getDate()}
            </div>
          ))}
        </div>
      </div>

      <div className="grid-3" style={{ marginTop: 10 }}>
        <div className="card kpi"><span className="kpi-value">{stats.count}</span><span className="kpi-label">tâches</span></div>
        <div className="card kpi"><span className="kpi-value">{formatDuration(stats.totalMin)}</span><span className="kpi-label">temps saisi</span></div>
        <div className="card kpi oos"><span className="kpi-value">{pct(stats.outOfScopePct)}</span><span className="kpi-label">hors fiche</span></div>
      </div>

      <div className="section-title row"><span>Aujourd’hui</span><span className="spacer" /><Link to="/journal" className="tiny">Tout le journal</Link></div>
      {tasks === undefined ? null : todayTasks.length === 0 ? (
        <div className="empty card">Rien de saisi aujourd’hui pour l’instant.</div>
      ) : (
        todayTasks.map((t) => <TaskCard key={t.id} task={t} category={catMap.get(t.categoryId)} />)
      )}
    </div>
  );
}
