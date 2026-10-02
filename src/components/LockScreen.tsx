// Écran de verrouillage : affiché au lancement et après une minute en arrière-plan.
import { useEffect, useState } from 'react';
import { db } from '../db/db';
import type { Settings } from '../db/schema';
import { lockoutDelay, verifyPin } from '../lib/pin';
import { PinPad } from './PinPad';

const FAIL_KEY = 'journal-pro-pin-failures';
const readFailures = (): { n: number; at: number } => {
  try { return JSON.parse(localStorage.getItem(FAIL_KEY) ?? '') ?? { n: 0, at: 0 }; } catch { return { n: 0, at: 0 }; }
};
const writeFailures = (v: { n: number; at: number }) => { try { localStorage.setItem(FAIL_KEY, JSON.stringify(v)); } catch { /* indisponible */ } };

export function LockScreen({ settings, onUnlock }: { settings: Settings; onUnlock: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState(readFailures);
  const [now, setNow] = useState(Date.now());
  const [forgot, setForgot] = useState(false);
  const waitMs = Math.max(0, failures.at + lockoutDelay(failures.n) - now);

  useEffect(() => {
    if (!waitMs) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [waitMs]);

  const submit = async (pin: string) => {
    if (waitMs) return;
    if (await verifyPin(pin, settings.pinHash!, settings.pinSalt!)) {
      writeFailures({ n: 0, at: 0 });
      onUnlock();
      return;
    }
    const next = { n: failures.n + 1, at: Date.now() };
    writeFailures(next);
    setFailures(next);
    setNow(Date.now());
    setError('Code incorrect');
  };

  const eraseAll = async () => {
    if (!confirm('Effacer TOUTES les données de Journal Pro sur cet appareil ? Cette action est définitive.')) return;
    if (!confirm('Dernière confirmation : vos tâches, notes et bilans seront supprimés. Vous pourrez ensuite importer une sauvegarde.')) return;
    db.close();
    await new Promise((res) => { const r = indexedDB.deleteDatabase('journal-pro'); r.onsuccess = r.onerror = r.onblocked = res; });
    writeFailures({ n: 0, at: 0 });
    location.hash = '#/';
    location.reload();
  };

  return (
    <div className="lock-screen">
      {!forgot ? (
        <>
          <PinPad title="Journal Pro" subtitle="Saisissez votre code" length={settings.pinLength} error={error}
            disabled={waitMs > 0} onSubmit={submit} />
          {waitMs > 0 && <p className="small muted center">Trop d’essais. Réessayez dans {Math.ceil(waitMs / 1000)} s.</p>}
          <button className="btn ghost small" onClick={() => setForgot(true)}>Code oublié ?</button>
        </>
      ) : (
        <div className="card stack" style={{ maxWidth: 380 }}>
          <h2>Code oublié</h2>
          <p className="small" style={{ margin: 0 }}>
            Vos données ne sont stockées que sur cet appareil, sans compte en ligne : le code ne peut donc pas être réinitialisé.
          </p>
          <p className="small" style={{ margin: 0 }}>
            La seule solution est d’effacer les données de cet appareil, puis d’importer votre dernière sauvegarde
            (Paramètres → Importer une sauvegarde). Le code de la sauvegarde sera alors celui en vigueur lors de l’export.
          </p>
          <button className="btn danger" onClick={eraseAll}>Effacer les données de cet appareil</button>
          <button className="btn" onClick={() => setForgot(false)}>Retour</button>
        </div>
      )}
    </div>
  );
}
