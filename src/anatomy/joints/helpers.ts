import * as THREE from 'three'
import type { V3 } from '../types'

export const dist = (a: V3) => (x: number, y: number, z: number) => Math.hypot(x - a[0], y - a[1], z - a[2])
export const near = (c: V3, r: number) => (x: number, y: number, z: number) => dist(c)(x, y, z) < r

export function ellipsoid(c: V3, r: V3, seg = 24) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)); g.scale(...r); g.translate(...c); return g
}
/** Anneau (labrum, bourrelet) dont l'axe est `n`. */
export function ring(c: V3, n: V3, radius: number, tube: number) {
  const g = new THREE.TorusGeometry(radius, tube, 10, 40)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...n).normalize())
  g.applyQuaternion(q); g.translate(...c); return g
}
/** Bande (fascia, rétinaculum) le long d'une courbe. */
export function band(points: V3[], width: number, thick: number) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
  const g = new THREE.TubeGeometry(curve, 40, 1, 10, false)
  // aplatissement : on écrase selon la normale la plus verticale de chaque anneau
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  const n = 41, ring = 11
  for (let i = 0; i < n; i++) {
    const c = curve.getPoint(i / 40)
    for (let j = 0; j < ring; j++) {
      const k = i * ring + j
      const d = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c)
      const t = curve.getTangent(i / 40)
      const side = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize()
      const up = new THREE.Vector3().crossVectors(side, t).normalize()
      const a = d.dot(side), b = d.dot(up)
      const out = c.clone().addScaledVector(side, a * width / 2).addScaledVector(up, b * thick / 2)
      pos.setXYZ(k, out.x, out.y, out.z)
    }
  }
  g.computeVertexNormals(); return g
}

/** Lignes osseuses du corps entier pour répartir la peau (chaque point suit l'os le plus proche). */
export type SkinLine = { seg: string; a: V3; b: V3; key: string }
const BASE: Omit<SkinLine, 'seg'>[] = [
  { key: 'pelvis', a: [-0.1, 0.84, 0.08], b: [0.1, 0.84, 0.08] },
  { key: 'tronc', a: [0, 0.86, 0.07], b: [0, 1.42, 0.07] },
  { key: 'tete', a: [0, 1.45, 0.07], b: [0, 1.63, 0.05] },
  ...([1, -1] as const).flatMap((s) => {
    const p = s === 1 ? 'r' : 'l', f = (v: V3): V3 => [v[0] * s, v[1], v[2]]
    return [
      { key: `${p}clav`, a: f([-0.03, 1.35, 0.11]), b: f([-0.15, 1.34, 0.07]) },
      { key: `${p}bras`, a: f([-0.16, 1.322, 0.07]), b: f([-0.21, 1.052, 0.066]) },
      { key: `${p}avbras`, a: f([-0.21, 1.052, 0.066]), b: f([-0.252, 0.815, 0.113]) },
      { key: `${p}main`, a: f([-0.252, 0.815, 0.113]), b: f([-0.265, 0.68, 0.17]) },
      { key: `${p}cuisse`, a: f([-0.083, 0.812, 0.09]), b: f([-0.075, 0.428, 0.066]) },
      { key: `${p}jambe`, a: f([-0.075, 0.428, 0.066]), b: f([-0.075, 0.057, 0.066]) },
      { key: `${p}pied`, a: f([-0.075, 0.057, 0.066]), b: f([-0.08, 0.01, 0.2]) },
    ]
  }),
]
/** Toutes les lignes sont fixes sauf celles qu'on rattache à un segment mobile. */
export function skinLines(segs: Record<string, string>, extra: SkinLine[] = []): SkinLine[] {
  return [...BASE.map((l) => ({ ...l, seg: segs[l.key] ?? 'fixed' })), ...extra]
}
