import { describe, expect, it } from 'vitest';
import { easter, holidays } from './holidays';
import { computeStreak, countWorkingDays, isWorkingDay } from './workdays';
import { childPeriods, periodKey, periodLabel, periodRange, shiftPeriod } from './periods';
import { weeklyReviewDue } from './reminders';
import { filterTasks, EMPTY_FILTERS } from './search';
import { computeStats } from './stats';
import { tasksToCsv } from './csv';
import type { Task } from '../db/schema';

const FR = { holidayCountry: 'FR' as const, customDaysOff: [] as string[] };

describe('jours fériés', () => {
  it('calcule Pâques', () => {
    expect(easter(2026)).toBe('2026-04-05');
    expect(easter(2027)).toBe('2027-03-28');
  });
  it('France 2026', () => {
    const h = holidays(2026, 'FR');
    expect(h.has('2026-04-06')).toBe(true); // lundi de Pâques
    expect(h.has('2026-05-14')).toBe(true); // Ascension
    expect(h.has('2026-05-25')).toBe(true); // Pentecôte
    expect(h.size).toBe(11);
  });
  it('Jeûne genevois 2026 = 10 septembre', () => {
    expect(holidays(2026, 'CH-GE').has('2026-09-10')).toBe(true);
  });
});

describe('jours ouvrés et série', () => {
  it('exclut week-ends, fériés et jours personnalisés', () => {
    expect(isWorkingDay('2026-10-02', FR)).toBe(true); // vendredi
    expect(isWorkingDay('2026-10-03', FR)).toBe(false); // samedi
    expect(isWorkingDay('2026-11-11', FR)).toBe(false);
    expect(isWorkingDay('2026-10-01', { ...FR, customDaysOff: ['2026-10-01'] })).toBe(false);
  });
  it('ignore le week-end et ne casse pas la série si aujourd’hui est vide', () => {
    const days = new Set(['2026-10-01', '2026-09-30', '2026-09-29', '2026-09-28', '2026-09-25']);
    // vendredi 2 octobre sans saisie : série = jeu, mer, mar, lun, ven précédent
    expect(computeStreak(days, '2026-10-02', FR)).toEqual({ count: 5, todayDone: false, todayIsWorkingDay: true });
    // lundi 5 octobre : le week-end ne casse rien
    days.add('2026-10-02');
    expect(computeStreak(days, '2026-10-05', FR).count).toBe(6);
  });
  it('un jour ouvré manquant casse la série', () => {
    const days = new Set(['2026-10-02', '2026-09-30']);
    expect(computeStreak(days, '2026-10-02', FR).count).toBe(1);
  });
  it('les fériés ne cassent pas la série', () => {
    const days = new Set(['2026-11-12', '2026-11-10']);
    expect(computeStreak(days, '2026-11-12', FR).count).toBe(2);
  });
  it('compte les jours ouvrés', () => {
    expect(countWorkingDays('2026-11-09', '2026-11-13', FR)).toBe(4);
  });
});

