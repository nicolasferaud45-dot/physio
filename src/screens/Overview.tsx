import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { lay } from '../data/lay'
import { PHASE_LABEL, pathologyById, regionLabel } from '../data/catalog'
import type { Screen, Session } from '../state/session'
import {
  ageOf, currentEpisode, FEELING_LABEL, fmtDate, NEXT_LABEL, patchEpisode, previousVisit, REGION_COLOR, rxLeft, startEpisode, startVisit, STATUS_LABEL, switchTo,
  type Episode, type Profile,
} from '../state/record'
import { homeSince, SketchThumbs } from './Seance'
import { clean, savePdf } from '../lib/pdf'

type Update = (p: Partial<Session> | ((s: Session) => Partial<Session>)) => void
const DAY = 864e5
const colorOf = (e: Episode) => (e.region ? REGION_COLOR[e.region] : '#7D8B96')
const nameOf = (e: Episode) => (e.pathologyId && lay(e.pathologyId, pathologyById(e.pathologyId)?.label)) || (e.region ? regionLabel(e.region) : 'Pathologie à choisir')
const sideOf = (sd: 'D' | 'G' | null) => (sd ? (sd === 'D' ? 'droite' : 'gauche') : '')

/** Vue d'ensemble du dossier : profil, frise des épisodes, détail d'un épisode. Privé praticien. */
export default function Overview({ s, update, go, onPatients, onNotes }: { s: Session; update: Update; go: (sc: Screen) => void; onPatients: () => void; onNotes: () => void }) {
  const eps = s.episodes ?? []
  const cur = currentEpisode(s)
  const [sel, setSel] = useState<string | null>(cur?.id ?? null)
  const ep = eps.find((e) => e.id === sel) ?? cur ?? eps[eps.length - 1] ?? null
  const [editName, setEditName] = useState(false)
  const [diag, setDiag] = useState<Episode | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // démarrer (ou reprendre) la séance du jour sur un épisode
  const start = (e: Episode) => { if (e.id !== s.episodeId) update(switchTo(s, e.id)); update((x) => startVisit(x)) }
  const newEp = () => { const p = startEpisode(s); update(p); setSel(p.episodeId ?? null); update((x) => startVisit(x)) }

  const pdf = async () => {
    setMsg('Création du PDF…')
    try { setMsg(await exportRecord(s)) } catch { setMsg('Le téléchargement est bloqué dans cet aperçu. Utilisez la version en ligne (GitHub) pour exporter.') }
    setTimeout(() => setMsg(null), 4000)
  }

  return (
    <div className="shell">
      <header className="bar1 no-print">
        <button className="icon-btn ghost" onClick={onPatients} aria-label="Mes patients"><Icon name="back" /></button>
        <div className="bar1-who">
          {editName
            ? <input autoFocus className="patient-input" value={s.patientLabel} onChange={(e) => update({ patientLabel: e.target.value })} onBlur={() => setEditName(false)} onKeyDown={(e) => { if (e.key === 'Enter') setEditName(false) }} aria-label="Nom ou pseudonyme du patient" />
            : <button className="bar1-name" onClick={() => setEditName(true)} aria-label="Modifier le nom du patient">{s.patientLabel}</button>}
          <span className="small muted row" style={{ gap: 4 }}><Icon name="lock" size={12} />Dossier privé</span>
        </div>
        <button className="bar1-dossier" onClick={pdf} aria-label="Exporter le dossier en PDF"><Icon name="print" size={18} /><span>PDF</span></button>
        <button className="bar1-dossier" onClick={onNotes} aria-label="Notes et dessins"><Icon name="pen" size={18} /><span>Notes</span></button>
      </header>
      <main className="content ov">
        <div className="ov-grid">
          <div className="ov-main">
            {cur && <BeforeCard s={s} ep={cur} onStart={() => start(cur)} onNew={newEp} />}
            <ProfileCard p={s.profile ?? {}} hideAlert={!!cur} onChange={(p) => update((x) => ({ profile: { ...x.profile, ...p } }))} />

            <section className="card ov-tl-card">
              <div className="row"><h2 className="grow" style={{ fontSize: 18 }}>Historique</h2><span className="small muted">{eps.length} épisode{eps.length > 1 ? 's' : ''} · {((n) => `${n} séance${n > 1 ? 's' : ''}`)(eps.reduce((n, e) => n + e.visits.length, 0))}</span></div>
              <Timeline eps={eps} sel={ep?.id ?? null} onSel={(id) => { setSel(id); if (window.innerWidth < 900) setTimeout(() => document.querySelector('.ov-ep')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} />
            </section>
          </div>

          {ep && (
            <aside className="card ov-ep">
              <EpisodePanel s={s} ep={ep} current={ep.id === s.episodeId} update={update} onStart={() => start(ep)} onDiag={() => setDiag(ep)} />
            </aside>
          )}
        </div>
      </main>
      {diag && <DiagSheet ep={diag} onClose={() => setDiag(null)} onGo={(kind, reason) => { if (diag.id !== s.episodeId) update(switchTo(s, diag.id)); update({ diagMode: { kind, reason }, visitId: undefined }); setDiag(null); go('pathology') }} />}
      {msg && <div className="toast" role="status">{msg}</div>}
    </div>
  )
}

/* ----------------------------------------------------------- avant la séance */
function BeforeCard({ s, ep, onStart, onNew }: { s: Session; ep: Episode; onStart: () => void; onNew: () => void }) {
  const open = ep.visits.find((v) => v.status === 'open')
  const closed = ep.visits.filter((v) => v.status !== 'open').sort((a, b) => a.at - b.at)
  const last = previousVisit(ep)
  const trend = closed.slice(-3)
  const down = trend.length >= 2 && trend[trend.length - 1].eva < trend[0].eva
  const up = trend.length >= 2 && trend[trend.length - 1].eva > trend[trend.length - 2].eva
  const home = last ? homeSince(s, last.at) : null
  const left = rxLeft(ep)
  const days = last ? Math.round((Date.now() - last.at) / DAY) : null
  return (
    <section className="card ov-before">
      <div className="stack" style={{ gap: 2 }}><span className="pk-eyebrow" style={{ margin: 0, color: 'var(--blue-dark)' }}>{open ? 'Séance en cours' : 'Avant la séance'}</span><strong style={{ fontSize: 17 }}>{nameOf(ep)}{ep.side ? ` · ${sideOf(ep.side)}` : ''}</strong></div>
      {s.profile?.alerts && <div className="ov-alert"><Icon name="alert" size={18} /><span><b>À surveiller : </b>{s.profile.alerts}</span></div>}
      {ep.pathologyId && (
        <div className="ov-stats">
          <div><span>Dernière séance</span><b>{last ? fmtDate(last.at) : 'Aucune'}</b><small>{days === null ? 'première séance' : days === 0 ? 'aujourd\'hui' : `il y a ${days} jour${days > 1 ? 's' : ''}`}</small></div>
          <div><span>Douleur</span><b>{last ? `${last.eva}/10` : '–'}</b><small className={down ? 'good' : up ? 'bad' : ''}>{down ? `en baisse depuis ${trend.length} séances` : up ? 'en hausse' : last ? 'stable' : ''}</small></div>
          <div><span>À la maison</span><b>{home && home.days ? `${home.days} jour${home.days > 1 ? 's' : ''}` : '–'}</b><small>{home && home.days ? (home.avgPain !== null ? `douleur ${home.avgPain}/10` : 'exercices notés') : last ? 'pas de retour' : ''}</small></div>
          <div className={left !== null && left <= 1 ? 'warn' : ''}><span>Ordonnance</span><b>{left !== null ? `${left} restante${left > 1 ? 's' : ''}` : '–'}</b><small>{ep.rx?.count ? `sur ${ep.rx.count}` : 'non saisie'}</small></div>
        </div>
      )}
      {last?.note && <p className="ov-lastnote"><b>La dernière fois : </b>« {last.note} »{last.next ? <span className="muted"> · revoir {NEXT_LABEL[last.next]}</span> : null}</p>}
      <div className="ov-cta">
        <button className="btn primary pk-primary" onClick={onStart}><Icon name={open ? 'next' : 'play'} />{open ? 'Reprendre la séance' : ep.pathologyId ? 'Démarrer la séance' : 'Choisir la pathologie'}</button>
        <button className="btn" onClick={onNew}><Icon name="plus" />Nouvelle douleur</button>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------- profil */
function ProfileCard({ p, onChange, hideAlert }: { p: Profile; onChange: (p: Partial<Profile>) => void; hideAlert?: boolean }) {
  const empty = !p.birthYear && !p.job && !p.sport && !p.dominant && !p.history && !p.meds && !p.alerts
  const [edit, setEdit] = useState(false)
  const age = ageOf(p)
  const facts = [age !== null && `${age} ans`, p.dominant && `${p.dominant === 'D' ? 'Droitier' : 'Gaucher'}`, p.job, p.sport].filter(Boolean) as string[]
  return (
    <section className="card ov-profile">
      <div className="row">
        <h2 className="grow" style={{ fontSize: 18 }}>Profil</h2>
        <button className="btn ghost" style={{ minHeight: 40 }} onClick={() => setEdit(!edit)}>{edit ? <><Icon name="check" size={18} />Terminé</> : <><Icon name="pen" size={18} />Modifier</>}</button>
      </div>
      {p.alerts && !hideAlert && <div className="ov-alert"><Icon name="alert" size={18} /><span><b>À surveiller : </b>{p.alerts}</span></div>}
      {!edit && (
        <div className="stack" style={{ gap: 6 }}>
          {facts.length > 0 && <div className="row wrap" style={{ gap: 6 }}>{facts.map((f) => <span key={f} className="tag grey">{f}</span>)}</div>}
          {p.history && <p className="ov-line"><b>Antécédents</b>{p.history}</p>}
          {p.meds && <p className="ov-line"><b>Traitements</b>{p.meds}</p>}
          {empty && <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setEdit(true)}><Icon name="plus" size={18} />Compléter : âge, métier, sport, antécédents, traitements</button>}
        </div>
      )}
      {edit && (
        <div className="ov-form">
          <label>Année de naissance<input inputMode="numeric" value={p.birthYear ?? ''} onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, '').slice(0, 4)); onChange({ birthYear: Number.isFinite(n) ? n : undefined }) }} placeholder="1975" /></label>
          <label>Côté dominant
            <span className="pk-big-seg small" role="radiogroup">
              <button role="radio" aria-checked={p.dominant === 'D'} onClick={() => onChange({ dominant: p.dominant === 'D' ? undefined : 'D' })}>Droitier</button>
              <button role="radio" aria-checked={p.dominant === 'G'} onClick={() => onChange({ dominant: p.dominant === 'G' ? undefined : 'G' })}>Gaucher</button>
            </span>
          </label>
          <label>Métier<input value={p.job ?? ''} onChange={(e) => onChange({ job: e.target.value })} placeholder="Ex. maçon, bureau…" /></label>
          <label>Sport, loisirs<input value={p.sport ?? ''} onChange={(e) => onChange({ sport: e.target.value })} placeholder="Ex. tennis 2×/sem." /></label>
          <label className="wide">Antécédents (opérations, blessures)<textarea value={p.history ?? ''} onChange={(e) => onChange({ history: e.target.value })} /></label>
          <label className="wide">Traitements en cours<textarea value={p.meds ?? ''} onChange={(e) => onChange({ meds: e.target.value })} placeholder="Ex. anticoagulant, corticoïdes…" /></label>
          <label className="wide alert">Contre-indications, précautions<textarea value={p.alerts ?? ''} onChange={(e) => onChange({ alerts: e.target.value })} placeholder="Affiché en rouge en haut du dossier" /></label>
        </div>
      )}
    </section>
  )
}

