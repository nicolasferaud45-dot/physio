import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import Home from './screens/Home'
import Presentation from './screens/Presentation'
import Context from './screens/Context'
import Exercises from './screens/Exercises'
import Remise from './screens/Share'
import PatientsHome from './screens/PatientsHome'
import PatientHome from './screens/PatientHome'
import ExerciseViewer from './screens/ExerciseViewer'
import { MOTIONS } from './data/motions'
import AnatomyLab from './screens/AnatomyLab'
import { JOINTS } from './anatomy/registry'
import { pathologyById } from './data/catalog'
import { decodePassport, usePatients, type Screen } from './state/session'

const STEPS: { id: Screen; label: string; hint: string }[] = [
  { id: 'situation', label: 'Situation', hint: 'Pathologie et contexte' },
  { id: 'presentation', label: 'Expliquer', hint: 'Face au patient' },
  { id: 'exercises', label: 'Programme', hint: 'Exercices et dosage' },
  { id: 'share', label: 'Remise', hint: 'Face au patient' },
]
const NEXT: Record<Screen, { to: Screen; label: string } | null> = {
  situation: { to: 'presentation', label: 'Expliquer au patient' },
  presentation: { to: 'exercises', label: 'Programme' },
  exercises: { to: 'share', label: 'Remettre au patient' },
  share: null,
}
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
  const [justSaved, setJustSaved] = useState(false)
  useEffect(() => { setJustSaved(true); const t = setTimeout(() => setJustSaved(false), 900); return () => clearTimeout(t) }, [s?.savedAt])

  if (!s) return <PatientsHome patients={P.all} onOpen={P.open} onCreate={() => P.create()} onRemove={P.remove} />

  const update = P.update
  const go = (screen: Screen) => {
    if (FACING.includes(screen) && screen !== s.screen) { setHandoff(screen); return }
    update({ screen }); document.querySelector('.content')?.scrollTo(0, 0)
  }
  const confirmHandoff = () => { if (handoff) update({ screen: handoff }); setHandoff(null) }
  const backToPractitioner = (to: Screen) => update({ screen: to })

  if (handoff) return <Handoff to={handoff} label={pathologyById(s.pathologyId)?.label} onGo={confirmHandoff} onCancel={() => setHandoff(null)} />

  if (s.screen === 'presentation') {
    return <Presentation s={{ ...s, pathologyId: s.pathologyId ?? 'conflit' }} update={update} onExit={() => backToPractitioner('exercises')} />
  }
  if (s.screen === 'share') {
    return <Remise s={s} update={update} onBack={() => backToPractitioner('exercises')} onFinish={() => { update({ done: true }); P.open(null) }} />
  }
  const idx = STEPS.findIndex((x) => x.id === s.screen)
  const next = NEXT[s.screen]
  const canNext = s.screen === 'situation' ? !!(s.pathologyId || s.region) : s.screen === 'exercises' ? s.program.length > 0 : true

  return (
    <div className="shell">
      <header className="topbar no-print">
        <button className="btn ghost" onClick={() => P.open(null)} aria-label="Mes patients"><Icon name="back" />Mes patients</button>
        <div className="avatar" aria-hidden="true">{s.patientLabel.slice(0, 2).toUpperCase()}</div>
        <label className="stack" style={{ gap: 0 }}>
          <span className="sr-only">Libellé du patient</span>
          <input className="patient-input" value={s.patientLabel} onChange={(e) => update({ patientLabel: e.target.value })} />
          <span className="small muted">Pseudonyme · reste sur la tablette</span>
        </label>
        <span className="grow" />
        <span className="saved" aria-live="polite"><Icon name="check" size={16} stroke={2.4} />{justSaved ? 'Enregistrement…' : 'Enregistré'}</span>
      </header>
      <nav aria-label="Étapes de la séance" className="no-print">
        <ol className="steps">
          {STEPS.map((st, i) => (
            <li key={st.id} style={{ flex: 1, display: 'flex' }}>
              <button aria-current={st.id === s.screen ? 'step' : undefined} className={i < idx ? 'done' : ''} onClick={() => go(st.id)}>
                <span className="n">{i < idx ? '✓' : i + 1}</span>
                <span className="stack" style={{ gap: 0, alignItems: 'flex-start' }}><span>{st.label}</span><span className="step-hint">{FACING.includes(st.id) && <Icon name="screen" size={12} />}{st.hint}</span></span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <main className="content">
        {s.screen === 'situation' && (
          <div className="stack" style={{ gap: 22 }}>
            <Home s={s} update={update} go={go} />
            {s.pathologyId && <Context s={s} update={update} go={go} />}
          </div>
        )}
        {s.screen === 'exercises' && <Exercises s={s} update={update} go={go} />}
      </main>
      {next && (
        <footer className="nextbar no-print">
          {idx > 0 && <button className="btn ghost" onClick={() => go(STEPS[idx - 1].id)}><Icon name="back" />Retour</button>}
          <span className="grow small muted">{!canNext ? (s.screen === 'situation' ? 'Choisissez une pathologie ou une région pour continuer.' : 'Ajoutez au moins un exercice.') : ''}</span>
          <button className="btn primary" disabled={!canNext} onClick={() => go(next.to)}>{FACING.includes(next.to) && <Icon name="screen" />}{next.label}<Icon name="next" /></button>
        </footer>
      )}
    </div>
  )
}

function Handoff({ to, label, onGo, onCancel }: { to: Screen; label?: string; onGo: () => void; onCancel: () => void }) {
  return (
    <div className="handoff">
      <div className="handoff-card">
        <div className="handoff-icon"><Icon name="screen" size={40} /></div>
        <h1>Tournez l'écran vers le patient</h1>
        <p>{to === 'presentation' ? `Vous allez lui expliquer${label ? ` : ${label.toLowerCase()}` : ''}. Les réglages praticien sont masqués.` : 'Il va recevoir son programme : explication, exercices illustrés et QR code.'}</p>
        <p className="small" style={{ opacity: 0.75 }}>Pour revenir à la vue praticien, maintenez le bouton cadenas 2 secondes.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn ghost light" onClick={onCancel}>Annuler</button>
          <button className="btn primary" onClick={onGo} autoFocus>C'est parti<Icon name="next" /></button>
        </div>
      </div>
    </div>
  )
}
