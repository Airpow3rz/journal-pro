// Champs qui gardent leur valeur localement et l'enregistrent à la sortie du champ
// (évite les sauts de curseur liés à l'écriture asynchrone en base).
import { useEffect, useState } from 'react';

export function BufferedInput({ value, onCommit, ...rest }: { value: string; onCommit: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  return <input type="text" {...rest} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v)} />;
}

export function BufferedTextarea({ value, onCommit, ...rest }: { value: string; onCommit: (v: string) => void } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  return <textarea {...rest} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v)} />;
}
