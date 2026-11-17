// Rachis lombaire et cervical (les deux côtés). Chaque vertèbre prend une part du mouvement.
import type { BlendRule, JointDef, SegmentDef, V3 } from '../types'
import { ellipsoid } from './helpers'

interface Level { seg: string; bone: string; pivot: V3; ratio: number; rot?: number; mid: number }

/** Chaîne de vertèbres : segments emboîtés + règles de mélange entre vertèbres voisines. */
function chain(levels: Level[], flexAxis: V3, lowMid: number, region: (x: number, y: number, z: number) => boolean) {
  const segments: SegmentDef[] = levels.map((l, i) => ({
    id: l.seg, parent: i ? levels[i - 1].seg : undefined, pivot: l.pivot, axis: flexAxis, dof: 'flex', ratio: l.ratio,
    alt: [{ dof: 'side', axis: [0, 0, 1], ratio: l.ratio }, ...(l.rot !== undefined ? [{ dof: 'rot', axis: [0, 1, 0] as V3, ratio: l.rot }] : [])],
  }))
  const blend: BlendRule[] = levels.map((l, i) => {
    const lo = i ? levels[i - 1].mid : lowMid, hi = l.mid
    return { from: i ? levels[i - 1].seg : undefined, seg: l.seg, center: l.pivot, dir: [0, -1, 0], band: 0.008, inRegion: (x: number, y: number, z: number) => y >= lo && y < hi && region(x, y, z) }
  })
  const top = levels[levels.length - 1]
  blend.push({ from: top.seg, seg: top.seg, center: top.pivot, dir: [0, -1, 0], band: 0.01, inRegion: (x, y, z) => y >= top.mid && region(x, y, z) })
  return { segments, blend }
}

// ------------------------------------------------------------------ LOMBAIRE
const LUMB: Level[] = [
  { seg: 'L5', bone: 'fifth lumbar vertebra', pivot: [0, 0.919, 0.081], ratio: 0.24, mid: 0.938 },
  { seg: 'L4', bone: 'fourth lumbar vertebra', pivot: [0, 0.953, 0.091], ratio: 0.22, mid: 0.97 },
  { seg: 'L3', bone: 'third lumbar vertebra', pivot: [0, 0.985, 0.097], ratio: 0.2, mid: 0.998 },
  { seg: 'L2', bone: 'second lumbar vertebra', pivot: [0, 1.02, 0.095], ratio: 0.18, mid: 1.027 },
  { seg: 'L1', bone: 'first lumbar vertebra', pivot: [0, 1.051, 0.091], ratio: 0.16, mid: 1.056 },
  { seg: 'T12', bone: 'twelfth thoracic vertebra', pivot: [0, 1.082, 0.085], ratio: 0.08, mid: 1.09 },
]
const lc = chain(LUMB, [1, 0, 0], 0.86, (x, y) => Math.abs(x) < 0.22 && y > 0.78)

