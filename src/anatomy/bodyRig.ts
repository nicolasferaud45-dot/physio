// Corps réel (BodyParts3D) articulé avec la même hiérarchie et les mêmes angles que le mannequin
// des exercices : les fiches d'exercices (motions.ts) l'animent sans changement.
// Os : rigides, rattachés à leur segment. Muscles et peau : déformés par mélange des deux segments
// les plus proches (poids calculés une fois au chargement).
import * as THREE from 'three'
import type { Anatomy } from './loader'
import { COLORS, makeMaterials } from './materials'
import type { BoneName, MuscleId, Rig } from '../three/rig'
import { BODY_BONES, BODY_MUSCLES } from './joints/body-parts'

type V = [number, number, number]
const PELVIS: V = [0, 0.9, 0.07]
const NEUTRAL_PY = 0.95
// repère du mannequin = repère BodyParts3D décalé pour que le bassin soit à (0, 0.95, 0)
const DELTA = new THREE.Vector3(-PELVIS[0], NEUTRAL_PY - PELVIS[1], -PELVIS[2])

const SIDE = (r: V, s: 1 | -1): V => [r[0] * s, r[1], r[2]]
const LM: Record<string, V> = {
  pelvis: PELVIS, lumbar: [0, 0.93, 0.07], chest: [0, 1.05, 0.07], neck: [0, 1.41, 0.07],
  rGirdle: [-0.02, 1.352, 0.125], rShoulder: [-0.16, 1.322, 0.07], rElbow: [-0.21, 1.052, 0.066], rHand: [-0.252, 0.815, 0.113],
  rHip: [-0.083, 0.812, 0.09], rKnee: [-0.075, 0.428, 0.066], rAnkle: [-0.075, 0.057, 0.066], rToe: [-0.085, 0.0, 0.228], rHeel: [-0.083, 0.0, 0.015],
}
for (const k of Object.keys(LM)) if (k[0] === 'r' && k[1] === k[1].toUpperCase()) LM['l' + k.slice(1)] = SIDE(LM[k], -1)
const PARENT: Record<BoneName, BoneName | null> = {
  pelvis: null, lumbar: 'pelvis', chest: 'lumbar', neck: 'chest',
  rGirdle: 'chest', lGirdle: 'chest', rShoulder: 'rGirdle', lShoulder: 'lGirdle', rElbow: 'rShoulder', lElbow: 'lShoulder', rHand: 'rElbow', lHand: 'lElbow',
  rHip: 'pelvis', lHip: 'pelvis', rKnee: 'rHip', lKnee: 'lHip', rAnkle: 'rKnee', lAnkle: 'lKnee', rToe: 'rAnkle', lToe: 'lAnkle', rHeel: 'rAnkle', lHeel: 'lAnkle',
}
/** segments « os » pour les poids des tissus mous : de l'articulation au bout du segment */
const LINES: [BoneName, V, V][] = [
  ['pelvis', [-0.09, 0.84, 0.08], [0.09, 0.84, 0.08]], ['pelvis', [0, 0.84, 0.06], [0, 0.93, 0.06]],
  ['lumbar', LM.lumbar, LM.chest], ['chest', LM.chest, [0, 1.36, 0.07]], ['neck', LM.neck, [0, 1.6, 0.06]],
]
for (const s of [1, -1] as const) {
  const p = s === 1 ? 'r' : 'l', f = (v: V) => SIDE(v, s)
  LINES.push([`${p}Girdle` as BoneName, f([-0.03, 1.35, 0.11]), f([-0.15, 1.33, 0.06])], [`${p}Girdle` as BoneName, f([-0.06, 1.33, 0.0]), f([-0.12, 1.22, 0.01])],
    [`${p}Shoulder` as BoneName, f(LM.rShoulder), f(LM.rElbow)], [`${p}Elbow` as BoneName, f(LM.rElbow), f(LM.rHand)], [`${p}Hand` as BoneName, f(LM.rHand), f([-0.27, 0.68, 0.17])],
    [`${p}Hip` as BoneName, f(LM.rHip), f(LM.rKnee)], [`${p}Knee` as BoneName, f(LM.rKnee), f(LM.rAnkle)], [`${p}Ankle` as BoneName, f(LM.rAnkle), f([-0.08, 0.01, 0.2])])
}

