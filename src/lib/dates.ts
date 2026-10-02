// Utilitaires pour les jours au format "YYYY-MM-DD" (heure locale).
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const toDay = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseDay = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => toDay(new Date());

export const addDays = (s: string, n: number): string => {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return toDay(d);
};

/** "vendredi 2 octobre 2026" */
export const formatLong = (s: string) => format(parseDay(s), 'EEEE d MMMM yyyy', { locale: fr });
/** "ven. 2 oct." */
export const formatShort = (s: string) => format(parseDay(s), 'EEE d MMM', { locale: fr });
/** "02/10/2026" */
export const formatNum = (s: string) => format(parseDay(s), 'dd/MM/yyyy');

/** "1 h 30", "45 min" */
export function formatDuration(min: number | undefined): string {
  if (!min) return '0 min';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** "2 octobre 2026" */
export const formatMedium = (s: string) => format(parseDay(s), 'd MMMM yyyy', { locale: fr });

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
