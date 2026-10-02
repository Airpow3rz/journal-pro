// Bilans hebdo / mensuel / trimestriel / annuel : chiffres calculés + réflexions à remplir.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CategoryBars } from '../components/CategoryBars';
import { TaskCard } from '../components/TaskCard';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { useToast } from '../components/ui/Toast';
import { db, nowIso } from '../db/db';
import { RESPONSIBILITY_LABELS, type PeriodType, type Review, type ResponsibilityLevel } from '../db/schema';
import { useCategories, useReviews, useSettings, useTasks } from '../hooks/data';
import { formatDuration, formatShort, today } from '../lib/dates';
import { childPeriods, PERIOD_LABELS, periodKey, periodLabel, periodRange, shiftPeriod } from '../lib/periods';
import { computeStats, deltaPoints, pct, tasksInRange } from '../lib/stats';
import { countWorkingDays } from '../lib/workdays';

const TYPES: PeriodType[] = ['week', 'month', 'quarter', 'year'];

export const REFLECTION_FIELDS: { key: keyof Pick<Review, 'mainAchievement' | 'newSkill' | 'difficulty' | 'doDifferently'>; label: string }[] = [
  { key: 'mainAchievement', label: 'Ma réussite principale' },
  { key: 'newSkill', label: 'Nouvelle compétence acquise' },
  { key: 'difficulty', label: 'Difficulté rencontrée' },
  { key: 'doDifferently', label: 'Ce que je ferais différemment' },
];

const emptyReview = (type: PeriodType, key: string): Review => ({
  id: key, periodType: type, periodKey: key, mainAchievement: '', newSkill: '', difficulty: '', doDifferently: '', updatedAt: nowIso(),
});

