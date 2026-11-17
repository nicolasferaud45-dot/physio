import { useCallback, useEffect, useRef, useState } from 'react'
import type { Equipment, Phase, RegionId } from '../data/catalog'
import type { Prescription } from '../engine/plan'
import type { AiAnalysis } from '../engine/claude'

export type PresentView = 'compare' | 'normal' | 'patho'
export type Screen = 'situation' | 'presentation' | 'exercises' | 'share'

export interface Session {
  id: string
  createdAt: number
  /** clé du suivi patient (lien remis) */
  shareKey?: string
  done?: boolean
  patientLabel: string
  screen: Screen
  region: RegionId | null
  side: 'D' | 'G' | null
  pathologyId: string | null
  phase: Phase | null
  eva: number
  irritability: 0 | 1 | 2
  goals: string[]
  equipment: Equipment[]
  minutesPerDay: number | null
  redFlagsCleared: boolean
  program: Prescription[]
  prompt: string
  /** analyse Claude du dernier prompt (identifiants validés) */
  ai?: AiAnalysis | null
  presentation: { sick: boolean; vulgar: boolean; layers: Record<'bones' | 'joint' | 'muscles' | 'nerves', boolean>; view?: PresentView; panel?: boolean }
  captures: string[]
  savedAt: number
}

export const emptySession = (): Session => ({
  id: Math.random().toString(36).slice(2, 10),
  createdAt: Date.now(),
  patientLabel: 'Patient',
  screen: 'situation',
  region: null, side: null, pathologyId: null, phase: null, eva: 5, irritability: 1,
  goals: [], equipment: [], minutesPerDay: null, redFlagsCleared: false, program: [], prompt: '',
  presentation: { sick: true, vulgar: true, layers: { bones: true, joint: true, muscles: true, nerves: false }, view: 'compare', panel: true },
  captures: [],
  savedAt: Date.now(),
})

const OLD_KEY = 'physio.session.v1'
const PATIENTS_KEY = 'physio.patients.v1'
const TEMPLATES_KEY = 'physio.templates.v1'

function migrate(x: Partial<Session>): Session {
  const s = { ...emptySession(), ...x } as Session
  if ((s.screen as string) === 'home' || (s.screen as string) === 'context') s.screen = 'situation'
  return s
}
function loadAll(): Session[] {
  try {
    const raw = localStorage.getItem(PATIENTS_KEY)
    if (raw) return (JSON.parse(raw) as Partial<Session>[]).map(migrate)
    const old = localStorage.getItem(OLD_KEY)
    if (old) return [migrate(JSON.parse(old))]
  } catch { /* stockage indisponible */ }
  return []
}

/** Patients suivis sur cette tablette, avec sauvegarde automatique continue (ERG-5.1). */
export function usePatients() {
  const [all, setAll] = useState<Session[]>(loadAll)
  const [currentId, setCurrentId] = useState<string | null>(() => { try { return sessionStorage.getItem('physio.current') } catch { return null } })
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try { localStorage.setItem(PATIENTS_KEY, JSON.stringify(all)) } catch {
        // quota dépassé (captures) : on enregistre sans les images
        try { localStorage.setItem(PATIENTS_KEY, JSON.stringify(all.map((x) => ({ ...x, captures: [] })))) } catch { /* ignore */ }
      }
    }, 250)
  }, [all])
  useEffect(() => { try { if (currentId) sessionStorage.setItem('physio.current', currentId); else sessionStorage.removeItem('physio.current') } catch { /* ignore */ } }, [currentId])
  const current = all.find((x) => x.id === currentId) ?? null
  const update = useCallback((patch: Partial<Session> | ((s: Session) => Partial<Session>)) => {
    setAll((list) => list.map((x) => (x.id === currentId ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch), savedAt: Date.now() } : x)))
  }, [currentId])
  const create = useCallback((label?: string) => {
    const n = emptySession()
    setAll((list) => {
      if (!label) { let k = list.length + 1; while (list.some((x) => x.patientLabel === `Patient ${k}`)) k++; n.patientLabel = `Patient ${k}` } else n.patientLabel = label
      return [n, ...list]
    })
    setCurrentId(n.id)
  }, [])
  const remove = useCallback((id: string) => setAll((list) => list.filter((x) => x.id !== id)), [])
  const open = useCallback((id: string | null) => {
    // Un patient rouvert repart côté praticien (jamais directement sur un écran tourné vers le patient)
    if (id) setAll((list) => list.map((x) => (x.id === id && (x.screen === 'presentation' || x.screen === 'share') ? { ...x, screen: 'exercises' } : x)))
    setCurrentId(id)
  }, [])
  return { all, current, update, create, remove, open }
}

/** Clé courte de suivi (même appareil en démo ; serveur en version finale). */
export function shareKeyOf(code: string) {
  let h = 5381
  for (let i = 0; i < code.length; i++) h = ((h << 5) + h + code.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}
export interface LogEntry { date: string; done: string[]; pain: number | null; note?: string }
export function loadLog(key: string): LogEntry[] { try { return JSON.parse(localStorage.getItem(`physio.log.${key}`) ?? '[]') } catch { return [] } }
export function saveLog(key: string, log: LogEntry[]) { try { localStorage.setItem(`physio.log.${key}`, JSON.stringify(log)) } catch { /* ignore */ } }

export interface Template { name: string; program: Prescription[] }
export function loadTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? '[]') } catch { return [] }
}
export function saveTemplate(t: Template) {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify([...loadTemplates().filter((x) => x.name !== t.name), t])) } catch { /* ignore */ }
}

/** Passeport patient encodé dans le lien (aucune donnée nominative). */
export interface PassportData {
  v: 1
  pathologyId: string | null
  side: 'D' | 'G' | null
  goals: string[]
  program: Prescription[]
  date: string
}
export function encodePassport(d: PassportData) {
  // Format compact pour un QR code lisible : tableaux plutôt qu'objets
  const c = [d.v, d.pathologyId ?? '', d.side ?? '', d.goals, d.date,
    d.program.map((p) => [p.exerciseId, p.sets, p.reps ?? '', p.holdSec ?? '', p.restSec, p.freq, p.maxPain])]
  const json = JSON.stringify(c)
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function decodePassport(code: string): PassportData | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
    const [v, pathologyId, side, goals, date, prog] = JSON.parse(decodeURIComponent(escape(atob(b64))))
    const num = (x: number | '') => (x === '' ? null : x)
    return {
      v, pathologyId: pathologyId || null, side: side || null, goals, date,
      program: (prog as [string, number, number | '', number | '', number, string, number][]).map(([exerciseId, sets, reps, hold, restSec, freq, maxPain]) => ({
        exerciseId, sets, reps: num(reps), holdSec: num(hold), restSec, freq, maxPain,
      })),
    }
  } catch { return null }
}
