import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { EQUIPMENT_LABEL, exerciseById, pathologyById } from '../data/catalog'
import { MOTIONS } from '../data/motions'
import { formatDose, type Prescription } from '../engine/plan'
import { Icon } from '../components/Icon'
import { CheckRow, Popover } from '../components/Popover'
import { muscleLabel, type MuscleId } from '../three/rig'
import { ROLE_COLORS, type ExerciseLayers } from '../three/ExerciseScene'

const ExerciseScene = lazy(() => import('../three/ExerciseScene'))

interface Props {
  /** liste des exercices consultables (flèches précédent / suivant) */
  ids: string[]
  start?: string
  program?: Prescription[]
  onClose: () => void
  /** vue patient : vocabulaire simple par défaut */
  patient?: boolean
  /** pathologie du patient, pour relier l'exercice à ce qu'on traite */
  pathologyId?: string | null
}

const DEFAULT_LAYERS: ExerciseLayers = {
  skin: true, skeleton: false, allMuscles: false, work: true, stretch: true, stabilize: true, joint: true, equipment: true, names: true,
}
const LAYER_GROUPS: { title: string; items: { key: keyof ExerciseLayers; label: string; hint?: string; color?: string }[] }[] = [
  { title: 'Muscles', items: [
    { key: 'work', label: 'Travaillent', hint: 'Se contractent pendant le mouvement', color: ROLE_COLORS.work },
    { key: 'stretch', label: "S'étirent", hint: "S'allongent pendant le mouvement", color: ROLE_COLORS.stretch },
    { key: 'stabilize', label: 'Stabilisent', hint: 'Tiennent la position', color: ROLE_COLORS.stabilize },
    { key: 'allMuscles', label: 'Autres muscles', hint: 'Muscles non sollicités, en gris', color: ROLE_COLORS.idle },
    { key: 'names', label: 'Noms des muscles' },
  ] },
  { title: 'Corps', items: [
    { key: 'skin', label: 'Silhouette' },
    { key: 'skeleton', label: 'Squelette' },
  ] },
  { title: 'Repères', items: [
    { key: 'joint', label: 'Articulation & trajet', hint: 'Articulation qui bouge et chemin parcouru' },
    { key: 'equipment', label: 'Matériel', hint: 'Élastique, bâton, mur, table…' },
  ] },
]
const ROLE_CHIPS: { key: 'work' | 'stretch' | 'stabilize'; label: string; simple: string }[] = [
  { key: 'work', label: 'Travaillent', simple: 'Travaillent' },
  { key: 'stretch', label: "S'étirent", simple: "S'étirent" },
  { key: 'stabilize', label: 'Stabilisent', simple: 'Tiennent' },
]

function loadLayers(): ExerciseLayers {
  try { return { ...DEFAULT_LAYERS, ...JSON.parse(localStorage.getItem('physio.exLayers') ?? '{}') } } catch { return DEFAULT_LAYERS }
}

