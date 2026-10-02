// Sauvegarde et restauration JSON de toutes les données, pièces jointes comprises (en base64).
import { db, nowIso } from './db';
import { SCHEMA_VERSION, type Attachment, type Category, type Note, type Review, type Settings, type Task, type TaskTemplate, type Todo } from './schema';

interface SerializedAttachment extends Omit<Attachment, 'blob'> { dataBase64: string }

export interface BackupFile {
  app: 'journal-pro';
  schemaVersion: number;
  exportedAt: string;
  tasks: Task[];
  categories: Category[];
  templates: TaskTemplate[];
  notes: Note[];
  reviews: Review[];
  settings: Settings | null;
  /** Absent des sauvegardes de la version 1. */
  todos?: Todo[];
  attachments: SerializedAttachment[];
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function exportBackup(): Promise<BackupFile> {
  const attachments = await db.attachments.toArray();
  return {
    app: 'journal-pro',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    tasks: await db.tasks.toArray(),
    categories: await db.categories.toArray(),
    templates: await db.templates.toArray(),
    notes: await db.notes.toArray(),
    reviews: await db.reviews.toArray(),
    settings: (await db.settings.get('settings')) ?? null,
    todos: await db.todos.toArray(),
    attachments: await Promise.all(attachments.map(async ({ blob, ...rest }) => ({ ...rest, dataBase64: await blobToBase64(blob) }))),
  };
}

/** Enregistre la date de la dernière sauvegarde (rappel mensuel). */
export async function markBackupDone() {
  await db.settings.update('settings', { lastBackupAt: nowIso() });
}

export function parseBackup(text: string): BackupFile {
  const data = JSON.parse(text);
  if (data?.app !== 'journal-pro' || !Array.isArray(data.tasks)) throw new Error("Ce fichier n'est pas une sauvegarde Journal Pro.");
  if (data.schemaVersion > SCHEMA_VERSION) throw new Error("Sauvegarde créée par une version plus récente de l'app : mettez l'app à jour.");
  return data as BackupFile;
}

/** Garde l'élément le plus récemment modifié (pour la fusion). */
async function mergeTable<T extends { id: string; updatedAt?: string }>(table: { get(id: string): PromiseLike<T | undefined>; put(item: T): PromiseLike<unknown> }, items: T[]) {
  for (const item of items) {
    const existing = await table.get(item.id);
    if (!existing || !existing.updatedAt || !item.updatedAt || item.updatedAt >= existing.updatedAt) await table.put(item);
  }
}

/**
 * - "replace" : efface tout puis restaure la sauvegarde.
 * - "merge" : ajoute ce qui manque ; en cas de doublon, la version modifiée le plus récemment l'emporte.
 */
export async function importBackup(data: BackupFile, mode: 'merge' | 'replace') {
  const attachments: Attachment[] = data.attachments.map(({ dataBase64, ...rest }) => ({ ...rest, blob: base64ToBlob(dataBase64, rest.mime) }));
  const tables = [db.tasks, db.categories, db.templates, db.notes, db.reviews, db.settings, db.attachments, db.todos];
  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      await Promise.all(tables.map((t) => t.clear()));
      await db.tasks.bulkPut(data.tasks);
      await db.categories.bulkPut(data.categories);
      await db.templates.bulkPut(data.templates ?? []);
      await db.notes.bulkPut(data.notes ?? []);
      await db.reviews.bulkPut(data.reviews ?? []);
      await db.attachments.bulkPut(attachments);
      await db.todos.bulkPut(data.todos ?? []);
      if (data.settings) await db.settings.put(data.settings);
    } else {
      await mergeTable<Task>(db.tasks as never, data.tasks);
      await mergeTable<Note>(db.notes as never, data.notes ?? []);
      await mergeTable<Review>(db.reviews as never, data.reviews ?? []);
      await mergeTable<Todo>(db.todos as never, data.todos ?? []);
      for (const c of data.categories) if (!(await db.categories.get(c.id))) await db.categories.put(c);
      for (const t of data.templates ?? []) if (!(await db.templates.get(t.id))) await db.templates.put(t);
      for (const a of attachments) if (!(await db.attachments.get(a.id))) await db.attachments.put(a);
      // En fusion, les réglages locaux sont conservés.
    }
  });
}
