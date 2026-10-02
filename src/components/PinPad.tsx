// Pavé numérique pour saisir un code de verrouillage (4 à 6 chiffres).
import { useEffect, useState } from 'react';
import { Icon } from './ui/Icon';

export function PinPad({ title, subtitle, error, length, disabled, onSubmit }: {
  title: string;
  subtitle?: string;
  error?: string | null;
  /** Si connu, le code est validé automatiquement au dernier chiffre ; sinon bouton « OK ». */
  length?: number;
  disabled?: boolean;
  onSubmit: (pin: string) => void;
}) {
  const [pin, setPin] = useState('');
  const max = length ?? 6;

  // Efface la saisie après une erreur.
  useEffect(() => { if (error) setPin(''); }, [error]);

  const press = (d: string) => {
    if (disabled || pin.length >= max) return;
    const next = pin + d;
    setPin(next);
    if (length && next.length === length) setTimeout(() => { onSubmit(next); setPin(''); }, 120);
  };
  const ok = () => { if (pin.length >= 4) { onSubmit(pin); setPin(''); } };

  // Saisie au clavier physique (Mac).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
      else if (e.key === 'Enter' && !length) ok();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="pinpad">
      <h2>{title}</h2>
      {subtitle && <p className="small muted center" style={{ margin: '6px 0 0' }}>{subtitle}</p>}
      <div className={`pin-dots ${error ? 'shake' : ''}`} aria-live="polite" aria-label={`${pin.length} chiffre(s) saisi(s)`}>
        {Array.from({ length: max }).map((_, i) => <span key={i} className={i < pin.length ? 'on' : ''} />)}
      </div>
      <p className="pin-error" role="alert">{error ?? ' '}</p>
      <div className="pin-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" disabled={disabled} onClick={() => press(d)}>{d}</button>
        ))}
        {length ? <span /> : (
          <button type="button" className="pin-ok" disabled={disabled || pin.length < 4} onClick={ok}>OK</button>
        )}
        <button type="button" disabled={disabled} onClick={() => press('0')}>0</button>
        <button type="button" aria-label="Effacer" disabled={disabled || !pin} onClick={() => setPin((p) => p.slice(0, -1))}><Icon name="back" size={22} /></button>
      </div>
    </div>
  );
}

/** Création d'un code : saisie puis confirmation. */
export function PinSetup({ onDone, onCancel }: { onDone: (pin: string) => void; onCancel?: () => void }) {
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="stack" style={{ alignItems: 'center' }}>
      {first === null ? (
        <PinPad key="1" title="Choisissez un code" subtitle="4 à 6 chiffres, puis OK" error={error}
          onSubmit={(p) => { setError(null); setFirst(p); }} />
      ) : (
        <PinPad key="2" title="Confirmez le code" length={first.length} error={error}
          onSubmit={(p) => { if (p === first) onDone(p); else { setFirst(null); setError('Les deux codes ne correspondent pas. Recommencez.'); } }} />
      )}
      {onCancel && <button type="button" className="btn ghost small" onClick={onCancel}>Annuler</button>}
    </div>
  );
}
