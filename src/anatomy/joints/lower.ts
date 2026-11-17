// Hanche et cheville droites.
import type { JointDef, V3 } from '../types'
import { band, ellipsoid, near, ring } from './helpers'

// ------------------------------------------------------------------ HANCHE
const FH: V3 = [-0.083, 0.812, 0.09] // centre de la tête fémorale
const TROCH: V3 = [-0.142, 0.79, 0.08] // grand trochanter

export const HIP: JointDef = {
  id: 'hanche',
  label: 'Hanche',
  dofs: [
    { id: 'flex', label: 'Plier la hanche', min: -15, max: 120, rest: 0 },
    { id: 'abd', label: 'Écarter la jambe', min: -25, max: 45, rest: 0 },
    { id: 'rot', label: 'Rotation interne', min: -40, max: 40, rest: 0 },
  ],
  bones: [
    { name: 'right hip bone', seg: 'fixed', label: 'Os du bassin (coxal)', simple: 'Bassin', anchor: [-0.1, 0.92, 0.07] },
    { name: 'sacrum', seg: 'fixed', label: 'Sacrum', simple: 'Bas de la colonne', anchor: [0, 0.88, 0.02] },
    { name: 'right femur', seg: 'thigh', label: 'Fémur', simple: 'Os de la cuisse', anchor: [-0.1, 0.65, 0.09] },
    { name: 'fifth lumbar vertebra', seg: 'fixed', label: '', simple: '' },
  ],
  muscles: [
    { name: 'right gluteus maximus', label: 'Grand fessier', simple: 'Fessier', group: 'extensor', unit: 'fessiers' },
    { name: 'right gluteus medius', label: 'Moyen fessier', simple: 'Muscle du côté de la hanche', group: 'other', unit: 'moyen' },
    { name: 'right gluteus minimus', label: 'Petit fessier', simple: 'Muscle du côté de la hanche', group: 'other', unit: 'moyen' },
    { name: 'right tensor fasciae latae', label: 'Tenseur du fascia lata', simple: 'Muscle du côté de la hanche', group: 'flexor', unit: 'moyen' },
    { name: 'right iliacus', label: 'Iliaque', simple: 'Muscle qui plie la hanche', group: 'flexor', unit: 'psoas' },
    { name: 'right psoas major', label: 'Grand psoas', simple: 'Muscle qui plie la hanche', group: 'flexor', unit: 'psoas' },
    { name: 'right rectus femoris', label: 'Droit fémoral', simple: 'Muscle de devant de la cuisse', group: 'flexor', unit: 'quadri' },
    { name: 'right sartorius', label: 'Sartorius', simple: 'Muscle en écharpe', group: 'flexor', unit: 'quadri' },
    { name: 'right adductor longus', label: 'Long adducteur', simple: 'Muscle de l\'intérieur de la cuisse', group: 'other', unit: 'adducteurs' },
    { name: 'right adductor magnus', label: 'Grand adducteur', simple: 'Muscle de l\'intérieur de la cuisse', group: 'other', unit: 'adducteurs' },
    { name: 'right pectineus', label: 'Pectiné', simple: 'Muscle de l\'aine', group: 'flexor', unit: 'adducteurs' },
    { name: 'long head of right biceps femoris', label: 'Biceps fémoral', simple: 'Ischio-jambier', group: 'extensor', unit: 'ischios' },
    { name: 'right semitendinosus', label: 'Semi-tendineux', simple: 'Ischio-jambier', group: 'extensor', unit: 'ischios' },
    { name: 'right semimembranosus', label: 'Semi-membraneux', simple: 'Ischio-jambier', group: 'extensor', unit: 'ischios' },
    { name: 'right piriformis', label: 'Piriforme', simple: 'Muscle profond de la fesse', group: 'other', unit: 'piriforme' },
  ],
  units: [
    { id: 'fessiers', label: 'Grand fessier', simple: 'Fessier' },
    { id: 'moyen', label: 'Moyen et petit fessiers', simple: 'Muscles du côté de la hanche' },
    { id: 'psoas', label: 'Ilio-psoas', simple: 'Muscle qui plie la hanche' },
    { id: 'quadri', label: 'Droit fémoral et sartorius', simple: 'Muscles de devant' },
    { id: 'adducteurs', label: 'Adducteurs', simple: 'Muscles de l\'intérieur de la cuisse' },
    { id: 'ischios', label: 'Ischio-jambiers', simple: 'Muscles de derrière la cuisse' },
    { id: 'piriforme', label: 'Piriforme', simple: 'Muscle profond de la fesse' },
  ],
  extraMuscles: ['right adductor brevis', 'right gracilis', 'right obturator internus', 'right gemellus superior', 'right gemellus inferior', 'right quadratus femoris', 'right vastus lateralis', 'right vastus medialis', 'right vastus intermedius', 'right quadratus lumborum'],
  tendons: ['right iliotibial tract'],
  segments: [
    { id: 'thigh', pivot: FH, axis: [-1, 0, 0], dof: 'flex', alt: [{ dof: 'abd', axis: [0, 0, -1] }, { dof: 'rot', axis: [0, 1, 0] }] },
  ],
  blend: { seg: 'thigh', center: [FH[0], FH[1] - 0.03, FH[2]], dir: [0.3, 0.95, 0], band: 0.05, inRegion: (x, y) => x < -0.02 && y < 0.95 },
  cartilage: [
    { bone: 'right femur', test: near(FH, 0.027) },
    { bone: 'right hip bone', test: near(FH, 0.031) },
  ],
  ligaments: [
    { id: 'ilio-femoral', label: 'Ligament ilio-fémoral', simple: 'Ligament de devant de la hanche', a: { seg: 'fixed', p: [-0.098, 0.855, 0.125] }, b: { seg: 'thigh', p: [-0.12, 0.765, 0.11] }, width: 0.018, thick: 0.003 },
    { id: 'tendon-moyen-fessier', label: 'Tendon du moyen fessier', simple: 'Tendon du côté de la hanche', a: { seg: 'fixed', p: [-0.135, 0.86, 0.07] }, b: { seg: 'thigh', p: [-0.145, 0.8, 0.08] }, width: 0.02, thick: 0.004, kind: 'tendon' },
  ],
  customs: [
    { id: 'labrum', label: 'Labrum (bourrelet)', simple: 'Rebord de la cavité', seg: 'fixed', kind: 'meniscus', build: () => ring([-0.072, 0.818, 0.094], [-0.75, -0.35, 0.5], 0.026, 0.0028) },
    { id: 'bourse-troch', label: 'Bourse trochantérienne', simple: 'Coussin sur le côté de la hanche', seg: 'thigh', kind: 'bursa', build: () => ellipsoid([TROCH[0] - 0.01, TROCH[1], TROCH[2]], [0.004, 0.022, 0.018]) },
    { id: 'came', label: 'Bosse osseuse (effet came)', simple: 'Petite bosse de l\'os', seg: 'thigh', kind: 'implant', only: ['conflit-femoro-acetabulaire'], build: () => ellipsoid([-0.1, 0.808, 0.112], [0.009, 0.007, 0.006], 14) },
  ],
  actions: { increasing: 'flexor', decreasing: 'extensor', hold: 'other' },
  camera: { pos: [-0.85, 0.95, 0.7], target: [-0.09, 0.8, 0.09], fov: 30, frame: [0.4, 0.42] },
  arc: { radius: 0.2, offset: [-0.08, 0, 0] },
  clip: { minY: 0.5, maxY: 1.0 },
  pathologies: {
    coxarthrose: {
      rom: [0, 95], wear: [], damaged: ['labrum'],
      friction: [{ id: 'f-cox', label: 'FROTTEMENT / USURE', at: { seg: 'thigh', p: [-0.07, 0.832, 0.09] }, window: [0, 95], arrow: [0, 1, 0] }],
      painZone: [60, 95], suffers: ['Cartilage de la hanche, aminci'], works: ['Ilio-psoas', 'Fessiers'], todo: 'Garder la mobilité et renforcer les fessiers : la marche régulière nourrit le cartilage.',
      caption: 'Coxarthrose : pincement de l\'interligne, amplitude de flexion et de rotation interne réduite.',
      simpleCaption: 'Le cartilage de la hanche s\'use : la hanche plie moins et frotte.',
    },
    'tendinopathie-fessiers': {
      motion: 'abd', damaged: ['tendon-moyen-fessier', 'bourse-troch', 'right gluteus medius'],
      friction: [{ id: 'f-troch', label: 'COMPRESSION DU TENDON', at: { seg: 'thigh', p: [-0.15, 0.8, 0.08] }, window: [-25, -5], arrow: [1, 0, 0] }],
      painZone: [-25, -5], suffers: ['Tendon du moyen fessier, sur le côté de la hanche'], works: ['Moyen fessier'], todo: 'Éviter de croiser les jambes et de dormir sur ce côté, renforcer le moyen fessier.',
      caption: 'Tendinopathie glutéale : compression du tendon contre le grand trochanter en adduction.',
      simpleCaption: 'Le tendon sur le côté de la hanche est écrasé quand la jambe passe vers l\'intérieur.',
    },
    'conflit-femoro-acetabulaire': {
      rom: [0, 110], damaged: ['labrum', 'came'],
      friction: [{ id: 'f-cfa', label: 'CONFLIT / PINCEMENT', at: { seg: 'fixed', p: [-0.088, 0.83, 0.118] }, window: [85, 120], arrow: [0, 0, 1] }],
      painZone: [85, 110], suffers: ['Rebord de la cavité (labrum)'], works: ['Ilio-psoas'], todo: 'Travailler dans l\'amplitude confortable et renforcer la hanche.',
      caption: 'Conflit fémoro-acétabulaire : la came vient buter contre le labrum antérieur en flexion profonde.',
      simpleCaption: 'Une petite bosse de l\'os vient taper le rebord de la cavité quand on plie fort.',
    },
    pth: {
      rom: [0, 90], implant: ['right femur', 'right hip bone'],
      painZone: [80, 90], suffers: ['Muscles et cicatrice autour de la prothèse'], works: ['Fessiers', 'Quadriceps'], todo: 'Respecter les précautions des premières semaines, puis renforcer.',
      caption: 'Prothèse totale de hanche : tête et cotyle remplacés ; éviter flexion > 90° les premières semaines.',
      simpleCaption: 'La hanche a été remplacée : on évite de trop plier au début.',
    },
    'lesion-ischios': {
      damaged: ['long head of right biceps femoris'],
      painZone: [50, 90], suffers: ['Ischio-jambiers (déchirure)'], works: ['Ischio-jambiers : ils s\'étirent'], todo: 'Renforcer progressivement, en finissant par l\'excentrique (nordic).',
      caption: 'Lésion du biceps fémoral : douleur à l\'étirement en flexion de hanche genou tendu.',
      simpleCaption: 'Le muscle de derrière la cuisse est déchiré : il fait mal quand on l\'étire.',
    },
  },
}

