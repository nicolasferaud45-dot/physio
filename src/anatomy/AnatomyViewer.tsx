// Visualiseur anatomique : vrais os et muscles (BodyParts3D), ligaments / cartilages / ménisques ajustés,
// calques à opacité réglable, vue éclatée, rayons X, indicateurs (contraction, frottement, tension, arc).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { loadAnatomy, type Anatomy } from './loader'
import { COLORS, glowTexture, makeMaterials, type MaterialSet } from './materials'
import type { JointDef, LigamentDef, MuscleGroup, NerveDef, PathoVisual, V3 } from './types'

export interface Layers { skin: number; muscles: number; ligaments: number; bones: number; nerves?: number }
export type ViewMode = 'complete' | 'exploded' | 'xray'
export interface CamState { pos: THREE.Vector3; target: THREE.Vector3; v: number; src: string }

export interface ViewerProps {
  joint: JointDef
  pathology: string | null
  layers: Layers
  mode: ViewMode
  labels: boolean
  indicators: boolean
  side: 'D' | 'G'
  simple: boolean
  playing: boolean
  /** angle imposé quand l'animation est en pause (degrés) */
  angle: number
  speed?: number
  onAngle?: (deg: number) => void
  compact?: boolean
  /** tonalité du fond (comparaison sain / pathologie) */
  tone?: 'ok' | 'bad' | 'neutral'
  className?: string
  /** angle piloté de l'extérieur (vues synchronisées) */
  angleRef?: React.MutableRefObject<number>
  /** degré de liberté animé */
  motion?: string
  /** vues comparées : rotation et zoom partagés */
  camSync?: { ref: React.MutableRefObject<CamState | null>; id: string; on: boolean }
  /** compensations : rôle de muscles précis ('R:nom' côté atteint, 'L:nom' côté opposé) */
  highlight?: Record<string, 'bad' | 'over' | 'under'>
  /** repères numérotés (zones) */
  marks?: { id: string; p: V3; tone: 'bad' | 'over' | 'under'; text: string }[]
  onCanvas?: (c: HTMLCanvasElement) => void
}

// ------------------------------------------------------------------ utilitaires
const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2])
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

