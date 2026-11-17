import * as THREE from 'three'

/**
 * Personnage articulé procédural (≈ 1,75 m) pour visualiser les exercices.
 * Repère : y vers le haut, le personnage regarde vers +z, son côté DROIT est en −x.
 * Les angles de `Pose` sont en degrés, en convention anatomique :
 *   flexion +, abduction +, rotation externe +, flexion plantaire (pointe) +, rétraction scapulaire +.
 * Dans la version finale, ce rig sera remplacé par un modèle glTF skinné ; le format Pose reste.
 */
export interface Pose {
  // posture globale (bassin)
  px: number; py: number; pz: number; rx: number; ry: number; rz: number
  spF: number; spS: number; spT: number; hdF: number
  /** rotation de la tête (°) et rétraction du menton (cm) */
  hdR: number; hdT: number
  /** flexion du poignet (+ = main vers la paume) */
  rWr: number; lWr: number
  rScR: number; lScR: number; rScE: number; lScE: number
  rShF: number; rShA: number; rShR: number; lShF: number; lShA: number; lShR: number
  rEl: number; lEl: number
  rHiF: number; rHiA: number; rHiR: number; lHiF: number; lHiA: number; lHiR: number
  rKn: number; lKn: number
  rAn: number; lAn: number; rAnEv: number; lAnEv: number
}

export const NEUTRAL: Pose = {
  px: 0, py: 0.95, pz: 0, rx: 0, ry: 0, rz: 0, spF: 0, spS: 0, spT: 0, hdF: 0, hdR: 0, hdT: 0, rWr: 0, lWr: 0,
  rScR: 0, lScR: 0, rScE: 0, lScE: 0,
  rShF: 0, rShA: 6, rShR: 0, lShF: 0, lShA: 6, lShR: 0, rEl: 8, lEl: 8,
  rHiF: 0, rHiA: 3, rHiR: 0, lHiF: 0, lHiA: 3, lHiR: 0, rKn: 2, lKn: 2, rAn: 0, lAn: 0, rAnEv: 0, lAnEv: 0,
}

export type BoneName =
  | 'pelvis' | 'lumbar' | 'chest' | 'neck'
  | 'rGirdle' | 'lGirdle' | 'rShoulder' | 'lShoulder' | 'rElbow' | 'lElbow' | 'rHand' | 'lHand'
  | 'rHip' | 'lHip' | 'rKnee' | 'lKnee' | 'rAnkle' | 'lAnkle' | 'rToe' | 'lToe' | 'rHeel' | 'lHeel'

export type MuscleId =
  | 'rPectoral' | 'lPectoral' | 'rDeltoide' | 'lDeltoide' | 'rSupraEpineux' | 'lSupraEpineux'
  | 'rInfraEpineux' | 'lInfraEpineux' | 'trapezeSup' | 'rhomboides' | 'trapezeInf'
  | 'rDentele' | 'lDentele' | 'rGrandDorsal' | 'lGrandDorsal' | 'rBiceps' | 'lBiceps' | 'rTriceps' | 'lTriceps'
  | 'abdominaux' | 'paravertebraux' | 'rFessier' | 'lFessier' | 'rMoyenFessier' | 'lMoyenFessier'
  | 'rQuadriceps' | 'lQuadriceps' | 'rIschios' | 'lIschios' | 'rMollet' | 'lMollet'
  | 'rTibialAnt' | 'lTibialAnt' | 'rFibulaires' | 'lFibulaires'
  | 'rExtPoignet' | 'lExtPoignet' | 'rFlechPoignet' | 'lFlechPoignet' | 'flechCou' | 'rPsoas' | 'lPsoas' | 'rAdducteurs' | 'lAdducteurs'

