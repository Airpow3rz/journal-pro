// Compteurs du jour (visiteurs, colis…) : définitions par défaut et totaux par période.
import type { CounterDef, DailyCount, Settings } from '../db/schema';

export const DEFAULT_COUNTERS: CounterDef[] = [
  { id: 'visiteurs', label: 'Visiteurs accueillis', archived: false },
  { id: 'colis-recus', label: 'Colis reçus', archived: false },
  { id: 'colis-envoyes', label: 'Colis envoyés', archived: false },
  { id: 'colis-coffre', label: 'Colis de valeur mis au coffre', archived: false },
  { id: 'sav', label: 'SAV envoyés', archived: false },
];

/** Tous les compteurs (y compris archivés, pour l'historique). */
export const allCounters = (s: Pick<Settings, 'counters'>) => s.counters ?? DEFAULT_COUNTERS;
/** Compteurs affichés à la saisie. */
export const activeCounters = (s: Pick<Settings, 'counters'>) => allCounters(s).filter((c) => !c.archived);

export interface CounterTotal {
  counter: CounterDef;
  total: number;
  /** Jours où ce compteur a une valeur > 0. */
  days: number;
  /** Moyenne sur les jours renseignés. */
  average: number;
  /** Meilleure journée. */
  max: number;
}

export function counterTotals(counts: DailyCount[], defs: CounterDef[], start: string, end: string): CounterTotal[] {
  const inRange = counts.filter((c) => c.date >= start && c.date <= end);
  return defs.map((counter) => {
    let total = 0, days = 0, max = 0;
    for (const c of inRange) {
      const v = c.values[counter.id] ?? 0;
      if (v > 0) { total += v; days++; max = Math.max(max, v); }
    }
    return { counter, total, days, max, average: days ? total / days : 0 };
  });
}

/** Export CSV des compteurs (une ligne par jour). */
export function countsToCsv(counts: DailyCount[], defs: CounterDef[]): string {
  const cell = (v: unknown) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const header = ['Date', ...defs.map((d) => d.label)];
  const rows = [...counts].sort((a, b) => a.date.localeCompare(b.date))
    .filter((c) => defs.some((d) => (c.values[d.id] ?? 0) > 0))
    .map((c) => [c.date.split('-').reverse().join('/'), ...defs.map((d) => c.values[d.id] ?? 0)]);
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}
