// Étape 1 : la pathologie. Mode guidé (toucher le corps) ou rapide (écrire / dicter), puis confirmation.
import { useEffect, useMemo, useRef, useState } from 'react'
import { PATHOLOGIES, pathologyById, regionLabel, type Phase, type RegionId } from '../data/catalog'
import { lay } from '../data/lay'
import { interpretLocal, type Interpretation } from '../engine/interpret'
import { analyzeWithClaude, getSample } from '../engine/claude'
import { suggestProgram } from '../engine/plan'
import { BodyMap, type BodyView } from '../components/BodyMap'
import { Icon } from '../components/Icon'
import type { Screen, Session } from '../state/session'

interface Props {
  s: Session
  update: (p: Partial<Session> | ((s: Session) => Partial<Session>)) => void
  go: (sc: Screen) => void
}
type Mode = 'guide' | 'rapide'
const REGION_SIDED: Record<RegionId, boolean> = { epaule: true, coude: true, poignet: true, cervical: false, lombaire: false, hanche: true, genou: true, cheville: true }
const REGION_WORD: Record<RegionId, string> = { epaule: 'Épaule', coude: 'Coude', poignet: 'Poignet et main', cervical: 'Cou', lombaire: 'Bas du dos', hanche: 'Hanche', genou: 'Genou', cheville: 'Cheville et pied' }
const PHASES: [Phase, string][] = [['aigue', 'Récente'], ['subaigue', 'En cours'], ['chronique', 'Ancienne'], ['postop', 'Après opération']]

// Dictée (Web Speech API)
interface SR { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
const speechCtor = () => { const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }; return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null }

function useWide() {
  const q = '(min-width: 900px), (min-width: 640px) and (orientation: landscape)'
  const [wide, setWide] = useState(() => window.matchMedia(q).matches)
  useEffect(() => { const m = window.matchMedia(q); const f = () => setWide(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [])
  return wide
}
function useBodyHeight(ref: React.RefObject<HTMLDivElement | null>) {
  const [h, setH] = useState(480)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(() => setH(Math.max(160, Math.min(el.clientHeight - 8, 760))))
    ro.observe(el); return () => ro.disconnect()
  }, [ref])
  return h
}

