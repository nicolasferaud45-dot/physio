// Coude et poignet droits (avant-bras en supination : paume vers l'avant).
import type { JointDef, V3 } from '../types'
import { band, near, skinLines } from './helpers'

const ELB: V3 = [-0.21, 1.052, 0.066]
const WR: V3 = [-0.252, 0.815, 0.113]
const LAT_EPI: V3 = [-0.243, 1.054, 0.062]

const HAND = ['right scaphoid', 'right lunate', 'right triquetral', 'right pisiform', 'right trapezium', 'right trapezoid', 'right capitate', 'right hamate',
  'right first metacarpal bone', 'right second metacarpal bone', 'right third metacarpal bone', 'right fourth metacarpal bone', 'right fifth metacarpal bone',
  'proximal phalanx of right thumb', 'distal phalanx of right thumb', 'proximal phalanx of right index finger', 'proximal phalanx of right middle finger', 'proximal phalanx of right ring finger', 'proximal phalanx of right little finger',
  'middle phalanx of right index finger', 'middle phalanx of right middle finger', 'middle phalanx of right ring finger', 'middle phalanx of right little finger',
  'distal phalanx of right index finger', 'distal phalanx of right middle finger', 'distal phalanx of right ring finger', 'distal phalanx of right little finger']

const FOREARM_MUSCLES = [
  { name: 'right extensor carpi radialis brevis', label: 'Court extenseur radial du carpe', simple: 'Muscle qui relève le poignet', group: 'extensor' as const, unit: 'epicondyliens' },
  { name: 'right extensor carpi radialis longus', label: 'Long extenseur radial du carpe', simple: 'Muscle qui relève le poignet', group: 'extensor' as const, unit: 'epicondyliens' },
  { name: 'right extensor digitorum', label: 'Extenseur des doigts', simple: 'Muscle qui relève les doigts', group: 'extensor' as const, unit: 'epicondyliens' },
  { name: 'right brachioradialis', label: 'Brachio-radial', simple: 'Muscle de l\'avant-bras', group: 'other' as const, unit: 'flechisseurs-coude' },
  { name: 'right flexor carpi radialis', label: 'Fléchisseur radial du carpe', simple: 'Muscle qui plie le poignet', group: 'flexor' as const, unit: 'epitrochleens' },
  { name: 'right palmaris longus', label: 'Long palmaire', simple: 'Muscle qui plie le poignet', group: 'flexor' as const, unit: 'epitrochleens' },
  { name: 'humeral head of right flexor carpi ulnaris', label: 'Fléchisseur ulnaire du carpe', simple: 'Muscle qui plie le poignet', group: 'flexor' as const, unit: 'epitrochleens' },
  { name: 'humeroulnar head of right flexor digitorum superficialis', label: 'Fléchisseur superficiel des doigts', simple: 'Muscle qui plie les doigts', group: 'flexor' as const, unit: 'epitrochleens' },
  { name: 'right flexor digitorum profundus', label: 'Fléchisseur profond des doigts', simple: 'Muscle qui plie les doigts', group: 'flexor' as const, unit: 'epitrochleens' },
]

