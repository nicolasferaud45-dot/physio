import { useEffect, useRef, useState } from 'react'
import {
  EQUIPMENT_LABEL, PATHOLOGIES, PHASE_LABEL, REGIONS, exerciseById, pathologyById, regionLabel, type RegionId,
} from '../data/catalog'
import { localInterpreter, type Interpretation } from '../engine/interpret'
import { analyzeWithClaude, getSample, type AiAnalysis } from '../engine/claude'
import { Sources } from '../components/Sources'
import { defaultPrescription, formatDose, suggestProgram } from '../engine/plan'
import { Icon } from '../components/Icon'
import type { Screen, Session } from '../state/session'

interface Props {
  s: Session
  update: (p: Partial<Session> | ((s: Session) => Partial<Session>)) => void
  go: (sc: Screen) => void
}

const EXAMPLES = [
  'capsulite épaule droite, phase douloureuse, sans matériel, veut reprendre la natation',
  'bursite épaule, douleur 6',
  'entorse cheville, footballeur, élastique',
  'exercices lombaires sans matériel 10 min',
]

// Web Speech API (Safari iPad / Chrome) — typée localement
type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
const getSR = (): (new () => SR) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export default function Home({ s, update, go }: Props) {
  const [text, setText] = useState(s.prompt)
  const [res, setRes] = useState<Interpretation | null>(null)
  const [prepared, setPrepared] = useState(false)
  const [listening, setListening] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const rec = useRef<SR | null>(null)
  const [region, setRegion] = useState<RegionId>(s.region ?? 'epaule')
  const [pick, setPick] = useState(!s.pathologyId)
  const toContext = () => setTimeout(() => document.getElementById('contexte')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)

  useEffect(() => () => rec.current?.stop(), [])

  const [ai, setAi] = useState<AiAnalysis | null>(s.ai ?? null)
  const [aiState, setAiState] = useState<'off' | 'idle' | 'running' | 'done' | 'refused' | 'busy' | 'error'>('idle')
  const abort = useRef<AbortController | null>(null)
  useEffect(() => { getSample().then((x) => { if (!x) setAiState('off') }) }, [])

  const run = async (t = text) => {
    if (!t.trim()) return
    const r = await localInterpreter.interpret(t)
    setRes(r); setPrepared(false); setAi(null)
    if (aiState === 'off') return
    abort.current?.abort()
    const ctl = new AbortController(); abort.current = ctl
    setAiState('running')
    const out = await analyzeWithClaude(t, ctl.signal)
    if (ctl.signal.aborted) return
    if (out.ok) { setRes(out.interp); setAi(out.ai); setAiState('done') }
    else setAiState(out.reason === 'unavailable' ? 'off' : out.reason === 'not_granted' ? 'refused' : out.reason === 'rate_limited' ? 'busy' : 'error')
  }

  const toggleMic = () => {
    if (listening) { rec.current?.stop(); return }
    const SRc = getSR()
    if (!SRc) { setNotice("La dictée n'est pas disponible dans ce navigateur : utilisez le micro du clavier de la tablette."); return }
    const r = new SRc()
    r.lang = 'fr-FR'; r.interimResults = true; r.continuous = false
    r.onresult = (e) => {
      const t = Array.from(e.results).map((x) => x[0].transcript).join(' ')
      setText(t)
      if (e.results[e.results.length - 1].isFinal) run(t)
    }
    r.onend = () => setListening(false)
    r.onerror = () => { setListening(false); setNotice('Micro indisponible ou refusé.') }
    rec.current = r; r.start(); setListening(true); setNotice(null)
  }

  const prepare = () => {
    if (!res) return
    const ctx = { region: res.region, pathologyId: res.pathologyId, phase: res.phase, equipment: res.equipment, minutesPerDay: res.minutesPerDay }
    update({
      prompt: res.text,
      pathologyId: res.pathologyId, region: res.region, side: res.side, phase: res.phase,
      eva: res.eva ?? s.eva, goals: res.goals, equipment: res.equipment, minutesPerDay: res.minutesPerDay,
      redFlagsCleared: false, captures: [], ai,
      program: ai?.exercises.length ? ai.exercises.map((x) => defaultPrescription(exerciseById(x.id)!)) : suggestProgram(ctx),
      presentation: { ...s.presentation, sick: true },
    })
    if (res.region) setRegion(res.region)
    setPrepared(true)
    if (res.pathologyId) setPick(false)
  }

  const pickPatho = (id: string) => {
    const p = pathologyById(id)!
    update((x) => ({
      pathologyId: id, region: p.region, program: x.pathologyId === id ? x.program
        : suggestProgram({ region: p.region, pathologyId: id, phase: x.phase, equipment: x.equipment, minutesPerDay: x.minutesPerDay }),
      presentation: { ...x.presentation, sick: true }, ai: x.pathologyId === id ? x.ai : null,
    }))
  }

  const patho = pathologyById(s.pathologyId)

  return (
    <div className="stack" style={{ gap: 22, maxWidth: 1180, margin: '0 auto' }}>
      <section className="stack" style={{ gap: 14 }}>
        <h1 style={{ fontSize: 26, textAlign: 'center' }}>Décrivez la situation, l'appli prépare la séance</h1>
        <form className="command" onSubmit={(e) => { e.preventDefault(); run() }}>
          <label className="grow" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="small" style={{ fontWeight: 600, color: 'var(--blue)' }}>{listening ? 'En écoute…' : 'Tapez ou dictez'}</span>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="ex. « capsulite épaule droite, sans matériel, natation »" enterKeyHint="go" />
          </label>
          {text && <button type="button" className="icon-btn" style={{ border: 0 }} aria-label="Effacer" onClick={() => { setText(''); setRes(null) }}><Icon name="x" /></button>}
          <button type="submit" className="btn primary round" disabled={!text.trim()}>Analyser</button>
          <button type="button" className={'mic' + (listening ? ' on' : '')} onClick={toggleMic} aria-label={listening ? 'Arrêter la dictée' : 'Dicter'}><Icon name="mic" size={26} /></button>
        </form>
        {notice && <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>{notice}</p>}
        {!res && (
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <span className="small muted">Exemples :</span>
            {EXAMPLES.map((e) => <button key={e} className="chip" style={{ fontSize: 14 }} onClick={() => { setText(e); run(e) }}>« {e} »</button>)}
          </div>
        )}
      </section>

      {res && !prepared && (
        <section className="card stack" aria-label="Interprétation">
          <div className="row wrap"><h2 className="grow">J'ai compris</h2>
            {aiState === 'running' && <span className="ai-badge run">Claude affine l'analyse…</span>}
            {aiState === 'done' && <span className="ai-badge">Analysé par Claude · catalogue vérifié</span>}
            {aiState === 'off' && <span className="small muted">Analyse locale (hors-ligne)</span>}
            {aiState === 'refused' && <span className="small muted">Claude non autorisé · analyse locale</span>}
            {aiState === 'busy' && <span className="small muted">Claude occupé · analyse locale, réessayez dans un instant</span>}
            {aiState === 'error' && <button className="btn ghost" onClick={() => run()}>Claude indisponible · réessayer</button>}
          </div>
          <span className="small muted">Vérifiez avant de valider : vous pourrez tout ajuster ensuite.</span>
          <div className="understood">
            <div><span className="eyebrow">Pathologie</span><b>{pathologyById(res.pathologyId)?.label ?? '—'}</b></div>
            <div><span className="eyebrow">Région</span><b>{res.region ? regionLabel(res.region) : '—'}{res.side ? ` ${res.side === 'D' ? 'droite' : 'gauche'}` : ''}</b></div>
            <div><span className="eyebrow">Phase</span><b>{res.phase ? PHASE_LABEL[res.phase] : '—'}</b></div>
            <div><span className="eyebrow">Douleur EVA</span><b>{res.eva ?? '—'}{res.eva !== null ? '/10' : ''}</b></div>
            <div><span className="eyebrow">Matériel</span><b>{res.equipment.length ? res.equipment.map((e) => EQUIPMENT_LABEL[e]).join(', ') : 'Non précisé'}</b></div>
            <div><span className="eyebrow">Objectifs</span><b>{res.goals.length ? res.goals.map((g) => g.replace('Reprise sport · ', '')).join(', ') : '—'}</b></div>
            {res.minutesPerDay && <div><span className="eyebrow">Temps / jour</span><b>{res.minutesPerDay} min</b></div>}
            {res.missing.map((m) => <div key={m} className="miss"><span className="eyebrow" style={{ color: 'inherit' }}>Manquant</span><b>{m}</b></div>)}
          </div>
          {ai && <AiCard ai={ai} />}
          {!res.pathologyId && res.candidates.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <span style={{ fontWeight: 600 }}>Quelle pathologie ?</span>
              <div className="row wrap">{res.candidates.map((id) => (
                <button key={id} className="chip" onClick={() => setRes({ ...res, pathologyId: id, missing: res.missing.filter((m) => m !== 'Pathologie ou région') })}>{pathologyById(id)!.label}</button>
              ))}</div>
            </div>
          )}
          {!res.pathologyId && !res.region && <p className="muted" style={{ margin: 0 }}>Je n'ai pas reconnu de pathologie ni de région. Reformulez ou choisissez ci-dessous.</p>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn primary" disabled={!res.pathologyId && !res.region} onClick={prepare}>Préparer la séance <Icon name="next" /></button>
          </div>
        </section>
      )}

      {prepared && (
        <section aria-label="Séance préparée" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, alignItems: 'stretch' }}>
          <div className="card stack">
            <span className="eyebrow">1 · Expliquer</span>
            <h2>{patho ? patho.label : regionLabel(s.region ?? 'epaule')}</h2>
            <SideSwitch value={s.side} onChange={(side) => update({ side })} />
            <p className="muted" style={{ margin: 0 }}>{patho?.visual ? 'Vue 3D prête, comparaison saine / pathologique.' : 'Explication en mots simples prête.'}</p>
            <button className="btn dark" onClick={() => go('presentation')}><Icon name="screen" />Montrer au patient</button>
          </div>
          <div className="card stack">
            <span className="eyebrow">2 · Contexte pré-rempli</span>
            <div className="row wrap">
              {s.phase && <span className="tag">{PHASE_LABEL[s.phase]}</span>}
              {s.equipment.map((e) => <span key={e} className="tag">{EQUIPMENT_LABEL[e]}</span>)}
              {s.goals.map((g) => <span key={g} className="tag green">{g.replace('Reprise sport · ', '')}</span>)}
            </div>
            {patho && <div className="alert"><h3>Drapeaux rouges à écarter</h3><span className="small">{patho.redFlags.slice(0, 3).join(' · ')}</span></div>}
            <button className="btn" onClick={toContext}>Compléter le contexte</button>
          </div>
          <div className="card stack">
            <span className="eyebrow">3 · Exercices suggérés</span>
            {s.program.length === 0 && <span className="muted">Aucun exercice compatible : ajustez le matériel ou la phase.</span>}
            {s.program.map((p) => (
              <div key={p.exerciseId} className="row" style={{ padding: 10, borderRadius: 12, background: 'var(--surface-2)' }}>
                <span className="grow" style={{ fontWeight: 600 }}>{exerciseById(p.exerciseId)?.name}</span>
                <span className="small muted">{formatDose(p)} · {p.freq}</span>
              </div>
            ))}
            <div className="row">
              <button className="btn grow" onClick={() => go('plan')}>Ajuster</button>
              <button className="btn green grow" onClick={() => go('share')}><Icon name="check" />Tout valider</button>
            </div>
          </div>
        </section>
      )}

      {!pick && s.pathologyId && (
        <div className="card row wrap" style={{ padding: '14px 18px' }}>
          <span className="eyebrow">Pathologie retenue</span>
          <strong className="grow">{pathologyById(s.pathologyId)?.label}</strong>
          <SideSwitch value={s.side} onChange={(side) => update({ side })} />
          <button className="btn" onClick={() => setPick(true)}>Changer</button>
        </div>
      )}
      {pick && <section className="cols">
        <div className="card" style={{ flex: '0 1 380px' }}>
          <div className="row" style={{ marginBottom: 8 }}><h2 className="grow">Ou choisissez une région</h2></div>
          <BodyMap value={region} onChange={(r) => { setRegion(r); update({ region: r }) }} />
        </div>
        <div className="stack">
          <h2>{regionLabel(region)} · pathologies</h2>
          <div className="patho-grid">
            {PATHOLOGIES.filter((p) => p.region === region).map((p) => (
              <button key={p.id} className="patho-card" aria-pressed={s.pathologyId === p.id} onClick={() => { pickPatho(p.id); setPick(false); toContext() }}>
                <span className="row"><span className="t grow">{p.label}</span>{p.visual && <span className="tag">3D</span>}</span>
                <span className="small muted">{p.short}</span>
              </button>
            ))}
            {PATHOLOGIES.filter((p) => p.region === region).length === 0 && <p className="muted">Aucune fiche pour cette région dans le prototype.</p>}
          </div>
        </div>
      </section>}
    </div>
  )
}

