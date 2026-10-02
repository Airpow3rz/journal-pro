// Jours ouvrés (lundi → vendredi, hors fériés et jours non travaillés personnalisés)
// et série de jours consécutifs avec au moins une saisie.
import type { Settings } from '../db/schema';
import { addDays, parseDay } from './dates';
import { holidays } from './holidays';

type WorkSettings = Pick<Settings, 'holidayCountry' | 'customDaysOff'>;

export function isWorkingDay(day: string, s: WorkSettings): boolean {
  const dow = parseDay(day).getDay();
  if (dow === 0 || dow === 6) return false;
  if (s.customDaysOff.includes(day)) return false;
  return !holidays(Number(day.slice(0, 4)), s.holidayCountry).has(day);
}

export interface Streak {
  /** Nombre de jours ouvrés consécutifs avec au moins une tâche. */
  count: number;
  /** Aujourd'hui est un jour ouvré déjà renseigné. */
  todayDone: boolean;
  todayIsWorkingDay: boolean;
}

/**
 * Remonte le temps depuis aujourd'hui, jour ouvré par jour ouvré.
 * Un jour ouvré sans saisie casse la série, sauf aujourd'hui (la journée n'est pas finie).
 * Les week-ends, fériés et jours non travaillés sont ignorés (ils ne cassent rien).
 */
export function computeStreak(daysWithTasks: Set<string>, todayDay: string, s: WorkSettings): Streak {
  const todayIsWorkingDay = isWorkingDay(todayDay, s);
  const todayDone = todayIsWorkingDay && daysWithTasks.has(todayDay);
  let count = 0;
  let day = todayDay;
  for (let i = 0; i < 3660; i++) {
    if (isWorkingDay(day, s)) {
      if (daysWithTasks.has(day)) count++;
      else if (day !== todayDay) break;
    }
    day = addDays(day, -1);
  }
  return { count, todayDone, todayIsWorkingDay };
}

/** Nombre de jours ouvrés entre deux dates incluses. */
export function countWorkingDays(start: string, end: string, s: WorkSettings): number {
  let n = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (isWorkingDay(d, s)) n++;
  return n;
}