/* ----------------------------------------------------------- frise */
function Timeline({ eps, sel, onSel }: { eps: Episode[]; sel: string | null; onSel: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = box.current; if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  if (!eps.length) return <p className="muted">Aucun épisode.</p>
  const wide = w >= 560
  return <div ref={box}>{w > 0 && (wide ? <TimelineWide eps={eps} sel={sel} onSel={onSel} w={w} /> : <TimelineList eps={eps} sel={sel} onSel={onSel} />)}</div>
}

function TimelineWide({ eps, sel, onSel, w }: { eps: Episode[]; sel: string | null; onSel: (id: string) => void; w: number }) {
  const now = Date.now()
  const list = [...eps].sort((a, b) => a.start - b.start)
  const t0raw = Math.min(...list.map((e) => Math.min(e.start, ...e.visits.map((v) => v.at))))
  const span = Math.max(now - t0raw, 30 * DAY)
  const t0 = now - span - span * 0.04, t1 = now + span * 0.06
  const L = 8, R = w - 8
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (R - L)
  const lane = 38, top = 8
  const chartTop = top + list.length * lane + 22, chartH = 96
  const H = chartTop + chartH + 26
  const y = (eva: number) => chartTop + chartH - (eva / 10) * chartH
  const ticks = useMemo(() => {
    const out: { t: number; label: string }[] = []
    const d = new Date(t0)
    if (span > 75 * DAY) {
      d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 1)
      const step = span > 400 * DAY ? 3 : 1
      while (d.getTime() < t1) { out.push({ t: d.getTime(), label: d.toLocaleDateString('fr-CH', { month: 'short', ...(d.getMonth() === 0 || out.length === 0 ? { year: '2-digit' } : {}) }) }); d.setMonth(d.getMonth() + step) }
    } else {
      d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7))
      while (d.getTime() < t1) { out.push({ t: d.getTime(), label: d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' }) }); d.setDate(d.getDate() + 7) }
    }
    return out.filter((k) => Math.abs(k.t - now) > (t1 - t0) * 0.045)
  }, [t0, t1, span, now])
  return (
    <svg className="tl" width={w} height={H} role="img" aria-label="Frise des épisodes et de la douleur">
      {ticks.map((k) => <g key={k.t}><line x1={x(k.t)} x2={x(k.t)} y1={top} y2={chartTop + chartH} className="tl-grid" /><text x={x(k.t)} y={H - 8} className="tl-tick" textAnchor="middle">{k.label}</text></g>)}
      <line x1={x(now)} x2={x(now)} y1={top - 4} y2={chartTop + chartH} className="tl-now" />
      <text x={x(now)} y={H - 8} className="tl-tick now" textAnchor="middle">Auj.</text>
      {list.map((e, i) => {
        const yy = top + i * lane, xa = x(e.start), xb = x(e.end ?? now), c = colorOf(e)
        const name = nameOf(e) + (e.side ? ` · ${sideOf(e.side)}` : '')
        const bw = Math.max(xb - xa, 26)
        const tw = name.length * 6.6
        const inside = bw > tw + 24
        const after = xb + 8 + tw < R
        return (
          <g key={e.id} className={'tl-ep' + (e.id === sel ? ' on' : '')} onClick={() => onSel(e.id)} role="button" aria-label={`${name}, ${STATUS_LABEL[e.status]}`}>
            <rect x={xa} y={yy} width={bw} height={26} rx={13} fill={c} opacity={e.status === 'termine' ? 0.35 : 0.9} />
            {e.status !== 'termine' && <rect x={xa + bw - 10} y={yy} width={10} height={26} fill={c} opacity={0.9} />}
            {e.diagHistory.length > 0 && e.events.filter((v) => v.kind === 'reeval').map((v, k) => <path key={k} d={`M${x(v.at)} ${yy - 3} l5 5 l-5 5 l-5 -5z`} className="tl-reeval" />)}
            {e.visits.map((v) => <circle key={v.id} cx={x(v.at)} cy={yy + 13} r={4.2} className="tl-visit" stroke={c} />)}
            <text x={inside ? xa + 12 : after ? xb + 8 : xa - 8} y={yy + 17.5} textAnchor={inside || after ? 'start' : 'end'} className={'tl-name' + (inside ? ' in' : '')}>{name}</text>
            <rect x={L} y={yy - 4} width={R - L} height={lane - 4} fill="transparent" />
          </g>
        )
      })}
      <text x={L + 26} y={chartTop - 4} className="tl-tick" style={{ fontWeight: 600 }}>Douleur /10</text>
      {[0, 5, 10].map((v) => <g key={v}><line x1={L + 22} x2={R} y1={y(v)} y2={y(v)} className="tl-grid h" /><text x={L} y={y(v) + 4} className="tl-tick">{v}</text></g>)}
      {list.map((e) => {
        const pts = [...e.visits].sort((a, b) => a.at - b.at)
        if (!pts.length) return null
        const c = colorOf(e)
        return (
          <g key={e.id} opacity={sel && sel !== e.id ? 0.35 : 1}>
            {pts.length > 1 && <polyline points={pts.map((v) => `${x(v.at)},${y(v.eva)}`).join(' ')} fill="none" stroke={c} strokeWidth={2.4} strokeLinejoin="round" />}
            {pts.map((v) => <circle key={v.id} cx={x(v.at)} cy={y(v.eva)} r={3.6} fill={c} />)}
          </g>
        )
      })}
    </svg>
  )
}

function Spark({ e }: { e: Episode }) {
  const pts = [...e.visits].sort((a, b) => a.at - b.at)
  if (pts.length < 2) return null
  const W = 72, H = 30, t0 = pts[0].at, t1 = pts[pts.length - 1].at || t0 + 1
  return <svg width={W} height={H} aria-hidden><polyline points={pts.map((v) => `${2 + ((v.at - t0) / Math.max(1, t1 - t0)) * (W - 4)},${H - 2 - (v.eva / 10) * (H - 4)}`).join(' ')} fill="none" stroke={colorOf(e)} strokeWidth={2} /></svg>
}

function TimelineList({ eps, sel, onSel }: { eps: Episode[]; sel: string | null; onSel: (id: string) => void }) {
  const list = [...eps].sort((a, b) => b.start - a.start)
  return (
    <ol className="tlv">
      {list.map((e) => {
        const last = [...e.visits].sort((a, b) => b.at - a.at)[0]
        return (
          <li key={e.id} className={e.id === sel ? 'on' : ''} style={{ ['--c' as string]: colorOf(e) }}>
            <button onClick={() => onSel(e.id)}>
              <span className="tlv-dot" />
              <span className="stack grow" style={{ gap: 2, minWidth: 0 }}>
                <strong>{nameOf(e)}{e.side ? ` · ${sideOf(e.side)}` : ''}</strong>
                <span className="small muted">{fmtDate(e.start)} → {e.end ? fmtDate(e.end) : 'aujourd\'hui'} · {e.visits.length} séance{e.visits.length > 1 ? 's' : ''}{last ? ` · ${last.eva}/10` : ''}</span>
                <span className="row" style={{ gap: 6 }}><span className={'tag ' + (e.status === 'termine' ? 'grey' : e.status === 'recidive' ? 'red' : 'green')}>{STATUS_LABEL[e.status]}</span>{e.diagHistory.length > 0 && <span className="tag grey">Réévalué</span>}</span>
              </span>
              <Spark e={e} />
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/* ----------------------------------------------------------- épisode */
function EpisodePanel({ s, ep, current, update, onStart, onDiag }: { s: Session; ep: Episode; current: boolean; update: Update; onStart: () => void; onDiag: () => void }) {
  const patho = pathologyById(ep.pathologyId)
  const set = (p: Partial<Episode> | ((e: Episode) => Partial<Episode>)) => update((x) => patchEpisode(x, ep.id, p))
  const left = rxLeft(ep)
  const visits = [...ep.visits].sort((a, b) => b.at - a.at)
  const now = Date.now()
  const finish = () => set((e) => ({ status: 'termine', end: now, events: [...e.events, { at: now, kind: 'termine' }] }))
  const relapse = () => { set((e) => ({ status: 'recidive', end: undefined, events: [...e.events, { at: now, kind: 'recidive' }] })); if (!current) update(switchTo(s, ep.id)) }
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
        <span className="ov-swatch" style={{ background: colorOf(ep) }} />
        <div className="stack grow" style={{ gap: 2, minWidth: 0 }}>
          <span className="pk-eyebrow" style={{ margin: 0 }}>{patho ? patho.label : 'Épisode'}{ep.side ? ` · ${sideOf(ep.side)}` : ''}</span>
          <h2 style={{ fontSize: 21 }}>{nameOf(ep)}</h2>
          <span className="small muted">Depuis le {fmtDate(ep.start, true)}{ep.end ? ` · terminé le ${fmtDate(ep.end, true)}` : ''}</span>
        </div>
        <span className={'tag ' + (ep.status === 'termine' ? 'grey' : ep.status === 'recidive' ? 'red' : 'green')}>{STATUS_LABEL[ep.status]}</span>
      </div>

      <div className="ov-actions">
        {!current && <button className="btn primary" onClick={onStart}><Icon name="play" />Démarrer une séance</button>}
        <button className="btn" onClick={ep.pathologyId ? onDiag : onStart}><Icon name="pen" size={18} />{ep.pathologyId ? 'Modifier la pathologie' : 'Choisir la pathologie'}</button>
        {ep.status !== 'termine' ? <button className="btn ghost" onClick={finish}><Icon name="check" />Terminer l'épisode</button>
          : <button className="btn ghost" onClick={relapse}><Icon name="refresh" />Récidive</button>}
      </div>

      <details className="plan-more" open={!!(ep.motif || ep.rx?.count)}>
        <summary>Motif et ordonnance{left !== null ? ` · ${left} séance${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}` : ''}</summary>
        <div className="ov-form" style={{ paddingTop: 8 }}>
          <label className="wide">Motif, début, circonstances<textarea value={ep.motif ?? ''} onChange={(e) => set({ motif: e.target.value })} placeholder="Ex. douleur depuis 3 semaines après déménagement, pas de chute" /></label>
          <label>Médecin prescripteur<input value={ep.rx?.doctor ?? ''} onChange={(e) => set((x) => ({ rx: { ...x.rx, doctor: e.target.value } }))} /></label>
          <label>Date de l'ordonnance<input type="date" value={ep.rx?.date ?? ''} onChange={(e) => set((x) => ({ rx: { ...x.rx, date: e.target.value } }))} /></label>
          <label>Séances prescrites<input inputMode="numeric" value={ep.rx?.count ?? ''} onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, '').slice(0, 3)); set((x) => ({ rx: { ...x.rx, count: Number.isFinite(n) ? n : undefined } })) }} placeholder="9" /></label>
          {left !== null && <div className={'ov-left' + (left <= 1 ? ' low' : '')}><b>{left}</b> séance{left > 1 ? 's' : ''} restante{left > 1 ? 's' : ''}{left <= 1 ? ' · pensez au renouvellement' : ''}</div>}
        </div>
      </details>

      {ep.diagHistory.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="pk-eyebrow" style={{ margin: 0 }}>Évolution du diagnostic</span>
          <ol className="ov-diag">
            <li className="now"><b>{patho?.label ?? nameOf(ep)}</b>{ep.side ? ` · ${sideOf(ep.side)}` : ''}<span className="small muted"> · actuel</span></li>
            {[...ep.diagHistory].reverse().map((d, i) => (
              <li key={i}><s>{pathologyById(d.pathologyId)?.label ?? 'Non précisée'}{d.side ? ` · ${sideOf(d.side)}` : ''}</s><span className="small muted"> · jusqu'au {fmtDate(d.at)}{d.reason ? ` · ${d.reason}` : ''}</span></li>
            ))}
          </ol>
        </div>
      )}

      <div className="stack" style={{ gap: 6 }}>
        <span className="pk-eyebrow" style={{ margin: 0 }}>Séances ({visits.length})</span>
        {visits.length === 0 && <p className="small muted" style={{ margin: 0 }}>Les séances apparaissent ici quand vous les terminez (« Enregistrer au dossier »).</p>}
        <ul className="ov-visits">
          {visits.map((v, i) => (
            <li key={v.id} className={v.status === 'open' ? 'open' : ''}>
              <div className="row" style={{ gap: 8 }}>
                <strong className="grow">{fmtDate(v.at, true)}</strong>
                {v.status === 'open' && <span className="tag blue">En cours</span>}
                {v.auto && <span className="small muted" title="Séance non terminée, fermée automatiquement">fermée auto.</span>}
                {v.phase && <span className="small muted">{PHASE_LABEL[v.phase]}</span>}
                <span className={'ov-eva' + (v.eva >= 7 ? ' hi' : v.eva <= 3 ? ' lo' : '')}>{v.eva}/10</span>
              </div>
              <span className="small muted">{[visits[i + 1] ? (v.eva < visits[i + 1].eva ? `↓ ${visits[i + 1].eva - v.eva}` : v.eva > visits[i + 1].eva ? `↑ ${v.eva - visits[i + 1].eva}` : 'stable') : '', v.feeling ? `se sent ${FEELING_LABEL[v.feeling].toLowerCase()}` : '', v.explained ? 'expliqué en 3D' : '', v.shared ? 'programme remis' : ''].filter(Boolean).join(' · ')}</span>
              {(v.clinic?.length || v.clinicOther) ? <span className="small">En cabinet : {[...(v.clinic ?? []), ...(v.clinicOther ? [v.clinicOther] : [])].join(', ')}</span> : null}
              <input className="ov-note" value={v.note ?? ''} onChange={(e) => set((x) => ({ visits: x.visits.map((y) => (y.id === v.id ? { ...y, note: e.target.value } : y)) }))} placeholder="Note de séance…" aria-label={`Note du ${fmtDate(v.at)}`} />
              {(v.sketch?.front || v.sketch?.back) && <SketchThumbs v={v} size={52} />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- modifier la pathologie */
function DiagSheet({ ep, onClose, onGo }: { ep: Episode; onClose: () => void; onGo: (kind: 'correct' | 'reeval', reason?: string) => void }) {
  const [kind, setKind] = useState<'correct' | 'reeval' | null>(null)
  const [reason, setReason] = useState('')
  return (
    <div className="ov-sheet-bg" onClick={onClose}>
      <div className="ov-sheet" role="dialog" aria-label="Modifier la pathologie" onClick={(e) => e.stopPropagation()}>
        <div className="row"><h2 className="grow" style={{ fontSize: 19 }}>Modifier la pathologie</h2><button className="icon-btn ghost" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button></div>
        <p className="small muted" style={{ margin: 0 }}>Actuellement : <b>{pathologyById(ep.pathologyId)?.label}</b>{ep.side ? ` · ${sideOf(ep.side)}` : ''}</p>
        <button className={'ov-choice' + (kind === 'correct' ? ' on' : '')} onClick={() => setKind('correct')}>
          <strong>Corriger une erreur</strong><span>Je me suis trompé en la choisissant. On remplace, sans garder de trace.</span>
        </button>
        <button className={'ov-choice' + (kind === 'reeval' ? ' on' : '')} onClick={() => setKind('reeval')}>
          <strong>Réévaluer</strong><span>Une nouvelle information change le diagnostic (imagerie, avis médical, évolution). L'ancienne pathologie reste dans l'historique, barrée et datée.</span>
        </button>
        {kind === 'reeval' && <label className="ov-form" style={{ display: 'block' }}><span className="small">Pourquoi ? (facultatif)</span><input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. échographie du 12.11 : rupture partielle" /></label>}
        <button className="btn primary pk-primary" disabled={!kind} onClick={() => kind && onGo(kind, reason.trim() || undefined)}>Choisir la nouvelle pathologie<Icon name="next" /></button>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- export PDF */
async function exportRecord(s: Session): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const date = new Date()
  let y = 18
  const need = (h: number) => { if (y + h > 282) { doc.addPage(); y = 18 } }
  const text = (t: string, x = 15, size = 10.5, bold = false, color: number | [number, number, number] = 20) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); if (typeof color === 'number') doc.setTextColor(color); else doc.setTextColor(...color); const ls = doc.splitTextToSize(clean(t), 195 - x); for (const l of ls) { need(5.5); doc.text(l, x, y); y += size * 0.5 } }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(clean(`Dossier patient - ${s.patientLabel}`), 15, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(90); doc.text(clean(`Édité le ${fmtDate(date.getTime(), true)}`), 195, y, { align: 'right' }); y += 10
  const p = s.profile ?? {}
  const age = ageOf(p)
  const facts = [age !== null && `${age} ans`, p.dominant && (p.dominant === 'D' ? 'droitier' : 'gaucher'), p.job, p.sport].filter(Boolean).join(' · ')
  if (facts) text(facts)
  if (p.alerts) { y += 1; text(`À surveiller : ${p.alerts}`, 15, 10.5, true, [160, 50, 30]) }
  if (p.history) text(`Antécédents : ${p.history}`)
  if (p.meds) text(`Traitements : ${p.meds}`)
  const eps = [...(s.episodes ?? [])].sort((a, b) => b.start - a.start)
  for (const e of eps) {
    y += 5; need(40)
    doc.setDrawColor(colorOf(e)); doc.setLineWidth(1.2); doc.line(15, y - 4, 15, y + 2)
    text(`${pathologyById(e.pathologyId)?.label ?? nameOf(e)}${e.side ? ` (${sideOf(e.side)})` : ''}`, 18, 13, true)
    text(`${STATUS_LABEL[e.status]} · du ${fmtDate(e.start, true)}${e.end ? ` au ${fmtDate(e.end, true)}` : ' à aujourd\'hui'} · ${e.visits.length} séance(s)`, 18, 9.5, false, 90)
    if (e.motif) text(`Motif : ${e.motif}`, 18)
    if (e.rx?.count || e.rx?.doctor) text(`Ordonnance : ${e.rx.doctor ?? 'médecin non précisé'}${e.rx.date ? `, ${new Date(e.rx.date).toLocaleDateString('fr-CH')}` : ''}${e.rx.count ? `, ${e.rx.count} séances (${rxLeft(e)} restantes)` : ''}`, 18)
    for (const d of e.diagHistory) text(`Diagnostic précédent : ${pathologyById(d.pathologyId)?.label ?? '-'} (jusqu'au ${fmtDate(d.at)})${d.reason ? ` - ${d.reason}` : ''}`, 18, 9.5, false, 90)
    // courbe de douleur
    const vs = [...e.visits].sort((a, b) => a.at - b.at)
    if (vs.length > 1) {
      need(32); y += 2
      const X = 22, W = 120, H = 24, t0 = vs[0].at, t1 = vs[vs.length - 1].at
      doc.setDrawColor(200); doc.setLineWidth(0.2); doc.line(X, y, X + W, y); doc.line(X, y + H, X + W, y + H)
      doc.setFontSize(7); doc.setTextColor(120); doc.text('10', X - 4, y + 1); doc.text('0', X - 3, y + H + 1)
      doc.setDrawColor(colorOf(e)); doc.setLineWidth(0.7)
      const px = (t: number) => X + ((t - t0) / Math.max(1, t1 - t0)) * W, py = (v: number) => y + H - (v / 10) * H
      for (let i = 1; i < vs.length; i++) doc.line(px(vs[i - 1].at), py(vs[i - 1].eva), px(vs[i].at), py(vs[i].eva))
      y += H + 6
    }
    for (const v of [...vs].reverse()) text(`${fmtDate(v.at)}  -  douleur ${v.eva}/10${v.phase ? `  -  ${PHASE_LABEL[v.phase]}` : ''}${v.note ? `  -  ${v.note}` : ''}`, 22, 9.5)
  }
  if (s.dossier?.notes) { y += 5; text('Notes', 15, 12, true); text(s.dossier.notes) }
  return savePdf(doc, `dossier-complet-${s.patientLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${date.toISOString().slice(0, 10)}.pdf`)
}
