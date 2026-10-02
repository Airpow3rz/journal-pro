// Paramètres : poste et fiche de poste, catégories, modèles, jours travaillés, thème, sauvegarde.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { PinSettings } from '../components/PinSettings';
import { BufferedInput, BufferedTextarea } from '../components/ui/Buffered';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { exportBackup, importBackup, markBackupDone, parseBackup } from '../db/backup';
import { db, newId } from '../db/db';
import type { HolidayCountry, ThemeChoice } from '../db/schema';
import { updateSettings, useCategories, useSettings, useTasks, useTemplates } from '../hooks/data';
import { tasksToCsv } from '../lib/csv';
import { formatMedium, formatNum, today } from '../lib/dates';
import { saveFile } from '../lib/download';
import { HOLIDAY_COUNTRY_LABELS, holidays } from '../lib/holidays';

const PALETTE = ['#2f7d6d', '#4a6fa5', '#b7791f', '#b5487a', '#6b5bb5', '#2b8bbf', '#c05a3b', '#5c8a2e', '#7a7a7a', '#8a5a44'];

export default function Settings() {
  const settings = useSettings();
  const categories = useCategories();
  const templates = useTemplates();
  const tasks = useTasks() ?? [];
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [newDayOff, setNewDayOff] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const usage = useLiveQuery(async () => {
    const counts = new Map<string, number>();
    await db.tasks.each((t) => counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1));
    return counts;
  }, []) ?? new Map<string, number>();

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
    if (location.hash.includes('sauvegarde')) setTimeout(() => document.getElementById('sauvegarde')?.scrollIntoView({ behavior: 'smooth' }), 200);
  }, []);

  // ---------- Catégories ----------
  const moveCat = async (i: number, delta: number) => {
    const list = [...categories];
    const [c] = list.splice(i, 1);
    list.splice(i + delta, 0, c);
    await db.transaction('rw', db.categories, () => Promise.all(list.map((c, order) => db.categories.update(c.id, { order }))));
  };
  const addCat = async () => {
    const name = prompt('Nom de la nouvelle catégorie :');
    if (!name?.trim()) return;
    await db.categories.add({ id: newId(), name: name.trim(), color: PALETTE[categories.length % PALETTE.length], order: categories.length, archived: false });
  };
  const deleteCat = async (id: string) => {
    if (usage.get(id)) return;
    if (confirm('Supprimer cette catégorie ?')) await db.categories.delete(id);
  };

  // ---------- Sauvegarde ----------
  const doExport = async () => {
    const data = await exportBackup();
    await saveFile(new Blob([JSON.stringify(data)], { type: 'application/json' }), `journal-pro-sauvegarde-${today()}.json`);
    await markBackupDone();
    toast('Sauvegarde exportée');
  };
  const doImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = parseBackup(await file.text());
      const replace = confirm(
        `Sauvegarde du ${formatNum(data.exportedAt.slice(0, 10))} : ${data.tasks.length} tâches, ${data.notes?.length ?? 0} notes.\n\n` +
        'OK = REMPLACER toutes les données actuelles par la sauvegarde.\nAnnuler = choisir la fusion.');
      if (replace) {
        if (!confirm('Confirmer : les données actuelles de cet appareil seront effacées puis remplacées.')) return;
        await importBackup(data, 'replace');
      } else {
        if (!confirm('Fusionner : ajouter les éléments de la sauvegarde (en cas de doublon, la version la plus récente est gardée) ?')) return;
        await importBackup(data, 'merge');
      }
      toast('Import terminé');
    } catch (e) {
      alert((e as Error).message || 'Fichier illisible.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const yearHolidays = settings.holidayCountry === 'none' ? [] : [...holidays(Number(today().slice(0, 4)), settings.holidayCountry)].sort();

  return (
    <div className="page">
      <PageHeader back title="Paramètres" settings={false} />

      <div className="section-title">Mon poste</div>
      <div className="card stack">
        <label className="field">Intitulé de poste (contrat)
          <BufferedInput value={settings.jobTitle} onCommit={(jobTitle) => updateSettings({ jobTitle })} />
        </label>
        <div className="grid-2">
          <label className="field">Employeur (anonymisé)
            <BufferedInput value={settings.employer} onCommit={(employer) => updateSettings({ employer })} placeholder="Prestataire" />
          </label>
          <label className="field">Client (anonymisé)
            <BufferedInput value={settings.client} onCommit={(client) => updateSettings({ client })} placeholder="Client" />
          </label>
        </div>
        <label className="field">Fiche de poste contractuelle <span className="hint">Une mission par ligne. Utilisée pour la comparaison dans le dossier.</span>
          <BufferedTextarea rows={7} value={settings.jobDescription.join('\n')}
            onCommit={(v) => updateSettings({ jobDescription: v.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean) })} />
        </label>
      </div>

      <div className="section-title">Catégories</div>
      <div className="card">
        {categories.map((c, i) => (
          <div key={c.id} className="list-row" style={{ opacity: c.archived ? 0.5 : 1 }}>
            <input type="color" value={c.color} aria-label={`Couleur de ${c.name}`} onChange={(e) => db.categories.update(c.id, { color: e.target.value })}
              style={{ width: 32, height: 32, border: 'none', background: 'none', padding: 0, flex: 'none' }} />
            <BufferedInput value={c.name} onCommit={(name) => name.trim() && db.categories.update(c.id, { name: name.trim() })} style={{ flex: 1, minHeight: 38 }} />
            <span className="tiny muted" style={{ width: 28, textAlign: 'right' }}>{usage.get(c.id) ?? 0}</span>
            <button className="btn icon ghost" style={{ width: 34 }} disabled={i === 0} aria-label="Monter" onClick={() => moveCat(i, -1)}><Icon name="up" size={16} /></button>
            <button className="btn icon ghost" style={{ width: 34 }} disabled={i === categories.length - 1} aria-label="Descendre" onClick={() => moveCat(i, 1)}><Icon name="down" size={16} /></button>
            {usage.get(c.id)
              ? <button className="btn icon ghost" style={{ width: 34 }} aria-label={c.archived ? 'Réactiver' : 'Archiver'} title={c.archived ? 'Réactiver' : 'Archiver (masquée à la saisie)'}
                  onClick={() => db.categories.update(c.id, { archived: !c.archived })}><Icon name={c.archived ? 'eye' : 'x'} size={16} /></button>
              : <button className="btn icon ghost danger" style={{ width: 34 }} aria-label="Supprimer" onClick={() => deleteCat(c.id)}><Icon name="trash" size={16} /></button>}
          </div>
        ))}
        <button className="btn small" style={{ marginTop: 8 }} onClick={addCat}><Icon name="plus" size={16} /> Ajouter une catégorie</button>
        <p className="hint" style={{ marginBottom: 0 }}>Une catégorie déjà utilisée ne peut qu’être archivée (masquée à la saisie, conservée dans l’historique).</p>
      </div>

      <div className="section-title">Modèles de tâches favorites</div>
      <div className="card">
        {templates.length === 0 && <p className="small muted" style={{ margin: 0 }}>Dans une tâche, ouvrez « Détails » puis « Enregistrer comme modèle ».</p>}
        {templates.map((t) => (
          <div key={t.id} className="list-row">
            <Icon name="bolt" size={16} />
            <BufferedInput value={t.label} onCommit={(label) => label.trim() && db.templates.update(t.id, { label: label.trim() })} style={{ flex: 1, minHeight: 38 }} />
            <span className="tiny muted">{t.usageCount}×</span>
            <button className="btn icon ghost danger" aria-label="Supprimer le modèle" onClick={() => confirm(`Supprimer le modèle « ${t.label} » ?`) && db.templates.delete(t.id)}><Icon name="trash" size={16} /></button>
          </div>
        ))}
      </div>

      <div className="section-title">Jours travaillés</div>
      <div className="card stack">
        <p className="small muted" style={{ margin: 0 }}>Du lundi au vendredi. Les jours fériés et jours non travaillés ci-dessous ne cassent pas la série de jours consécutifs.</p>
        <label className="field">Jours fériés
          <select value={settings.holidayCountry} onChange={(e) => updateSettings({ holidayCountry: e.target.value as HolidayCountry })}>
            {(Object.keys(HOLIDAY_COUNTRY_LABELS) as HolidayCountry[]).map((k) => <option key={k} value={k}>{HOLIDAY_COUNTRY_LABELS[k]}</option>)}
          </select>
        </label>
        {yearHolidays.length > 0 && (
          <details>
            <summary className="small" style={{ cursor: 'pointer', color: 'var(--accent)' }}>Voir les {yearHolidays.length} jours fériés de {today().slice(0, 4)}</summary>
            <div className="row-wrap" style={{ marginTop: 8 }}>{yearHolidays.map((d) => <span key={d} className="badge">{formatMedium(d)}</span>)}</div>
          </details>
        )}
        <div className="field">
          <span>Autres jours non travaillés <span className="hint">(ponts, fermeture du site, congés)</span></span>
          <div className="row">
            <input type="date" value={newDayOff} onChange={(e) => setNewDayOff(e.target.value)} />
            <button className="btn" disabled={!newDayOff} onClick={() => {
              if (!settings.customDaysOff.includes(newDayOff)) updateSettings({ customDaysOff: [...settings.customDaysOff, newDayOff].sort() });
              setNewDayOff('');
            }}>Ajouter</button>
          </div>
          <div className="row-wrap">
            {settings.customDaysOff.map((d) => (
              <button key={d} className="chip small" onClick={() => updateSettings({ customDaysOff: settings.customDaysOff.filter((x) => x !== d) })}>
                {formatMedium(d)} <Icon name="x" size={12} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section-title">Code de verrouillage</div>
      <PinSettings settings={settings} />

      <div className="section-title">Saisie et affichage</div>
      <div className="card stack">
        <Switch checked={settings.skillsEnabled} onChange={(skillsEnabled) => updateSettings({ skillsEnabled })}
          label="Champ « Compétences » dans les tâches" hint="Alimente la section « Compétences développées » du dossier" />
        <div className="field">
          <span>Thème</span>
          <Segmented<ThemeChoice> value={settings.theme} onChange={(theme) => updateSettings({ theme })}
            options={[{ value: 'auto', label: 'Automatique' }, { value: 'light', label: 'Clair' }, { value: 'dark', label: 'Sombre' }]} />
        </div>
      </div>

      <div className="section-title" id="sauvegarde">Sauvegarde des données</div>
      <div className="card stack">
        <p className="small" style={{ margin: 0 }}>
          Vos données ne sont stockées que sur cet appareil. Exportez une sauvegarde au moins une fois par mois et rangez-la
          dans Fichiers / iCloud Drive. Pour passer vos données de l’iPhone au Mac, exportez sur l’un et importez sur l’autre.
        </p>
        <p className="small muted" style={{ margin: 0 }}>
          Dernière sauvegarde : <strong>{settings.lastBackupAt ? formatMedium(settings.lastBackupAt.slice(0, 10)) : 'jamais'}</strong>
          {' · '}{tasks.length} tâches
          {persisted !== null && <> · stockage {persisted ? 'protégé ✓' : 'non garanti (installez l’app sur l’écran d’accueil)'}</>}
        </p>
        <button className="btn primary" onClick={doExport}><Icon name="download" size={18} /> Exporter une sauvegarde (JSON)</button>
        <button className="btn" onClick={() => fileInput.current?.click()}><Icon name="upload" size={18} /> Importer une sauvegarde</button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
        <button className="btn" onClick={() => saveFile(new Blob([tasksToCsv(tasks, categories)], { type: 'text/csv;charset=utf-8' }), `journal-taches-${today()}.csv`)}>
          <Icon name="list" size={18} /> Exporter les tâches (CSV)
        </button>
      </div>

      <div className="section-title">Confidentialité</div>
      <div className="card small muted">
        <Icon name="shield" size={16} /> Aucune donnée n’est envoyée sur Internet : pas de serveur, pas de compte, pas de mesure d’audience.
        Tout est enregistré dans le stockage local du navigateur (IndexedDB) de cet appareil. Pensez à anonymiser vos saisies.
      </div>
      <p className="center tiny muted" style={{ marginTop: 24 }}>Journal Pro · version {__APP_VERSION__}</p>
    </div>
  );
}
