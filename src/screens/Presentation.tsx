import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { PATHOLOGIES, pathologyById, regionLabel, type Pathology } from '../data/catalog'
import { HoldButton } from '../components/HoldButton'
import { Icon } from '../components/Icon'
import { CheckRow, Popover } from '../components/Popover'
import type { PresentView, Session } from '../state/session'
import ExerciseViewer from './ExerciseViewer'

const Shoulder3D = lazy(() => import('../three/Shoulder3D'))
const AnatomyViewer = lazy(() => import('../anatomy/AnatomyViewer'))
import { jointForRegion } from '../anatomy/registry'
import type { Layers, ViewMode } from '../anatomy/AnatomyViewer'
import { AngleTrack } from '../components/AngleTrack'

const LAYER_PRESETS: { id: string; label: string; mode: ViewMode; layers: Layers }[] = [
  { id: 'deep', label: 'Articulation', mode: 'complete', layers: { skin: 0, muscles: 0.08, ligaments: 1, bones: 1 } },
  { id: 'complete', label: 'Vue complète', mode: 'complete', layers: { skin: 0.15, muscles: 1, ligaments: 1, bones: 1 } },
  { id: 'xray', label: 'Rayons X', mode: 'xray', layers: { skin: 0.08, muscles: 0.12, ligaments: 0.6, bones: 1 } },
  { id: 'exploded', label: 'Vue éclatée', mode: 'exploded', layers: { skin: 0, muscles: 1, ligaments: 1, bones: 1 } },
]

interface Props {
  s: Session
  update: (p: Partial<Session> | ((s: Session) => Partial<Session>)) => void
  onExit?: () => void
  /** vue patient (passeport) : pas d'annotation ni de capture */
  readOnly?: boolean
}

type Pen = 'red' | 'green' | null
const LAYERS = [
  { key: 'bones', label: 'Os', hint: 'Omoplate, clavicule, humérus' },
  { key: 'joint', label: 'Articulation', hint: 'Capsule et bourse' },
  { key: 'muscles', label: 'Muscles et tendons', hint: 'Coiffe des rotateurs, deltoïde' },
  { key: 'nerves', label: 'Nerfs', hint: 'Nerfs de l\'épaule' },
] as const

/** Texte « normal » et « pathologique » d'une pathologie */
function texts(p: Pathology, simple: boolean) {
  return { normal: p.healthy[simple ? 'simple' : 'tech'], patho: p.sick[simple ? 'simple' : 'tech'] }
}

