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