export const ELBOW: JointDef = {
  skinLines: skinLines({ ravbras: 'forearm', rmain: 'hand' }),
  id: 'coude',
  label: 'Coude',
  dofs: [
    { id: 'wext', label: 'Relever le poignet', min: -60, max: 60, rest: 0 },
    { id: 'flex', label: 'Plier le coude', min: 0, max: 145, rest: 0 },
  ],
  bones: [
    { name: 'right humerus', seg: 'fixed', label: 'Humérus', simple: 'Os du bras', anchor: [-0.2, 1.15, 0.07] },
    { name: 'right radius', seg: 'forearm', label: 'Radius', simple: 'Os de l\'avant-bras (côté pouce)', anchor: [-0.26, 0.93, 0.1] },
    { name: 'right ulna', seg: 'forearm', label: 'Ulna (cubitus)', simple: 'Os de l\'avant-bras', anchor: [-0.215, 0.95, 0.07] },
    ...HAND.map((name) => ({ name, seg: 'hand', label: '', simple: '' })),
  ],
  muscles: [
    ...FOREARM_MUSCLES,
    { name: 'long head of right biceps brachii', label: 'Biceps', simple: 'Biceps', group: 'other', unit: 'flechisseurs-coude' },
    { name: 'right brachialis', label: 'Brachial', simple: 'Muscle qui plie le coude', group: 'other', unit: 'flechisseurs-coude' },
    { name: 'lateral head of right triceps brachii', label: 'Triceps', simple: 'Muscle de derrière le bras', group: 'other', unit: 'triceps' },
  ],
  units: [
    { id: 'epicondyliens', label: 'Extenseurs du poignet (épicondyliens)', simple: 'Muscles qui relèvent le poignet' },
    { id: 'epitrochleens', label: 'Fléchisseurs du poignet', simple: 'Muscles qui plient le poignet' },
    { id: 'flechisseurs-coude', label: 'Fléchisseurs du coude', simple: 'Muscles qui plient le coude' },
    { id: 'triceps', label: 'Triceps', simple: 'Muscle qui tend le coude' },
  ],
  extraMuscles: ['short head of right biceps brachii', 'medial head of right triceps brachii', 'long head of right triceps brachii', 'right anconeus', 'right supinator', 'humeral head of right pronator teres', 'right extensor indicis', 'right pronator quadratus', 'right flexor pollicis longus'],
  segments: [
    { id: 'forearm', pivot: ELB, axis: [-1, 0, 0], dof: 'flex' },
    { id: 'hand', parent: 'forearm', pivot: WR, axis: [1, 0, 0], dof: 'wext' },
  ],
  blend: [
    { from: 'forearm', seg: 'hand', center: WR, dir: [0, 1, 0], band: 0.015, inRegion: (x, y) => x < -0.15 && y < 0.84 },
    { seg: 'forearm', center: ELB, dir: [0, 1, 0], band: 0.03, inRegion: (x, y) => x < -0.15 && y < 1.15 },
  ],
  cartilage: [
    { bone: 'right humerus', test: (_x, y) => y < 1.06 },
    { bone: 'right ulna', test: near([-0.205, 1.048, 0.062], 0.014) },
    { bone: 'right radius', test: (_x, y) => y > 1.036 },
  ],
  ligaments: [
    { id: 'tendon-epicondylien', label: 'Tendon commun des épicondyliens', simple: 'Tendon du coude (côté extérieur)', a: { seg: 'fixed', p: LAT_EPI }, b: { seg: 'forearm', p: [-0.255, 1.02, 0.075] }, width: 0.012, thick: 0.003, kind: 'tendon' },
    { id: 'collateral-lat', label: 'Ligament collatéral latéral', simple: 'Ligament de l\'extérieur du coude', a: { seg: 'fixed', p: [-0.242, 1.05, 0.066] }, b: { seg: 'forearm', p: [-0.243, 1.03, 0.07] }, width: 0.008 },
  ],
  customs: [],
  actions: { increasing: 'extensor', decreasing: 'extensor', hold: 'extensor' },
  camera: { pos: [-0.8, 1.05, 0.55], target: [-0.235, 0.98, 0.08], fov: 30, frame: [0.3, 0.38] },
  arc: { radius: 0.1, offset: [-0.04, 0, 0] },
  clip: { minY: 0.68, maxY: 1.22 },
  pathologies: {
    epicondylalgie: {
      damaged: ['tendon-epicondylien', 'right extensor carpi radialis brevis'],
      friction: [{ id: 'f-epi', label: 'TENDON SURCHARGÉ', at: { seg: 'fixed', p: LAT_EPI }, window: [10, 60], arrow: [0, -1, 0] }],
      painZone: [10, 60], suffers: ['Tendon des muscles qui relèvent le poignet, à son attache sur le coude'], works: ['Extenseurs du poignet : ils tirent sur leur attache'], todo: 'Isométrie pour calmer, puis renforcement progressif des extenseurs.',
      caption: 'Épicondylalgie latérale : tendinopathie du court extenseur radial du carpe, douleur à l\'extension contrariée du poignet.',
      simpleCaption: 'Le tendon qui relève le poignet tire sur l\'os du coude : saisir et soulever fait mal.',
    },
  },
}

