// Valeurs par défaut créées au premier lancement.
import { db, newId } from './db';
import { SCHEMA_VERSION, type Category, type Settings } from './schema';

const DEFAULT_CATEGORIES: [string, string][] = [
  ['Accueil', '#2f7d6d'],
  ['Administratif', '#4a6fa5'],
  ['Logistique/colis', '#b7791f'],
  ['Événementiel', '#b5487a'],
  ['Coordination', '#6b5bb5'],
  ['Support IT', '#2b8bbf'],
  ['Formation de collègues', '#c05a3b'],
  ['Projet/amélioration', '#5c8a2e'],
  ['Autre', '#7a7a7a'],
];

// Poste laissé vide : chaque personne le renseigne à l'écran de premier lancement.
export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  jobTitle: '',
  employer: '',
  client: '',
  jobDescription: [],
  theme: 'auto',
  holidayCountry: 'FR',
  customDaysOff: [],
  skillsEnabled: true,
  schemaVersion: SCHEMA_VERSION,
};

/** Crée les catégories et les réglages s'ils n'existent pas encore. */
export async function ensureSeed() {
  await db.transaction('rw', db.categories, db.settings, async () => {
    if ((await db.categories.count()) === 0) {
      const cats: Category[] = DEFAULT_CATEGORIES.map(([name, color], i) => ({
        id: newId(), name, color, order: i, archived: false,
      }));
      await db.categories.bulkAdd(cats);
    }
    if (!(await db.settings.get('settings'))) await db.settings.add(DEFAULT_SETTINGS);
  });
  // Installations antérieures à l'écran de premier lancement : si des données existent déjà,
  // on ne le réaffiche pas.
  const s = await db.settings.get('settings');
  if (s && s.onboarded === undefined) {
    const hasData = (await db.tasks.count()) + (await db.notes.count()) + (await db.todos.count()) > 0;
    if (hasData) await db.settings.update('settings', { onboarded: true });
  }
  // Demande au navigateur de ne pas effacer les données en cas de manque d'espace.
  try { await navigator.storage?.persist?.(); } catch { /* non supporté */ }
}
