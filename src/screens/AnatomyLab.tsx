// Démonstrateur du cahier des charges « Visualisation anatomique 3D » : calques, vue éclatée, rayons X,
// animation de flexion, angle manuel, sain / pathologie, étiquettes, droite / gauche.
import { useEffect, useState } from 'react'
import AnatomyViewer, { type Layers, type ViewMode } from '../anatomy/AnatomyViewer'
import { JOINTS } from '../anatomy/registry'
import { pathologyById } from '../data/catalog'
import { Icon } from '../components/Icon'

const PRESETS: { id: string; label: string; mode: ViewMode; layers: Layers }[] = [
  { id: 'complete', label: 'Vue complète', mode: 'complete', layers: { skin: 0.15, muscles: 1, ligaments: 1, bones: 1 } },
  { id: 'deep', label: 'Articulation', mode: 'complete', layers: { skin: 0, muscles: 0.06, ligaments: 1, bones: 1 } },
  { id: 'exploded', label: 'Vue éclatée', mode: 'exploded', layers: { skin: 0, muscles: 1, ligaments: 1, bones: 1 } },
  { id: 'nerves', label: 'Nerfs', mode: 'complete', layers: { skin: 0, muscles: 0.12, ligaments: 0.6, bones: 1, nerves: 1 } },
  { id: 'xray', label: 'Rayons X', mode: 'xray', layers: { skin: 0.08, muscles: 0.12, ligaments: 0.6, bones: 1 } },
]

