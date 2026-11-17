import { EXERCISES, type Equipment, type Exercise, type Phase, type RegionId } from '../data/catalog'

export interface Prescription {
  exerciseId: string
  sets: number
  reps: number | null
  holdSec: number | null
  restSec: number
  freq: string
  maxPain: number
}

export const phaseToPlanStep = (p: Phase | null): 1 | 2 | 3 =>
  p === 'subaigue' || p === 'chronique' ? 2 : 1

export interface FilterContext {
  region: RegionId | null
  pathologyId: string | null
  phase: Phase | null
  equipment: Equipment[]
  minutesPerDay: number | null
}

/** Exercices compatibles avec le contexte + ceux exclus (pour l'afficher au praticien). */
export function filterExercises(ctx: FilterContext) {
  const step = phaseToPlanStep(ctx.phase)
  const eq = ctx.equipment.length ? ctx.equipment : (['aucun', 'elastique', 'halteres', 'baton'] as Equipment[])
  const inRegion = EXERCISES.filter((e) => !ctx.region || e.region === ctx.region)
  const inPhase = inRegion.filter((e) => e.phases.includes(step))
  const ok = inPhase.filter((e) => eq.includes(e.equipment))
  const excluded = inPhase.filter((e) => !eq.includes(e.equipment))
  const score = (e: Exercise) => (ctx.pathologyId && e.forPatho?.includes(ctx.pathologyId) ? 0 : 1)
  ok.sort((a, b) => score(a) - score(b))
  return { step, ok, excluded }
}

/** Suggestion de programme : exercices les plus indiqués, dans le temps disponible. */
export function suggestProgram(ctx: FilterContext, maxCount = 3): Prescription[] {
  const { ok } = filterExercises(ctx)
  const budget = ctx.minutesPerDay ?? 15
  const out: Prescription[] = []
  let total = 0
  for (const e of ok) {
    if (out.length >= maxCount) break
    if (total + e.minutes > budget && out.length > 0) continue
    total += e.minutes
    out.push(defaultPrescription(e))
  }
  return out
}

export function defaultPrescription(e: Exercise): Prescription {
  return { exerciseId: e.id, sets: e.sets, reps: e.reps, holdSec: e.holdSec, restSec: e.restSec, freq: e.freq, maxPain: 3 }
}

export function formatDose(p: Prescription) {
  const hold = p.holdSec ? (p.holdSec >= 120 ? `${Math.round(p.holdSec / 60)} min` : `${p.holdSec} s`) : ''
  if (p.reps && p.holdSec) return `${p.sets} × ${p.reps} · tenir ${hold}`
  if (p.reps) return `${p.sets} × ${p.reps}`
  return `${p.sets} × ${hold}`
}
