// Opérations d'écriture regroupées ici (transactions, cohérence des liens).
import { db, newId, nowIso } from './db';
import type { Attachment, Note, Task, TaskDraft, TaskTemplate } from './schema';

/** Crée ou met à jour une tâche avec ses pièces jointes (ajouts et suppressions). */
export async function saveTask(id: string, draft: TaskDraft, newAttachments: Attachment[], removedAttachmentIds: string[]) {
  await db.transaction('rw', db.tasks, db.attachments, db.settings, async () => {
    const existing = await db.tasks.get(id);
    const now = nowIso();
    const task: Task = { ...draft, id, createdAt: existing?.createdAt ?? now, updatedAt: now };
    await db.tasks.put(task);
    if (newAttachments.length) await db.attachments.bulkPut(newAttachments);
    if (removedAttachmentIds.length) await db.attachments.bulkDelete(removedAttachmentIds);
    await db.settings.update('settings', { lastCategoryId: draft.categoryId });
  });
}

export async function deleteTask(id: string) {
  await db.transaction('rw', db.tasks, db.attachments, db.notes, async () => {
    await db.attachments.where('taskId').equals(id).delete();
    await db.tasks.delete(id);
    // Retire le lien depuis les notes concernées.
    const notes = await db.notes.where('taskIds').equals(id).toArray();
    for (const n of notes) await db.notes.update(n.id, { taskIds: n.taskIds.filter((t) => t !== id) });
  });
}

/** Restaure une tâche supprimée (bouton « Annuler »). */
export async function restoreTask(task: Task, attachments: Attachment[], notes: Note[]) {
  await db.transaction('rw', db.tasks, db.attachments, db.notes, async () => {
    await db.tasks.put(task);
    await db.attachments.bulkPut(attachments);
    await db.notes.bulkPut(notes);
  });
}

export async function toggleStar(task: Task) {
  await db.tasks.update(task.id, { starred: !task.starred, updatedAt: nowIso() });
}

/** Champs repris lors d'une duplication ou d'un modèle (tout sauf la date, les preuves et l'étoile). */
export function reusableFields(t: Partial<Task>): TaskTemplate['task'] {
  return {
    description: t.description, categoryId: t.categoryId, outOfScope: t.outOfScope, responsibility: t.responsibility,
    durationMin: t.durationMin, impactText: t.impactText, impactUnit: t.impactUnit, requestedBy: t.requestedBy,
    tags: t.tags ?? [], skills: t.skills ?? [],
  };
}

export async function saveTemplate(label: string, from: Partial<Task>) {
  const tpl: TaskTemplate = { id: newId(), label, task: reusableFields(from), usageCount: 0 };
  await db.templates.add(tpl);
  return tpl;
}

export async function bumpTemplate(id: string) {
  const t = await db.templates.get(id);
  if (t) await db.templates.update(id, { usageCount: t.usageCount + 1 });
}

export async function deleteNote(id: string) {
  await db.notes.delete(id);
}

// ---------- Liste « À faire » ----------

/** Ajoute un ou plusieurs éléments à la fin de la liste. */
export async function addTodos(lines: string[]) {
  const last = await db.todos.orderBy('order').last();
  let order = (last?.order ?? 0) + 1;
  const now = nowIso();
  await db.todos.bulkAdd(lines.map((text) => ({ id: newId(), text, order: order++, createdAt: now, updatedAt: now })));
}

export async function updateTodoText(id: string, text: string) {
  await db.todos.update(id, { text, updatedAt: nowIso() });
}

export async function deleteTodo(id: string) {
  await db.todos.delete(id);
}

/** Marque l'élément comme fait une fois la tâche correspondante enregistrée. */
export async function completeTodo(id: string, taskId: string) {
  const now = nowIso();
  await db.todos.update(id, { doneAt: now, taskId, updatedAt: now });
}
