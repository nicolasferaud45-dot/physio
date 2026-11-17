import type { BoneName, MuscleId, Pose } from '../three/rig'

/**
 * Animation et lecture anatomique de chaque exercice du catalogue.
 * ⚠️ Contenu de démonstration : rôles musculaires et amplitudes à valider par un physiothérapeute.
 * Le côté traité est le côté DROIT (le personnage peut être tourné à la main).
 */

export type Vec3 = [number, number, number]
export type Equip =
  | { type: 'box'; label?: string; pos: Vec3; size: Vec3; color?: string }
  | { type: 'wall'; pos: Vec3; rotY: number }
  | { type: 'elastic'; from: BoneName; anchor: Vec3 }
  | { type: 'elastic2'; a: BoneName; b: BoneName }
  | { type: 'stick'; a: BoneName; b: BoneName }
  | { type: 'dumbbell'; bone: BoneName }
  | { type: 'mat' }
  | { type: 'force'; bone: BoneName; dir: Vec3 }

export interface Keyframe { t: number; pose: Partial<Pose>; e?: number }

export interface Motion {
  base: Partial<Pose>
  keys: Keyframe[]
  duration: number
  /** pieds maintenus au sol (hauteur de contact par pied) */
  plant?: Partial<Record<'r' | 'l', number>>
  /** point de contact : le plus bas du pied (défaut) ou la pointe (talon dans le vide) */
  contact?: 'lowest' | 'toe'
  focus: { joint: BoneName; end: BoneName; dof: keyof Pose; label: string; simple: string; sign?: 1 | -1; offset?: number }
  muscles: { work: MuscleId[]; stretch: MuscleId[]; stabilize: MuscleId[] }
  contraction: string
  why: string
  equipment: Equip[]
  camera: Vec3
  target: Vec3
}

// Postures de base
const SEATED: Partial<Pose> = { py: 0.5, rHiF: 90, lHiF: 90, rKn: 90, lKn: 90, rShF: 15, lShF: 15, rEl: 70, lEl: 70, rHiA: 6, lHiA: 6 }
const QUAD: Partial<Pose> = { rx: 70, py: 0.49, rHiF: 70, lHiF: 70, rKn: 90, lKn: 90, rHiA: 4, lHiA: 4, rShF: 70, lShF: 70, rShA: 4, lShA: 4, rEl: 0, lEl: 0, rAn: 45, lAn: 45, hdF: -35 }
const SUPINE: Partial<Pose> = { rx: -90, py: 0.12, rShA: 10, lShA: 10, rEl: 5, lEl: 5, rAn: 15, lAn: 15 }
const CHAIR: Equip = { type: 'box', label: 'Chaise', pos: [0, 0.2, -0.16], size: [0.42, 0.4, 0.34], color: '#B9C7D2' }
const BOTH = { r: 0, l: 0 }

// Caméras
const SIDE_R: Vec3 = [-3.1, 1.25, 0.7]
const FRONT: Vec3 = [-0.7, 1.35, 3.1]
const FRONT_HIGH: Vec3 = [-0.9, 2.3, 2.2]
const BACK_HIGH_R: Vec3 = [-0.7, 2.1, -2.5]
const BACK_Q: Vec3 = [-1.9, 1.75, -2.4]
const T_STAND: Vec3 = [0, 0.95, 0.05]

