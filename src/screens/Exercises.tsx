import { useMemo, useState } from 'react'
import { exerciseIllustration } from '../three/illustration'
import { EQUIPMENT_LABEL, PHASE_LABEL, exerciseById, regionLabel, type Exercise } from '../data/catalog'
import { defaultPrescription, filterExercises, formatDose, type Prescription } from '../engine/plan'
import { Icon } from '../components/Icon'
import { loadTemplates, saveTemplate, type Screen, type Session } from '../state/session'
import ExerciseViewer from './ExerciseViewer'
import { MOTIONS } from '../data/motions'

interface Props {
  s: Session
  update: (p: Partial<Session> | ((s: Session) => Partial<Session>)) => void
  go: (sc: Screen) => void
}

const FREQS = ['3×/sem.', '5×/sem.', '1×/jour', '2×/jour', '3×/jour']

export function ExercisePic({ e, size = 80 }: { e: Exercise; size?: number }) {
  // Illustration générée depuis le mannequin 3D : départ en gris, arrivée en bleu, muscles en vert
  const svg = useMemo(() => exerciseIllustration(e.id), [e.id])
  if (!svg) return <span style={{ width: size, height: size * 0.83, display: 'inline-block' }} />
  return <span className="ex-illu" role="img" aria-label={`Illustration : ${e.name}`} style={{ width: size * 1.2, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />
}

export function IllustrationLegend() {
  return (
    <span className="illu-legend" aria-label="Légende des illustrations">
      <span><i style={{ background: '#CBD3DB' }} />Départ</span>
      <span><i style={{ background: '#4F7A9A' }} />Arrivée</span>
      <span><i style={{ background: '#2E8B57' }} />Muscles qui travaillent</span>
      <span><i style={{ background: '#2F7FD1' }} />S'étirent</span>
    </span>
  )
}

function Stepper({ label, value, step, min = 0, unit = '', onChange }: { label: string; value: number | null; step: number; min?: number; unit?: string; onChange: (v: number | null) => void }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="eyebrow">{label}</span>
      <div className="stepper">
        <button aria-label={`${label} moins`} onClick={() => onChange(value === null ? null : Math.max(min, value - step) || (min === 0 ? null : min))}>−</button>
        <span>{value === null ? '—' : `${value}${unit}`}</span>
        <button aria-label={`${label} plus`} onClick={() => onChange((value ?? 0) + step)}>+</button>
      </div>
    </div>
  )
}

export default function Exercises({ s, update }: Props) {
  const { step, ok, excluded } = filterExercises({ region: s.region, pathologyId: s.pathologyId, phase: s.phase, equipment: s.equipment, minutesPerDay: s.minutesPerDay })
  const [open, setOpen] = useState<string | null>(s.program[0]?.exerciseId ?? null)
  const [templates, setTemplates] = useState(loadTemplates)
  const [showTpl, setShowTpl] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)
  const inProgram = (id: string) => s.program.some((p) => p.exerciseId === id)
  const total = s.program.reduce((n, p) => n + (exerciseById(p.exerciseId)?.minutes ?? 0), 0)

  const toggle = (e: Exercise) => {
    update((x) => ({ program: inProgram(e.id) ? x.program.filter((p) => p.exerciseId !== e.id) : [...x.program, defaultPrescription(e)] }))
    if (!inProgram(e.id)) setOpen(e.id)
  }
  const patch = (id: string, p: Partial<Prescription>) => update((x) => ({ program: x.program.map((r) => (r.exerciseId === id ? { ...r, ...p } : r)) }))

  const [tplName, setTplName] = useState<string | null>(null)
  const saveTpl = () => {
    if (!tplName?.trim()) return
    saveTemplate({ name: tplName.trim(), program: s.program }); setTemplates(loadTemplates()); setTplName(null)
  }

  if (viewing) {
    const inProg = s.program.some((p) => p.exerciseId === viewing)
    return <ExerciseViewer ids={inProg ? s.program.map((p) => p.exerciseId) : ok.map((e) => e.id)} start={viewing} program={s.program} pathologyId={s.pathologyId} onClose={() => setViewing(null)} />
  }

  return (
    <div className="cols" style={{ maxWidth: 1180, margin: '0 auto' }}>
      <section className="stack" aria-label="Bibliothèque d'exercices" style={{ flexGrow: 1.3 }}>
        <div className="row wrap">
          <span className="small" style={{ fontWeight: 600, color: 'var(--muted)' }}>Filtres auto :</span>
          {s.region && <span className="tag">{regionLabel(s.region)}</span>}
          <span className="tag">Phase {step}{s.phase ? ` (${PHASE_LABEL[s.phase].toLowerCase()})` : ''}</span>
          <span className="tag">{s.equipment.length ? s.equipment.map((e) => EQUIPMENT_LABEL[e]).join(' / ') : 'Tout matériel'}</span>
          {excluded.length > 0 && <span className="small muted">· {excluded.length} exclu{excluded.length > 1 ? 's' : ''} (matériel)</span>}
          <span className="grow" />
          <IllustrationLegend />
          <button className="btn" onClick={() => setShowTpl((v) => !v)}><Icon name="grid" />Mes modèles ({templates.length})</button>
        </div>
        {showTpl && (
          <div className="card stack">
            {templates.length === 0 && <span className="muted">Aucun modèle enregistré pour l'instant.</span>}
            {templates.map((t) => (
              <div key={t.name} className="row">
                <span className="grow" style={{ fontWeight: 600 }}>{t.name}</span><span className="small muted">{t.program.length} exercices</span>
                <button className="btn" onClick={() => { update({ program: t.program }); setShowTpl(false) }}>Appliquer</button>
              </div>
            ))}
          </div>
        )}
        <div className="ex-grid">
          {ok.map((e) => (
            <div key={e.id} className={'ex-card' + (inProgram(e.id) ? ' sel' : '')}>
              <button className="ex-toggle" aria-pressed={inProgram(e.id)} onClick={() => toggle(e)}>
                <div className="pic"><ExercisePic e={e} size={104} />{inProgram(e.id) && <span className="check"><Icon name="check" size={16} stroke={3} /></span>}</div>
                <div className="body">
                  <span style={{ fontWeight: 600 }}>{e.name}</span>
                  <span className="small muted">{e.kind} · {EQUIPMENT_LABEL[e.equipment].toLowerCase()}</span>
                  {s.pathologyId && e.forPatho?.includes(s.pathologyId) && <span className="small" style={{ color: 'var(--green)', fontWeight: 600 }}>Recommandé</span>}
                </div>
              </button>
              {MOTIONS[e.id] && <button className="ex-3d" onClick={() => setViewing(e.id)} aria-label={`Voir ${e.name} en 3D`}><Icon name="play" size={14} />3D</button>}
            </div>
          ))}
          {ok.length === 0 && <p className="muted">Aucun exercice ne correspond. Élargissez le matériel ou changez de phase.</p>}
        </div>
      </section>

      <section className="card stack" aria-label="Programme du patient">
        <div className="row"><h2 className="grow">Programme · {s.program.length} exercice{s.program.length > 1 ? 's' : ''}</h2><span className="small muted">≈ {total} min / jour</span></div>
        {s.minutesPerDay && total > s.minutesPerDay && <span className="small" style={{ color: 'var(--red-ink)' }}>Au-delà du temps disponible ({s.minutesPerDay} min).</span>}
        {s.program.map((p) => {
          const e = exerciseById(p.exerciseId)
          if (!e) return null
          const isOpen = open === p.exerciseId
          return (
            <div key={p.exerciseId} className={'rx' + (isOpen ? ' open' : '')}>
              <div className="row">
                <button className="grow" style={{ textAlign: 'left', border: 0, background: 'none', padding: 0, minHeight: 44 }} onClick={() => setOpen(isOpen ? null : p.exerciseId)}>
                  <strong>{e.name}</strong><br /><span className="small muted">{formatDose(p)} · {p.freq} · douleur ≤ {p.maxPain}/10</span>
                </button>
                <button className="icon-btn" aria-label="Retirer" onClick={() => update((x) => ({ program: x.program.filter((r) => r.exerciseId !== p.exerciseId) }))}><Icon name="x" size={18} /></button>
              </div>
              {isOpen && <>
                <div className="rx-grid">
                  <Stepper label="Séries" value={p.sets} step={1} min={1} onChange={(v) => patch(p.exerciseId, { sets: v ?? 1 })} />
                  <Stepper label="Répétitions" value={p.reps} step={1} onChange={(v) => patch(p.exerciseId, { reps: v })} />
                  <Stepper label="Maintien" value={p.holdSec} step={5} unit=" s" onChange={(v) => patch(p.exerciseId, { holdSec: v })} />
                  <Stepper label="Repos" value={p.restSec} step={15} min={0} unit=" s" onChange={(v) => patch(p.exerciseId, { restSec: v ?? 0 })} />
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  <span className="eyebrow">Fréquence</span>
                  <div className="seg">{FREQS.map((f) => <button key={f} aria-pressed={p.freq === f} onClick={() => patch(p.exerciseId, { freq: f })}>{f}</button>)}</div>
                </div>
                <label className="stack" style={{ gap: 4 }}>
                  <span className="row"><span className="eyebrow grow">Douleur tolérée pendant l'exercice</span><strong style={{ color: '#B5452B' }}>≤ {p.maxPain}/10</strong></span>
                  <input className="pain" type="range" min={0} max={10} value={p.maxPain} onChange={(ev) => patch(p.exerciseId, { maxPain: +ev.target.value })} />
                </label>
                {s.ai?.exercises.find((x) => x.id === e.id) && <div className="why"><strong>Pourquoi (Claude) :</strong> {s.ai.exercises.find((x) => x.id === e.id)!.why}</div>}
                <div className="row"><span className="small muted grow">{e.how}</span>
                  {MOTIONS[e.id] && <button className="btn" onClick={() => setViewing(e.id)}><Icon name="play" size={16} />Voir en 3D</button>}</div>
              </>}
            </div>
          )
        })}
        {s.program.length === 0 && <span className="muted">Touchez des exercices dans la bibliothèque pour les ajouter.</span>}
        <div className="row wrap" style={{ marginTop: 'auto' }}>
          {tplName === null
            ? <button className="btn" disabled={!s.program.length} onClick={() => setTplName(`${s.pathologyId ?? s.region ?? 'Programme'} · phase ${step}`)}>Enregistrer comme modèle</button>
            : <form className="row grow" onSubmit={(ev) => { ev.preventDefault(); saveTpl() }}>
                <label className="sr-only" htmlFor="tpl">Nom du modèle</label>
                <input id="tpl" autoFocus value={tplName} onChange={(ev) => setTplName(ev.target.value)} style={{ minHeight: 48, borderRadius: 12, border: '1px solid var(--line-strong)', padding: '0 12px', flex: 1, minWidth: 0 }} />
                <button className="btn primary" type="submit">OK</button>
              </form>}
        </div>
      </section>
    </div>
  )
}
