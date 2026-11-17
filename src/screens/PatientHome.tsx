import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { exerciseById, pathologyById, regionLabel } from '../data/catalog'
import { formatDose, type Prescription } from '../engine/plan'
import { MOTIONS } from '../data/motions'
import { emptySession, loadLog, saveLog, shareKeyOf, type LogEntry, type PassportData, type Session } from '../state/session'
import { ExercisePic, IllustrationLegend } from './Exercises'
import ExerciseViewer from './ExerciseViewer'
import Presentation from './Presentation'

type Tab = 'today' | 'understand' | 'progress'
const today = () => new Date().toISOString().slice(0, 10)

/** Application du patient (téléphone) : séance guidée, comprendre, suivi. */
export default function PatientHome({ data, code }: { data: PassportData; code: string }) {
  const key = shareKeyOf(code)
  const [tab, setTab] = useState<Tab>('today')
  const [log, setLog] = useState<LogEntry[]>(() => loadLog(key))
  const [guided, setGuided] = useState<number | null>(null)
  const [view3d, setView3d] = useState(false)
  const [s3, setS3] = useState<Session>(() => ({ ...emptySession(), pathologyId: data.pathologyId, side: data.side }))
  const patho = pathologyById(data.pathologyId)
  const entry = log.find((x) => x.date === today())
  const preview = (() => { try { return sessionStorage.getItem('physio.preview') === '1' } catch { return false } })()
  const exitPreview = () => { try { sessionStorage.removeItem('physio.preview') } catch { /* ignore */ } location.hash = '' }
  const maxPain = Math.max(0, ...data.program.map((p) => p.maxPain))
  const minutes = data.program.reduce((n, p) => n + (exerciseById(p.exerciseId)?.minutes ?? 0), 0)

  const record = (done: string[], pain: number | null) => {
    const next = [...log.filter((x) => x.date !== today()), { date: today(), done, pain }].sort((a, b) => a.date.localeCompare(b.date))
    setLog(next); saveLog(key, next)
  }

  if (view3d) return <Presentation s={s3} update={(p) => setS3((x) => ({ ...x, ...(typeof p === 'function' ? p(x) : p) }))} onExit={() => setView3d(false)} readOnly />
  if (guided !== null) return <Guided data={data} start={guided} doneBefore={entry?.done ?? []} onClose={() => setGuided(null)} onFinish={(done, pain) => { record(done, pain); setGuided(null); setTab('progress') }} />

  return (
    <div className="papp">
      {preview && (
        <div className="row" style={{ position: 'sticky', top: 0, zIndex: 15, background: 'var(--ink)', color: '#fff', padding: '8px 16px' }}>
          <span className="grow small">Aperçu de l'app patient</span>
          <button className="btn round" style={{ minHeight: 40 }} onClick={exitPreview}><Icon name="back" />Retour praticien</button>
        </div>
      )}
      <header className="papp-head">
        <span className="small" style={{ fontWeight: 600, color: 'var(--blue)' }}>Mon programme de rééducation</span>
        <h1 style={{ fontSize: 24, marginTop: 2 }}>{patho ? `Mon ${regionLabel(patho.region).toLowerCase()}${data.side ? (data.side === 'D' ? ' droit' : ' gauche') : ''}` : 'Mes exercices'}</h1>
        <span className="small muted">Remis le {new Date(data.date).toLocaleDateString('fr-CH', { day: 'numeric', month: 'long' })}</span>
      </header>

      <main className="papp-main">
        {tab === 'today' && <>
          <section className="card stack" style={{ gap: 10 }}>
            <span className="eyebrow">Aujourd'hui</span>
            <strong style={{ fontSize: 20 }}>{entry ? `Séance faite · ${entry.done.length}/${data.program.length} exercices` : `${data.program.length} exercices · environ ${minutes} min`}</strong>
            <div className="sets">{data.program.map((p) => <i key={p.exerciseId} className={entry?.done.includes(p.exerciseId) ? 'on' : ''} />)}</div>
            <button className="btn primary" style={{ minHeight: 58, fontSize: 18 }} onClick={() => setGuided(0)}><Icon name="play" />{entry ? 'Refaire la séance' : 'Commencer la séance'}</button>
          </section>
          <div className="row wrap"><h2 className="grow" style={{ fontSize: 18 }}>Mes exercices</h2><IllustrationLegend /></div>
          {data.program.map((p, i) => {
            const e = exerciseById(p.exerciseId)
            if (!e) return null
            return (
              <button key={p.exerciseId} className={'today-ex' + (entry?.done.includes(e.id) ? ' done' : '')} style={{ font: 'inherit', textAlign: 'left', color: 'inherit' }} onClick={() => setGuided(i)}>
                <ExercisePic e={e} size={80} />
                <span className="stack grow" style={{ gap: 2 }}><strong>{e.name}</strong><span className="small muted">{formatDose(p)} · {p.freq}</span></span>
                {entry?.done.includes(e.id) ? <Icon name="check" /> : <Icon name="next" />}
              </button>
            )
          })}
          <div role="note" className="alert row" style={{ alignItems: 'flex-start' }}><Icon name="alert" /><span className="small">Douleur acceptée jusqu'à <strong>{maxPain}/10</strong>. Au-delà, ou si elle persiste le lendemain, arrêtez et prévenez votre physiothérapeute.</span></div>
        </>}

        {tab === 'understand' && <>
          {patho ? (
            <article className="card stack" style={{ gap: 10 }}>
              <span className="eyebrow">{patho.label}</span>
              <div className="explain-block ok"><span className="explain-label"><i />Normalement</span><strong>{patho.healthy.simple.title}</strong><p>{patho.healthy.simple.body}</p></div>
              <div className="explain-block bad"><span className="explain-label"><i />Chez moi</span><strong>{patho.sick.simple.title}</strong><p>{patho.sick.simple.body}</p></div>
              {patho.sickRom && patho.visual && (
                <div className="rom">
                  <span className="small" style={{ fontWeight: 600 }}>Jusqu'où le bras monte sur le côté</span>
                  <div className="row"><span className="small" style={{ width: 92, color: 'var(--green-ink)', fontWeight: 600 }}>Normal</span><div className="bar"><span style={{ width: '100%', background: '#2E7D5B' }} /></div><span className="small" style={{ width: 40, fontWeight: 700 }}>180°</span></div>
                  <div className="row"><span className="small" style={{ width: 92, color: 'var(--red-ink)', fontWeight: 600 }}>Chez moi</span><div className="bar"><span style={{ width: `${Math.round((patho.sickRom / 180) * 100)}%`, background: '#C2412D' }} /></div><span className="small" style={{ width: 40, fontWeight: 700 }}>{patho.sickRom}°</span></div>
                </div>
              )}
              {patho.visual && <button className="btn primary" onClick={() => setView3d(true)}><Icon name="play" />Voir la comparaison en 3D</button>}
            </article>
          ) : <p className="muted">Votre physiothérapeute n'a pas joint d'explication.</p>}
          {data.goals.length > 0 && <section className="card stack" style={{ gap: 8 }}><span className="eyebrow">Mes objectifs</span><div className="row wrap">{data.goals.map((g) => <span key={g} className="tag green">{g.replace('Reprise sport · ', '')}</span>)}</div></section>}
        </>}

        {tab === 'progress' && <Progress log={log} total={data.program.length} maxPain={maxPain} />}
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>Aucune donnée personnelle dans ce lien. Votre suivi reste sur ce téléphone.</p>
      </main>

      <nav className="ptabs" role="tablist" aria-label="Sections">
        {([['today', "Aujourd'hui", 'play'], ['understand', 'Comprendre', 'person'], ['progress', 'Mon suivi', 'check']] as const).map(([id, l, ic]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}><Icon name={ic} />{l}</button>
        ))}
      </nav>
    </div>
  )
}

