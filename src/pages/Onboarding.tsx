// Écran de premier lancement : présentation, poste de la personne, code de verrouillage facultatif.
import { useState } from 'react';
import { PinSetup } from '../components/PinPad';
import { Icon } from '../components/ui/Icon';
import type { HolidayCountry, Settings } from '../db/schema';
import { updateSettings } from '../hooks/data';
import { HOLIDAY_COUNTRY_LABELS } from '../lib/holidays';
import { hashPin } from '../lib/pin';

export default function Onboarding({ settings }: { settings: Settings }) {
  const [step, setStep] = useState(0);
  const [jobTitle, setJobTitle] = useState(settings.jobTitle);
  const [employer, setEmployer] = useState(settings.employer);
  const [client, setClient] = useState(settings.client);
  const [jobDescription, setJobDescription] = useState(settings.jobDescription.join('\n'));
  const [holidayCountry, setHolidayCountry] = useState<HolidayCountry>(settings.holidayCountry);
  const [settingPin, setSettingPin] = useState(false);

  const finish = async (pin?: string) => {
    await updateSettings({
      jobTitle: jobTitle.trim(),
      employer: employer.trim(),
      client: client.trim(),
      jobDescription: jobDescription.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean),
      holidayCountry,
      ...(pin ? { ...(await hashPin(pin)), pinLength: pin.length } : {}),
      onboarded: true,
    });
  };

  return (
    <div className="page onboarding" style={{ paddingBottom: 32 }}>
      <div className="steps" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>

      {step === 0 && (
        <div className="stack">
          <div className="hero-icon"><Icon name="note" size={34} /></div>
          <h1>Bienvenue dans Journal Pro</h1>
          <p className="muted" style={{ margin: 0 }}>
            Notez vos tâches au fil des jours pour constituer, en fin d’année, un dossier factuel :
            volume de travail, tâches qui dépassent votre fiche de poste, réussites et retours reçus.
          </p>
          <div className="card small stack" style={{ gap: 8 }}>
            <div className="row"><Icon name="shield" size={18} /> <strong>Vos données restent sur ce téléphone.</strong></div>
            <span className="muted">Pas de compte, pas de serveur. Personne d’autre (ni votre employeur, ni l’auteur de l’app) ne peut les voir. Pensez à exporter une sauvegarde chaque mois.</span>
          </div>
          <button className="btn primary block" onClick={() => setStep(1)}>Commencer <Icon name="right" size={18} /></button>
        </div>
      )}

      {step === 1 && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
          <h1>Mon poste</h1>
          <p className="small muted" style={{ margin: 0 }}>Modifiable plus tard dans les Paramètres. Anonymisez les noms d’entreprises si vous le souhaitez.</p>
          <label className="field">Intitulé de poste (contrat)
            <input type="text" required value={jobTitle} placeholder="Ex. Receptionist & Administrative Assistant" onChange={(e) => setJobTitle(e.target.value)} />
          </label>
          <div className="grid-2">
            <label className="field">Employeur
              <input type="text" value={employer} placeholder="Ex. Prestataire" onChange={(e) => setEmployer(e.target.value)} />
            </label>
            <label className="field">Site / client
              <input type="text" value={client} placeholder="Ex. Client" onChange={(e) => setClient(e.target.value)} />
            </label>
          </div>
          <label className="field">Fiche de poste <span className="hint">Une mission par ligne, telles qu’écrites dans votre contrat. Sert de comparaison dans le dossier.</span>
            <textarea rows={6} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
              placeholder={'Accueil physique et téléphonique\nGestion du courrier et des colis\nTâches administratives courantes'} />
          </label>
          <label className="field">Jours fériés <span className="hint">Ils ne cassent pas la série de jours travaillés.</span>
            <select value={holidayCountry} onChange={(e) => setHolidayCountry(e.target.value as HolidayCountry)}>
              {(Object.keys(HOLIDAY_COUNTRY_LABELS) as HolidayCountry[]).map((k) => <option key={k} value={k}>{HOLIDAY_COUNTRY_LABELS[k]}</option>)}
            </select>
          </label>
          <div className="row">
            <button type="button" className="btn" onClick={() => setStep(0)}><Icon name="left" size={18} /></button>
            <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={!jobTitle.trim()}>Continuer <Icon name="right" size={18} /></button>
          </div>
        </form>
      )}

      {step === 2 && !settingPin && (
        <div className="stack">
          <h1>Code de verrouillage</h1>
          <p className="muted" style={{ margin: 0 }}>
            Facultatif : un code à 4–6 chiffres sera demandé à l’ouverture de l’app et après une minute d’inactivité.
            Utile si quelqu’un emprunte votre téléphone.
          </p>
          <p className="small muted" style={{ margin: 0 }}>
            Attention : sans compte en ligne, un code oublié ne peut pas être réinitialisé. Il faudra effacer les données et réimporter une sauvegarde.
          </p>
          <button className="btn primary block" onClick={() => setSettingPin(true)}><Icon name="shield" size={18} /> Créer un code</button>
          <button className="btn block" onClick={() => finish()}>Plus tard</button>
          <button className="btn ghost small" onClick={() => setStep(1)}><Icon name="left" size={16} /> Retour</button>
        </div>
      )}

      {step === 2 && settingPin && <PinSetup onDone={(pin) => finish(pin)} onCancel={() => setSettingPin(false)} />}
    </div>
  );
}