// ------------------------------------------------------------------ CHEVILLE
const ANK: V3 = [-0.075, 0.057, 0.066]
const SUBT: V3 = [-0.077, 0.035, 0.06]

export const ANKLE: JointDef = {
  id: 'cheville',
  label: 'Cheville',
  dofs: [
    { id: 'flex', label: 'Remonter le pied', min: -45, max: 25, rest: 0 },
    { id: 'inv', label: 'Tourner le pied en dedans', min: -15, max: 35, rest: 0 },
  ],
  bones: [
    { name: 'right tibia', seg: 'fixed', label: 'Tibia', simple: 'Os de la jambe', anchor: [-0.06, 0.15, 0.08] },
    { name: 'right fibula', seg: 'fixed', label: 'Fibula (péroné)', simple: 'Petit os de la jambe', anchor: [-0.115, 0.12, 0.05] },
    { name: 'right talus', seg: 'foot', label: 'Talus', simple: 'Os de la cheville', anchor: [-0.074, 0.055, 0.075] },
    { name: 'right calcaneus', seg: 'foot', label: 'Calcanéus', simple: 'Os du talon', anchor: [-0.085, 0.015, 0.02] },
    ...['navicular bone of right foot', 'right cuboid bone', 'right medial cuneiform bone', 'right intermediate cuneiform bone', 'right lateral cuneiform bone',
      'right first metatarsal bone', 'right second metatarsal bone', 'right third metatarsal bone', 'right fourth metatarsal bone', 'right fifth metatarsal bone',
      'proximal phalanx of right big toe', 'distal phalanx of right big toe', 'proximal phalanx of right second toe', 'proximal phalanx of right third toe', 'proximal phalanx of right fourth toe', 'proximal phalanx of right little toe',
      'middle phalanx of right second toe', 'middle phalanx of right third toe', 'middle phalanx of right fourth toe', 'middle phalanx of right little toe',
      'distal phalanx of right second toe', 'distal phalanx of right third toe', 'distal phalanx of right fourth toe', 'distal phalanx of right little toe'].map((name) => ({ name, seg: 'foot', label: '', simple: '' })),
  ],
  muscles: [
    { name: 'medial head of right gastrocnemius', label: 'Gastrocnémien médial', simple: 'Mollet', group: 'extensor', unit: 'triceps' },
    { name: 'lateral head of right gastrocnemius', label: 'Gastrocnémien latéral', simple: 'Mollet', group: 'extensor', unit: 'triceps' },
    { name: 'right soleus', label: 'Soléaire', simple: 'Mollet (profond)', group: 'extensor', unit: 'triceps' },
    { name: 'right tibialis anterior', label: 'Tibial antérieur', simple: 'Muscle qui remonte le pied', group: 'flexor', unit: 'anterieurs' },
    { name: 'right extensor digitorum longus', label: 'Long extenseur des orteils', simple: 'Muscle qui remonte le pied', group: 'flexor', unit: 'anterieurs' },
    { name: 'right extensor hallucis longus', label: 'Long extenseur de l\'hallux', simple: 'Muscle qui remonte le gros orteil', group: 'flexor', unit: 'anterieurs' },
    { name: 'right fibularis longus', label: 'Long fibulaire', simple: 'Muscle qui protège la cheville', group: 'other', unit: 'fibulaires' },
    { name: 'right fibularis brevis', label: 'Court fibulaire', simple: 'Muscle qui protège la cheville', group: 'other', unit: 'fibulaires' },
    { name: 'right tibialis posterior', label: 'Tibial postérieur', simple: 'Muscle de la voûte', group: 'extensor', unit: 'profonds' },
    { name: 'right flexor digitorum longus', label: 'Long fléchisseur des orteils', simple: 'Muscle de la voûte', group: 'extensor', unit: 'profonds' },
    { name: 'right flexor hallucis longus', label: 'Long fléchisseur de l\'hallux', simple: 'Muscle de la voûte', group: 'extensor', unit: 'profonds' },
  ],
  units: [
    { id: 'triceps', label: 'Triceps sural (mollet)', simple: 'Mollet' },
    { id: 'anterieurs', label: 'Loge antérieure', simple: 'Muscles qui remontent le pied' },
    { id: 'fibulaires', label: 'Fibulaires', simple: 'Muscles qui protègent la cheville' },
    { id: 'profonds', label: 'Loge postérieure profonde', simple: 'Muscles de la voûte' },
  ],
  extraMuscles: ['right fibularis tertius', 'right plantaris'],
  tendons: ['right calcaneal tendon'],
  segments: [
    { id: 'foot', pivot: ANK, axis: [-1, 0, 0], dof: 'flex', alt: [{ dof: 'inv', axis: [0.05, 0.42, 0.9], pivot: SUBT }] },
  ],
  blend: { seg: 'foot', center: ANK, dir: [0, 1, 0], band: 0.022, inRegion: (x, y) => x < -0.02 && y < 0.3 },
  cartilage: [
    { bone: 'right talus', test: (_x, y) => y > 0.058 },
    { bone: 'right tibia', test: (_x, y) => y < 0.068 },
  ],
  ligaments: [
    { id: 'ltfa', label: 'Ligament talo-fibulaire antérieur', simple: 'Ligament de l\'extérieur (devant)', a: { seg: 'fixed', p: [-0.111, 0.05, 0.067] }, b: { seg: 'foot', p: [-0.093, 0.047, 0.087] }, width: 0.008 },
    { id: 'lcf', label: 'Ligament calcanéo-fibulaire', simple: 'Ligament de l\'extérieur (dessous)', a: { seg: 'fixed', p: [-0.114, 0.043, 0.05] }, b: { seg: 'foot', p: [-0.103, 0.017, 0.04] }, width: 0.006 },
    { id: 'deltoide', label: 'Ligament deltoïdien', simple: 'Ligament de l\'intérieur', a: { seg: 'fixed', p: [-0.047, 0.058, 0.066] }, b: { seg: 'foot', p: [-0.055, 0.032, 0.062] }, width: 0.016, thick: 0.003 },
  ],
  customs: [
    { id: 'fascia', label: 'Fascia plantaire', simple: 'Toile sous le pied', seg: 'foot', kind: 'meniscus', build: () => band([[-0.085, 0.004, 0.02], [-0.08, 0.002, 0.08], [-0.075, 0.004, 0.15], [-0.072, 0.008, 0.2]], 0.03, 0.003) },
  ],
  actions: { increasing: 'flexor', decreasing: 'extensor', hold: 'extensor' },
  camera: { pos: [-0.62, 0.22, 0.45], target: [-0.08, 0.07, 0.08], fov: 30, frame: [0.3, 0.3] },
  arc: { radius: 0.13, offset: [-0.06, 0, 0] },
  clip: { minY: -0.1, maxY: 0.36 },
  pathologies: {
    'entorse-lle': {
      motion: 'inv', damaged: ['ltfa'], strain: { ltfa: 0.08 },
      painZone: [15, 35], suffers: ['Ligament talo-fibulaire antérieur (étiré ou déchiré)'], works: ['Fibulaires : ils retiennent la cheville'], todo: 'Protéger, puis renforcer les fibulaires et travailler l\'équilibre pour éviter la récidive.',
      caption: 'Entorse latérale : le LTFA est étiré en inversion, première structure lésée.',
      simpleCaption: 'Le ligament de l\'extérieur de la cheville a été trop étiré quand le pied s\'est tordu.',
    },
    'tendinopathie-achilleenne': {
      damaged: ['right calcaneal tendon'],
      friction: [{ id: 'f-ach', label: 'TENDON SURCHARGÉ', at: { seg: 'foot', p: [-0.083, 0.07, 0.02] }, window: [-45, -15], arrow: [0, 1, 0] }],
      painZone: [-45, -15], suffers: ['Tendon d\'Achille'], works: ['Mollet : il tire sur le tendon'], todo: 'Renforcer le mollet lentement (montées sur pointes), sans arrêter complètement l\'activité.',
      caption: 'Tendinopathie d\'Achille corporéale : douleur à la mise en charge, surtout en poussée.',
      simpleCaption: 'Le tendon d\'Achille est irrité : il fait mal quand on pousse sur la pointe.',
    },
    'fasciopathie-plantaire': {
      damaged: ['fascia'],
      friction: [{ id: 'f-fasc', label: 'FASCIA TENDU', at: { seg: 'foot', p: [-0.083, 0.004, 0.035] }, window: [8, 25], arrow: [0, 1, 0] }],
      painZone: [8, 25], suffers: ['Fascia plantaire, à son attache sur le talon'], works: ['Mollet', 'Muscles de la voûte'], todo: 'Étirer le mollet et le fascia, renforcer la voûte, adapter les chaussures.',
      caption: 'Fasciopathie plantaire : douleur à l\'insertion calcanéenne, majorée en flexion dorsale.',
      simpleCaption: 'La toile sous le pied est irritée au talon : les premiers pas du matin font mal.',
    },
  },
}
