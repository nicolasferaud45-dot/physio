import { useState } from 'react'
import { exerciseById, pathologyById, regionLabel } from '../data/catalog'
import { formatDose } from '../engine/plan'
import { ExercisePic } from './Exercises'
import { Icon } from '../components/Icon'
import type { PassportData } from '../state/session'
import ExerciseViewer from './ExerciseViewer'
import { MOTIONS } from '../data/motions'

/** Contenu du passeport : utilisé pour la vue patient (téléphone) et l'impression PDF. */
export function PassportView({ data, captures = [], onShow3D, interactive = true }: {
  data: PassportData; captures?: string[]; onShow3D?: () => void; interactive?: boolean
}) {
  const patho = pathologyById(data.pathologyId)
  const doneKey = `physio.done.${new Date().toISOString().slice(0, 10)}.${data.date}`
  const [done, setDone] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(doneKey) ?? '[]') } catch { return [] } })
  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id]
    setDone(next)
    try { localStorage.setItem(doneKey, JSON.stringify(next)) } catch { /* ignore */ }
  }
  const maxPain = Math.max(0, ...data.program.map((p) => p.maxPain))
  const [viewing, setViewing] = useState<string | null>(null)
  if (viewing) return <ExerciseViewer ids={data.program.map((p) => p.exerciseId)} start={viewing} program={data.program} pathologyId={data.pathologyId} onClose={() => setViewing(null)} patient />

  return (
    <div className="passport">
      <header>
        <span className="small" style={{ fontWeight: 600, color: 'var(--blue)' }}>Passeport Pathologie & Rééducation</span>
        <h1 style={{ fontSize: 24, marginTop: 4 }}>{patho ? `Mon ${regionLabel(patho.region).toLowerCase()}${data.side ? (data.side === 'D' ? ' droit' : ' gauche') : ''}` : 'Mon programme'}</h1>
        <span className="small muted">Remis le {new Date(data.date).toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </header>
      <main>
        {patho && (
          <article className="card stack" style={{ gap: 8, padding: 16 }}>
            {captures.map((c, i) => <img key={i} src={c} alt="Explication annotée pendant la séance" style={{ width: '100%', borderRadius: 12 }} />)}
            <span className="eyebrow">{patho.label}</span>
            <div className="explain-block ok">
              <span className="explain-label"><i />Normalement</span>
              <strong>{patho.healthy.simple.title}</strong>
              <p>{patho.healthy.simple.body}</p>
            </div>
            <div className="explain-block bad">
              <span className="explain-label"><i />Chez moi</span>
              <strong>{patho.sick.simple.title}</strong>
              <p>{patho.sick.simple.body}</p>
            </div>
            {patho.sickRom && patho.visual && (
              <div className="rom">
                <span className="small" style={{ fontWeight: 600 }}>Jusqu'où le bras monte sur le côté</span>
                <div className="row"><span className="small" style={{ width: 92, color: 'var(--green-ink)', fontWeight: 600 }}>Normal</span><div className="bar"><span style={{ width: '100%', background: '#2E7D5B' }} /></div><span className="small" style={{ width: 40, fontWeight: 700 }}>180°</span></div>
                <div className="row"><span className="small" style={{ width: 92, color: 'var(--red-ink)', fontWeight: 600 }}>Mon épaule</span><div className="bar"><span style={{ width: `${Math.round((patho.sickRom / 180) * 100)}%`, background: '#C2412D' }} /></div><span className="small" style={{ width: 40, fontWeight: 700 }}>{patho.sickRom}°</span></div>
              </div>
            )}
            {onShow3D && patho.visual && interactive && <button className="btn primary" onClick={onShow3D}><Icon name="play" />Voir la comparaison en 3D</button>}
          </article>
        )}
        {data.goals.length > 0 && (
          <div className="row wrap">{data.goals.map((g) => <span key={g} className="tag green">Objectif : {g.replace('Reprise sport · ', '')}</span>)}</div>
        )}
        <section className="card" style={{ padding: 16 }} aria-label="Mes exercices">
          <div className="row" style={{ marginBottom: 4 }}>
            <h2 className="grow" style={{ fontSize: 19 }}>Mes exercices</h2>
            {interactive && <span className="small muted">{done.length} / {data.program.length} faits aujourd'hui</span>}
          </div>
          {data.program.map((p) => {
            const e = exerciseById(p.exerciseId)
            if (!e) return null
            const isDone = done.includes(e.id)
            return (
              <div key={e.id} className={'ex-line' + (isDone ? ' done' : '')}>
                {interactive
                  ? <input type="checkbox" checked={isDone} onChange={() => toggle(e.id)} aria-label={`${e.name} fait`} style={{ marginTop: 4, accentColor: 'var(--green)' }} />
                  : <span style={{ width: 22, height: 22, border: '2px solid #9FB1BE', borderRadius: 4, flexShrink: 0, marginTop: 2 }} />}
                <div className="stack grow" style={{ gap: 4 }}>
                  <span className="name" style={{ fontWeight: 600 }}>{e.name}</span>
                  <span className="small muted">{formatDose(p)} · repos {p.restSec} s · {p.freq}</span>
                  {interactive && MOTIONS[e.id] && <button className="btn" style={{ alignSelf: 'flex-start', minHeight: 40 }} onClick={() => setViewing(e.id)}><Icon name="play" size={16} />Voir le mouvement en 3D</button>}
                  {interactive ? (
                    <details><summary>Comment faire</summary>
                      <div className="row" style={{ alignItems: 'flex-start' }}><ExercisePic e={e} size={84} /><span className="small">{e.how}<br /><strong>Sécurité :</strong> {e.safety}</span></div>
                    </details>
                  ) : <span className="small">{e.how} <strong>Sécurité :</strong> {e.safety}</span>}
                </div>
              </div>
            )
          })}
        </section>
        <div role="note" className="alert row" style={{ alignItems: 'flex-start' }}>
          <Icon name="alert" />
          <span className="small">Douleur acceptée jusqu'à <strong>{maxPain}/10</strong> pendant les exercices. Au-delà, ou si la douleur persiste le lendemain, arrêtez et prévenez votre physiothérapeute.</span>
        </div>
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>Aucune donnée personnelle n'est contenue dans ce lien.</p>
      </main>
    </div>
  )
}