const SPOTS: { id: RegionId; x: number; y: number; label?: string }[] = [
  { id: 'cervical', x: 160, y: 92 }, { id: 'epaule', x: 84, y: 118 }, { id: 'coude', x: 244, y: 176 }, { id: 'lombaire', x: 160, y: 214 },
  { id: 'poignet', x: 60, y: 262 }, { id: 'hanche', x: 214, y: 262 }, { id: 'genou', x: 112, y: 340 }, { id: 'cheville', x: 196, y: 414 },
]

function BodyMap({ value, onChange }: { value: RegionId; onChange: (r: RegionId) => void }) {
  return (
    <div className="bodymap">
      <svg width="320" height="440" viewBox="0 0 320 440" aria-hidden="true">
        <g fill="#E3EBF1" stroke="#C5D3DD" strokeWidth="2">
          <circle cx="160" cy="44" r="30" />
          <rect x="148" y="72" width="24" height="18" rx="6" />
          <path d="M104 94 Q160 82 216 94 L224 236 Q160 248 96 236 Z" />
          <path d="M102 98 Q82 104 76 132 L58 236 Q54 248 66 250 L76 248 L96 144 Z" />
          <path d="M218 98 Q238 104 244 132 L262 236 Q266 248 254 250 L244 248 L224 144 Z" />
          <path d="M102 238 L156 244 L150 424 Q138 432 124 424 Z" />
          <path d="M218 238 L164 244 L170 424 Q182 432 196 424 Z" />
        </g>
      </svg>
      {SPOTS.map((sp) => (
        <button key={sp.id} className="chip hot" aria-pressed={value === sp.id} style={{ left: sp.x, top: sp.y, background: value === sp.id ? 'var(--blue)' : undefined, color: value === sp.id ? '#fff' : undefined }}
          onClick={() => onChange(sp.id)}>{REGIONS.find((r) => r.id === sp.id)!.label}</button>
      ))}
    </div>
  )
}

