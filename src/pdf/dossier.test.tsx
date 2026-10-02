// Vérifie que le dossier PDF se génère avec des données réalistes.
// DOSSIER_OUT=/chemin/fichier.pdf npm test  → écrit aussi le PDF pour relecture visuelle.
import { renderToBuffer } from '@react-pdf/renderer';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../db/seed';
import type { Category, Review, Task } from '../db/schema';
import { buildDossierData } from './data';
import { DossierDocument, pdfText } from './Dossier';

const cats: Category[] = [
  ['c1', 'Accueil', '#2f7d6d'], ['c2', 'Logistique/colis', '#b7791f'], ['c3', 'Support IT', '#2b8bbf'],
  ['c4', 'Formation de collègues', '#c05a3b'], ['c5', 'Projet/amélioration', '#5c8a2e'],
].map(([id, name, color], order) => ({ id, name, color, order, archived: false }));

const task = (i: number, p: Partial<Task>): Task => ({
  id: `t${i}`, date: '2026-03-02', description: 'Accueil des visiteurs', categoryId: 'c1', attachmentIds: [], tags: [], skills: [],
  starred: false, createdAt: '', updatedAt: '', ...p,
});

const tasks: Task[] = [];
for (let i = 0; i < 120; i++) {
  const m = String(1 + (i % 9)).padStart(2, '0');
  const d = String(1 + (i % 27)).padStart(2, '0');
  const cat = cats[i % cats.length];
  tasks.push(task(i, {
    date: `2026-${m}-${d}`, categoryId: cat.id, durationMin: 30 + (i % 4) * 15,
    description: ['Accueil des visiteurs', 'Réception de 40 colis', 'Configuration du Wi-Fi invités', 'Formation d’un intérimaire', 'Création d’un tableau de suivi des salles'][i % 5],
    outOfScope: i % 5 >= 2, responsibility: (['execution', 'coordination', 'initiative', 'remplacement'] as const)[i % 4],
    starred: i % 11 === 0, impactValue: i % 11 === 0 ? 2 : undefined, impactUnit: i % 11 === 0 ? 'h gagnées par semaine' : undefined,
    feedback: i % 13 === 0 ? 'Merci, c’est très apprécié — 1 000 fois merci !' : undefined, requestedBy: 'Manager',
    skills: i % 5 === 2 ? ['informatique'] : [],
  }));
}
const reviews: Review[] = [{ id: '2026-Q1', periodType: 'quarter', periodKey: '2026-Q1', mainAchievement: 'Suivi des salles', newSkill: 'Excel', difficulty: '', doDifferently: '', updatedAt: '' }];

describe('dossier PDF', () => {
  it('nettoie les caractères hors WinAnsi', () => {
    expect(pdfText('1 000 − ok ✓ 🎉 €')).toBe('1 000 - ok v  €');
  });
  it('se génère', async () => {
    const data = buildDossierData('2026', tasks, cats, reviews, [], DEFAULT_SETTINGS);
    expect(data.top.length).toBeLessThanOrEqual(10);
    const buf = await renderToBuffer(<DossierDocument d={data} images={new Map()} />);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    if (process.env.DOSSIER_OUT) writeFileSync(process.env.DOSSIER_OUT, buf);
  }, 30_000);
});
