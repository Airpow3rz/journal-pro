// Journal : toutes les tâches, regroupées par jour, avec recherche et filtres.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterBar } from '../components/FilterBar';
import { JournalTabs } from '../components/JournalTabs';
import { TaskCard } from '../components/TaskCard';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { useCategories, useNotes, useTasks } from '../hooks/data';
import { useSessionState } from '../hooks/useSessionState';
import { tasksToCsv } from '../lib/csv';
import { capitalize, formatDuration, formatLong, today } from '../lib/dates';
import { saveFile } from '../lib/download';
import { EMPTY_FILTERS, filterTasks, hasActiveFilters } from '../lib/search';
import { allTags } from '../lib/stats';

const PAGE = 150;

export default function Journal() {
  const navigate = useNavigate();
  const tasks = useTasks();
  const notes = useNotes();
  const categories = useCategories();
  const [filters, setFilters] = useSessionState('journal-filters', EMPTY_FILTERS);
  const [limit, setLimit] = useState(PAGE);
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const tags = useMemo(() => allTags(tasks ?? []), [tasks]);
  const filtered = useMemo(() => filterTasks(tasks ?? [], filters, notes), [tasks, filters, notes]);
  const shown = filtered.slice(0, limit);

  // Regroupement par jour (la liste est déjà triée du plus récent au plus ancien).
  const groups: { date: string; items: typeof shown }[] = [];
  for (const t of shown) {
    const last = groups[groups.length - 1];
    if (last?.date === t.date) last.items.push(t); else groups.push({ date: t.date, items: [t] });
  }

  const exportCsv = () => {
    const list = hasActiveFilters(filters) ? filtered : tasks ?? [];
    saveFile(new Blob([tasksToCsv(list, categories)], { type: 'text/csv;charset=utf-8' }), `journal-taches-${today()}.csv`);
  };

  return (
    <div className="page">
      <PageHeader title="Journal" actions={
        <button className="btn icon ghost" aria-label="Exporter en CSV" title="Exporter en CSV" onClick={exportCsv}><Icon name="download" /></button>
      } />
      <JournalTabs />
      <FilterBar filters={filters} onChange={(f) => { setFilters(f); setLimit(PAGE); }} categories={categories} tags={tags} />
      {tasks && (
        <p className="tiny muted" style={{ margin: '4px 2px' }}>
          {filtered.length} tâche{filtered.length > 1 ? 's' : ''}
          {' · '}{formatDuration(filtered.reduce((s, t) => s + (t.durationMin ?? 0), 0))}
          {hasActiveFilters(filters) && ` (sur ${tasks.length})`}
        </p>
      )}
      {tasks && filtered.length === 0 && (
        <div className="empty">
          {tasks.length === 0 ? 'Aucune tâche pour le moment.' : 'Aucun résultat pour ces filtres.'}
          {tasks.length === 0 && <div style={{ marginTop: 12 }}><button className="btn primary" onClick={() => navigate('/tache/nouvelle')}><Icon name="plus" /> Première tâche</button></div>}
        </div>
      )}
      {groups.map((g) => (
        <section key={g.date}>
          <div className="day-header">
            <span>{capitalize(formatLong(g.date))}</span>
            <span>{formatDuration(g.items.reduce((s, t) => s + (t.durationMin ?? 0), 0))}</span>
          </div>
          {g.items.map((t) => <TaskCard key={t.id} task={t} category={catMap.get(t.categoryId)} />)}
        </section>
      ))}
      {filtered.length > limit && (
        <button className="btn block" style={{ marginTop: 16 }} onClick={() => setLimit(limit + PAGE)}>Afficher plus</button>
      )}
    </div>
  );
}
