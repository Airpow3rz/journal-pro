// Prépare toutes les données du dossier annuel (logique pure, sans rendu).
import type { Attachment, Category, DailyCount, Review, Settings, Task } from '../db/schema';
import { allCounters, counterTotals, type CounterTotal } from '../lib/counters';
import { formatMedium, today } from '../lib/dates';
import { periodLabel, periodRange } from '../lib/periods';
import { computeStats, skillCounts, tasksInRange, type PeriodStats } from '../lib/stats';
import { countWorkingDays } from '../lib/workdays';

export interface AnnexItem {
  code: string; // "A1", "A2"…
  attachment: Attachment;
  task: Task;
}

export interface DossierData {
  year: string;
  settings: Settings;
  periodText: string;
  generatedOn: string;
  stats: PeriodStats;
  workingDays: number;
  quarters: { label: string; stats: PeriodStats }[];
  categoryReality: { name: string; color: string; count: number; minutes: number; outOfScope: number }[];
  outOfScopeExamples: { category: string; tasks: Task[] }[];
  top: Task[];
  feedbacks: { task: Task; annexCodes: string[] }[];
  skills: { skill: string; count: number }[];
  learned: { period: string; text: string }[];
  achievements: { period: string; text: string }[];
  annexes: AnnexItem[];
  /** Totaux annuels des compteurs du jour (seulement ceux utilisés). */
  volumes: CounterTotal[];
  categoryName: (id: string) => string;
}

/** Top 10 : ordre choisi par l'utilisateur, complété par les autres tâches étoilées. */
export function resolveTop(yearTasks: Task[], order: string[] | undefined): Task[] {
  const starred = yearTasks.filter((t) => t.starred);
  const byId = new Map(starred.map((t) => [t.id, t]));
  const ordered = (order ?? []).map((id) => byId.get(id)).filter((t): t is Task => !!t);
  const rest = starred.filter((t) => !ordered.includes(t)).sort((a, b) => a.date.localeCompare(b.date));
  return [...ordered, ...rest].slice(0, 10);
}

export function buildDossierData(year: string, allTasks: Task[], categories: Category[], reviews: Review[], attachments: Attachment[], settings: Settings, counts: DailyCount[] = []): DossierData {
  const { start, end } = periodRange('year', year);
  const lastDay = end < today() ? end : today();
  const tasks = tasksInRange(allTasks, start, end).sort((a, b) => a.date.localeCompare(b.date));
  const stats = computeStats(tasks, categories);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const categoryName = (id: string) => catName.get(id) ?? 'Sans catégorie';

  const quarters = [1, 2, 3, 4].map((q) => {
    const r = periodRange('quarter', `${year}-Q${q}`);
    return { label: `T${q}`, stats: computeStats(tasksInRange(tasks, r.start, r.end), categories) };
  });

  const categoryReality = stats.byCategory.map((c) => ({
    name: c.name, color: c.color, count: c.count, minutes: c.minutes,
    outOfScope: tasks.filter((t) => t.categoryId === c.id && t.outOfScope).length,
  }));

  // Exemples hors fiche : priorité aux tâches étoilées, puis aux plus récentes, 5 par catégorie.
  const oos = tasks.filter((t) => t.outOfScope);
  const outOfScopeExamples = stats.byCategory
    .map((c) => ({
      category: c.name,
      tasks: oos.filter((t) => t.categoryId === c.id)
        .sort((a, b) => Number(b.starred) - Number(a.starred) || b.date.localeCompare(a.date)).slice(0, 5),
    }))
    .filter((g) => g.tasks.length);

  const top = resolveTop(tasks, settings.dossierTopIds?.[year]);

  // Annexes : pièces jointes des retours positifs, puis celles du Top 10.
  const taskIds = new Set(tasks.map((t) => t.id));
  const attByTask = new Map<string, Attachment[]>();
  for (const a of attachments) if (taskIds.has(a.taskId)) attByTask.set(a.taskId, [...(attByTask.get(a.taskId) ?? []), a]);
  const annexes: AnnexItem[] = [];
  const codesFor = (t: Task) => {
    const codes: string[] = [];
    for (const a of attByTask.get(t.id) ?? []) {
      let item = annexes.find((x) => x.attachment.id === a.id);
      if (!item) { item = { code: `A${annexes.length + 1}`, attachment: a, task: t }; annexes.push(item); }
      codes.push(item.code);
    }
    return codes;
  };
  const feedbacks = stats.feedbacks.map((t) => ({ task: t, annexCodes: codesFor(t) }));
  top.forEach(codesFor);

  const yearReviews = reviews.filter((r) => r.periodKey.startsWith(year))
    .sort((a, b) => periodRange(a.periodType, a.periodKey).start.localeCompare(periodRange(b.periodType, b.periodKey).start));
  const learned = yearReviews.filter((r) => r.newSkill.trim()).map((r) => ({ period: periodLabel(r.periodType, r.periodKey), text: r.newSkill.trim() }));
  // Réussites : bilans trimestriels et annuel en priorité, sinon mensuels.
  const big = yearReviews.filter((r) => (r.periodType === 'quarter' || r.periodType === 'year') && r.mainAchievement.trim());
  const achievementsSrc = big.length ? big : yearReviews.filter((r) => r.periodType === 'month' && r.mainAchievement.trim());
  const achievements = achievementsSrc.map((r) => ({ period: periodLabel(r.periodType, r.periodKey), text: r.mainAchievement.trim() }));

  return {
    year, settings, stats, quarters, categoryReality, outOfScopeExamples, top, feedbacks, annexes, learned, achievements, categoryName,
    skills: skillCounts(tasks),
    volumes: counterTotals(counts, allCounters(settings), start, end).filter((v) => v.total > 0),
    workingDays: countWorkingDays(start, lastDay, settings),
    periodText: `Du ${formatMedium(start)} au ${formatMedium(lastDay)}`,
    generatedOn: formatMedium(today()),
  };
}