export default function ExerciseViewer({ ids, start, program, onClose, patient, pathologyId }: Props) {
  const patho = pathologyById(pathologyId)
  const list = ids.filter((id) => MOTIONS[id])
  const [idx, setIdx] = useState(Math.max(0, list.indexOf(start ?? list[0])))
  const id = list[idx]
  const ex = exerciseById(id)!
  const motion = MOTIONS[id]
  const rx = program?.find((p) => p.exerciseId === id)
  const [layers, setLayers] = useState<ExerciseLayers>(loadLayers)
  const [simple, setSimple] = useState(!!patient)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [phase, setPhase] = useState(0)
  const [value, setValue] = useState(0)
  const [effort, setEffort] = useState(0)
  const lastUi = useRef(0)

  useEffect(() => { try { localStorage.setItem('physio.exLayers', JSON.stringify(layers)) } catch { /* ignore */ } }, [layers])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])

  if (!motion || !ex) return null
  const gauge = motion.muscles.work.length ? { label: 'Effort', color: ROLE_COLORS.work }
    : motion.muscles.stretch.length ? { label: 'Étirement', color: ROLE_COLORS.stretch } : null
  const toggle = (k: keyof ExerciseLayers) => setLayers((l) => ({ ...l, [k]: !l[k] }))

  const roleList = (title: string, items: MuscleId[], color: string) => items.length > 0 && (
    <div className="stack" style={{ gap: 4 }}>
      <span className="small" style={{ fontWeight: 700, color: 'var(--ink-2)' }}><i style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 6, background: color, marginRight: 8, verticalAlign: -1 }} />{title}</span>
      <span className="small" style={{ paddingLeft: 20, color: 'var(--ink-2)' }}>{items.map((m) => muscleLabel(m, simple)).join(' · ')}</span>
    </div>
  )

  return (
    <div className="present xv" role="dialog" aria-label={`Exercice : ${ex.name}`} style={{ zIndex: 20 }}>
      <div className="xv-stage">
      <Suspense fallback={<div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }} className="muted">Chargement…</div>}>
          <ExerciseScene motion={motion} layers={layers} playing={playing} speed={speed} phase={phase} simple={simple}
            onTick={(t, v, e) => {
              const now = performance.now()
              if (now - lastUi.current < 100) return
              lastUi.current = now
              if (playing) setPhase(t)
              setValue(Math.round(v)); setEffort(Math.round(e * 20) / 20)
            }} />
      </Suspense>
      </div>

      <div className="overlay-top xv-top">
        <button className="btn round" onClick={onClose}><Icon name="back" />Fermer</button>
        <div className="role-legend" role="group" aria-label="Légende des muscles (touchez pour masquer)">
          {ROLE_CHIPS.filter((r) => motion.muscles[r.key].length > 0).map((r) => (
            <button key={r.key} className="role-chip" aria-pressed={layers[r.key]} onClick={() => toggle(r.key)}>
              <i style={{ background: ROLE_COLORS[r.key] }} />{simple ? r.simple : r.label}
            </button>
          ))}
        </div>
        {list.length > 1 && (
          <div className="tabs">
            <button aria-label="Exercice précédent" onClick={() => setIdx((idx - 1 + list.length) % list.length)}>‹</button>
            <button aria-selected="true" style={{ pointerEvents: 'none' }}>{idx + 1} / {list.length}</button>
            <button aria-label="Exercice suivant" onClick={() => setIdx((idx + 1) % list.length)}>›</button>
          </div>
        )}
      </div>

      <aside className="xv-panel">
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{ex.kind} · {EQUIPMENT_LABEL[ex.equipment].toLowerCase()}</span>
          <h1 className="xv-title">{ex.name}</h1>
          {rx && <span className="tag" style={{ alignSelf: 'flex-start' }}>{formatDose(rx)} · {rx.freq} · douleur ≤ {rx.maxPain}/10</span>}
        </div>

        <div className="stack" style={{ gap: 6, padding: 14, borderRadius: 14, background: 'var(--blue-soft)' }}>
          <span className="eyebrow" style={{ color: 'var(--blue-dark)' }}>Ce qui bouge</span>
          <strong>{simple ? motion.focus.simple : motion.focus.label}</strong>
          <div className="row">
            <span className="small grow" style={{ color: 'var(--ink-2)' }}>{motion.contraction}</span>
            {motion.focus.dof && <span style={{ fontWeight: 700, fontSize: 20, color: 'var(--blue-dark)' }}>{value}°</span>}
          </div>
          {gauge && (
            <div className="row" aria-label={gauge.label}>
              <span className="small muted" style={{ width: 72 }}>{gauge.label}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#fff', overflow: 'hidden' }}><div style={{ width: `${Math.round(effort * 100)}%`, height: '100%', background: gauge.color, transition: 'width .1s' }} /></div>
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <span className="eyebrow">Muscles</span>
          {roleList(simple ? 'Travaillent' : 'Travaillent (agonistes)', motion.muscles.work, ROLE_COLORS.work)}
          {roleList("S'étirent", motion.muscles.stretch, ROLE_COLORS.stretch)}
          {roleList(simple ? 'Tiennent la position' : 'Stabilisent', motion.muscles.stabilize, ROLE_COLORS.stabilize)}
          {motion.muscles.work.length === 0 && motion.muscles.stretch.length === 0 && <span className="small muted">Les muscles de la zone traitée restent relâchés.</span>}
        </div>

        {patho ? (
          <div className="explain-block bad">
            <span className="explain-label"><i />{patient ? 'Pour mon problème' : 'Lien avec la pathologie'} · {patho.label}</span>
            <p>{motion.why}</p>
            {patho.sickRom && patho.sickRom < 120 && patho.region === ex.region && (
              <div className="rom" style={{ background: '#fff' }}>
                <div className="row"><span className="small" style={{ width: 70, color: 'var(--green-ink)', fontWeight: 600 }}>Normal</span><div className="bar"><span style={{ width: '100%', background: '#2E7D5B' }} /></div><span className="small" style={{ width: 40, fontWeight: 700 }}>180°</span></div>
                <div className="row"><span className="small" style={{ width: 70, color: 'var(--red-ink)', fontWeight: 600 }}>{patient ? 'Moi' : 'Patient'}</span><div className="bar"><span style={{ width: `${Math.round((patho.sickRom / 180) * 100)}%`, background: '#C2412D' }} /></div><span className="small" style={{ width: 40, fontWeight: 700 }}>{patho.sickRom}°</span></div>
                <span className="small muted">{simple ? 'Lever le bras sur le côté' : 'Abduction de l\'épaule'}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">Pourquoi cet exercice</span>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{motion.why}</p>
          </div>
        )}
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">Comment faire</span>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{ex.how}</p>
          <p className="small" style={{ margin: 0, color: 'var(--red-ink)' }}><strong>Sécurité :</strong> {ex.safety}</p>
        </div>
        <button className={'toggle green'} aria-pressed={simple} onClick={() => setSimple(!simple)} style={{ alignSelf: 'flex-start' }}>Mots simples</button>
      </aside>

      <div className="toolbar xv-toolbar" role="toolbar" aria-label="Lecture et calques">
        <button className="icon-btn" style={{ background: '#2F6FA3', color: '#fff', border: 0, width: 52, height: 52 }} onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Lecture'}>
          <Icon name={playing ? 'pause' : 'play'} size={22} />
        </button>
        <label className="row" style={{ gap: 6 }}>
          <span className="sr-only">Position dans le mouvement</span>
          <input type="range" min={0} max={1000} value={Math.round(phase * 1000)} style={{ width: 150 }} onChange={(e) => { setPlaying(false); setPhase(+e.target.value / 1000) }} />
        </label>
        <button className="toggle" onClick={() => setSpeed(speed === 1 ? 0.5 : 1)} aria-label="Vitesse">{speed === 1 ? '×1' : '×½'}</button>
        <span className="sep" />
        <Popover label="Calques" icon={<Icon name="grid" size={18} />} width={300}>
          {LAYER_GROUPS.map((g) => (
            <div key={g.title} className="stack" style={{ gap: 2 }}>
              <span className="eyebrow">{g.title}</span>
              {g.items.map((l) => <CheckRow key={l.key} label={l.label} hint={l.hint} swatch={l.color} checked={layers[l.key]} onChange={() => toggle(l.key)} />)}
            </div>
          ))}
          <button className="btn" onClick={() => setLayers(DEFAULT_LAYERS)}>Réinitialiser</button>
        </Popover>
      </div>
    </div>
  )
}
