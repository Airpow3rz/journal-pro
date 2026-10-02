// Saisie / modification d'une tâche. Objectif : moins de 30 secondes par entrée.
// Seuls date, description et catégorie sont visibles d'emblée ; le reste est sous « Détails ».
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AttachmentPicker } from '../components/AttachmentPicker';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Switch } from '../components/ui/Switch';
import { TagInput } from '../components/ui/TagInput';
import { useToast } from '../components/ui/Toast';
import { bumpTemplate, deleteTask, restoreTask, reusableFields, saveTask, saveTemplate } from '../db/actions';
import { db, newId } from '../db/db';
import { RESPONSIBILITY_LABELS, type Attachment, type ResponsibilityLevel, type TaskDraft } from '../db/schema';
import { useCategories, useSettings, useTasks } from '../hooks/data';
import { formatDuration, formatShort, today } from '../lib/dates';
import { allTags } from '../lib/stats';

const DURATIONS = [5, 15, 30, 60, 120];
const DEFAULT_REQUESTERS = ['Manager', 'Responsable du site', 'Équipe boutique', 'Collègue', 'Direction client'];
const DEFAULT_UNITS = ['colis traités', 'visiteurs accueillis', 'h gagnées par semaine', 'personnes formées', 'documents traités'];

const emptyDraft = (categoryId = ''): TaskDraft => ({
  date: today(), description: '', categoryId, attachmentIds: [], tags: [], skills: [], starred: false,
});

