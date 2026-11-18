import { useState } from 'react'
import { EQUIPMENT_LABEL, GENERIC_GOALS, GOAL_SPORTS, PHASE_LABEL, pathologyById, type Equipment, type Phase } from '../data/catalog'
import { phaseToPlanStep, suggestProgram } from '../engine/plan'
import { Icon } from '../components/Icon'
import { Sources } from '../components/Sources'
import { AiCard } from './Home'
import type { Screen, Session } from '../state/session'

interface Props {
  s: Session
  update: (p: Partial<Session> | ((s: Session) => Partial<Session>)) => void
  go: (sc: Screen) => void
}

const SPORTS = Array.from(new Set(Object.values(GOAL_SPORTS)))
const TIMES: [number, string][] = [[5, '5 min'], [12, '10–15 min'], [25, '20–30 min'], [40, '+30 min']]
const IRRIT = ['Faible', 'Modérée', 'Élevée']

export default function Context({ s, update, go, compact }: Props & { compact?: boolean }) {
  const patho = pathologyById(s.pathologyId)
  const [sportOpen, setSportOpen] = useState(false)
  const step = phaseToPlanStep(s.phase)

  const toggleGoal = (g: string) => update((x) => ({ goals: x.goals.includes(g) ? x.goals.filter((y) => y !== g) : [...x.goals, g] }))
  const toggleEq = (e: Equipment) => update((x) => ({ equipment: x.equipment.includes(e) ? x.equipment.filter((y) => y !== e) : [...x.equipment, e] }))
  const allGoals = Array.from(new Set([...s.goals, ...GENERIC_GOALS]))

  const toExercises = () => {
    // Re-suggérer si le programme est vide ou si le contexte a changé la phase
    if (s.program.length === 0) update((x) => ({ program: suggestProgram({ region: x.region, pathologyId: x.pathologyId, phase: x.phase, equipment: x.equipment, minutesPerDay: x.minutesPerDay }) }))
    go('plan')
  }

  return (
    <div id="contexte" className="cols" style={{ maxWidth: 1180, margin: '0 auto', scrollMarginTop: 12 }}>
      <section className="card stack" style={{ gap: 22 }} aria-label="Profil rapide">
        {!compact && <div className="stack" style={{ gap: 4 }}>
          <h2>Contexte patient{patho ? ` · ${patho.label}` : ''}</h2>
          <span className="small muted">Uniquement ce qui sert à construire le plan, sans saisie clavier.</span>
        </div>}

        {!compact && <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
          <legend className="eyebrow" style={{ marginBottom: 8 }}>Phase clinique</legend>
          <div className="seg">
            {(Object.keys(PHASE_LABEL) as Phase[]).map((p) => (
              <button key={p} aria-pressed={s.phase === p} onClick={() => update({ phase: p })}>{PHASE_LABEL[p]}</button>
            ))}
          </div>
        </fieldset>}

        <div className="cols" style={{ gap: 24 }}>
          {!compact && <label className="stack" style={{ gap: 6, flexBasis: 220 }}>
            <span className="row"><span className="eyebrow grow">Douleur (EVA)</span><span style={{ fontSize: 26, fontWeight: 700, color: '#B5452B' }}>{s.eva}<span className="small muted">/10</span></span></span>
            <input className="pain" type="range" min={0} max={10} value={s.eva} onChange={(e) => update({ eva: +e.target.value })} />
          </label>}
          <label className="stack" style={{ gap: 6, flexBasis: 220 }}>
            <span className="row"><span className="eyebrow grow">Irritabilité</span><span style={{ fontSize: 18, fontWeight: 700 }}>{IRRIT[s.irritability]}</span></span>
            <input type="range" min={0} max={2} value={s.irritability} onChange={(e) => update({ irritability: +e.target.value as 0 | 1 | 2 })} />
          </label>
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 8 }}>Objectifs fonctionnels</legend>
          <div className="row wrap">
            {allGoals.map((g) => <button key={g} className="chip goal" aria-pressed={s.goals.includes(g)} onClick={() => toggleGoal(g)}>{g}</button>)}
            <button className="chip" style={{ borderStyle: 'dashed', color: 'var(--blue)', fontWeight: 600 }} onClick={() => setSportOpen((v) => !v)}><Icon name="plus" size={16} />Sport</button>
          </div>
          {sportOpen && (
            <div className="row wrap" style={{ marginTop: 10, padding: 12, borderRadius: 14, background: 'var(--surface-2)' }}>
              {SPORTS.map((sp) => {
                const g = `Reprise sport · ${sp}`
                return <button key={sp} className="chip goal" aria-pressed={s.goals.includes(g)} onClick={() => toggleGoal(g)}>{sp}</button>
              })}
            </div>
          )}
        </fieldset>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 8 }}>Matériel à domicile</legend>
          <div className="row wrap">
            {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((e) => (
              <button key={e} className="chip" aria-pressed={s.equipment.includes(e)} onClick={() => toggleEq(e)}>{EQUIPMENT_LABEL[e]}</button>
            ))}
          </div>
          {s.equipment.length === 0 && <span className="small muted">Non précisé : tous les exercices seront proposés.</span>}
        </fieldset>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 8 }}>Temps disponible par jour</legend>
          <div className="seg">
            {TIMES.map(([m, l]) => <button key={m} aria-pressed={s.minutesPerDay === m} onClick={() => update({ minutesPerDay: m })}>{l}</button>)}
          </div>
        </fieldset>
      </section>

      {!compact && <section className="stack" aria-label="Aide à la décision">
        {patho ? (
          s.redFlagsCleared ? (
            <div className="alert ok row"><Icon name="check" /><span className="grow">Drapeaux rouges écartés</span><button className="btn ghost" onClick={() => update({ redFlagsCleared: false })}>Revoir</button></div>
          ) : (
            <div className="alert" role="alert">
              <div className="row"><Icon name="alert" size={24} /><h3>Drapeaux rouges à vérifier</h3></div>
              <ul>{patho.redFlags.map((f) => <li key={f}>{f}</li>)}</ul>
              <div className="row wrap">
                <button className="btn danger" onClick={() => update({ redFlagsCleared: true })}>Tout écarté</button>
                <span className="small">Un drapeau présent → orienter vers le médecin.</span>
              </div>
            </div>
          )
        ) : <div className="card muted">Choisissez une pathologie depuis l'accueil pour afficher les drapeaux rouges et le plan.</div>}

        {s.ai && <AiCard ai={s.ai} compact />}
        {patho && (
          <div className="card stack">
            <div className="row"><h2 className="grow">Plan de thérapie suggéré</h2><span className="tag grey">Trame modifiable</span></div>
            {patho.phases.map((ph, i) => (
              <div key={i} className={'phase' + (i + 1 === step ? ' current' : '')}>
                <div className="n">{i + 1}</div>
                <div className="stack" style={{ gap: 2 }}>
                  <strong>{ph.title} · <span className="muted" style={{ fontWeight: 500 }}>{ph.weeks}</span></strong>
                  <span className="small" style={{ color: 'var(--ink-2)' }}>{ph.content}</span>
                  {i + 1 === step && <span className="small" style={{ color: 'var(--blue-dark)', fontWeight: 600 }}>Phase actuelle (d'après la phase clinique)</span>}
                </div>
              </div>
            ))}
            {patho.keyPoints.length > 0 && <div className="stack" style={{ gap: 4 }}><span className="eyebrow">Points clés (recommandations)</span>{patho.keyPoints.map((k) => <span key={k} className="small">• {k}</span>)}</div>}
            <Sources ids={patho.sources} title="Sources de la fiche" />
            <button className="btn" onClick={toExercises}>Passer directement au programme <Icon name="next" /></button>
          </div>
        )}
      </section>}
    </div>
  )
}
