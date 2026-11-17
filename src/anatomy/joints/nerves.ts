// Trajets nerveux (tracés le long de leur parcours anatomique, entre les vrais os et muscles).
import type { NerveDef, V3 } from '../types'
import { KNEE } from './knee'
import { SHOULDER } from './shoulder'
import { HIP, ANKLE } from './lower'
import { ELBOW, WRIST } from './upper'
import { LUMBAR, CERVICAL } from './spine'

const P = (seg: string, p: V3) => ({ seg, p })

KNEE.nerves = [
  { id: 'tibial', label: 'Nerf tibial', simple: 'Nerf de derrière le genou', area: 'tibial', points: [P('thigh', [-0.078, 0.58, 0.04]), P('thigh', [-0.077, 0.48, 0.034]), P('leg', [-0.078, 0.4, 0.03]), P('leg', [-0.077, 0.32, 0.036]), P('leg', [-0.073, 0.22, 0.042])] },
  { id: 'fibulaire', label: 'Nerf fibulaire commun', simple: 'Nerf qui contourne le péroné', area: 'fibulaire', points: [P('thigh', [-0.098, 0.52, 0.036]), P('thigh', [-0.116, 0.445, 0.04]), P('leg', [-0.129, 0.392, 0.054]), P('leg', [-0.125, 0.365, 0.078]), P('leg', [-0.117, 0.335, 0.095])] },
]
ANKLE.nerves = [
  { id: 'tibial', label: 'Nerf tibial (canal tarsien)', simple: 'Nerf de l\'intérieur de la cheville', area: 'plantaire', points: [P('fixed', [-0.06, 0.2, 0.045]), P('fixed', [-0.052, 0.09, 0.046]), P('foot', [-0.049, 0.045, 0.052]), P('foot', [-0.06, 0.015, 0.085]), P('foot', [-0.07, 0.008, 0.13])] },
  { id: 'fibulaire-sup', label: 'Nerf fibulaire superficiel', simple: 'Nerf du dessus du pied', area: 'fibulaire', points: [P('fixed', [-0.12, 0.2, 0.072]), P('fixed', [-0.106, 0.1, 0.095]), P('foot', [-0.09, 0.056, 0.11]), P('foot', [-0.08, 0.042, 0.15])] },
]
HIP.nerves = [
  { id: 'sciatique', label: 'Nerf sciatique', simple: 'Grand nerf de la jambe', area: 'sciatique', radius: 0.0045, points: [P('fixed', [-0.055, 0.88, 0.02]), P('fixed', [-0.088, 0.83, 0.008]), P('fixed', [-0.1, 0.785, 0.02]), P('thigh', [-0.1, 0.72, 0.036]), P('thigh', [-0.095, 0.62, 0.04]), P('thigh', [-0.09, 0.53, 0.036])] },
  { id: 'femoral', label: 'Nerf fémoral', simple: 'Nerf de devant de la cuisse', area: 'L4', points: [P('fixed', [-0.06, 0.92, 0.1]), P('fixed', [-0.08, 0.845, 0.128]), P('thigh', [-0.086, 0.765, 0.13]), P('thigh', [-0.082, 0.68, 0.13])] },
]
SHOULDER.nerves = [
  { id: 'suprascapulaire', label: 'Nerf suprascapulaire', simple: 'Nerf du dessus de l\'omoplate', area: 'suprascapulaire', points: [P('fixed', [-0.05, 1.4, 0.08]), P('scap', [-0.1, 1.362, 0.06]), P('scap', [-0.12, 1.347, 0.036]), P('scap', [-0.135, 1.31, 0.02])] },
  { id: 'axillaire', label: 'Nerf axillaire', simple: 'Nerf du moignon de l\'épaule', area: 'axillaire', points: [P('fixed', [-0.08, 1.335, 0.1]), P('scap', [-0.13, 1.292, 0.06]), P('arm', [-0.165, 1.276, 0.042]), P('arm', [-0.19, 1.27, 0.06]), P('arm', [-0.2, 1.27, 0.085])] },
]
const elbowN: NerveDef[] = [
  { id: 'radial', label: 'Nerf radial', simple: 'Nerf de l\'extérieur du coude', area: 'radial', points: [P('fixed', [-0.2, 1.2, 0.055]), P('fixed', [-0.236, 1.12, 0.07]), P('fixed', [-0.246, 1.07, 0.08]), P('forearm', [-0.25, 1.03, 0.09]), P('forearm', [-0.255, 0.98, 0.087])] },
  { id: 'ulnaire', label: 'Nerf ulnaire', simple: 'Nerf du « petit juif »', area: 'ulnaire', points: [P('fixed', [-0.186, 1.15, 0.05]), P('fixed', [-0.178, 1.06, 0.048]), P('forearm', [-0.19, 1.0, 0.06]), P('forearm', [-0.215, 0.9, 0.08]), P('forearm', [-0.232, 0.84, 0.105])] },
  { id: 'median', label: 'Nerf médian', simple: 'Nerf du milieu de l\'avant-bras', area: 'median', points: [P('fixed', [-0.196, 1.15, 0.09]), P('fixed', [-0.21, 1.07, 0.1]), P('forearm', [-0.226, 1.0, 0.105]), P('forearm', [-0.245, 0.9, 0.115]), P('hand', [-0.255, 0.81, 0.127])] },
]
ELBOW.nerves = elbowN
WRIST.nerves = [
  { id: 'median', label: 'Nerf médian', simple: 'Nerf du canal carpien', area: 'median', points: [P('fixed', [-0.245, 0.92, 0.112]), P('fixed', [-0.253, 0.84, 0.122]), P('hand', [-0.255, 0.81, 0.127]), P('hand', [-0.258, 0.785, 0.13]), P('hand', [-0.262, 0.76, 0.13])] },
  { id: 'ulnaire', label: 'Nerf ulnaire', simple: 'Nerf du côté du petit doigt', area: 'ulnaire', points: [P('fixed', [-0.228, 0.92, 0.105]), P('fixed', [-0.232, 0.84, 0.115]), P('hand', [-0.236, 0.8, 0.122]), P('hand', [-0.24, 0.77, 0.125])] },
]
LUMBAR.nerves = [
  { id: 'cauda', label: 'Queue de cheval', simple: 'Faisceau de nerfs dans le canal', area: 'cauda', radius: 0.0045, points: [P('T12', [0, 1.09, 0.046]), P('L2', [0, 1.03, 0.046]), P('L4', [0, 0.97, 0.046]), P('L5', [0, 0.93, 0.046]), P('fixed', [0, 0.88, 0.036])] },
  { id: 'L4', label: 'Racine L4', simple: 'Nerf L4', area: 'L4', mirror: true, points: [P('L3', [-0.005, 1.0, 0.048]), P('L4', [-0.018, 0.976, 0.05]), P('L4', [-0.032, 0.96, 0.062]), P('fixed', [-0.05, 0.92, 0.08]), P('fixed', [-0.062, 0.88, 0.085])] },
  { id: 'L5', label: 'Racine L5', simple: 'Nerf L5', area: 'L5', mirror: true, points: [P('L4', [-0.005, 0.966, 0.048]), P('L5', [-0.016, 0.945, 0.05]), P('L5', [-0.03, 0.925, 0.06]), P('fixed', [-0.045, 0.885, 0.068]), P('fixed', [-0.06, 0.85, 0.068])] },
  { id: 'S1', label: 'Racine S1', simple: 'Nerf S1', area: 'S1', mirror: true, points: [P('L5', [-0.005, 0.93, 0.046]), P('fixed', [-0.015, 0.9, 0.04]), P('fixed', [-0.03, 0.87, 0.034]), P('fixed', [-0.045, 0.84, 0.04])] },
]
const croot = (id: 'C5' | 'C6' | 'C7', dy: number, upper: string, lower: string): NerveDef => ({
  id, label: `Racine ${id}`, simple: `Nerf ${id}`, area: id, mirror: true,
  points: [P(upper, [-0.006, 1.41 + dy, 0.06]), P(lower, [-0.02, 1.405 + dy, 0.068]), P(lower, [-0.035, 1.4 + dy, 0.075]), P('fixed', [-0.055, 1.385 + dy * 0.6, 0.085]), P('fixed', [-0.085, 1.36, 0.09])],
})
CERVICAL.nerves = [croot('C5', 0.015, 'C4', 'C5'), croot('C6', 0, 'C5', 'C6'), croot('C7', -0.014, 'C6', 'C7')]

// pathologies concernées
LUMBAR.pathologies.lombosciatique.nerves = ['L5']
LUMBAR.pathologies['stenose-lombaire'].nerves = ['cauda']
CERVICAL.pathologies['nevralgie-cervicobrachiale'].nerves = ['C6']
WRIST.pathologies['canal-carpien'].nerves = ['median']
HIP.pathologies['lesion-ischios'].nerves = []
export {}
