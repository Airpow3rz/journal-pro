// Tâches quotidiennes : création automatique des éléments « À faire » du jour.
import type { Settings, Todo } from './schema';
import { db, newId, nowIso } from './db';
import { parseDay } from '../lib/dates';
import { isWorkingDay } from '../lib/workdays';

/** Éléments à créer pour `day` (logique pure, testée). */
export function recurringToCreate(day: string, settings: Pick<Settings, 'recurring' | 'holidayCountry' | 'customDaysOff'>, existing: Todo[]): string[] {
  if (!isWorkingDay(day, settings)) return [];
  const dow = parseDay(day).getDay(); // 1 = lundi … 5 = vendredi
  return (settings.recurring ?? [])
    .filter((r) => r.active && r.weekdays.includes(dow))
    .filter((r) => !existing.some((t) => t.recurringId === r.id && t.date === day))
    .map((r) => r.id);
}

/**
 * À l'ouverture de l'app (et au changement de jour) :
 * - retire les tâches quotidiennes non cochées des jours précédents ;
 * - ajoute celles du jour, en tête de liste.
 */
export async function ensureRecurringTodos(day: string) {
  await db.transaction('rw', db.todos, db.settings, async () => {
    const settings = await db.settings.get('settings');
    if (!settings) return;
    const auto = await db.todos.where('recurringId').above('').toArray();
    const stale = auto.filter((t) => !t.doneAt && t.date && t.date < day).map((t) => t.id);
    if (stale.length) await db.todos.bulkDelete(stale);
    const ids = recurringToCreate(day, settings, auto);
    if (!ids.length) return;
    const first = await db.todos.orderBy('order').first();
    let order = (first?.order ?? 0) - ids.length;
    const now = nowIso();
    await db.todos.bulkAdd(ids.map((rid) => ({
      id: newId(), text: settings.recurring!.find((r) => r.id === rid)!.text,
      order: order++, createdAt: now, updatedAt: now, recurringId: rid, date: day,
    })));
  });
}