export default function AnatomyLab({ jointId = 'genou', onClose }: { jointId?: string; onClose?: () => void }) {
  const J = JOINTS[jointId]
  const [preset, setPreset] = useState('complete')
  const [layers, setLayers] = useState<Layers>(PRESETS[0].layers)
  const [mode, setMode] = useState<ViewMode>('complete')
  const [playing, setPlaying] = useState(true)
  const [angle, setAngle] = useState(0)
  const [live, setLive] = useState(0)
  const [patho, setPatho] = useState<string | null>(null)
  const [choice, setChoice] = useState<string>(Object.keys(J.pathologies)[0])
  useEffect(() => { setChoice(Object.keys(J.pathologies)[0]); setPatho(null); setMotionSel(J.dofs[0].id) }, [J])
  const [labels, setLabels] = useState(true)
  const [indicators, setIndicators] = useState(true)
  const [side, setSide] = useState<'D' | 'G'>('D')
  const [simple, setSimple] = useState(false)
  const pv = patho ? J.pathologies[patho] : null
  const [motionSel, setMotionSel] = useState(J.dofs[0].id)
  const motion = pv?.motion ?? motionSel
  const dof = J.dofs.find((d) => d.id === motion) ?? J.dofs[0]

  const applyPreset = (id: string) => { const p = PRESETS.find((x) => x.id === id)!; setPreset(id); setMode(p.mode); setLayers(p.layers) }
  const slider = (k: keyof Layers, label: string, swatch: string) => (
    <label className="lab-row">
      <span className="row" style={{ gap: 8 }}><i className="sw" style={{ background: swatch }} /><span className="grow">{label}</span><b>{Math.round((layers[k] ?? 0) * 100)} %</b></span>
      <input type="range" min={0} max={100} value={Math.round((layers[k] ?? 0) * 100)} onChange={(e) => { setLayers({ ...layers, [k]: +e.target.value / 100 }); setPreset('') }} />
    </label>
  )

  return (
    <div className="lab">
      <header className="lab-top">
        {onClose && <button className="btn round" onClick={onClose}><Icon name="back" />Retour</button>}
        <div className="stack grow" style={{ gap: 0 }}>
          <span className="eyebrow">Visualisation anatomique 3D</span>
          <strong style={{ fontSize: 18 }}>{J.label} {side === 'D' ? 'droit' : 'gauche'}{pv ? ` · ${pathologyById(patho)?.label}` : ' · mouvement sain'}</strong>
        </div>
        <div className="seg side-switch" role="radiogroup" aria-label="Côté">
          <button aria-pressed={side === 'D'} onClick={() => setSide('D')}>Droit</button>
          <button aria-pressed={side === 'G'} onClick={() => setSide('G')}>Gauche</button>
        </div>
      </header>
      <div className="lab-body">
        <aside className="lab-panel" aria-label="Calques">
          <span className="eyebrow">Calques</span>
          {slider('skin', 'Peau', '#E7BFA6')}
          {slider('muscles', 'Muscles et tendons', '#A2423A')}
          {slider('ligaments', 'Ligaments et cartilage', '#C9D8E6')}
          {slider('bones', 'Os', '#E9DDC6')}
          {J.nerves?.length ? slider('nerves', 'Nerfs', '#E8B90F') : null}
          <span className="eyebrow" style={{ marginTop: 8 }}>Raccourcis</span>
          <div className="lab-presets">{PRESETS.map((p) => <button key={p.id} className="chip" aria-pressed={preset === p.id} onClick={() => applyPreset(p.id)}>{p.label}</button>)}</div>
          <span className="eyebrow" style={{ marginTop: 8 }}>Affichage</span>
          <label className="check-row"><input type="checkbox" checked={labels} onChange={() => setLabels(!labels)} /><span>Étiquettes</span></label>
          <label className="check-row"><input type="checkbox" checked={indicators} onChange={() => setIndicators(!indicators)} /><span>Indicateurs (flèches, halos, arc)</span></label>
          <label className="check-row"><input type="checkbox" checked={simple} onChange={() => setSimple(!simple)} /><span>Mots simples</span></label>
        </aside>
        <main className="lab-stage">
          <AnatomyViewer joint={J} pathology={patho} layers={layers} mode={mode} labels={labels} indicators={indicators} side={side} simple={simple}
            playing={playing} angle={angle} onAngle={setLive} tone={patho ? 'bad' : 'ok'} motion={motion} />
        </main>
        <aside className="lab-panel" aria-label="Animation et pathologie">
          <span className="eyebrow">Mouvement</span>
          <button className="btn primary" onClick={() => { if (playing) setAngle(live); setPlaying(!playing) }}><Icon name={playing ? 'pause' : 'play'} />{playing ? 'Pause' : 'Lecture'}</button>
          <label className="lab-row">
            {J.dofs.length > 1 && !pv?.motion && <select className="lab-select" value={motionSel} onChange={(e) => setMotionSel(e.target.value)}>{J.dofs.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select>}
            <span className="row"><span className="grow">{dof.label}</span><b>{playing ? live : angle}°</b></span>
            <input type="range" min={dof.min} max={dof.max} value={playing ? live : angle} onChange={(e) => { setPlaying(false); setAngle(+e.target.value) }} />
            <span className="small muted">Figez le mouvement à l'angle où le patient a mal.</span>
          </label>
          <span className="eyebrow" style={{ marginTop: 8 }}>État</span>
          <div className="seg">
            <button aria-pressed={!patho} onClick={() => setPatho(null)}>Mouvement sain</button>
            <button aria-pressed={!!patho} onClick={() => setPatho(choice)}>Pathologie</button>
          </div>
          <select className="lab-select" value={choice} onChange={(e) => { setChoice(e.target.value); if (patho) setPatho(e.target.value) }}>
            {Object.keys(J.pathologies).map((id) => <option key={id} value={id}>{pathologyById(id)?.label ?? id}</option>)}
          </select>
          {pv && <div className="explain-block bad"><span className="explain-label"><i />{simple ? 'Chez vous' : 'Ce que l\'on voit'}</span><p>{simple ? pv.simpleCaption : pv.caption}</p></div>}
          {!pv && <div className="explain-block ok"><span className="explain-label"><i />Normalement</span><p>Les surfaces glissent sans frotter, les ligaments se tendent juste ce qu'il faut et les muscles se relaient : l'avant de la cuisse pour tendre, l'arrière pour plier.</p></div>}
          <div className="lab-legend">
            <span><i style={{ background: '#fff', border: '1px solid #999' }} />Flèches blanches : sens de traction du muscle</span>
            <span><i style={{ background: '#F2B430' }} />Point orange : muscle en contraction</span>
            <span><i style={{ background: '#E5341F' }} />Halo rouge : frottement, compression</span>
            <span><i style={{ background: '#F08A24' }} />Orange : ligament en tension</span>
            <span><i style={{ background: '#7CC4F2' }} />Arc bleu : amplitude du mouvement</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
