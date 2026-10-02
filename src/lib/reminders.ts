// Rappels affichés dans l'app (aucune notification système).
import type { Review, Settings } from '../db/schema';
import { toDay } from './dates';
import { periodKey } from './periods';

/**
 * Bannière « Faire le bilan de la semaine » : du vendredi 16 h jusqu'au dimanche soir,
 * tant que le bilan de la semaine en cours n'est pas marqué comme fait.
 */
export function weeklyReviewDue(now: Date, review: Review | undefined): boolean {
  const dow = now.getDay();
  const afterFriday16 = (dow === 5 && now.getHours() >= 16) || dow === 6 || dow === 0;
  return afterFriday16 && !review?.completedAt;
}

export const currentWeekKey = (now = new Date()) => periodKey('week', toDay(now));

/** Rappel mensuel de sauvegarde : jamais sauvegardé, ou dernière sauvegarde de plus de 30 jours. */
export function backupDue(now: Date, settings: Settings | undefined, hasData: boolean): boolean {
  if (!settings || !hasData) return false;
  if (!settings.lastBackupAt) return true;
  return now.getTime() - new Date(settings.lastBackupAt).getTime() > 30 * 24 * 3600 * 1000;
}
