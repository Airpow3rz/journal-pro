// Accès réactif aux données : les composants se mettent à jour dès que la base change.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DEFAULT_SETTINGS } from '../db/seed';
import type { Category, Note, Review, Settings, Task, TaskTemplate } from '../db/schema';

export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get('settings'), []) ?? DEFAULT_SETTINGS;
}

export function useCategories(includeArchived = true): Category[] {
  const cats = useLiveQuery(() => db.categories.orderBy('order').toArray(), []) ?? [];
  return includeArchived ? cats : cats.filter((c) => !c.archived);
}

/** Toutes les tâches, de la plus récente à la plus ancienne. `undefined` pendant le chargement. */
export function useTasks(): Task[] | undefined {
  return useLiveQuery(() => db.tasks.orderBy('date').reverse().toArray(), []);
}

export function useTasksBetween(start: string, end: string): Task[] {
  return useLiveQuery(() => db.tasks.where('date').between(start, end, true, true).toArray(), [start, end]) ?? [];
}

export function useNotes(): Note[] {
  return useLiveQuery(() => db.notes.orderBy('date').reverse().toArray(), []) ?? [];
}

export function useTemplates(): TaskTemplate[] {
  return useLiveQuery(() => db.templates.orderBy('usageCount').reverse().toArray(), []) ?? [];
}

export function useReview(key: string): Review | undefined {
  return useLiveQuery(() => db.reviews.get(key), [key]);
}

export function useReviews(): Review[] {
  return useLiveQuery(() => db.reviews.toArray(), []) ?? [];
}

export const updateSettings = (patch: Partial<Settings>) => db.settings.update('settings', patch);

/** Éléments « À faire » non encore transformés en tâches, dans l'ordre de saisie. */
export function useOpenTodos() {
  return useLiveQuery(() => db.todos.orderBy('order').filter((t) => !t.doneAt).toArray(), []);
}
