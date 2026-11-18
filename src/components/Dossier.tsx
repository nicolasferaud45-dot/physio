// Dossier praticien (privé) : schéma du corps à dessiner, captures, notes dictées, export PDF daté.
import { useEffect, useRef, useState } from 'react'
import front from '../assets/body-front.png'
import back from '../assets/body-back.png'
import { exerciseById, pathologyById, PHASE_LABEL } from '../data/catalog'
import { formatDose } from '../engine/plan'
import { Icon } from './Icon'
import type { Session } from '../state/session'

interface Props { s: Session; update: (p: Partial<Session> | ((s: Session) => Partial<Session>)) => void; onClose: () => void }
type Pen = { id: string; label: string; color: string; dash?: number[]; width: number }
const PENS: Pen[] = [
  { id: 'douleur', label: 'Douleur', color: '#C2412D', width: 7 },
  { id: 'irradiation', label: 'Irradiation', color: '#2F6FA3', width: 4, dash: [10, 8] },
  { id: 'raideur', label: 'Raideur', color: '#D9A21B', width: 6 },
  { id: 'fourmis', label: 'Fourmillements', color: '#7B4FB8', width: 3, dash: [2, 7] },
]
const RATIO = { f: 480 / 1115, b: 450 / 1115 }

interface SR { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
const speechCtor = () => { const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }; return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null }

function Sketch({ view, img, data, pen, eraser, onSave, height, undoRef }: {
  view: 'f' | 'b'; img: string; data?: string; pen: Pen; eraser: boolean; onSave: (d: string) => void; height: number
  undoRef: React.MutableRefObject<Record<string, () => void>>
}) {
  const cv = useRef<HTMLCanvasElement>(null)
  const hist = useRef<ImageData[]>([])
  const W = Math.round(height * RATIO[view]), H = height
  const scale = 2
  useEffect(() => {
    const c = cv.current; if (!c) return
    const g = c.getContext('2d')!
    g.clearRect(0, 0, c.width, c.height)
    if (data) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0, c.width, c.height); im.src = data }
  }, [data === undefined, H]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    undoRef.current[view] = () => {
      const c = cv.current, last = hist.current.pop(); if (!c || !last) return
      c.getContext('2d')!.putImageData(last, 0, 0); onSave(c.toDataURL('image/png'))
    }
  })
  const last = useRef<{ x: number; y: number } | null>(null)
  const pos = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) * scale, y: (e.clientY - r.top) * scale } }
  const down = (e: React.PointerEvent) => {
    const c = cv.current!; c.setPointerCapture(e.pointerId)
    hist.current.push(c.getContext('2d')!.getImageData(0, 0, c.width, c.height)); if (hist.current.length > 20) hist.current.shift()
    last.current = pos(e)
  }
  const move = (e: React.PointerEvent) => {
    if (!last.current) return
    const g = cv.current!.getContext('2d')!, p = pos(e)
    g.globalCompositeOperation = eraser ? 'destination-out' : 'source-over'
    g.strokeStyle = pen.color; g.lineWidth = (eraser ? 26 : pen.width) * scale / 2; g.lineCap = 'round'; g.lineJoin = 'round'
    g.setLineDash(eraser ? [] : (pen.dash ?? []).map((d) => d * scale / 2))
    g.globalAlpha = eraser ? 1 : 0.85
    g.beginPath(); g.moveTo(last.current.x, last.current.y); g.lineTo(p.x, p.y); g.stroke()
    last.current = p
  }
  const up = () => { if (!last.current) return; last.current = null; onSave(cv.current!.toDataURL('image/png')) }
  return (
    <div className="sketch" style={{ width: W, height: H }}>
      <img src={img} alt={view === 'f' ? 'Schéma de face' : 'Schéma de dos'} draggable={false} />
      <canvas ref={cv} width={W * scale} height={H * scale} style={{ width: W, height: H }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Zone de dessin" />
    </div>
  )
}

async function composite(img: string, overlay: string | undefined, w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h)
  const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
  g.globalAlpha = 0.9; g.drawImage(await load(img), 0, 0, w, h); g.globalAlpha = 1
  if (overlay) g.drawImage(await load(overlay), 0, 0, w, h)
  return c.toDataURL('image/jpeg', 0.88)
}
const clean = (t: string) => t.replace(/[’‘]/g, "'").replace(/[«»“”]/g, '"').replace(/[≈→↑↓•·–—]/g, (m) => ({ '≈': '~', '→': '->', '↑': '^', '↓': 'v', '•': '-', '·': '-', '–': '-', '—': '-' } as Record<string, string>)[m])

