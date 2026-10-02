// Conversion d'un temps documenté en équivalent de travail à temps plein.
// Base : durée hebdomadaire du contrat (35 h par défaut), 5 jours par semaine, 52 semaines / 12 mois.

export interface WorkEquivalent {
  days: number;
  months: number;
  /** "≈ 12 jours de travail", "≈ 2,5 mois de travail à temps plein" ; vide si moins d'une journée. */
  label: string;
}

const fmt = (n: number, digits = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: digits });

export function workEquivalent(minutes: number, weeklyHours = 35): WorkEquivalent {
  const hours = minutes / 60;
  const days = hours / (weeklyHours / 5);
  const months = hours / ((weeklyHours * 52) / 12);
  let label = '';
  if (days >= 20) label = `≈ ${fmt(months)} mois de travail à temps plein`;
  else if (days >= 1) label = `≈ ${fmt(days, 0)} jour${Math.round(days) > 1 ? 's' : ''} de travail`;
  return { days, months, label };
}