/** Valeurs distinctes non vides d'un champ, triées par fréquence. */
function distinct(values: (string | undefined)[], defaults: string[] = []) {
  const m = new Map<string, number>();
  for (const v of values) if (v?.trim()) m.set(v.trim(), (m.get(v.trim()) ?? 0) + 1);
  const used = [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  return [...used, ...defaults.filter((d) => !m.has(d))];
}

export default function TaskEdit() {
  const { id: routeId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const settings = useSettings();
  const categories = useCategories(false);
  const allTasks = useTasks() ?? [];
  const isNew = !routeId;

  // L'identifiant est fixé dès l'ouverture : les pièces jointes peuvent ainsi y être rattachées.
  const [id] = useState(() => routeId ?? newId());
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const linkedNotes = useLiveQuery(() => db.notes.where('taskIds').equals(id).toArray(), [id]) ?? [];

  // Chargement initial : tâche existante, duplication (?depuis=), modèle (?modele=) ou tâche vide.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await db.settings.get('settings');
      const firstCat = (await db.categories.orderBy('order').filter((c) => !c.archived).first())?.id ?? '';
      const fallbackCat = s?.lastCategoryId && (await db.categories.get(s.lastCategoryId)) ? s.lastCategoryId : firstCat;
      let d: TaskDraft = emptyDraft(fallbackCat);
      let open = false;
      if (routeId) {
        const t = await db.tasks.get(routeId);
        if (!t) { navigate('/journal', { replace: true }); return; }
        const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = t;
        d = { ...rest, skills: rest.skills ?? [] };
        const atts = await db.attachments.where('taskId').equals(routeId).toArray();
        if (!cancelled) setAttachments(atts);
        open = !!(t.outOfScope || t.responsibility || t.durationMin || t.impactText || t.requestedBy || t.feedback || t.tags.length || t.skills?.length || atts.length);
      } else if (params.get('depuis')) {
        const src = await db.tasks.get(params.get('depuis')!);
        if (src) { d = { ...d, ...reusableFields(src) } as TaskDraft; open = true; }
      } else if (params.get('modele')) {
        const tpl = await db.templates.get(params.get('modele')!);
        if (tpl) { d = { ...d, ...tpl.task } as TaskDraft; bumpTemplate(tpl.id); }
      }
      if (params.get('date')) d.date = params.get('date')!;
      if (!cancelled) { setDraft(d); setDetailsOpen(open); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!draft) return;
    if (isNew && !draft.description) descRef.current?.focus();
    // Rend visible la catégorie pré-sélectionnée dans la liste défilante.
    const chip = chipsRef.current?.querySelector<HTMLElement>('.chip.on');
    if (chip && chipsRef.current) chipsRef.current.scrollLeft = chip.offsetLeft - chipsRef.current.offsetLeft - 16;
  }, [draft === null, categories.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const tagSuggestions = useMemo(() => allTags(allTasks), [allTasks]);
  const skillSuggestions = useMemo(() => allTags(allTasks.map((t) => ({ tags: t.skills ?? [] }))), [allTasks]);
  const requesters = useMemo(() => distinct(allTasks.map((t) => t.requestedBy), DEFAULT_REQUESTERS), [allTasks]);
  const units = useMemo(() => distinct(allTasks.map((t) => t.impactUnit), DEFAULT_UNITS), [allTasks]);

  if (!draft) return <div className="page" />;

  const set = <K extends keyof TaskDraft>(k: K, v: TaskDraft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const valid = draft.description.trim().length > 0 && !!draft.categoryId && !!draft.date;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const keptIds = attachments.map((a) => a.id);
    const clean: TaskDraft = {
      ...draft,
      description: draft.description.trim(),
      attachmentIds: keptIds,
      impactValue: draft.impactValue != null && !Number.isNaN(draft.impactValue) ? draft.impactValue : undefined,
    };
    const existingIds = new Set((await db.attachments.where('taskId').equals(id).primaryKeys()) as string[]);
    await saveTask(id, clean, attachments.filter((a) => !existingIds.has(a.id)), removed);
    toast({ text: isNew ? 'Tâche enregistrée' : 'Modifications enregistrées', action: { label: 'Dupliquer', run: () => navigate(`/tache/nouvelle?depuis=${id}`) } });
    if (window.history.length > 1) navigate(-1); else navigate('/');
  };

  const remove = async () => {
    if (!confirm('Supprimer cette tâche ?')) return;
    const task = await db.tasks.get(id);
    const atts = await db.attachments.where('taskId').equals(id).toArray();
    const notes = await db.notes.where('taskIds').equals(id).toArray();
    await deleteTask(id);
    navigate(-1);
    if (task) toast({ text: 'Tâche supprimée', action: { label: 'Annuler', run: () => restoreTask(task, atts, notes) } });
  };

  const asTemplate = async () => {
    const label = prompt('Nom du modèle (ex. « Réception colis du matin ») :', draft.description.slice(0, 40));
    if (!label?.trim()) return;
    await saveTemplate(label.trim(), draft);
    toast('Modèle enregistré : il apparaît sur l’accueil');
  };

  return (
    <div className="page">
      <PageHeader back title={isNew ? 'Nouvelle tâche' : 'Tâche'} settings={false}
        actions={!isNew && (
          <button className="btn icon ghost" aria-label="Dupliquer" onClick={() => navigate(`/tache/nouvelle?depuis=${id}`)}>
            <Icon name="copy" />
          </button>
        )} />

      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }}>
        <label className="field">
          Que s’est-il passé ?
          <textarea ref={descRef} rows={3} value={draft.description} placeholder="Ex. Réorganisation du stockage des colis entrants"
            onChange={(e) => set('description', e.target.value)} required />
        </label>

        <div className="field">
          <span className="small muted" style={{ fontWeight: 500 }}>Catégorie</span>
          <div className="chips-scroll" style={{ marginTop: 5 }} ref={chipsRef}>
            {categories.map((c) => (
              <button type="button" key={c.id} className={`chip ${draft.categoryId === c.id ? 'on' : ''}`} onClick={() => set('categoryId', c.id)}>
                <span className="dot" style={{ background: c.color }} />{c.name}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          Date
          <input type="date" value={draft.date} max="2100-12-31" onChange={(e) => set('date', e.target.value || today())} />
        </label>

        <p className="warning-note"><Icon name="shield" size={14} /> Ne pas saisir de noms de clients ou d’informations sensibles, anonymiser.</p>

        <details className="details" open={detailsOpen} onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)}>
          <summary><Icon name="right" size={18} className="chev" /> Détails <span className="hint">(facultatif)</span></summary>
          <div className="stack" style={{ paddingBottom: 8 }}>
            <div className={`oos-box ${draft.outOfScope ? 'on' : ''}`}>
              <Switch variant="oos" checked={!!draft.outOfScope} onChange={(v) => set('outOfScope', v)}
                label="Hors fiche de poste" hint="Tâche qui dépasse votre contrat" />
            </div>

            <div className="field">
              <span className="small muted" style={{ fontWeight: 500 }}>Niveau de responsabilité</span>
              <div className="row-wrap" style={{ marginTop: 5 }}>
                {(Object.keys(RESPONSIBILITY_LABELS) as ResponsibilityLevel[]).map((r) => (
                  <button type="button" key={r} className={`chip small ${draft.responsibility === r ? 'on' : ''}`}
                    onClick={() => set('responsibility', draft.responsibility === r ? undefined : r)}>
                    {RESPONSIBILITY_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="small muted" style={{ fontWeight: 500 }}>Temps passé {draft.durationMin ? `· ${formatDuration(draft.durationMin)}` : ''}</span>
              <div className="row" style={{ marginTop: 5 }}>
                <div className="row-wrap" style={{ flex: 1 }}>
                  {DURATIONS.map((m) => (
                    <button type="button" key={m} className={`chip small ${draft.durationMin === m ? 'on' : ''}`}
                      onClick={() => set('durationMin', draft.durationMin === m ? undefined : m)}>
                      {formatDuration(m)}
                    </button>
                  ))}
                </div>
                <input type="number" inputMode="numeric" min={0} step={5} placeholder="min" style={{ width: 84 }}
                  value={draft.durationMin ?? ''} onChange={(e) => set('durationMin', e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>

            <label className="field">
              Résultat ou impact
              <input type="text" value={draft.impactText ?? ''} placeholder="Ex. Plus aucun colis égaré depuis la réorganisation"
                onChange={(e) => set('impactText', e.target.value || undefined)} />
            </label>
            <div className="row">
              <input type="number" inputMode="decimal" placeholder="Chiffre" style={{ width: 110 }}
                value={draft.impactValue ?? ''} onChange={(e) => set('impactValue', e.target.value === '' ? undefined : Number(e.target.value))} />
              <input type="text" list="units" placeholder="Unité (ex. colis traités)" value={draft.impactUnit ?? ''}
                onChange={(e) => set('impactUnit', e.target.value || undefined)} />
              <datalist id="units">{units.map((u) => <option key={u} value={u} />)}</datalist>
            </div>

            <label className="field">
              Demandé par <span className="hint">(une fonction, jamais un nom)</span>
              <input type="text" list="requesters" value={draft.requestedBy ?? ''} placeholder="Ex. manager ISS, équipe boutique"
                onChange={(e) => set('requestedBy', e.target.value || undefined)} />
              <datalist id="requesters">{requesters.map((r) => <option key={r} value={r} />)}</datalist>
            </label>

            <label className="field">
              Retour reçu <span className="hint">(remerciement, compliment)</span>
              <textarea rows={2} value={draft.feedback ?? ''} placeholder="Ex. « Merci, l’accueil du séminaire était parfait »"
                onChange={(e) => set('feedback', e.target.value || undefined)} />
            </label>
            <AttachmentPicker taskId={id} items={attachments}
              onAdd={(a) => setAttachments((prev) => [...prev, ...a])}
              onRemove={(aid) => { setAttachments((prev) => prev.filter((a) => a.id !== aid)); setRemoved((r) => [...r, aid]); }} />

            <div className="field">
              <span className="small muted" style={{ fontWeight: 500 }}>Tags</span>
              <TagInput value={draft.tags} onChange={(v) => set('tags', v)} suggestions={tagSuggestions} />
            </div>

            {settings.skillsEnabled && (
              <div className="field">
                <span className="small muted" style={{ fontWeight: 500 }}>Compétences mobilisées</span>
                <TagInput value={draft.skills} onChange={(v) => set('skills', v)} suggestions={skillSuggestions}
                  placeholder="Ex. gestion de projet, Excel, anglais" />
              </div>
            )}

            <Switch checked={draft.starred} onChange={(v) => set('starred', v)}
              label="Réalisation à fort impact ★" hint="Candidate au Top 10 du dossier annuel" />

            {!isNew && (
              <div className="field">
                <span className="small muted" style={{ fontWeight: 500 }}>Notes liées</span>
                {linkedNotes.map((n) => (
                  <Link key={n.id} to={`/notes/${n.id}`} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Icon name="note" size={18} /> <span style={{ flex: 1 }}>{n.title || 'Sans titre'}</span>
                    <span className="tiny muted">{formatShort(n.date)}</span>
                  </Link>
                ))}
                <Link to={`/notes/nouvelle?tache=${id}`} className="btn small" style={{ marginTop: 6 }}>
                  <Icon name="plus" size={16} /> Nouvelle note liée
                </Link>
              </div>
            )}

            <div className="row-wrap" style={{ marginTop: 6 }}>
              <button type="button" className="btn small" onClick={asTemplate}><Icon name="bolt" size={16} /> Enregistrer comme modèle</button>
              {!isNew && <button type="button" className="btn small danger" onClick={remove}><Icon name="trash" size={16} /> Supprimer</button>}
            </div>
          </div>
        </details>

        <div className="sticky-actions">
          <button type="submit" className="btn primary block" disabled={!valid || saving}>
            <Icon name="check" size={20} /> Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