export default function Presentation({ s, update, onExit, readOnly }: Props) {
  const patho = pathologyById(s.pathologyId) ?? PATHOLOGIES[0]
  const pres = s.presentation
  const view: PresentView = pres.view ?? 'compare'
  const panelOpen = pres.panel ?? true
  const simple = pres.vulgar
  const t = texts(patho, simple)
  const sickMax = patho.sickRom ?? 160
  const healthyMax = 170

  const [playing, setPlaying] = useState(false)
  const [target, setTarget] = useState(0)
  const [angles, setAngles] = useState<{ normal: number; patho: number }>({ normal: 0, patho: 0 })
  const [pen, setPen] = useState<Pen>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showEx, setShowEx] = useState(false)
  // --- articulation anatomique réelle (genou, …)
  const J = jointForRegion(patho.region)
  const jv = J?.pathologies[patho.id] ?? null
  const dof = J?.dofs[0]
  const [preset, setPreset] = useState(jv?.view === 'complete' ? 'complete' : 'deep')
  const [jl, setJl] = useState<{ layers: Layers; mode: ViewMode }>(() => { const p = LAYER_PRESETS.find((x) => x.id === (jv?.view === 'complete' ? 'complete' : 'deep'))!; return { layers: p.layers, mode: p.mode } })
  const [labelsOn, setLabelsOn] = useState(true)
  const [slowZone, setSlowZone] = useState(true)
  const [stopZone, setStopZone] = useState(false)
  const [jAngle, setJAngle] = useState(0)
  const [jPatient, setJPatient] = useState(0)
  const angleRef = useRef(0)
  const loop = useRef({ t: 0, inZone: false })
  const pain = jv?.painZone ?? null
  useEffect(() => {
    if (!J || !dof || !playing) return
    let raf = 0, last = performance.now(), lastUi = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const a = angleRef.current
      const z = !!pain && a >= pain[0] && a <= pain[1]
      if (z && !loop.current.inZone && stopZone) { loop.current.inZone = true; setPlaying(false); setJAngle(Math.round(a)); return }
      loop.current.inZone = z
      loop.current.t += dt / 6 * (z && slowZone ? 0.35 : 1)
      const u = (1 - Math.cos(loop.current.t * Math.PI * 2)) / 2
      angleRef.current = dof.min + (dof.max - dof.min) * u
      if (now - lastUi > 90) { lastUi = now; setJAngle(Math.round(angleRef.current)) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [J, dof, playing, pain, slowZone, stopZone])
  const canvases = useRef<{ normal?: HTMLCanvasElement; patho?: HTMLCanvasElement }>({})
  const draw = useRef<HTMLCanvasElement>(null)
  const panes = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)

  const setPres = (patch: Partial<Session['presentation']>) => update((x) => ({ presentation: { ...x.presentation, ...patch } }))
  const setView = (v: PresentView) => setPres({ view: v, sick: v !== 'normal' })

  // Toile d'annotation à la taille de la zone 3D
  useEffect(() => {
    const c = draw.current
    if (!c) return
    const fit = () => {
      const d = window.devicePixelRatio || 1
      const r = c.getBoundingClientRect()
      const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d))
      if (c.width === w && c.height === h) return
      c.width = w; c.height = h
      c.getContext('2d')!.setTransform(d, 0, 0, d, 0, 0)
    }
    fit()
    const ro = new ResizeObserver(fit); ro.observe(c)
    return () => ro.disconnect()
  }, [showEx])
  useEffect(() => { clearDrawing() }, [s.pathologyId, view])

  function clearDrawing() {
    const c = draw.current
    if (c) { const g = c.getContext('2d')!; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.restore() }
  }

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>, phase: 'down' | 'move' | 'up') => {
    if (!pen) return
    const g = draw.current!.getContext('2d')!
    const x = e.nativeEvent.offsetX, y = e.nativeEvent.offsetY
    if (phase === 'down') {
      drawing.current = true
      ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
      g.strokeStyle = pen === 'red' ? '#C2412D' : '#2E7D5B'
      g.lineWidth = e.pointerType === 'pen' ? 4 + 4 * (e.pressure || 0.5) : 6
      g.lineCap = 'round'; g.lineJoin = 'round'
      g.beginPath(); g.moveTo(x, y)
    } else if (phase === 'move' && drawing.current) { g.lineTo(x, y); g.stroke() } else if (phase === 'up') drawing.current = false
  }

  /** Capture : les vues 3D visibles + les annotations, telles qu'à l'écran */
  const capture = () => {
    const box = panes.current, an = draw.current
    if (!box || !an) return
    const r = box.getBoundingClientRect()
    const scale = 900 / r.width
    const out = document.createElement('canvas')
    out.width = 900; out.height = Math.round(r.height * scale)
    const g = out.getContext('2d')!
    g.fillStyle = '#F3F6F8'; g.fillRect(0, 0, out.width, out.height)
    for (const [k, c] of Object.entries(canvases.current)) {
      if (!c || !c.isConnected) continue
      const cr = c.getBoundingClientRect()
      const x = (cr.left - r.left) * scale, y = (cr.top - r.top) * scale, w = cr.width * scale, h = cr.height * scale
      g.fillStyle = k === 'normal' ? '#EEF6F1' : '#FBF0EC'; g.fillRect(x, y, w, h)
      g.drawImage(c, x, y, w, h)
      g.fillStyle = k === 'normal' ? '#2E7D5B' : '#C2412D'; g.fillRect(x, y, w, 8)
      g.font = '600 22px Inter, sans-serif'
      g.fillText(k === 'normal' ? 'Normal' : patho.label, x + 14, y + 38)
    }
    g.drawImage(an, 0, 0, out.width, out.height)
    update((x) => ({ captures: [...x.captures, out.toDataURL('image/jpeg', 0.82)].slice(-4) }))
    setToast('Capture ajoutée au passeport'); setTimeout(() => setToast(null), 1800)
  }

  if (showEx && s.program.length) {
    return <ExerciseViewer ids={s.program.map((p) => p.exerciseId)} program={s.program} pathologyId={s.pathologyId} onClose={() => setShowEx(false)} patient />
  }

  const blocked = angles.patho >= sickMax - 3 && patho.visual === 'capsulite'
  const inArc = patho.visual === 'conflit' && angles.patho >= 60 && angles.patho <= 120
  const regionWord = J ? J.label.toLowerCase() : 'épaule'
  const yours = readOnly ? `Mon ${regionWord}`.replace('Mon épaule', 'Mon épaule') : `Votre ${regionWord}`
  const jInPain = !!pain && jPatient >= pain[0] && jPatient <= pain[1]
  const jBlocked = !!jv?.rom && jAngle > jv.rom[1] + 2
  const jStatus = jBlocked ? (simple ? ' · ne va pas plus loin' : ' · limitation') : jInPain ? (simple ? ' · ça fait mal' : ' · zone douloureuse') : ''

  const pane = (kind: 'normal' | 'patho') => {
    const isNormal = kind === 'normal'
    const angle = isNormal ? angles.normal : angles.patho
    const status = isNormal ? null : blocked ? (simple ? ' · bloquée' : ' · limitation') : inArc ? (simple ? ' · ça pince' : ' · arc douloureux') : null
    return (
      <div className={`pane ${kind}`} key={kind}>
        <div className={`pane-tag ${isNormal ? 'ok' : 'bad'}`}>
          <i aria-hidden="true" />
          <span>{isNormal ? 'Normal' : patho.label}</span>
          <span className="pane-sub">{isNormal ? (J ? `${J.label} sain` : patho.region === 'epaule' ? 'Épaule saine' : 'Fonctionnement normal') : yours}</span>
          {J && jv ? <span className="pane-angle">{isNormal ? jAngle : jPatient}°{isNormal ? '' : jStatus}</span> : patho.visual && <span className="pane-angle">{angle}°{status}</span>}
        </div>
        {J && jv ? (
          <Suspense fallback={<div className="pane-loading muted">Chargement du modèle 3D…</div>}>
            <AnatomyViewer joint={J} pathology={isNormal ? null : patho.id} layers={jl.layers} mode={jl.mode} labels={labelsOn} indicators
              side={s.side ?? 'D'} simple={simple} playing={false} angle={0} angleRef={angleRef} compact={view === 'compare'} tone={isNormal ? 'ok' : 'bad'}
              onAngle={isNormal ? undefined : setJPatient} onCanvas={(c) => { canvases.current[kind] = c }} />
          </Suspense>
        ) : patho.visual ? (
          <Suspense fallback={<div className="pane-loading muted">Chargement du modèle 3D…</div>}>
            <Shoulder3D
              visual={patho.visual} sick={!isNormal} layers={pres.layers} targetAngle={target} playing={playing}
              maxAngle={isNormal ? healthyMax : sickMax} vulgar={simple} controlsEnabled={!pen} compact={view === 'compare'}
              onAngle={(a) => setAngles((x) => (x[kind] === a ? x : { ...x, [kind]: a }))}
              onCanvas={(c) => { canvases.current[kind] = c }}
            />
          </Suspense>
        ) : (
          <div className="pane-text">
            <span className={`pane-icon ${isNormal ? 'ok' : 'bad'}`} aria-hidden="true"><Icon name={isNormal ? 'check' : 'alert'} size={28} /></span>
            <h2>{isNormal ? t.normal.title : t.patho.title}</h2>
            <p>{isNormal ? t.normal.body : t.patho.body}</p>
            <span className="small muted">Visuel 3D de cette région prévu dans une prochaine version.</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pv">
      <header className="pv-top">
        {onExit && (readOnly ? <button className="btn round" onClick={onExit}><Icon name="back" />Retour</button> : <HoldButton onDone={onExit} label="Vue praticien" />)}
        <span className="pv-title">{patho.label}{s.side ? ` · ${s.side === 'D' ? 'droite' : 'gauche'}` : ''}</span>
        <div className="viewswitch" role="radiogroup" aria-label="Que montrer ?">
          <button role="radio" aria-checked={view === 'compare'} onClick={() => setView('compare')}><span className="dots"><i className="ok" /><i className="bad" /></span>Comparer</button>
          <button role="radio" aria-checked={view === 'normal'} onClick={() => setView('normal')}><i className="ok" />Normal</button>
          <button role="radio" aria-checked={view === 'patho'} onClick={() => setView('patho')}><i className="bad" />{readOnly ? 'Ma pathologie' : 'Pathologie'}</button>
        </div>
      </header>

      <div className="pv-main">
        <section className="pv-stage" aria-label="Visualisation">
          <div ref={panes} className={`pv-panes ${view === 'compare' ? 'two' : 'one'}`}>
            {(view === 'compare' || view === 'normal') && pane('normal')}
            {(view === 'compare' || view === 'patho') && pane('patho')}
            {!readOnly && (
              <canvas ref={draw} className="draw-layer" style={{ pointerEvents: pen ? 'auto' : 'none', cursor: pen ? 'crosshair' : undefined }}
                onPointerDown={(e) => pointer(e, 'down')} onPointerMove={(e) => pointer(e, 'move')} onPointerUp={(e) => pointer(e, 'up')} onPointerCancel={(e) => pointer(e, 'up')} />
            )}
            {pen && <div className="pen-hint" role="status">{pen === 'red' ? 'Entourez la zone douloureuse' : 'Montrez ce qu\'on va travailler'}<button className="btn round" onClick={() => setPen(null)}>Terminer</button></div>}
          </div>

          <div className="pv-bar" role="toolbar" aria-label="Commandes">
            {J && jv && dof && <>
              <button className="icon-btn play" onClick={() => { loop.current.inZone = true; setPlaying((v) => !v) }} aria-label={playing ? 'Mettre en pause' : 'Animer le mouvement'}>
                <Icon name={playing ? 'pause' : 'play'} size={22} />
              </button>
              <AngleTrack label={dof.label} min={dof.min} max={dof.max} value={jAngle} pain={pain} rom={jv.rom ?? null}
                status={jInPain ? (simple ? 'ça fait mal' : 'zone douloureuse') : null}
                onChange={(v) => { setPlaying(false); angleRef.current = v; setJAngle(v) }} />
              {pain && <div className="pv-chips">
                <button aria-pressed={slowZone} onClick={() => setSlowZone(!slowZone)}>Ralentir dans la zone rouge</button>
                <button aria-pressed={stopZone} onClick={() => setStopZone(!stopZone)}>Arrêter quand ça fait mal</button>
              </div>}
              <Popover label="Calques" icon={<Icon name="grid" size={18} />} width={300}>
                <span className="eyebrow">Vue</span>
                <div className="row wrap" style={{ gap: 6 }}>{LAYER_PRESETS.map((p) => <button key={p.id} className="chip" aria-pressed={preset === p.id} style={preset === p.id ? { background: 'var(--blue)', color: '#fff' } : undefined} onClick={() => { setPreset(p.id); setJl({ layers: p.layers, mode: p.mode }) }}>{p.label}</button>)}</div>
                <span className="eyebrow">Opacité</span>
                {([['skin', 'Peau'], ['muscles', 'Muscles et tendons'], ['ligaments', 'Ligaments et cartilage'], ['bones', 'Os']] as const).map(([k, l]) => (
                  <label key={k} className="layer-slider"><span className="row"><span className="grow">{l}</span><b>{Math.round(jl.layers[k] * 100)} %</b></span>
                    <input type="range" min={0} max={100} value={Math.round(jl.layers[k] * 100)} onChange={(e) => { setPreset(''); setJl({ ...jl, layers: { ...jl.layers, [k]: +e.target.value / 100 } }) }} /></label>
                ))}
                <CheckRow label="Étiquettes" checked={labelsOn} onChange={() => setLabelsOn(!labelsOn)} />
              </Popover>
            </>}
            {!(J && jv) && patho.visual && <>
              <button className="icon-btn play" onClick={() => setPlaying((v) => !v)} aria-label={playing ? 'Mettre en pause' : 'Animer le mouvement'}>
                <Icon name={playing ? 'pause' : 'play'} size={22} />
              </button>
              <label className="arm">
                <span className="small lbl" style={{ fontWeight: 600 }}>{simple ? 'Lever le bras' : 'Abduction'}</span><span className="sr-only">{simple ? 'Lever le bras' : 'Abduction'}</span>
                <input type="range" min={0} max={healthyMax} value={target} onChange={(e) => { setPlaying(false); setTarget(+e.target.value) }} />
              </label>
              <Popover label="Calques" icon={<Icon name="grid" size={18} />}>
                <span className="eyebrow">Afficher</span>
                {LAYERS.map((l) => <CheckRow key={l.key} label={l.label} hint={l.hint} checked={pres.layers[l.key]} onChange={() => setPres({ layers: { ...pres.layers, [l.key]: !pres.layers[l.key] } })} />)}
              </Popover>
            </>}
            {!readOnly && (
              <Popover label="Annoter" icon={<Icon name="pen" size={18} />} active={!!pen} width={300}>
                <span className="eyebrow">Dessiner sur l'image</span>
                <button className="btn" style={{ justifyContent: 'flex-start', borderColor: pen === 'red' ? '#C2412D' : undefined }} onClick={() => setPen(pen === 'red' ? null : 'red')}><i className="swatch" style={{ background: '#C2412D' }} />Zone douloureuse</button>
                <button className="btn" style={{ justifyContent: 'flex-start', borderColor: pen === 'green' ? '#2E7D5B' : undefined }} onClick={() => setPen(pen === 'green' ? null : 'green')}><i className="swatch" style={{ background: '#2E7D5B' }} />Ce qu'on va travailler</button>
                <div className="row">
                  <button className="btn grow" onClick={clearDrawing}><Icon name="eraser" size={18} />Effacer</button>
                  <button className="btn grow" onClick={capture}><Icon name="camera" size={18} />Capturer</button>
                </div>
                <span className="small muted">La capture est ajoutée au passeport du patient.</span>
              </Popover>
            )}
            <span className="grow" />
            <button className="toggle" aria-pressed={panelOpen} onClick={() => setPres({ panel: !panelOpen })} aria-label={panelOpen ? 'Masquer le texte' : 'Afficher le texte'}>
              <Icon name="menu" size={18} /><span className="lbl">{panelOpen ? 'Masquer le texte' : 'Texte'}</span></button>
            {s.program.length > 0 && <button className="btn dark" onClick={() => setShowEx(true)} aria-label={`Exercices (${s.program.length})`}><Icon name="play" size={16} /><span className="lbl">Exercices</span> ({s.program.length})</button>}
          </div>
        </section>

        {panelOpen && (
          <aside className="pv-side" aria-label="Explication">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="stack grow" style={{ gap: 2 }}>
                <span className="eyebrow">{regionLabel(patho.region)}</span>
                <h1 className="pv-title">{patho.label}</h1>
              </div>
              <button className="toggle green" aria-pressed={simple} onClick={() => setPres({ vulgar: !simple })}>Mots simples</button>
            </div>
            {view !== 'patho' && (
              <div className="explain-block ok">
                <span className="explain-label"><i />Normalement</span>
                <strong>{t.normal.title}</strong>
                <p>{t.normal.body}</p>
              </div>
            )}
            {view !== 'normal' && !(J && jv && jInPain) && (
              <div className="explain-block bad">
                <span className="explain-label"><i />{readOnly ? 'Chez moi' : 'Chez vous'}</span>
                <strong>{t.patho.title}</strong>
                <p>{t.patho.body}</p>
              </div>
            )}
            {J && jv && view !== 'normal' && (jInPain ? (
              <div className="moment" aria-live="polite">
                <span className="eyebrow">Au moment où ça fait mal · {jPatient}°</span>
                {jv.suffers && <div className="blk bad"><strong>Ce qui souffre</strong>{jv.suffers.map((x) => <span key={x}><i className="d" style={{ background: '#E5341F' }} />{x}</span>)}</div>}
                {jv.works && <div className="blk work"><strong>Ce qui travaille</strong>{jv.works.map((x) => <span key={x}><i className="d" style={{ background: '#F2B430' }} />{x}</span>)}</div>}
                {jv.todo && <div className="blk ok"><strong>Ce qu'on va faire</strong><span>{jv.todo}</span></div>}
              </div>
            ) : (
              <div className="explain-block bad"><span className="explain-label"><i />Ce que l'on voit</span><p>{simple ? jv.simpleCaption : jv.caption}</p>
                {pain && <span className="small muted">Lancez le mouvement : la zone rouge ({pain[0]}–{pain[1]}°) s'allume quand ça fait mal.</span>}</div>
            ))}
            {J && jv?.rom && dof && (
              <div className="rom">
                <span className="small" style={{ fontWeight: 600 }}>{dof.label}</span>
                <div className="row"><span className="small" style={{ width: 92, color: 'var(--green-ink)', fontWeight: 600 }}>Normal</span><div className="bar"><span style={{ width: '100%', background: '#2E7D5B' }} /></div><span className="small" style={{ width: 40, fontWeight: 700 }}>{dof.max}°</span></div>
                <div className="row"><span className="small" style={{ width: 92, color: 'var(--red-ink)', fontWeight: 600 }}>{yours}</span><div className="bar"><span style={{ width: `${Math.round((jv.rom[1] / dof.max) * 100)}%`, background: '#C2412D' }} /></div><span className="small" style={{ width: 40, fontWeight: 700 }}>{jv.rom[1]}°</span></div>
              </div>
            )}
            {!J && patho.visual && (
              <div className="rom">
                <span className="small" style={{ fontWeight: 600 }}>{simple ? 'Jusqu\'où le bras monte sur le côté' : 'Amplitude d\'abduction'}</span>
                <div className="row"><span className="small" style={{ width: 92, color: 'var(--green-ink)', fontWeight: 600 }}>Normal</span><div className="bar"><span style={{ width: '100%', background: '#2E7D5B' }} /></div><span className="small" style={{ width: 40, fontWeight: 700 }}>180°</span></div>
                <div className="row"><span className="small" style={{ width: 92, color: 'var(--red-ink)', fontWeight: 600 }}>{yours}</span><div className="bar"><span style={{ width: `${Math.round((sickMax / 180) * 100)}%`, background: '#C2412D' }} /></div><span className="small" style={{ width: 40, fontWeight: 700 }}>{sickMax}°</span></div>
                {patho.visual === 'conflit' && <span className="small muted">{simple ? 'Le bras monte, mais ça fait mal entre mi-hauteur et le haut.' : 'Amplitude conservée, arc douloureux entre 60 et 120°.'}</span>}
              </div>
            )}
            <div className="legend"><span><i style={{ background: '#2E7D5B' }} />normal / ce qu'on travaille</span><span><i style={{ background: '#C2412D' }} />pathologie / douleur</span></div>
          </aside>
        )}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
