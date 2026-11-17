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
