import { useState } from 'react'
import { Icon } from '../components/Icon'
import { pathologyById, regionLabel } from '../data/catalog'
import { loadLog, type Screen, type Session } from '../state/session'

const STEP_LABEL: Record<Screen, string> = { situation: 'Situation', presentation: 'Expliquer', exercises: 'Programme', share: 'Remise' }
const ORDER: Screen[] = ['situation', 'presentation', 'exercises', 'share']

/** Accueil praticien : les patients suivis sur cette tablette et leurs retours. */
export default function PatientsHome({ patients, onOpen, onCreate, onRemove }: { patients: Session[]; onOpen: (id: string) => void; onCreate: () => void; onRemove: (id: string) => void }) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const sorted = [...patients].sort((a, b) => b.savedAt - a.savedAt)
  return (
    <div className="shell" style={{ overflow: 'auto' }}>
      <div className="patients">
        <div className="row wrap">
          <div className="stack grow" style={{ gap: 2 }}>
            <span className="eyebrow">Physio · assistant de consultation</span>
            <h1 style={{ fontSize: 28 }}>Mes patients</h1>
          </div>
          <button className="btn primary" style={{ minHeight: 56, fontSize: 17 }} onClick={onCreate}><Icon name="plus" />Nouveau patient</button>
        </div>
        <div className="card row" style={{ gap: 16, padding: 18 }}>
          {ORDER.map((st, i) => (
            <div key={st} className="stack grow" style={{ gap: 2 }}>
              <span className="small" style={{ fontWeight: 700, color: 'var(--blue)' }}>{i + 1} · {STEP_LABEL[st]}</span>
              <span className="small muted">{['Décrire ou dicter, compléter le contexte', 'Écran tourné vers le patient : normal vs pathologie', 'Exercices illustrés et dosage', 'Le patient repart avec son programme'][i]}</span>
            </div>
          ))}
        </div>
        {sorted.length === 0 && (
          <div className="card stack" style={{ alignItems: 'center', padding: 40, textAlign: 'center' }}>
            <Icon name="person" size={36} />
            <h2>Aucun patient pour l'instant</h2>
            <p className="muted" style={{ margin: 0 }}>Commencez une séance : tout est enregistré automatiquement sur cette tablette, sans nom ni donnée du dossier.</p>
            <button className="btn primary" onClick={onCreate}><Icon name="plus" />Nouveau patient</button>
          </div>
        )}
        {sorted.map((p) => {
          const patho = pathologyById(p.pathologyId)
          const log = p.shareKey ? loadLog(p.shareKey) : []
          const last = log[log.length - 1]
          const step = ORDER.indexOf(p.screen)
          return (
            <div key={p.id} className="row" style={{ gap: 8 }}>
              <button className="patient-card" onClick={() => onOpen(p.id)}>
                <div className="avatar">{p.patientLabel.slice(0, 2).toUpperCase()}</div>
                <div className="stack grow" style={{ gap: 4 }}>
                  <strong style={{ fontSize: 17 }}>{p.patientLabel}</strong>
                  <span className="small muted">{patho ? patho.label : p.region ? regionLabel(p.region) : 'Situation à décrire'}{p.side ? ` · ${p.side === 'D' ? 'droite' : 'gauche'}` : ''} · {new Date(p.savedAt).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })}</span>
                  <div className="row wrap" style={{ gap: 8 }}>
                    {p.done ? <span className="tag green">Programme remis · {p.program.length} exercice{p.program.length > 1 ? 's' : ''}</span>
                      : <span className="row" style={{ gap: 8 }}><span className="progress-dots">{ORDER.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</span><span className="small muted">En cours · {STEP_LABEL[p.screen]}</span></span>}
                    {last && <span className={'feedback' + ((last.pain ?? 0) > Math.max(...p.program.map((x) => x.maxPain), 3) ? ' bad' : '')}>{log.length} séance{log.length > 1 ? 's' : ''} faite{log.length > 1 ? 's' : ''}{last.pain !== null ? ` · douleur ${last.pain}/10` : ''}</span>}
                  </div>
                </div>
                <Icon name="next" />
              </button>
              <button className="icon-btn" aria-label={`Supprimer ${p.patientLabel}`} onClick={() => { if (confirm === p.id) { onRemove(p.id); setConfirm(null) } else { setConfirm(p.id); setTimeout(() => setConfirm(null), 3000) } }}
                style={confirm === p.id ? { background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' } : undefined}>{confirm === p.id ? <Icon name="check" /> : <Icon name="x" />}</button>
            </div>
          )
        })}
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>Prototype : les retours du patient (séances faites, douleur) s'affichent ici quand il utilise son programme sur cet appareil. La version finale les synchronisera par un serveur sécurisé.</p>
      </div>
    </div>
  )
}