export const MOTIONS: Record<string, Motion> = {
  // ---------------- ÉPAULE
  codman: {
    base: { rx: 55, rHiF: 55, lHiF: 55, rShF: 55, lShF: 100, lEl: 25, lShA: 8, hdF: -25 },
    keys: [
      { t: 0, pose: { rShF: 67, rShA: 0 }, e: 0.2 }, { t: 0.25, pose: { rShF: 55, rShA: 12 }, e: 0.2 },
      { t: 0.5, pose: { rShF: 43, rShA: 0 }, e: 0.2 }, { t: 0.75, pose: { rShF: 55, rShA: -12 }, e: 0.2 }, { t: 1, pose: { rShF: 67, rShA: 0 }, e: 0.2 },
    ],
    duration: 4, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShA', label: "Petits cercles de l'épaule, sans effort musculaire", simple: 'Le bras se balance tout seul' },
    muscles: { work: [], stretch: [], stabilize: ['abdominaux', 'paravertebraux', 'lDeltoide'] },
    contraction: 'Passif : le bras reste relâché',
    why: "Le poids du bras ouvre doucement l'articulation et la mobilise sans faire travailler les muscles douloureux.",
    equipment: [{ type: 'box', label: 'Table', pos: [0.4, 0.44, 0.9], size: [0.5, 0.88, 0.5], color: '#C9B79C' }],
    camera: [-2.6, 1.4, 1.6], target: [0, 0.95, 0.3],
  },
  'glissement-table': {
    base: { ...SEATED, rShF: 45, rEl: 75, rShA: 8, lShF: 20, lEl: 70 },
    keys: [{ t: 0, pose: {}, e: 0 }, { t: 0.45, pose: { rShF: 100, rEl: 5, spF: 32 }, e: 1 }, { t: 0.6, pose: { rShF: 100, rEl: 5, spF: 32 }, e: 1 }, { t: 1, pose: {}, e: 0 }],
    duration: 5, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShF', label: "Flexion de l'épaule (le bras avance)", simple: 'Le bras monte vers l\'avant' },
    muscles: { work: [], stretch: ['rGrandDorsal', 'rTriceps'], stabilize: ['abdominaux'] },
    contraction: 'Auto-mobilisation : le buste fait le travail',
    why: "En penchant le buste, on gagne de l'amplitude vers l'avant sans forcer avec l'épaule.",
    equipment: [CHAIR, { type: 'box', label: 'Table', pos: [-0.05, 0.41, 0.8], size: [0.8, 0.82, 0.6], color: '#C9B79C' }],
    camera: SIDE_R, target: [0, 0.7, 0.3],
  },
  're-auto': {
    base: { rEl: 90, lEl: 95, lShF: 30, lShA: -22, rShA: 4 },
    keys: [{ t: 0, pose: { rShR: 0, lShR: 0 }, e: 0 }, { t: 0.45, pose: { rShR: 45, lShR: -40, lShA: -10 }, e: 1 }, { t: 0.6, pose: { rShR: 45, lShR: -40, lShA: -10 }, e: 1 }, { t: 1, pose: { rShR: 0, lShR: 0 }, e: 0 }],
    duration: 5, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShR', label: "Rotation externe de l'épaule", simple: "L'avant-bras s'ouvre vers l'extérieur" },
    muscles: { work: [], stretch: ['rPectoral'], stabilize: ['rhomboides'] },
    contraction: "Passif aidé : c'est l'autre main qui pousse",
    why: "Récupère la rotation vers l'extérieur, souvent la première perdue dans la capsulite.",
    equipment: [],
    camera: FRONT_HIGH, target: [0, 1.05, 0.15],
  },
  're-baton': {
    base: { rEl: 90, lEl: 90, rShA: 6, lShA: 6 },
    keys: [{ t: 0, pose: { rShR: 0, lShR: 0 }, e: 0 }, { t: 0.45, pose: { rShR: 50, lShR: -50 }, e: 1 }, { t: 0.6, pose: { rShR: 50, lShR: -50 }, e: 1 }, { t: 1, pose: { rShR: 0, lShR: 0 }, e: 0 }],
    duration: 5, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShR', label: "Rotation externe de l'épaule", simple: "L'avant-bras s'ouvre vers l'extérieur" },
    muscles: { work: ['lPectoral'], stretch: ['rPectoral'], stabilize: ['rhomboides'] },
    contraction: 'Passif aidé : le bâton transmet la poussée du bras sain',
    why: "Le bras sain fait le travail : l'épaule atteinte gagne en rotation sans se contracter.",
    equipment: [{ type: 'stick', a: 'rHand', b: 'lHand' }],
    camera: FRONT_HIGH, target: [0, 1.05, 0.15],
  },
  'iso-re': {
    base: { rEl: 90, rShA: 5, rShR: 5 },
    keys: [{ t: 0, pose: {}, e: 0 }, { t: 0.15, pose: {}, e: 1 }, { t: 0.8, pose: {}, e: 1 }, { t: 0.95, pose: {}, e: 0 }, { t: 1, pose: {}, e: 0 }],
    duration: 6, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShR', label: 'Rotation externe sans mouvement (isométrie)', simple: 'On pousse contre le mur sans bouger' },
    muscles: { work: ['rInfraEpineux'], stretch: [], stabilize: ['rDeltoide', 'rhomboides', 'rSupraEpineux'] },
    contraction: 'Isométrique : le muscle travaille sans que le bras bouge',
    why: 'Le tendon est chargé sans frottement : souvent calmant pour la douleur.',
    equipment: [{ type: 'wall', pos: [-0.36, 1, 0.1], rotY: 90 }, { type: 'force', bone: 'rHand', dir: [-1, 0, 0] }],
    camera: BACK_HIGH_R, target: [0, 1.05, 0.15],
  },
  'glissement-mural': {
    base: { rShF: 80, lShF: 80, rEl: 90, lEl: 90, rShA: 12, lShA: 12, pz: -0.1 },
    keys: [{ t: 0, pose: {}, e: 0 }, { t: 0.45, pose: { rShF: 150, lShF: 150, rEl: 35, lEl: 35, rScE: 10, lScE: 10 }, e: 1 }, { t: 0.6, pose: { rShF: 150, lShF: 150, rEl: 35, lEl: 35, rScE: 10, lScE: 10 }, e: 1 }, { t: 1, pose: {}, e: 0 }],
    duration: 5, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShF', label: "Élévation de l'épaule guidée par le mur", simple: 'Les bras glissent vers le haut' },
    muscles: { work: ['rDentele', 'lDentele', 'trapezeInf'], stretch: ['rGrandDorsal', 'lGrandDorsal'], stabilize: ['abdominaux'] },
    contraction: 'Actif léger, guidé',
    why: "Apprend à l'omoplate à bien tourner quand le bras monte, ce qui libère de la place sous l'acromion.",
    equipment: [{ type: 'wall', pos: [0, 1.1, 0.42], rotY: 0 }],
    camera: SIDE_R, target: [0, 1.2, 0.2],
  },
  'etirement-post': {
    base: { rShF: 90, rEl: 5, lShF: 85, lEl: 115, lShA: -25 },
    keys: [{ t: 0, pose: { rShA: -10 }, e: 0 }, { t: 0.4, pose: { rShA: -42 }, e: 1 }, { t: 0.75, pose: { rShA: -42 }, e: 1 }, { t: 1, pose: { rShA: -10 }, e: 0 }],
    duration: 6, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShA', label: 'Adduction horizontale (le bras passe devant la poitrine)', simple: 'Le bras croise devant soi', sign: -1 },
    muscles: { work: [], stretch: ['rDeltoide', 'rInfraEpineux', 'rhomboides'], stabilize: [] },
    contraction: 'Étirement maintenu',
    why: "Assouplit l'arrière de l'épaule, qui pousse la tête de l'humérus vers l'avant quand il est raide.",
    equipment: [],
    camera: FRONT_HIGH, target: [0, 1.15, 0.15],
  },
  'retraction-scap': {
    base: { rShF: 80, lShF: 80, rEl: 5, lEl: 5, rShA: 4, lShA: 4 },
    keys: [{ t: 0, pose: {}, e: 0 }, { t: 0.4, pose: { rScR: 18, lScR: 18, rShA: 28, lShA: 28 }, e: 1 }, { t: 0.55, pose: { rScR: 18, lScR: 18, rShA: 28, lShA: 28 }, e: 1 }, { t: 1, pose: {}, e: 0 }],
    duration: 4, plant: BOTH,
    focus: { joint: 'rGirdle', end: 'rHand', dof: 'rScR', label: 'Rétraction des omoplates (elles se rapprochent)', simple: 'On serre les omoplates' },
    muscles: { work: ['rhomboides', 'rDeltoide', 'lDeltoide'], stretch: ['rPectoral', 'lPectoral'], stabilize: ['abdominaux', 'trapezeInf'] },
    contraction: 'Concentrique puis retour freiné (excentrique)',
    why: "Muscle le « socle » de l'épaule : une omoplate stable protège les tendons.",
    equipment: [{ type: 'elastic2', a: 'rHand', b: 'lHand' }],
    camera: BACK_Q, target: [0, 1.25, 0],
  },
  're-elastique': {
    base: { rEl: 90, rShA: 6, lShA: 6 },
    keys: [{ t: 0, pose: { rShR: -10 }, e: 0.2 }, { t: 0.4, pose: { rShR: 55 }, e: 1 }, { t: 0.5, pose: { rShR: 55 }, e: 1 }, { t: 1, pose: { rShR: -10 }, e: 0.2 }],
    duration: 4, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShR', label: "Rotation externe de l'épaule contre résistance", simple: "L'avant-bras s'ouvre contre l'élastique" },
    muscles: { work: ['rInfraEpineux'], stretch: [], stabilize: ['rhomboides', 'rDeltoide'] },
    contraction: 'Concentrique (ouverture) puis excentrique (retour lent)',
    why: "Renforce les muscles qui centrent la tête de l'humérus et la protègent du pincement.",
    equipment: [{ type: 'elastic', from: 'rHand', anchor: [0.45, 1.0, 0.3] }],
    camera: BACK_HIGH_R, target: [0, 1.05, 0.15],
  },
  'elevation-scaption': {
    base: { rEl: 5, lEl: 5 },
    keys: [{ t: 0, pose: { rShF: 0, rShA: 8, lShF: 0, lShA: 8 }, e: 0.1 }, { t: 0.45, pose: { rShF: 55, rShA: 60, lShF: 55, lShA: 60, rScE: 8, lScE: 8 }, e: 1 }, { t: 0.55, pose: { rShF: 55, rShA: 60, lShF: 55, lShA: 60, rScE: 8, lScE: 8 }, e: 1 }, { t: 1, pose: { rShF: 0, rShA: 8, lShF: 0, lShA: 8 }, e: 0.1 }],
    duration: 4.5, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShA', label: "Élévation dans le plan de l'omoplate", simple: 'Les bras montent en V, pouces vers le haut' },
    muscles: { work: ['rDeltoide', 'lDeltoide', 'rSupraEpineux', 'lSupraEpineux'], stretch: [], stabilize: ['rDentele', 'lDentele', 'trapezeSup', 'trapezeInf'] },
    contraction: 'Concentrique puis excentrique',
    why: "Le plan de l'omoplate laisse le plus de place au tendon : on renforce sans pincer.",
    equipment: [{ type: 'dumbbell', bone: 'rHand' }, { type: 'dumbbell', bone: 'lHand' }],
    camera: FRONT, target: [0, 1.2, 0],
  },
  'nage-a-sec': {
    base: { rx: 30, rHiF: 30, lHiF: 30, rKn: 12, lKn: 12, rEl: 20, lEl: 20, hdF: -20 },
    keys: [{ t: 0, pose: { rShF: 150, lShF: 0 }, e: 0.3 }, { t: 0.5, pose: { rShF: -5, lShF: 150 }, e: 1 }, { t: 1, pose: { rShF: 150, lShF: 0 }, e: 0.3 }],
    duration: 3, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShF', label: "Extension de l'épaule (traction du crawl)", simple: 'Le bras tire vers l\'arrière comme en nageant' },
    muscles: { work: ['rGrandDorsal', 'lGrandDorsal', 'rTriceps', 'lTriceps', 'rDeltoide'], stretch: [], stabilize: ['abdominaux', 'paravertebraux'] },
    contraction: 'Concentrique, rythme régulier',
    why: "Reproduit le geste de nage avec une charge contrôlée avant le retour au bassin.",
    equipment: [{ type: 'elastic', from: 'rHand', anchor: [-0.2, 1.7, 1.2] }, { type: 'elastic', from: 'lHand', anchor: [0.2, 1.7, 1.2] }],
    camera: SIDE_R, target: [0, 1.0, 0.3],
  },

  // ---------------- CHEVILLE
  'cheville-alphabet': {
    base: { ...SEATED, rKn: 20, rHiF: 85 },
    keys: [
      { t: 0, pose: { rAn: 20, rAnEv: 0 }, e: 0.4 }, { t: 0.25, pose: { rAn: 0, rAnEv: 15 }, e: 0.4 }, { t: 0.5, pose: { rAn: -15, rAnEv: 0 }, e: 0.4 },
      { t: 0.75, pose: { rAn: 0, rAnEv: -15 }, e: 0.4 }, { t: 1, pose: { rAn: 20, rAnEv: 0 }, e: 0.4 },
    ],
    duration: 4, plant: { l: 0 },
    focus: { joint: 'rAnkle', end: 'rToe', dof: 'rAn', label: 'Mobilité de la cheville dans toutes les directions', simple: 'Le pied dessine des lettres' },
    muscles: { work: ['rTibialAnt', 'rFibulaires', 'rMollet'], stretch: [], stabilize: ['rQuadriceps'] },
    contraction: 'Actif sans charge',
    why: "Fait bouger la cheville dès les premiers jours pour limiter le gonflement et la raideur.",
    equipment: [CHAIR],
    camera: [-2.0, 1.1, 2.0], target: [0, 0.45, 0.4],
  },
  'cheville-equilibre': {
    base: { lHiF: 35, lKn: 70, rShA: 25, lShA: 25, rEl: 15, lEl: 15 },
    keys: [{ t: 0, pose: { rz: 0 }, e: 0.7 }, { t: 0.25, pose: { rz: 2.5, rAnEv: 3 }, e: 1 }, { t: 0.5, pose: { rz: 0 }, e: 0.7 }, { t: 0.75, pose: { rz: -2.5, rAnEv: -3 }, e: 1 }, { t: 1, pose: { rz: 0 }, e: 0.7 }],
    duration: 3, plant: { r: 0 },
    focus: { joint: 'rAnkle', end: 'rKnee', dof: 'rAnEv', label: 'Micro-ajustements de la cheville en appui', simple: 'La cheville corrige sans cesse pour garder l\'équilibre' },
    muscles: { work: [], stretch: [], stabilize: ['rFibulaires', 'rTibialAnt', 'rMollet', 'rMoyenFessier'] },
    contraction: 'Stabilisation réflexe',
    why: "Rééduque les capteurs de la cheville abîmés par l'entorse : c'est ce qui évite la récidive.",
    equipment: [],
    camera: FRONT, target: T_STAND,
  },
  'cheville-eversion': {
    base: { ...SEATED, rKn: 60, rHiF: 85 },
    keys: [{ t: 0, pose: { rAnEv: -5 }, e: 0.2 }, { t: 0.4, pose: { rAnEv: 22 }, e: 1 }, { t: 0.5, pose: { rAnEv: 22 }, e: 1 }, { t: 1, pose: { rAnEv: -5 }, e: 0.2 }],
    duration: 3.5, plant: { l: 0 },
    focus: { joint: 'rAnkle', end: 'rToe', dof: 'rAnEv', label: 'Éversion (le pied tourne vers l\'extérieur)', simple: 'Le pied pivote vers l\'extérieur' },
    muscles: { work: ['rFibulaires'], stretch: [], stabilize: ['rTibialAnt'] },
    contraction: 'Concentrique puis excentrique',
    why: "Renforce les muscles qui retiennent la cheville quand elle part en torsion.",
    equipment: [CHAIR, { type: 'elastic', from: 'rToe', anchor: [0.35, 0.05, 0.6] }],
    camera: [-1.4, 1.2, 2.1], target: [0, 0.3, 0.45],
  },
  'mollet-montees': {
    base: { rShA: 8, lShA: 8 },
    keys: [{ t: 0, pose: { rAn: 0, lAn: 0 }, e: 0.1 }, { t: 0.4, pose: { rAn: 32, lAn: 32 }, e: 1 }, { t: 0.55, pose: { rAn: 32, lAn: 32 }, e: 1 }, { t: 1, pose: { rAn: 0, lAn: 0 }, e: 0.1 }],
    duration: 3.5, plant: BOTH,
    focus: { joint: 'rAnkle', end: 'rKnee', dof: 'rAn', label: 'Flexion plantaire (montée sur la pointe)', simple: 'On monte sur la pointe des pieds' },
    muscles: { work: ['rMollet', 'lMollet'], stretch: [], stabilize: ['rFibulaires', 'lFibulaires', 'abdominaux'] },
    contraction: 'Concentrique (montée) puis excentrique (descente lente)',
    why: 'Renforce le mollet, moteur de la marche, de la course et des sauts.',
    equipment: [],
    camera: SIDE_R, target: [0, 0.6, 0.1],
  },

  // ---------------- LOMBAIRE
  'lomb-genoux-poitrine': {
    base: { ...SUPINE, rShF: 40, lShF: 40, rEl: 70, lEl: 70 },
    keys: [{ t: 0, pose: { rHiF: 60, lHiF: 60, rKn: 100, lKn: 100 }, e: 0 }, { t: 0.45, pose: { rHiF: 115, lHiF: 115, rKn: 120, lKn: 120, rShF: 70, lShF: 70, rEl: 95, lEl: 95 }, e: 1 }, { t: 0.65, pose: { rHiF: 115, lHiF: 115, rKn: 120, lKn: 120, rShF: 70, lShF: 70, rEl: 95, lEl: 95 }, e: 1 }, { t: 1, pose: { rHiF: 60, lHiF: 60, rKn: 100, lKn: 100 }, e: 0 }],
    duration: 5,
    focus: { joint: 'rHip', end: 'rKnee', dof: 'rHiF', label: 'Flexion des hanches, le bas du dos s\'arrondit', simple: 'Les genoux viennent vers la poitrine' },
    muscles: { work: [], stretch: ['paravertebraux', 'rFessier', 'lFessier'], stabilize: [] },
    contraction: 'Passif : les bras tirent doucement',
    why: 'Détend les muscles du bas du dos et soulage souvent en phase douloureuse.',
    equipment: [{ type: 'mat' }],
    camera: [-3.0, 1.8, 0.6], target: [0, 0.3, 0.1],
  },
  'lomb-chat-chameau': {
    base: QUAD,
    keys: [{ t: 0, pose: { spF: -16, hdF: -55 }, e: 0.5 }, { t: 0.5, pose: { spF: 22, hdF: -10 }, e: 1 }, { t: 1, pose: { spF: -16, hdF: -55 }, e: 0.5 }],
    duration: 5,
    focus: { joint: 'lumbar', end: 'neck', dof: 'spF', label: 'Flexion puis extension de la colonne', simple: 'Le dos s\'arrondit puis se creuse' },
    muscles: { work: ['abdominaux'], stretch: ['paravertebraux'], stabilize: ['rDentele', 'lDentele'] },
    contraction: 'Mobilisation active douce',
    why: 'Fait bouger chaque étage de la colonne sans charge : « huile » le dos.',
    equipment: [{ type: 'mat' }],
    camera: [-2.4, 1.3, 1.2], target: [0, 0.45, 0.25],
  },
  'lomb-marche': {
    base: { rEl: 30, lEl: 30 },
    keys: [
      { t: 0, pose: { rHiF: 25, lHiF: -10, rKn: 5, lKn: 15, rShF: -20, lShF: 25, rAn: -5, lAn: 10 }, e: 0.6 },
      { t: 0.25, pose: { rHiF: 5, lHiF: 15, rKn: 10, lKn: 55, rShF: 0, lShF: 0 }, e: 0.6 },
      { t: 0.5, pose: { rHiF: -10, lHiF: 25, rKn: 15, lKn: 5, rShF: 25, lShF: -20, rAn: 10, lAn: -5 }, e: 0.6 },
      { t: 0.75, pose: { rHiF: 15, lHiF: 5, rKn: 55, lKn: 10, rShF: 0, lShF: 0 }, e: 0.6 },
      { t: 1, pose: { rHiF: 25, lHiF: -10, rKn: 5, lKn: 15, rShF: -20, lShF: 25, rAn: -5, lAn: 10 }, e: 0.6 },
    ],
    duration: 1.4, plant: BOTH,
    focus: { joint: 'rHip', end: 'rAnkle', dof: 'rHiF', label: 'Alternance flexion / extension des hanches', simple: 'Les jambes avancent l\'une après l\'autre' },
    muscles: { work: ['rFessier', 'lFessier', 'rQuadriceps', 'lQuadriceps', 'rMollet', 'lMollet'], stretch: [], stabilize: ['abdominaux', 'paravertebraux', 'rMoyenFessier', 'lMoyenFessier'] },
    contraction: 'Activité rythmique d\'endurance',
    why: 'Le meilleur médicament du dos : bouger régulièrement à une intensité confortable.',
    equipment: [],
    camera: SIDE_R, target: T_STAND,
  },
  'lomb-pont': {
    base: { ...SUPINE, rKn: 95, lKn: 95, rAn: 30, lAn: 30 },
    keys: [{ t: 0, pose: { rHiF: 55, lHiF: 55, py: 0.12, rx: -90 }, e: 0.1 }, { t: 0.4, pose: { rHiF: 15, lHiF: 15, py: 0.33, rx: -60, rKn: 80, lKn: 80, hdF: 25 }, e: 1 }, { t: 0.6, pose: { rHiF: 15, lHiF: 15, py: 0.33, rx: -60, rKn: 80, lKn: 80, hdF: 25 }, e: 1 }, { t: 1, pose: { rHiF: 55, lHiF: 55, py: 0.12, rx: -90 }, e: 0.1 }],
    duration: 4.5,
    focus: { joint: 'rHip', end: 'rKnee', dof: 'rHiF', label: 'Extension des hanches (le bassin monte)', simple: 'Le bassin se soulève', sign: -1, offset: 55 },
    muscles: { work: ['rFessier', 'lFessier', 'rIschios', 'lIschios'], stretch: [], stabilize: ['abdominaux', 'paravertebraux'] },
    contraction: 'Concentrique, 3 s en haut, descente lente',
    why: 'Des fessiers forts soulagent le bas du dos lors des efforts du quotidien.',
    equipment: [{ type: 'mat' }],
    camera: [-3.0, 1.7, 0.6], target: [0, 0.3, 0.1],
  },
  'lomb-bird-dog': {
    base: QUAD,
    keys: [{ t: 0, pose: {}, e: 0.2 }, { t: 0.4, pose: { rShF: 158, lHiF: -15, lKn: 0, lAn: 10 }, e: 1 }, { t: 0.65, pose: { rShF: 158, lHiF: -15, lKn: 0, lAn: 10 }, e: 1 }, { t: 1, pose: {}, e: 0.2 }],
    duration: 5,
    focus: { joint: 'lHip', end: 'lAnkle', dof: 'lHiF', label: 'Bras et jambe opposés s\'allongent, le dos ne bouge pas', simple: 'On allonge un bras et la jambe opposée', sign: -1, offset: 70 },
    muscles: { work: ['lFessier', 'rDeltoide'], stretch: [], stabilize: ['paravertebraux', 'abdominaux', 'rMoyenFessier', 'lDentele'] },
    contraction: 'Gainage : le tronc reste immobile pendant que les membres bougent',
    why: 'Apprend à stabiliser la colonne pendant les mouvements des bras et des jambes.',
    equipment: [{ type: 'mat' }],
    camera: [-2.3, 1.6, 1.3], target: [0, 0.5, 0.25],
  },

  // ---------------- GENOU
  'genou-squat-mural': {
    base: { rShA: 8, lShA: 8 },
    keys: [{ t: 0, pose: {}, e: 0.1 }, { t: 0.2, pose: { rHiF: 72, lHiF: 72, rKn: 72, lKn: 72 }, e: 1 }, { t: 0.82, pose: { rHiF: 72, lHiF: 72, rKn: 72, lKn: 72 }, e: 1 }, { t: 1, pose: {}, e: 0.1 }],
    duration: 7, plant: BOTH,
    focus: { joint: 'rKnee', end: 'rAnkle', dof: 'rKn', label: 'Flexion du genou maintenue (isométrie)', simple: 'On reste assis contre le mur' },
    muscles: { work: ['rQuadriceps', 'lQuadriceps'], stretch: [], stabilize: ['rFessier', 'lFessier', 'abdominaux'] },
    contraction: 'Isométrique : effort tenu sans mouvement',
    why: 'Charge le tendon rotulien de façon contrôlée, avec un effet souvent antalgique.',
    equipment: [{ type: 'wall', pos: [0, 1.0, -0.62], rotY: 0 }],
    camera: SIDE_R, target: [0, 0.75, -0.1],
  },
  'genou-step-down': {
    base: { lHiF: 10, rShA: 15, lShA: 15 },
    keys: [{ t: 0, pose: { rKn: 0, rHiF: 0, lKn: 5, lHiF: 10 }, e: 0.2 }, { t: 0.45, pose: { rKn: 48, rHiF: 38, rx: 12, lKn: 5, lHiF: 15, rAn: -15 }, e: 1 }, { t: 0.55, pose: { rKn: 48, rHiF: 38, rx: 12, lKn: 5, lHiF: 15, rAn: -15 }, e: 1 }, { t: 1, pose: { rKn: 0, rHiF: 0, lKn: 5, lHiF: 10 }, e: 0.2 }],
    duration: 4, plant: { r: 0.2 },
    focus: { joint: 'rKnee', end: 'rAnkle', dof: 'rKn', label: 'Flexion contrôlée du genou en appui', simple: 'Le genou plie lentement, bien aligné' },
    muscles: { work: ['rQuadriceps', 'rFessier'], stretch: [], stabilize: ['rMoyenFessier', 'abdominaux', 'rMollet'] },
    contraction: 'Excentrique : le muscle freine la descente',
    why: 'Travaille le contrôle du genou dans l\'axe, utile pour les escaliers et la course.',
    equipment: [{ type: 'box', label: 'Marche', pos: [-0.12, 0.1, 0.02], size: [0.34, 0.2, 0.4], color: '#B9C7D2' }],
    camera: SIDE_R, target: [0, 0.85, 0.1],
  },
  'genou-extension-elastique': {
    base: { ...SEATED },
    keys: [{ t: 0, pose: { rKn: 90 }, e: 0.2 }, { t: 0.4, pose: { rKn: 5, rAn: -10 }, e: 1 }, { t: 0.55, pose: { rKn: 5, rAn: -10 }, e: 1 }, { t: 1, pose: { rKn: 90 }, e: 0.2 }],
    duration: 4, plant: { l: 0 },
    focus: { joint: 'rKnee', end: 'rAnkle', dof: 'rKn', label: 'Extension du genou contre résistance', simple: 'La jambe se tend contre l\'élastique', sign: -1, offset: 90 },
    muscles: { work: ['rQuadriceps'], stretch: [], stabilize: ['abdominaux'] },
    contraction: 'Concentrique puis excentrique',
    why: 'Renforce le quadriceps sans charger le poids du corps sur le genou.',
    equipment: [CHAIR, { type: 'elastic', from: 'rAnkle', anchor: [-0.1, 0.06, -0.15] }],
    camera: SIDE_R, target: [0, 0.5, 0.25],
  },
  'genou-squat-charge': {
    base: { rEl: 10, lEl: 10, rShA: 6, lShA: 6 },
    keys: [{ t: 0, pose: {}, e: 0.2 }, { t: 0.45, pose: { rHiF: 85, lHiF: 85, rKn: 90, lKn: 90, rx: 30, rAn: -22, lAn: -22, hdF: -20 }, e: 1 }, { t: 0.55, pose: { rHiF: 85, lHiF: 85, rKn: 90, lKn: 90, rx: 30, rAn: -22, lAn: -22, hdF: -20 }, e: 1 }, { t: 1, pose: {}, e: 0.2 }],
    duration: 6, plant: BOTH,
    focus: { joint: 'rKnee', end: 'rAnkle', dof: 'rKn', label: 'Flexion des genoux et des hanches, lente et chargée', simple: 'On s\'accroupit lentement avec des poids' },
    muscles: { work: ['rQuadriceps', 'lQuadriceps', 'rFessier', 'lFessier'], stretch: [], stabilize: ['paravertebraux', 'abdominaux', 'rIschios', 'lIschios'] },
    contraction: '3 s de descente, 3 s de montée',
    why: 'Augmente progressivement la capacité du tendon et des muscles à encaisser la charge.',
    equipment: [{ type: 'dumbbell', bone: 'rHand' }, { type: 'dumbbell', bone: 'lHand' }],
    camera: SIDE_R, target: [0, 0.8, 0.1],
  },
}