export function Dossier({ s, update, onClose }: Props) {
  const [tab, setTab] = useState<'schema' | 'captures' | 'notes'>('schema')
  const [pen, setPen] = useState<Pen>(PENS[0])
  const [eraser, setEraser] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const rec = useRef<SR | null>(null)
  const undo = useRef<Record<string, () => void>>({})
  const [active, setActive] = useState<'f' | 'b'>('f')
  const box = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(420)
  useEffect(() => {
    const el = box.current; if (!el) return
    const ro = new ResizeObserver(() => { const byW = (el.clientWidth - 24) / (RATIO.f + RATIO.b); setH(Math.max(260, Math.min(el.clientHeight - 16, byW, 760))) })
    ro.observe(el); return () => ro.disconnect()
  }, [tab])
  const d = s.dossier ?? { notes: '' }
  const save = (patch: Partial<NonNullable<Session['dossier']>>) => update((x) => ({ dossier: { notes: '', ...(x.dossier ?? {}), ...patch, savedAt: Date.now() } }))
  const patho = pathologyById(s.pathologyId)

  const dictate = () => {
    const C = speechCtor(); if (!C) return
    if (listening) { rec.current?.stop(); return }
    const r = new C(); r.lang = 'fr-FR'; r.interimResults = true; r.continuous = true
    const base = d.notes ? d.notes + '\n' : ''
    r.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; save({ notes: base + t }) }
    r.onend = () => setListening(false); r.onerror = () => setListening(false)
    rec.current = r; r.start(); setListening(true)
  }

  const pdf = async () => {
    setMsg('Création du PDF…')
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const date = new Date()
      const dstr = date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
      let y = 18
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(clean(`Dossier de séance - ${s.patientLabel}`), 15, y)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90); doc.text(clean(`${dstr} - ${date.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`), 195, y, { align: 'right' })
      doc.setTextColor(20); y += 9
      doc.setFontSize(11)
      const lines = [
        patho ? `Pathologie : ${patho.label}${s.side ? ` (${s.side === 'D' ? 'droite' : 'gauche'})` : ''}` : 'Pathologie : non précisée',
        `Phase : ${s.phase ? PHASE_LABEL[s.phase] : 'non précisée'}   -   Douleur (EVA) : ${s.eva}/10`,
        patho ? `Drapeaux rouges : ${s.redFlagsCleared ? 'écartés' : 'non vérifiés'}` : '',
      ].filter(Boolean)
      for (const l of lines) { doc.text(clean(l), 15, y); y += 6 }
      // schéma
      y += 2
      doc.setFont('helvetica', 'bold'); doc.text('Schéma corporel', 15, y); doc.setFont('helvetica', 'normal'); y += 3
      const hh = 95, wf = hh * RATIO.f, wb = hh * RATIO.b
      doc.addImage(await composite(front, d.front, 480, 1115), 'JPEG', 25, y, wf, hh)
      doc.addImage(await composite(back, d.back, 450, 1115), 'JPEG', 25 + wf + 20, y, wb, hh)
      doc.setFontSize(8); doc.setTextColor(90); doc.text('Face', 25 + wf / 2, y + hh + 4, { align: 'center' }); doc.text('Dos', 25 + wf + 20 + wb / 2, y + hh + 4, { align: 'center' })
      let ly = y + 6
      for (const p of PENS) { doc.setFillColor(p.color); doc.circle(140, ly - 1.2, 1.6, 'F'); doc.setTextColor(40); doc.setFontSize(9); doc.text(p.label, 144, ly); ly += 6 }
      doc.setTextColor(20); y += hh + 10
      // notes
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Notes', 15, y); doc.setFont('helvetica', 'normal'); y += 6
      const notes = doc.splitTextToSize(clean(d.notes || '-'), 180)
      for (const l of notes) { if (y > 280) { doc.addPage(); y = 18 } doc.text(l, 15, y); y += 5.5 }
      // programme
      if (s.program.length) {
        y += 4; if (y > 260) { doc.addPage(); y = 18 }
        doc.setFont('helvetica', 'bold'); doc.text('Programme remis', 15, y); doc.setFont('helvetica', 'normal'); y += 6
        for (const p of s.program) { const e = exerciseById(p.exerciseId); if (!e) continue; if (y > 280) { doc.addPage(); y = 18 } doc.text(clean(`- ${e.name} : ${formatDose(p)}, ${p.freq}`), 15, y); y += 5.5 }
      }
      // captures
      for (const c of s.captures) {
        doc.addPage(); doc.setFont('helvetica', 'bold'); doc.text('Capture annotée', 15, 18); doc.setFont('helvetica', 'normal')
        const im = new Image(); await new Promise((r) => { im.onload = r; im.src = c })
        const w = 180, hgt = Math.min(250, (w * im.height) / im.width)
        doc.addImage(c, 'PNG', 15, 24, (hgt * im.width) / im.height, hgt)
      }
      const name = `dossier-${s.patientLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${date.toISOString().slice(0, 10)}.pdf`
      doc.save(name)
      setMsg('PDF téléchargé.')
    } catch {
      setMsg('Le téléchargement est bloqué dans cet aperçu. Utilisez la version en ligne (GitHub) pour exporter.')
    }
    setTimeout(() => setMsg(null), 4000)
  }

  return (
    <div className="dossier" role="dialog" aria-label="Dossier praticien">
      <header className="dossier-top">
        <button className="icon-btn" aria-label="Fermer le dossier" onClick={onClose}><Icon name="x" /></button>
        <div className="stack grow" style={{ gap: 0 }}><strong>Dossier · {s.patientLabel}</strong><span className="small muted row" style={{ gap: 4 }}><Icon name="lock" size={12} />Privé · jamais montré au patient</span></div>
      </header>
      <div className="dossier-tabs" role="tablist">
        {([['schema', 'Schéma'], ['captures', `Captures${s.captures.length ? ` (${s.captures.length})` : ''}`], ['notes', 'Notes']] as const).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>
      <div className="dossier-body" ref={box}>
        {tab === 'schema' && (
          <div className="dossier-sketches">
            <div onPointerDown={() => setActive('f')}><Sketch view="f" img={front} data={d.front} pen={pen} eraser={eraser} height={h} undoRef={undo} onSave={(x) => save({ front: x })} /><span className="small muted">Face</span></div>
            <div onPointerDown={() => setActive('b')}><Sketch view="b" img={back} data={d.back} pen={pen} eraser={eraser} height={h} undoRef={undo} onSave={(x) => save({ back: x })} /><span className="small muted">Dos</span></div>
          </div>
        )}
        {tab === 'captures' && (
          s.captures.length ? <div className="dossier-caps">{s.captures.map((c, i) => (
            <div key={i} className="cap"><img src={c} alt={`Capture ${i + 1}`} /><button className="icon-btn" aria-label="Supprimer la capture" onClick={() => update((x) => ({ captures: x.captures.filter((_, j) => j !== i) }))}><Icon name="x" size={16} /></button></div>
          ))}</div>
            : <p className="muted" style={{ padding: 16 }}>Aucune capture. Dans « Montrer au patient », menu Annoter → Capturer : la vue 3D annotée arrive ici.</p>
        )}
        {tab === 'notes' && (
          <div className="dossier-notes">
            <textarea value={d.notes} onChange={(e) => save({ notes: e.target.value })} placeholder="Observations, tests, réponse au traitement…" aria-label="Notes" />
          </div>
        )}
      </div>
      {tab === 'schema' && (
        <div className="dossier-tools" role="toolbar" aria-label="Outils de dessin">
          {PENS.map((p) => (
            <button key={p.id} className={'pen' + (!eraser && pen.id === p.id ? ' on' : '')} onClick={() => { setPen(p); setEraser(false) }} aria-label={p.label} aria-pressed={!eraser && pen.id === p.id}>
              <i style={{ background: p.color }} /><span>{p.label}</span>
            </button>
          ))}
          <button className={'pen' + (eraser ? ' on' : '')} onClick={() => setEraser(!eraser)} aria-pressed={eraser} aria-label="Gomme"><Icon name="eraser" size={18} /><span>Gomme</span></button>
          <button className="pen" onClick={() => undo.current[active]?.()} aria-label="Annuler le dernier trait"><Icon name="refresh" size={18} /><span>Annuler</span></button>
        </div>
      )}
      {tab === 'notes' && speechCtor() && (
        <div className="dossier-tools"><button className={'btn' + (listening ? ' danger' : '')} onClick={dictate}><Icon name="mic" />{listening ? 'Arrêter la dictée' : 'Dicter une note'}</button></div>
      )}
      <div className="dossier-foot">
        {msg && <span className="small muted grow">{msg}</span>}
        <button className="btn primary pk-primary" onClick={pdf}><Icon name="print" />Exporter en PDF</button>
      </div>
    </div>
  )
}