export const LUMBAR: JointDef = {
  id: 'lombaire',
  label: 'Bas du dos',
  bilateral: true,
  dofs: [
    { id: 'flex', label: 'Se pencher en avant', min: -25, max: 60, rest: 0 },
    { id: 'side', label: 'Se pencher sur le côté', min: -30, max: 30, rest: 0 },
  ],
  bones: [
    { name: 'sacrum', seg: 'fixed', label: 'Sacrum', simple: 'Bas de la colonne', anchor: [0, 0.86, 0.02] },
    { name: 'right hip bone', seg: 'fixed', label: 'Bassin', simple: 'Bassin', anchor: [-0.12, 0.9, 0.06] },
    ...LUMB.map((l) => ({ name: l.bone, seg: l.seg, label: l.bone.startsWith('twelfth') ? '' : `Vertèbre ${l.seg}`, simple: l.bone.startsWith('twelfth') ? '' : `Vertèbre ${l.seg}`, anchor: l.seg === 'L4' || l.seg === 'L1' ? [0.03, l.pivot[1] + 0.02, 0.04] as V3 : undefined })),
    { name: 'right eleventh rib', seg: 'T12', label: '', simple: '' },
    { name: 'right twelfth rib', seg: 'T12', label: '', simple: '' },
  ],
  discs: ['intervertebral disk of first lumbar vertebra', 'intervertebral disk of second lumbar vertebra', 'intervertebral disk of third lumbar vertebra', 'intervertebral disk of fourth lumbar vertebra', 'intervertebral disk of fifth lumbar vertebra', 'intervertebral disk of twelfth thoracic vertebra'],
  muscles: [
    { name: 'right multifidus', label: 'Multifides', simple: 'Petits muscles profonds du dos', group: 'extensor', unit: 'profonds' },
    { name: 'right longissimus thoracis', label: 'Longissimus', simple: 'Muscles du dos', group: 'extensor', unit: 'erecteurs' },
    { name: 'right iliocostalis lumborum', label: 'Ilio-costal', simple: 'Muscles du dos', group: 'extensor', unit: 'erecteurs' },
    { name: 'right quadratus lumborum', label: 'Carré des lombes', simple: 'Muscle du côté du dos', group: 'other', unit: 'carre' },
    { name: 'right psoas major', label: 'Grand psoas', simple: 'Muscle profond devant la colonne', group: 'flexor', unit: 'psoas' },
    { name: 'right rectus abdominis', label: 'Grand droit de l\'abdomen', simple: 'Abdominaux', group: 'flexor', unit: 'abdos' },
    { name: 'right transversus abdominis', label: 'Transverse', simple: 'Ceinture abdominale', group: 'flexor', unit: 'abdos' },
  ],
  units: [
    { id: 'erecteurs', label: 'Érecteurs du rachis', simple: 'Muscles du dos' },
    { id: 'profonds', label: 'Multifides', simple: 'Petits muscles profonds du dos' },
    { id: 'carre', label: 'Carré des lombes', simple: 'Muscle du côté du dos' },
    { id: 'psoas', label: 'Psoas', simple: 'Muscle profond devant la colonne' },
    { id: 'abdos', label: 'Abdominaux', simple: 'Abdominaux' },
  ],
  extraMuscles: ['right lumbar rotator', 'right iliacus', 'right internal oblique', 'right gluteus medius'],
  segments: lc.segments,
  blend: lc.blend,
  cartilage: [],
  ligaments: [],
  customs: [
    { id: 'hernie', label: 'Hernie discale L4-L5', simple: 'Disque qui déborde', seg: 'L4', kind: 'bursa', only: ['lombosciatique'], build: () => ellipsoid([-0.012, 0.952, 0.064], [0.009, 0.006, 0.006], 16) },
    { id: 'canal', label: 'Canal rachidien rétréci', simple: 'Canal du nerf rétréci', seg: 'L4', kind: 'bursa', only: ['stenose-lombaire'], build: () => ellipsoid([0, 0.955, 0.052], [0.012, 0.02, 0.006], 16) },
  ],
  actions: { increasing: 'extensor', decreasing: 'extensor', hold: 'extensor' },
  camera: { pos: [-0.78, 1.08, -0.35], target: [0, 0.98, 0.07], fov: 30, frame: [0.34, 0.42] },
  arc: { radius: 0.16, offset: [0.07, 0.03, 0] },
  clip: { minY: 0.78, maxY: 1.2 },
  pathologies: {
    lombalgie: {
      friction: [{ id: 'f-lomb', label: 'MUSCLES CONTRACTÉS', at: { seg: 'L3', p: [-0.03, 0.99, 0.0] }, window: [35, 60], arrow: [0, 1, 0] }],
      painZone: [35, 60], suffers: ['Muscles et articulations du bas du dos (sans lésion grave)'], works: ['Muscles du dos : ils freinent la descente'], todo: 'Rester actif, bouger souvent, reprendre progressivement : le dos est solide.',
      caption: 'Lombalgie commune : sensibilisation des tissus lombaires, appréhension en flexion.',
      simpleCaption: 'Le dos est douloureux mais solide : bouger aide à guérir.',
    },
    lombosciatique: {
      damaged: ['hernie', 'intervertebral disk of fourth lumbar vertebra'],
      friction: [{ id: 'f-rac', label: 'COMPRESSION DE LA RACINE L5', at: { seg: 'L4', p: [-0.014, 0.952, 0.058] }, window: [25, 60], arrow: [1, 0, 0] }],
      painZone: [25, 60], suffers: ['Racine du nerf L5, pincée par le disque'], works: ['Muscles du dos'], todo: 'Positions qui soulagent la jambe, mouvements doux, puis renforcement.',
      caption: 'Hernie discale L4-L5 postéro-latérale comprimant la racine L5, majorée en flexion.',
      simpleCaption: 'Le disque déborde et appuie sur le nerf : la douleur descend dans la jambe.',
    },
    'stenose-lombaire': {
      damaged: ['canal'],
      friction: [{ id: 'f-sten', label: 'CANAL RÉTRÉCI', at: { seg: 'L4', p: [0, 0.955, 0.05] }, window: [-25, -5], arrow: [0, 0, 1] }],
      painZone: [-25, -5], suffers: ['Nerfs à l\'étroit dans le canal'], works: ['Muscles du dos'], todo: 'Les flexions soulagent : vélo, marche penchée, renforcement des abdominaux.',
      caption: 'Sténose canalaire : rétrécissement majoré en extension, soulagé en flexion.',
      simpleCaption: 'Le canal des nerfs est étroit : se cambrer serre, se pencher en avant soulage.',
    },
  },
}

