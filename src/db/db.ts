// Base IndexedDB (via Dexie). Toutes les données restent dans l'appareil.
import Dexie, { type EntityTable } from 'dexie';
import type { Attachment, Category, Note, Review, Settings, Task, TaskTemplate } from './schema';

export class JournalDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  templates!: EntityTable<TaskTemplate, 'id'>;
  attachments!: EntityTable<Attachment, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  reviews!: EntityTable<Review, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor() {
    super('journal-pro');
    // Pour faire évoluer le schéma : ajouter db.version(2).stores({...}).upgrade(...)
    this.version(1).stores({
      tasks: 'id, date, categoryId, outOfScope, starred, responsibility, *tags, *skills, updatedAt',
      categories: 'id, order',
      templates: 'id, usageCount',
      attachments: 'id, taskId',
      notes: 'id, date, *tags, *taskIds, updatedAt',
      reviews: 'id, periodType, periodKey',
      settings: 'id',
    });
  }
}

export const db = new JournalDB();

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