function boneSegment(name: string): BoneName {
  const n = name.toLowerCase()
  const side = /\bleft\b/.test(n) ? 'l' : 'r'
  if (/hip bone|sacrum|coccyx/.test(n)) return 'pelvis'
  if (/(third|fourth|fifth) lumbar/.test(n)) return 'lumbar'
  if (/(sixth|seventh) cervical/.test(n)) return 'chest'
  if (/cervical|atlas|axis|occipital|frontal|parietal|temporal|sphenoid|zygomatic|maxilla|nasal|mandible|vomer/.test(n)) return 'neck'
  if (/clavicle|scapula/.test(n)) return `${side}Girdle` as BoneName
  if (/humerus/.test(n)) return `${side}Shoulder` as BoneName
  if (/radius|ulna/.test(n)) return `${side}Elbow` as BoneName
  if (/scaphoid|lunate|triquetral|pisiform|trapez|capitate|hamate|metacarpal|finger|thumb/.test(n)) return `${side}Hand` as BoneName
  if (/femur/.test(n)) return `${side}Hip` as BoneName
  if (/tibia|fibula|patella/.test(n)) return `${side}Knee` as BoneName
  if (/talus|calcaneus|navicular|cuneiform|cuboid|metatarsal|toe/.test(n)) return `${side}Ankle` as BoneName
  return 'chest' // vertèbres thoraciques, lombaires hautes, côtes, sternum
}

const MAP: Partial<Record<MuscleId, string[]>> = {
  rDeltoide: ['clavicular part of right deltoid', 'acromial part of right deltoid', 'spinal part of right deltoid'],
  rSupraEpineux: ['right supraspinatus'], rInfraEpineux: ['right infraspinatus muscle', 'right teres minor'],
  rPectoral: ['clavicular part of right pectoralis major', 'sternocostal part of right pectoralis major', 'abdominal part of right pectoralis major'],
  rDentele: ['right serratus anterior'], rGrandDorsal: ['right latissimus dorsi', 'right teres major'],
  rBiceps: ['long head of right biceps brachii', 'short head of right biceps brachii', 'right brachialis'],
  rTriceps: ['long head of right triceps brachii', 'lateral head of right triceps brachii', 'medial head of right triceps brachii'],
  rFessier: ['right gluteus maximus'], rMoyenFessier: ['right gluteus medius', 'right gluteus minimus'],
  rQuadriceps: ['right rectus femoris', 'right vastus lateralis', 'right vastus medialis', 'right vastus intermedius'],
  rIschios: ['long head of right biceps femoris', 'short head of right biceps femoris', 'right semitendinosus', 'right semimembranosus'],
  rMollet: ['medial head of right gastrocnemius', 'lateral head of right gastrocnemius', 'right soleus'],
  rTibialAnt: ['right tibialis anterior'], rFibulaires: ['right fibularis longus', 'right fibularis brevis'],
  rExtPoignet: ['right extensor carpi radialis longus', 'right extensor carpi radialis brevis', 'right extensor digitorum'],
  rFlechPoignet: ['right flexor carpi radialis', 'right palmaris longus', 'humeral head of right flexor carpi ulnaris', 'humeroulnar head of right flexor digitorum superficialis'],
  rPsoas: ['right psoas major', 'right iliacus'], rAdducteurs: ['right adductor longus', 'right adductor brevis', 'right adductor magnus', 'right gracilis', 'right pectineus'],
}
const BILAT: Partial<Record<MuscleId, string[]>> = {
  trapezeSup: ['descending part of right trapezius'], rhomboides: ['right rhomboid major', 'right rhomboid minor', 'transverse part of right trapezius'],
  trapezeInf: ['ascending part of right trapezius'], abdominaux: ['right rectus abdominis', 'right external oblique', 'right internal oblique', 'right transversus abdominis'],
  flechCou: ['vertical intermediate part of right longus colli', 'right longus capitis'],
  paravertebraux: ['right iliocostalis lumborum', 'right iliocostalis thoracis', 'right longissimus thoracis', 'right multifidus', 'right spinalis thoracis'],
}