export default function PathologyStep({ s, update, go }: Props) {
  const wide = useWide()
  const [mode, setModeState] = useState<Mode>(() => { try { return (localStorage.getItem('physio.pickMode') as Mode) || 'guide' } catch { return 'guide' } })
  const setMode = (m: Mode) => { setModeState(m); try { localStorage.setItem('physio.pickMode', m) } catch { /* ignore */ } }
  const [view, setView] = useState<BodyView>('f')
  const [region, setRegion] = useState<RegionId | null>(s.region)
  const [side, setSide] = useState<'D' | 'G' | null>(s.side)
  // étape interne : 'body' (toucher) → 'list' (choisir) → 'confirm'
  const [stage, setStage] = useState<'body' | 'list' | 'confirm'>(s.pathologyId && !s.diagMode ? 'confirm' : 'body')
  const bodyBox = useRef<HTMLDivElement>(null)
  const bodyH = useBodyHeight(bodyBox)
  const patho = pathologyById(s.pathologyId)

  const choose = (id: string, extra: Partial<Session> = {}) => {
    const p = pathologyById(id)!
    const sd = REGION_SIDED[p.region] ? (extra.side ?? side ?? s.side ?? 'D') : null
    update((x) => ({
      pathologyId: id, region: p.region, side: sd, redFlagsCleared: false,
      program: x.pathologyId === id && x.program.length ? x.program : suggestProgram({ region: p.region, pathologyId: id, phase: extra.phase ?? x.phase, equipment: x.equipment, minutesPerDay: x.minutesPerDay }),
      presentation: { ...x.presentation, sick: true }, ai: x.pathologyId === id ? x.ai : null,
      ...extra,
    }))
    setRegion(p.region); setSide(sd); setStage('confirm')
  }
  const pickSpot = (r: RegionId, sd: 'D' | 'G' | null) => { setRegion(r); setSide(sd); setStage('list') }

  // ------------------------------------------------ mode rapide
  const [text, setText] = useState(s.prompt ?? '')
  const [res, setRes] = useState<Interpretation | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const rec = useRef<SR | null>(null)
  const [aiOk, setAiOk] = useState(false)
  useEffect(() => { getSample().then((x) => setAiOk(!!x)) }, [])
  useEffect(() => {
    if (mode !== 'rapide') return
    const t = setTimeout(() => setRes(text.trim().length > 3 ? interpretLocal(text) : null), 350)
    return () => clearTimeout(t)
  }, [text, mode])
  const suggestions = useMemo(() => {
    if (!res) return []
    const ids = [res.pathologyId, ...res.candidates].filter((x): x is string => !!x)
    return Array.from(new Set(ids)).slice(0, 3).map((id) => pathologyById(id)!).filter(Boolean)
  }, [res])
  const fromText = (id: string) => {
    const r = res
    update({ prompt: text })
    choose(id, r ? { side: r.side ?? undefined, phase: r.phase ?? s.phase, eva: r.eva ?? s.eva, goals: r.goals.length ? r.goals : s.goals, equipment: r.equipment.length ? r.equipment : s.equipment, minutesPerDay: r.minutesPerDay ?? s.minutesPerDay } as Partial<Session> : {})
  }
  const askClaude = async () => {
    setAiBusy(true)
    const out = await analyzeWithClaude(text)
    setAiBusy(false)
    if (out.ok) {
      setRes(out.interp)
      if (out.interp.pathologyId) {
        update({ ai: out.ai })
      }
    }
  }
  const dictate = () => {
    const C = speechCtor()
    if (!C) return
    if (listening) { rec.current?.stop(); return }
    const r = new C(); r.lang = 'fr-FR'; r.interimResults = true; r.continuous = true
    const base = text ? text + ' ' : ''
    r.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setText(base + t) }
    r.onend = () => setListening(false); r.onerror = () => setListening(false)
    rec.current = r; r.start(); setListening(true)
  }

  const list = region ? PATHOLOGIES.filter((p) => p.region === region) : []
  const sideWord = (sd: 'D' | 'G' | null, r: RegionId) => (!REGION_SIDED[r] || !sd ? '' : ['epaule', 'coude', 'poignet', 'genou', 'cheville'].includes(r) ? (sd === 'D' ? ' droit' : ' gauche') : (sd === 'D' ? ' droite' : ' gauche'))
  const regionTitle = region ? `${REGION_WORD[region]}${sideWord(side, region)}` : ''

  // ------------------------------------------------ morceaux
  const body = (
    <div className="pk-body">
      <div className="pk-seg" role="radiogroup" aria-label="Vue du corps">
        <button aria-pressed={view === 'f'} onClick={() => setView('f')}>De face</button>
        <button aria-pressed={view === 'b'} onClick={() => setView('b')}>De dos</button>
      </div>
      <div className="pk-figure" ref={bodyBox}>
        <span className="pk-side">{view === 'f' ? 'D' : 'G'}</span>
        <BodyMap view={view} height={bodyH} selected={{ region, side }} onPick={pickSpot} labels={REGION_WORD} />
        <span className="pk-side">{view === 'f' ? 'G' : 'D'}</span>
      </div>
      <button className="pk-link" onClick={() => setMode('rapide')}><Icon name="mic" size={18} />Écrire ou dicter à la place</button>
    </div>
  )

  const listPanel = region && (
    <div className="pk-list">
      <div className="pk-list-head">
        {!wide && <button className="icon-btn" aria-label="Revenir au corps" onClick={() => setStage('body')}><Icon name="back" /></button>}
        <h2>{regionTitle}</h2><span className="muted small">{list.length} pathologie{list.length > 1 ? 's' : ''}</span>
      </div>
      <div className="pk-items">
        {list.map((p) => (
          <button key={p.id} className={'pk-item' + (p.id === s.pathologyId ? ' on' : '')} onClick={() => choose(p.id)}>
            <span className="stack" style={{ gap: 1 }}><strong>{lay(p.id, p.label)}</strong><span className="small muted">{p.label}</span></span>
            <Icon name="next" size={18} />
          </button>
        ))}
      </div>
    </div>
  )

  const rapide = (
    <div className="pk-rapide">
      <h1>Décrivez la situation</h1>
      <div className={'pk-input' + (listening ? ' rec' : '')}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex. : épaule droite qui fait mal en levant le bras depuis 2 mois, nageuse" rows={3} aria-label="Description de la situation" />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          {text && <button className="btn ghost" onClick={() => { setText(''); setRes(null) }}>Effacer</button>}
          {speechCtor() && <button className="mic-big" onClick={dictate} aria-label={listening ? 'Arrêter la dictée' : 'Dicter'}><Icon name={listening ? 'pause' : 'mic'} size={26} /></button>}
        </div>
      </div>
      {suggestions.length > 0 && <>
        <span className="pk-eyebrow">C'est plutôt…</span>
        <div className="pk-items">
          {suggestions.map((p, i) => (
            <button key={p.id} className={'pk-item' + (i === 0 ? ' best' : '')} onClick={() => fromText(p.id)}>
              <span className="stack" style={{ gap: 1 }}><strong>{lay(p.id, p.label)}</strong><span className="small muted">{p.label} · {regionLabel(p.region)}{res?.side && REGION_SIDED[p.region] ? (res.side === 'D' ? ' · droite' : ' · gauche') : ''}{i === 0 && res?.pathologyId ? ' · la plus probable' : ''}</span></span>
              <Icon name="next" size={18} />
            </button>
          ))}
        </div>
      </>}
      {res && !suggestions.length && <p className="muted">Je ne reconnais pas encore la pathologie. Ajoutez un mot (la région, le geste qui fait mal) ou choisissez sur le corps.</p>}
      {aiOk && text.trim().length > 10 && <button className="btn" disabled={aiBusy} onClick={askClaude}>{aiBusy ? 'Claude analyse…' : 'Affiner avec Claude'}</button>}
      <div className="grow" />
      <button className="pk-link" onClick={() => setMode('guide')}>Choisir sur le corps à la place</button>
    </div>
  )

  const confirm = patho && (
    <div className="pk-confirm">
      <div className="pk-card">
        <div className="pk-thumb"><BodyMap view={patho.region === 'lombaire' ? 'b' : 'f'} height={wide ? 300 : 240} selected={{ region: patho.region, side: s.side }} only /></div>
        <div className="stack" style={{ gap: 2, padding: '12px 16px' }}>
          <span className="pk-eyebrow" style={{ margin: 0 }}>{REGION_WORD[patho.region]}</span>
          <strong style={{ fontSize: 21 }}>{lay(patho.id, patho.label)}</strong>
          <span className="muted">{patho.label}</span>
        </div>
      </div>
      {REGION_SIDED[patho.region] && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="pk-eyebrow">Côté</span>
          <div className="pk-big-seg" role="radiogroup" aria-label="Côté atteint">
            <button role="radio" aria-checked={s.side !== 'G'} onClick={() => { update({ side: 'D' }); setSide('D') }}>Droit</button>
            <button role="radio" aria-checked={s.side === 'G'} onClick={() => { update({ side: 'G' }); setSide('G') }}>Gauche</button>
          </div>
        </div>
      )}
      <div className="stack" style={{ gap: 6 }}>
        <span className="pk-eyebrow">Affiner (facultatif)</span>
        <div className="pk-chips">
          {PHASES.map(([ph, l]) => <button key={ph} aria-pressed={s.phase === ph} onClick={() => update((x) => ({ phase: x.phase === ph ? null : ph, program: suggestProgram({ region: x.region, pathologyId: x.pathologyId, phase: x.phase === ph ? null : ph, equipment: x.equipment, minutesPerDay: x.minutesPerDay }) }))}>{l}</button>)}
          <button onClick={() => { setRegion(patho.region); setStage('list') }}>Autre pathologie</button>
        </div>
      </div>
      {patho.redFlags.length > 0 && (
        <details className={'pk-flags' + (s.redFlagsCleared ? ' ok' : '')}>
          <summary><Icon name={s.redFlagsCleared ? 'check' : 'alert'} size={18} />{s.redFlagsCleared ? 'Drapeaux rouges écartés' : `À écarter avant de commencer (${patho.redFlags.length})`}</summary>
          <ul>{patho.redFlags.map((f) => <li key={f}>{f}</li>)}</ul>
          <button className="btn" onClick={() => update({ redFlagsCleared: !s.redFlagsCleared })}>{s.redFlagsCleared ? 'Revoir' : 'Tout écarté'}</button>
        </details>
      )}
      <div className="grow" />
      <button className="btn primary pk-primary" onClick={() => go('presentation')}><Icon name="screen" />Montrer au patient<Icon name="next" /></button>
    </div>
  )

  // bandeau quand on change la pathologie depuis le dossier
  const banner = s.diagMode && (
    <div className={'pk-diag' + (s.diagMode.kind === 'reeval' ? ' reeval' : '')}>
      <Icon name={s.diagMode.kind === 'reeval' ? 'refresh' : 'pen'} size={18} />
      <span className="grow">{s.diagMode.kind === 'reeval' ? <>Réévaluation : <b>{patho?.label}</b> restera dans l'historique.</> : <>Correction : <b>{patho?.label}</b> sera remplacée.</>}</span>
      <button className="btn ghost" style={{ minHeight: 36 }} onClick={() => update({ diagMode: undefined, screen: 'overview' })}>Annuler</button>
    </div>
  )

  // ------------------------------------------------ mise en page
  if (wide) {
    return (
      <div className="pk wide">
        <div className="pk-left">{banner}{mode === 'guide' ? body : rapide}</div>
        <div className="pk-right">
          {stage === 'confirm' && patho ? confirm
            : region && mode === 'guide' ? listPanel
            : <div className="pk-empty">{mode === 'guide' ? <><h1>Où a-t-il mal ?</h1><p className="muted">Touchez la zone douloureuse sur le corps. Le côté touché règle droite ou gauche.</p></> : <><h2>Proposition</h2><p className="muted">Choisissez la pathologie dans les propositions à gauche.</p></>}</div>}
        </div>
      </div>
    )
  }
  return (
    <div className="pk narrow">
      {banner}
      {stage === 'confirm' && patho ? confirm
        : mode === 'rapide' ? rapide
        : <>
          {stage === 'body' && <div className="pk-title"><h1>Où a-t-il mal ?</h1><p className="muted">Touchez la zone douloureuse.</p></div>}
          {body}
          {stage === 'list' && <div className="pk-sheet" role="dialog" aria-label={regionTitle}><span className="pk-grab" />{listPanel}</div>}
        </>}
    </div>
  )
}