/** Synthèse Claude, vue praticien : synthèse, vigilance, questions, exercices argumentés, sources. */
export function AiCard({ ai, compact }: { ai: AiAnalysis; compact?: boolean }) {
  return (
    <div className="card stack ai-card" style={{ gap: 10 }}>
      <div className="row"><span className="ai-badge">Synthèse Claude</span><span className="grow" /><span className="small muted">Aide à la décision · à valider cliniquement</span></div>
      {ai.synthesis && <p style={{ margin: 0 }}>{ai.synthesis}</p>}
      {ai.vigilance.length > 0 && <div className="alert"><h3>Points de vigilance</h3><ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>{ai.vigilance.map((v) => <li key={v}>{v}</li>)}</ul></div>}
      {ai.questions.length > 0 && <div className="stack" style={{ gap: 4 }}><span className="eyebrow">À préciser</span>{ai.questions.map((q) => <span key={q} className="small">• {q}</span>)}</div>}
      {!compact && ai.exercises.length > 0 && <div className="stack" style={{ gap: 6 }}><span className="eyebrow">Exercices proposés</span>{ai.exercises.map((x) => <span key={x.id} className="small"><strong>{exerciseById(x.id)?.name}</strong> — {x.why}</span>)}</div>}
      {ai.patientMessage && <div className="stack" style={{ gap: 2 }}><span className="eyebrow">Pour le patient</span><span className="small" style={{ fontStyle: 'italic' }}>« {ai.patientMessage} »</span></div>}
      <Sources ids={ai.sources} />
    </div>
  )
}

/** Côté atteint : toutes les vues 3D s'affichent en miroir pour le côté gauche. */
export function SideSwitch({ value, onChange }: { value: 'D' | 'G' | null; onChange: (v: 'D' | 'G') => void }) {
  return (
    <div className="seg side-switch" role="radiogroup" aria-label="Côté atteint">
      <button role="radio" aria-checked={value === 'D'} aria-pressed={value === 'D'} onClick={() => onChange('D')}>Droit</button>
      <button role="radio" aria-checked={value === 'G'} aria-pressed={value === 'G'} onClick={() => onChange('G')}>Gauche</button>
    </div>
  )
}
