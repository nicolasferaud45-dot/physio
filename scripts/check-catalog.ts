import { EXERCISES, PATHOLOGIES } from '../src/data/catalog'
import { MOTIONS } from '../src/data/motions'
import { SOURCES } from '../src/data/sources'
const ids = new Set(PATHOLOGIES.map((p) => p.id))
console.log('pathologies', PATHOLOGIES.length, 'exercices', EXERCISES.length, 'animations', Object.keys(MOTIONS).length)
console.log('sans animation:', EXERCISES.filter((e) => !MOTIONS[e.id]).map((e) => e.id))
console.log('forPatho inconnus:', EXERCISES.flatMap((e) => (e.forPatho ?? []).filter((p) => !ids.has(p)).map((p) => `${e.id}->${p}`)))
console.log('sources inconnues:', PATHOLOGIES.flatMap((p) => p.sources.filter((s) => !SOURCES.find((x) => x.id === s))))
console.log('pathos sans exercice:', PATHOLOGIES.filter((p) => !EXERCISES.some((e) => e.forPatho?.includes(p.id))).map((p) => p.id))
