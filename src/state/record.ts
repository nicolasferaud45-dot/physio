import type { Phase, RegionId } from '../data/catalog'
import type { Prescription } from '../engine/plan'
import type { Session } from './session'

/** Dossier patient : profil stable → épisodes de soin → séances. Tout reste sur l'appareil. */
export type EpisodeStatus = 'en-cours' | 'termine' | 'recidive'

export interface Profile {
  birthYear?: number
  job?: string
  sport?: string
  dominant?: 'D' | 'G'
  history?: string
  meds?: string
  /** contre-indications, précautions : affichées en rouge partout */
  alerts?: string
}
export interface DiagChange { pathologyId: string | null; side: 'D' | 'G' | null; at: number; reason?: string }
export interface EpisodeEvent { at: number; kind: 'reeval' | 'termine' | 'recidive' | 'reprise'; text?: string }
export interface Visit { id: string; at: number; eva: number; phase: Phase | null; note?: string; nEx?: number }
export interface Episode {
  id: string
  region: RegionId | null
  side: 'D' | 'G' | null
  pathologyId: string | null
  phase: Phase | null
  eva: number
  program: Prescription[]
  status: EpisodeStatus
  start: number
  end?: number
  motif?: string
  rx?: { doctor?: string; date?: string; count?: number }
  /** diagnostics précédents (réévaluations) : gardés barrés dans le dossier */
  diagHistory: DiagChange[]
  events: EpisodeEvent[]
  visits: Visit[]
}

const rid = () => Math.random().toString(36).slice(2, 10)
export const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10)
export const sameDay = (a: number, b: number) => dayKey(a) === dayKey(b)

export function newEpisode(s: Partial<Session> = {}, at = Date.now()): Episode {
  return {
    id: rid(), region: s.region ?? null, side: s.side ?? null, pathologyId: s.pathologyId ?? null, phase: s.phase ?? null,
    eva: s.eva ?? 5, program: s.program ?? [], status: 'en-cours', start: at, diagHistory: [], events: [], visits: [],
  }
}

/** Ancien format (un patient = une pathologie) → un épisode. */
export function ensureRecord(s: Session): Session {
  if (s.episodes?.length && s.episodes.some((e) => e.id === s.episodeId)) return s
  if (s.episodes?.length) return { ...s, episodeId: s.episodes[s.episodes.length - 1].id }
  const ep = newEpisode(s, s.createdAt)
  if (s.pathologyId) ep.visits.push({ id: rid(), at: s.savedAt, eva: s.eva, phase: s.phase, nEx: s.program.length })
  return { ...s, episodes: [ep], episodeId: ep.id }
}

export const currentEpisode = (s: Session) => s.episodes?.find((e) => e.id === s.episodeId) ?? null

/**
 * Après chaque modification : recopie l'état de travail dans l'épisode courant,
 * garde la trace des changements de diagnostic et enregistre la séance du jour.
 */
export function syncRecord(prev: Session, next: Session): Session {
  const s = ensureRecord(next)
  const ep0 = currentEpisode(s)
  if (!ep0) return s
  const now = Date.now()
  const ep: Episode = { ...ep0, diagHistory: [...ep0.diagHistory], events: [...ep0.events], visits: [...ep0.visits] }
  let diagMode = s.diagMode
  if (prev.episodeId === s.episodeId && prev.pathologyId && s.pathologyId && prev.pathologyId !== s.pathologyId) {
    // Réévaluation (on garde l'ancien diagnostic) ou simple correction de saisie
    const reeval = diagMode ? diagMode.kind === 'reeval' : ep.visits.some((v) => !sameDay(v.at, now))
    if (reeval) {
      ep.diagHistory.push({ pathologyId: prev.pathologyId, side: prev.side, at: now, reason: diagMode?.reason })
      ep.events.push({ at: now, kind: 'reeval', text: diagMode?.reason })
    }
    diagMode = undefined
  }
  ep.region = s.region; ep.side = s.side; ep.pathologyId = s.pathologyId; ep.phase = s.phase; ep.eva = s.eva; ep.program = s.program
  // une séance par jour, créée dès qu'on travaille sur l'épisode (pas depuis la vue d'ensemble)
  if (s.pathologyId && s.screen !== 'overview') {
    const i = ep.visits.findIndex((v) => sameDay(v.at, now))
    const v = { eva: s.eva, phase: s.phase, nEx: s.program.length }
    if (i >= 0) ep.visits[i] = { ...ep.visits[i], ...v }
    else ep.visits.push({ id: rid(), at: now, ...v })
    if (ep.status === 'termine') { ep.status = 'en-cours'; ep.end = undefined; ep.events.push({ at: now, kind: 'reprise' }) }
  }
  return { ...s, diagMode, episodes: s.episodes!.map((e) => (e.id === ep.id ? ep : e)) }
}

/** Charge un épisode dans l'état de travail (pathologie, côté, phase, programme). */
export function switchTo(s: Session, id: string): Partial<Session> {
  const ep = s.episodes?.find((e) => e.id === id)
  if (!ep) return {}
  return {
    episodeId: id, region: ep.region, side: ep.side, pathologyId: ep.pathologyId, phase: ep.phase, eva: ep.eva, program: ep.program,
    ai: null, prompt: '', redFlagsCleared: false, done: false, diagMode: undefined,
  }
}

export function startEpisode(s: Session): Partial<Session> {
  const ep = newEpisode({})
  return {
    episodes: [...(s.episodes ?? []), ep], episodeId: ep.id,
    region: null, side: null, pathologyId: null, phase: null, eva: 5, program: [], ai: null, prompt: '', redFlagsCleared: false, done: false,
    diagMode: undefined, screen: 'pathology',
  }
}

export function patchEpisode(s: Session, id: string, patch: Partial<Episode> | ((e: Episode) => Partial<Episode>)): Partial<Session> {
  return { episodes: (s.episodes ?? []).map((e) => (e.id === id ? { ...e, ...(typeof patch === 'function' ? patch(e) : patch) } : e)) }
}

/** Séances restantes sur l'ordonnance (séances faites depuis sa date). */
export function rxLeft(ep: Episode): number | null {
  if (!ep.rx?.count) return null
  const from = ep.rx.date ? new Date(ep.rx.date).getTime() : ep.start
  const done = ep.visits.filter((v) => v.at >= from - 864e5 / 2).length
  return Math.max(0, ep.rx.count - done)
}

export const REGION_COLOR: Record<RegionId, string> = {
  epaule: '#2E6FA3', coude: '#7A5BB5', poignet: '#B5579A', cervical: '#C27C2C',
  lombaire: '#B4483A', hanche: '#2F8A6B', genou: '#1F8FA6', cheville: '#6B8E23',
}
export const STATUS_LABEL: Record<EpisodeStatus, string> = { 'en-cours': 'En cours', termine: 'Terminé', recidive: 'Récidive' }
export const fmtDate = (t: number, long = false) => new Date(t).toLocaleDateString('fr-CH', long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: '2-digit' })
export const ageOf = (p?: Profile) => (p?.birthYear ? new Date().getFullYear() - p.birthYear : null)
