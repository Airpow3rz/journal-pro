// Modèle de données de l'application.
// Les jours sont des chaînes "YYYY-MM-DD" (pas de problème de fuseau horaire),
// les horodatages sont des chaînes ISO complètes.

export type ResponsibilityLevel = 'execution' | 'coordination' | 'initiative' | 'remplacement';

export const RESPONSIBILITY_LABELS: Record<ResponsibilityLevel, string> = {
  execution: 'Exécution',
  coordination: 'Coordination',
  initiative: 'Initiative personnelle',
  remplacement: "Remplacement d'un collègue",
};

export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
  /** Une catégorie déjà utilisée n'est jamais supprimée : on l'archive. */
  archived: boolean;
}

export interface Task {
  id: string;
  date: string;
  description: string;
  categoryId: string;
  // --- Détails facultatifs ---
  outOfScope?: boolean;
  responsibility?: ResponsibilityLevel;
  durationMin?: number;
  impactText?: string;
  impactValue?: number;
  impactUnit?: string;
  /** Fonction du demandeur, jamais un nom ("manager ISS", "équipe boutique"…). */
  requestedBy?: string;
  feedback?: string;
  attachmentIds: string[];
  tags: string[];
  skills: string[];
  /** Candidate au Top 10 des réalisations du dossier annuel. */
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Champs d'une tâche qu'un modèle peut pré-remplir. */
export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export interface TaskTemplate {
  id: string;
  label: string;
  task: Partial<Omit<TaskDraft, 'date' | 'attachmentIds'>>;
  usageCount: number;
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string; // markdown
  date: string;
  tags: string[];
  /** Le lien note ↔ tâches est stocké uniquement ici (index multi-valeurs). */
  taskIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type PeriodType = 'week' | 'month' | 'quarter' | 'year';

/** Bilan d'une période : seules les réflexions sont stockées, les chiffres sont recalculés. */
export interface Review {
  id: string; // = periodKey : "2026-W40", "2026-10", "2026-Q4", "2026"
  periodType: PeriodType;
  periodKey: string;
  mainAchievement: string;
  newSkill: string;
  difficulty: string;
  doDifferently: string;
  completedAt?: string;
  updatedAt: string;
}

export type HolidayCountry = 'FR' | 'BE' | 'LU' | 'CH-GE' | 'none';

export type ThemeChoice = 'auto' | 'light' | 'dark';

export interface Settings {
  id: 'settings';
  jobTitle: string;
  employer: string;
  client: string;
  /** Fiche de poste contractuelle : une mission par ligne. */
  jobDescription: string[];
  theme: ThemeChoice;
  lastBackupAt?: string;
  /** Jours fériés exclus du calcul de la série de jours consécutifs. */
  holidayCountry: HolidayCountry;
  /** Jours non travaillés supplémentaires (ponts, fermetures, congés). */
  customDaysOff: string[];
  /** Affiche le champ « Compétences » dans le formulaire de tâche. */
  skillsEnabled: boolean;
  /** Dernière catégorie utilisée, pré-sélectionnée à la saisie. */
  lastCategoryId?: string;
  /** Top 10 du dossier, par année : identifiants de tâches dans l'ordre choisi. */
  dossierTopIds?: Record<string, string[]>;
  schemaVersion: number;
}

export const SCHEMA_VERSION = 1;
