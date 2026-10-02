// Bloc-notes : liste, recherche et filtres par tag.
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JournalTabs } from '../components/JournalTabs';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { useNotes } from '../hooks/data';
import { useSessionState } from '../hooks/useSessionState';
import { formatShort } from '../lib/dates';
import { filterNotes } from '../lib/search';
import { allTags } from '../lib/stats';

export default function Notes() {
  const navigate = useNavigate();
  const notes = useNotes();
  const [f, setF] = useSessionState('notes-filters', { text: '', tags: [] as string[] });
  const tags = useMemo(() => allTags(notes), [notes]);
  const list = filterNotes(notes, f.text, f.tags);

  return (
    <div className="page">
      <PageHeader title="Journal" actions={
        <button className="btn icon ghost" aria-label="Nouvelle note" onClick={() => navigate('/notes/nouvelle')}><Icon name="plus" /></button>
      } />
      <JournalTabs />
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <span style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-3)' }}><Icon name="search" size={20} /></span>
        <input type="search" placeholder="Rechercher dans les notes…" value={f.text} style={{ paddingLeft: 38 }}
          onChange={(e) => setF({ ...f, text: e.target.value })} />
      </div>
      {tags.length > 0 && (
        <div className="chips-scroll" style={{ marginBottom: 10 }}>
          {tags.map((t) => (
            <button key={t} className={`chip small ${f.tags.includes(t) ? 'on' : ''}`}
              onClick={() => setF({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] })}>#{t}</button>
          ))}
        </div>
      )}
      {list.length === 0 && (
        <div className="empty">
          {notes.length === 0 ? 'Aucune note. Idéal pour garder le contexte d’une réussite ou d’une difficulté.' : 'Aucun résultat.'}
          {notes.length === 0 && <div style={{ marginTop: 12 }}><button className="btn primary" onClick={() => navigate('/notes/nouvelle')}><Icon name="plus" /> Nouvelle note</button></div>}
        </div>
      )}
      {list.map((n) => (
        <Link key={n.id} to={`/notes/${n.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div className="row"><strong style={{ flex: 1 }}>{n.title || 'Sans titre'}</strong><span className="tiny muted">{formatShort(n.date)}</span></div>
          <div className="small muted" style={{ marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {n.content.replace(/[#*_>`-]/g, '').slice(0, 220)}
          </div>
          <div className="row-wrap" style={{ marginTop: 6 }}>
            {n.tags.map((t) => <span key={t} className="badge">#{t}</span>)}
            {n.taskIds.length > 0 && <span className="badge accent"><Icon name="link" size={12} /> {n.taskIds.length} tâche{n.taskIds.length > 1 ? 's' : ''}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}
