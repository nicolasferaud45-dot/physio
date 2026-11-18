import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import Presentation from './screens/Presentation'
import Remise from './screens/Share'
import PatientsHome from './screens/PatientsHome'
import PathologyStep from './screens/PathologyStep'
import Plan from './screens/Plan'
import { Dossier } from './components/Dossier'
import { lay } from './data/lay'
import PatientHome from './screens/PatientHome'
import ExerciseViewer from './screens/ExerciseViewer'
import { MOTIONS } from './data/motions'
import AnatomyLab from './screens/AnatomyLab'
import { JOINTS } from './anatomy/registry'
import { pathologyById } from './data/catalog'
import { decodePassport, usePatients, type Screen } from './state/session'

const STEPS: { id: Screen; label: string }[] = [
  { id: 'pathology', label: 'Pathologie' },
  { id: 'presentation', label: 'Montrer' },
  { id: 'plan', label: 'Plan' },
]
const FACING: Screen[] = ['presentation', 'share']

function useHash() {
  const [h, setH] = useState(location.hash)
  useEffect(() => { const f = () => setH(location.hash); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  return h
}

export default function App() {
  const hash = useHash()
  if (hash.startsWith('#p=')) {
    const data = decodePassport(hash.slice(3))
    if (data) return <PatientHome data={data} code={hash.slice(3)} />
  }
  if (hash.startsWith('#anat')) {
    const id = hash.slice(6) || 'genou'
    if (JOINTS[id]) return <AnatomyLab jointId={id} onClose={() => { location.hash = '' }} />
  }
  if (hash.startsWith('#ex-') && MOTIONS[hash.slice(4)]) {
    return <ExerciseViewer ids={Object.keys(MOTIONS)} start={hash.slice(4)} onClose={() => { location.hash = '' }} />
  }
  return <PractitionerApp />
}

function PractitionerApp() {
  const P = usePatients()
  const s = P.current
  const [handoff, setHandoff] = useState<Screen | null>(null)
  const [dossier, setDossier] = useState(false)
  const [editName, setEditName] = useState(false)

  if (!s) return <PatientsHome patients={P.all} onOpen={P.open} onCreate={() => P.create()} onRemove={P.remove} />

  const update = P.update
  const go = (screen: Screen) => {
    if (FACING.includes(screen) && screen !== s.screen) { setHandoff(screen); return }
    update({ screen }); document.querySelector('.content')?.scrollTo(0, 0)
  }
  const confirmHandoff = () => { if (handoff) update({ screen: handoff }); setHandoff(null) }

  if (handoff) return <Handoff to={handoff} label={lay(s.pathologyId, pathologyById(s.pathologyId)?.label)} onGo={confirmHandoff} onCancel={() => setHandoff(null)} />
  if (s.screen === 'presentation') {
    return <Presentation s={{ ...s, pathologyId: s.pathologyId ?? 'conflit' }} update={update} onExit={() => update({ screen: 'plan' })} />
  }
  if (s.screen === 'share') {
    return <Remise s={s} update={update} onBack={() => update({ screen: 'plan' })} onFinish={() => { update({ done: true }); P.open(null) }} />
  }
  const idx = STEPS.findIndex((x) => x.id === s.screen)
  const canGo = (i: number) => i === 0 || !!s.pathologyId

  return (
    <div className="shell">
      <header className="bar1 no-print">
        <button className="icon-btn ghost" onClick={() => P.open(null)} aria-label="Mes patients"><Icon name="back" /></button>
        <div className="bar1-who">
          {editName
            ? <input autoFocus className="patient-input" value={s.patientLabel} onChange={(e) => update({ patientLabel: e.target.value })} onBlur={() => setEditName(false)} onKeyDown={(e) => { if (e.key === 'Enter') setEditName(false) }} aria-label="Nom ou pseudonyme du patient" />
            : <button className="bar1-name" onClick={() => setEditName(true)} aria-label="Modifier le nom du patient">{s.patientLabel}</button>}
          <nav className="bar1-steps" aria-label="Étapes">
            {STEPS.map((st, i) => (
              <button key={st.id} aria-current={i === idx ? 'step' : undefined} className={i < idx ? 'done' : ''} disabled={!canGo(i)} onClick={() => go(st.id)}>
                <i />{<span>{i + 1} · {st.label}</span>}
              </button>
            ))}
          </nav>
        </div>
        <span className="bar1-saved" title="Enregistré automatiquement"><Icon name="check" size={16} stroke={2.4} /></span>
        <button className="bar1-dossier" onClick={() => setDossier(true)} aria-label="Dossier : notes et dessins"><Icon name="pen" size={18} /><span>Dossier</span></button>
      </header>
      <main className={'content step-' + s.screen}>
        {s.screen === 'pathology' && <PathologyStep s={s} update={update} go={go} />}
        {s.screen === 'plan' && <Plan s={s} update={update} go={go} />}
      </main>
      {dossier && <Dossier s={s} update={update} onClose={() => setDossier(false)} />}
    </div>
  )
}

function Handoff({ to, label, onGo, onCancel }: { to: Screen; label?: string; onGo: () => void; onCancel: () => void }) {
  return (
    <div className="handoff">
      <div className="handoff-card">
        <div className="handoff-icon"><Icon name="screen" size={40} /></div>
        <h1>Tournez l'écran vers le patient</h1>
        <p>{to === 'presentation' ? `Vous allez lui expliquer${label ? ` : ${label.charAt(0).toLowerCase() + label.slice(1)}` : ''}. Le dossier et les réglages praticien sont masqués.` : 'Il va recevoir son programme : explication, exercices illustrés et QR code.'}</p>
        <p className="small" style={{ opacity: 0.75 }}>Pour revenir à la vue praticien, maintenez le bouton cadenas 2 secondes.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn ghost light" onClick={onCancel}>Annuler</button>
          <button className="btn primary" onClick={onGo} autoFocus>C'est parti<Icon name="next" /></button>
        </div>
      </div>
    </div>
  )
}
