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
// Indices de symptômes (mots du patient) → pathologies probables
const HINTS: [RegExp, Record<string, number>][] = [
  [/lev\w* (le |les )?bras|bras en l air|au dessus de la tete|attraper|etagere/, { conflit: 9, 'tendinopathie-coiffe': 7, bursite: 5, 'tendinopathie-calcifiante': 3 }],
  [/nuit|dormir|couche/, { 'tendinopathie-coiffe': 3, capsulite: 4, 'canal-carpien': 3, bursite: 2, 'tendinopathie-fessiers': 3 }],
  [/bloque|raide|ne monte plus|gele/, { capsulite: 10, coxarthrose: 3, gonarthrose: 3, cervicalgie: 3 }],
  [/deboite|luxation|sort de/, { 'instabilite-epaule': 12 }],
  [/chute|tombe|force/, { 'rupture-coiffe': 3, 'fracture-radius': 4, 'entorse-lle': 3 }],
  [/escalier|accroupi|cinema|assis longtemps|rotule/, { sfp: 9, 'tendinopathie-rotulienne': 3 }],
  [/saut|basket|volley|sauter/, { 'tendinopathie-rotulienne': 9, 'tendinopathie-achilleenne': 3 }],
  [/lache|pivot|craque|derobe/, { lca: 8, menisque: 6 }],
  [/coince|bloquage|blocage/, { menisque: 7 }],
  [/fourmi|engourdi|picote|decharge/, { 'canal-carpien': 7, 'nevralgie-cervicobrachiale': 5, lombosciatique: 4 }],
  [/descend dans la jambe|sciati|jusqu au pied|dans la fesse/, { lombosciatique: 12, 'stenose-lombaire': 4 }],
  [/descend dans le bras|jusqu a la main|dans les doigts/, { 'nevralgie-cervicobrachiale': 12, 'canal-carpien': 3 }],
  [/jambes lourdes|en marchant|perimetre de marche/, { 'stenose-lombaire': 9 }],
  [/premiers pas|le matin au lever|sous le talon|talon/, { 'fasciopathie-plantaire': 10, 'tendinopathie-achilleenne': 3 }],
  [/achille|course|courir|footing/, { 'tendinopathie-achilleenne': 7, sfp: 2 }],
  [/tordu|torsion|entorse/, { 'entorse-lle': 9, 'entorse-lli': 5, 'entorse-cervicale': 3 }],
  [/tennis|clavier|souris|visser|serrer|porter un sac/, { epicondylalgie: 9 }],
  [/coup du lapin|accident de voiture|choc/, { 'entorse-cervicale': 10 }],
  [/ordinateur|ecran|tete penchee|torticolis/, { cervicalgie: 8 }],
  [/aine|croiser les jambes|mettre ses chaussettes/, { 'conflit-femoro-acetabulaire': 6, coxarthrose: 6 }],
  [/cote de la hanche|couche sur le cote|trochanter/, { 'tendinopathie-fessiers': 10 }],
  [/sprint|claquage|arriere de la cuisse/, { 'lesion-ischios': 10 }],
  [/prothese/, { pth: 6, ptg: 6 }],
  [/arthrose|usure/, { gonarthrose: 6, coxarthrose: 6 }],
  [/lumbago|tour de rein|bas du dos|reins/, { lombalgie: 9 }],
]

export function interpretLocal(raw: string): Interpretation {
  const t = normalize(raw)
  const out: Interpretation = {
    text: raw, pathologyId: null, candidates: [], region: null, side: null, phase: null, eva: null,
    equipment: [], goals: [], minutesPerDay: null, wantsExercises: /exercice|programme|renfo|etirement/.test(t), missing: [],
  }

  // Région d'abord : elle départage les pathologies
  for (const r of REGIONS) if (r.keywords.some((k) => hasWord(t, normalize(k)))) { out.region = r.id; break }

  // Score par pathologie : synonymes trouvés + indices de symptômes, pénalité si autre région
  const score = new Map<string, number>()
  for (const p of PATHOLOGIES) {
    let sc = 0
    for (const syn of [p.label, ...p.synonyms]) { const sn = normalize(syn); if (sn.length > 2 && t.includes(sn)) sc = Math.max(sc, sn.length) }
    for (const [re, boosts] of HINTS) if (re.test(t) && boosts[p.id]) sc += boosts[p.id]
    if (out.region && p.region !== out.region) sc *= sc > 14 ? 0.6 : 0.15
    if (sc > 0) score.set(p.id, sc)
  }
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1])
  if (ranked.length && ranked[0][1] >= 8 && (!ranked[1] || ranked[0][1] >= ranked[1][1] * 1.25)) out.pathologyId = ranked[0][0]
  if (!out.region && out.pathologyId) out.region = PATHOLOGIES.find((p) => p.id === out.pathologyId)!.region
  {
    const pool = out.region ? PATHOLOGIES.filter((p) => p.region === out.region).map((p) => p.id) : ranked.map(([id]) => id)
    out.candidates = pool.filter((id) => id !== out.pathologyId).sort((a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0))
    if (!out.pathologyId && out.candidates.length === 1) { out.pathologyId = out.candidates[0]; out.candidates = [] }
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
