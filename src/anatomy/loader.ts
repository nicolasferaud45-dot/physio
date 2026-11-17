// Décodage du paquet anatomique (positions quantifiées 16 bits + indices) en géométries three.js.
import * as THREE from 'three'

export interface PartMeta { id: string; name: string; cat: 'bone' | 'muscle' | 'tendon' | 'disc' | 'skin'; v: [number, number]; i: [number, number]; lo: number[]; span: number[] }
export interface Anatomy { parts: Map<string, PartMeta>; geometry: (name: string) => THREE.BufferGeometry | null; credit: string }

let loading: Promise<Anatomy> | null = null

/** Charge (une seule fois) le modèle anatomique. Le module de données est importé à la demande. */
export function loadAnatomy(): Promise<Anatomy> {
  loading ??= import('./data').then(({ ANATOMY_META, ANATOMY_DATA }) => {
    const bin = atob(ANATOMY_DATA)
    const bytes = new Uint8Array(bin.length)
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k)
    const vAll = new Uint16Array(bytes.buffer, 0, ANATOMY_META.vBytes / 2)
    const iAll = new Uint16Array(bytes.buffer, ANATOMY_META.vBytes)
    const parts = new Map<string, PartMeta>()
    for (const p of ANATOMY_META.parts as PartMeta[]) parts.set(p.name, p)
    const cache = new Map<string, THREE.BufferGeometry>()
    const geometry = (name: string) => {
      if (cache.has(name)) return cache.get(name)!
      const p = parts.get(name)
      if (!p) return null
      const [v0, vn] = p.v, [i0, inn] = p.i
      const pos = new Float32Array(vn * 3)
      for (let k = 0; k < vn; k++) for (let a = 0; a < 3; a++) pos[k * 3 + a] = p.lo[a] + (vAll[(v0 + k) * 3 + a] / 65535) * p.span[a]
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      g.setIndex(new THREE.BufferAttribute(new Uint16Array(iAll.subarray(i0, i0 + inn)), 1))
      g.computeVertexNormals()
      g.computeBoundingBox(); g.computeBoundingSphere()
      cache.set(name, g)
      return g
    }
    return { parts, geometry, credit: ANATOMY_META.credit as string }
  })
  return loading
}