// ------------------------------------------------------------------ CERVICAL
const CERV: Level[] = [
  { seg: 'C7', bone: 'seventh cervical vertebra', pivot: [0, 1.383, 0.077], ratio: 0.08, rot: 0.04, mid: 1.393 },
  { seg: 'C6', bone: 'sixth cervical vertebra', pivot: [0, 1.397, 0.083], ratio: 0.14, rot: 0.07, mid: 1.406 },
  { seg: 'C5', bone: 'fifth cervical vertebra', pivot: [0, 1.411, 0.088], ratio: 0.16, rot: 0.08, mid: 1.42 },
  { seg: 'C4', bone: 'fourth cervical vertebra', pivot: [0, 1.426, 0.09], ratio: 0.15, rot: 0.08, mid: 1.433 },
  { seg: 'C3', bone: 'third cervical vertebra', pivot: [0, 1.442, 0.089], ratio: 0.13, rot: 0.08, mid: 1.446 },
  { seg: 'C2', bone: 'axis', pivot: [0, 1.457, 0.089], ratio: 0.1, rot: 0.08, mid: 1.465 },
  { seg: 'C1', bone: 'atlas', pivot: [0, 1.47, 0.085], ratio: 0.08, rot: 0.5, mid: 1.48 },
  { seg: 'tete', bone: 'occipital bone', pivot: [0, 1.488, 0.082], ratio: 0.16, rot: 0.07, mid: 1.492 },
]
const cc = chain(CERV, [1, 0, 0], 1.36, (x, y) => Math.abs(x) < 0.2 && y > 1.33)
const SKULL = ['frontal bone', 'sphenoid bone', 'right temporal bone', 'right parietal bone', 'right zygomatic bone', 'right maxilla', 'right nasal bone', 'mandible']

