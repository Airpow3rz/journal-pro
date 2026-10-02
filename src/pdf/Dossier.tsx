// Mise en page PDF du dossier de négociation (@react-pdf/renderer).
// Police Helvetica intégrée au format PDF : aucun fichier de police à télécharger.
import { Document, Image, Page, StyleSheet, Text, View, type Styles } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import { RESPONSIBILITY_LABELS, type ResponsibilityLevel, type Task } from '../db/schema';
import { formatDuration, formatNum } from '../lib/dates';
import type { DossierData } from './data';

const C = {
  ink: '#1d2321', ink2: '#5b635f', ink3: '#8a918d', line: '#e2dfd8', soft: '#f4f2ee',
  accent: '#2f5d50', accentSoft: '#e3ece8', oos: '#b86e00', oosSoft: '#fdf1dc',
};

/**
 * Helvetica (police standard PDF) ne couvre que l'encodage WinAnsi (latin-1 + quelques signes).
 * On remplace les caractères hors de cet ensemble pour éviter des glyphes manquants.
 */
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
export function pdfText(s: string | number | undefined | null): string {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/[    ]/g, ' ')
    .replace(/[−‐‑]/g, '-')
    .replace(/→/g, '->')
    .replace(/[✓✔]/g, 'v')
    .replace(/★/g, '*')
    .split('')
    .map((ch) => {
      if (ch.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRA.has(ch)) return ch;
      const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return base.length === 1 && base.charCodeAt(0) <= 0xff ? base : '';
    })
    .join('');
}
type S = Styles[string];
const T = ({ children, style }: { children: ReactNode; style?: S | S[] }) => (
  <Text style={style}>{typeof children === 'string' || typeof children === 'number' ? pdfText(children) : children}</Text>
);

const s = StyleSheet.create({
  // Pas d'interligne (lineHeight) au niveau de la page : il empêche l'affichage des numéros de page
  // (bogue de @react-pdf/renderer). L'interligne par défaut de la police suffit.
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 10, color: C.ink },
  footerLine: { position: 'absolute', bottom: 36, left: 48, right: 48, borderTopWidth: 0.5, borderTopColor: C.line },
  footerText: { position: 'absolute', bottom: 22, left: 48, right: 48, fontSize: 8, color: C.ink3 },
  eyebrow: { fontSize: 8.5, letterSpacing: 1.5, color: C.accent, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  h1: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginTop: 6, marginBottom: 6, lineHeight: 1.2 },
  h2: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 10, color: C.accent },
  h3: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 6 },
  muted: { color: C.ink2 },
  small: { fontSize: 8.5, color: C.ink2 },
  hero: { borderBottomWidth: 2, borderBottomColor: C.accent, paddingBottom: 14, marginBottom: 18 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  kpi: { width: '33.33%', padding: 4 },
  kpiBox: { backgroundColor: C.soft, borderRadius: 6, padding: 10 },
  kpiValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', lineHeight: 1.2 },
  kpiLabel: { fontSize: 8.5, color: C.ink2, marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  barLabel: { width: 130, fontSize: 9 },
  barTrack: { flex: 1, height: 9, backgroundColor: C.soft, borderRadius: 3 },
  barVal: { width: 90, textAlign: 'right', fontSize: 8.5, color: C.ink2 },
  callout: { backgroundColor: C.oosSoft, borderLeftWidth: 3, borderLeftColor: C.oos, padding: 12, borderRadius: 4, marginTop: 14 },
  cols: { flexDirection: 'row', gap: 16 },
  col: { flex: 1 },
  colHead: { fontSize: 9, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.8, color: C.ink2, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 6 },
  bullet: { flexDirection: 'row', marginBottom: 5 },
  bulletDot: { width: 10, color: C.accent },
  table: { borderTopWidth: 0.5, borderTopColor: C.line },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 4 },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.ink2 },
  item: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: C.line },
  num: { width: 24, fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.accent },
  tag: { fontSize: 8, backgroundColor: C.accentSoft, color: C.accent, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginRight: 4, marginTop: 3 },
  tagOos: { backgroundColor: C.oosSoft, color: C.oos },
  quote: { fontFamily: 'Helvetica-Oblique', fontSize: 10.5 },
  line: { borderBottomWidth: 0.5, borderBottomColor: C.ink3, height: 22 },
});

function Footer({ year }: { year: string }) {
  // Éléments « fixed » répétés sur chaque page (positionnés directement sur les Text).
  return (
    <>
      <View style={s.footerLine} fixed />
      <Text style={s.footerText} fixed
        render={({ pageNumber, totalPages }) => pdfText(`Dossier annuel d'activité ${year} · page ${pageNumber} / ${totalPages}`)} />
    </>
  );
}

