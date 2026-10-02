// Export CSV de toutes les tâches (séparateur « ; » et BOM UTF-8 pour Excel en français).
import { RESPONSIBILITY_LABELS, type Category, type Task } from '../db/schema';
import { formatNum } from './dates';

const cell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function tasksToCsv(tasks: Task[], categories: Category[]): string {
  const cats = new Map(categories.map((c) => [c.id, c.name]));
  const header = ['Date', 'Description', 'Catégorie', 'Hors fiche de poste', 'Responsabilité', 'Temps (min)',
    'Résultat / impact', 'Chiffre', 'Unité', 'Demandé par', 'Retour reçu', 'Pièces jointes', 'Tags', 'Compétences', 'Étoile'];
  const rows = [...tasks].sort((a, b) => a.date.localeCompare(b.date)).map((t) => [
    formatNum(t.date), t.description, cats.get(t.categoryId) ?? '', t.outOfScope ? 'Oui' : 'Non',
    t.responsibility ? RESPONSIBILITY_LABELS[t.responsibility] : '', t.durationMin ?? '',
    t.impactText ?? '', t.impactValue ?? '', t.impactUnit ?? '', t.requestedBy ?? '', t.feedback ?? '',
    t.attachmentIds.length || '', t.tags.join(', '), (t.skills ?? []).join(', '), t.starred ? 'Oui' : '',
  ]);
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}
