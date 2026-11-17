import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { exerciseById, pathologyById } from '../data/catalog'
import { formatDose } from '../engine/plan'
import { Icon } from '../components/Icon'
import { HoldButton } from '../components/HoldButton'
import { encodePassport, shareKeyOf, type PassportData, type Session } from '../state/session'
import { ExercisePic, IllustrationLegend } from './Exercises'
import { PassportView } from './Passport'

interface Props {
  s: Session
  update: (p: Partial<Session> | ((s: Session) => Partial<Session>)) => void
  onBack: () => void
  onFinish: () => void
}

/** Remise : écran tourné vers le patient. Il voit ce qu'il emporte et scanne le QR code. */
export default function Remise({ s, update, onBack, onFinish }: Props) {
  const patho = pathologyById(s.pathologyId)
  const [inc, setInc] = useState({ explain: true, goals: true, captures: true })
  const [qr, setQr] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const data: PassportData = useMemo(() => ({
    v: 1, pathologyId: inc.explain ? s.pathologyId : null, side: s.side, goals: inc.goals ? s.goals : [], program: s.program,
    date: new Date().toISOString().slice(0, 10),
  }), [s.pathologyId, s.side, s.goals, s.program, inc])
  const code = encodePassport(data)
  const link = `${location.href.split('#')[0]}#p=${code}`

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 560, color: { dark: '#13232F', light: '#FFFFFF' } }).then(setQr).catch(() => setQr(''))
    const key = shareKeyOf(code)
    if (s.shareKey !== key) update({ shareKey: key })
  }, [link]) // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* presse-papiers refusé */ } }
  const openHere = () => { try { sessionStorage.setItem('physio.preview', '1') } catch { /* ignore */ } location.hash = `p=${code}` }
  const maxPain = Math.max(0, ...s.program.map((p) => p.maxPain))

  return (
    <>
      <div className="remise no-print">
        <header className="remise-top">
          <HoldButton onDone={onBack} label="Vue praticien" />
          <div className="stack grow" style={{ gap: 0, textAlign: 'center' }}>
            <span className="eyebrow">Votre programme</span>
            <strong style={{ fontSize: 19 }}>{patho ? patho.label : 'Exercices'}{s.side ? ` · côté ${s.side === 'D' ? 'droit' : 'gauche'}` : ''}</strong>
          </div>
          <span className="remise-spacer" />
        </header>
        <main className="remise-main">
          <section className="stack" style={{ gap: 14 }} aria-label="Ce que vous emportez">
            {patho && inc.explain && (
              <div className="card row wrap" style={{ gap: 12, alignItems: 'stretch' }}>
                <div className="explain-block ok grow" style={{ flex: '1 1 240px' }}><span className="explain-label"><i />Normalement</span><strong>{patho.healthy.simple.title}</strong></div>
                <div className="explain-block bad grow" style={{ flex: '1 1 240px' }}><span className="explain-label"><i />Chez vous</span><strong>{patho.sick.simple.title}</strong></div>
                {s.ai?.patientMessage && <p style={{ margin: 0, flexBasis: '100%' }}>{s.ai.patientMessage}</p>}
              </div>
            )}
            <div className="row wrap"><h2 className="grow">Vos {s.program.length} exercices</h2><IllustrationLegend /></div>
            <div className="remise-ex">
              {s.program.map((p, i) => {
                const e = exerciseById(p.exerciseId)
                if (!e) return null
                return (
                  <div key={p.exerciseId} className="item">
                    <ExercisePic e={e} size={130} />
                    <strong>{i + 1}. {e.name}</strong>
                    <span className="small muted">{formatDose(p)} · {p.freq}</span>
                  </div>
                )
              })}
            </div>
            <div role="note" className="alert row" style={{ alignItems: 'flex-start' }}>
              <Icon name="alert" /><span className="small">Douleur acceptée jusqu'à <strong>{maxPain}/10</strong> pendant les exercices. Au-delà, ou si elle persiste le lendemain, arrêtez et prévenez-nous.</span>
            </div>
          </section>

          <aside className="card stack" style={{ alignItems: 'center', position: 'sticky', top: 0 }} aria-label="Récupérer le programme">
            <h2 style={{ textAlign: 'center' }}>Scannez avec votre téléphone</h2>
            <p className="muted" style={{ margin: 0, textAlign: 'center' }}>Ouvrez l'appareil photo et visez le code. Aucun compte n'est nécessaire.</p>
            <div style={{ padding: 12, borderRadius: 20, border: '1px solid var(--line)', background: '#fff' }}>
              {qr ? <img src={qr} alt="QR code du programme" width={270} height={270} /> : <div style={{ width: 270, height: 270 }} />}
            </div>
            <div className="row" style={{ width: '100%' }}>
              <button className="btn grow" onClick={copy}><Icon name="link" />{copied ? 'Copié !' : 'Copier le lien'}</button>
              <button className="btn grow" onClick={() => window.print()}><Icon name="print" />Imprimer</button>
            </div>
            <button className="btn" style={{ width: '100%' }} onClick={openHere}>Ouvrir l'app patient ici</button>
            <div className="alert ok row" style={{ width: '100%' }}><Icon name="lock" /><span className="small">Le lien ne contient ni nom ni donnée du dossier.</span></div>
            <details style={{ width: '100%' }} className="small">
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Réglages praticien</summary>
              <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                <label className="row"><input type="checkbox" checked={inc.explain} onChange={() => setInc({ ...inc, explain: !inc.explain })} /><span className="grow">Inclure l'explication</span></label>
                <label className="row"><input type="checkbox" checked={inc.goals} onChange={() => setInc({ ...inc, goals: !inc.goals })} /><span className="grow">Inclure les objectifs</span></label>
                <label className="row"><input type="checkbox" checked={inc.captures} disabled={!s.captures.length} onChange={() => setInc({ ...inc, captures: !inc.captures })} /><span className="grow">Captures annotées dans le PDF ({s.captures.length})</span></label>
              </div>
            </details>
            <HoldButton onDone={onFinish} label="Terminer la séance" className="btn green round" />
          </aside>
        </main>
      </div>
      <div className="print-only"><PassportView data={data} captures={inc.captures ? s.captures : []} interactive={false} /></div>
    </>
  )
}