describe('périodes', () => {
  it('clés', () => {
    expect(periodKey('week', '2026-10-02')).toBe('2026-W40');
    expect(periodKey('week', '2027-01-01')).toBe('2026-W53');
    expect(periodKey('quarter', '2026-10-02')).toBe('2026-Q4');
  });
  it('bornes', () => {
    expect(periodRange('week', '2026-W40')).toEqual({ start: '2026-09-28', end: '2026-10-04' });
    expect(periodRange('month', '2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(periodRange('quarter', '2026-Q4')).toEqual({ start: '2026-10-01', end: '2026-12-31' });
  });
  it('décalage', () => {
    expect(shiftPeriod('week', '2026-W01', -1)).toBe('2025-W52');
    expect(shiftPeriod('month', '2026-01', -1)).toBe('2025-12');
    expect(shiftPeriod('quarter', '2026-Q1', -1)).toBe('2025-Q4');
  });
  it('sous-périodes et libellés', () => {
    expect(childPeriods('quarter', '2026-Q4').map((p) => p.key)).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(childPeriods('year', '2026')).toHaveLength(4);
    expect(periodLabel('month', '2026-10')).toBe('Octobre 2026');
    expect(periodLabel('quarter', '2026-Q1')).toBe('1er trimestre 2026');
  });
});

describe('rappels', () => {
  it('bannière du vendredi 16 h', () => {
    expect(weeklyReviewDue(new Date(2026, 9, 2, 15, 59), undefined)).toBe(false);
    expect(weeklyReviewDue(new Date(2026, 9, 2, 16, 0), undefined)).toBe(true);
    expect(weeklyReviewDue(new Date(2026, 9, 3, 10), undefined)).toBe(true);
    expect(weeklyReviewDue(new Date(2026, 9, 2, 17), { completedAt: 'x' } as never)).toBe(false);
    expect(weeklyReviewDue(new Date(2026, 9, 5, 9), undefined)).toBe(false);
  });
});

const task = (p: Partial<Task>): Task => ({
  id: crypto.randomUUID(), date: '2026-10-01', description: 'x', categoryId: 'c1',
  attachmentIds: [], tags: [], skills: [], starred: false, createdAt: '', updatedAt: '', ...p,
});

describe('stats, recherche, CSV', () => {
  const tasks = [
    task({ description: 'Réception des colis', durationMin: 30, outOfScope: false, tags: ['colis'] }),
    task({ description: 'Formation Élodie sur le logiciel', categoryId: 'c2', durationMin: 60, outOfScope: true, responsibility: 'initiative', feedback: 'Merci !' }),
  ];
  it('stats', () => {
    const s = computeStats(tasks, [{ id: 'c1', name: 'Logistique', color: '#000', order: 0, archived: false }]);
    expect(s.count).toBe(2);
    expect(s.totalMin).toBe(90);
    expect(s.outOfScopePct).toBe(50);
    expect(s.initiatives).toHaveLength(1);
    expect(s.feedbacks).toHaveLength(1);
  });
  it('recherche sans accents', () => {
    expect(filterTasks(tasks, { ...EMPTY_FILTERS, text: 'reception' })).toHaveLength(1);
    expect(filterTasks(tasks, { ...EMPTY_FILTERS, text: 'elodie logiciel' })).toHaveLength(1);
    expect(filterTasks(tasks, { ...EMPTY_FILTERS, outOfScope: 'yes' })).toHaveLength(1);
    expect(filterTasks(tasks, { ...EMPTY_FILTERS, tags: ['colis'] })).toHaveLength(1);
  });
  it('CSV', () => {
    const csv = tasksToCsv([task({ description: 'a;b "c"' })], []);
    expect(csv.startsWith('﻿Date;')).toBe(true);
    expect(csv).toContain('"a;b ""c"""');
  });
});

import { keywords, splitTodoLines, suggestFromText } from './suggest';

describe('suggestions « À faire »', () => {
  const cats = [
    { id: 'acc', name: 'Accueil', color: '', order: 0, archived: false },
    { id: 'log', name: 'Logistique/colis', color: '', order: 1, archived: false },
    { id: 'it', name: 'Support IT', color: '', order: 2, archived: false },
    { id: 'form', name: 'Formation de collègues', color: '', order: 3, archived: false },
  ];
  it('mots-clés', () => {
    expect(keywords('Réceptionner les colis du matin')).toEqual(['receptionner', 'coli', 'matin']);
    expect(suggestFromText('Réceptionner les colis', [], cats)).toMatchObject({ categoryId: 'log', categoryReason: 'mots-clés' });
    expect(suggestFromText("Réparer l'imprimante du 2e", [], cats).categoryId).toBe('it');
    expect(suggestFromText('Former le nouvel intérimaire', [], cats).categoryId).toBe('form');
    expect(suggestFromText('zzz', [], cats).categoryId).toBeUndefined();
  });
  it('apprend des tâches passées', () => {
    const past = [task({ description: 'Mise à jour du tableau des badges', categoryId: 'acc', outOfScope: true, durationMin: 20, responsibility: 'initiative' })];
    const s = suggestFromText('mise à jour tableau badges', past, cats);
    expect(s).toMatchObject({ categoryId: 'acc', categoryReason: 'similaire', outOfScope: true, durationMin: 20, responsibility: 'initiative' });
  });
  it('découpe les lignes collées', () => {
    expect(splitTodoLines('- colis\n\n2) imprimante\n• badge  \n[ ] appel')).toEqual(['colis', 'imprimante', 'badge', 'appel']);
  });
});

import { hashPin, isValidPin, lockoutDelay, verifyPin } from './pin';

describe('code de verrouillage', () => {
  it('vérifie le bon code et refuse les autres', async () => {
    const h = await hashPin('2580');
    expect(h.pinHash).not.toContain('2580');
    expect(await verifyPin('2580', h.pinHash, h.pinSalt)).toBe(true);
    expect(await verifyPin('2581', h.pinHash, h.pinSalt)).toBe(false);
  });
  it('format et délais', () => {
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('12a4')).toBe(false);
    expect(lockoutDelay(4)).toBe(0);
    expect(lockoutDelay(5)).toBe(30_000);
    expect(lockoutDelay(6)).toBe(60_000);
  });
});

import { counterTotals, countsToCsv, DEFAULT_COUNTERS } from './counters';
import { recurringToCreate } from '../db/recurring';

describe('compteurs et tâches quotidiennes', () => {
  const counts = [
    { id: '2026-10-01', date: '2026-10-01', values: { visiteurs: 12, 'colis-recus': 30 }, updatedAt: '' },
    { id: '2026-10-02', date: '2026-10-02', values: { visiteurs: 8, sav: 2 }, updatedAt: '' },
    { id: '2026-09-15', date: '2026-09-15', values: { visiteurs: 100 }, updatedAt: '' },
  ];
  it('totaux par période', () => {
    const t = counterTotals(counts, DEFAULT_COUNTERS, '2026-10-01', '2026-10-31');
    expect(t.find((x) => x.counter.id === 'visiteurs')).toMatchObject({ total: 20, days: 2, average: 10, max: 12 });
    expect(t.find((x) => x.counter.id === 'colis-coffre')).toMatchObject({ total: 0, days: 0 });
  });
  it('CSV', () => {
    const csv = countsToCsv(counts, DEFAULT_COUNTERS);
    expect(csv.split('\r\n')[1]).toBe('15/09/2026;100;0;0;0;0');
  });
  it('tâches quotidiennes les jours ouvrés seulement', () => {
    const s = { holidayCountry: 'FR' as const, customDaysOff: [], recurring: [
      { id: 'r1', text: 'Relever le courrier', weekdays: [1, 2, 3, 4, 5], active: true },
      { id: 'r2', text: 'Commande fournitures', weekdays: [1], active: true },
      { id: 'r3', text: 'Inactive', weekdays: [1, 2, 3, 4, 5], active: false },
    ] };
    expect(recurringToCreate('2026-10-05', s, [])).toEqual(['r1', 'r2']); // lundi
    expect(recurringToCreate('2026-10-02', s, [])).toEqual(['r1']); // vendredi
    expect(recurringToCreate('2026-10-03', s, [])).toEqual([]); // samedi
    expect(recurringToCreate('2026-11-11', s, [])).toEqual([]); // férié
    const existing = [{ id: 'x', text: '', order: 0, createdAt: '', updatedAt: '', recurringId: 'r1', date: '2026-10-02' }];
    expect(recurringToCreate('2026-10-02', s, existing)).toEqual([]);
  });
});