function Progress({ log, total, maxPain }: { log: LogEntry[]; total: number; maxPain: number }) {
  const last = log.slice(-14)
  const week = log.filter((x) => (Date.now() - new Date(x.date).getTime()) / 864e5 < 7).length
  let streak = 0
  for (let d = new Date(); ; d.setDate(d.getDate() - 1)) { if (log.some((x) => x.date === d.toISOString().slice(0, 10))) streak++; else if (streak || d.toISOString().slice(0, 10) !== today()) break }
  if (!log.length) return <div className="card stack" style={{ alignItems: 'center', textAlign: 'center', padding: 28 }}><Icon name="check" size={30} /><h2>Pas encore de séance</h2><p className="muted" style={{ margin: 0 }}>Après chaque séance, notez votre douleur : votre physiothérapeute verra l'évolution.</p></div>
  return <>
    <div className="row" style={{ gap: 12 }}>
      <div className="card stack grow" style={{ gap: 2, alignItems: 'center' }}><span className="big-count" style={{ fontSize: 40 }}>{week}</span><span className="small muted">séances cette semaine</span></div>
      <div className="card stack grow" style={{ gap: 2, alignItems: 'center' }}><span className="big-count" style={{ fontSize: 40 }}>{streak}</span><span className="small muted">jours d'affilée</span></div>
    </div>
    <section className="card stack" style={{ gap: 6 }}>
      <span className="eyebrow">Douleur pendant les séances</span>
      <div className="chart-bars" aria-label="Douleur par séance">
        {last.map((x) => <span key={x.date} title={`${x.date} : ${x.pain ?? '—'}/10`} style={{ height: `${Math.max(4, ((x.pain ?? 0) / 10) * 100)}%`, background: (x.pain ?? 0) > maxPain ? '#C2412D' : '#2E7D5B' }} />)}
      </div>
      <span className="small muted">Vert : dans la limite fixée ({maxPain}/10) · rouge : au-dessus</span>
    </section>
    <section className="card stack" style={{ gap: 8 }}>
      {[...log].reverse().map((x) => (
        <div key={x.date} className="row"><span className="grow">{new Date(x.date).toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'short' })}</span><span className="small muted">{x.done.length}/{total} exercices</span><strong style={{ color: (x.pain ?? 0) > maxPain ? 'var(--red-ink)' : 'var(--green-ink)' }}>{x.pain ?? '—'}/10</strong></div>
      ))}
    </section>
  </>
}