// ---------------------------------------------------------------- Exercices ajoutés (catalogue étendu)
const SEATED_ARM_TABLE: Partial<Pose> = { ...SEATED, rShF: 20, rEl: 70, rShA: 10 }
const TABLE_LOW: Equip = { type: 'box', label: 'Table', pos: [-0.15, 0.36, 0.5], size: [0.5, 0.72, 0.45], color: '#C9B79C' }
const KNEEL: Partial<Pose> = { py: 0.5, rKn: 90, lKn: 90, rAn: 80, lAn: 80, rHiA: 4, lHiA: 4 }
const SUPINE_SIDE: Vec3 = [-2.9, 1.5, 0.5]
const T_SUPINE: Vec3 = [0, 0.3, 0.1]
const T_SEATED_HEAD: Vec3 = [0, 1.1, 0.1]
const iso = (e = 1): Keyframe[] => [{ t: 0, pose: {}, e: 0 }, { t: 0.15, pose: {}, e }, { t: 0.8, pose: {}, e }, { t: 0.95, pose: {}, e: 0 }, { t: 1, pose: {}, e: 0 }]
const back = (from: Partial<Pose>, to: Partial<Pose>, hold = 0.15, e0 = 0.1): Keyframe[] => [
  { t: 0, pose: from, e: e0 }, { t: 0.45 - hold / 2, pose: to, e: 1 }, { t: 0.45 + hold / 2, pose: to, e: 1 }, { t: 1, pose: from, e: e0 },
]

