import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import Presentation from './screens/Presentation'
import Remise from './screens/Share'
import PatientsHome from './screens/PatientsHome'
import PathologyStep from './screens/PathologyStep'
import Plan from './screens/Plan'
import Overview from './screens/Overview'
import { Bilan, Cabinet, Terminer } from './screens/Seance'
import { currentVisit, fmtDate, patchVisit, seanceSteps } from './state/record'
import { Dossier } from './components/Dossier'
import { lay } from './data/lay'
import { demoPatients } from './data/demo'
import PatientHome from './screens/PatientHome'
import ExerciseViewer from './screens/ExerciseViewer'
import { MOTIONS } from './data/motions'
import AnatomyLab from './screens/AnatomyLab'
import { JOINTS } from './anatomy/registry'
import { pathologyById } from './data/catalog'
import { decodePassport, usePatients, type Screen } from './state/session'

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
  // dossiers fictifs « Patient test 1, 2, 3 » ajoutés une fois sur chaque appareil
  useEffect(() => {
    try { if (localStorage.getItem('physio.demoSeeded')) return; localStorage.setItem('physio.demoSeeded', '1') } catch { return }
    P.seed(demoPatients())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return <PatientsHome patients={P.all} onOpen={P.open} onCreate={() => P.create()} onRemove={P.remove} onSeed={() => P.seed(demoPatients())} />

  const update = P.update
  const go = (screen: Screen) => {
    if (FACING.includes(screen) && screen !== s.screen) { setHandoff(screen); return }
    update({ screen }); document.querySelector('.content')?.scrollTo(0, 0)
  }
  // écran tourné vers le patient : on note dans la séance qu'on a expliqué / remis
  const confirmHandoff = () => { if (handoff) { const to = handoff; update((x) => ({ screen: to, ...patchVisit(x, to === 'presentation' ? { explained: true } : { shared: true }) })) } setHandoff(null) }
  const toDossier = () => update({ screen: 'overview', diagMode: undefined })
  const pen = dossier && <Dossier s={s} update={update} onClose={() => setDossier(false)} />

  if (handoff) return <Handoff to={handoff} label={lay(s.pathologyId, pathologyById(s.pathologyId)?.label)} onGo={confirmHandoff} onCancel={() => setHandoff(null)} />
  if (s.screen === 'overview') return <><Overview s={s} update={update} go={go} onPatients={() => P.open(null)} onNotes={() => setDossier(true)} />{pen}</>
  if (s.screen === 'presentation') {
    return <Presentation s={{ ...s, pathologyId: s.pathologyId ?? 'conflit' }} update={update} onExit={() => update({ screen: s.visitId ? 'cabinet' : 'overview' })} />
  }
  if (s.screen === 'share') {
    return <Remise s={s} update={update} onBack={() => update({ screen: 'plan' })} onFinish={() => update({ done: true, screen: s.visitId ? 'terminer' : 'overview' })} />
  }
  const visit = currentVisit(s)
  const steps = visit ? seanceSteps(s) : []
  const idx = steps.findIndex((x) => x.id === s.screen)
  const canGo = (id: Screen) => id === 'pathology' || !!s.pathologyId

  return (
    <div className="shell">
      <header className="bar1 seance-bar no-print">
        <div className="seance-top">
          <button className="icon-btn ghost" onClick={toDossier} aria-label="Retour au dossier"><Icon name="back" /></button>
          <div className="bar1-who" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
            <strong className="seance-title">{visit ? `Séance du ${fmtDate(visit.at, true)} · ${s.patientLabel}` : s.patientLabel}</strong>
            <span className="small muted">{visit ? (idx >= 0 ? `Étape ${idx + 1} sur ${steps.length} · ${steps[idx].label}` : 'Séance en cours') : s.diagMode ? 'Modifier la pathologie' : 'Dossier'}</span>
          </div>
          {visit && s.screen !== 'terminer' && s.pathologyId && <button className="bar1-dossier" onClick={() => go('terminer')}><Icon name="check" size={18} /><span>Terminer la séance</span></button>}
        </div>
        {visit && (
          <nav className="seance-steps" aria-label="Étapes de la séance" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
            {steps.map((st, i) => (
              <button key={st.id} aria-current={i === idx ? 'step' : undefined} className={(i < idx ? 'done' : '') + (st.facing ? ' facing' : '')} disabled={!canGo(st.id)} onClick={() => go(st.id)} aria-label={`${i + 1} · ${st.label}${st.facing ? ' (écran patient)' : ''}`}>
                <i /><span>{i + 1} · {st.label}</span>
              </button>
            ))}
          </nav>
        )}
      </header>
      <main className={'content step-' + s.screen}>
        {s.screen === 'pathology' && <PathologyStep s={s} update={update} go={go} />}
        {s.screen === 'bilan' && <Bilan s={s} update={update} go={go} onPen={() => setDossier(true)} />}
        {s.screen === 'cabinet' && <Cabinet s={s} update={update} go={go} onPen={() => setDossier(true)} />}
        {s.screen === 'plan' && <Plan s={s} update={update} go={go} />}
        {s.screen === 'terminer' && <Terminer s={s} update={update} go={go} onPen={() => setDossier(true)} />}
      </main>
      {visit && !dossier && <button className="pen-fab no-print" onClick={() => setDossier(true)} aria-label="Note ou dessin pour cette séance"><Icon name="pen" size={22} /></button>}
      {pen}
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
