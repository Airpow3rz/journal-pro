// Ajout de preuves (captures d'écran, PDF) stockées localement.
import { useEffect, useMemo, useRef } from 'react';
import { newId, nowIso } from '../db/db';
import type { Attachment } from '../db/schema';
import { Icon } from './ui/Icon';

const MAX_SIZE = 15 * 1024 * 1024;

export function AttachmentPicker({ taskId, items, onAdd, onRemove }: {
  taskId: string; items: Attachment[]; onAdd: (a: Attachment[]) => void; onRemove: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  // URLs temporaires pour les miniatures, libérées au démontage.
  const urls = useMemo(() => new Map(items.map((a) => [a.id, URL.createObjectURL(a.blob)])), [items]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const added: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_SIZE) { alert(`« ${f.name} » dépasse 15 Mo et n'a pas été ajouté.`); continue; }
      added.push({ id: newId(), taskId, name: f.name, mime: f.type || 'application/octet-stream', size: f.size, blob: f, createdAt: nowIso() });
    }
    onAdd(added);
    if (input.current) input.current.value = '';
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      {items.length > 0 && (
        <div className="attachments">
          {items.map((a) => (
            <div key={a.id} className="attachment" title={a.name}>
              {a.mime.startsWith('image/')
                ? <img src={urls.get(a.id)} alt={a.name} />
                : <a href={urls.get(a.id)} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}><Icon name="file" /><br />{a.name.slice(0, 22)}</a>}
              <button type="button" aria-label={`Retirer ${a.name}`} onClick={() => onRemove(a.id)}><Icon name="x" size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="btn small" onClick={() => input.current?.click()}>
        <Icon name="clip" size={16} /> Joindre une capture ou un PDF
      </button>
      <input ref={input} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}