const BASE_LABEL: Record<string, string> = {
  Pectoral: 'Grand pectoral', Deltoide: 'Deltoïde', SupraEpineux: 'Supra-épineux', InfraEpineux: 'Rotateurs externes (infra-épineux)',
  trapezeSup: 'Trapèze supérieur', rhomboides: 'Trapèze moyen & rhomboïdes', trapezeInf: 'Trapèze inférieur', Dentele: 'Dentelé antérieur',
  GrandDorsal: 'Grand dorsal', Biceps: 'Biceps', Triceps: 'Triceps', abdominaux: 'Abdominaux (gainage)', paravertebraux: 'Muscles du dos (paravertébraux)',
  Fessier: 'Grand fessier', MoyenFessier: 'Moyen fessier', Quadriceps: 'Quadriceps', Ischios: 'Ischio-jambiers', Mollet: 'Mollet (triceps sural)',
  TibialAnt: 'Tibial antérieur', Fibulaires: 'Fibulaires (éverseurs)',
  ExtPoignet: 'Extenseurs du poignet', FlechPoignet: 'Fléchisseurs du poignet', flechCou: 'Fléchisseurs profonds du cou', Psoas: 'Psoas (fléchisseur de hanche)', Adducteurs: 'Adducteurs',
}
const SIMPLE_LABEL: Record<string, string> = {
  Pectoral: 'Muscle de la poitrine', Deltoide: "Muscle rond de l'épaule", SupraEpineux: "Muscle au-dessus de l'omoplate", InfraEpineux: "Muscles qui tournent le bras vers l'extérieur",
  trapezeSup: 'Haut des épaules', rhomboides: 'Muscles entre les omoplates', trapezeInf: 'Bas des omoplates', Dentele: "Muscle qui plaque l'omoplate",
  GrandDorsal: 'Grand muscle du dos', Biceps: 'Biceps', Triceps: 'Arrière du bras', abdominaux: 'Ventre (gainage)', paravertebraux: 'Muscles le long de la colonne',
  Fessier: 'Fesse', MoyenFessier: 'Côté de la hanche', Quadriceps: 'Avant de la cuisse', Ischios: 'Arrière de la cuisse', Mollet: 'Mollet',
  TibialAnt: 'Avant de la jambe', Fibulaires: 'Côté extérieur de la jambe',
  ExtPoignet: 'Muscles du dessus de l\'avant-bras', FlechPoignet: 'Muscles du dessous de l\'avant-bras', flechCou: 'Muscles profonds de l\'avant du cou', Psoas: 'Muscle qui lève la cuisse', Adducteurs: 'Intérieur de la cuisse',
}
export function muscleLabel(id: MuscleId, simple: boolean) {
  const side = id.startsWith('r') && id[1] === id[1].toUpperCase() ? 'r' : id.startsWith('l') && id[1] === id[1].toUpperCase() ? 'l' : ''
  const key = side ? id.slice(1) : id
  const base = (simple ? SIMPLE_LABEL : BASE_LABEL)[key] ?? key
  return side ? `${base} ${side === 'r' ? 'droit' : 'gauche'}` : base
}

export interface Rig {
  root: THREE.Group
  bones: Record<BoneName, THREE.Object3D>
  muscles: Record<MuscleId, THREE.Mesh>
  skin: THREE.Mesh[]
  skeleton: THREE.Object3D[]
  materials: { skin: THREE.MeshStandardMaterial; bone: THREE.MeshStandardMaterial }
}

const deg = THREE.MathUtils.degToRad

function capsule(r: number, len: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 8, 20), mat)
  return m
}

