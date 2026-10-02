// Recherche plein texte (insensible aux accents et à la casse) et filtres.
import type { Note, Task } from '../db/schema';

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export interface TaskFilters {
  text: string;
  from?: string;
  to?: string;
  categoryIds: string[];
  outOfScope: 'all' | 'yes' | 'no';
  tags: string[];
  starredOnly: boolean;
}

export const EMPTY_FILTERS: TaskFilters = { text: '', categoryIds: [], outOfScope: 'all', tags: [], starredOnly: false };

export function taskHaystack(t: Task, notes: Note[] = []) {
  return normalize([
    t.description, t.impactText, t.impactUnit, t.requestedBy, t.feedback,
    t.tags.join(' '), (t.skills ?? []).join(' '),
    ...notes.filter((n) => n.taskIds.includes(t.id)).map((n) => `${n.title} ${n.content}`),
  ].filter(Boolean).join(' '));
}

export function filterTasks(tasks: Task[], f: TaskFilters, notes: Note[] = []): Task[] {
  const words = normalize(f.text).split(/\s+/).filter(Boolean);
  return tasks.filter((t) => {
    if (f.from && t.date < f.from) return false;
    if (f.to && t.date > f.to) return false;
    if (f.categoryIds.length && !f.categoryIds.includes(t.categoryId)) return false;
    if (f.outOfScope === 'yes' && !t.outOfScope) return false;
    if (f.outOfScope === 'no' && t.outOfScope) return false;
    if (f.starredOnly && !t.starred) return false;
    if (f.tags.length && !f.tags.every((tag) => t.tags.includes(tag))) return false;
    if (words.length) {
      const h = taskHaystack(t, notes);
      if (!words.every((w) => h.includes(w))) return false;
    }
    return true;
  });
}

export function filterNotes(notes: Note[], text: string, tags: string[] = []): Note[] {
  const words = normalize(text).split(/\s+/).filter(Boolean);
  return notes.filter((n) => {
    if (tags.length && !tags.every((t) => n.tags.includes(t))) return false;
    if (!words.length) return true;
    const h = normalize(`${n.title} ${n.content} ${n.tags.join(' ')}`);
    return words.every((w) => h.includes(w));
  });
}

export const hasActiveFilters = (f: TaskFilters) =>
  !!(f.text || f.from || f.to || f.categoryIds.length || f.outOfScope !== 'all' || f.tags.length || f.starredOnly);
