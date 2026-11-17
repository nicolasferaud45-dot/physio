import {
  EXERCISES, GOAL_SPORTS, PATHOLOGIES, REGIONS,
  type Equipment, type Phase, type RegionId,
} from '../data/catalog'

/**
 * Résultat structuré d'un prompt praticien.
 * Le même format sera produit par un LLM (sortie JSON contrainte) dans la
 * version connectée : seul `interpret` change, pas l'interface.
 */
export interface Interpretation {
  text: string
  pathologyId: string | null
  candidates: string[]
  region: RegionId | null
  side: 'D' | 'G' | null
  phase: Phase | null
  eva: number | null
  equipment: Equipment[]
  goals: string[]
  minutesPerDay: number | null
  wantsExercises: boolean
  missing: string[]
}

export interface Interpreter {
  interpret(text: string): Promise<Interpretation>
}

export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`-]/g, ' ').replace(/\s+/g, ' ').trim()

const hasWord = (t: string, w: string) => new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(t)

/** Interpréteur local (hors-ligne) : mots-clés + synonymes. */
export function interpretLocal(raw: string): Interpretation {
  const t = normalize(raw)
  const out: Interpretation = {
    text: raw, pathologyId: null, candidates: [], region: null, side: null, phase: null, eva: null,
    equipment: [], goals: [], minutesPerDay: null, wantsExercises: /exercice|programme|renfo|etirement/.test(t), missing: [],
  }

  // Pathologie : on garde le synonyme le plus long trouvé (le plus spécifique)
  let best: { id: string; len: number } | null = null
  for (const p of PATHOLOGIES) {
    for (const syn of [p.label, ...p.synonyms]) {
      const s = normalize(syn)
      if (t.includes(s) && (!best || s.length > best.len)) best = { id: p.id, len: s.length }
    }
  }
  if (best) out.pathologyId = best.id

  // Région
  for (const r of REGIONS) if (r.keywords.some((k) => hasWord(t, normalize(k)))) { out.region = r.id; break }
  if (!out.region && out.pathologyId) out.region = PATHOLOGIES.find((p) => p.id === out.pathologyId)!.region
  if (!out.pathologyId && out.region) {
    out.candidates = PATHOLOGIES.filter((p) => p.region === out.region).map((p) => p.id)
    if (out.candidates.length === 1) { out.pathologyId = out.candidates[0]; out.candidates = [] }
  }

  // Côté
  if (/\b(droit|droite|dte)\b/.test(t) || /\b(epaule|genou|cheville|poignet) d\b/.test(t)) out.side = 'D'
  else if (/\b(gauche|gche)\b/.test(t) || /\b(epaule|genou|cheville|poignet) g\b/.test(t)) out.side = 'G'

  // Phase clinique
  if (/post ?op|opere|operation|chirurgi|suture|reparation/.test(t)) out.phase = 'postop'
  else if (/subaigu/.test(t)) out.phase = 'subaigue'
  else if (/aigu|douloureu|inflamm|recent|hier|cette semaine|phase 1/.test(t)) out.phase = 'aigue'
  else if (/chroniq|depuis (\d+ )?(mois|an)|persist|ancien/.test(t)) out.phase = 'chronique'
  else if (/raideur|enraidi|phase 2/.test(t)) out.phase = 'subaigue'

  // EVA
  const eva = t.match(/(?:eva|douleur|mal|en|vas)\s*(?:a|de|:)?\s*(\d{1,2})(?:\s*\/\s*10)?\b/) ?? t.match(/\b(\d{1,2})\s*\/\s*10\b/)
  if (eva) { const v = parseInt(eva[1], 10); if (v >= 0 && v <= 10) out.eva = v }

  // Matériel
  if (/sans materiel|pas de materiel|rien a la maison|aucun materiel|poids du corps/.test(t)) out.equipment = ['aucun']
  else {
    if (/elastique|theraband|bande/.test(t)) out.equipment.push('elastique')
    if (/haltere|poids|kettlebell/.test(t)) out.equipment.push('halteres')
    if (/baton|manche|canne/.test(t)) out.equipment.push('baton')
    if (out.equipment.length) out.equipment.unshift('aucun')
  }

  // Objectifs
  for (const [k, v] of Object.entries(GOAL_SPORTS)) {
    if (hasWord(t, k)) { const g = `Reprise sport · ${v}`; if (!out.goals.includes(g)) out.goals.push(g) }
  }
  if (/travail|bureau|ordinateur|chantier|metier/.test(t)) out.goals.push('Ergonomie au travail')
  if (/dormir|sommeil|nuit/.test(t)) out.goals.push('Dormir sans douleur')
  if (/autonomie|quotidien|s habiller|courses/.test(t)) out.goals.push('Autonomie quotidienne')

  // Temps disponible
  const min = t.match(/(\d{1,2})\s*(?:min|minutes?)\b/)
  if (min) out.minutesPerDay = parseInt(min[1], 10)

  if (!out.pathologyId && !out.region) out.missing.push('Pathologie ou région')
  if (out.eva === null) out.missing.push('Douleur EVA')
  if (!out.phase) out.missing.push('Phase clinique')
  return out
}

export const localInterpreter: Interpreter = {
  interpret: async (text) => interpretLocal(text),
}

// Vérification rapide que le catalogue d'exercices couvre chaque région citée
export const regionsWithExercises = new Set(EXERCISES.map((e) => e.region))
