// Suggestions locales pour pré-remplir une tâche à partir d'un simple texte (« À faire »).
// Aucun service externe : on combine des mots-clés par catégorie et les tâches déjà saisies,
// ce qui fait « apprendre » l'app de vos choix (chaque tâche enregistrée sert d'exemple).
import type { Category, ResponsibilityLevel, Task } from '../db/schema';
import { normalize } from './search';

const STOPWORDS = new Set(
  ('les des une un le la de du et en pour par sur avec dans au aux a à l d mon ma mes son sa ses leur leurs ce cet cette ces ' +
    'est sont fait faire qui que quoi pas plus tout tous toute toutes nous vous ils elles je tu il elle on se sa ' +
    'ou mais donc car ni puis apres avant entre chez vers sans sous').split(' '),
);

/** Mots significatifs d'un texte (sans accents, sans mots vides, racine grossière). */
export function keywords(text: string): string[] {
  return [...new Set(
    normalize(text)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
      // Racine simple : retire le pluriel et quelques terminaisons fréquentes.
      .map((w) => w.replace(/(ements|ement|ations|ation|s|x)$/, '')),
  )].filter((w) => w.length >= 3);
}

/** Mots-clés de départ pour les catégories par défaut (reconnues par leur nom). */
const RULES: { match: string; words: string[] }[] = [
  { match: 'accueil', words: ['accueil', 'visiteur', 'badge', 'telephone', 'appel', 'standard', 'invite', 'hote'] },
  { match: 'administratif', words: ['courrier', 'facture', 'classement', 'dossier', 'saisie', 'registre', 'commande', 'devis', 'archive', 'contrat', 'mail', 'tableau'] },
  { match: 'logistique', words: ['colis', 'livraison', 'paquet', 'stock', 'fourniture', 'carton', 'transporteur', 'expedition', 'enlevement', 'reception'] },
  { match: 'evenementiel', words: ['evenement', 'seminaire', 'dejeuner', 'cocktail', 'traiteur', 'fete', 'decoration', 'soiree', 'afterwork'] },
  { match: 'coordination', words: ['coordination', 'prestataire', 'menage', 'maintenance', 'intervention', 'technicien', 'planning', 'reunion'] },
  { match: 'support it', words: ['imprimante', 'wifi', 'ordinateur', 'informatique', 'ecran', 'reseau', 'logiciel', 'teams', 'outlook', 'scanner', 'badgeuse', 'visio'] },
  { match: 'formation', words: ['former', 'formation', 'interimaire', 'tuto', 'expliquer', 'onboarding', 'accompagner'] },
  { match: 'projet', words: ['projet', 'amelioration', 'process', 'procedure', 'optimiser', 'outil', 'creer', 'automatiser', 'proposer'] },
];

export interface Suggestion {
  categoryId?: string;
  /** Pourquoi cette catégorie (affiché discrètement dans le formulaire). */
  categoryReason?: 'similaire' | 'mots-clés';
  outOfScope?: boolean;
  durationMin?: number;
  responsibility?: ResponsibilityLevel;
  requestedBy?: string;
  /** Tâche passée la plus proche, servant de modèle aux valeurs suggérées. */
  similar?: Task;
}

function similarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  const inter = a.filter((w) => sb.has(w)).length;
  return inter / (a.length + b.length - inter);
}

export function suggestFromText(text: string, tasks: Task[], categories: Category[]): Suggestion {
  const words = keywords(text);
  const active = categories.filter((c) => !c.archived);
  if (!words.length || !active.length) return {};
  const activeIds = new Set(active.map((c) => c.id));

  // 1. Tâche la plus ressemblante parmi les plus récentes.
  let best: { task: Task; score: number } | undefined;
  for (const t of tasks.slice(0, 800)) {
    if (!activeIds.has(t.categoryId)) continue;
    const score = similarity(words, keywords(t.description));
    if (!best || score > best.score) best = { task: t, score };
  }

  // 2. Score par catégorie : historique (mot → catégorie) + mots-clés de départ.
  const history = new Map<string, number>();
  const scores = new Map<string, number>();
  const add = (m: Map<string, number>, id: string, v: number) => m.set(id, (m.get(id) ?? 0) + v);
  const wordSet = new Set(words);
  for (const t of tasks.slice(0, 800)) {
    if (!activeIds.has(t.categoryId)) continue;
    for (const w of keywords(t.description)) if (wordSet.has(w)) { add(history, t.categoryId, 1); add(scores, t.categoryId, 1); }
  }
  for (const c of active) {
    const rule = RULES.find((r) => normalize(c.name).includes(r.match));
    if (!rule) continue;
    for (const w of words) if (rule.words.some((rw) => w.startsWith(keywords(rw)[0]?.slice(0, 5) ?? rw))) add(scores, c.id, 1.5);
  }
  const top = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];

  const out: Suggestion = {};
  if (best && best.score >= 0.5) {
    // Tâche très proche : on reprend sa catégorie et ses réglages habituels.
    out.categoryId = best.task.categoryId;
    out.categoryReason = 'similaire';
    out.similar = best.task;
    out.outOfScope = best.task.outOfScope;
    out.durationMin = best.task.durationMin;
    out.responsibility = best.task.responsibility;
    out.requestedBy = best.task.requestedBy;
  } else if (top) {
    out.categoryId = top[0];
    out.categoryReason = history.has(top[0]) ? 'similaire' : 'mots-clés';
  }
  return out;
}

/** Découpe un texte collé ou dicté en éléments « À faire » (une ligne = un élément). */
export function splitTodoLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)]|\[ ?\])\s*/, '').trim())
    .filter(Boolean);
}
