// Dossier de négociation : aperçu de l'année, choix et ordre du Top 10, génération du PDF.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { db } from '../db/db';
import type { Task } from '../db/schema';
import { updateSettings, useCategories, useSettings, useTasks } from '../hooks/data';
import { tasksToCsv } from '../lib/csv';
import { formatDuration, formatShort, today } from '../lib/dates';
import { saveFile } from '../lib/download';
import { periodRange } from '../lib/periods';
import { computeStats, pct, tasksInRange } from '../lib/stats';
import { resolveTop } from '../pdf/data';
import { buildPitch } from '../lib/pitch';
import { allCounters, counterTotals } from '../lib/counters';
import { useToast } from '../components/ui/Toast';

export default function Dossier() {
  const tasks = useTasks() ?? [];
  const categories = useCategories();
  const settings = useSettings();
  const currentYear = today().slice(0, 4);
  const years = useMemo(() => {
    const ys = new Set(tasks.map((t) => t.date.slice(0, 4)));
    ys.add(currentYear);
    return [...ys].sort().reverse();
  }, [tasks, currentYear]);
  const [year, setYear] = useState(currentYear);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { start, end } = periodRange('year', year);
  const yearTasks = useMemo(() => tasksInRange(tasks, start, end), [tasks, start, end]);
  const stats = useMemo(() => computeStats(yearTasks, categories), [yearTasks, categories]);
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const top = resolveTop(yearTasks, settings.dossierTopIds?.[year]);
  const otherStarred = stats.starred.filter((t) => !top.includes(t));
  const attachmentCount = useLiveQuery(async () => {
    const ids = new Set([...stats.feedbacks, ...top].map((t) => t.id));
    return (await db.attachments.toArray()).filter((a) => ids.has(a.taskId)).length;
  }, [stats.feedbacks.length, top.map((t) => t.id).join()]) ?? 0;

  const counts = useLiveQuery(() => db.dailyCounts.where('date').between(start, end, true, true).toArray(), [start, end]) ?? [];
  const pitch = useMemo(() => {
    const quarterOosPct = [1, 2, 3, 4].map((q) => {
      const r = periodRange('quarter', `${year}-Q${q}`);
      const st = computeStats(tasksInRange(yearTasks, r.start, r.end), categories);
      return st.count ? st.outOfScopePct : null;
    });
    return buildPitch({ year, tasks: yearTasks, categories, stats, quarterOosPct, weeklyHours: settings.weeklyHours,
      volumes: counterTotals(counts, allCounters(settings), start, end) });
  }, [year, yearTasks, categories, stats, counts, settings, start, end]);
  const toast = useToast();

  const saveOrder = (list: Task[]) => updateSettings({ dossierTopIds: { ...(settings.dossierTopIds ?? {}), [year]: list.map((t) => t.id) } });
  const move = (i: number, delta: number) => {
    const list = [...top];
    const [item] = list.splice(i, 1);
    list.splice(i + delta, 0, item);
    saveOrder(list);
  };
  const swapIn = (t: Task) => {
    // Le Top 10 est plein : la nouvelle tâche remplace la dernière.
    const list = top.length >= 10 ? [...top.slice(0, 9), t] : [...top, t];
    saveOrder(list);
  };
  const removeFromTop = async (t: Task) => {
    await db.tasks.update(t.id, { starred: false });
  };

  const generate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { buildDossierPdf } = await import('../pdf/buildDossier');
      const { blob, warnings } = await buildDossierPdf(year);
      await saveFile(blob, `dossier-activite-${year}.pdf`);
      setMsg(warnings.length ? `Dossier généré, avec des remarques : ${warnings.join(' ; ')}` : 'Dossier généré.');
    } catch (e) {
      console.error(e);
      setMsg(`Erreur lors de la génération : ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => saveFile(new Blob([tasksToCsv(tasks, categories)], { type: 'text/csv;charset=utf-8' }), `journal-taches-${today()}.csv`);

  return (
    <div className="page">
      <PageHeader title="Dossier" />
      <p className="muted small" style={{ marginTop: -8 }}>
        Un PDF factuel pour préparer un entretien d’augmentation ou de requalification.
      </p>

      <div className="row" style={{ margin: '12px 0' }}>
        <span className="small muted">Année</span>
        <select value={year} onChange={(e) => setYear(e.target.value)} style={{ width: 120 }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid-3">
        <div className="card kpi"><span className="kpi-value">{stats.count}</span><span className="kpi-label">tâches</span></div>
        <div className="card kpi"><span className="kpi-value">{formatDuration(stats.totalMin)}</span><span className="kpi-label">documentées</span></div>
        <div className="card kpi oos"><span className="kpi-value">{pct(stats.outOfScopePct)}</span><span className="kpi-label">hors fiche</span></div>
        <div className="card kpi"><span className="kpi-value">{stats.byResponsibility.initiative}</span><span className="kpi-label">initiatives</span></div>
        <div className="card kpi"><span className="kpi-value">{stats.feedbacks.length}</span><span className="kpi-label">retours positifs</span></div>
        <div className="card kpi"><span className="kpi-value">{attachmentCount}</span><span className="kpi-label">preuves en annexe</span></div>
      </div>

      {settings.jobDescription.length === 0 && (
        <div className="banner warn" style={{ marginTop: 12 }}>
          <Icon name="info" /><span className="grow">Renseignez votre fiche de poste dans les <Link to="/parametres">Paramètres</Link> pour la comparaison.</span>
        </div>
      )}

      {pitch.length > 0 && (
        <>
          <div className="section-title row"><span>Mes arguments clés</span><span className="spacer" />
            <button className="btn small ghost" onClick={async () => {
              try { await navigator.clipboard.writeText(pitch.map((p) => `• ${p}`).join('\n')); toast('Arguments copiés'); }
              catch { toast('Copie impossible sur cet appareil'); }
            }}><Icon name="copy" size={15} /> Copier</button>
          </div>
          <div className="card">
            <ul className="pitch-list">{pitch.map((p, i) => <li key={i}>{p}</li>)}</ul>
            <p className="hint" style={{ marginBottom: 0 }}>Rédigé automatiquement à partir de vos saisies ; repris dans le PDF.</p>
          </div>
        </>
      )}

      <div className="section-title">Top 10 des réalisations ({top.length}/10)</div>
      {top.length === 0 && <p className="small muted">Touchez l’étoile ☆ d’une tâche (journal ou formulaire) pour la proposer ici.</p>}
      {top.map((t, i) => (
        <div key={t.id} className="card row" style={{ alignItems: 'flex-start' }}>
          <strong style={{ color: 'var(--accent)', width: 22 }}>{i + 1}</strong>
          <Link to={`/tache/${t.id}`} style={{ flex: 1, color: 'inherit', textDecoration: 'none' }}>
            <div className="small" style={{ fontWeight: 500 }}>{t.description}</div>
            <div className="tiny muted">{formatShort(t.date)} · {catMap.get(t.categoryId)?.name}{t.impactValue != null ? ` · ${t.impactValue} ${t.impactUnit ?? ''}` : ''}</div>
          </Link>
          <div className="row" style={{ gap: 0 }}>
            <button className="btn icon ghost" disabled={i === 0} aria-label="Monter" onClick={() => move(i, -1)}><Icon name="up" size={18} /></button>
            <button className="btn icon ghost" disabled={i === top.length - 1} aria-label="Descendre" onClick={() => move(i, 1)}><Icon name="down" size={18} /></button>
            <button className="btn icon ghost" aria-label="Retirer l’étoile" onClick={() => removeFromTop(t)}><Icon name="x" size={18} /></button>
          </div>
        </div>
      ))}
      {otherStarred.length > 0 && (
        <>
          <div className="section-title">Autres tâches étoilées ({otherStarred.length})</div>
          {otherStarred.map((t) => (
            <div key={t.id} className="list-row">
              <span className="small" style={{ flex: 1 }}>{t.description}<br /><span className="tiny muted">{formatShort(t.date)}</span></span>
              <button className="btn small" onClick={() => swapIn(t)}>{top.length >= 10 ? 'Remplacer le n°10' : 'Ajouter'}</button>
            </div>
          ))}
        </>
      )}

      <div className="section-title">Contenu du PDF</div>
      <div className="card small muted">
        Synthèse et chiffres clés · Fiche de poste contractuelle vs tâches réelles · Top 10 · Retours positifs · Compétences développées · Section « Ma demande » à compléter · Annexes (captures et PDF joints)
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        <button className="btn primary block big-add" style={{ fontSize: '1.05rem' }} disabled={busy} onClick={generate}>
          <Icon name="file" /> {busy ? 'Génération en cours…' : `Générer le dossier ${year}`}
        </button>
        {msg && <p className="small" role="status">{msg}</p>}
        <button className="btn block" onClick={exportCsv}><Icon name="download" size={18} /> Exporter toutes les tâches (CSV)</button>
      </div>
    </div>
  );
}