function Bar({ label, value, max, color, right }: { label: string; value: number; max: number; color: string; right: string }) {
  return (
    <View style={s.barRow} wrap={false}>
      <T style={s.barLabel}>{label}</T>
      <View style={s.barTrack}><View style={{ width: `${max ? (value / max) * 100 : 0}%`, height: 9, backgroundColor: color, borderRadius: 3 }} /></View>
      <T style={s.barVal}>{right}</T>
    </View>
  );
}

const pctTxt = (v: number) => `${Math.round(v)} %`;
const hours = (min: number) => (min >= 60 ? `${Math.round(min / 60)} h` : formatDuration(min));

function TaskTags({ t, name }: { t: Task; name: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      <T style={s.tag}>{name}</T>
      {t.outOfScope && <T style={[s.tag, s.tagOos]}>Hors fiche de poste</T>}
      {t.responsibility && <T style={s.tag}>{RESPONSIBILITY_LABELS[t.responsibility]}</T>}
      {t.durationMin ? <T style={s.tag}>{formatDuration(t.durationMin)}</T> : null}
    </View>
  );
}

export function DossierDocument({ d, images }: { d: DossierData; images: Map<string, string> }) {
  const { stats, settings: st } = d;
  const maxCat = Math.max(1, ...stats.byCategory.map((c) => c.count));
  const respTotal = Object.values(stats.byResponsibility).reduce((a, b) => a + b, 0);
  const imageAnnexes = d.annexes.filter((a) => images.has(a.attachment.id));
  const pdfAnnexes = d.annexes.filter((a) => a.attachment.mime === 'application/pdf');

  return (
    <Document title={`Dossier annuel d'activité ${d.year}`} author="Journal Pro" language="fr">
      {/* ---------- 1. Synthèse ---------- */}
      <Page size="A4" style={s.page}>
        <View style={s.hero}>
          <T style={s.eyebrow}>{`Dossier annuel d'activité ${d.year}`}</T>
          <T style={s.h1}>{st.jobTitle}</T>
          <T style={s.muted}>{`Employé(e) par ${st.employer}, détaché(e) chez ${st.client}`}</T>
          <T style={s.small}>{`${d.periodText} · document généré le ${d.generatedOn}`}</T>
        </View>

        <T style={s.h2}>Chiffres clés</T>
        <View style={s.kpis}>
          {[
            [String(stats.count), 'tâches consignées'],
            [hours(stats.totalMin), 'de travail documenté'],
            [`${stats.activeDays} / ${d.workingDays}`, 'jours ouvrés renseignés'],
            [pctTxt(stats.outOfScopePct), 'de tâches hors fiche de poste'],
            [String(stats.byResponsibility.initiative), 'initiatives personnelles'],
            [String(stats.feedbacks.length), 'retours positifs reçus'],
          ].map(([v, l], i) => (
            <View key={i} style={s.kpi}>
              <View style={[s.kpiBox, i === 3 ? { backgroundColor: C.oosSoft } : {}]}>
                <T style={[s.kpiValue, i === 3 ? { color: C.oos } : {}]}>{v}</T>
                <T style={s.kpiLabel}>{l}</T>
              </View>
            </View>
          ))}
        </View>

        <T style={s.h3}>Répartition des tâches par catégorie</T>
        {stats.byCategory.map((c) => (
          <Bar key={c.id} label={c.name} value={c.count} max={maxCat} color={c.color}
            right={`${c.count} · ${pctTxt((c.count / Math.max(1, stats.count)) * 100)}${c.minutes ? ` · ${hours(c.minutes)}` : ''}`} />
        ))}

        <View style={s.callout} wrap={false}>
          <T style={{ fontFamily: 'Helvetica-Bold', color: C.oos, fontSize: 11 }}>
            {`${pctTxt(stats.outOfScopePct)} de mon activité dépasse ma fiche de poste`}
          </T>
          <T style={[s.small, { marginTop: 3, marginBottom: 8 }]}>
            {`${stats.outOfScopeCount} tâches hors fiche sur ${stats.count}${stats.outOfScopeMin ? `, soit ${hours(stats.outOfScopeMin)} documentées` : ''}. Évolution par trimestre :`}
          </T>
          {d.quarters.map((q) => (
            <Bar key={q.label} label={q.label} value={q.stats.outOfScopePct} max={100} color={C.oos}
              right={q.stats.count ? `${pctTxt(q.stats.outOfScopePct)} (${q.stats.outOfScopeCount}/${q.stats.count})` : '-'} />
          ))}
        </View>

        {respTotal > 0 && (
          <View wrap={false}>
            <T style={s.h3}>Niveau de responsabilité</T>
            {(Object.keys(RESPONSIBILITY_LABELS) as ResponsibilityLevel[]).map((r) => (
              <Bar key={r} label={RESPONSIBILITY_LABELS[r]} value={stats.byResponsibility[r]} max={respTotal} color={C.accent}
                right={`${stats.byResponsibility[r]} · ${pctTxt((stats.byResponsibility[r] / respTotal) * 100)}`} />
            ))}
          </View>
        )}
        <Footer year={d.year} />
      </Page>

      {/* ---------- 2. Fiche de poste vs réalité ---------- */}
      <Page size="A4" style={s.page}>
        <T style={s.h2}>Fiche de poste contractuelle et tâches réellement effectuées</T>
        <View style={s.cols}>
          <View style={s.col}>
            <T style={s.colHead}>Fiche de poste contractuelle</T>
            <T style={[s.small, { marginBottom: 6 }]}>{st.jobTitle}</T>
            {st.jobDescription.length ? st.jobDescription.map((m, i) => (
              <View key={i} style={s.bullet}><T style={s.bulletDot}>•</T><T style={{ flex: 1 }}>{m}</T></View>
            )) : <T style={s.small}>Fiche de poste non renseignée (Paramètres).</T>}
          </View>
          <View style={s.col}>
            <T style={s.colHead}>Tâches réellement effectuées</T>
            <View style={s.table}>
              <View style={s.tr}>
                <T style={[s.th, { flex: 1 }]}>Catégorie</T>
                <T style={[s.th, { width: 38, textAlign: 'right' }]}>Tâches</T>
                <T style={[s.th, { width: 58, textAlign: 'right' }]}>Hors fiche</T>
              </View>
              {d.categoryReality.map((c) => (
                <View key={c.name} style={s.tr}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.color, marginRight: 5 }} />
                    <T>{c.name}</T>
                  </View>
                  <T style={{ width: 38, textAlign: 'right' }}>{c.count}</T>
                  <T style={{ width: 58, textAlign: 'right', color: c.outOfScope ? C.oos : C.ink3 }}>{c.outOfScope ? `${c.outOfScope} (${pctTxt((c.outOfScope / c.count) * 100)})` : '-'}</T>
                </View>
              ))}
            </View>
          </View>
        </View>

        <T style={s.h3}>Exemples de tâches hors fiche de poste</T>
        {d.outOfScopeExamples.length === 0 && <T style={s.small}>Aucune tâche marquée « hors fiche de poste » sur la période.</T>}
        {d.outOfScopeExamples.map((g) => (
          <View key={g.category} style={{ marginBottom: 8 }}>
            <T style={{ fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: C.oos, marginBottom: 3 }}>{g.category}</T>
            {g.tasks.map((t) => (
              <View key={t.id} style={s.bullet} wrap={false}>
                <T style={[s.small, { width: 58 }]}>{formatNum(t.date)}</T>
                <T style={{ flex: 1 }}>{`${t.description}${t.impactText ? ` - ${t.impactText}` : ''}`}</T>
              </View>
            ))}
          </View>
        ))}
        <Footer year={d.year} />
      </Page>

      {/* ---------- 3. Top 10 ---------- */}
      <Page size="A4" style={s.page}>
        <T style={s.h2}>Mes 10 réalisations à plus fort impact</T>
        {d.top.length === 0 && <T style={s.small}>Aucune réalisation sélectionnée (étoile sur les tâches).</T>}
        {d.top.map((t, i) => (
          <View key={t.id} style={[s.item, { flexDirection: 'row' }]} wrap={false}>
            <T style={s.num}>{i + 1}</T>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: 'Helvetica-Bold', fontSize: 10.5 }}>{t.description}</T>
              <T style={s.small}>{`${formatNum(t.date)}${t.requestedBy ? ` · à la demande de : ${t.requestedBy}` : ''}`}</T>
              {(t.impactText || t.impactValue != null) && (
                <T style={{ marginTop: 3 }}>
                  {`Impact : ${[t.impactValue != null ? `${t.impactValue} ${t.impactUnit ?? ''}`.trim() : '', t.impactText ?? ''].filter(Boolean).join(' - ')}`}
                </T>
              )}
              {t.feedback && <T style={[s.quote, { marginTop: 3, fontSize: 9.5 }]}>{`« ${t.feedback} »`}</T>}
              <TaskTags t={t} name={d.categoryName(t.categoryId)} />
            </View>
          </View>
        ))}

        {d.achievements.length > 0 && (
          <>
            <T style={s.h3}>Réussites principales relevées dans mes bilans</T>
            {d.achievements.map((a, i) => (
              <View key={i} style={s.bullet} wrap={false}>
                <T style={[s.small, { width: 110 }]}>{a.period}</T>
                <T style={{ flex: 1 }}>{a.text}</T>
              </View>
            ))}
          </>
        )}
        <Footer year={d.year} />
      </Page>

      {/* ---------- 4. Retours positifs ---------- */}
      <Page size="A4" style={s.page}>
        <T style={s.h2}>{`Retours positifs reçus (${d.feedbacks.length})`}</T>
        {d.feedbacks.length === 0 && <T style={s.small}>Aucun retour enregistré sur la période.</T>}
        {d.feedbacks.map(({ task: t, annexCodes }) => (
          <View key={t.id} style={s.item} wrap={false}>
            <T style={s.quote}>{`« ${t.feedback} »`}</T>
            <T style={[s.small, { marginTop: 3 }]}>
              {`${formatNum(t.date)}${t.requestedBy ? ` · ${t.requestedBy}` : ''} · ${t.description}${annexCodes.length ? ` · Preuve : annexe ${annexCodes.join(', ')}` : ''}`}
            </T>
          </View>
        ))}

        <T style={[s.h2, { marginTop: 18 }]}>Compétences développées</T>
        {d.skills.length > 0 && (
          <>
            <T style={s.h3}>Compétences mobilisées au fil de l'année</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {d.skills.map((k) => <T key={k.skill} style={[s.tag, { fontSize: 9 }]}>{`${k.skill} (${k.count})`}</T>)}
            </View>
          </>
        )}
        {d.learned.length > 0 && (
          <>
            <T style={s.h3}>Nouvelles compétences acquises (bilans)</T>
            {d.learned.map((l, i) => (
              <View key={i} style={s.bullet} wrap={false}>
                <T style={[s.small, { width: 130 }]}>{l.period}</T>
                <T style={{ flex: 1 }}>{l.text}</T>
              </View>
            ))}
          </>
        )}
        {d.skills.length === 0 && d.learned.length === 0 && <T style={s.small}>Aucune compétence renseignée.</T>}
        <Footer year={d.year} />
      </Page>

      {/* ---------- 5. Ma demande (à compléter à la main) ---------- */}
      <Page size="A4" style={s.page}>
        <T style={s.h2}>Ma demande</T>
        <T style={[s.small, { marginBottom: 12 }]}>Section à compléter.</T>
        {[['Poste ou intitulé visé (requalification)', 3], ['Rémunération demandée', 2], ['Mes trois arguments principaux', 6], ['Engagements et objectifs pour l\'année à venir', 5], ['Date de l\'entretien et interlocuteurs', 2]].map(([label, n]) => (
          <View key={label as string} style={{ marginBottom: 14 }} wrap={false}>
            <T style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>{label as string}</T>
            {Array.from({ length: n as number }).map((_, i) => <View key={i} style={s.line} />)}
          </View>
        ))}
        <Footer year={d.year} />
      </Page>

      {/* ---------- 6. Annexes ---------- */}
      {d.annexes.length > 0 && (
        <Page size="A4" style={s.page}>
          <T style={s.h2}>Annexes : pièces justificatives</T>
          {d.annexes.map((a) => (
            <View key={a.code} style={s.bullet} wrap={false}>
              <T style={{ width: 30, fontFamily: 'Helvetica-Bold' }}>{a.code}</T>
              <T style={{ flex: 1 }}>{`${a.attachment.name} · ${formatNum(a.task.date)} · ${a.task.description}${a.attachment.mime === 'application/pdf' ? ' (document PDF joint en fin de dossier)' : ''}`}</T>
            </View>
          ))}
          {pdfAnnexes.length > 0 && <T style={[s.small, { marginTop: 8 }]}>Les documents PDF sont ajoutés à la suite, dans l'ordre des annexes.</T>}
          <Footer year={d.year} />
        </Page>
      )}
      {imageAnnexes.map((a) => (
        <Page key={a.code} size="A4" style={s.page}>
          <T style={s.h3}>{`Annexe ${a.code} · ${a.attachment.name}`}</T>
          <T style={[s.small, { marginBottom: 10 }]}>{`${formatNum(a.task.date)} · ${a.task.description}`}</T>
          <Image src={images.get(a.attachment.id)!} style={{ maxWidth: '100%', maxHeight: 640, objectFit: 'contain' }} />
          <Footer year={d.year} />
        </Page>
      ))}
    </Document>
  );
}
