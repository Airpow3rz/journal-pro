// Paramètres : tâches quotidiennes et compteurs du jour.
import { useState } from 'react';
import { newId } from '../db/db';
import { ensureRecurringTodos } from '../db/recurring';
import type { CounterDef, RecurringTask, Settings } from '../db/schema';
import { updateSettings } from '../hooks/data';
import { allCounters } from '../lib/counters';
import { today } from '../lib/dates';
import { BufferedInput } from './ui/Buffered';
import { Icon } from './ui/Icon';

const DAYS = [[1, 'L'], [2, 'M'], [3, 'M'], [4, 'J'], [5, 'V']] as const;
const DAY_NAMES = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

export function RecurringSettings({ settings }: { settings: Settings }) {
  const list = settings.recurring ?? [];
  const [draft, setDraft] = useState('');

  const save = async (next: RecurringTask[]) => {
    await updateSettings({ recurring: next });
    await ensureRecurringTodos(today()); // la tâche du jour apparaît tout de suite
  };
  const patch = (id: string, p: Partial<RecurringTask>) => save(list.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    save([...list, { id: newId(), text, weekdays: [1, 2, 3, 4, 5], active: true }]);
  };

  return (
    <div className="card">
      <p className="small muted" style={{ marginTop: 0 }}>Ajoutées automatiquement à « À faire » les jours choisis (sauf fériés et jours non travaillés).</p>
      {list.map((r) => (
        <div key={r.id} className="list-row" style={{ flexWrap: 'wrap', opacity: r.active ? 1 : 0.5 }}>
          <BufferedInput value={r.text} onCommit={(text) => text.trim() && patch(r.id, { text: text.trim() })} style={{ flex: '1 1 160px', minHeight: 38 }} />
          <div className="row" style={{ gap: 4 }}>
            {DAYS.map(([d, l]) => (
              <button key={d} type="button" className={`chip small ${r.weekdays.includes(d) ? 'on' : ''}`} style={{ padding: '0 9px' }}
                aria-label={DAY_NAMES[d]} aria-pressed={r.weekdays.includes(d)}
                onClick={() => {
                  const wd = r.weekdays.includes(d) ? r.weekdays.filter((x) => x !== d) : [...r.weekdays, d].sort();
                  if (wd.length) patch(r.id, { weekdays: wd });
                }}>{l}</button>
            ))}
            <button className="btn icon ghost" style={{ width: 34 }} aria-label={r.active ? 'Mettre en pause' : 'Réactiver'} title={r.active ? 'Mettre en pause' : 'Réactiver'}
              onClick={() => patch(r.id, { active: !r.active })}><Icon name={r.active ? 'eye' : 'x'} size={16} /></button>
            <button className="btn icon ghost danger" style={{ width: 34 }} aria-label="Supprimer"
              onClick={() => confirm(`Supprimer la tâche quotidienne « ${r.text} » ?`) && save(list.filter((x) => x.id !== r.id))}><Icon name="trash" size={16} /></button>
          </div>
        </div>
      ))}
      <form className="row" style={{ marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input type="text" value={draft} placeholder="Ex. Relever le courrier" onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" className="btn" disabled={!draft.trim()}>Ajouter</button>
      </form>
    </div>
  );
}

export function CounterSettings({ settings }: { settings: Settings }) {
  const list = allCounters(settings);
  const save = (next: CounterDef[]) => updateSettings({ counters: next });
  const move = (i: number, delta: number) => {
    const next = [...list];
    const [c] = next.splice(i, 1);
    next.splice(i + delta, 0, c);
    save(next);
  };
  const add = () => {
    const label = prompt('Nom du compteur (ex. « Appels reçus ») :');
    if (label?.trim()) save([...list, { id: newId(), label: label.trim(), archived: false }]);
  };
  return (
    <div className="card">
      <p className="small muted" style={{ marginTop: 0 }}>Affichés sur l’accueil. Les totaux apparaissent dans les bilans et le dossier.</p>
      {list.map((c, i) => (
        <div key={c.id} className="list-row" style={{ opacity: c.archived ? 0.5 : 1 }}>
          <BufferedInput value={c.label} onCommit={(label) => label.trim() && save(list.map((x) => (x.id === c.id ? { ...x, label: label.trim() } : x)))} style={{ flex: 1, minHeight: 38 }} />
          <button className="btn icon ghost" style={{ width: 34 }} disabled={i === 0} aria-label="Monter" onClick={() => move(i, -1)}><Icon name="up" size={16} /></button>
          <button className="btn icon ghost" style={{ width: 34 }} disabled={i === list.length - 1} aria-label="Descendre" onClick={() => move(i, 1)}><Icon name="down" size={16} /></button>
          <button className="btn icon ghost" style={{ width: 34 }} aria-label={c.archived ? 'Réactiver' : 'Masquer'} title={c.archived ? 'Réactiver' : 'Masquer (historique conservé)'}
            onClick={() => save(list.map((x) => (x.id === c.id ? { ...x, archived: !x.archived } : x)))}><Icon name={c.archived ? 'eye' : 'x'} size={16} /></button>
        </div>
      ))}
      <button className="btn small" style={{ marginTop: 8 }} onClick={add}><Icon name="plus" size={16} /> Ajouter un compteur</button>
    </div>
  );
}
