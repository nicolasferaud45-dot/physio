// Analyse d'un prompt praticien par Claude (compte de la personne qui ouvre l'artifact).
// L'application envoie le prompt + un résumé du catalogue validé ; Claude doit répondre en JSON
// strict en ne citant QUE des identifiants du catalogue. Tout identifiant inconnu est retiré.
// Hors artifact, sans consentement ou en cas d'erreur : on garde l'interprétation locale.
import { EXERCISES, GENERIC_GOALS, GOAL_SPORTS, PATHOLOGIES, REGIONS, type Equipment, type Phase, type RegionId } from '../data/catalog'
import { SOURCES } from '../data/sources'
import { interpretLocal, type Interpretation } from './interpret'

export interface AiAnalysis {
  /** synthèse clinique (vue praticien) */
  synthesis: string
  /** message en mots simples (vue patient) */
  patientMessage: string
  exercises: { id: string; why: string }[]
  vigilance: string[]
  questions: string[]
  sources: string[]
  at: number
}

type Sample = ((input: string, opts?: Record<string, unknown>) => Promise<{ text: string }>) & { json: (input: string, opts?: Record<string, unknown>) => Promise<unknown> }
let samplePromise: Promise<Sample | null> | null = null
export function getSample(): Promise<Sample | null> {
  const c = (window as unknown as { claude?: { use: (n: string) => Promise<unknown> } }).claude
  if (!c?.use) return Promise.resolve(null)
  samplePromise ??= c.use('sample').then((x) => (x as Sample) ?? null).catch(() => null)
  return samplePromise
}

const PHASES: Phase[] = ['aigue', 'subaigue', 'chronique', 'postop']
const EQUIP: Equipment[] = ['aucun', 'elastique', 'halteres', 'baton']
const ALL_GOALS = [...GENERIC_GOALS, ...Array.from(new Set(Object.values(GOAL_SPORTS)))]

function catalogDigest() {
  const p = PATHOLOGIES.map((x) => `${x.id} | ${x.label} | ${x.region} | syn: ${x.synonyms.slice(0, 5).join(', ')} | points: ${x.keyPoints.join(' ; ')} | drapeaux: ${x.redFlags.slice(0, 4).join(', ')} | sources: ${x.sources.join(',')}`).join('\n')
  const e = EXERCISES.map((x) => `${x.id} | ${x.name} | ${x.region} | phases ${x.phases.join('')} | ${x.equipment} | ${x.kind}${x.forPatho?.length ? ` | pour: ${x.forPatho.join(',')}` : ''}`).join('\n')
  const s = SOURCES.map((x) => `${x.id} | ${x.short}`).join('\n')
  return { p, e, s }
}

export function buildPrompt(text: string, local: Interpretation) {
  const d = catalogDigest()
  return `Tu assistes un physiothérapeute pendant sa consultation. Il a décrit la situation d'un patient. Ta réponse alimente une application : elle doit être exploitable telle quelle.

RÈGLES
- Réponds UNIQUEMENT par un objet JSON valide, sans texte autour.
- N'utilise QUE les identifiants des listes ci-dessous (pathologies, exercices, sources). N'invente aucune référence, aucun chiffre d'étude.
- Si l'information manque, mets null et ajoute une question courte dans "questions".
- Ne pose pas de diagnostic médical : propose l'hypothèse la plus cohérente du catalogue et signale les drapeaux rouges à écarter.
- Exercices : 2 à 4, de la même région, compatibles avec la phase (aigue/postop → phase 1, subaigue → 2, chronique → 2-3) et avec le matériel déclaré. Une phrase "why" chacun, liée à la pathologie.
- "synthesis" : 2 à 4 phrases pour le praticien, vocabulaire clinique, en s'appuyant sur les points clés des fiches.
- "patientMessage" : 2 phrases en mots simples, rassurantes et exactes, vouvoiement.
- "sources" : identifiants de la liste SOURCES qui soutiennent la synthèse (2 à 4).
- Français.

FORMAT
{"pathologyId": string|null, "candidates": string[], "region": ${REGIONS.map((r) => `"${r.id}"`).join('|')}|null, "side": "D"|"G"|null, "phase": ${PHASES.map((x) => `"${x}"`).join('|')}|null, "eva": 0-10|null, "equipment": (${EQUIP.map((x) => `"${x}"`).join('|')})[], "goals": string[] (parmi: ${ALL_GOALS.join(', ')}), "minutesPerDay": number|null, "synthesis": string, "patientMessage": string, "exercises": [{"id": string, "why": string}], "vigilance": string[], "questions": string[], "sources": string[]}

PATHOLOGIES (id | libellé | région | synonymes | points clés | drapeaux rouges | sources)
${d.p}

EXERCICES (id | nom | région | phases | matériel | type | indiqué pour)
${d.e}

SOURCES (id | référence)
${d.s}

PRÉ-ANALYSE LOCALE (mots-clés, peut être incomplète) : ${JSON.stringify({ pathologyId: local.pathologyId, candidates: local.candidates, region: local.region, side: local.side, phase: local.phase, eva: local.eva, equipment: local.equipment, goals: local.goals, minutesPerDay: local.minutesPerDay })}

DESCRIPTION DU PRATICIEN :
"""${text.replace(/"""/g, '"')}"""`
}

