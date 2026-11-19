// Séance guidée : bilan (au suivi, on part de la dernière fois), ce qui est fait en cabinet, et clôture.
import { lazy, Suspense, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import front from '../assets/body-front.png'
import back from '../assets/body-back.png'
import { exerciseById, PHASE_LABEL, pathologyById } from '../data/catalog'
import { loadLog, type Screen, type Session } from '../state/session'
import {
  closeVisit, currentEpisode, currentVisit, fmtDate, FEELING_LABEL, NEXT_LABEL, patchVisit, previousVisit, rxLeft, type Feeling, type Visit,
} from '../state/record'

import { ExercisePic } from './Exercises'
const ExerciseViewer = lazy(() => import('./ExerciseViewer'))
type Update = (p: Partial<Session> | ((s: Session) => Partial<Session>)) => void
interface Props { s: Session; update: Update; go: (sc: Screen) => void; onPen: () => void }

/** Retours du programme maison depuis une date (journal tenu sur l'appareil du patient en démo). */
export function homeSince(s: Session, since: number | null) {
  const log = s.shareKey ? loadLog(s.shareKey) : []
  const from = since ? new Date(since).toISOString().slice(0, 10) : ''
  const rows = log.filter((x) => x.date > from)
  const pains = rows.map((x) => x.pain).filter((x): x is number => x !== null)
  return { days: rows.length, avgPain: pains.length ? Math.round(pains.reduce((a, b) => a + b, 0) / pains.length) : null }
}

export function SketchThumbs({ v, size = 96, onAdd }: { v: Visit | null; size?: number; onAdd?: () => void }) {
  const items = [['f', front, v?.sketch?.front], ['b', back, v?.sketch?.back]].filter(([, , d]) => !!d) as [string, string, string][]
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      {items.map(([k, img, d]) => (
        <div key={k} className="sk-thumb" style={{ height: size * 1.25, width: size }}><img src={img} alt="" /><img src={d} alt={k === 'f' ? 'Dessin de face' : 'Dessin de dos'} /></div>
      ))}
      {onAdd && <button className="sk-add" style={{ height: size * 1.25, width: size }} onClick={onAdd}><Icon name="pen" size={18} />{items.length ? 'Modifier' : 'Dessiner'}</button>}
    </div>
  )
}