export const CERVICAL: JointDef = {
  id: 'cervical',
  label: 'Cou',
  bilateral: true,
  dofs: [
    { id: 'rot', label: 'Tourner la tête', min: -80, max: 80, rest: 0 },
    { id: 'flex', label: 'Pencher la tête en avant', min: -55, max: 50, rest: 0 },
    { id: 'side', label: 'Pencher la tête sur le côté', min: -40, max: 40, rest: 0 },
  ],
  bones: [
    { name: 'first thoracic vertebra', seg: 'fixed', label: '', simple: '' },
    { name: 'right clavicle', seg: 'fixed', label: '', simple: '' },
    { name: 'right first rib', seg: 'fixed', label: '', simple: '' },
    { name: 'manubrium', seg: 'fixed', label: '', simple: '' },
    ...CERV.map((l) => ({ name: l.bone, seg: l.seg, label: l.seg === 'tete' ? 'Crâne' : l.seg === 'C2' ? 'Axis (C2)' : l.seg === 'C1' ? 'Atlas (C1)' : (l.seg === 'C5' || l.seg === 'C7') ? `Vertèbre ${l.seg}` : '', simple: l.seg === 'tete' ? 'Crâne' : l.seg === 'C5' || l.seg === 'C7' ? `Vertèbre ${l.seg}` : '', anchor: l.seg === 'C5' || l.seg === 'C7' ? [0.02, l.pivot[1] + 0.012, 0.04] as V3 : l.seg === 'tete' ? [0, 1.58, 0.05] as V3 : undefined })),
    ...SKULL.map((name) => ({ name, seg: 'tete', label: '', simple: '' })),
  ],
  discs: ['intervertebral disk of third cervical vertebra', 'intervertebral disk of fourth cervical vertebra', 'intervertebral disk of fifth cervical vertebra', 'intervertebral disk of sixth cervical vertebra', 'intervertebral disk of seventh cervical vertebra', 'intervertebral disk of axis'],
  muscles: [
    { name: 'right sternocleidomastoid', label: 'Sterno-cléido-mastoïdien', simple: 'Muscle du devant du cou', group: 'flexor', unit: 'scm' },
    { name: 'descending part of right trapezius', label: 'Trapèze supérieur', simple: 'Muscle du haut des épaules', group: 'extensor', unit: 'trapeze' },
    { name: 'right levator scapulae', label: 'Élévateur de la scapula', simple: 'Muscle du côté du cou', group: 'extensor', unit: 'trapeze' },
    { name: 'right splenius capitis', label: 'Splénius de la tête', simple: 'Muscles de la nuque', group: 'extensor', unit: 'nuque' },
    { name: 'right semispinalis capitis', label: 'Semi-épineux de la tête', simple: 'Muscles de la nuque', group: 'extensor', unit: 'nuque' },
    { name: 'right scalenus anterior', label: 'Scalène antérieur', simple: 'Muscles du côté du cou', group: 'other', unit: 'scalenes' },
    { name: 'right scalenus medius', label: 'Scalène moyen', simple: 'Muscles du côté du cou', group: 'other', unit: 'scalenes' },
    { name: 'right longus capitis', label: 'Long de la tête', simple: 'Muscles profonds du cou', group: 'flexor', unit: 'profonds' },
    { name: 'vertical intermediate part of right longus colli', label: 'Long du cou', simple: 'Muscles profonds du cou', group: 'flexor', unit: 'profonds' },
  ],
  units: [
    { id: 'scm', label: 'Sterno-cléido-mastoïdien', simple: 'Muscle du devant du cou' },
    { id: 'trapeze', label: 'Trapèze et élévateur', simple: 'Muscles du haut des épaules' },
    { id: 'nuque', label: 'Muscles de la nuque', simple: 'Muscles de la nuque' },
    { id: 'scalenes', label: 'Scalènes', simple: 'Muscles du côté du cou' },
    { id: 'profonds', label: 'Fléchisseurs profonds', simple: 'Muscles profonds du cou' },
  ],
  extraMuscles: ['right splenius cervicis', 'right semispinalis cervicis', 'right longissimus capitis', 'right scalenus posterior', 'right rectus capitis posterior major', 'right obliquus capitis inferior'],
  segments: cc.segments,
  blend: cc.blend,
  cartilage: [],
  ligaments: [],
  customs: [
    { id: 'foramen', label: 'Foramen C5-C6 rétréci', simple: 'Sortie du nerf rétrécie', seg: 'C6', kind: 'bursa', only: ['nevralgie-cervicobrachiale'], build: () => ellipsoid([-0.022, 1.402, 0.07], [0.006, 0.006, 0.006], 16) },
  ],
  actions: { increasing: 'other', decreasing: 'other', hold: 'other' },
  camera: { pos: [-0.62, 1.5, 0.55], target: [0, 1.45, 0.07], fov: 30, frame: [0.3, 0.34] },
  arc: { radius: 0.13, offset: [0, 0.16, 0] },
  clip: { minY: 1.3, maxY: 1.72 },
  pathologies: {
    cervicalgie: {
      damaged: ['descending part of right trapezius'],
      friction: [{ id: 'f-cerv', label: 'TENSION DES MUSCLES', at: { seg: 'C4', p: [-0.03, 1.43, 0.03] }, window: [45, 80], arrow: [0, 1, 0] }],
      painZone: [45, 80], suffers: ['Muscles et petites articulations du cou'], works: ['Muscles de la nuque', 'Sterno-cléido-mastoïdien'], todo: 'Bouger le cou souvent, renforcer les muscles profonds, adapter le poste de travail.',
      caption: 'Cervicalgie commune : raideur et douleur en fin de rotation.',
      simpleCaption: 'Le cou est raide et tendu : il tourne moins loin sans douleur.',
    },
    'nevralgie-cervicobrachiale': {
      motion: 'side', damaged: ['foramen', 'intervertebral disk of fifth cervical vertebra'],
      friction: [{ id: 'f-c6', label: 'COMPRESSION DE LA RACINE C6', at: { seg: 'C6', p: [-0.022, 1.402, 0.07] }, window: [-40, -15], arrow: [1, 0, 0] }],
      painZone: [-40, -15], suffers: ['Racine du nerf C6, à sa sortie du cou'], works: ['Scalènes', 'Trapèze'], todo: 'Positions qui soulagent le bras, glissements nerveux, renforcement du cou.',
      caption: 'Névralgie cervicobrachiale C6 : fermeture du foramen en inclinaison homolatérale.',
      simpleCaption: 'Le nerf est pincé à sa sortie du cou : la douleur descend dans le bras.',
    },
    'entorse-cervicale': {
      motion: 'flex',
      friction: [{ id: 'f-wl', label: 'TISSUS ÉTIRÉS', at: { seg: 'C5', p: [0, 1.418, 0.03] }, window: [30, 50], arrow: [0, 1, 0] }],
      painZone: [30, 50], suffers: ['Ligaments et muscles du cou étirés par le choc'], works: ['Muscles de la nuque'], todo: 'Reprendre les mouvements tôt et progressivement, sans collier prolongé.',
      caption: 'Entorse cervicale (coup du lapin) : tissus mous mis en tension, mobilité à récupérer.',
      simpleCaption: 'Le choc a étiré les tissus du cou : bouger doucement aide à guérir.',
    },
  },
}
