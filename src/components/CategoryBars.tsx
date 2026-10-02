// Graphique de répartition : barres horizontales aux couleurs des catégories.
import type { CategoryStat } from '../lib/stats';
import { formatDuration } from '../lib/dates';

export function CategoryBars({ data, total }: { data: CategoryStat[]; total: number }) {
  if (!data.length) return <p className="small muted">Aucune tâche sur la période.</p>;
  const max = Math.max(...data.map((d) => d.count));
  return (
    <div className="stack" style={{ gap: 9 }} role="list" aria-label="Répartition par catégorie">
      {data.map((d) => (
        <div key={d.id} role="listitem">
          <div className="legend-row">
            <span className="dot" style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flex: 'none' }} />
            <span>{d.name}</span>
            <span className="val">{d.count} · {Math.round((d.count / total) * 100)} %{d.minutes ? ` · ${formatDuration(d.minutes)}` : ''}</span>
          </div>
          <div className="progress"><i style={{ width: `${(d.count / max) * 100}%`, background: d.color }} /></div>
        </div>
      ))}
    </div>
  );
}