Object.assign(MOTIONS, {
  'flexion-baton': {
    base: { rEl: 10, lEl: 10, rShA: 8, lShA: 8 }, keys: back({ rShF: 10, lShF: 10 }, { rShF: 150, lShF: 150 }), duration: 5, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShF', label: "Élévation de l'épaule aidée par l'autre bras", simple: 'Les bras montent ensemble au-dessus de la tête' },
    muscles: { work: [], stretch: ['rGrandDorsal', 'lGrandDorsal'], stabilize: ['abdominaux'] },
    contraction: 'Actif aidé : le bras sain guide', why: "Regagne l'élévation du bras en partageant l'effort avec le côté sain.",
    equipment: [{ type: 'stick', a: 'rHand', b: 'lHand' }], camera: SIDE_R, target: [0, 1.2, 0.1],
  },
  'iso-abduction': {
    base: { rShA: 6, rEl: 5 }, keys: iso(), duration: 6, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rElbow', dof: 'rShA', label: 'Abduction sans mouvement (isométrie)', simple: 'Le bras pousse contre le mur sans bouger' },
    muscles: { work: ['rDeltoide', 'rSupraEpineux'], stretch: [], stabilize: ['rhomboides', 'trapezeSup'] },
    contraction: 'Isométrique', why: 'Charge les tendons de la coiffe sans frottement, souvent apaisant.',
    equipment: [{ type: 'wall', pos: [-0.3, 1, 0], rotY: 90 }, { type: 'force', bone: 'rElbow', dir: [-1, 0, 0] }], camera: FRONT, target: T_STAND,
  },
  'pompes-mur': {
    base: { rx: 20, rShF: 80, lShF: 80, rShA: 12, lShA: 12, hdF: -15 },
    keys: [{ t: 0, pose: { rEl: 0, lEl: 0 }, e: 0.3 }, { t: 0.35, pose: { rEl: 95, lEl: 95, rScR: 10, lScR: 10 }, e: 0.8 }, { t: 0.6, pose: { rEl: 0, lEl: 0 }, e: 1 }, { t: 0.8, pose: { rEl: 0, lEl: 0, rScR: -14, lScR: -14 }, e: 1 }, { t: 1, pose: { rEl: 0, lEl: 0 }, e: 0.3 }],
    duration: 5, plant: BOTH,
    focus: { joint: 'rElbow', end: 'rShoulder', dof: 'rEl', label: 'Pompe puis poussée des omoplates vers l\'avant', simple: 'On pousse le mur puis on arrondit le haut du dos' },
    muscles: { work: ['rDentele', 'lDentele', 'rPectoral', 'lPectoral', 'rTriceps', 'lTriceps'], stretch: [], stabilize: ['abdominaux'] },
    contraction: 'Concentrique puis excentrique', why: "Renforce le dentelé, qui plaque et fait tourner l'omoplate quand le bras monte.",
    equipment: [{ type: 'wall', pos: [0, 1.1, 0.78], rotY: 0 }], camera: SIDE_R, target: [0, 1.1, 0.3],
  },
  'ri-elastique': {
    base: { rEl: 90, rShA: 6, lShA: 6 }, keys: back({ rShR: 40 }, { rShR: -40 }, 0.1, 0.2), duration: 4, plant: BOTH,
    focus: { joint: 'rShoulder', end: 'rHand', dof: 'rShR', label: "Rotation interne de l'épaule contre résistance", simple: "L'avant-bras revient vers le ventre", sign: -1 },
    muscles: { work: ['rPectoral', 'rGrandDorsal'], stretch: [], stabilize: ['rhomboides', 'rDeltoide'] },
    contraction: 'Concentrique puis excentrique', why: "Renforce les rotateurs internes, qui stabilisent l'avant de l'épaule.",
    equipment: [{ type: 'elastic', from: 'rHand', anchor: [-0.6, 1.0, 0.3] }], camera: FRONT_HIGH, target: [0, 1.05, 0.15],
  },
  'iso-extenseurs': {
    base: { ...SEATED_ARM_TABLE, lShF: 35, lEl: 75, lShA: -15 }, keys: iso(), duration: 6, plant: BOTH,
    focus: { joint: 'rHand', end: 'rHand', dof: 'rWr', label: 'Extension du poignet sans mouvement', simple: 'Le dos de la main pousse vers le haut sans bouger' },
    muscles: { work: ['rExtPoignet'], stretch: [], stabilize: ['rBiceps', 'rTriceps'] },
    contraction: 'Isométrique, 45 s', why: 'Charge les tendons du coude sans les irriter et réduit souvent la douleur.',
    equipment: [CHAIR, TABLE_LOW, { type: 'force', bone: 'rHand', dir: [0, 1, 0] }], camera: SIDE_R, target: [0, 0.8, 0.3],
  },
  'extension-poignet-haltere': {
    base: { ...SEATED_ARM_TABLE }, keys: back({ rWr: 35 }, { rWr: -45 }), duration: 4, plant: BOTH,
    focus: { joint: 'rHand', end: 'rHand', dof: 'rWr', label: 'Extension du poignet (relever la main)', simple: 'La main se relève puis redescend lentement', sign: -1 },
    muscles: { work: ['rExtPoignet'], stretch: [], stabilize: ['rBiceps'] },
    contraction: 'Concentrique puis excentrique lent (3 s)', why: 'Augmente progressivement la capacité des tendons du coude à encaisser la préhension.',
    equipment: [CHAIR, TABLE_LOW, { type: 'dumbbell', bone: 'rHand' }], camera: SIDE_R, target: [0, 0.8, 0.3],
  },
  prehension: {
    base: { ...SEATED_ARM_TABLE }, keys: [{ t: 0, pose: { rWr: 0 }, e: 0 }, { t: 0.3, pose: { rWr: -10 }, e: 1 }, { t: 0.6, pose: { rWr: -10 }, e: 1 }, { t: 0.8, pose: { rWr: 0 }, e: 0 }, { t: 1, pose: { rWr: 0 }, e: 0 }],
    duration: 4, plant: BOTH,
    focus: { joint: 'rHand', end: 'rHand', dof: 'rWr', label: 'Serrage, poignet légèrement relevé', simple: 'On serre la balle 5 secondes', sign: -1 },
    muscles: { work: ['rFlechPoignet', 'rExtPoignet'], stretch: [], stabilize: [] },
    contraction: 'Isométrique répété', why: 'Redonne de la force de préhension pour les gestes du quotidien.',
    equipment: [CHAIR, TABLE_LOW], camera: SIDE_R, target: [0, 0.8, 0.3],
  },
  'mobilite-poignet': {
    base: { ...SEATED_ARM_TABLE }, keys: [{ t: 0, pose: { rWr: -50 }, e: 0.6 }, { t: 0.5, pose: { rWr: 55 }, e: 0.6 }, { t: 1, pose: { rWr: -50 }, e: 0.6 }], duration: 4, plant: BOTH,
    focus: { joint: 'rHand', end: 'rHand', dof: 'rWr', label: 'Flexion et extension du poignet', simple: 'Le poignet plie et se tend' },
    muscles: { work: ['rExtPoignet', 'rFlechPoignet'], stretch: [], stabilize: [] },
    contraction: 'Actif sans charge', why: "Récupère la mobilité du poignet après l'immobilisation.",
    equipment: [CHAIR, TABLE_LOW], camera: SIDE_R, target: [0, 0.8, 0.3],
  },
  'glissements-tendineux': {
    base: { ...SEATED, rShF: 10, rEl: 110, rShA: 10 }, keys: [{ t: 0, pose: { rWr: 0 }, e: 0.4 }, { t: 0.33, pose: { rWr: -20 }, e: 0.4 }, { t: 0.66, pose: { rWr: 25 }, e: 0.4 }, { t: 1, pose: { rWr: 0 }, e: 0.4 }],
    duration: 5, plant: BOTH,
    focus: { joint: 'rHand', end: 'rHand', dof: 'rWr', label: 'Enchaînement de positions de la main', simple: 'La main passe par plusieurs positions' },
    muscles: { work: ['rFlechPoignet'], stretch: [], stabilize: [] },
    contraction: 'Mobilisation douce', why: 'Fait glisser tendons et nerf dans le canal carpien pour limiter les adhérences.',
    equipment: [CHAIR], camera: SIDE_R, target: [0, 1.0, 0.2],
  },
  'glissement-median': {
    base: { rShA: 90 }, keys: [{ t: 0, pose: { rEl: 70, rWr: 10, hdR: 0 }, e: 0.3 }, { t: 0.5, pose: { rEl: 0, rWr: -45, hdR: 30 }, e: 0.6 }, { t: 1, pose: { rEl: 70, rWr: 10, hdR: 0 }, e: 0.3 }],
    duration: 4, plant: BOTH,
    focus: { joint: 'rElbow', end: 'rHand', dof: 'rEl', label: 'Coude et poignet se tendent, la tête tourne à l\'opposé', simple: 'Le nerf glisse le long du bras', sign: -1, offset: 70 },
    muscles: { work: [], stretch: ['rFlechPoignet'], stabilize: [] },
    contraction: 'Mobilisation neurale douce', why: "Fait glisser le nerf médian sans l'étirer, pour diminuer les fourmillements.",
    equipment: [], camera: FRONT, target: [0, 1.2, 0],
  },
  'renfo-poignet': {
    base: { ...SEATED_ARM_TABLE }, keys: back({ rWr: -35 }, { rWr: 45 }), duration: 4, plant: BOTH,
    focus: { joint: 'rHand', end: 'rHand', dof: 'rWr', label: 'Flexion du poignet contre charge', simple: 'Le poignet monte et redescend avec le poids' },
    muscles: { work: ['rFlechPoignet'], stretch: [], stabilize: ['rBiceps'] },
    contraction: 'Concentrique puis excentrique', why: 'Redonne de la force au poignet après une fracture.',
    equipment: [CHAIR, TABLE_LOW, { type: 'dumbbell', bone: 'rHand' }], camera: SIDE_R, target: [0, 0.8, 0.3],
  },
  'menton-rentre': {
    base: { ...SEATED, rEl: 70, lEl: 70 }, keys: back({ hdT: 0, hdF: 0 }, { hdT: 3, hdF: 6 }, 0.2), duration: 4, plant: BOTH,
    focus: { joint: 'neck', end: 'neck', dof: 'hdT', label: 'Rétraction du cou (la tête recule)', simple: 'On rentre le menton en reculant la tête' },
    muscles: { work: ['flechCou'], stretch: ['trapezeSup'], stabilize: ['rhomboides'] },
    contraction: 'Actif doux', why: 'Diminue la tension de la nuque et réapprend une posture confortable.',
    equipment: [CHAIR], camera: SIDE_R, target: T_SEATED_HEAD,
  },
  'flexion-craniocervicale': {
    base: { ...SUPINE }, keys: [{ t: 0, pose: { hdF: 0 }, e: 0 }, { t: 0.3, pose: { hdF: 14 }, e: 1 }, { t: 0.75, pose: { hdF: 14 }, e: 1 }, { t: 1, pose: { hdF: 0 }, e: 0 }], duration: 6,
    focus: { joint: 'neck', end: 'neck', dof: 'hdF', label: 'Petit hochement « oui » tenu', simple: 'La tête fait un petit « oui » sans se soulever' },
    muscles: { work: ['flechCou'], stretch: [], stabilize: [] },
    contraction: 'Isométrique, 10 s', why: 'Renforce les muscles profonds qui stabilisent le cou.',
    equipment: [{ type: 'mat' }], camera: [-1.6, 0.9, -0.3], target: [0, 0.15, -0.55],
  },
  'rotation-cervicale': {
    base: { ...SEATED, rEl: 70, lEl: 70 }, keys: [{ t: 0, pose: { hdR: -55 }, e: 0.4 }, { t: 0.5, pose: { hdR: 55 }, e: 0.4 }, { t: 1, pose: { hdR: -55 }, e: 0.4 }], duration: 5, plant: BOTH,
    focus: { joint: 'neck', end: 'neck', dof: 'hdR', label: 'Rotation du cou', simple: 'La tête tourne à droite puis à gauche' },
    muscles: { work: [], stretch: ['trapezeSup'], stabilize: [] },
    contraction: 'Mobilité active', why: 'Entretient la mobilité du cou sans charge.',
    equipment: [CHAIR], camera: [-0.5, 1.7, 2.1], target: T_SEATED_HEAD,
  },
  'extension-couche': {
    base: { rx: 88, py: 0.12, rAn: 70, lAn: 70, rShA: 30, lShA: 30, hdF: -20 },
    keys: back({ spF: 0, rShF: 150, lShF: 150, rEl: 130, lEl: 130 }, { spF: -38, rShF: 120, lShF: 120, rEl: 25, lEl: 25, hdF: -30 }, 0.15, 0.1), duration: 5,
    focus: { joint: 'lumbar', end: 'neck', dof: 'spF', label: 'Extension du bas du dos, bassin au sol', simple: 'Les bras poussent, le dos se cambre doucement', sign: -1 },
    muscles: { work: ['rTriceps', 'lTriceps'], stretch: ['abdominaux'], stabilize: [] },
    contraction: 'Extension passive : le dos reste détendu', why: 'Chez certains patients, ce mouvement « recentralise » la douleur qui descend dans la jambe.',
    equipment: [{ type: 'mat' }], camera: [-2.6, 1.4, 0.9], target: [0, 0.3, 0.3],
  },
  'flexion-assise': {
    base: { ...SEATED }, keys: back({ spF: 0, rShF: 10, lShF: 10, rEl: 60, lEl: 60, hdF: 0 }, { spF: 45, rShF: 45, lShF: 45, rEl: 5, lEl: 5, hdF: 25 }, 0.2), duration: 5, plant: BOTH,
    focus: { joint: 'lumbar', end: 'neck', dof: 'spF', label: 'Flexion du tronc', simple: 'On se penche en avant, assis' },
    muscles: { work: [], stretch: ['paravertebraux'], stabilize: [] },
    contraction: 'Passif', why: 'La flexion ouvre le canal lombaire et soulage souvent les jambes lourdes.',
    equipment: [CHAIR], camera: SIDE_R, target: [0, 0.8, 0.1],
  },
  gainage: {
    base: { rx: 80, py: 0.24, rShF: 80, lShF: 80, rEl: 90, lEl: 90, rAn: -10, lAn: -10, hdF: -15 }, keys: iso(), duration: 6,
    focus: { joint: 'lumbar', end: 'neck', dof: 'spF', label: 'Le tronc reste aligné comme une planche', simple: 'On tient la position, dos droit' },
    muscles: { work: ['abdominaux'], stretch: [], stabilize: ['paravertebraux', 'rFessier', 'lFessier', 'rDeltoide', 'lDeltoide'] },
    contraction: 'Isométrique', why: 'Renforce la ceinture abdominale qui protège le dos.',
    equipment: [{ type: 'mat' }], camera: [-2.5, 1.2, 1.0], target: [0, 0.25, 0.2],
  },
  'iso-abduction-hanche': {
    base: { rShA: 10, lShA: 10 }, keys: iso(), duration: 6, plant: BOTH,
    focus: { joint: 'rHip', end: 'rKnee', dof: 'rHiA', label: 'Abduction de hanche sans mouvement', simple: 'La jambe pousse vers le mur sans bouger' },
    muscles: { work: ['rMoyenFessier'], stretch: [], stabilize: ['lMoyenFessier', 'abdominaux'] },
    contraction: 'Isométrique, 45 s', why: 'Charge les tendons des fessiers sans compression, souvent antalgique.',
    equipment: [{ type: 'wall', pos: [-0.25, 0.9, 0], rotY: 90 }, { type: 'force', bone: 'rKnee', dir: [-1, 0, 0] }], camera: FRONT, target: T_STAND,
  },
  'abduction-elastique': {
    base: { rShA: 12, lShA: 12, lHiA: 3 }, keys: back({ rHiA: 3 }, { rHiA: 30, spS: 3 }, 0.1), duration: 4, plant: { l: 0 },
    focus: { joint: 'rHip', end: 'rAnkle', dof: 'rHiA', label: 'Abduction de hanche', simple: 'La jambe s\'écarte sur le côté' },
    muscles: { work: ['rMoyenFessier'], stretch: ['rAdducteurs'], stabilize: ['lMoyenFessier', 'abdominaux'] },
    contraction: 'Concentrique puis excentrique', why: 'Renforce les muscles qui stabilisent le bassin à chaque pas.',
    equipment: [{ type: 'elastic2', a: 'rAnkle', b: 'lAnkle' }], camera: FRONT, target: [0, 0.7, 0],
  },
  'step-up': {
    base: { rShA: 12, lShA: 12 }, keys: back({ rHiF: 45, rKn: 65, rAn: -15, lHiF: 0, lKn: 5 }, { rHiF: 2, rKn: 2, rAn: 0, lHiF: 25, lKn: 60 }, 0.1), duration: 4, plant: { r: 0.2 },
    focus: { joint: 'rKnee', end: 'rHip', dof: 'rKn', label: 'Extension de la hanche et du genou en charge', simple: 'On monte sur la marche en poussant sur la jambe', sign: -1, offset: 65 },
    muscles: { work: ['rQuadriceps', 'rFessier'], stretch: [], stabilize: ['rMoyenFessier', 'abdominaux', 'rMollet'] },
    contraction: 'Concentrique (montée), excentrique (descente)', why: 'Renforce la jambe dans un geste du quotidien : les escaliers.',
    equipment: [{ type: 'box', label: 'Marche', pos: [-0.1, 0.1, 0.12], size: [0.36, 0.2, 0.42], color: '#B9C7D2' }], camera: SIDE_R, target: [0, 0.8, 0.1],
  },
  'assis-debout': {
    base: { rShA: 8, lShA: 8, rEl: 20, lEl: 20 },
    keys: [{ t: 0, pose: { rHiF: 90, lHiF: 90, rKn: 90, lKn: 90, rShF: 20, lShF: 20 }, e: 0.2 }, { t: 0.25, pose: { rHiF: 95, lHiF: 95, rKn: 90, lKn: 90, rx: 30, rShF: 60, lShF: 60 }, e: 0.8 }, { t: 0.5, pose: { rHiF: 0, lHiF: 0, rKn: 2, lKn: 2, rShF: 10, lShF: 10 }, e: 1 }, { t: 0.75, pose: { rHiF: 95, lHiF: 95, rKn: 90, lKn: 90, rx: 30, rShF: 60, lShF: 60 }, e: 0.8 }, { t: 1, pose: { rHiF: 90, lHiF: 90, rKn: 90, lKn: 90, rShF: 20, lShF: 20 }, e: 0.2 }],
    duration: 6, plant: BOTH,
    focus: { joint: 'rKnee', end: 'rHip', dof: 'rKn', label: 'Extension des genoux et des hanches', simple: 'On se lève de la chaise sans les mains', sign: -1, offset: 90 },
    muscles: { work: ['rQuadriceps', 'lQuadriceps', 'rFessier', 'lFessier'], stretch: [], stabilize: ['abdominaux', 'paravertebraux'] },
    contraction: 'Concentrique (lever), excentrique (s\'asseoir)', why: 'Geste fonctionnel clé : se lever renforce cuisses et fessiers.',
    equipment: [{ type: 'box', label: 'Chaise', pos: [0, 0.2, -0.35], size: [0.42, 0.4, 0.34], color: '#B9C7D2' }], camera: SIDE_R, target: [0, 0.7, 0],
  },
  'rock-back': {
    base: QUAD, keys: back({}, { rHiF: 115, lHiF: 115, rKn: 125, lKn: 125, rShF: 115, lShF: 115, py: 0.4, pz: -0.25 }, 0.1), duration: 5,
    focus: { joint: 'rHip', end: 'rKnee', dof: 'rHiF', label: 'Flexion des hanches, dos neutre', simple: 'Les fesses reculent vers les talons', offset: -70 },
    muscles: { work: [], stretch: ['rFessier', 'lFessier'], stabilize: ['abdominaux'] },
    contraction: 'Mobilité active', why: 'Travaille la flexion de hanche sans atteindre la zone qui pince.',
    equipment: [{ type: 'mat' }], camera: [-2.4, 1.3, 1.2], target: [0, 0.45, 0.2],
  },
  'iso-ischios': {
    base: { ...SUPINE, rHiF: 40, rKn: 70, rAn: 10 }, keys: iso(0.8), duration: 5,
    focus: { joint: 'rKnee', end: 'rAnkle', dof: 'rKn', label: 'Flexion du genou sans mouvement', simple: 'Le talon s\'enfonce dans le sol' },
    muscles: { work: ['rIschios'], stretch: [], stabilize: ['rFessier'] },
    contraction: 'Isométrique sous-maximal', why: 'Réactive le muscle blessé sans le mettre en danger.',
    equipment: [{ type: 'mat' }, { type: 'force', bone: 'rHeel', dir: [0, -1, 0] }], camera: SUPINE_SIDE, target: T_SUPINE,
  },
  'pont-ischios': {
    base: { ...SUPINE, rKn: 35, lKn: 35, rAn: 0, lAn: 0 },
    keys: [{ t: 0, pose: { rHiF: 30, lHiF: 30, py: 0.12, rx: -90 }, e: 0.1 }, { t: 0.4, pose: { rHiF: 0, lHiF: 0, py: 0.3, rx: -72 }, e: 1 }, { t: 0.55, pose: { rHiF: 0, lHiF: 0, py: 0.3, rx: -72 }, e: 1 }, { t: 1, pose: { rHiF: 30, lHiF: 30, py: 0.12, rx: -90 }, e: 0.1 }],
    duration: 4,
    focus: { joint: 'rHip', end: 'rKnee', dof: 'rHiF', label: 'Extension de hanche, genoux presque tendus', simple: 'Le bassin monte en poussant dans les talons', sign: -1, offset: 30 },
    muscles: { work: ['rIschios', 'lIschios', 'rFessier', 'lFessier'], stretch: [], stabilize: ['abdominaux'] },
    contraction: 'Concentrique puis excentrique', why: 'Renforce les ischio-jambiers en position allongée, à faible risque.',
    equipment: [{ type: 'mat' }], camera: SUPINE_SIDE, target: T_SUPINE,
  },
  nordic: {
    base: { ...KNEEL, rShA: 8, lShA: 8 }, keys: [{ t: 0, pose: { rx: 0, rKn: 90, lKn: 90, rShF: 20, lShF: 20 }, e: 0.3 }, { t: 0.6, pose: { rx: 55, rKn: 35, lKn: 35, rShF: 60, lShF: 60, rEl: 30, lEl: 30 }, e: 1 }, { t: 0.75, pose: { rx: 55, rKn: 35, lKn: 35, rShF: 80, lShF: 80, rEl: 20, lEl: 20 }, e: 0.6 }, { t: 1, pose: { rx: 0, rKn: 90, lKn: 90, rShF: 20, lShF: 20 }, e: 0.3 }],
    duration: 5, plant: BOTH,
    focus: { joint: 'rKnee', end: 'rHip', dof: 'rKn', label: 'Le corps bascule en avant, freiné par les ischios', simple: 'On se penche lentement en avant en freinant', sign: -1, offset: 90 },
    muscles: { work: ['rIschios', 'lIschios'], stretch: [], stabilize: ['rFessier', 'lFessier', 'abdominaux'] },
    contraction: 'Excentrique (freinage)', why: 'Le renforcement excentrique des ischios réduit le risque de nouvelle blessure.',
    equipment: [{ type: 'mat' }], camera: SIDE_R, target: [0, 0.5, 0.1],
  },
  'serre-genou': {
    base: { ...SUPINE }, keys: [{ t: 0, pose: { rKn: 5, rAn: 15 }, e: 0 }, { t: 0.25, pose: { rKn: 0, rAn: -10 }, e: 1 }, { t: 0.6, pose: { rKn: 0, rAn: -10 }, e: 1 }, { t: 0.8, pose: { rKn: 5, rAn: 15 }, e: 0 }, { t: 1, pose: { rKn: 5, rAn: 15 }, e: 0 }],
    duration: 4,
    focus: { joint: 'rKnee', end: 'rAnkle', dof: 'rKn', label: 'Contraction du quadriceps, genou tendu', simple: 'L\'arrière du genou s\'écrase contre le sol' },
    muscles: { work: ['rQuadriceps'], stretch: [], stabilize: [] },
    contraction: 'Isométrique, 5 s', why: 'Réveille le quadriceps, souvent « endormi » après une opération ou un gonflement.',
    equipment: [{ type: 'mat' }], camera: SUPINE_SIDE, target: T_SUPINE,
  },
  'jambe-tendue': {
    base: { ...SUPINE, lHiF: 60, lKn: 100, lAn: 30, rAn: -5 }, keys: back({ rHiF: 0 }, { rHiF: 45 }, 0.1), duration: 4,
    focus: { joint: 'rHip', end: 'rAnkle', dof: 'rHiF', label: 'Flexion de hanche, genou verrouillé', simple: 'La jambe tendue monte' },
    muscles: { work: ['rQuadriceps', 'rPsoas'], stretch: [], stabilize: ['abdominaux'] },
    contraction: 'Concentrique puis excentrique', why: 'Renforce le quadriceps sans charger le genou.',
    equipment: [{ type: 'mat' }], camera: SUPINE_SIDE, target: T_SUPINE,
  },
  'glisse-talon': {
    base: { ...SUPINE }, keys: back({ rHiF: 0, rKn: 0, rAn: 15 }, { rHiF: 70, rKn: 105, rAn: 30 }, 0.1), duration: 4,
    focus: { joint: 'rKnee', end: 'rAnkle', dof: 'rKn', label: 'Flexion du genou', simple: 'Le talon glisse vers les fesses' },
    muscles: { work: ['rIschios'], stretch: ['rQuadriceps'], stabilize: [] },
    contraction: 'Actif aidé', why: 'Récupère la flexion du genou, étape clé après une opération.',
    equipment: [{ type: 'mat' }], camera: SUPINE_SIDE, target: T_SUPINE,
  },
  'squat-partiel': {
    base: { rShA: 8, lShA: 8, rEl: 10, lEl: 10 }, keys: back({}, { rHiF: 60, lHiF: 60, rKn: 65, lKn: 65, rx: 18, rAn: -15, lAn: -15, rShF: 70, lShF: 70 }, 0.1), duration: 4, plant: BOTH,
    focus: { joint: 'rKnee', end: 'rAnkle', dof: 'rKn', label: 'Flexion des genoux et des hanches', simple: 'On descend comme pour s\'asseoir' },
    muscles: { work: ['rQuadriceps', 'lQuadriceps', 'rFessier', 'lFessier'], stretch: [], stabilize: ['abdominaux', 'paravertebraux'] },
    contraction: 'Excentrique (descente), concentrique (montée)', why: 'Renforce cuisses et fessiers dans un mouvement du quotidien.',
    equipment: [], camera: SIDE_R, target: [0, 0.8, 0.1],
  },
  'fente-avant': {
    base: { rShA: 10, lShA: 10, lAn: -20 }, keys: back({ rHiF: 30, rKn: 10, lHiF: -15, lKn: 5 }, { rHiF: 75, rKn: 90, lHiF: -10, lKn: 90, rAn: -15 }, 0.1), duration: 4, plant: { r: 0 },
    focus: { joint: 'rKnee', end: 'rAnkle', dof: 'rKn', label: 'Flexion du genou avant', simple: 'On descend le genou arrière vers le sol' },
    muscles: { work: ['rQuadriceps', 'rFessier'], stretch: ['lPsoas'], stabilize: ['rMoyenFessier', 'abdominaux'] },
    contraction: 'Excentrique puis concentrique', why: 'Renforce la jambe en appui avancé, comme dans la course ou les changements de direction.',
    equipment: [], camera: SIDE_R, target: [0, 0.7, 0.2],
  },
  sauts: {
    base: { rShA: 10, lShA: 10 }, keys: [{ t: 0, pose: { py: 0.95 }, e: 0.2 }, { t: 0.2, pose: { py: 0.78, rHiF: 55, lHiF: 55, rKn: 65, lKn: 65, rAn: -20, lAn: -20, rx: 18, rShF: -20, lShF: -20 }, e: 0.9 }, { t: 0.42, pose: { py: 1.2, rAn: 30, lAn: 30, rShF: 120, lShF: 120 }, e: 1 }, { t: 0.65, pose: { py: 0.78, rHiF: 55, lHiF: 55, rKn: 65, lKn: 65, rAn: -20, lAn: -20, rx: 18, rShF: 30, lShF: 30 }, e: 1 }, { t: 1, pose: { py: 0.95 }, e: 0.2 }],
    duration: 2.6,
    focus: { joint: 'rKnee', end: 'rAnkle', dof: 'rKn', label: 'Impulsion puis réception amortie', simple: 'On saute et on se réceptionne en douceur' },
    muscles: { work: ['rQuadriceps', 'lQuadriceps', 'rMollet', 'lMollet', 'rFessier', 'lFessier'], stretch: [], stabilize: ['abdominaux'] },
    contraction: 'Pliométrique', why: 'Prépare le tendon et le genou aux sauts du sport.',
    equipment: [], camera: SIDE_R, target: [0, 0.9, 0.1],
  },
  'mollet-excentrique': {
    base: { rShA: 8, lShA: 8 }, keys: [{ t: 0, pose: { rAn: 25, lAn: 25 }, e: 0.4 }, { t: 0.6, pose: { rAn: -20, lAn: -20 }, e: 1 }, { t: 0.75, pose: { rAn: -20, lAn: -20 }, e: 0.5 }, { t: 1, pose: { rAn: 25, lAn: 25 }, e: 0.4 }],
    duration: 5, plant: { r: 0.2, l: 0.2 }, contact: 'toe',
    focus: { joint: 'rAnkle', end: 'rHeel', dof: 'rAn', label: 'Descente lente du talon sous la marche', simple: 'Le talon descend lentement sous la marche' },
    muscles: { work: ['rMollet', 'lMollet'], stretch: [], stabilize: ['rFibulaires', 'lFibulaires'] },
    contraction: 'Excentrique lent', why: 'Renforce et remodèle le tendon d\'Achille par une charge progressive.',
    equipment: [{ type: 'box', label: 'Marche', pos: [0, 0.1, 0.22], size: [0.5, 0.2, 0.26], color: '#B9C7D2' }], camera: SIDE_R, target: [0, 0.5, 0.1],
  },
  'etirement-mollet': {
    base: { rx: 12, lHiF: 30, lKn: 35, rHiF: -18, rKn: 0, rShF: 80, lShF: 80, rEl: 20, lEl: 20 }, keys: back({ rAn: -5 }, { rAn: -18, lKn: 45 }, 0.3, 0.2), duration: 6, plant: BOTH,
    focus: { joint: 'rAnkle', end: 'rKnee', dof: 'rAn', label: 'Flexion dorsale de la cheville, genou tendu', simple: 'Le talon reste au sol, on avance le bassin', sign: -1 },
    muscles: { work: [], stretch: ['rMollet'], stabilize: [] },
    contraction: 'Étirement maintenu 30 s', why: 'Assouplit le mollet, souvent raide en cas de douleur du talon.',
    equipment: [{ type: 'wall', pos: [0, 1.1, 0.75], rotY: 0 }], camera: SIDE_R, target: [0, 0.8, 0.2],
  },
  'etirement-fascia': {
    base: { ...SEATED, rHiF: 95, rHiA: 35, rHiR: 40, rKn: 115, rShF: 35, rEl: 60 }, keys: back({ rAn: 10 }, { rAn: -25 }, 0.3, 0.2), duration: 5, plant: { l: 0 },
    focus: { joint: 'rAnkle', end: 'rToe', dof: 'rAn', label: 'Les orteils et la cheville sont tirés vers soi', simple: 'On tire les orteils vers soi', sign: -1 },
    muscles: { work: [], stretch: ['rMollet'], stabilize: [] },
    contraction: 'Étirement maintenu 30 s', why: 'Tend le fascia plantaire avant les premiers pas, le moment le plus douloureux.',
    equipment: [CHAIR], camera: FRONT, target: [0, 0.7, 0.2],
  },
} as Record<string, Motion>)
