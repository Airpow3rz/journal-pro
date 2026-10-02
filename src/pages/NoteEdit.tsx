// Édition d'une note markdown, reliable à une ou plusieurs tâches.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { TagInput } from '../components/ui/TagInput';
import { useToast } from '../components/ui/Toast';
import { deleteNote } from '../db/actions';
import { db, newId, nowIso } from '../db/db';
import type { Note } from '../db/schema';
import { useCategories, useNotes, useTasks } from '../hooks/data';
import { formatShort, today } from '../lib/dates';
import { renderMarkdown } from '../lib/markdown';
import { filterTasks, EMPTY_FILTERS } from '../lib/search';
import { allTags } from '../lib/stats';

export default function NoteEdit() {
  const { id: routeId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const tasks = useTasks() ?? [];
  const notes = useNotes();
  const categories = useCategories();
  const [note, setNote] = useState<Note | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [taskSearch, setTaskSearch] = useState('');
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  useEffect(() => {
    (async () => {
      if (routeId) {
        const n = await db.notes.get(routeId);
        if (!n) { navigate('/notes', { replace: true }); return; }
        setNote(n);
        setMode(n.content ? 'preview' : 'edit');
      } else {
        const linked = params.get('tache');
        setNote({ id: newId(), title: '', content: '', date: today(), tags: [], taskIds: linked ? [linked] : [], createdAt: nowIso(), updatedAt: nowIso() });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  const tagSuggestions = useMemo(() => allTags(notes), [notes]);
  if (!note) return <div className="page" />;

  const set = (patch: Partial<Note>) => setNote({ ...note, ...patch });
  const linked = tasks.filter((t) => note.taskIds.includes(t.id));
  const candidates = taskSearch.trim()
    ? filterTasks(tasks, { ...EMPTY_FILTERS, text: taskSearch }).filter((t) => !note.taskIds.includes(t.id)).slice(0, 8)
    : [];

  const save = async () => {
    await db.notes.put({ ...note, title: note.title.trim(), updatedAt: nowIso() });
    toast('Note enregistrée');
    if (window.history.length > 1) navigate(-1); else navigate('/notes');
  };
  const remove = async () => {
    if (!confirm('Supprimer cette note ?')) return;
    await deleteNote(note.id);
    navigate(-1);
  };

  return (
    <div className="page">
      <PageHeader back settings={false} title={routeId ? 'Note' : 'Nouvelle note'}
        actions={routeId && <button className="btn icon ghost danger" aria-label="Supprimer" onClick={remove}><Icon name="trash" /></button>} />
      <div className="stack">
        <input type="text" placeholder="Titre" value={note.title} onChange={(e) => set({ title: e.target.value })}
          style={{ fontWeight: 600, fontSize: '1.1rem' }} />
        <label className="field">Date<input type="date" value={note.date} onChange={(e) => set({ date: e.target.value || today() })} /></label>

        <Segmented value={mode} onChange={setMode} options={[{ value: 'edit', label: 'Écrire' }, { value: 'preview', label: 'Aperçu' }]} />
        {mode === 'edit' ? (
          <textarea rows={10} value={note.content} onChange={(e) => set({ content: e.target.value })}
            placeholder={'Markdown accepté : **gras**, - liste, # titre…'} />
        ) : (
          <div className="card markdown" style={{ minHeight: 120 }} onClick={() => setMode('edit')}
            dangerouslySetInnerHTML={{ __html: note.content ? renderMarkdown(note.content) : '<p class="muted">Vide. Touchez pour écrire.</p>' }} />
        )}
        <p className="warning-note"><Icon name="shield" size={14} /> Ne pas saisir de noms de clients ou d’informations sensibles, anonymiser.</p>

        <div className="field">
          <span className="small muted" style={{ fontWeight: 500 }}>Tags</span>
          <TagInput value={note.tags} onChange={(tags) => set({ tags })} suggestions={tagSuggestions} />
        </div>

        <div className="field">
          <span className="small muted" style={{ fontWeight: 500 }}>Tâches liées</span>
          {linked.map((t) => (
            <div key={t.id} className="list-row">
              <span className="cat-dot" style={{ background: catMap.get(t.categoryId)?.color, marginTop: 0 }} />
              <span style={{ flex: 1 }} className="small">{t.description}<br /><span className="tiny muted">{formatShort(t.date)}</span></span>
              <button className="btn icon ghost" aria-label="Retirer le lien" onClick={() => set({ taskIds: note.taskIds.filter((x) => x !== t.id) })}><Icon name="x" size={18} /></button>
            </div>
          ))}
          <input type="search" placeholder="Relier une tâche : rechercher…" value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} />
          {candidates.map((t) => (
            <button key={t.id} type="button" className="list-row" style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer', width: '100%' }}
              onClick={() => { set({ taskIds: [...note.taskIds, t.id] }); setTaskSearch(''); }}>
              <Icon name="link" size={16} />
              <span style={{ flex: 1 }} className="small">{t.description}<br /><span className="tiny muted">{formatShort(t.date)}</span></span>
            </button>
          ))}
        </div>

        <div className="sticky-actions">
          <button className="btn primary block" onClick={save}><Icon name="check" size={20} /> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
