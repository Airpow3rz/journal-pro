// Périodes de bilan : semaine ISO, mois, trimestre, année.
// Chaque période est identifiée par une clé texte : "2026-W40", "2026-10", "2026-Q4", "2026".
import { endOfISOWeek, format, getISOWeek, getISOWeekYear, setISOWeek, startOfISOWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PeriodType } from '../db/schema';
import { formatShort, parseDay, toDay } from './dates';

export const PERIOD_LABELS: Record<PeriodType, string> = {
  week: 'Semaine',
  month: 'Mois',
  quarter: 'Trimestre',
  year: 'Année',
};

export function periodKey(type: PeriodType, day: string): string {
  const d = parseDay(day);
  switch (type) {
    case 'week':
      return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`;
    case 'month':
      return day.slice(0, 7);
    case 'quarter':
      return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    case 'year':
      return String(d.getFullYear());
  }
}

/** Bornes incluses de la période. */
export function periodRange(type: PeriodType, key: string): { start: string; end: string } {
  switch (type) {
    case 'week': {
      const [y, w] = key.split('-W').map(Number);
      // Le 4 janvier est toujours dans la semaine ISO 1.
      const d = setISOWeek(new Date(y, 0, 4), w);
      return { start: toDay(startOfISOWeek(d)), end: toDay(endOfISOWeek(d)) };
    }
    case 'month': {
      const [y, m] = key.split('-').map(Number);
      return { start: toDay(new Date(y, m - 1, 1)), end: toDay(new Date(y, m, 0)) };
    }
    case 'quarter': {
      const [y, q] = key.split('-Q').map(Number);
      return { start: toDay(new Date(y, (q - 1) * 3, 1)), end: toDay(new Date(y, q * 3, 0)) };
    }
    case 'year': {
      const y = Number(key);
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
  }
}

/** Période décalée de `delta` (−1 = période précédente). */
export function shiftPeriod(type: PeriodType, key: string, delta: number): string {
  const { start } = periodRange(type, key);
  const d = parseDay(start);
  switch (type) {
    case 'week': d.setDate(d.getDate() + 7 * delta); break;
    case 'month': d.setMonth(d.getMonth() + delta); break;
    case 'quarter': d.setMonth(d.getMonth() + 3 * delta); break;
    case 'year': d.setFullYear(d.getFullYear() + delta); break;
  }
  return periodKey(type, toDay(d));
}

export function periodLabel(type: PeriodType, key: string): string {
  const { start, end } = periodRange(type, key);
  switch (type) {
    case 'week':
      return `Semaine ${Number(key.split('-W')[1])} · ${formatShort(start)} – ${formatShort(end)}`;
    case 'month': {
      const s = format(parseDay(start), 'MMMM yyyy', { locale: fr });
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    case 'quarter':
      return `${key.split('-Q')[1]}${key.endsWith('Q1') ? 'er' : 'e'} trimestre ${key.slice(0, 4)}`;
    case 'year':
      return `Année ${key}`;
  }
}

/** Sous-périodes reprises automatiquement : trimestre → mois, année → trimestres. */
export function childPeriods(type: PeriodType, key: string): { type: PeriodType; key: string }[] {
  if (type === 'quarter') {
    const { start } = periodRange(type, key);
    return [0, 1, 2].map((i) => ({ type: 'month' as const, key: shiftPeriod('month', start.slice(0, 7), i) }));
  }
  if (type === 'year') return [1, 2, 3, 4].map((q) => ({ type: 'quarter' as const, key: `${key}-Q${q}` }));
  return [];
}