export function buildRig(): Rig {
  const skinMat = new THREE.MeshStandardMaterial({ color: '#D9C2B2', roughness: 0.75, transparent: true, opacity: 0.3, depthWrite: false })
  const boneMat = new THREE.MeshStandardMaterial({ color: '#EFE6D2', roughness: 0.55 })
  const skin: THREE.Mesh[] = []
  const skeleton: THREE.Object3D[] = []
  const add = (parent: THREE.Object3D, o: THREE.Object3D, kind: 'skin' | 'bone') => { parent.add(o); if (kind === 'skin') skin.push(o as THREE.Mesh); else skeleton.push(o) }
  const node = (parent: THREE.Object3D, x = 0, y = 0, z = 0, order: THREE.EulerOrder = 'XZY') => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.order = order; parent.add(g); return g }

  const root = new THREE.Group(); root.rotation.order = 'YXZ'
  const pelvis = node(root, 0, 0, 0, 'YXZ')
  const lumbar = node(pelvis, 0, 0.08, 0)
  const chest = node(lumbar, 0, 0.22, 0)
  const neck = node(chest, 0, 0.32, 0)
  const rGirdle = node(chest, -0.02, 0.25, -0.01)
  const lGirdle = node(chest, 0.02, 0.25, -0.01)
  const rShoulder = node(rGirdle, -0.17, 0, 0)
  const lShoulder = node(lGirdle, 0.17, 0, 0)
  const rElbow = node(rShoulder, 0, -0.29, 0)
  const lElbow = node(lShoulder, 0, -0.29, 0)
  const rHand = node(rElbow, 0, -0.26, 0)
  const lHand = node(lElbow, 0, -0.26, 0)
  const rHip = node(pelvis, -0.09, -0.06, 0)
  const lHip = node(pelvis, 0.09, -0.06, 0)
  const rKnee = node(rHip, 0, -0.43, 0)
  const lKnee = node(lHip, 0, -0.43, 0)
  const rAnkle = node(rKnee, 0, -0.42, 0)
  const lAnkle = node(lKnee, 0, -0.42, 0)
  const rToe = node(rAnkle, 0, -0.075, 0.18); const lToe = node(lAnkle, 0, -0.075, 0.18)
  const rHeel = node(rAnkle, 0, -0.075, -0.05); const lHeel = node(lAnkle, 0, -0.075, -0.05)

  // --- Peau (silhouette translucide)
  const pelvisSkin = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), skinMat); pelvisSkin.scale.set(0.17, 0.11, 0.11); pelvisSkin.position.y = 0.01
  add(pelvis, pelvisSkin, 'skin')
  const waist = capsule(0.12, 0.12, skinMat); waist.scale.set(1.15, 1, 0.8); waist.position.y = 0.11; add(lumbar, waist, 'skin')
  const torso = capsule(0.15, 0.14, skinMat); torso.scale.set(1.2, 1, 0.78); torso.position.y = 0.17; add(chest, torso, 'skin')
  const neckSkin = capsule(0.05, 0.06, skinMat); neckSkin.position.y = 0.03; add(neck, neckSkin, 'skin')
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 20), skinMat); head.scale.set(0.9, 1.12, 1); head.position.set(0, 0.17, 0.01); add(neck, head, 'skin')
  for (const [sh, el, hd] of [[rShoulder, rElbow, rHand], [lShoulder, lElbow, lHand]] as const) {
    const ua = capsule(0.05, 0.2, skinMat); ua.position.y = -0.145; add(sh, ua, 'skin')
    const fa = capsule(0.04, 0.19, skinMat); fa.position.y = -0.13; add(el, fa, 'skin')
    const h = capsule(0.035, 0.05, skinMat); h.scale.set(1, 1, 0.6); h.position.y = -0.05; add(hd, h, 'skin')
  }
  for (const [hp, kn, an] of [[rHip, rKnee, rAnkle], [lHip, lKnee, lAnkle]] as const) {
    const th = capsule(0.075, 0.28, skinMat); th.position.y = -0.21; add(hp, th, 'skin')
    const sh = capsule(0.055, 0.3, skinMat); sh.position.y = -0.2; add(kn, sh, 'skin')
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.24), skinMat); ft.position.set(0, -0.045, 0.06); add(an, ft, 'skin')
  }

  // --- Squelette simplifié
  const bone = (parent: THREE.Object3D, len: number, r: number, y0 = 0) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, len, 12), boneMat); b.position.y = y0 - len / 2; add(parent, b, 'bone')
    const j = new THREE.Mesh(new THREE.SphereGeometry(r * 1.6, 14, 10), boneMat); j.position.y = y0; add(parent, j, 'bone')
  }
  const pel = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 10, 28), boneMat); pel.rotation.x = Math.PI / 2; pel.scale.set(1.3, 1, 1); add(pelvis, pel, 'bone')
  const spine1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.22, 10), boneMat); spine1.position.set(0, 0.11, -0.06); add(lumbar, spine1, 'bone')
  const spine2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.32, 10), boneMat); spine2.position.set(0, 0.16, -0.07); add(chest, spine2, 'bone')
  const ribs = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0.35, 2.3), new THREE.MeshStandardMaterial({ color: '#EFE6D2', wireframe: true, transparent: true, opacity: 0.45 }))
  ribs.scale.set(0.15, 0.17, 0.11); ribs.position.y = 0.16; add(chest, ribs, 'bone')
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 14), boneMat); skull.position.set(0, 0.17, 0.01); add(neck, skull, 'bone')
  for (const [g, s] of [[rGirdle, -1], [lGirdle, 1]] as const) {
    const clav = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), boneMat); clav.rotation.z = Math.PI / 2; clav.position.set(0.085 * s, 0.01, 0.05); add(g, clav, 'bone')
    const scap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.012), boneMat); scap.position.set(0.1 * s, -0.06, -0.1); add(g, scap, 'bone')
  }
  bone(rShoulder, 0.29, 0.016); bone(lShoulder, 0.29, 0.016); bone(rElbow, 0.26, 0.013); bone(lElbow, 0.26, 0.013)
  bone(rHip, 0.43, 0.022); bone(lHip, 0.43, 0.022); bone(rKnee, 0.42, 0.019); bone(lKnee, 0.42, 0.019)
  for (const an of [rAnkle, lAnkle]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.2), boneMat); f.position.set(0, -0.06, 0.06); add(an, f, 'bone') }

  // --- Muscles (ellipsoïdes rattachés aux segments)
  const mk = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), new THREE.MeshStandardMaterial({ color: '#C48C7F', roughness: 0.5, transparent: true, opacity: 0.85, emissive: new THREE.Color('#000000') }))
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m
  }
  const M = {} as Record<MuscleId, THREE.Mesh>
  for (const [p, s, girdle, sh, hip, kn, el] of [['r', -1, rGirdle, rShoulder, rHip, rKnee, rElbow], ['l', 1, lGirdle, lShoulder, lHip, lKnee, lElbow]] as const) {
    M[`${p}ExtPoignet`] = mk(el, 0, -0.09, 0.028, 0.03, 0.085, 0.024)
    M[`${p}FlechPoignet`] = mk(el, 0, -0.09, -0.028, 0.03, 0.085, 0.024)
    M[`${p}Psoas`] = mk(pelvis, 0.065 * s, 0.0, 0.07, 0.033, 0.07, 0.033)
    M[`${p}Adducteurs`] = mk(hip, -0.035 * s, -0.17, 0, 0.032, 0.15, 0.04)
    M[`${p}Pectoral`] = mk(chest, 0.085 * s, 0.2, 0.085, 0.075, 0.055, 0.03)
    M[`${p}Dentele`] = mk(chest, 0.145 * s, 0.11, 0.02, 0.03, 0.08, 0.06)
    M[`${p}GrandDorsal`] = mk(chest, 0.115 * s, 0.05, -0.07, 0.055, 0.11, 0.04)
    M[`${p}SupraEpineux`] = mk(girdle, 0.09 * s, 0.03, -0.06, 0.08, 0.022, 0.028)
    M[`${p}InfraEpineux`] = mk(girdle, 0.095 * s, -0.07, -0.115, 0.065, 0.06, 0.018)
    M[`${p}Deltoide`] = mk(sh, 0.012 * s, -0.07, 0, 0.066, 0.1, 0.066)
    M[`${p}Biceps`] = mk(sh, 0, -0.17, 0.035, 0.033, 0.085, 0.033)
    M[`${p}Triceps`] = mk(sh, 0, -0.16, -0.035, 0.038, 0.095, 0.033)
    M[`${p}Fessier`] = mk(pelvis, 0.08 * s, -0.04, -0.085, 0.08, 0.085, 0.05)
    M[`${p}MoyenFessier`] = mk(pelvis, 0.135 * s, 0.03, -0.02, 0.04, 0.06, 0.06)
    M[`${p}Quadriceps`] = mk(hip, 0, -0.21, 0.035, 0.065, 0.17, 0.05)
    M[`${p}Ischios`] = mk(hip, 0, -0.23, -0.045, 0.055, 0.16, 0.045)
    M[`${p}Mollet`] = mk(kn, 0, -0.13, -0.04, 0.045, 0.12, 0.04)
    M[`${p}TibialAnt`] = mk(kn, 0.01 * s, -0.18, 0.035, 0.022, 0.13, 0.022)
    M[`${p}Fibulaires`] = mk(kn, -0.04 * s * -1 * -1, -0.2, -0.005, 0.018, 0.13, 0.022)
  }
  // fibulaires : côté latéral (vers l'extérieur du corps)
  M.rFibulaires.position.x = -0.045; M.lFibulaires.position.x = 0.045
  M.trapezeSup = mk(chest, 0, 0.29, -0.05, 0.14, 0.035, 0.045)
  M.rhomboides = mk(chest, 0, 0.19, -0.105, 0.11, 0.05, 0.02)
  M.trapezeInf = mk(chest, 0, 0.07, -0.105, 0.065, 0.075, 0.02)
  M.abdominaux = mk(lumbar, 0, 0.14, 0.09, 0.085, 0.16, 0.028)
  M.flechCou = mk(neck, 0, 0.05, 0.035, 0.028, 0.05, 0.018)
  M.paravertebraux = mk(lumbar, 0, 0.15, -0.085, 0.055, 0.18, 0.03)

  const bones = { pelvis, lumbar, chest, neck, rGirdle, lGirdle, rShoulder, lShoulder, rElbow, lElbow, rHand, lHand, rHip, lHip, rKnee, lKnee, rAnkle, lAnkle, rToe, lToe, rHeel, lHeel } as Record<BoneName, THREE.Object3D>
  return { root, bones, muscles: M, skin, skeleton, materials: { skin: skinMat, bone: boneMat } }
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a }
  for (const k of Object.keys(a) as (keyof Pose)[]) out[k] = a[k] + (b[k] - a[k]) * t
  return out
}