/* ------------------------------------------------------------------ bilan */
export function Bilan({ s, update, go, onPen }: Props) {
  const ep = currentEpisode(s)
  const v = currentVisit(s)
  const prev = previousVisit(ep, s.visitId)
  const home = prev ? homeSince(s, prev.at) : null
  const patho = pathologyById(s.pathologyId)
  const setV = (p: Partial<Visit>) => update((x) => patchVisit(x, p))
  return (
    <div className="seance">
      <section className="card seance-main">
        <h1 className="seance-h">{prev ? 'Depuis la dernière fois' : 'Aujourd\'hui'}</h1>
        <div className="stack" style={{ gap: 8 }}>
          <div className="row"><span className="pk-eyebrow grow" style={{ margin: 0 }}>Douleur aujourd'hui</span>{prev && <span className="small muted">la dernière fois : {prev.eva}/10</span>}</div>
          <div className="eva-grid big" role="radiogroup" aria-label="Douleur de 0 à 10">
            {Array.from({ length: 11 }, (_, k) => <button key={k} role="radio" aria-checked={s.eva === k} className={prev?.eva === k && s.eva !== k ? 'was' : ''} onClick={() => update({ eva: k })}>{k}</button>)}
          </div>
          {prev && <span className={'small ' + (s.eva < prev.eva ? 'good' : s.eva > prev.eva ? 'bad' : 'muted')} style={{ fontWeight: 600 }}>
            {s.eva < prev.eva ? `En baisse de ${prev.eva - s.eva} point${prev.eva - s.eva > 1 ? 's' : ''} depuis la dernière séance` : s.eva > prev.eva ? `En hausse de ${s.eva - prev.eva} point${s.eva - prev.eva > 1 ? 's' : ''} depuis la dernière séance` : 'Comme la dernière séance'}
          </span>}
        </div>
        {prev && (
          <div className="stack" style={{ gap: 8 }}>
            <span className="pk-eyebrow" style={{ margin: 0 }}>Il se sent</span>
            <div className="seance-feel">
              {(Object.keys(FEELING_LABEL) as Feeling[]).map((f) => <button key={f} aria-pressed={v?.feeling === f} className={'f-' + f} onClick={() => setV({ feeling: v?.feeling === f ? undefined : f })}>{FEELING_LABEL[f]}</button>)}
            </div>
          </div>
        )}
        {prev && (
          <div className="stack" style={{ gap: 8 }}>
            <span className="pk-eyebrow" style={{ margin: 0 }}>Programme à la maison</span>
            <div className="seance-home">
              {home && home.days > 0
                ? <><Icon name="check" size={20} stroke={2.4} /><span className="grow"><b>{home.days} jour{home.days > 1 ? 's' : ''} d'exercices</b> notés depuis le {fmtDate(prev.at)}{home.avgPain !== null ? ` · douleur pendant les exercices ${home.avgPain}/10` : ''}</span></>
                : <span className="grow muted">Aucun retour reçu depuis le {fmtDate(prev.at)}. Les retours s'affichent quand le patient coche ses exercices.</span>}
            </div>
          </div>
        )}
        {patho && patho.redFlags.length > 0 && (
          <div className="seance-flags">
            <span className="grow">{prev ? 'Drapeaux rouges : rien de nouveau ?' : 'Drapeaux rouges écartés ?'}<details><summary className="small muted">Voir la liste</summary><ul className="small">{patho.redFlags.map((r) => <li key={r}>{r}</li>)}</ul></details></span>
            <button className={'btn' + (v?.flagsOk ? ' ok' : '')} onClick={() => { setV({ flagsOk: !v?.flagsOk }); update({ redFlagsCleared: !v?.flagsOk }) }}>{v?.flagsOk ? <><Icon name="check" size={18} />Confirmé</> : 'Confirmer'}</button>
          </div>
        )}
      </section>
      <aside className="seance-side">
        <div className="card stack" style={{ gap: 10 }}>
          <strong>Où a-t-il mal aujourd'hui ?</strong>
          <SketchThumbs v={v} size={110} onAdd={onPen} />
          <span className="small muted">Le dessin est rangé avec cette séance.</span>
        </div>
        <span className="grow" />
        <button className="btn primary pk-primary" onClick={() => go('presentation')}>Suivant : expliquer<Icon name="next" /></button>
        <button className="btn ghost" onClick={() => go('cabinet')}>Passer à « En cabinet »</button>
      </aside>
    </div>
  )
}

/* ------------------------------------------------------------------ en cabinet */
export const CLINIC = ['Mobilisation passive', 'Thérapie manuelle', 'Exercices supervisés', 'Massage', 'Étirements', 'Électrothérapie', 'Taping', 'Conseils', 'Éducation à la douleur']
export function Cabinet({ s, update, go }: Props) {
  const v = currentVisit(s)
  const [view3d, setView3d] = useState<string | null>(null)
  const sel = v?.clinic ?? []
  const toggle = (c: string) => update((x) => patchVisit(x, (y) => ({ clinic: (y.clinic ?? []).includes(c) ? (y.clinic ?? []).filter((z) => z !== c) : [...(y.clinic ?? []), c] })))
  const tried = v?.tried ?? []
  const toggleTried = (id: string) => update((x) => patchVisit(x, (y) => ({ tried: (y.tried ?? []).includes(id) ? (y.tried ?? []).filter((z) => z !== id) : [...(y.tried ?? []), id] })))
  return (
    <div className="seance one">
      <section className="card seance-main">
        <h1 className="seance-h">Ce que je fais aujourd'hui</h1>
        <span className="small muted">Touchez ce que vous faites. Repris de la dernière séance.</span>
        <div className="row wrap" style={{ gap: 8 }}>
          {CLINIC.map((c) => <button key={c} className="chip" aria-pressed={sel.includes(c)} onClick={() => toggle(c)}>{c}</button>)}
        </div>
        <label className="ov-form" style={{ display: 'block' }}><span className="small">Autre (facultatif)</span><input value={v?.clinicOther ?? ''} onChange={(e) => update((x) => patchVisit(x, { clinicOther: e.target.value }))} placeholder="Ex. ultrasons, crochetage…" /></label>
        {s.program.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <span className="pk-eyebrow" style={{ margin: 0 }}>Exercices faits avec vous</span>
            {s.program.map((p) => {
              const e = exerciseById(p.exerciseId); if (!e) return null
              return (
                <div key={p.exerciseId} className="seance-ex">
                  <button className="seance-ex-main" aria-pressed={tried.includes(e.id)} onClick={() => toggleTried(e.id)}>
                    <span className={'seance-check' + (tried.includes(e.id) ? ' on' : '')}>{tried.includes(e.id) && <Icon name="check" size={16} stroke={3} />}</span>
                    <ExercisePic e={e} size={56} />
                    <span className="stack grow" style={{ gap: 1 }}><strong>{e.name}</strong><span className="small muted">{tried.includes(e.id) ? 'Fait en cabinet' : 'Toucher si fait en cabinet'}</span></span>
                  </button>
                  <button className="icon-btn" aria-label={`Voir ${e.name} en 3D`} onClick={() => setView3d(e.id)}><Icon name="play" size={18} /></button>
                </div>
              )
            })}
            <span className="small muted">Le programme se règle à l'étape « À la maison ».</span>
          </div>
        )}
        <button className="btn primary pk-primary" onClick={() => go('plan')}>Suivant : à la maison<Icon name="next" /></button>
      </section>
      {view3d && <Suspense fallback={null}><ExerciseViewer ids={s.program.map((p) => p.exerciseId)} start={view3d} program={s.program} pathologyId={s.pathologyId} onClose={() => setView3d(null)} /></Suspense>}
    </div>
  )
}

/* ------------------------------------------------------------------ terminer */
interface SR { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
const speechCtor = () => { const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }; return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null }

