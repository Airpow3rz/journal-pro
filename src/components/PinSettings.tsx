// Section « Code de verrouillage » des Paramètres : créer, modifier ou supprimer le code.
import { useState } from 'react';
import type { Settings } from '../db/schema';
import { updateSettings } from '../hooks/data';
import { hashPin, verifyPin } from '../lib/pin';
import { PinPad, PinSetup } from './PinPad';
import { Icon } from './ui/Icon';
import { useToast } from './ui/Toast';

type Mode = 'idle' | 'create' | 'check-change' | 'check-remove';

export function PinSettings({ settings }: { settings: Settings }) {
  const [mode, setMode] = useState<Mode>('idle');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const hasPin = !!settings.pinHash;

  const save = async (pin: string) => {
    await updateSettings({ ...(await hashPin(pin)), pinLength: pin.length });
    setMode('idle');
    toast(hasPin ? 'Code modifié' : 'Code activé');
  };
  const check = async (pin: string) => {
    if (!(await verifyPin(pin, settings.pinHash!, settings.pinSalt!))) { setError('Code incorrect'); return; }
    setError(null);
    if (mode === 'check-remove') {
      await updateSettings({ pinHash: undefined, pinSalt: undefined, pinLength: undefined });
      setMode('idle');
      toast('Code supprimé');
    } else setMode('create');
  };

  if (mode === 'create') return <div className="card"><PinSetup onDone={save} onCancel={() => setMode('idle')} /></div>;
  if (mode === 'check-change' || mode === 'check-remove') {
    return (
      <div className="card stack" style={{ alignItems: 'center' }}>
        <PinPad title="Code actuel" length={settings.pinLength} error={error} onSubmit={check} />
        <button className="btn ghost small" onClick={() => { setMode('idle'); setError(null); }}>Annuler</button>
      </div>
    );
  }
  return (
    <div className="card stack">
      <p className="small" style={{ margin: 0 }}>
        {hasPin
          ? 'Un code est demandé à l’ouverture de l’app et après une minute en arrière-plan.'
          : 'Aucun code. Ajoutez-en un si d’autres personnes peuvent utiliser ce téléphone.'}
      </p>
      <p className="hint" style={{ margin: 0 }}>
        Le code protège l’accès à l’app ; un code oublié ne peut pas être réinitialisé (il faudra effacer puis réimporter une sauvegarde).
      </p>
      {hasPin ? (
        <div className="row">
          <button className="btn" style={{ flex: 1 }} onClick={() => setMode('check-change')}>Modifier le code</button>
          <button className="btn danger" style={{ flex: 1 }} onClick={() => setMode('check-remove')}>Supprimer</button>
        </div>
      ) : (
        <button className="btn primary" onClick={() => setMode('create')}><Icon name="shield" size={18} /> Créer un code</button>
      )}
    </div>
  );
}
