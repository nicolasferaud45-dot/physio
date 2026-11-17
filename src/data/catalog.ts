// Catalogue clinique de l'application.
// ⚠️ Contenu rédigé à partir des recommandations citées (voir sources.ts), à faire relire et
// valider par des physiothérapeutes avant tout usage réel. L'IA ne fait que pointer vers ces fiches
// et les relier au contexte du patient : elle n'en invente pas.

export type RegionId = 'epaule' | 'coude' | 'poignet' | 'cervical' | 'lombaire' | 'hanche' | 'genou' | 'cheville'
export type Phase = 'aigue' | 'subaigue' | 'chronique' | 'postop'
export type Equipment = 'aucun' | 'elastique' | 'halteres' | 'baton'
export type Visual3D = 'conflit' | 'capsulite' | 'bursite' | null

export interface Region { id: RegionId; label: string; keywords: string[] }

export const REGIONS: Region[] = [
  { id: 'epaule', label: 'Épaule', keywords: ['epaule', 'epaules', 'coiffe', 'scapula', 'omoplate', 'deltoide'] },
  { id: 'coude', label: 'Coude', keywords: ['coude', 'coudes', 'epicondyle', 'avant bras'] },
  { id: 'poignet', label: 'Poignet / main', keywords: ['poignet', 'main', 'doigts', 'canal carpien', 'radius'] },
  { id: 'cervical', label: 'Cervicales', keywords: ['cervical', 'cervicales', 'cou', 'nuque'] },
  { id: 'lombaire', label: 'Rachis lombaire', keywords: ['lombaire', 'lombaires', 'lombalgie', 'dos', 'rachis', 'lumbago', 'reins'] },
  { id: 'hanche', label: 'Hanche / cuisse', keywords: ['hanche', 'hanches', 'aine', 'fessier', 'fesse', 'cuisse', 'ischio', 'ischios', 'trochanter'] },
  { id: 'genou', label: 'Genou', keywords: ['genou', 'genoux', 'rotule', 'menisque', 'lca', 'ligament croise'] },
  { id: 'cheville', label: 'Cheville / pied', keywords: ['cheville', 'pied', 'chevilles', 'talon', 'achille', 'voute plantaire'] },
]

export const PHASE_LABEL: Record<Phase, string> = {
  aigue: 'Aiguë', subaigue: 'Subaiguë', chronique: 'Chronique', postop: 'Post-opératoire',
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  aucun: 'Poids du corps', elastique: 'Élastique', halteres: 'Haltères', baton: 'Bâton / manche',
}

export interface Explanation { title: string; body: string }
export interface Pathology {
  id: string
  label: string
  region: RegionId
  short: string
  synonyms: string[]
  visual: Visual3D
  healthy: { simple: Explanation; tech: Explanation }
  sick: { simple: Explanation; tech: Explanation }
  redFlags: string[]
  phases: { title: string; weeks: string; content: string }[]
  /** points clés de prise en charge, tirés des sources citées */
  keyPoints: string[]
  /** identifiants de sources (sources.ts) */
  sources: string[]
  /** amplitude d'abduction max (degrés) pour l'animation 3D, épaule pathologique */
  sickRom?: number
}

export interface Exercise {
  id: string
  name: string
  region: RegionId
  phases: (1 | 2 | 3)[]
  equipment: Equipment
  kind: 'Mobilité' | 'Renforcement' | 'Souplesse' | 'Équilibre' | 'Posture' | 'Activité' | 'Neurodynamique'
  sets: number
  reps: number | null
  holdSec: number | null
  restSec: number
  freq: string
  minutes: number
  how: string
  safety: string
  /** pathologies pour lesquelles l'exercice est particulièrement indiqué */
  forPatho?: string[]
}

export { PATHOLOGIES } from './pathologies'
export { EXERCISES } from './exercises'
import { PATHOLOGIES } from './pathologies'
import { EXERCISES } from './exercises'

export const GOAL_SPORTS: Record<string, string> = {
  natation: 'natation', nage: 'natation', nager: 'natation', piscine: 'natation', crawl: 'natation',
  course: 'course à pied', courir: 'course à pied', running: 'course à pied', jogging: 'course à pied', coureur: 'course à pied', coureuse: 'course à pied',
  foot: 'football', football: 'football', footballeur: 'football', footballeuse: 'football',
  tennis: 'tennis', padel: 'padel', ski: 'ski', skieur: 'ski', velo: 'vélo', cyclisme: 'vélo', golf: 'golf', golfeur: 'golf',
  escalade: 'escalade', grimpe: 'escalade', basket: 'basket', handball: 'handball', volley: 'volley',
  yoga: 'yoga', musculation: 'musculation', crossfit: 'crossfit', danse: 'danse', randonnee: 'randonnée', rugby: 'rugby', hockey: 'hockey',
}

export const GENERIC_GOALS = ['Autonomie quotidienne', 'Ergonomie au travail', 'Dormir sans douleur', 'Marcher sans douleur']

export function pathologyById(id: string | null | undefined) {
  return PATHOLOGIES.find((p) => p.id === id) ?? null
}
export function exerciseById(id: string) {
  return EXERCISES.find((e) => e.id === id) ?? null
}
export function regionLabel(id: RegionId) {
  return REGIONS.find((r) => r.id === id)?.label ?? id
}
