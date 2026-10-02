// Saisie de tags libres avec suggestions (tags déjà utilisés).
import { useId, useState } from 'react';
import { Icon } from './Icon';

export function TagInput({ value, onChange, suggestions, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; suggestions: string[]; placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const listId = useId();
  const add = (raw: string) => {
    const tags = raw.split(',').map((t) => t.trim()).filter(Boolean);
    const next = [...value];
    for (const t of tags) if (!next.some((v) => v.toLowerCase() === t.toLowerCase())) next.push(t);
    onChange(next);
    setDraft('');
  };
  const unused = suggestions.filter((s) => !value.includes(s)).slice(0, 8);
  return (
    <div className="stack" style={{ gap: 6 }}>
      {value.length > 0 && (
        <div className="row-wrap">
          {value.map((t) => (
            <button type="button" key={t} className="chip small on" onClick={() => onChange(value.filter((v) => v !== t))}>
              {t} <Icon name="x" size={14} />
            </button>
          ))}
        </div>
      )}
      <input type="text" list={listId} value={draft} placeholder={placeholder ?? 'Ajouter puis Entrée'}
        enterKeyHint="done"
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (draft.trim()) add(draft); } }}
        onBlur={() => draft.trim() && add(draft)} />
      <datalist id={listId}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      {unused.length > 0 && (
        <div className="row-wrap">
          {unused.map((s) => <button type="button" key={s} className="chip small" onClick={() => add(s)}>+ {s}</button>)}
        </div>
      )}
    </div>
  );
}
