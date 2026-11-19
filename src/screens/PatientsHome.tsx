import { useState } from 'react'
import { lay } from '../data/lay'
import { Icon } from '../components/Icon'
import { pathologyById, regionLabel } from '../data/catalog'
import { loadLog, type Session } from '../state/session'
import { currentEpisode, rxLeft } from '../state/record'


/** Accueil praticien : les patients suivis sur cette tablette et leurs retours. */
export default function PatientsHome({ patients, onOpen, onCreate, onRemove, onSeed }: { patients: Session[]; onOpen: (id: string) => void; onCreate: () => void; onRemove: (id: string) => void; onSeed: () => void }) {
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
          const ep = currentEpisode(p)
          const closed = (ep?.visits ?? []).filter((v) => v.status !== 'open').sort((a, b) => a.at - b.at)
          const lastV = closed[closed.length - 1], prevV = closed[closed.length - 2]
          const open = ep?.visits.some((v) => v.status === 'open')
          const left = ep ? rxLeft(ep) : null
          const log = p.shareKey ? loadLog(p.shareKey) : []
          const since = lastV ? new Date(lastV.at).toISOString().slice(0, 10) : ''
          const home = log.filter((x) => x.date > since).length
          const days = lastV ? Math.round((Date.now() - lastV.at) / 864e5) : null
          return (
            <div key={p.id} className="row" style={{ gap: 8 }}>
              <button className="patient-card" onClick={() => onOpen(p.id)}>
                <div className="avatar">{p.demo ? 'T' + p.patientLabel.slice(-1) : p.patientLabel.slice(0, 2).toUpperCase()}</div>
                <div className="stack grow" style={{ gap: 4 }}>
                  <strong style={{ fontSize: 17 }}>{p.patientLabel}{p.demo && <span className="tag grey" style={{ marginLeft: 8, height: 24, fontSize: 12 }}>Fictif</span>}</strong>
                  <span className="small muted">{patho ? lay(patho.id, patho.label) : p.region ? regionLabel(p.region) : 'Pathologie à choisir'}{p.side ? ` · ${p.side === 'D' ? 'droite' : 'gauche'}` : ''}{closed.length ? ` · ${closed.length} séance${closed.length > 1 ? 's' : ''}` : ''}</span>
                  <div className="row wrap" style={{ gap: 6 }}>
                    {open && <span className="tag blue">Séance en cours</span>}
                    {lastV && prevV && lastV.eva > prevV.eva && <span className="tag red">Douleur en hausse · {lastV.eva}/10</span>}
                    {home > 0 && <span className="tag green">Maison : {home} jour{home > 1 ? 's' : ''}</span>}
                    {left !== null && left <= 1 && <span className="tag amber">{left === 0 ? 'Ordonnance terminée' : '1 séance restante'}</span>}
                    {days !== null && <span className="tag grey">Vu il y a {days === 0 ? 'moins d\'un jour' : `${days} j`}</span>}
                    {!lastV && !open && <span className="tag grey">Nouveau</span>}
                  </div>
                </div>
                <Icon name="next" />
              </button>
              <button className="icon-btn" aria-label={`Supprimer ${p.patientLabel}`} onClick={() => { if (confirm === p.id) { onRemove(p.id); setConfirm(null) } else { setConfirm(p.id); setTimeout(() => setConfirm(null), 3000) } }}
                style={confirm === p.id ? { background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' } : undefined}>{confirm === p.id ? <Icon name="check" /> : <Icon name="x" />}</button>
            </div>
          )
        })}
        {patients.length > 0 && <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>Les retours du patient (exercices faits, douleur) s'affichent ici quand il utilise son programme sur cet appareil.</p>}
        {!patients.some((p) => p.demo) && <button className="btn ghost" onClick={onSeed}>Ajouter les 3 dossiers de test (fictifs)</button>}
      </div>
    </div>
  )
}