export const WRIST: JointDef = {
  skinLines: skinLines({ rmain: 'hand' }),
  id: 'poignet',
  label: 'Poignet',
  dofs: [{ id: 'flex', label: 'Plier le poignet', min: -70, max: 75, rest: 0 }],
  bones: [
    { name: 'right radius', seg: 'fixed', label: 'Radius', simple: 'Os de l\'avant-bras (côté pouce)', anchor: [-0.265, 0.86, 0.105] },
    { name: 'right ulna', seg: 'fixed', label: 'Ulna', simple: 'Os de l\'avant-bras', anchor: [-0.23, 0.86, 0.09] },
    { name: 'right scaphoid', seg: 'hand', label: 'Scaphoïde', simple: 'Petit os du poignet', anchor: [-0.262, 0.807, 0.115] },
    { name: 'right lunate', seg: 'hand', label: 'Lunatum', simple: 'Petit os du poignet', anchor: [-0.245, 0.812, 0.117] },
    ...HAND.filter((n) => n !== 'right scaphoid' && n !== 'right lunate').map((name) => ({ name, seg: 'hand', label: '', simple: '' })),
  ],
  muscles: FOREARM_MUSCLES.filter((m) => m.unit !== 'flechisseurs-coude').map((m) => ({ ...m, group: m.group === 'extensor' ? 'extensor' as const : 'flexor' as const })),
  units: [
    { id: 'epicondyliens', label: 'Extenseurs du poignet', simple: 'Muscles qui relèvent le poignet' },
    { id: 'epitrochleens', label: 'Fléchisseurs du poignet et des doigts', simple: 'Muscles qui plient le poignet' },
  ],
  extraMuscles: ['right flexor pollicis longus', 'right pronator quadratus', 'right extensor indicis', 'right brachioradialis'],
  segments: [{ id: 'hand', pivot: WR, axis: [-1, 0, 0], dof: 'flex' }],
  blend: { seg: 'hand', center: WR, dir: [0, 1, 0], band: 0.014, inRegion: (x, y) => x < -0.15 && y < 0.9 },
  cartilage: [
    { bone: 'right radius', test: (_x, y) => y < 0.83 },
    { bone: 'right scaphoid', test: (_x, y) => y > 0.812 },
    { bone: 'right lunate', test: (_x, y) => y > 0.815 },
  ],
  ligaments: [],
  customs: [
    { id: 'retinaculum', label: 'Ligament annulaire du carpe', simple: 'Toit du canal carpien', seg: 'hand', kind: 'meniscus', build: () => band([[-0.268, 0.8, 0.13], [-0.255, 0.8, 0.137], [-0.242, 0.8, 0.13]], 0.026, 0.0025) },
    { id: 'fracture', label: 'Trait de fracture', simple: 'Fracture', seg: 'fixed', kind: 'implant', only: ['fracture-radius'], build: () => band([[-0.282, 0.838, 0.1], [-0.27, 0.836, 0.12], [-0.25, 0.835, 0.122]], 0.004, 0.003) },
  ],
  actions: { increasing: 'flexor', decreasing: 'extensor', hold: 'flexor' },
  camera: { pos: [-0.65, 0.88, 0.62], target: [-0.255, 0.8, 0.115], fov: 30, frame: [0.2, 0.26] },
  arc: { radius: 0.09, offset: [-0.04, 0, 0] },
  clip: { minY: 0.6, maxY: 0.98 },
  pathologies: {
    'canal-carpien': {
      damaged: ['retinaculum'],
      friction: [{ id: 'f-cc', label: 'COMPRESSION DU NERF MÉDIAN', at: { seg: 'hand', p: [-0.255, 0.805, 0.128] }, window: [35, 75], arrow: [0, 0, -1] }],
      painZone: [40, 75], suffers: ['Nerf médian, écrasé dans le canal'], works: ['Fléchisseurs des doigts : leurs tendons passent dans le canal'], todo: 'Éviter les flexions prolongées (attelle de nuit), glissements nerveux doux.',
      caption: 'Syndrome du canal carpien : compression du nerf médian, majorée en flexion de poignet.',
      simpleCaption: 'Le nerf du poignet est à l\'étroit : plier le poignet l\'écrase et les doigts fourmillent.',
    },
    'fracture-radius': {
      rom: [-40, 45], damaged: ['fracture'],
      painZone: [30, 45], suffers: ['Radius en consolidation', 'Articulation raide après le plâtre'], works: ['Muscles de l\'avant-bras'], todo: 'Regagner la mobilité puis la force de préhension, pas à pas.',
      caption: 'Fracture du radius distal consolidée : raideur en flexion-extension après immobilisation.',
      simpleCaption: 'L\'os s\'est réparé, mais le poignet est raide après le plâtre.',
    },
  },
}