export function Terminer({ s, update, go, onPen }: Props) {
  const ep = currentEpisode(s)
  const v = currentVisit(s)
  const prev = previousVisit(ep, s.visitId)
  const [listening, setListening] = useState(false)
  const rec = useRef<SR | null>(null)
  if (!ep || !v) return <div className="seance one"><section className="card">Aucune séance en cours.</section></div>
  const ids = s.program.map((p) => p.exerciseId)
  const before = prev?.programIds ?? []
  const added = prev ? ids.filter((x) => !before.includes(x)) : []
  const removed = prev ? before.filter((x) => !ids.includes(x)) : []
  const left = rxLeft(ep)
  const clinic = [...(v.clinic ?? []), ...(v.clinicOther ? [v.clinicOther] : [])]
  const tried = (v.tried ?? []).map((id) => exerciseById(id)?.name).filter(Boolean) as string[]
  const name = (id: string) => exerciseById(id)?.name ?? id
  const dictate = () => {
    const C = speechCtor(); if (!C) return
    if (listening) { rec.current?.stop(); return }
    const r = new C(); r.lang = 'fr-FR'; r.interimResults = true; r.continuous = true
    const base = v.note ? v.note + ' ' : ''
    r.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; update((x) => patchVisit(x, { note: base + t })) }
    r.onend = () => setListening(false); r.onerror = () => setListening(false)
    rec.current = r; r.start(); setListening(true)
  }
  return (
    <div className="seance two">
      <section className="card seance-main">
        <h1 className="seance-h">Résumé de la séance</h1>
        <span className="small muted">Rempli automatiquement. Touchez une ligne pour la corriger.</span>
        <button className="sum-row" onClick={() => go('bilan')}><span>Douleur</span><span><b>{s.eva}/10</b>{prev ? (s.eva < prev.eva ? ` · mieux qu'avant (${prev.eva}/10)` : s.eva > prev.eva ? ` · plus qu'avant (${prev.eva}/10)` : ' · comme avant') : ''}{v.feeling ? ` · se sent ${FEELING_LABEL[v.feeling].toLowerCase()}` : ''}</span></button>
        <button className="sum-row" onClick={() => go('presentation')}><span>Expliqué</span><span>{v.explained ? 'Vue 3D montrée au patient' : <span className="muted">Pas cette fois</span>}</span></button>
        <button className="sum-row" onClick={() => go('cabinet')}><span>En cabinet</span><span className="stack" style={{ gap: 2 }}>{clinic.length || tried.length ? <>{clinic.map((c) => <span key={c}>{c}</span>)}{tried.length > 0 && <span>Exercices : {tried.join(', ')}</span>}</> : <span className="muted">Rien de noté</span>}</span></button>
        <button className="sum-row" onClick={() => go('plan')}><span>À la maison</span><span className="stack" style={{ gap: 2 }}>
          <span>{ids.length} exercice{ids.length > 1 ? 's' : ''}{s.phase ? ` · phase ${PHASE_LABEL[s.phase].toLowerCase()}` : ''}</span>
          {added.length > 0 && <span className="small">Ajouté : {added.map(name).join(', ')}</span>}
          {removed.length > 0 && <span className="small">Retiré : {removed.map(name).join(', ')}</span>}
          <span className={'small ' + (v.shared ? 'good' : 'muted')} style={{ fontWeight: 600 }}>{v.shared ? 'Remis au patient' : 'Pas encore remis'}</span>
        </span></button>
        {left !== null && <div className={'ov-left' + (left <= 1 ? ' low' : '')}><b>Ordonnance :</b> il restera {left} séance{left > 1 ? 's' : ''}{left <= 1 ? ' · pensez au renouvellement' : ''}</div>}
      </section>
      <section className="card seance-main">
        <label className="pk-eyebrow" htmlFor="seance-note" style={{ margin: 0 }}>Note de séance</label>
        <div className="seance-note">
          <textarea id="seance-note" value={v.note ?? ''} onChange={(e) => update((x) => patchVisit(x, { note: e.target.value }))} placeholder="Ex. amplitude, tolérance, ce qu'on change la prochaine fois…" />
          {speechCtor() && <button className={'icon-btn' + (listening ? ' rec' : '')} aria-label={listening ? 'Arrêter la dictée' : 'Dicter la note'} onClick={dictate}><Icon name="mic" size={18} /></button>}
        </div>
        <span className="pk-eyebrow" style={{ margin: 0 }}>Dessins de cette séance</span>
        <SketchThumbs v={v} size={84} onAdd={onPen} />
        <span className="pk-eyebrow" style={{ margin: 0 }}>Prochaine séance</span>
        <div className="seance-feel">
          {(Object.keys(NEXT_LABEL) as NonNullable<Visit['next']>[]).map((n) => <button key={n} aria-pressed={v.next === n} onClick={() => update((x) => patchVisit(x, { next: v.next === n ? undefined : n }))}>{NEXT_LABEL[n].replace('dans ', 'Dans ')}</button>)}
        </div>
        <span className="grow" />
        <button className="btn green pk-primary" onClick={() => update((x) => closeVisit(x))}><Icon name="check" />Enregistrer au dossier</button>
      </section>
    </div>
  )
}
