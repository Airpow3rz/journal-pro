// Jours fériés calculés (aucune donnée externe). Utilisés pour la série de jours ouvrés.
import type { HolidayCountry } from '../db/schema';
import { addDays, toDay } from './dates';

/** Date de Pâques (algorithme grégorien anonyme), au format "YYYY-MM-DD". */
export function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toDay(new Date(year, month - 1, day));
}

const fixed = (y: number, m: number, d: number) => toDay(new Date(y, m - 1, d));

export const HOLIDAY_COUNTRY_LABELS: Record<HolidayCountry, string> = {
  FR: 'France',
  BE: 'Belgique',
  LU: 'Luxembourg',
  'CH-GE': 'Suisse (Genève)',
  none: 'Aucun',
};

const cache = new Map<string, Set<string>>();

/** Ensemble des jours fériés d'une année pour un pays. */
export function holidays(year: number, country: HolidayCountry): Set<string> {
  const key = `${country}-${year}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const e = easter(year);
  const easterMonday = addDays(e, 1);
  const ascension = addDays(e, 39);
  const whitMonday = addDays(e, 50);
  let days: string[] = [];
  switch (country) {
    case 'FR':
      days = [fixed(year, 1, 1), easterMonday, fixed(year, 5, 1), fixed(year, 5, 8), ascension, whitMonday,
        fixed(year, 7, 14), fixed(year, 8, 15), fixed(year, 11, 1), fixed(year, 11, 11), fixed(year, 12, 25)];
      break;
    case 'BE':
      days = [fixed(year, 1, 1), easterMonday, fixed(year, 5, 1), ascension, whitMonday,
        fixed(year, 7, 21), fixed(year, 8, 15), fixed(year, 11, 1), fixed(year, 11, 11), fixed(year, 12, 25)];
      break;
    case 'LU':
      days = [fixed(year, 1, 1), easterMonday, fixed(year, 5, 1), fixed(year, 5, 9), ascension, whitMonday,
        fixed(year, 6, 23), fixed(year, 8, 15), fixed(year, 11, 1), fixed(year, 12, 25), fixed(year, 12, 26)];
      break;
    case 'CH-GE': {
      // Jeûne genevois : jeudi qui suit le premier dimanche de septembre.
      const sept1 = new Date(year, 8, 1);
      const firstSunday = 1 + ((7 - sept1.getDay()) % 7);
      days = [fixed(year, 1, 1), addDays(e, -2), easterMonday, ascension, whitMonday, fixed(year, 8, 1),
        fixed(year, 9, firstSunday + 4), fixed(year, 12, 25), fixed(year, 12, 31)];
      break;
    }
    case 'none':
      days = [];
  }
  const set = new Set(days);
  cache.set(key, set);
  return set;
}
