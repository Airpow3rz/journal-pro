// Recherche plein texte + filtres (période, catégorie, hors fiche, tags, étoile).
import { useState } from 'react';
import type { Category } from '../db/schema';
import { today } from '../lib/dates';
import { periodKey, periodRange } from '../lib/periods';
import { hasActiveFilters, EMPTY_FILTERS, type TaskFilters } from '../lib/search';
import { Icon } from './ui/Icon';
import { Segmented } from './ui/Segmented';

type Preset = 'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
const PRESETS: { value: Preset; label: string }[] = [
  { value: 'all', label: 'Tout' }, { value: 'week', label: 'Semaine' }, { value: 'month', label: 'Mois' },
  { value: 'quarter', label: 'Trimestre' }, { value: 'year', label: 'Année' }, { value: 'custom', label: 'Dates…' },
];

function presetOf(f: TaskFilters): Preset {
  if (!f.from && !f.to) return 'all';
  for (const p of ['week', 'month', 'quarter', 'year'] as const) {
    const r = periodRange(p, periodKey(p, today()));
    if (r.start === f.from && r.end === f.to) return p;
  }
  return 'custom';
}

export function FilterBar({ filters, onChange, categories, tags }: {
  filters: TaskFilters; onChange: (f: TaskFilters) => void; categories: Category[]; tags: string[];
}) {
  const [open, setOpen] = useState(hasActiveFilters({ ...filters, text: '' }));
  const [custom, setCustom] = useState(presetOf(filters) === 'custom');
  const preset = custom ? 'custom' : presetOf(filters);
  const set = (patch: Partial<TaskFilters>) => onChange({ ...filters, ...patch });
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const activeCount = [filters.from || filters.to, filters.categoryIds.length, filters.outOfScope !== 'all', filters.tags.length, filters.starredOnly].filter(Boolean).length;

  const choosePreset = (p: Preset) => {
    setCustom(p === 'custom');
    if (p === 'all') set({ from: undefined, to: undefined });
    else if (p !== 'custom') { const r = periodRange(p, periodKey(p, today())); set({ from: r.start, to: r.end }); }
  };

  return (
    <div className="stack" style={{ gap: 10, marginBottom: 6 }}>
      <div className="row">
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-3)' }}><Icon name="search" size={20} /></span>
          <input type="search" placeholder="Rechercher…" value={filters.text} style={{ paddingLeft: 38 }}
            onChange={(e) => set({ text: e.target.value })} />
        </div>
        <button className={`btn icon ${open || activeCount ? 'primary' : ''}`} aria-label="Filtres" onClick={() => setOpen(!open)}>
          <Icon name="filter" size={20} />
        </button>
      </div>
      {open && (
        <div className="card stack" style={{ gap: 12 }}>
          <div className="chips-scroll" style={{ margin: 0, padding: 0 }}>
            {PRESETS.map((p) => (
              <button key={p.value} className={`chip small ${preset === p.value ? 'on' : ''}`} onClick={() => choosePreset(p.value)}>{p.label}</button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="grid-2">
              <label className="field">Du<input type="date" value={filters.from ?? ''} onChange={(e) => set({ from: e.target.value || undefined })} /></label>
              <label className="field">Au<input type="date" value={filters.to ?? ''} onChange={(e) => set({ to: e.target.value || undefined })} /></label>
            </div>
          )}
          <Segmented value={filters.outOfScope} onChange={(v) => set({ outOfScope: v })}
            options={[{ value: 'all', label: 'Toutes' }, { value: 'yes', label: 'Hors fiche' }, { value: 'no', label: 'Dans la fiche' }]} />
          <div className="row-wrap">
            {categories.map((c) => (
              <button key={c.id} className={`chip small ${filters.categoryIds.includes(c.id) ? 'on' : ''}`}
                onClick={() => set({ categoryIds: toggle(filters.categoryIds, c.id) })}>
                <span className="dot" style={{ background: c.color }} />{c.name}
              </button>
            ))}
          </div>
          {tags.length > 0 && (
            <div className="row-wrap">
              {tags.map((t) => (
                <button key={t} className={`chip small ${filters.tags.includes(t) ? 'on' : ''}`} onClick={() => set({ tags: toggle(filters.tags, t) })}>#{t}</button>
              ))}
            </div>
          )}
          <div className="row">
            <button className={`chip small ${filters.starredOnly ? 'on' : ''}`} onClick={() => set({ starredOnly: !filters.starredOnly })}>
              <Icon name="star" size={14} fill={filters.starredOnly} /> Étoilées
            </button>
            <span className="spacer" />
            {activeCount > 0 && <button className="btn small ghost" onClick={() => { setCustom(false); onChange({ ...EMPTY_FILTERS, text: filters.text }); }}>Réinitialiser</button>}
          </div>
        </div>
      )}
    </div>
  );
}