export default function Reviews() {
  const [params, setParams] = useSearchParams();
  const type = (TYPES.includes(params.get('type') as PeriodType) ? params.get('type') : 'week') as PeriodType;
  const key = params.get('key') ?? periodKey(type, today());
  const go = (t: PeriodType, k: string) => setParams({ type: t, key: k }, { replace: true });

  const tasks = useTasks() ?? [];
  const categories = useCategories();
  const settings = useSettings();
  const allReviews = useReviews();
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const range = periodRange(type, key);
  const prevKey = shiftPeriod(type, key, -1);
  const prevRange = periodRange(type, prevKey);
  const periodTasks = useMemo(() => tasksInRange(tasks, range.start, range.end), [tasks, range.start, range.end]);
  const stats = useMemo(() => computeStats(periodTasks, categories), [periodTasks, categories]);
  const prevStats = useMemo(() => computeStats(tasksInRange(tasks, prevRange.start, prevRange.end), categories), [tasks, prevRange.start, prevRange.end, categories]);
  const workingDays = countWorkingDays(range.start, range.end, settings);
  const oosDelta = deltaPoints(stats.outOfScopePct, prevStats.outOfScopePct);
  const countDelta = stats.count - prevStats.count;
  const hasPrev = prevStats.count > 0;
  const isCurrent = key === periodKey(type, today());

  const children = childPeriods(type, key).map((c) => {
    const r = periodRange(c.type, c.key);
    return { ...c, stats: computeStats(tasksInRange(tasks, r.start, r.end), categories), review: allReviews.find((x) => x.id === c.key) };
  });

  return (
    <div className="page">
      <PageHeader title="Bilans" actions={
        <Link to="/dossier" className="btn small"><Icon name="file" size={16} /> Dossier</Link>
      } />
      <Segmented value={type} onChange={(t) => go(t, periodKey(t, today()))}
        options={TYPES.map((t) => ({ value: t, label: PERIOD_LABELS[t] }))} />

      <div className="row" style={{ margin: '14px 0' }}>
        <button className="btn icon" aria-label="Période précédente" onClick={() => go(type, prevKey)}><Icon name="left" /></button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <strong>{periodLabel(type, key)}</strong>
          {!isCurrent && <div><button className="btn small ghost" onClick={() => go(type, periodKey(type, today()))}>Revenir à aujourd’hui</button></div>}
        </div>
        <button className="btn icon" aria-label="Période suivante" onClick={() => go(type, shiftPeriod(type, key, 1))}><Icon name="right" /></button>
      </div>

      <div className="grid-2">
        <div className="card kpi">
          <span className="kpi-value">{stats.count}</span>
          <span className="kpi-label">tâches</span>
          <span className={`kpi-delta ${countDelta > 0 ? 'up' : 'down'}`}>
            {!hasPrev ? 'pas de période précédente' : countDelta === 0 ? '= période préc.' : `${countDelta > 0 ? '+' : '−'}${Math.abs(countDelta)} vs période préc.`}
          </span>
        </div>
        <div className="card kpi">
          <span className="kpi-value">{formatDuration(stats.totalMin)}</span>
          <span className="kpi-label">temps saisi</span>
          <span className="kpi-delta down">{stats.activeDays} jour{stats.activeDays > 1 ? 's' : ''} actif{stats.activeDays > 1 ? 's' : ''} / {workingDays} ouvrés</span>
        </div>
        <div className="card kpi oos" style={{ gridColumn: 'span 2' }}>
          <div className="row">
            <span className="kpi-value">{pct(stats.outOfScopePct)}</span>
            <span className="kpi-label" style={{ flex: 1 }}>de tâches hors fiche de poste<br />({stats.outOfScopeCount} tâche{stats.outOfScopeCount > 1 ? 's' : ''}{stats.outOfScopeMin ? `, ${formatDuration(stats.outOfScopeMin)}` : ''})</span>
            {hasPrev && <span className={`kpi-delta ${oosDelta.diff > 0 ? 'up' : 'down'}`} title={`Période précédente : ${pct(prevStats.outOfScopePct)}`}>{oosDelta.label}<br /><span className="muted" style={{ fontWeight: 400 }}>vs préc.</span></span>}
          </div>
          <div className="progress oos" style={{ marginTop: 8 }}><i style={{ width: `${stats.outOfScopePct}%` }} /></div>
        </div>
      </div>

      <div className="section-title">Répartition par catégorie</div>
      <div className="card"><CategoryBars data={stats.byCategory} total={stats.count} /></div>

      {stats.count > 0 && (
        <>
          <div className="section-title">Niveau de responsabilité</div>
          <div className="card">
            {(Object.keys(RESPONSIBILITY_LABELS) as ResponsibilityLevel[]).map((r) => (
              <div key={r} className="legend-row"><span>{RESPONSIBILITY_LABELS[r]}</span><span className="val">{stats.byResponsibility[r]}</span></div>
            ))}
          </div>
        </>
      )}

      {children.length > 0 && (
        <>
          <div className="section-title">{type === 'quarter' ? 'Bilans mensuels' : 'Bilans trimestriels'}</div>
          {children.map((c) => (
            <div key={c.key} className="card">
              <div className="row">
                <strong style={{ flex: 1 }}>{periodLabel(c.type, c.key)}</strong>
                <button className="btn small ghost" onClick={() => go(c.type, c.key)}>Ouvrir <Icon name="right" size={14} /></button>
              </div>
              <div className="small muted">{c.stats.count} tâches · {formatDuration(c.stats.totalMin)} · {pct(c.stats.outOfScopePct)} hors fiche</div>
              {c.review && REFLECTION_FIELDS.some((f) => c.review![f.key]) ? (
                <dl className="child-review">
                  {REFLECTION_FIELDS.filter((f) => c.review![f.key]).map((f) => (
                    <div key={f.key}><dt>{f.label}</dt><dd>{c.review![f.key]}</dd></div>
                  ))}
                </dl>
              ) : <p className="tiny muted">Réflexions non renseignées.</p>}
            </div>
          ))}
        </>
      )}

      <div className="section-title">Initiatives personnelles ({stats.initiatives.length})</div>
      {stats.initiatives.length ? stats.initiatives.map((t) => <TaskCard key={t.id} task={t} category={catMap.get(t.categoryId)} showDate={formatShort(t.date)} />)
        : <p className="small muted">Aucune tâche marquée « Initiative personnelle ».</p>}

      <div className="section-title">Retours positifs ({stats.feedbacks.length})</div>
      {stats.feedbacks.length ? stats.feedbacks.map((t) => (
        <Link key={t.id} to={`/tache/${t.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div className="small" style={{ fontStyle: 'italic' }}>« {t.feedback} »</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>{formatShort(t.date)}{t.requestedBy ? ` · ${t.requestedBy}` : ''} · {t.description}
            {t.attachmentIds.length > 0 && <> · <Icon name="clip" size={12} /> {t.attachmentIds.length}</>}</div>
        </Link>
      )) : <p className="small muted">Aucun retour enregistré.</p>}

      <Reflections key={key} type={type} periodKey={key} />
    </div>
  );
}

/** Champs de réflexion, enregistrés automatiquement pendant la saisie. */
function Reflections({ type, periodKey: key }: { type: PeriodType; periodKey: string }) {
  // null = aucun bilan enregistré, undefined = chargement en cours.
  const stored = useLiveQuery(() => db.reviews.get(key).then((r) => r ?? null), [key]);
  const toast = useToast();
  const [draft, setDraft] = useState<Review | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (draft === null && stored !== undefined) setDraft(stored ?? emptyReview(type, key));
  }, [stored, draft, type, key]);

  const persist = (r: Review) => db.reviews.put({ ...r, updatedAt: nowIso() });
  const change = (patch: Partial<Review>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(next), 500);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!draft) return null;
  const done = !!draft.completedAt;
  return (
    <>
      <div className="section-title">Mes réflexions</div>
      <div className="card stack reflection">
        {REFLECTION_FIELDS.map((f) => (
          <label key={f.key} className="field">
            {f.label}
            <textarea rows={2} value={draft[f.key]} onChange={(e) => change({ [f.key]: e.target.value })} onBlur={() => persist(draft)} />
          </label>
        ))}
        <button className={`btn ${done ? '' : 'primary'}`} onClick={async () => {
          const next = { ...draft, completedAt: done ? undefined : nowIso() };
          setDraft(next);
          await persist(next);
          if (!done) toast('Bilan marqué comme fait ✓');
        }}>
          <Icon name="check" size={18} /> {done ? 'Bilan fait · rouvrir' : 'Marquer le bilan comme fait'}
        </button>
      </div>
    </>
  );
}