/** Séance guidée : une série après l'autre, minuterie pour les maintiens et le repos, douleur à la fin. */
function Guided({ data, start, doneBefore, onClose, onFinish }: { data: PassportData; start: number; doneBefore: string[]; onClose: () => void; onFinish: (done: string[], pain: number | null) => void }) {
  const [i, setI] = useState(start)
  const [set, setSet] = useState(0)
  const [timer, setTimer] = useState<{ kind: 'hold' | 'rest'; left: number } | null>(null)
  const [done, setDone] = useState<string[]>(doneBefore)
  const [painStep, setPainStep] = useState(false)
  const [pain, setPain] = useState<number | null>(null)
  const [show3d, setShow3d] = useState(false)
  const iv = useRef<number | undefined>(undefined)
  const p: Prescription | undefined = data.program[i]
  const e = p ? exerciseById(p.exerciseId) : undefined

  useEffect(() => {
    window.clearInterval(iv.current)
    if (!timer) return
    iv.current = window.setInterval(() => setTimer((t) => (t ? { ...t, left: t.left - 1 } : t)), 1000)
    return () => window.clearInterval(iv.current)
  }, [timer?.kind]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (timer && timer.left <= 0) { const k = timer.kind; setTimer(null); if (k === 'hold') completeSet() }
  }, [timer?.left]) // eslint-disable-line react-hooks/exhaustive-deps

  const nextExercise = () => {
    if (i + 1 < data.program.length) { setI(i + 1); setSet(0); setTimer(null) } else setPainStep(true)
  }
  const completeSet = () => {
    if (!p) return
    const n = set + 1
    if (n >= p.sets) { setDone((d) => (d.includes(p.exerciseId) ? d : [...d, p.exerciseId])); setSet(n); return }
    setSet(n)
    if (p.restSec > 0) setTimer({ kind: 'rest', left: p.restSec })
  }

  if (show3d && p) return <ExerciseViewer ids={[p.exerciseId]} start={p.exerciseId} program={data.program} pathologyId={data.pathologyId} onClose={() => setShow3d(false)} patient />

  if (painStep) return (
    <div className="guided">
      <div className="guided-top"><button className="btn ghost" onClick={() => setPainStep(false)}><Icon name="back" />Retour</button></div>
      <div className="guided-main" style={{ justifyContent: 'center' }}>
        <h1 style={{ fontSize: 24, textAlign: 'center' }}>Bravo, séance terminée</h1>
        <p className="muted" style={{ margin: 0, textAlign: 'center' }}>Quelle douleur avez-vous ressentie pendant les exercices ?</p>
        <div className="pain-scale" role="radiogroup" aria-label="Douleur de 0 à 10">
          {Array.from({ length: 11 }, (_, k) => <button key={k} aria-pressed={pain === k} onClick={() => setPain(k)} style={{ borderColor: k > Math.max(...data.program.map((x) => x.maxPain)) ? '#E9B4A8' : undefined }}>{k}</button>)}
        </div>
        <div className="row" style={{ width: '100%', justifyContent: 'space-between' }}><span className="small muted">Aucune</span><span className="small muted">Maximale</span></div>
        {pain !== null && pain > Math.max(...data.program.map((x) => x.maxPain)) && <div className="alert row"><Icon name="alert" /><span className="small">C'est au-dessus de la limite fixée. Réduisez l'amplitude ou les répétitions, et prévenez votre physiothérapeute si cela persiste demain.</span></div>}
        <button className="btn primary" style={{ width: '100%', minHeight: 56 }} disabled={pain === null} onClick={() => onFinish(done, pain)}><Icon name="check" />Enregistrer</button>
      </div>
    </div>
  )
  if (!p || !e) return null
  const finished = set >= p.sets

  return (
    <div className="guided">
      <div className="guided-top">
        <button className="btn ghost" onClick={onClose}><Icon name="x" />Quitter</button>
        <span className="grow small muted" style={{ textAlign: 'center' }}>Exercice {i + 1} / {data.program.length}</span>
        <button className="btn ghost" onClick={nextExercise}>Passer<Icon name="next" /></button>
      </div>
      <div className="guided-main">
        <ExercisePic e={e} size={300} />
        <h1 style={{ fontSize: 22, textAlign: 'center', margin: 0 }}>{e.name}</h1>
        <span className="muted">{formatDose(p)}</span>
        <div className="sets" aria-label={`Série ${Math.min(set + 1, p.sets)} sur ${p.sets}`}>{Array.from({ length: p.sets }, (_, k) => <i key={k} className={k < set ? 'on' : ''} />)}</div>
        {timer ? (
          <div className="stack" style={{ alignItems: 'center', gap: 6 }}>
            <span className="eyebrow">{timer.kind === 'hold' ? 'Tenez la position' : 'Repos'}</span>
            <span className="big-count">{timer.left}</span>
            <button className="btn" onClick={() => { const k = timer.kind; setTimer(null); if (k === 'hold') completeSet() }}>{timer.kind === 'hold' ? 'Terminer la série' : 'Passer le repos'}</button>
          </div>
        ) : finished ? (
          <button className="btn green" style={{ width: '100%', minHeight: 58, fontSize: 18 }} onClick={nextExercise}><Icon name="check" />{i + 1 < data.program.length ? 'Exercice suivant' : 'Terminer la séance'}</button>
        ) : p.holdSec ? (
          <button className="btn primary" style={{ width: '100%', minHeight: 58, fontSize: 18 }} onClick={() => setTimer({ kind: 'hold', left: p.holdSec! })}><Icon name="play" />Série {set + 1} · tenir {p.holdSec} s</button>
        ) : (
          <button className="btn primary" style={{ width: '100%', minHeight: 58, fontSize: 18 }} onClick={completeSet}><Icon name="check" />Série {set + 1} faite{p.reps ? ` (${p.reps} répétitions)` : ''}</button>
        )}
        <div className="row" style={{ width: '100%' }}>
          {MOTIONS[e.id] && <button className="btn grow" onClick={() => setShow3d(true)}><Icon name="play" size={16} />Voir en 3D</button>}
        </div>
        <details className="card" style={{ width: '100%' }}><summary style={{ fontWeight: 600, cursor: 'pointer' }}>Comment faire</summary><p className="small">{e.how}</p><p className="small"><strong>Sécurité :</strong> {e.safety}</p></details>
      </div>
    </div>
  )
}