function addFade(mat: THREE.Material, fade: { min: { value: number }; max: { value: number } }, key: string) {
  const prev = mat.onBeforeCompile
  const prevKey = mat.customProgramCacheKey?.() ?? ''
  mat.onBeforeCompile = (sh, r) => {
    prev.call(mat, sh, r)
    sh.uniforms.fadeMin = fade.min; sh.uniforms.fadeMax = fade.max
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWY;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;')
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWY;\nuniform float fadeMin;\nuniform float fadeMax;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float fdv = smoothstep(fadeMin, fadeMin + 0.1, vWY) * (1.0 - smoothstep(fadeMax - 0.1, fadeMax, vWY));
        float hsh = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        if (fdv < hsh) discard;`)
  }
  mat.customProgramCacheKey = () => prevKey + 'fade' + key
}

/** Axe principal d'un nuage de points (pour les fibres musculaires). */
function principalAxis(pos: Float32Array) {
  const n = pos.length / 3
  const c = new THREE.Vector3()
  for (let k = 0; k < n; k++) c.add(new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]))
  c.divideScalar(n)
  let dir = new THREE.Vector3(0, 1, 0)
  for (let it = 0; it < 8; it++) {
    const acc = new THREE.Vector3()
    for (let k = 0; k < n; k++) {
      const d = new THREE.Vector3(pos[k * 3] - c.x, pos[k * 3 + 1] - c.y, pos[k * 3 + 2] - c.z)
      acc.addScaledVector(d, d.dot(dir))
    }
    if (acc.lengthSq() > 0) dir = acc.normalize()
  }
  let tmin = Infinity, tmax = -Infinity
  for (let k = 0; k < n; k++) {
    const t = (pos[k * 3] - c.x) * dir.x + (pos[k * 3 + 1] - c.y) * dir.y + (pos[k * 3 + 2] - c.z) * dir.z
    tmin = Math.min(tmin, t); tmax = Math.max(tmax, t)
  }
  return { c, dir, tmin, tmax }
}

// ------------------------------------------------------------------ construction de la scène
interface Deform {
  mesh: THREE.Mesh
  rest: Float32Array
  restN: Float32Array
  w: Float32Array
  /** segments de départ / d'arrivée du mélange, par sommet (index dans la liste des segments, 0 = fixe) */
  sa: Uint8Array
  sb: Uint8Array
  /** profil le long du muscle (0 aux extrémités, 1 au centre) et direction radiale pour le gonflement */
  prof?: Float32Array
  radial?: Float32Array
  muscle?: { mirror: boolean; group: MuscleGroup; label: string; simple: string; name: string; unit?: string; axis: ReturnType<typeof principalAxis>; mat: THREE.MeshPhysicalMaterial; act: number; ends: { p: THREE.Vector3; sa: number; sb: number; w: number }[] }
}
interface Rigid { obj: THREE.Object3D; seg: string }
interface LigMesh { def: LigamentDef; mesh: THREE.Mesh; stubs: [THREE.Mesh, THREE.Mesh]; rest: number; mat: THREE.MeshPhysicalMaterial }
interface NerveMesh { def: NerveDef; mesh: THREE.Mesh; mat: THREE.MeshPhysicalMaterial; rest: number; last: string }
interface Built {
  nerves: NerveMesh[]
  root: THREE.Group
  copies: { group: THREE.Group; kind: 'all' | 'muscles' | 'ligaments' | 'bones' }[]
  deforms: Deform[]
  rigids: Rigid[]
  ligs: LigMesh[]
  mats: MaterialSet
  xmats: MaterialSet
  customMats: Map<string, THREE.MeshPhysicalMaterial>
  fade: { min: { value: number }; max: { value: number } }
  dispose: () => void
}

function paintBone(g: THREE.BufferGeometry, test?: (x: number, y: number, z: number) => boolean, implant = false) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  const col = new Float32Array(pos.count * 3)
  const b = COLORS.bone, c = implant ? COLORS.metal : COLORS.cartilage
  for (let k = 0; k < pos.count; k++) {
    const isC = test ? test(pos.getX(k), pos.getY(k), pos.getZ(k)) : false
    const cc = isC ? c : b
    // léger grain de l'os
    const n = 0.96 + 0.04 * Math.sin(pos.getX(k) * 900 + pos.getY(k) * 700) * Math.cos(pos.getZ(k) * 800)
    col[k * 3] = cc.r * n; col[k * 3 + 1] = cc.g * n; col[k * 3 + 2] = cc.b * n
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
}

function build(an: Anatomy, J: JointDef, pv: PathoVisual | null, pathologyId: string | null): Built {
  const mats = makeMaterials(false)
  const xmats = makeMaterials(true)
  const fade = { min: { value: J.clip?.minY ?? -10 }, max: { value: J.clip?.maxY ?? 10 } }
  for (const [k, m] of [...Object.entries(mats), ...Object.entries(xmats).map(([a, b]) => ['x' + a, b] as const)]) addFade(m as THREE.Material, fade, k)
  const customMats = new Map<string, THREE.MeshPhysicalMaterial>()
  const root = new THREE.Group()
  const deforms: Deform[] = []
  const rigids: Rigid[] = []
  const ligs: LigMesh[] = []
  const disposables: { dispose(): void }[] = []
  const rules = (Array.isArray(J.blend) ? J.blend : [J.blend]).map((r) => ({ ...r, c: v3(r.center), d: v3(r.dir).normalize() }))
  const segIdx = (id?: string) => (id ? 1 + J.segments.findIndex((x) => x.id === id) : 0)
  /** poids de mélange d'un point : segments a et b, poids vers b */
  const weigh = (x: number, y: number, z: number) => {
    for (const r of rules) {
      if (!r.inRegion(x, y, z)) continue
      const d = (x - r.c.x) * r.d.x + (y - r.c.y) * r.d.y + (z - r.c.z) * r.d.z
      return { sa: segIdx(r.from), sb: segIdx(r.seg), w: 1 - smooth(-r.band, r.band, d) }
    }
    return { sa: 0, sb: 0, w: 0 }
  }
  const mirrorGeo = (g: THREE.BufferGeometry) => {
    const pos = g.getAttribute('position') as THREE.BufferAttribute
    for (let k = 0; k < pos.count; k++) pos.setX(k, -pos.getX(k))
    const idx = g.getIndex()!
    for (let f = 0; f < idx.count; f += 3) { const a = idx.getX(f + 1); idx.setX(f + 1, idx.getX(f + 2)); idx.setX(f + 2, a) }
    g.computeVertexNormals()
    return g
  }

  // --- déformables (muscles, tendons, peau) : géométrie propre + poids de mélange entre segments
  const makeDeform = (name: string, kind: 'muscle' | 'tendon' | 'skin', meta?: { group: MuscleGroup; label: string; simple: string; unit?: string }, mirror = false): Deform | null => {
    const g0 = an.geometry(name)
    if (!g0) return null
    const g = g0.clone(); disposables.push(g)
    if (mirror) mirrorGeo(g)
    const pos = g.getAttribute('position') as THREE.BufferAttribute
    const nor = g.getAttribute('normal') as THREE.BufferAttribute
    const rest = new Float32Array(pos.array as Float32Array)
    const restN = new Float32Array(nor.array as Float32Array)
    const w = new Float32Array(pos.count), sa = new Uint8Array(pos.count), sb = new Uint8Array(pos.count)
    const rigid = J.rigidMuscles?.[name]
    for (let k = 0; k < pos.count; k++) {
      if (rigid !== undefined) { const i = segIdx(rigid === 'fixed' ? undefined : rigid); sa[k] = i; sb[k] = i; w[k] = 0; continue }
      const r = weigh(rest[k * 3], rest[k * 3 + 1], rest[k * 3 + 2])
      w[k] = r.w; sa[k] = r.sa; sb[k] = r.sb
    }
    const mesh = new THREE.Mesh(g)
    const D: Deform = { mesh, rest, restN, w, sa, sb }
    if (kind === 'muscle' && meta) {
      const axis = principalAxis(rest)
      // coordonnées de texture : angle autour de l'axe (fibres) et position le long
      const uv = new Float32Array(pos.count * 2)
      const col = new Float32Array(pos.count * 3)
      const prof = new Float32Array(pos.count)
      const radial = new Float32Array(pos.count * 3)
      const up = Math.abs(axis.dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      const e1 = new THREE.Vector3().crossVectors(axis.dir, up).normalize(), e2 = new THREE.Vector3().crossVectors(axis.dir, e1)
      const len = axis.tmax - axis.tmin
      for (let k = 0; k < pos.count; k++) {
        const d = new THREE.Vector3(rest[k * 3] - axis.c.x, rest[k * 3 + 1] - axis.c.y, rest[k * 3 + 2] - axis.c.z)
        const t = (d.dot(axis.dir) - axis.tmin) / len
        const r = d.clone().addScaledVector(axis.dir, -d.dot(axis.dir))
        const th = Math.atan2(r.dot(e2), r.dot(e1))
        uv[k * 2] = (th / (Math.PI * 2)) * 6; uv[k * 2 + 1] = t * 2
        // extrémités tendineuses plus claires
        const tend = 1 - smooth(0.0, 0.07, Math.min(t, 1 - t))
        const c = COLORS.muscle.clone().lerp(COLORS.tendon, tend * 0.85)
        col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b
        prof[k] = Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
        const rn = r.lengthSq() > 1e-10 ? r.normalize() : r
        radial[k * 3] = rn.x; radial[k * 3 + 1] = rn.y; radial[k * 3 + 2] = rn.z
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
      g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      const mat = mats.muscle.clone(); addFade(mat, fade, 'm-' + name); disposables.push(mat)
      mesh.material = mat
      // poids aux deux extrémités (pour suivre l'axe déformé)
      const endAt = (tt: number) => { const p = axis.c.clone().addScaledVector(axis.dir, axis.tmin + len * tt); return { p, ...weigh(p.x, p.y, p.z) } }
      D.prof = prof; D.radial = radial
      D.muscle = { ...meta, mirror, name, axis, mat, act: 0, ends: [endAt(0.12), endAt(0.88)] }
    }
    deforms.push(D)
    return D
  }

  const muscleDeforms: Deform[] = []
  const both = (n: string) => (J.bilateral && /\bright\b/.test(n) ? [false, true] : [false])
  for (const m of J.muscles) for (const mi of both(m.name)) { const d = makeDeform(m.name, 'muscle', m, mi); if (d) muscleDeforms.push(d) }
  const extra: Deform[] = []
  for (const n of J.extraMuscles ?? []) for (const mi of both(n)) { const d = makeDeform(n, 'muscle', { group: 'other', label: n, simple: n }, mi); if (d) extra.push(d) }
  const tendons: Deform[] = []
  for (const n of J.tendons ?? []) for (const mi of both(n)) { const d = makeDeform(n, 'tendon', undefined, mi); if (d) { d.mesh.material = pv?.damaged?.includes(n) ? Object.assign(mats.tendon.clone(), { color: new THREE.Color('#E58C7C'), emissive: new THREE.Color('#9A1E10'), emissiveIntensity: 0.6 }) : mats.tendon; tendons.push(d) } }
  for (const n of J.discs ?? []) { const d = makeDeform(n, 'tendon'); if (d) { d.mesh.material = mats.cartilage; d.mesh.userData.disc = n; tendons.push(d) } }
  const skin = makeDeform('skin', 'skin')
  if (skin) skin.mesh.material = mats.skin

  // --- os rigides (cartilage peint, prothèse éventuelle)
  const boneGeos: { name: string; seg: string; g: THREE.BufferGeometry; implant: THREE.BufferGeometry | null }[] = []
  for (const b of J.bones) for (const mi of both(b.name)) {
    const g0 = an.geometry(b.name)
    if (!g0) continue
    const g = g0.clone(); disposables.push(g)
    if (mi) mirrorGeo(g)
    const rule0 = J.cartilage.find((c) => c.bone === b.name)
    const rule = rule0 && mi ? { ...rule0, test: (x: number, y: number, z: number) => rule0.test(-x, y, z) } : rule0
    const implant = !!pv?.implant?.includes(b.name)
    paintBone(g, rule?.test, false)
    let ig: THREE.BufferGeometry | null = null
    if (implant && rule) {
      // pièce métallique : faces de la zone articulaire, légèrement gonflées
      const pos = g.getAttribute('position') as THREE.BufferAttribute, nor = g.getAttribute('normal') as THREE.BufferAttribute
      const idx = g.getIndex()!
      const keep: number[] = []
      for (let f = 0; f < idx.count; f += 3) {
        const a = idx.getX(f), bb = idx.getX(f + 1), c = idx.getX(f + 2)
        if ([a, bb, c].every((k) => rule.test(pos.getX(k), pos.getY(k), pos.getZ(k)))) keep.push(a, bb, c)
      }
      ig = new THREE.BufferGeometry()
      const p2 = new Float32Array(pos.count * 3)
      for (let k = 0; k < pos.count; k++) { p2[k * 3] = pos.getX(k) + nor.getX(k) * 0.0018; p2[k * 3 + 1] = pos.getY(k) + nor.getY(k) * 0.0018; p2[k * 3 + 2] = pos.getZ(k) + nor.getZ(k) * 0.0018 }
      ig.setAttribute('position', new THREE.BufferAttribute(p2, 3)); ig.setIndex(keep); ig.computeVertexNormals(); disposables.push(ig)
    }
    boneGeos.push({ name: b.name, seg: b.seg, g, implant: ig })
  }

  // --- ligaments et tendons procéduraux (tube aplati, mis à jour chaque image)
  const unit = new THREE.CylinderGeometry(1, 1, 1, 20, 6); unit.translate(0, 0.5, 0); disposables.push(unit)
  const stub = new THREE.CylinderGeometry(1, 0.55, 1, 14, 4); stub.translate(0, 0.5, 0)
  { // effilochage
    const p = stub.getAttribute('position') as THREE.BufferAttribute
    for (let k = 0; k < p.count; k++) if (p.getY(k) > 0.95) p.setY(k, p.getY(k) + Math.sin(k * 7.3) * 0.12)
    stub.computeVertexNormals(); disposables.push(stub)
  }
  const ligDefs = J.ligaments.flatMap((L) => L.mirror ? [L, { ...L, id: L.id + '-g', a: { ...L.a, p: [-L.a.p[0], L.a.p[1], L.a.p[2]] as V3 }, b: { ...L.b, p: [-L.b.p[0], L.b.p[1], L.b.p[2]] as V3 } }] : [L])
  for (const L of ligDefs) {
    const mat = (L.kind === 'tendon' ? mats.tendon : mats.ligament).clone(); addFade(mat, fade, 'l-' + L.id); disposables.push(mat)
    ligs.push({ def: L, mesh: new THREE.Mesh(unit, mat), stubs: [new THREE.Mesh(stub, mat), new THREE.Mesh(stub, mat)], rest: 1, mat })
  }
  // --- pièces procédurales (ménisques, cartilages)
  const customGeos = J.customs.filter((c) => !c.only || (!!pathologyId && c.only.includes(pathologyId))).flatMap((c) => c.mirror ? [c, { ...c, mirror: false, id: c.id + '-g', build: () => mirrorGeo(c.build()) }] : [c]).map((c) => {
    const g = c.build(); disposables.push(g)
    const dmg = !!pv?.damaged?.includes(c.id)
    if (dmg && (c.kind === 'bursa' || c.id === 'capsule')) {
      g.computeBoundingBox(); const ctr = g.boundingBox!.getCenter(new THREE.Vector3())
      const k = c.kind === 'bursa' ? [1.35, 2.6, 1.35] : [1.12, 1.12, 1.12]
      g.translate(-ctr.x, -ctr.y, -ctr.z); g.scale(k[0], k[1], k[2]); g.translate(ctr.x, ctr.y, ctr.z)
    }
    const base = c.kind === 'meniscus' ? mats.ligament : mats.cartilage
    const m = base.clone() as THREE.MeshPhysicalMaterial
    if (c.kind === 'meniscus') { m.color = new THREE.Color('#E3EAF0'); m.opacity = 1; m.transparent = false }
    if (c.kind === 'bursa') { m.color = new THREE.Color('#E9D6C8'); m.opacity = 0.85; m.transparent = true }
    if (c.kind === 'implant' && !pv?.implant?.length) { m.color = new THREE.Color('#FAF6EC'); m.roughness = 0.7; m.clearcoat = 0 }
    if (c.opacity !== undefined) { const o = dmg ? Math.max(0.6, c.opacity) : c.opacity; m.opacity = o; m.transparent = true; m.depthWrite = false; m.userData.baseOpacity = o }
    if (pv?.implant?.length && c.kind === 'cartilage') { m.color = new THREE.Color('#F4F6F8'); m.roughness = 0.35; m.clearcoat = 0.4 }
    if (pv?.wear?.includes(c.id)) { m.color = new THREE.Color('#B9A08F'); m.roughness = 0.9; m.clearcoat = 0; g.scale(1, 0.35, 1) }
    addFade(m, fade, 'c-' + c.id); disposables.push(m)
    customMats.set(c.id, m)
    return { def: c, g, m }
  })

  // --- nerfs (tube recalculé à chaque image le long du trajet)
  const nerves: NerveMesh[] = []
  const nerveDefs = (J.nerves ?? []).flatMap((n) => n.mirror ? [n, { ...n, id: n.id + '-g', mirror: false, points: n.points.map((q) => ({ seg: q.seg, p: [-q.p[0], q.p[1], q.p[2]] as V3 })) }] : [n])
  for (const n of nerveDefs) {
    const mat = new THREE.MeshPhysicalMaterial({ color: '#E8B90F', roughness: 0.35, clearcoat: 0.6, emissive: new THREE.Color('#5a4300'), emissiveIntensity: 0.4, transparent: true })
    addFade(mat, fade, 'n-' + n.id); disposables.push(mat)
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.userData.layer = 'nerves'; mesh.renderOrder = 5
    nerves.push({ def: n, mesh, mat, rest: 0, last: '' })
  }

  // --- copies : vue complète, ou vue éclatée (muscles | ligaments | os)
  const copies: Built['copies'] = []
  const mk = (kind: Built['copies'][number]['kind']) => {
    const group = new THREE.Group()
    const addRigid = (obj: THREE.Object3D, seg: string) => { group.add(obj); rigids.push({ obj, seg }); obj.matrixAutoUpdate = false }
    if (kind === 'all' || kind === 'bones') {
      for (const b of boneGeos) {
        const m = new THREE.Mesh(b.g, mats.bone); m.userData.layer = 'bones'; m.userData.xray = 'bone'; addRigid(m, b.seg)
        if (b.implant) { const im = new THREE.Mesh(b.implant, mats.metal); im.userData.layer = 'bones'; addRigid(im, b.seg) }
      }
    }
    if (kind === 'all' || kind === 'ligaments') {
      for (const d of tendons) if (d.mesh.userData.disc) { const m = new THREE.Mesh(d.mesh.geometry, d.mesh.material); m.userData.layer = 'ligaments'; group.add(m) }
      for (const c of customGeos) { const m = new THREE.Mesh(c.g, c.m); m.userData.layer = 'ligaments'; addRigid(m, c.def.seg) }
      for (const L of ligs) {
        const add = (o: THREE.Mesh) => { const x = o.clone(); x.userData.layer = 'ligaments'; x.userData.lig = L.def.id; x.matrixAutoUpdate = false; group.add(x); return x }
        L.mesh.userData.copies = [...(L.mesh.userData.copies ?? []), add(L.mesh)]
        L.stubs[0].userData.copies = [...(L.stubs[0].userData.copies ?? []), add(L.stubs[0])]
        L.stubs[1].userData.copies = [...(L.stubs[1].userData.copies ?? []), add(L.stubs[1])]
      }
    }
    if (kind === 'all' || kind === 'muscles') {
      for (const d of [...muscleDeforms, ...extra, ...tendons]) {
        if (d.mesh.userData.disc) continue
        const m = new THREE.Mesh(d.mesh.geometry, d.mesh.material); m.userData.layer = 'muscles'; m.userData.xray = 'soft'; m.userData.name = d.muscle?.name; group.add(m)
      }
      if (kind === 'muscles') for (const L of ligs.filter((l) => l.def.kind === 'tendon')) {
        const x = L.mesh.clone(); x.userData.layer = 'muscles'; x.matrixAutoUpdate = false; group.add(x); L.mesh.userData.copies = [...(L.mesh.userData.copies ?? []), x]
      }
    }
    if (kind === 'all') for (const n of nerves) group.add(n.mesh)
    if (kind === 'all' && skin) { const m = new THREE.Mesh(skin.mesh.geometry, skin.mesh.material); m.userData.layer = 'skin'; m.renderOrder = 10; group.add(m) }
    root.add(group)
    copies.push({ group, kind })
  }
  mk('all'); mk('muscles'); mk('ligaments'); mk('bones')

  return {
    root, copies, deforms, rigids, ligs, mats, xmats, customMats, fade, nerves,
    dispose: () => { for (const n of nerves) n.mesh.geometry.dispose(); for (const d of disposables) d.dispose(); for (const m of [...Object.values(mats), ...Object.values(xmats)]) m.dispose() },
  }
}

// ------------------------------------------------------------------ indicateurs
function arrowMesh(color: string, len = 0.022, r = 0.0016) {
  const g = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true })
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len * 0.65, 8), mat); shaft.position.y = len * 0.325
  const head = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, len * 0.35, 12), mat); head.position.y = len * 0.65 + len * 0.175
  g.add(shaft, head); g.renderOrder = 30; shaft.renderOrder = 30; head.renderOrder = 30
  return { g, mat }
}
const Y = new THREE.Vector3(0, 1, 0)
function pointArrow(a: { g: THREE.Group }, from: THREE.Vector3, dir: THREE.Vector3, scale = 1) {
  a.g.position.copy(from); a.g.quaternion.setFromUnitVectors(Y, dir.clone().normalize()); a.g.scale.setScalar(scale)
}

export interface LabelItem { id: string; text: string; tone: 'info' | 'work' | 'bad' | 'tension'; world: THREE.Vector3; visible: boolean }

// ------------------------------------------------------------------ scène
function Scene(p: ViewerProps & { an: Anatomy; labelSink: React.MutableRefObject<LabelItem[]>; onFrame: () => void }) {
  const J = p.joint
  const pv = p.pathology ? J.pathologies[p.pathology] ?? null : null
  const built = useMemo(() => build(p.an, J, pv, p.pathology), [p.an, J, pv, p.pathology])
  useEffect(() => () => built.dispose(), [built])
  const { gl, scene, camera, size } = useThree()

  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    return () => { env.dispose(); pm.dispose() }
  }, [gl, scene])

  // indicateurs
  const ind = useMemo(() => {
    const g = new THREE.Group()
    const glowO = glowTexture('rgba(255,190,60,1)'), glowR = glowTexture('rgba(235,50,30,1)')
    const sprite = (t: THREE.Texture) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, blending: THREE.AdditiveBlending })); s.renderOrder = 31; g.add(s); return s }
    const musc = built.deforms.filter((d) => d.muscle && d.muscle.group !== 'other').map((d) => ({ d, glow: sprite(glowO), arrows: [0, 1, 2, 3].map(() => { const a = arrowMesh('#ffffff'); g.add(a.g); return a }) }))
    const frics = (pv?.friction ?? []).map((f) => ({ f, glow: sprite(glowR), arrows: [arrowMesh('#E5341F', 0.026, 0.0022), arrowMesh('#E5341F', 0.026, 0.0022)] }))
    frics.forEach((f) => f.arrows.forEach((a) => g.add(a.g)))
    const tens = built.ligs.map((l) => ({ l, arrows: [arrowMesh('#F08A24', 0.02, 0.0015), arrowMesh('#F08A24', 0.02, 0.0015)] }))
    tens.forEach((t) => t.arrows.forEach((a) => g.add(a.g)))
    const arcMat = new THREE.MeshBasicMaterial({ color: '#7CC4F2', transparent: true, opacity: 0.9, depthTest: false })
    const arcFull = new THREE.MeshBasicMaterial({ color: '#7CC4F2', transparent: true, opacity: 0.22, depthTest: false })
    const arcLim = new THREE.MeshBasicMaterial({ color: '#F2C230', depthTest: false })
    const arc = new THREE.Mesh(new THREE.BufferGeometry(), arcMat); arc.renderOrder = 29
    const arcBg = new THREE.Mesh(new THREE.BufferGeometry(), arcFull); arcBg.renderOrder = 28
    const arcHead = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.016, 14), arcMat); arcHead.renderOrder = 29
    const limit = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.016, 0.003), arcLim); limit.renderOrder = 29
    g.add(arc, arcBg, arcHead, limit)
    return { g, musc, frics, tens, arc, arcBg, arcHead, limit, lastArc: -999 }
  }, [built, pv])

  // état d'animation
  const st = useRef({ t: 0, angle: p.angle, prev: p.angle, vel: 0, lastReport: 0 })
  const segM = useRef(new Map<string, THREE.Matrix4>())

  // mode d'affichage : copies, rayons X, opacités
  useEffect(() => {
    const ex = p.mode === 'exploded'
    const gap = 0.2
    for (const c of built.copies) {
      c.group.visible = ex ? c.kind !== 'all' : c.kind === 'all'
      c.group.position.x = !ex ? 0 : c.kind === 'muscles' ? -gap : c.kind === 'bones' ? gap : 0
    }
  }, [built, p.mode])

  useEffect(() => {
    const L = p.layers, x = p.mode === 'xray'
    const set = (m: THREE.Material & { opacity: number }, o: number, baseTransparent: boolean) => {
      m.opacity = o; const t = baseTransparent || o < 0.999
      if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true }
      m.depthWrite = !t || m === built.mats.skin ? !t : o > 0.6
    }
    const M = built.mats
    set(M.bone, x ? 1 : L.bones, false)
    set(M.tendon, x ? Math.min(0.18, L.muscles) : L.muscles, false)
    for (const d of built.deforms) if (d.muscle) set(d.muscle.mat, x ? Math.min(0.12, L.muscles) : L.muscles, false)
    for (const l of built.ligs) set(l.mat, (x ? 0.5 : 1) * L.ligaments * (l.def.kind === 'tendon' ? 1 : 0.92), l.def.kind !== 'tendon')
    for (const m of built.customMats.values()) set(m, L.ligaments * (m.userData.baseOpacity ?? 1), true)
    set(M.skin, x ? Math.min(L.skin, 0.08) : L.skin, true)
    for (const n of built.nerves) set(n.mat, L.nerves ?? 0, true)
    built.copies.forEach((c) => c.group.traverse((o) => {
      const layer = o.userData.layer as keyof typeof L | undefined
      if (!layer) return
      const op = layer === 'bones' ? L.bones : layer === 'muscles' ? L.muscles : layer === 'ligaments' ? L.ligaments : layer === 'nerves' ? (L.nerves ?? 0) : L.skin
      o.visible = (p.mode === 'exploded' && c.kind !== 'all') ? true : op > 0.01 || (x && layer === 'bones')
      if (o instanceof THREE.Mesh && o.userData.xray === 'bone') o.material = x ? built.xmats.bone : built.mats.bone
    }))
    gl.setClearColor(x ? '#0B1622' : '#000000', x ? 1 : 0)
  }, [built, p.layers, p.mode, gl])

  useEffect(() => { built.root.scale.x = p.side === 'G' ? -1 : 1 }, [built, p.side])

  // caméra
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const t = v3(J.camera.target)
    const pos = v3(J.camera.pos)
    if (p.side === 'G') { pos.x = -pos.x; t.x = -t.x }
    const dir = pos.clone().sub(t).normalize()
    const aspect = size.width / Math.max(1, size.height)
    const fov = J.camera.fov ?? 32
    const tan = Math.tan(THREE.MathUtils.degToRad(fov / 2))
    let [fw, fh] = J.camera.frame ?? [0.3, 0.36]
    if (p.mode === 'exploded') fw = fw * 2 + 0.42
    const k = Math.max(fh / (2 * tan), fw / (2 * tan * aspect)) * 1.2
    if (p.mode === 'exploded') dir.set(0, 0.12, 1).normalize()
    cam.position.copy(t.clone().addScaledVector(dir, k))
    cam.fov = fov; cam.near = 0.01; cam.far = 20; cam.updateProjectionMatrix()
    cam.lookAt(t)
    ctl.current?.target.copy(t); ctl.current?.update()
  }, [J, p.side, p.mode, size.width, size.height, camera])
  const ctl = useRef<import('three-stdlib').OrbitControls>(null)
  const syncState = useRef({ applying: false, lastV: -1 })
  useEffect(() => {
    const c = ctl.current, cs = p.camSync
    if (!c || !cs) return
    const onChange = () => {
      if (syncState.current.applying || !cs.on) return
      const prev = cs.ref.current
      const v = (prev?.v ?? 0) + 1
      cs.ref.current = { pos: camera.position.clone(), target: c.target.clone(), v, src: cs.id }
      syncState.current.lastV = v
    }
    c.addEventListener('change', onChange)
    return () => c.removeEventListener('change', onChange)
  }, [p.camSync, camera])

  const pvRom = pv?.rom
  const motion = p.motion ?? pv?.motion ?? J.dofs[0].id
  const dof = J.dofs.find((d) => d.id === motion) ?? J.dofs[0]
  const lo = pvRom ? pvRom[0] : dof.min, hi = pvRom ? pvRom[1] : dof.max

  useFrame((_, dt) => {
    const cs = p.camSync, shared = cs?.ref.current
    if (cs?.on && shared && shared.src !== cs.id && shared.v !== syncState.current.lastV && ctl.current) {
      syncState.current.applying = true
      camera.position.copy(shared.pos); ctl.current.target.copy(shared.target); ctl.current.update()
      syncState.current.applying = false
      syncState.current.lastV = shared.v
    }
    const s = st.current
    dt = Math.min(dt, 0.05)
    // angle
    if (p.angleRef) {
      s.angle += (Math.min(hi, Math.max(lo, p.angleRef.current)) - s.angle) * Math.min(1, dt * 14)
    } else if (p.playing) {
      s.t += dt * (p.speed ?? 1) / 5
      const u = (1 - Math.cos(s.t * Math.PI * 2)) / 2
      s.angle = lo + (hi - lo) * u
    } else {
      s.angle += (Math.min(hi, Math.max(lo, p.angle)) - s.angle) * Math.min(1, dt * 10)
    }
    const v = (s.angle - s.prev) / Math.max(dt, 1e-3)
    s.vel += (v - s.vel) * Math.min(1, dt * 6)
    s.prev = s.angle
    if (p.onAngle && performance.now() - s.lastReport > 80) { s.lastReport = performance.now(); p.onAngle(Math.round(s.angle)) }

    // segments
    const mats = segM.current
    mats.clear()
    const shift = pv?.shift
    for (const sg of J.segments) {
      const parent = sg.parent ? mats.get(sg.parent) ?? new THREE.Matrix4() : new THREE.Matrix4()
      const alt = sg.dof === motion ? null : sg.alt?.find((x) => x.dof === motion)
      const ang = sg.dof === motion ? THREE.MathUtils.degToRad(s.angle * (sg.ratio ?? 1)) : alt ? THREE.MathUtils.degToRad(s.angle * (alt.ratio ?? 1)) : 0
      const pv3 = v3(alt?.pivot ?? sg.pivot)
      const m = new THREE.Matrix4().makeTranslation(pv3.x, pv3.y, pv3.z)
        .multiply(new THREE.Matrix4().makeRotationAxis(v3(alt ? alt.axis : sg.axis).normalize(), ang))
        .multiply(new THREE.Matrix4().makeTranslation(-pv3.x, -pv3.y, -pv3.z))
      if (shift && shift.seg === sg.id) m.premultiply(new THREE.Matrix4().makeTranslation(...shift.by))
      if (sg.slide && sg.dof === motion) { const sl = v3(sg.slide).multiplyScalar(s.angle); m.premultiply(new THREE.Matrix4().makeTranslation(sl.x, sl.y, sl.z)) }
      mats.set(sg.id, parent.clone().multiply(m))
    }
    const I = new THREE.Matrix4()
    const segOf = (id: string) => mats.get(id) ?? I
    const segList = [I, ...J.segments.map((x) => segOf(x.id))]
    const rotList = segList.map((m) => new THREE.Matrix3().setFromMatrix4(m))
    for (const r of built.rigids) { r.obj.matrix.copy(segOf(r.seg)); r.obj.matrixWorldNeedsUpdate = true }

    // activation musculaire
    const grp: MuscleGroup = s.vel > 8 ? J.actions.increasing : s.vel < -8 ? J.actions.decreasing : J.actions.hold
    const holdLevel = s.angle > 15 ? 0.45 : 0.1
    for (const d of built.deforms) if (d.muscle) {
      const target = d.muscle.group === grp ? (Math.abs(s.vel) > 8 ? 1 : holdLevel) : 0
      d.muscle.act += (target - d.muscle.act) * Math.min(1, dt * 5)
      const a = d.muscle.act
      const hl = p.highlight ? p.highlight[(d.muscle.mirror ? 'L:' : 'R:') + d.muscle.name] : undefined
      if (p.highlight) {
        const pl = 0.5 + 0.5 * Math.sin(performance.now() / 220)
        const m = d.muscle.mat
        if (hl === 'bad') { m.color.setRGB(1, 0.72, 0.68); m.emissive.setRGB(0.55 + 0.2 * pl, 0.05, 0.02) }
        else if (hl === 'over') { m.color.setRGB(1, 0.85, 0.6); m.emissive.setRGB(0.5 + 0.15 * pl, 0.22, 0.0) }
        else if (hl === 'under') { m.color.setRGB(0.62, 0.72, 0.85); m.emissive.setRGB(0.02, 0.05, 0.12) }
        else { m.color.setRGB(1, 1, 1); m.emissive.setRGB(0, 0, 0) }
        const want = (hl ? 1 : 0.22) * p.layers.muscles
        if (Math.abs(m.opacity - want) > 0.01) { m.opacity = want; const t = want < 0.999; if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true } m.depthWrite = want > 0.6 }
      } else if (pv?.damaged?.includes(d.muscle.name)) {
        const pl = 0.5 + 0.5 * Math.sin(performance.now() / 200)
        d.muscle.mat.emissive.setRGB(0.5 + 0.25 * pl, 0.06, 0.03); d.muscle.mat.color.setRGB(1, 0.75, 0.7)
      } else {
        d.muscle.mat.emissive.setRGB(0.55 * a, 0.12 * a, 0.02 * a)
        d.muscle.mat.color.setRGB(1, 1 - 0.1 * a, 1 - 0.2 * a)
      }
    }

    // déformation (mélange entre deux segments + gonflement)
    const staticBody = !J.segments.length
    for (const d of built.deforms) {
      if (staticBody && d.mesh.userData.done) continue
      d.mesh.userData.done = true
      const pos = d.mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      const nor = d.mesh.geometry.getAttribute('normal') as THREE.BufferAttribute
      const P = pos.array as Float32Array, N = nor.array as Float32Array
      const r = d.rest, rn = d.restN, w = d.w, SA = d.sa, SB = d.sb
      const bul = d.muscle ? d.muscle.act * 0.0035 : 0
      for (let k = 0, n = w.length; k < n; k++) {
        const i = k * 3, x = r[i], y = r[i + 1], z = r[i + 2], wk = w[k]
        const nx = rn[i], ny = rn[i + 1], nz = rn[i + 2]
        const a = SA[k], b = SB[k]
        let ax = x, ay = y, az = z, anx = nx, any = ny, anz = nz
        if (a) {
          const e = segList[a].elements, re = rotList[a].elements
          ax = e[0] * x + e[4] * y + e[8] * z + e[12]; ay = e[1] * x + e[5] * y + e[9] * z + e[13]; az = e[2] * x + e[6] * y + e[10] * z + e[14]
          anx = re[0] * nx + re[3] * ny + re[6] * nz; any = re[1] * nx + re[4] * ny + re[7] * nz; anz = re[2] * nx + re[5] * ny + re[8] * nz
        }
        let ox = ax, oy = ay, oz = az
        if (wk > 0 && b) {
          const e = segList[b].elements, re = rotList[b].elements
          const bx = e[0] * x + e[4] * y + e[8] * z + e[12], by = e[1] * x + e[5] * y + e[9] * z + e[13], bz = e[2] * x + e[6] * y + e[10] * z + e[14]
          ox = ax + (bx - ax) * wk; oy = ay + (by - ay) * wk; oz = az + (bz - az) * wk
          const mx = re[0] * nx + re[3] * ny + re[6] * nz, my = re[1] * nx + re[4] * ny + re[7] * nz, mz = re[2] * nx + re[5] * ny + re[8] * nz
          N[i] = anx + (mx - anx) * wk; N[i + 1] = any + (my - any) * wk; N[i + 2] = anz + (mz - anz) * wk
        } else { N[i] = anx; N[i + 1] = any; N[i + 2] = anz }
        if (bul && d.prof && d.radial) { const bb = bul * d.prof[k]; ox += d.radial[i] * bb; oy += d.radial[i + 1] * bb; oz += d.radial[i + 2] * bb }
        P[i] = ox; P[i + 1] = oy; P[i + 2] = oz
      }
      pos.needsUpdate = true; nor.needsUpdate = true
      d.mesh.geometry.computeBoundingSphere()
    }

    // ligaments : position, tension, rupture
    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3()
    const labels: LabelItem[] = []
    for (const L of built.ligs) {
      tmpA.copy(v3(L.def.a.p)).applyMatrix4(segOf(L.def.a.seg)); tmpB.copy(v3(L.def.b.p)).applyMatrix4(segOf(L.def.b.seg))
      const len = tmpA.distanceTo(tmpB)
      if (L.rest === 1) L.rest = len * (1 - (pv?.strain?.[L.def.id] ?? 0))
      L.rest = Math.min(L.rest, len)
      const strainBase = len / L.rest - 1 + (pv?.strain?.[L.def.id] ?? 0)
      const torn = !!pv?.torn?.includes(L.def.id)
      const damaged = !!pv?.damaged?.includes(L.def.id)
      const k = L.def.kind === 'tendon' ? 0 : smooth(0.015, 0.08, strainBase)
      const base = L.def.kind === 'tendon' ? COLORS.tendon : COLORS.ligament
      L.mat.color.copy(base).lerp(COLORS.tension, k).lerp(COLORS.danger, damaged ? 0.85 : Math.max(0, k - 0.6) * 1.5)
      L.mat.emissive.copy(damaged ? COLORS.danger : COLORS.tension).multiplyScalar(damaged ? 0.25 : k * 0.25)
      const dir = tmpB.clone().sub(tmpA)
      const q = new THREE.Quaternion().setFromUnitVectors(Y, dir.clone().normalize())
      const th = (L.def.thick ?? L.def.width * 0.45) / 2, wd = L.def.width / 2
      const setT = (o: THREE.Object3D, at: THREE.Vector3, qq: THREE.Quaternion, sy: number) => { o.position.copy(at); o.quaternion.copy(qq); o.scale.set(wd, sy, th); o.updateMatrix() }
      const lv = (c: THREE.Object3D) => p.mode === 'exploded' || (c.userData.layer === 'muscles' ? p.layers.muscles : p.layers.ligaments) > 0.01
      for (const c of (L.mesh.userData.copies ?? []) as THREE.Object3D[]) { setT(c, tmpA, q, len); c.visible = !torn && lv(c) }
      const qb = new THREE.Quaternion().setFromUnitVectors(Y, dir.clone().negate().normalize())
      for (const c of (L.stubs[0].userData.copies ?? []) as THREE.Object3D[]) { setT(c, tmpA, q, len * 0.38); c.visible = torn && lv(c) }
      for (const c of (L.stubs[1].userData.copies ?? []) as THREE.Object3D[]) { setT(c, tmpB, qb, len * 0.38); c.visible = torn && lv(c) }
      // indicateur de tension
      const T = ind.tens.find((t) => t.l === L)!
      const showT = p.indicators && p.layers.ligaments > 0.05 && L.def.kind !== 'tendon' && !torn && strainBase > 0.04
      T.arrows.forEach((a, j) => {
        a.g.visible = showT
        if (!showT) return
        const u = dir.clone().normalize()
        const at = j === 0 ? tmpA.clone().addScaledVector(u, -0.004) : tmpB.clone().addScaledVector(u, 0.004)
        pointArrow(a, at, j === 0 ? u.clone().negate() : u, 0.8 + 0.25 * Math.sin(performance.now() / 180))
      })
      const mid = tmpA.clone().lerp(tmpB, 0.5)
      labels.push({ id: 'lig-' + L.def.id, text: torn ? `${p.simple ? L.def.simple : L.def.label} · RUPTURE` : showT ? (p.compact ? `${L.def.simple} · TENSION` : 'TENSION DU LIGAMENT') : p.simple ? L.def.simple : L.def.label, tone: torn || damaged ? 'bad' : showT ? 'tension' : 'info', world: mid, visible: p.layers.ligaments > 0.3 && (showT || torn || damaged || (!p.compact && p.layers.muscles < 0.5 && p.labels)) })
    }

    // nerfs : trajet, tension (jaune → rouge), compression
    const nOp = p.layers.nerves ?? 0
    for (const n of built.nerves) {
      if (nOp < 0.01) continue
      const pts = n.def.points.map((q) => v3(q.p).applyMatrix4(segOf(q.seg)))
      let len = 0
      for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1])
      if (!n.rest) n.rest = len
      n.rest = Math.min(n.rest, len)
      const key = pts.map((q) => q.x.toFixed(4) + q.y.toFixed(4) + q.z.toFixed(4)).join()
      if (key !== n.last) {
        n.last = key
        n.mesh.geometry.dispose()
        n.mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, n.def.radius ?? 0.0028, 10)
      }
      const comp = !!pv?.nerves?.includes(n.def.id.replace(/-g$/, '')) && !n.def.id.endsWith('-g')
      const strain = len / n.rest - 1
      const k = smooth(0.01, 0.07, strain)
      const pl = 0.5 + 0.5 * Math.sin(performance.now() / 180)
      n.mat.color.set('#E8B90F').lerp(new THREE.Color('#F08A24'), Math.min(1, k * 1.6)).lerp(COLORS.danger, comp ? 0.55 + 0.3 * pl : Math.max(0, k - 0.5) * 2)
      n.mat.emissive.set(comp ? '#7a1408' : '#5a4300'); n.mat.emissiveIntensity = comp ? 0.5 + 0.4 * pl : 0.35 + k * 0.4
      const mid = pts[Math.floor(pts.length / 2)]
      if (!n.def.id.endsWith('-g') && nOp > 0.3) labels.push({ id: 'n-' + n.def.id, text: comp ? `${p.simple ? n.def.simple : n.def.label} · COMPRESSION` : k > 0.5 ? `${p.simple ? n.def.simple : n.def.label} · TENSION` : (p.simple ? n.def.simple : n.def.label), tone: comp ? 'bad' : k > 0.5 ? 'tension' : 'info', world: mid, visible: comp || k > 0.5 || (p.labels && !p.compact) })
    }

    // contraction : halo et flèches convergentes le long des fibres
    const units = new Map<string, { c: THREE.Vector3; n: number; act: number }>()
    for (const m of ind.musc) {
      const mu = m.d.muscle!
      const a = mu.act
      const show = p.indicators && (p.layers.muscles >= 0.3 || p.mode === 'exploded') && a > 0.35
      const ax = mu.axis
      const len = ax.tmax - ax.tmin
      const pA = ax.c.clone().addScaledVector(ax.dir, ax.tmin + len * 0.12), pB = ax.c.clone().addScaledVector(ax.dir, ax.tmin + len * 0.88)
      const blendP = (p0: THREE.Vector3, e: { sa: number; sb: number; w: number }) => p0.clone().applyMatrix4(segList[e.sa]).lerp(p0.clone().applyMatrix4(segList[e.sb]), e.w)
      const A = blendP(pA, mu.ends[0]), Bp = blendP(pB, mu.ends[1])
      const C = A.clone().lerp(Bp, 0.5)
      m.glow.visible = show
      m.glow.position.copy(C); m.glow.scale.setScalar(0.035 + 0.01 * Math.sin(performance.now() / 160)); (m.glow.material as THREE.SpriteMaterial).opacity = a
      const phase = (performance.now() / 900) % 1
      m.arrows.forEach((ar, j) => {
        ar.g.visible = show
        if (!show) return
        const fromA = j < 2
        const u = ((j % 2) * 0.5 + phase) % 1
        const start = fromA ? A : Bp, end = C
        const at = start.clone().lerp(end, 0.1 + u * 0.55)
        pointArrow(ar, at, end.clone().sub(start), 0.9)
        ar.mat.opacity = Math.sin(u * Math.PI)
      })
      const uid = mu.unit ?? mu.name
      const u = units.get(uid) ?? { c: new THREE.Vector3(), n: 0, act: 0 }
      u.c.add(C); u.n++; u.act = Math.max(u.act, show ? a : 0); units.set(uid, u)
    }
    const deep = p.layers.muscles < 0.5
    const ranked = [...units.entries()].sort((a, b) => b[1].act - a[1].act)
    for (const [uid, u] of (p.compact ? ranked.slice(0, 2) : ranked)) {
      const def = J.units.find((x) => x.id === uid)
      if (!def) continue
      const active = u.act > 0.35
      if (!active && (!p.labels || deep || p.mode === 'exploded')) continue
      labels.push({ id: 'u-' + uid, text: `${p.simple ? def.simple : def.label}${active ? ' · CONTRACTION' : ''}`, tone: active ? 'work' : 'info', world: u.c.clone().divideScalar(u.n), visible: true })
    }

    // frottement / compression
    for (const f of ind.frics) {
      const [a0, a1] = f.f.window
      const k = smooth(a0, a0 + 12, s.angle) * (1 - smooth(a1 - 12, a1, s.angle))
      const show = p.indicators && k > 0.05
      const at = v3(f.f.at.p).applyMatrix4(segOf(f.f.at.seg))
      f.glow.visible = show
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 120)
      f.glow.position.copy(at); f.glow.scale.setScalar(0.03 + 0.025 * k + 0.01 * pulse); (f.glow.material as THREE.SpriteMaterial).opacity = k * (0.65 + 0.35 * pulse)
      const u = v3(f.f.arrow).normalize()
      f.arrows.forEach((ar, j) => {
        ar.g.visible = show
        if (!show) return
        const sgn = j === 0 ? 1 : -1
        pointArrow(ar, at.clone().addScaledVector(u, sgn * 0.03), u.clone().multiplyScalar(-sgn), 0.9)
      })
      if (show) labels.push({ id: 'f-' + f.f.id, text: f.f.label, tone: 'bad', world: at, visible: true })
    }

    // repères numérotés (compensations)
    for (const mk of p.marks ?? []) labels.push({ id: 'mk-' + mk.id, text: mk.text, tone: mk.tone === 'bad' ? 'bad' : mk.tone === 'over' ? 'tension' : 'info', world: v3(mk.p), visible: true })

    // arc cinématique
    const showArc = p.indicators && p.mode !== 'exploded' && J.segments.length > 0
    ind.arc.visible = ind.arcBg.visible = ind.arcHead.visible = showArc
    ind.limit.visible = showArc && !!pvRom
    if (showArc && Math.abs(ind.lastArc - s.angle) > 0.4) {
      ind.lastArc = s.angle
      const sg0 = J.segments.find((x) => x.dof === motion && !x.ratio) ?? J.segments.find((x) => x.dof === motion)
      const alt0 = sg0 ? null : J.segments.map((x) => x.alt?.find((a) => a.dof === motion)).find(Boolean)
      const sg1 = sg0 ?? J.segments.find((x) => x.alt?.some((a) => a.dof === motion))!
      const pv3 = v3(alt0?.pivot ?? sg1.pivot).add(v3(J.arc.offset ?? [0, 0, 0])), ax = v3(alt0?.axis ?? sg1.axis).normalize()
      // rayon de départ : perpendiculaire à l'axe, orienté vers le bas ou l'avant
      const ref = Math.abs(ax.y) > 0.8 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, -1, 0)
      const r0 = ref.addScaledVector(ax, -ref.dot(ax)).normalize().multiplyScalar(J.arc.radius)
      const pt = (deg: number) => r0.clone().applyAxisAngle(ax, THREE.MathUtils.degToRad(deg)).add(pv3)
      const curve = (d0: number, d1: number) => new THREE.CatmullRomCurve3(Array.from({ length: 24 }, (_, i) => pt(d0 + ((d1 - d0) * i) / 23)))
      const a0 = Math.max(dof.min, Math.min(dof.rest, s.angle)), a1 = Math.max(dof.rest, s.angle)
      ind.arc.geometry.dispose(); ind.arc.geometry = new THREE.TubeGeometry(curve(a0, Math.max(a0 + 1, a1)), 40, 0.0018, 8)
      if (ind.arcBg.geometry.attributes.position === undefined) ind.arcBg.geometry = new THREE.TubeGeometry(curve(dof.min, dof.max), 60, 0.0012, 6)
      const end = pt(s.angle), tan = pt(s.angle + 1).sub(end).normalize()
      ind.arcHead.position.copy(end); ind.arcHead.quaternion.setFromUnitVectors(Y, tan)
      if (pvRom) { const lp = pt(pvRom[1]); ind.limit.position.copy(lp); ind.limit.quaternion.setFromUnitVectors(Y, lp.clone().sub(pv3).normalize()) }
    }
    if (showArc) labels.push({ id: 'arc', text: `${Math.round(s.angle)}°`, tone: 'info', world: ind.arcHead.position.clone(), visible: true })

    // étiquettes des os et pièces
    if (p.labels && p.mode !== 'exploded') {
      for (const b of J.bones) if (b.anchor) labels.push({ id: 'b-' + b.name, text: p.simple ? b.simple : b.label, tone: 'info', world: v3(b.anchor).applyMatrix4(segOf(b.seg)), visible: p.layers.bones > 0.3 && !p.compact && p.layers.muscles < 0.5 })
      for (const c of J.customs) {
        if (c.kind === 'cartilage') continue
        const g = built.customMats.has(c.id)
        if (!g) continue
        const dmg = pv?.damaged?.includes(c.id)
        const bb = new THREE.Box3()
        const gg = built.copies[0].group.children.find((o) => (o as THREE.Mesh).material === built.customMats.get(c.id)) as THREE.Mesh | undefined
        if (gg) { gg.geometry.computeBoundingBox(); bb.copy(gg.geometry.boundingBox!).applyMatrix4(segOf(c.seg)) }
        labels.push({ id: 'c-' + c.id, text: p.simple ? c.simple : c.label, tone: dmg ? 'bad' : 'info', world: bb.getCenter(new THREE.Vector3()), visible: p.layers.ligaments > 0.3 && ((!p.compact && p.layers.muscles < 0.5) || !!dmg) })
      }
    }
    for (const c of built.customMats.entries()) {
      const dmg = pv?.damaged?.includes(c[0])
      if (dmg) { c[1].emissive.set(COLORS.danger); c[1].emissiveIntensity = 0.35 + 0.25 * Math.sin(performance.now() / 200); if (!pv?.wear?.includes(c[0])) c[1].color.set('#E7A79B') }
    }
    // repère monde (miroir, éclaté) appliqué aux étiquettes
    built.root.updateMatrixWorld()
    const all = built.copies[0].group
    p.labelSink.current = p.labels ? labels.filter((l) => l.visible).map((l) => ({ ...l, world: l.world.clone().applyMatrix4(all.matrixWorld) })) : []
    p.onFrame()
  })

  return (
    <>
      <hemisphereLight args={['#ffffff', '#8a7a70', 0.55]} />
      <directionalLight position={[-1.5, 2.2, 2.4]} intensity={2.1} />
      <directionalLight position={[2, 1, -2]} intensity={0.9} color="#cfe3ff" />
      <directionalLight position={[0, -1, 1]} intensity={0.25} />
      <primitive object={built.root} />
      <group scale={[p.side === 'G' ? -1 : 1, 1, 1]}><primitive object={ind.g} /></group>
      <OrbitControls ref={ctl as never} enablePan enableDamping dampingFactor={0.1} minDistance={0.15} maxDistance={3} />
    </>
  )
}

// ------------------------------------------------------------------ composant
export default function AnatomyViewer(p: ViewerProps) {
  const [an, setAn] = useState<Anatomy | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => { loadAnatomy().then(setAn).catch(() => setErr(true)) }, [])
  const labelSink = useRef<LabelItem[]>([])
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const boxes = useRef<HTMLDivElement>(null)
  const camRef = useRef<THREE.Camera | null>(null)

  // étiquettes DOM : boîte décalée vers l'extérieur + trait fin vers la structure
  const draw = () => {
    const el = wrap.current, s = svg.current, bx = boxes.current, cam = camRef.current
    if (!el || !s || !bx || !cam) return
    const W = el.clientWidth, H = el.clientHeight
    const RANK = { bad: 0, tension: 1, work: 2, info: 3 } as const
    const items = p.compact
      ? [...labelSink.current.filter((l) => l.id === 'arc'), ...labelSink.current.filter((l) => l.id !== 'arc').sort((a, b) => RANK[a.tone] - RANK[b.tone]).slice(0, 2)]
      : labelSink.current
    const used: { x: number; y: number; w: number; h: number }[] = []
    let html = '', lines = ''
    for (const l of items) {
      const v = l.world.clone().project(cam)
      if (v.z > 1) continue
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H
      const isArc = l.id === 'arc'
      const side = x < W / 2 ? -1 : 1
      const caps = l.text === l.text.toUpperCase() ? 8.6 : 7.4
      const w = Math.min(260, 14 + l.text.length * caps), h = 26
      let lx = isArc ? x + 10 : x + side * (p.compact ? 40 : 70) - (side < 0 ? w : 0), ly = y - h / 2 - (isArc ? 0 : 18)
      lx = Math.max(6, Math.min(W - w - 6, lx))
      for (let it = 0; it < 12 && used.some((u) => Math.abs(u.x - lx) < (u.w + w) / 2 + 2 && Math.abs(u.y - ly) < h + 2); it++) ly += h + 3
      ly = Math.max(6, Math.min(H - h - 6, ly))
      used.push({ x: lx, y: ly, w, h })
      const cx = lx + (side < 0 ? w : 0), cy = ly + h / 2
      if (!isArc) lines += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${cy.toFixed(1)}" class="al-${l.tone}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" class="ad-${l.tone}"/>`
      html += `<div class="alab al-${l.tone}${isArc ? ' arc' : ''}" style="transform:translate(${lx.toFixed(0)}px,${ly.toFixed(0)}px)">${l.text}</div>`
    }
    s.innerHTML = lines
    bx.innerHTML = html
  }

  if (err) return <div className={'anat ' + (p.className ?? '')}><p className="muted" style={{ padding: 20 }}>Le modèle anatomique n'a pas pu être chargé.</p></div>
  return (
    <div ref={wrap} className={`anat tone-${p.tone ?? 'neutral'} ${p.mode === 'xray' ? 'xray' : ''} ${p.className ?? ''}`}>
      {!an && <div className="anat-loading"><span className="ai-badge run">Chargement du modèle anatomique…</span></div>}
      {an && (
        <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, preserveDrawingBuffer: true }}
          camera={{ position: [0, 0.5, 1], fov: 32 }} onCreated={({ camera, gl }) => { camRef.current = camera; p.onCanvas?.(gl.domElement) }}>
          <Scene {...p} an={an} labelSink={labelSink} onFrame={draw} />
        </Canvas>
      )}
      <svg ref={svg} className="anat-lines" />
      <div ref={boxes} className="anat-labels" />
      {p.mode === 'exploded' && (
        <div className="anat-cols"><span>Muscles et tendons</span><span>Ligaments, ménisques, cartilage</span><span>Os</span></div>
      )}
      {an && !p.compact && <span className="anat-credit">Modèles : BodyParts3D © DBCLS, CC BY-SA 2.1 JP</span>}
    </div>
  )
}