export function applyPose(rig: Rig, p: Pose) {
  const B = rig.bones
  rig.root.position.set(p.px, p.py, p.pz)
  rig.root.rotation.set(deg(p.rx), deg(p.ry), deg(p.rz))
  B.lumbar.rotation.set(deg(p.spF * 0.5), deg(p.spT * 0.5), deg(p.spS * 0.5))
  B.chest.rotation.set(deg(p.spF * 0.5), deg(p.spT * 0.5), deg(p.spS * 0.5))
  B.neck.rotation.set(deg(p.hdF), deg(p.hdR), 0)
  B.neck.position.z = -(p.hdT ?? 0) / 100
  B.rHand.rotation.set(deg(p.rWr ?? 0), 0, 0)
  B.lHand.rotation.set(deg(p.lWr ?? 0), 0, 0)
  B.rGirdle.rotation.set(0, deg(-p.rScR), deg(-p.rScE))
  B.lGirdle.rotation.set(0, deg(p.lScR), deg(p.lScE))
  B.rShoulder.rotation.set(deg(-p.rShF), deg(-p.rShR), deg(-p.rShA))
  B.lShoulder.rotation.set(deg(-p.lShF), deg(p.lShR), deg(p.lShA))
  B.rElbow.rotation.set(deg(-p.rEl), 0, 0)
  B.lElbow.rotation.set(deg(-p.lEl), 0, 0)
  B.rHip.rotation.set(deg(-p.rHiF), deg(-p.rHiR), deg(-p.rHiA))
  B.lHip.rotation.set(deg(-p.lHiF), deg(p.lHiR), deg(p.lHiA))
  B.rKnee.rotation.set(deg(p.rKn), 0, 0)
  B.lKnee.rotation.set(deg(p.lKn), 0, 0)
  B.rAnkle.rotation.set(deg(p.rAn), 0, deg(-p.rAnEv))
  B.lAnkle.rotation.set(deg(p.lAn), 0, deg(p.lAnEv))
}
