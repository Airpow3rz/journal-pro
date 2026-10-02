// Compteurs du jour sur l'accueil : boutons − / + et saisie directe du nombre.
// Les flèches permettent de compléter un jour précédent.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { db, nowIso } from '../db/db';
import { useSettings } from '../hooks/data';
import { activeCounters } from '../lib/counters';
import { addDays, capitalize, formatLong, today } from '../lib/dates';
import { Icon } from './ui/Icon';

async function setCount(date: string, counterId: string, value: number) {
  const v = Math.max(0, Math.round(value) || 0);
  await db.transaction('rw', db.dailyCounts, async () => {
    const existing = await db.dailyCounts.get(date);
    await db.dailyCounts.put({ id: date, date, values: { ...(existing?.values ?? {}), [counterId]: v }, updatedAt: nowIso() });
  });
}

export function DailyCounters() {
  const settings = useSettings();
  const counters = activeCounters(settings);
  const [day, setDay] = useState(today());
  const entry = useLiveQuery(() => db.dailyCounts.get(day), [day]);
  const isToday = day === today();

  if (!counters.length) return null;
  return (
    <div className="card counters-card">
      <div className="row" style={{ marginBottom: 4 }}>
        <button className="btn icon ghost" aria-label="Jour précédent" onClick={() => setDay(addDays(day, -1))}><Icon name="left" size={18} /></button>
        <strong className="small" style={{ flex: 1, textAlign: 'center' }}>{isToday ? 'Aujourd’hui' : capitalize(formatLong(day))}</strong>
        <button className="btn icon ghost" aria-label="Jour suivant" disabled={isToday} onClick={() => setDay(addDays(day, 1))}><Icon name="right" size={18} /></button>
      </div>
      {counters.map((c) => {
        const v = entry?.values[c.id] ?? 0;
        return (
          <div key={c.id} className="counter-row">
            <span className="counter-label">{c.label}</span>
            <button className="counter-btn" aria-label={`Retirer 1 : ${c.label}`} disabled={v <= 0} onClick={() => setCount(day, c.id, v - 1)}>−</button>
            <CounterInput key={`${day}-${c.id}`} label={c.label} value={v} onCommit={(n) => setCount(day, c.id, n)} />
            <button className="counter-btn plus" aria-label={`Ajouter 1 : ${c.label}`} onClick={() => setCount(day, c.id, v + 1)}>+</button>
          </div>
        );
      })}
    </div>
  );
}

/** Champ numérique : la saisie reste locale pendant la frappe, puis est enregistrée (pause ou sortie du champ). */
function CounterInput({ label, value, onCommit }: { label: string; value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const commit = (text: string | null) => {
    window.clearTimeout(timer.current);
    if (text !== null) onCommit(Number(text));
  };
  return (
    <input className="counter-value" type="number" inputMode="numeric" min={0} aria-label={label} placeholder="0"
      value={draft ?? (value || '')}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => commit(text), 600);
      }}
      onBlur={() => { commit(draft); setDraft(null); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
  );
}