const str = (x: unknown, max = 600) => (typeof x === 'string' ? x.trim().slice(0, max) : '')
const strs = (x: unknown, n = 6) => (Array.isArray(x) ? x.map((y) => str(y, 240)).filter(Boolean).slice(0, n) : [])

/** Valide la réponse : tout ce qui n'est pas dans le catalogue est retiré. */
export function validate(raw: unknown, local: Interpretation): { interp: Interpretation; ai: AiAnalysis } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const pIds = new Set(PATHOLOGIES.map((p) => p.id))
  const pathologyId = typeof r.pathologyId === 'string' && pIds.has(r.pathologyId) ? r.pathologyId : local.pathologyId
  const patho = PATHOLOGIES.find((p) => p.id === pathologyId)
  const region = (patho?.region ?? (REGIONS.some((x) => x.id === r.region) ? r.region : local.region)) as RegionId | null
  const phase = PHASES.includes(r.phase as Phase) ? (r.phase as Phase) : local.phase
  const eva = typeof r.eva === 'number' && r.eva >= 0 && r.eva <= 10 ? Math.round(r.eva) : local.eva
  const equipment = Array.isArray(r.equipment) ? (r.equipment.filter((x) => EQUIP.includes(x as Equipment)) as Equipment[]) : local.equipment
  const goals = Array.isArray(r.goals) ? (r.goals.filter((g) => ALL_GOALS.includes(g as string)) as string[]) : local.goals
  const candidates = Array.isArray(r.candidates) ? (r.candidates.filter((c) => pIds.has(c as string)) as string[]) : local.candidates
  const minutes = typeof r.minutesPerDay === 'number' && r.minutesPerDay > 0 && r.minutesPerDay < 120 ? Math.round(r.minutesPerDay) : local.minutesPerDay
  const side = r.side === 'D' || r.side === 'G' ? r.side : local.side
  const interp: Interpretation = {
    ...local, pathologyId, region, phase, eva, equipment: equipment.length ? equipment : local.equipment, goals: goals.length ? goals : local.goals,
    candidates: pathologyId ? [] : candidates.length ? candidates : local.candidates, minutesPerDay: minutes, side, missing: [],
  }
  if (!interp.pathologyId && !interp.region) interp.missing.push('Pathologie ou région')
  if (interp.eva === null) interp.missing.push('Douleur EVA')
  if (!interp.phase) interp.missing.push('Phase clinique')
  const eqOk = (q: Equipment) => q === 'aucun' || !interp.equipment.length || interp.equipment.includes(q)
  const exOk = (id: string) => { const e = EXERCISES.find((x) => x.id === id); return !!e && (!region || e.region === region) && eqOk(e.equipment) }
  const exercises = (Array.isArray(r.exercises) ? r.exercises : [])
    .map((x) => (x && typeof x === 'object' ? { id: str((x as Record<string, unknown>).id, 60), why: str((x as Record<string, unknown>).why, 300) } : null))
    .filter((x): x is { id: string; why: string } => !!x && exOk(x.id)).slice(0, 5)
  const sources = strs(r.sources, 6).filter((id) => SOURCES.some((s) => s.id === id))
  return {
    interp,
    ai: { synthesis: str(r.synthesis, 900), patientMessage: str(r.patientMessage, 500), exercises, vigilance: strs(r.vigilance), questions: strs(r.questions, 4), sources: sources.length ? sources : patho?.sources.slice(0, 3) ?? [], at: Date.now() },
  }
}

export type AiResult = { ok: true; interp: Interpretation; ai: AiAnalysis } | { ok: false; reason: 'unavailable' | 'not_granted' | 'rate_limited' | 'error' }

export async function analyzeWithClaude(text: string, signal?: AbortSignal): Promise<AiResult> {
  const sample = await getSample()
  if (!sample) return { ok: false, reason: 'unavailable' }
  const local = interpretLocal(text)
  try {
    const raw = await sample.json(buildPrompt(text, local), { modelTier: 'default', signal })
    const { interp, ai } = validate(raw, local)
    return { ok: true, interp, ai }
  } catch (e) {
    const code = (e as { code?: string })?.code
    return { ok: false, reason: code === 'not_granted' ? 'not_granted' : code === 'rate_limited' ? 'rate_limited' : 'error' }
  }
}
