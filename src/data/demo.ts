// Trois dossiers FICTIFS pour essayer l'application. Aucune donnée réelle : noms « Patient test N »,
// profils marqués « fictif ». Dates calculées par rapport à aujourd'hui.
import { pathologyById, type Phase } from './catalog'
import { suggestProgram } from '../engine/plan'
import { emptySession, saveLog, type LogEntry, type Session } from '../state/session'
import type { Episode, Visit } from '../state/record'

const DAY = 864e5
const rid = () => Math.random().toString(36).slice(2, 10)
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)

function episode(pathologyId: string, side: 'D' | 'G' | null, phase: Phase, startDaysAgo: number, visits: Partial<Visit>[], extra: Partial<Episode> = {}): Episode {
  const p = pathologyById(pathologyId)!
  const now = Date.now()
  const program = suggestProgram({ region: p.region, pathologyId, phase, equipment: ['elastique'], minutesPerDay: 15 })
  return {
    id: rid(), region: p.region, side, pathologyId, phase, eva: visits[visits.length - 1]?.eva ?? 5, program,
    status: 'en-cours', start: now - startDaysAgo * DAY, diagHistory: [], events: [],
    visits: visits.map((v) => ({ id: rid(), eva: 5, phase, status: 'closed', nEx: program.length, programIds: program.map((x) => x.exerciseId), ...v, at: v.at ?? now })),
    ...extra,
  }
}
const ago = (d: number) => Date.now() - d * DAY

export function demoPatients(): Session[] {
  const now = Date.now()
  // 1 · épaule droite en cours, diagnostic réévalué, bons retours maison
  const e1 = episode('tendinopathie-calcifiante', 'D', 'subaigue', 40, [
    { at: ago(38), eva: 8, phase: 'aigue', explained: true, shared: true, feeling: undefined, clinic: ['Conseils', 'Éducation à la douleur'], note: 'Exemple fictif. Première séance : douleur nocturne, élévation limitée. Expliqué en 3D, programme remis.' },
    { at: ago(31), eva: 7, feeling: 'pareil', clinic: ['Mobilisation passive', 'Conseils'], note: 'Exemple fictif. Toujours des réveils la nuit.' },
    { at: ago(21), eva: 6, feeling: 'mieux', clinic: ['Mobilisation passive', 'Exercices supervisés'], note: 'Exemple fictif. Radiographie : calcification. Diagnostic réévalué.' },
    { at: ago(7), eva: 5, feeling: 'mieux', clinic: ['Mobilisation passive', 'Exercices supervisés'], next: '1s', note: 'Exemple fictif. Douleur nocturne moins fréquente. Garder le pendulaire, ajouter la rotation externe légère.' },
  ], {
    motif: 'Exemple fictif : douleur apparue après des travaux en hauteur, sans chute.',
    rx: { doctor: 'Dr Exemple (fictif)', date: iso(ago(40)), count: 9 },
    diagHistory: [{ pathologyId: 'conflit', side: 'D', at: ago(21), reason: 'Radiographie (exemple fictif)' }],
    events: [{ at: ago(21), kind: 'reeval', text: 'Radiographie (exemple fictif)' }],
  })
  const p1: Session = {
    ...emptySession(), id: 'demo-1', createdAt: ago(40), patientLabel: 'Patient test 1', demo: true,
    profile: { birthYear: new Date().getFullYear() - 58, job: 'Profession fictive (dossier de test)', sport: 'Tennis (fictif)', dominant: 'D', history: 'Exemple fictif : opération du genou gauche il y a 5 ans.', meds: 'Exemple fictif : anticoagulant', alerts: 'Exemple fictif : anticoagulant, pas de manipulation forte' },
    episodes: [e1], episodeId: e1.id, shareKey: 'demo1', done: true, screen: 'overview',
  }
  // 2 · genou gauche après reconstruction du LCA, douleur en hausse à la dernière séance
  const e2old = episode('entorse-lle', 'G', 'subaigue', 420, [
    { at: ago(418), eva: 6 }, { at: ago(410), eva: 4 }, { at: ago(400), eva: 2 },
  ], { status: 'termine', end: ago(400) })
  const e2 = episode('lca', 'G', 'postop', 20, [
    { at: ago(18), eva: 6, explained: true, shared: true, clinic: ['Mobilisation passive', 'Exercices supervisés'], note: 'Exemple fictif. J+15 après la reconstruction. Flexion 90°.' },
    { at: ago(11), eva: 5, feeling: 'mieux', clinic: ['Mobilisation passive', 'Exercices supervisés', 'Massage'], note: 'Exemple fictif. Flexion 105°.' },
    { at: ago(4), eva: 7, feeling: 'moins', clinic: ['Exercices supervisés', 'Conseils'], next: '3j', note: 'Exemple fictif. Gonflement après une longue marche. Réduire la charge, glace.' },
  ], { rx: { doctor: 'Dr Exemple (fictif)', date: iso(ago(20)), count: 18 } })
  const p2: Session = {
    ...emptySession(), id: 'demo-2', createdAt: ago(420), patientLabel: 'Patient test 2', demo: true,
    profile: { birthYear: new Date().getFullYear() - 27, job: 'Profession fictive (dossier de test)', sport: 'Football (fictif)', dominant: 'D' },
    episodes: [e2old, e2], episodeId: e2.id, done: true, screen: 'overview',
  }
  // 3 · bas du dos, ordonnance presque terminée, ancien épisode cervical
  const e3old = episode('cervicalgie', null, 'subaigue', 300, [{ at: ago(298), eva: 5 }, { at: ago(290), eva: 3 }], { status: 'termine', end: ago(285) })
  const e3 = episode('lombalgie', null, 'chronique', 60, Array.from({ length: 8 }, (_, i) => ({
    at: ago(58 - i * 7), eva: Math.max(2, 7 - Math.round(i * 0.7)), feeling: i ? 'mieux' as const : undefined,
    clinic: i ? ['Thérapie manuelle', 'Exercices supervisés'] : ['Éducation à la douleur', 'Conseils'],
    note: i === 7 ? 'Exemple fictif. Reprise du travail à temps plein. Prévoir le bilan final.' : 'Exemple fictif.',
  })), { rx: { doctor: 'Dr Exemple (fictif)', date: iso(ago(60)), count: 9 }, motif: 'Exemple fictif : douleur après un déménagement.' })
  const p3: Session = {
    ...emptySession(), id: 'demo-3', createdAt: ago(300), patientLabel: 'Patient test 3', demo: true,
    profile: { birthYear: new Date().getFullYear() - 44, job: 'Profession fictive (dossier de test)', dominant: 'G' },
    episodes: [e3old, e3], episodeId: e3.id, done: true, screen: 'overview',
  }
  for (const p of [p1, p2, p3]) {
    const ep = p.episodes!.find((e) => e.id === p.episodeId)!
    Object.assign(p, { region: ep.region, side: ep.side, pathologyId: ep.pathologyId, phase: ep.phase, eva: ep.eva, program: ep.program, redFlagsCleared: true, savedAt: now })
  }
  // retours fictifs du programme maison du patient test 1 (5 jours sur la dernière semaine)
  const log: LogEntry[] = [1, 2, 3, 5, 6].map((d) => ({ date: iso(ago(d)), done: e1.program.map((x) => x.exerciseId), pain: 3 }))
  saveLog('demo1', log)
  return [p1, p2, p3]
}
