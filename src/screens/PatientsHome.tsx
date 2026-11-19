import { useState } from 'react'
import { lay } from '../data/lay'
import { Icon } from '../components/Icon'
import { pathologyById, regionLabel } from '../data/catalog'
import { loadLog, type Screen, type Session } from '../state/session'

const STEP_LABEL: Record<Screen, string> = { overview: 'Dossier', pathology: 'Pathologie', presentation: 'Montrer', plan: 'Plan', share: 'Remise' }

/** Accueil praticien : les patients suivis sur cette tablette et leurs retours. */
export default function PatientsHome({ patients, onOpen, onCreate, onRemove }: { patients: Session[]; onOpen: (id: string) => void; onCreate: () => void; onRemove: (id: string) => void }) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const sorted = [...patients].sort((a, b) => b.savedAt - a.savedAt).filter((p) => !q || (p.patientLabel + ' ' + (pathologyById(p.pathologyId)?.label ?? '') + ' ' + lay(p.pathologyId)).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="shell" style={{ overflow: 'auto' }}>
      <div className="patients">
        <div className="stack" style={{ gap: 2 }}>
          <span className="eyebrow">Physio</span>
          <h1 style={{ fontSize: 28 }}>Mes patients</h1>
        </div>
        <button className="btn primary pk-primary" onClick={onCreate}><Icon name="plus" />Nouveau patient</button>
        {patients.length > 3 && <label className="search"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un patient" aria-label="Rechercher un patient" /></label>}
        {sorted.length === 0 && (
          <div className="card stack" style={{ alignItems: 'center', padding: 40, textAlign: 'center' }}>
            <Icon name="person" size={36} />
            <h2>Aucun patient pour l'instant</h2>
            <p className="muted" style={{ margin: 0 }}>Touchez « Nouveau patient » pour commencer. Tout est enregistré automatiquement sur cet appareil.</p>
          </div>
        )}
        {sorted.map((p) => {
          const patho = pathologyById(p.pathologyId)
          const log = p.shareKey ? loadLog(p.shareKey) : []
          const last = log[log.length - 1]
          return (
            <div key={p.id} className="row" style={{ gap: 8 }}>
              <button className="patient-card" onClick={() => onOpen(p.id)}>
                <div className="avatar">{p.patientLabel.slice(0, 2).toUpperCase()}</div>
                <div className="stack grow" style={{ gap: 4 }}>
                  <strong style={{ fontSize: 17 }}>{p.patientLabel}</strong>
                  <span className="small muted">{patho ? lay(patho.id, patho.label) : p.region ? regionLabel(p.region) : 'Pathologie à choisir'}{p.side ? ` · ${p.side === 'D' ? 'droite' : 'gauche'}` : ''} · {new Date(p.savedAt).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })}</span>
                  <div className="row wrap" style={{ gap: 8 }}>
                    {(p.episodes?.length ?? 0) > 1 && <span className="tag grey">{p.episodes!.length} épisodes</span>}
                    {p.done ? <span className="tag green">Programme remis · {p.program.length} exercice{p.program.length > 1 ? 's' : ''}</span>
                      : <span className="tag blue">À continuer · {STEP_LABEL[p.screen]}</span>}
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
        {patients.length > 0 && <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>Les retours du patient (séances, douleur) s'affichent ici quand il utilise son programme sur cet appareil.</p>}
      </div>
    </div>
  )
}
