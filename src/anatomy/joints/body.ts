// Corps entier (statique) : sert à expliquer les compensations.
import type { JointDef } from '../types'
import { BODY_BONES, BODY_DISCS, BODY_MUSCLES, BODY_TENDONS } from './body-parts'

export const BODY: JointDef = {
  id: 'corps',
  label: 'Corps',
  bilateral: true,
  dofs: [{ id: 'none', label: '', min: 0, max: 1, rest: 0 }],
  bones: BODY_BONES.map((name) => ({ name, seg: 'fixed', label: '', simple: '' })),
  muscles: BODY_MUSCLES.map((name) => ({ name, label: name, simple: name, group: 'other' as const })),
  units: [],
  tendons: BODY_TENDONS,
  discs: BODY_DISCS,
  segments: [],
  blend: { seg: 'fixed', center: [0, 0, 0], dir: [0, 1, 0], band: 0.01, inRegion: () => false },
  cartilage: [],
  ligaments: [],
  customs: [],
  actions: { increasing: 'other', decreasing: 'other', hold: 'other' },
  camera: { pos: [-0.9, 1.05, 2.3], target: [0, 0.86, 0.07], fov: 30, frame: [0.75, 1.78] },
  arc: { radius: 0 },
  pathologies: {},
}
