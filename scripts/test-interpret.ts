import { interpretLocal } from '../src/engine/interpret'
import { suggestProgram } from '../src/engine/plan'
const cases = [
  'capsulite épaule droite, phase douloureuse, sans matériel, veut reprendre la natation',
  'bursite épaule, douleur 6',
  'entorse cheville, footballeur, élastique',
  'exercices lombaires sans matériel 10 min',
  'douleur épaule gauche depuis 3 mois EVA 4/10',
  'épaule gelée',
  'tendinite rotulienne basket',
]
for (const c of cases) {
  const r = interpretLocal(c)
  const prog = suggestProgram({ region: r.region, pathologyId: r.pathologyId, phase: r.phase, equipment: r.equipment, minutesPerDay: r.minutesPerDay })
  console.log(c, '\n  ->', JSON.stringify({ p: r.pathologyId, cand: r.candidates, reg: r.region, side: r.side, ph: r.phase, eva: r.eva, eq: r.equipment, goals: r.goals, min: r.minutesPerDay, miss: r.missing }), '\n  prog:', prog.map(p=>p.exerciseId).join(', '))
}
