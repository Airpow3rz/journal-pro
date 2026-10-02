// Agrégations calculées à la volée à partir des tâches (rien n'est stocké).
import type { Category, ResponsibilityLevel, Task } from '../db/schema';

export interface CategoryStat {
  id: string;
  name: string;
  color: string;
  count: number;
  minutes: number;
}

export interface PeriodStats {
  count: number;
  totalMin: number;
  activeDays: number;
  byCategory: CategoryStat[];
  byResponsibility: Record<ResponsibilityLevel, number>;
  outOfScopeCount: number;
  /** Pourcentage (0–100) de tâches hors fiche de poste. */
  outOfScopePct: number;
  outOfScopeMin: number;
  initiatives: Task[];
  feedbacks: Task[];
  starred: Task[];
}

export function tasksInRange(tasks: Task[], start: string, end: string) {
  return tasks.filter((t) => t.date >= start && t.date <= end);
}

export function computeStats(tasks: Task[], categories: Category[]): PeriodStats {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const byCat = new Map<string, CategoryStat>();
  const byResponsibility: Record<ResponsibilityLevel, number> = { execution: 0, coordination: 0, initiative: 0, remplacement: 0 };
  let totalMin = 0;
  let outOfScopeCount = 0;
  let outOfScopeMin = 0;
  const days = new Set<string>();

  for (const t of tasks) {
    const min = t.durationMin ?? 0;
    totalMin += min;
    days.add(t.date);
    if (t.outOfScope) { outOfScopeCount++; outOfScopeMin += min; }
    if (t.responsibility) byResponsibility[t.responsibility]++;
    const c = catMap.get(t.categoryId);
    const stat = byCat.get(t.categoryId) ?? {
      id: t.categoryId, name: c?.name ?? 'Sans catégorie', color: c?.color ?? '#999', count: 0, minutes: 0,
    };
    stat.count++;
    stat.minutes += min;
    byCat.set(t.categoryId, stat);
  }

  const byDate = (a: Task, b: Task) => a.date.localeCompare(b.date);
  return {
    count: tasks.length,
    totalMin,
    activeDays: days.size,
    byCategory: [...byCat.values()].sort((a, b) => b.count - a.count),
    byResponsibility,
    outOfScopeCount,
    outOfScopePct: tasks.length ? (outOfScopeCount / tasks.length) * 100 : 0,
    outOfScopeMin,
    initiatives: tasks.filter((t) => t.responsibility === 'initiative').sort(byDate),
    feedbacks: tasks.filter((t) => t.feedback?.trim()).sort(byDate),
    starred: tasks.filter((t) => t.starred).sort(byDate),
  };
}

/** Écart en points de pourcentage, avec un libellé prêt à afficher ("+4,2 pts"). */
export function deltaPoints(current: number, previous: number) {
  const diff = current - previous;
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
  return { diff, label: `${sign}${Math.abs(diff).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} pts` };
}

export const pct = (v: number) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`;

/** Compétences mobilisées, triées par nombre d'occurrences. */
export function skillCounts(tasks: Task[]): { skill: string; count: number }[] {
  const m = new Map<string, number>();
  for (const t of tasks) for (const s of t.skills ?? []) m.set(s, (m.get(s) ?? 0) + 1);
  return [...m.entries()].map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count);
}

/** Tous les tags utilisés, triés par fréquence (pour l'autocomplétion). */
export function allTags(items: { tags: string[] }[]): string[] {
  const m = new Map<string, number>();
  for (const it of items) for (const t of it.tags) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}
