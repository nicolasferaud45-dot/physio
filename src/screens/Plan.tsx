// Étape 3 : le plan. Contexte rapide (phase, douleur) pré-rempli, exercices proposés, détails cliniques repliés.
import { lazy, Suspense, useState } from 'react'
import { exerciseById, pathologyById, type Phase } from '../data/catalog'
import { lay } from '../data/lay'
import { formatDose, phaseToPlanStep, suggestProgram } from '../engine/plan'
import { Icon } from '../components/Icon'
import { Sources } from '../components/Sources'
import { ExercisePic } from './Exercises'
import Context from './Context'
import { AiCard } from './Home'
import type { Screen, Session } from '../state/session'

const Exercises = lazy(() => import('./Exercises'))
const ExerciseViewer = lazy(() => import('./ExerciseViewer'))

interface Props {
  s: Session
  update: (p: Partial<Session> | ((s: Session) => Partial<Session>)) => void
  go: (sc: Screen) => void
}
const PHASES: [Phase, string][] = [['aigue', 'Récente'], ['subaigue', 'En cours'], ['chronique', 'Ancienne'], ['postop', 'Après opération']]

export default function Plan({ s, update, go }: Props) {
  const patho = pathologyById(s.pathologyId)
  const [edit, setEdit] = useState<string | null | 'add'>(null)
  const [view3d, setView3d] = useState<string | null>(null)
  const step = phaseToPlanStep(s.phase)
  const ph = patho?.phases[step - 1]
  const setPhase = (p: Phase) => update((x) => ({ phase: p, program: suggestProgram({ region: x.region, pathologyId: x.pathologyId, phase: p, equipment: x.equipment, minutesPerDay: x.minutesPerDay }) }))
  const minutes = s.program.reduce((n, p) => n + (exerciseById(p.exerciseId)?.minutes ?? 0), 0)

  if (edit !== null) return (
    <div className="plan-edit">
      <div className="plan-edit-top"><strong className="grow">{edit === 'add' ? 'Ajouter ou modifier des exercices' : 'Modifier l\'exercice'}</strong><button className="btn primary" onClick={() => setEdit(null)}><Icon name="check" />Terminé</button></div>
      <div className="plan-edit-body"><Suspense fallback={<p className="muted">Chargement…</p>}><Exercises s={s} update={update} go={go} focus={edit === 'add' ? null : edit} /></Suspense></div>
    </div>
  )

  return (
    <div className="plan">
      <div className="plan-scroll">
        {patho && <div className="plan-title"><span className="pk-eyebrow" style={{ margin: 0 }}>{patho.label}{s.side ? ` · ${s.side === 'D' ? 'droite' : 'gauche'}` : ''}</span><div className="row" style={{ alignItems: 'flex-end', gap: 10 }}><h1 className="grow">{lay(patho.id, patho.label)}</h1><button className="btn plan-3d" onClick={() => go('presentation')}><Icon name="screen" />Montrer en 3D</button></div></div>}
        <section className="card stack" style={{ gap: 14 }}>
          <div className="stack" style={{ gap: 6 }}>
            <span className="pk-eyebrow" style={{ margin: 0 }}>Phase</span>
            <div className="pk-big-seg small" role="radiogroup" aria-label="Phase">
              {PHASES.map(([p, l]) => <button key={p} role="radio" aria-checked={s.phase === p} onClick={() => setPhase(p)}>{l}</button>)}
            </div>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <span className="row"><span className="pk-eyebrow grow" style={{ margin: 0 }}>Douleur</span><b style={{ color: 'var(--red-ink)', fontSize: 17 }}>{s.eva}/10</b></span>
            <div className="eva-grid" role="radiogroup" aria-label="Douleur de 0 à 10">
              {Array.from({ length: 11 }, (_, k) => <button key={k} role="radio" aria-checked={s.eva === k} onClick={() => update({ eva: k })}>{k}</button>)}
            </div>
          </div>
          <details className="plan-more">
            <summary>Objectifs, sport, matériel, temps disponible</summary>
            <div className="plan-ctx"><Context s={s} update={update} go={go} compact /></div>
          </details>
        </section>

        <div className="row" style={{ alignItems: 'baseline' }}>
          <span className="pk-eyebrow grow" style={{ margin: 0 }}>{ph ? `Phase ${step} · ${ph.title} · ${ph.weeks}` : 'Exercices'}</span>
          {s.program.length > 0 && <span className="small muted">≈ {minutes} min / jour</span>}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {s.program.map((p) => {
            const e = exerciseById(p.exerciseId)
            if (!e) return null
            return (
              <div key={p.exerciseId} className="plan-ex">
                <button className="plan-ex-main" onClick={() => setEdit(e.id)} aria-label={`Modifier ${e.name}`}>
                  <ExercisePic e={e} size={60} />
                  <span className="stack grow" style={{ gap: 2, minWidth: 0 }}><strong>{e.name}</strong><span className="small muted">{formatDose(p)} · {p.freq}</span></span>
                </button>
                <button className="icon-btn" aria-label={`Voir ${e.name} en 3D`} onClick={() => setView3d(e.id)}><Icon name="play" size={18} /></button>
                <button className="icon-btn" aria-label={`Retirer ${e.name}`} onClick={() => update((x) => ({ program: x.program.filter((y) => y.exerciseId !== e.id) }))}><Icon name="x" size={18} /></button>
              </div>
            )
          })}
          <button className="plan-add" onClick={() => setEdit('add')}><Icon name="plus" size={18} />Ajouter un exercice</button>
        </div>

        <details className="plan-more">
          <summary>Détails cliniques et sources</summary>
          {patho && (
            <div className="stack" style={{ gap: 10, paddingTop: 8 }}>
              <div className="stack" style={{ gap: 6 }}>
                {patho.phases.map((x, i) => <div key={i} className={'plan-phase' + (i === step - 1 ? ' on' : '')}><b>{i + 1}</b><span className="stack" style={{ gap: 1 }}><strong>{x.title} · <span className="muted">{x.weeks}</span></strong><span className="small">{x.content}</span></span></div>)}
              </div>
              {patho.keyPoints.length > 0 && <div className="stack" style={{ gap: 4 }}><span className="pk-eyebrow" style={{ margin: 0 }}>Points clés</span>{patho.keyPoints.map((k) => <span key={k} className="small">• {k}</span>)}</div>}
              {s.ai && <AiCard ai={s.ai} compact />}
              <Sources ids={patho.sources} title="Sources de la fiche" />
            </div>
          )}
        </details>
      </div>
      <div className="plan-foot">
        <button className="btn primary pk-primary" disabled={!s.program.length} onClick={() => go('share')}><Icon name="link" />Remettre au patient<Icon name="next" /></button>
      </div>
      {view3d && <Suspense fallback={null}><ExerciseViewer ids={s.program.map((p) => p.exerciseId)} start={view3d} program={s.program} pathologyId={s.pathologyId} onClose={() => setView3d(null)} /></Suspense>}
    </div>
  )
}
