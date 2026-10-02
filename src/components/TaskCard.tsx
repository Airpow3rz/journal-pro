import { useNavigate } from 'react-router-dom';
import { toggleStar } from '../db/actions';
import { RESPONSIBILITY_LABELS, type Category, type Task } from '../db/schema';
import { formatDuration } from '../lib/dates';
import { Icon } from './ui/Icon';

export function TaskCard({ task, category, showDate }: { task: Task; category?: Category; showDate?: string }) {
  const navigate = useNavigate();
  return (
    <article className={`task-card ${task.outOfScope ? 'oos' : ''}`} onClick={() => navigate(`/tache/${task.id}`)}>
      <span className="cat-dot" style={{ background: category?.color ?? '#999' }} />
      <div className="body">
        <div className="desc">{task.description}</div>
        <div className="meta">
          {showDate && <span>{showDate}</span>}
          <span>{category?.name ?? 'Sans catégorie'}</span>
          {task.durationMin ? <span>{formatDuration(task.durationMin)}</span> : null}
          {task.outOfScope && <span className="badge oos">Hors fiche</span>}
          {task.responsibility && task.responsibility !== 'execution' && (
            <span className="badge accent">{RESPONSIBILITY_LABELS[task.responsibility]}</span>
          )}
          {task.impactValue != null && <span className="badge">{task.impactValue} {task.impactUnit}</span>}
          {task.feedback && <span title="Retour reçu" style={{ color: 'var(--danger)' }}><Icon name="heart" size={14} fill /></span>}
          {task.attachmentIds.length > 0 && <span title="Pièces jointes"><Icon name="clip" size={14} /></span>}
        </div>
      </div>
      <button className={`star-btn ${task.starred ? 'on' : ''}`} aria-label={task.starred ? 'Retirer du Top' : 'Ajouter au Top'}
        onClick={(e) => { e.stopPropagation(); toggleStar(task); }}>
        <Icon name="star" size={20} fill={task.starred} />
      </button>
    </article>
  );
}
