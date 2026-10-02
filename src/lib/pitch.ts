// Argumentaire rédigé automatiquement à partir des chiffres de l'année (aucune IA, tout est local).
// Chaque phrase n'est produite que si les données la justifient.
import type { Category, Task } from '../db/schema';
import type { CounterTotal } from './counters';
import { formatDuration } from './dates';
import type { PeriodStats } from './stats';
import { normalize } from './search';
import { workEquivalent } from './worktime';

const n = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const hours = (min: number) => (min >= 60 ? `${n(min / 60)} h` : formatDuration(min));
/** Minuscule initiale sauf pour les sigles (« SAV envoyés » reste tel quel). */
const lowerFirst = (s: string) => (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const plural = (count: number, word: string) => `${n(count)} ${word}${count > 1 ? 's' : ''}`;

export interface PitchInput {
  year: string;
  tasks: Task[];
  categories: Category[];
  stats: PeriodStats;
  volumes: CounterTotal[];
  /** Part hors fiche par trimestre (null si aucun chiffre ce trimestre). */
  quarterOosPct: (number | null)[];
  weeklyHours?: number;
}

export function buildPitch({ year, tasks, categories, stats, volumes, quarterOosPct, weeklyHours }: PitchInput): string[] {
  const out: string[] = [];
  if (!stats.count) return out;
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  // Volume global.
  out.push(`En ${year}, j'ai documenté ${plural(stats.count, 'tâche')} sur ${plural(stats.activeDays, 'jour')} de travail` +
    (stats.totalMin ? `, soit ${hours(stats.totalMin)} de travail détaillé.` : '.'));

  // Hors fiche de poste.
  if (stats.outOfScopeCount) {
    const eq = workEquivalent(stats.outOfScopeMin, weeklyHours).label;
    out.push(`${Math.round(stats.outOfScopePct)} % de mes tâches dépassent ma fiche de poste (${plural(stats.outOfScopeCount, 'tâche')}` +
      (stats.outOfScopeMin ? `, ${hours(stats.outOfScopeMin)}${eq ? `, ${eq}` : ''}` : '') + ').');
    const byCat = new Map<string, number>();
    for (const t of tasks) if (t.outOfScope) byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + 1);
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) out.push(`Missions hors fiche les plus fréquentes : ${top.map(([id, c]) => `${lowerFirst(catName.get(id) ?? 'autre')} (${c})`).join(', ')}.`);
  }

  // Tendance : part hors fiche en hausse.
  const q = quarterOosPct.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null);
  if (q.length >= 2 && q[q.length - 1].v - q[0].v >= 5) {
    out.push(`La part de travail hors fiche est passée de ${Math.round(q[0].v)} % au ${q[0].i + 1}${q[0].i === 0 ? 'er' : 'e'} trimestre à ${Math.round(q[q.length - 1].v)} % au ${q[q.length - 1].i + 1}e trimestre : mes responsabilités augmentent.`);
  }

  // Remplacements.
  const repl = tasks.filter((t) => t.responsibility === 'remplacement');
  if (repl.length) {
    const min = repl.reduce((s, t) => s + (t.durationMin ?? 0), 0);
    const days = new Set(repl.map((t) => t.date)).size;
    out.push(`J'ai remplacé des collègues absents à ${n(repl.length)} reprise${repl.length > 1 ? 's' : ''}` +
      ` sur ${plural(days, 'jour')}${min ? ` (${hours(min)})` : ''}.`);
  }

  // Formation de collègues.
  const formation = tasks.filter((t) => normalize(catName.get(t.categoryId) ?? '').includes('formation'));
  if (formation.length) out.push(`J'ai assuré ${plural(formation.length, 'session')} de formation de collègues.`);

  // Coordination et initiatives.
  if (stats.byResponsibility.coordination) out.push(`J'ai coordonné ${plural(stats.byResponsibility.coordination, 'action')} (prestataires, équipes, événements).`);
  if (stats.initiatives.length) {
    const ex = stats.initiatives.filter((t) => t.starred).concat(stats.initiatives.filter((t) => !t.starred)).slice(0, 2).map((t) => `« ${t.description} »`);
    out.push(`J'ai pris ${plural(stats.initiatives.length, 'initiative')} personnelle${stats.initiatives.length > 1 ? 's' : ''}, par exemple ${ex.join(' et ')}.`);
  }

  // Impacts chiffrés, additionnés par unité.
  const impacts = new Map<string, number>();
  for (const t of tasks) if (t.impactValue != null && t.impactUnit?.trim()) impacts.set(t.impactUnit.trim(), (impacts.get(t.impactUnit.trim()) ?? 0) + t.impactValue);
  const impactList = [...impacts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (impactList.length) out.push(`Impacts mesurés : ${impactList.map(([u, v]) => `${n(v)} ${u}`).join(', ')}.`);

  // Volumes des compteurs du jour.
  const vols = volumes.filter((v) => v.total > 0);
  if (vols.length) out.push(`Volume traité : ${vols.map((v) => `${n(v.total)} ${lowerFirst(v.counter.label)}`).join(', ')}.`);

  // Retours positifs.
  if (stats.feedbacks.length) out.push(`J'ai reçu ${plural(stats.feedbacks.length, 'retour')} positif${stats.feedbacks.length > 1 ? 's' : ''} (remerciements, compliments), justificatifs en annexe.`);

  return out;
}
