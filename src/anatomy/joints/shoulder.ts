// Épaule droite : glénohumérale + rythme scapulo-huméral (1/3 omoplate, 2/3 humérus).
import type { JointDef, V3 } from '../types'
import { ellipsoid, near, ring, skinLines } from './helpers'

const GH: V3 = [-0.16, 1.322, 0.07]
const SC: V3 = [-0.02, 1.352, 0.125]
const GLENOID: V3 = [-0.142, 1.321, 0.069]
const ACROMION: V3 = [-0.162, 1.353, 0.072]

export const SHOULDER: JointDef = {
  skinLines: skinLines({ rclav: 'scap', rbras: 'arm', ravbras: 'arm', rmain: 'arm' }),
  id: 'epaule',
  label: 'Épaule',
  dofs: [
    { id: 'abd', label: 'Lever le bras sur le côté', min: 0, max: 175, rest: 0 },
    { id: 'flex', label: 'Lever le bras devant', min: 0, max: 175, rest: 0 },
    { id: 'rot', label: 'Rotation externe', min: -60, max: 80, rest: 0 },
  ],
  bones: [
    { name: 'right scapula', seg: 'scap', label: 'Omoplate (scapula)', simple: 'Omoplate', anchor: [-0.1, 1.28, 0.0] },
    { name: 'right clavicle', seg: 'scap', label: 'Clavicule', simple: 'Clavicule', anchor: [-0.08, 1.36, 0.12] },
    { name: 'right humerus', seg: 'arm', label: 'Humérus', simple: 'Os du bras', anchor: [-0.2, 1.2, 0.075] },
    { name: 'right first rib', seg: 'fixed', label: '', simple: '' },
    { name: 'right second rib', seg: 'fixed', label: '', simple: '' },
    { name: 'right third rib', seg: 'fixed', label: '', simple: '' },
    { name: 'manubrium', seg: 'fixed', label: '', simple: '' },
  ],
  muscles: [
    { name: 'right supraspinatus', label: 'Supra-épineux', simple: 'Tendon du dessus de l\'épaule', group: 'flexor', unit: 'coiffe' },
    { name: 'right infraspinatus muscle', label: 'Infra-épineux', simple: 'Coiffe (arrière)', group: 'flexor', unit: 'coiffe' },
    { name: 'right teres minor', label: 'Petit rond', simple: 'Coiffe (arrière)', group: 'flexor', unit: 'coiffe' },
    { name: 'right subscapularis', label: 'Subscapulaire', simple: 'Coiffe (avant)', group: 'flexor', unit: 'coiffe' },
    { name: 'clavicular part of right deltoid', label: 'Deltoïde antérieur', simple: 'Muscle du moignon de l\'épaule', group: 'flexor', unit: 'deltoide' },
    { name: 'acromial part of right deltoid', label: 'Deltoïde moyen', simple: 'Muscle du moignon de l\'épaule', group: 'flexor', unit: 'deltoide' },
    { name: 'spinal part of right deltoid', label: 'Deltoïde postérieur', simple: 'Muscle du moignon de l\'épaule', group: 'flexor', unit: 'deltoide' },
    { name: 'descending part of right trapezius', label: 'Trapèze supérieur', simple: 'Muscle du haut du dos', group: 'flexor', unit: 'trapeze' },
    { name: 'ascending part of right trapezius', label: 'Trapèze inférieur', simple: 'Muscle du haut du dos', group: 'flexor', unit: 'trapeze' },
    { name: 'right serratus anterior', label: 'Dentelé antérieur', simple: 'Muscle qui plaque l\'omoplate', group: 'flexor', unit: 'dentele' },
    { name: 'long head of right biceps brachii', label: 'Biceps (long chef)', simple: 'Biceps', group: 'other', unit: 'biceps' },
    { name: 'short head of right biceps brachii', label: 'Biceps (court chef)', simple: 'Biceps', group: 'other', unit: 'biceps' },
  ],
  units: [
    { id: 'coiffe', label: 'Coiffe des rotateurs', simple: 'Tendons qui tiennent la tête de l\'humérus' },
    { id: 'deltoide', label: 'Deltoïde', simple: 'Muscle qui lève le bras' },
    { id: 'trapeze', label: 'Trapèze', simple: 'Muscle qui monte l\'omoplate' },
    { id: 'dentele', label: 'Dentelé antérieur', simple: 'Muscle qui plaque l\'omoplate' },
    { id: 'biceps', label: 'Biceps', simple: 'Biceps' },
  ],
  extraMuscles: ['right coracobrachialis', 'long head of right triceps brachii', 'lateral head of right triceps brachii'],
  rigidMuscles: { 'descending part of right trapezius': 'fixed', 'ascending part of right trapezius': 'fixed', 'right serratus anterior': 'fixed' },
  segments: [
    { id: 'scap', pivot: SC, axis: [0, 0, -1], dof: 'abd', ratio: 0.16, alt: [{ dof: 'flex', axis: [0.5, 0, -0.85], ratio: 0.14 }] },
    { id: 'arm', parent: 'scap', pivot: GH, axis: [0, 0, -1], dof: 'abd', ratio: 0.84, alt: [{ dof: 'flex', axis: [-1, 0, 0], ratio: 0.86 }, { dof: 'rot', axis: [0, 1, 0], ratio: -1 }] },
  ],
  blend: [
    { from: 'scap', seg: 'arm', center: GH, dir: [0.55, 0.83, 0], band: 0.028, inRegion: (x, y) => x < -0.13 && y > 0.95 && y < 1.42 },
    { seg: 'scap', center: [-0.11, 1.33, 0.07], dir: [1, 0, 0], band: 0.03, inRegion: (x, y) => x < -0.06 && y > 1.12 },
  ],
  cartilage: [
    { bone: 'right humerus', test: (x, y, z) => near(GH, 0.029)(x, y, z) && x > -0.168 && y > 1.3 },
    { bone: 'right scapula', test: near(GLENOID, 0.02) },
  ],
  ligaments: [
    { id: 'coraco-acromial', label: 'Ligament coraco-acromial', simple: 'Toit de l\'épaule', a: { seg: 'scap', p: [-0.128, 1.335, 0.112] }, b: { seg: 'scap', p: [-0.158, 1.354, 0.088] }, width: 0.012, thick: 0.004 },
    { id: 'tendon-supra', label: 'Tendon du supra-épineux', simple: 'Tendon qui frotte', a: { seg: 'scap', p: [-0.135, 1.345, 0.06] }, b: { seg: 'arm', p: [-0.183, 1.338, 0.075] }, width: 0.016, thick: 0.004, kind: 'tendon' },
  ],
  customs: [
    { id: 'bourse', label: 'Bourse sous-acromiale', simple: 'Petit coussin sous l\'acromion', seg: 'scap', kind: 'bursa', build: () => ellipsoid([-0.165, 1.346, 0.074], [0.026, 0.0045, 0.022]) },
    { id: 'capsule', label: 'Capsule articulaire', simple: 'Enveloppe de l\'articulation', seg: 'scap', kind: 'cartilage', opacity: 0.28, build: () => ellipsoid([-0.152, 1.318, 0.07], [0.022, 0.032, 0.03]) },
    { id: 'labrum', label: 'Bourrelet glénoïdien', simple: 'Rebord de la cavité', seg: 'scap', kind: 'meniscus', build: () => ring(GLENOID, [-1, 0, 0], 0.016, 0.0025) },
  ],
  actions: { increasing: 'flexor', decreasing: 'flexor', hold: 'flexor' },
  camera: { pos: [-0.85, 1.42, 0.85], target: [-0.15, 1.3, 0.07], fov: 30, frame: [0.38, 0.4] },
  arc: { radius: 0.15, offset: [0, 0, 0.07] },
  clip: { minY: 0.98, maxY: 1.85 },
  pathologies: {
    conflit: {
      friction: [{ id: 'f-sa', label: 'FROTTEMENT / CONFLIT', at: { seg: 'scap', p: [-0.166, 1.343, 0.074] }, window: [60, 120], arrow: [0, 1, 0] }],
      damaged: ['tendon-supra', 'bourse'],
      painZone: [60, 120], suffers: ['Tendon du supra-épineux', 'Bourse sous l\'acromion'], works: ['Deltoïde', 'Coiffe : elle doit centrer la tête de l\'humérus'], todo: 'Renforcer la coiffe et l\'omoplate pour redonner de la place au tendon.',
      caption: 'Arc douloureux : le tendon du supra-épineux et la bourse passent sous l\'acromion entre 60 et 120°.',
      simpleCaption: 'En levant le bras, le tendon passe sous un os et frotte : ça pince à mi-hauteur.',
    },
    'tendinopathie-coiffe': {
      damaged: ['tendon-supra', 'right supraspinatus'],
      friction: [{ id: 'f-tc', label: 'TENDON SURCHARGÉ', at: { seg: 'arm', p: [-0.182, 1.338, 0.075] }, window: [70, 130], arrow: [1, 0, 0] }],
      painZone: [70, 130], suffers: ['Tendon du supra-épineux, irrité'], works: ['Coiffe des rotateurs', 'Deltoïde'], todo: 'Charger le tendon progressivement : isométrie puis renforcement.',
      caption: 'Tendinopathie du supra-épineux : douleur à l\'élévation chargée.',
      simpleCaption: 'Le tendon du dessus de l\'épaule est fatigué : il fait mal quand on lève le bras avec une charge.',
    },
    'tendinopathie-calcifiante': {
      damaged: ['calcif', 'tendon-supra'], rom: [0, 150],
      friction: [{ id: 'f-cal', label: 'CALCIFICATION', at: { seg: 'arm', p: [-0.178, 1.341, 0.074] }, window: [50, 130], arrow: [0, 1, 0] }],
      painZone: [50, 130], suffers: ['Dépôt de calcium dans le tendon'], works: ['Deltoïde'], todo: 'Calmer l\'inflammation, puis renforcer ; la calcification se résorbe souvent seule.',
      caption: 'Calcification du tendon du supra-épineux, conflictuelle sous l\'acromion.',
      simpleCaption: 'Un petit dépôt dur s\'est formé dans le tendon : il frotte en levant le bras.',
    },
    'rupture-coiffe': {
      damaged: ['right supraspinatus', 'tendon-supra'], torn: ['tendon-supra'], rom: [0, 120],
      painZone: [60, 120], suffers: ['Tendon du supra-épineux, rompu'], works: ['Deltoïde : il compense seul'], todo: 'Renforcer les muscles restants et le deltoïde pour retrouver un bras fonctionnel.',
      caption: 'Rupture du supra-épineux : élévation active limitée, compensée par le deltoïde.',
      simpleCaption: 'Un tendon s\'est déchiré : le bras monte moins bien tout seul.',
    },
    capsulite: {
      rom: [0, 70], damaged: ['capsule'],
      painZone: [55, 70], suffers: ['Capsule de l\'épaule, épaissie et rétractée'], works: ['Omoplate : elle compense en montant'], todo: 'Mobiliser doucement tous les jours, sans forcer : la mobilité revient en plusieurs mois.',
      caption: 'Capsulite rétractée : la capsule épaissie limite toutes les amplitudes, surtout la rotation externe.',
      simpleCaption: 'L\'enveloppe de l\'épaule a rétréci : le bras se bloque vite.',
    },
    bursite: {
      damaged: ['bourse'],
      friction: [{ id: 'f-bur', label: 'BOURSE ENFLAMMÉE', at: { seg: 'scap', p: [-0.166, 1.346, 0.074] }, window: [60, 120], arrow: [0, 1, 0] }],
      painZone: [60, 120], suffers: ['Bourse sous-acromiale, gonflée'], works: ['Deltoïde'], todo: 'Calmer la bourse, puis renforcer la coiffe et l\'omoplate.',
      caption: 'Bursite sous-acromiale : bourse épaissie, compressée dans l\'arc moyen.',
      simpleCaption: 'Le petit coussin sous l\'os est gonflé : il est écrasé quand le bras monte.',
    },
    'instabilite-epaule': {
      motion: 'rot', damaged: ['labrum'], shift: { seg: 'arm', by: [0, -0.002, 0.007] },
      painZone: [50, 80], suffers: ['Bourrelet et capsule à l\'avant'], works: ['Subscapulaire', 'Grand pectoral'], todo: 'Renforcer la coiffe et contrôler la position du bras avant de reprendre le sport.',
      caption: 'Instabilité antérieure : la tête humérale glisse vers l\'avant en abduction-rotation externe.',
      simpleCaption: 'La tête de l\'os du bras a tendance à sortir vers l\'avant quand on tourne le bras.',
    },
  },
}
// Dépôt calcique du tendon (rendu dans le calque ligaments)
SHOULDER.customs.push({ id: 'calcif', label: 'Calcification', simple: 'Dépôt de calcium', seg: 'arm', kind: 'implant', only: ['tendinopathie-calcifiante'], build: () => ellipsoid([-0.176, 1.342, 0.074], [0.006, 0.0035, 0.005], 14) })
export const SHOULDER_ACROMION = ACROMION
