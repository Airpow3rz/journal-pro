// Graphiques des bilans : évolution sur la période et jours de la semaine les plus chargés.
import { useMemo, useState } from 'react';
import type { DailyCount, PeriodType, Settings, Task } from '../db/schema';
import { activeCounters } from '../lib/counters';
import { addDays, parseDay, today } from '../lib/dates';
import { periodKey, periodRange, shiftPeriod } from '../lib/periods';
import { isWorkingDay } from '../lib/workdays';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
const WEEKDAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

interface Bucket { label: string; start: string; end: string }

/** Découpage de la période : année → mois, trimestre/mois → semaines, semaine → jours. */
function buckets(type: PeriodType, key: string): Bucket[] {
  const { start, end } = periodRange(type, key);
  if (type === 'year') {
    return MONTHS.map((label, i) => {
      const r = periodRange('month', `${key}-${String(i + 1).padStart(2, '0')}`);
      return { label, ...r };
    });
  }
  if (type === 'week') {
    return WEEKDAYS.map((label, i) => { const d = addDays(start, i); return { label: `${label} ${parseDay(d).getDate()}`, start: d, end: d }; });
  }
  const out: Bucket[] = [];
  let wk = periodKey('week', start);
  for (let i = 0; i < 15; i++) {
    const r = periodRange('week', wk);
    if (r.start > end) break;
    out.push({ label: `S${Number(wk.split('-W')[1])}`, start: r.start < start ? start : r.start, end: r.end > end ? end : r.end });
    wk = shiftPeriod('week', wk, 1);
  }
  return out;
}

export function EvolutionChart({ type, periodKey: key, tasks, counts, settings }: {
  type: PeriodType; periodKey: string; tasks: Task[]; counts: DailyCount[]; settings: Settings;
}) {
  const counters = activeCounters(settings);
  const [metric, setMetric] = useState<string>('tasks');
  const valueOf = useMemo(() => {
    if (metric === 'tasks') return (from: string, to: string) => tasks.filter((t) => t.date >= from && t.date <= to).length;
    return (from: string, to: string) => counts.filter((c) => c.date >= from && c.date <= to).reduce((s, c) => s + (c.values[metric] ?? 0), 0);
  }, [metric, tasks, counts]);
  const oosOf = (from: string, to: string) => tasks.filter((t) => t.outOfScope && t.date >= from && t.date <= to).length;

  const bars = buckets(type, key).map((b) => ({ ...b, value: valueOf(b.start, b.end), oos: metric === 'tasks' ? oosOf(b.start, b.end) : 0, future: b.start > today() }));
  const max = Math.max(1, ...bars.map((b) => b.value));

  // Moyenne par jour de la semaine, sur les jours travaillés écoulés de la période.
  const { start, end } = periodRange(type, key);
  const last = end < today() ? end : today();
  const perWeekday = [0, 0, 0, 0, 0].map(() => ({ total: 0, days: 0 }));
  for (let d = start; d <= last; d = addDays(d, 1)) {
    if (!isWorkingDay(d, settings)) continue;
    const w = parseDay(d).getDay() - 1;
    perWeekday[w].total += valueOf(d, d);
    perWeekday[w].days++;
  }
  const avg = perWeekday.map((w) => (w.days ? w.total / w.days : 0));
  const avgMax = Math.max(0, ...avg);
  const overall = avg.filter((_, i) => perWeekday[i].days).reduce((a, b) => a + b, 0) / Math.max(1, perWeekday.filter((w) => w.days).length);
  const busiest = avg.indexOf(avgMax);
  // Un jour n'est signalé comme « plus chargé » que s'il dépasse la moyenne de plus de 10 %.
  const hasPeak = overall > 0 && avgMax > overall * 1.1;
  const showWeekdays = type !== 'week' && avgMax > 0;
  const metricLabel = metric === 'tasks' ? 'tâches' : counters.find((c) => c.id === metric)?.label.toLowerCase() ?? '';

  return (
    <div className="card">
      <select value={metric} onChange={(e) => setMetric(e.target.value)} aria-label="Indicateur affiché" style={{ marginBottom: 12 }}>
        <option value="tasks">Tâches (dont hors fiche)</option>
        {counters.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <div className="chart-bars" role="img" aria-label={`Évolution : ${bars.map((b) => `${b.label} ${b.value}`).join(', ')}`}>
        {bars.map((b) => (
          <div key={b.label} className={`chart-col ${b.future ? 'future' : ''}`}>
            <span className="chart-val">{b.value || ''}</span>
            <div className="chart-bar" style={{ height: `${(b.value / max) * 100}%` }}>
              {b.oos > 0 && <i style={{ height: `${(b.oos / b.value) * 100}%` }} />}
            </div>
            <span className="chart-label">{b.label}</span>
          </div>
        ))}
      </div>
      {metric === 'tasks' && (
        <div className="row tiny muted" style={{ marginTop: 8, gap: 12 }}>
          <span className="row" style={{ gap: 4 }}><i className="legend-swatch" style={{ background: 'var(--accent)' }} /> dans la fiche</span>
          <span className="row" style={{ gap: 4 }}><i className="legend-swatch" style={{ background: 'var(--oos)' }} /> hors fiche</span>
        </div>
      )}

      {showWeekdays && (
        <>
          <div className="small" style={{ fontWeight: 600, marginTop: 18, marginBottom: 6 }}>Moyenne par jour de la semaine</div>
          {avg.map((v, i) => (
            <div key={i} className="legend-row">
              <span style={{ width: 34 }}>{WEEKDAYS[i]}</span>
              <div className="progress" style={{ flex: 1 }}><i style={{ width: `${(v / avgMax) * 100}%`, background: i === busiest && hasPeak ? 'var(--oos)' : undefined }} /></div>
              <span className="val" style={{ width: 44 }}>{v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</span>
            </div>
          ))}
          {hasPeak && (
            <p className="small" style={{ marginBottom: 0 }}>
              Jour le plus chargé : <strong>{WEEKDAY_NAMES[busiest]}</strong> (+{Math.round((avgMax / overall - 1) * 100)} % de {metricLabel} par rapport à la moyenne).
            </p>
          )}
        </>
      )}
    </div>
  );
}