interface Soft { name?: string; mesh: THREE.Mesh; rest: Float32Array; restN: Float32Array; a: Uint8Array; b: Uint8Array; w: Float32Array; owner?: THREE.Mesh }
export interface BodyRig extends Rig { update: () => void; isBody: true }

export function buildBodyRig(an: Anatomy): BodyRig {
  const mats = makeMaterials(false)
  const skinMat = new THREE.MeshPhysicalMaterial({ color: COLORS.skin, roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color('#ffd9c4'), transparent: true, opacity: 0.95 })
  const root = new THREE.Group(); root.rotation.order = 'YXZ'
  const bones = {} as Record<BoneName, THREE.Object3D>
  const names = Object.keys(PARENT) as BoneName[]
  // hiérarchie : positions relatives entre repères (repère du mannequin)
  const world = (n: BoneName) => new THREE.Vector3(...LM[n]).add(DELTA)
  for (const n of names) {
    const g = new THREE.Group(); g.rotation.order = n === 'pelvis' ? 'YXZ' : 'XZY'
    bones[n] = g
  }
  for (const n of names) {
    const par = PARENT[n]
    const g = bones[n]
    if (!par) { root.add(g); g.position.set(0, 0, 0); continue }
    bones[par].add(g)
    g.position.copy(world(n).sub(world(par)))
  }
  const restWorld = new Map<BoneName, THREE.Vector3>(names.map((n) => [n, world(n)]))
  const rootRest = new THREE.Vector3(0, NEUTRAL_PY, 0)

  // --- os
  const skeleton: THREE.Object3D[] = []
  const boneMat = mats.bone
  for (const name of BODY_BONES) {
    for (const mirror of /\bright\b/.test(name) ? [false, true] : [false]) {
      const g0 = an.geometry(name); if (!g0) continue
      const g = g0.clone()
      if (mirror) { const p = g.getAttribute('position') as THREE.BufferAttribute; for (let k = 0; k < p.count; k++) p.setX(k, -p.getX(k)); const idx = g.getIndex()!; for (let f = 0; f < idx.count; f += 3) { const a = idx.getX(f + 1); idx.setX(f + 1, idx.getX(f + 2)); idx.setX(f + 2, a) } g.computeVertexNormals() }
      const col = new Float32Array((g.getAttribute('position') as THREE.BufferAttribute).count * 3).fill(0)
      for (let k = 0; k < col.length; k += 3) { col[k] = COLORS.bone.r; col[k + 1] = COLORS.bone.g; col[k + 2] = COLORS.bone.b }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      const seg = boneSegment(mirror ? name.replace('right', 'left') : name)
      const mesh = new THREE.Mesh(g, boneMat)
      mesh.position.copy(DELTA).sub(restWorld.get(seg)!)
      bones[seg].add(mesh); skeleton.push(mesh)
    }
  }

  // --- tissus mous : poids vers les deux segments les plus proches
  const lines = LINES.map(([n, a, b]) => ({ i: names.indexOf(n), a: new THREE.Vector3(...a), b: new THREE.Vector3(...b) }))
  const softs: Soft[] = []
  const tmpP = new THREE.Vector3(), ab = new THREE.Vector3(), ap = new THREE.Vector3()
  const AXIAL = new Set<BoneName>(['pelvis', 'lumbar', 'chest', 'neck'])
  /** segments qu'un tissu a le droit de suivre (évite les nappes étirées entre tronc et membre) */
  const allowedFor = (name: string, mirror: boolean, c: THREE.Vector3): Set<BoneName> | null => {
    const n = name.toLowerCase(), p = mirror ? 'l' : 'r'
    const S = (...b: string[]) => new Set<BoneName>(b as BoneName[])
    if (n === 'skin') return null
    if (/abdominis|oblique|transversus|iliocostalis|longissimus|multifidus|spinalis|quadratus lumborum|rotator|semispinalis|splenius|longus colli|longus capitis|scalenus|sternocleidomastoid|rectus capitis|obliquus capitis|intercostal|diaphragm/.test(n)) return S('pelvis', 'lumbar', 'chest', 'neck')
    if (/trapezius|rhomboid|levator scapulae|serratus|pectoralis minor|subclavius/.test(n)) return S('chest', 'neck', `${p}Girdle`)
    if (/pectoralis major|latissimus|teres major/.test(n)) return S('chest', `${p}Girdle`, `${p}Shoulder`)
    if (/deltoid|supraspinatus|infraspinatus|teres minor|subscapularis|coracobrachialis/.test(n)) return S(`${p}Girdle`, `${p}Shoulder`)
    if (/biceps brachii|brachialis|triceps|anconeus/.test(n)) return S(`${p}Girdle`, `${p}Shoulder`, `${p}Elbow`)
    // jambe et pied d'abord : « extensor digitorum longus » est un muscle de la jambe, pas de l'avant-bras
    if (c.y < 0.55 && /digitorum|hallucis|plantae|plantar|lumbrical|interosse|pedis|\bfoot\b|\btoe\b/.test(n)) return S(`${p}Knee`, `${p}Ankle`)
    if (c.y > 0.55 && /carpi|digit|pollicis|indicis|palmaris|pronator|supinator|brachioradialis/.test(n)) return S(`${p}Shoulder`, `${p}Elbow`, `${p}Hand`)
    if (/gluteus|piriformis|gemellus|obturator|quadratus femoris|tensor fasciae|iliacus|psoas/.test(n)) return S('pelvis', 'lumbar', `${p}Hip`)
    if (/vastus|rectus femoris|sartorius|gracilis|adductor|pectineus|biceps femoris|semitendinosus|semimembranosus/.test(n)) return S('pelvis', `${p}Hip`, `${p}Knee`)
    if (c.y < 0.62 && /gastrocnemius|soleus|plantaris|popliteus|tibialis|fibularis|extensor hallucis|flexor hallucis|calcaneal/.test(n)) return S(`${p}Hip`, `${p}Knee`, `${p}Ankle`)
    if (/iliotibial/.test(n)) return S('pelvis', `${p}Hip`, `${p}Knee`)
    if (/costal|sternum|\brib\b/.test(n)) return S('chest')
    // par défaut, d'après la position : un tissu du tronc ne suit jamais le bras qui pend à côté,
    // un tissu de la jambe ne suit jamais la main posée contre la cuisse
    const q = c.x > 0 ? 'l' : 'r'
    if (Math.abs(c.x) > 0.165 && c.y > 0.62 && c.y < 1.36) return S(`${q}Girdle`, `${q}Shoulder`, `${q}Elbow`, `${q}Hand`)
    if (c.y < 0.8) return S('pelvis', `${q}Hip`, `${q}Knee`, `${q}Ankle`)
    return S('pelvis', 'lumbar', 'chest', 'neck', 'rGirdle', 'lGirdle')
  }
  void AXIAL
  const makeSoft = (name: string, mirror: boolean, mat: THREE.Material): Soft | null => {
    const g0 = an.geometry(name); if (!g0) return null
    const g = g0.clone()
    const pos = g.getAttribute('position') as THREE.BufferAttribute
    const cen = new THREE.Vector3()
    for (let k = 0; k < pos.count; k++) cen.x += pos.getX(k), cen.y += pos.getY(k), cen.z += pos.getZ(k)
    cen.divideScalar(Math.max(1, pos.count)); if (mirror) cen.x = -cen.x
    const allow = allowedFor(name, mirror, cen)
    const lineSet = allow ? lines.filter((L) => allow.has(names[L.i])) : lines
    if (mirror) { for (let k = 0; k < pos.count; k++) pos.setX(k, -pos.getX(k)); const idx = g.getIndex()!; for (let f = 0; f < idx.count; f += 3) { const a = idx.getX(f + 1); idx.setX(f + 1, idx.getX(f + 2)); idx.setX(f + 2, a) } g.computeVertexNormals() }
    const n = pos.count
    const a = new Uint8Array(n), b = new Uint8Array(n), w = new Float32Array(n)
    const rest = new Float32Array(n * 3)
    for (let k = 0; k < n; k++) {
      tmpP.set(pos.getX(k), pos.getY(k), pos.getZ(k))
      let d1 = Infinity, d2 = Infinity, i1 = 0, i2 = 0
      for (const L of lineSet) {
        ab.subVectors(L.b, L.a); ap.subVectors(tmpP, L.a)
        const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.lengthSq()))
        const d = ap.addScaledVector(ab, -t).length()
        if (d < d1) { if (L.i !== i1) { d2 = d1; i2 = i1 } d1 = d; i1 = L.i } else if (d < d2 && L.i !== i1) { d2 = d; i2 = L.i }
      }
      if (d2 === Infinity) { d2 = d1; i2 = i1 }
      const p1 = 1 / Math.pow(d1 + 1e-4, 6), p2 = 1 / Math.pow(d2 + 1e-4, 6)
      a[k] = i1; b[k] = i2; w[k] = p2 / (p1 + p2)
      rest[k * 3] = tmpP.x + DELTA.x - rootRest.x; rest[k * 3 + 1] = tmpP.y + DELTA.y - rootRest.y; rest[k * 3 + 2] = tmpP.z + DELTA.z - rootRest.z
    }
    const nor = g.getAttribute('normal') as THREE.BufferAttribute
    const mesh = new THREE.Mesh(g, mat)
    mesh.frustumCulled = false
    root.add(mesh)
    const s: Soft = { name: (mirror ? 'L:' : 'R:') + name, mesh, rest, restN: new Float32Array(nor.array as Float32Array), a, b, w }
    softs.push(s)
    return s
  }

  // muscles : un matériau par identifiant du mannequin, partagé par les muscles réels correspondants
  const muscles = {} as Record<MuscleId, THREE.Mesh>
  const owned = new Set<string>()
  const addGroup = (id: MuscleId, list: string[], mirrorOnly: boolean | null) => {
    const mat = mats.muscle.clone()
    mat.vertexColors = false; mat.transparent = true; mat.bumpScale = 0.6
    const proxy = new THREE.Mesh(new THREE.BufferGeometry(), mat)
    const members: Soft[] = []
    const c = new THREE.Vector3(); let cn = 0
    for (const name of list) {
      const mirrors = mirrorOnly === null ? [false, true] : [mirrorOnly]
      for (const mi of mirrors) {
        const s = makeSoft(name, mi, mat); if (!s) continue
        s.owner = proxy; members.push(s); owned.add((mi ? 'L:' : 'R:') + name)
        for (let k = 0; k < s.rest.length; k += 30) { c.x += s.rest[k]; c.y += s.rest[k + 1]; c.z += s.rest[k + 2]; cn++ }
      }
    }
    // ancre de l'étiquette : centre des muscles, rattaché au segment dominant
    c.divideScalar(Math.max(1, cn)).add(rootRest)
    let best = 'chest' as BoneName, bd = Infinity
    for (const L of lines) { ab.subVectors(L.b, L.a); ap.subVectors(c.clone().sub(DELTA), L.a); const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.lengthSq())); const d = ap.addScaledVector(ab, -t).length(); if (d < bd) { bd = d; best = names[L.i] } }
    proxy.position.copy(c).sub(restWorld.get(best)!)
    bones[best].add(proxy)
    proxy.userData.members = members
    muscles[id] = proxy
  }
  for (const [id, list] of Object.entries(MAP) as [MuscleId, string[]][]) {
    addGroup(id, list, false)
    addGroup(('l' + id.slice(1)) as MuscleId, list, true)
  }
  for (const [id, list] of Object.entries(BILAT) as [MuscleId, string[]][]) addGroup(id, list, null)
  // autres muscles (affichés seulement avec « tous les muscles »)
  const idleMat = mats.muscle.clone(); idleMat.vertexColors = false; idleMat.color = new THREE.Color('#C98F80'); idleMat.transparent = true; idleMat.opacity = 0.5
  const idle: Soft[] = []
  for (const name of BODY_MUSCLES) for (const mi of /\bright\b/.test(name) ? [false, true] : [false]) {
    if (owned.has((mi ? 'L:' : 'R:') + name)) continue
    const s = makeSoft(name, mi, idleMat); if (s) idle.push(s)
  }
  const skinSoft = makeSoft('skin', false, skinMat)

  // --- mise à jour : déformation des tissus visibles
  const S: THREE.Matrix4[] = names.map(() => new THREE.Matrix4())
  const R: THREE.Matrix3[] = names.map(() => new THREE.Matrix3())
  const inv = new THREE.Matrix4()
  const update = () => {
    root.updateMatrixWorld(true)
    inv.copy(root.matrixWorld).invert()
    names.forEach((n, i) => {
      const rw = restWorld.get(n)!
      S[i].multiplyMatrices(inv, bones[n].matrixWorld).multiply(new THREE.Matrix4().makeTranslation(-(rw.x - rootRest.x), -(rw.y - rootRest.y), -(rw.z - rootRest.z)))
      R[i].setFromMatrix4(S[i])
    })
    for (const s of softs) {
      const vis = s.owner ? s.owner.visible : s.mesh.visible
      s.mesh.visible = vis
      if (s.owner) { s.mesh.material = s.owner.material as THREE.Material }
      if (!vis) continue
      const pos = s.mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      const nor = s.mesh.geometry.getAttribute('normal') as THREE.BufferAttribute
      const P = pos.array as Float32Array, N = nor.array as Float32Array
      const r = s.rest, rn = s.restN
      for (let k = 0, n = s.w.length; k < n; k++) {
        const i = k * 3, x = r[i], y = r[i + 1], z = r[i + 2], wk = s.w[k]
        const ea = S[s.a[k]].elements, eb = S[s.b[k]].elements, ra = R[s.a[k]].elements, rb = R[s.b[k]].elements
        const ax = ea[0] * x + ea[4] * y + ea[8] * z + ea[12], ay = ea[1] * x + ea[5] * y + ea[9] * z + ea[13], az = ea[2] * x + ea[6] * y + ea[10] * z + ea[14]
        const bx = eb[0] * x + eb[4] * y + eb[8] * z + eb[12], by = eb[1] * x + eb[5] * y + eb[9] * z + eb[13], bz = eb[2] * x + eb[6] * y + eb[10] * z + eb[14]
        P[i] = ax + (bx - ax) * wk; P[i + 1] = ay + (by - ay) * wk; P[i + 2] = az + (bz - az) * wk
        const nx = rn[i], ny = rn[i + 1], nz = rn[i + 2]
        const mx = ra[0] * nx + ra[3] * ny + ra[6] * nz, my = ra[1] * nx + ra[4] * ny + ra[7] * nz, mz = ra[2] * nx + ra[5] * ny + ra[8] * nz
        const qx = rb[0] * nx + rb[3] * ny + rb[6] * nz, qy = rb[1] * nx + rb[4] * ny + rb[7] * nz, qz = rb[2] * nx + rb[5] * ny + rb[8] * nz
        N[i] = mx + (qx - mx) * wk; N[i + 1] = my + (qy - my) * wk; N[i + 2] = mz + (qz - mz) * wk
      }
      pos.needsUpdate = true; nor.needsUpdate = true
    }
  }
  const skin = skinSoft ? [skinSoft.mesh] : []
  // muscles « autres » : visibles avec le calque « tous les muscles » (piloté par la visibilité d'un muscle témoin)
  const idleProxy = new THREE.Mesh(new THREE.BufferGeometry(), idleMat); idleProxy.visible = false
  idle.forEach((s) => { s.owner = idleProxy })
  root.add(idleProxy)
  return {
    root, bones, muscles, skin, skeleton, update, isBody: true,
    materials: { skin: skinMat as unknown as THREE.MeshStandardMaterial, bone: boneMat as unknown as THREE.MeshStandardMaterial },
    idleProxy,
  } as unknown as BodyRig
}
