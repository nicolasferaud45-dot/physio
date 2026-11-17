// Illustrations d'exercice générées à partir du mannequin 3D (pas de WebGL : simple projection).
// Position de départ en gris, position d'arrivée en bleu, muscles qui travaillent en vert,
// flèche du mouvement, sol et matériel. Le résultat est un SVG mis en cache.
import * as THREE from 'three'
import { MOTIONS, type Motion } from '../data/motions'
import { applyPose, buildRig, NEUTRAL, type BoneName, type Pose, type Rig } from './rig'

const COL = { ghost: '#CBD3DB', body: '#4F7A9A', far: '#9DB4C6', head: '#4F7A9A', work: '#2E8B57', stretch: '#2F7FD1', floor: '#B9C3CC', equip: '#A9B7C3', arrow: '#C47A12' }

type P2 = [number, number]
interface View { x: (v: THREE.Vector3) => number; depth: (v: THREE.Vector3) => number; side: boolean }

function viewFor(m: Motion): View {
  const [cx, , cz] = m.camera
  const side = Math.abs(cx) > Math.abs(cz) * 0.8
  if (side) { const s = cx < 0 ? 1 : -1; return { side, x: (v) => v.z * s, depth: (v) => v.x * Math.sign(cx) } }
  const s = cz >= 0 ? 1 : -1
  return { side, x: (v) => v.x * s, depth: (v) => v.z * s }
}

function sampleAt(m: Motion, t: number): { pose: Pose; e: number } {
  const base = { ...NEUTRAL, ...m.base }
  const k = m.keys
  let i = 0
  while (i < k.length - 2 && t > k[i + 1].t) i++
  const a = k[i], b = k[i + 1] ?? k[i]
  const u = Math.min(1, Math.max(0, (t - a.t) / Math.max(1e-6, b.t - a.t)))
  const s = u * u * (3 - 2 * u)
  const pa = { ...base, ...a.pose }, pb = { ...base, ...b.pose }
  const pose = { ...pa }
  for (const key of Object.keys(pa) as (keyof Pose)[]) pose[key] = pa[key] + (pb[key] - pa[key]) * s
  return { pose, e: (a.e ?? 0.5) + ((b.e ?? 0.5) - (a.e ?? 0.5)) * s }
}

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3()
function ground(rig: Rig, m: Motion, pose: Pose, pin: { x: number; z: number } | null) {
  applyPose(rig, pose); rig.root.updateMatrixWorld(true)
  if (!m.plant) return null
  const feet = Object.entries(m.plant) as ['r' | 'l', number][]
  let dy = 0
  for (const [side, h] of feet) {
    const heel = rig.bones[`${side}Heel`].getWorldPosition(v1).y, toe = rig.bones[`${side}Toe`].getWorldPosition(v2).y
    dy += h - (m.contact === 'toe' ? toe : Math.min(heel, toe))
  }
  rig.root.position.y += dy / feet.length
  const toe = rig.bones[`${feet[0][0]}Toe`].getWorldPosition(new THREE.Vector3())
  if (pin) { rig.root.position.x += pin.x - toe.x; rig.root.position.z += pin.z - toe.z }
  rig.root.updateMatrixWorld(true)
  return { x: pin ? pin.x : toe.x, z: pin ? pin.z : toe.z }
}

/** Instant le plus « éloigné » du départ (amplitude), sinon le plus fort effort (isométrie). */
function peakTime(m: Motion) {
  const d0 = sampleAt(m, 0).pose[m.focus.dof] as number
  let best = 0, bt = 0.45, be = -1, bte = 0.45
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, s = sampleAt(m, t)
    const d = Math.abs((s.pose[m.focus.dof] as number) - d0)
    let tot = 0
    const p0 = sampleAt(m, 0).pose
    for (const k of Object.keys(p0) as (keyof Pose)[]) tot += Math.abs((s.pose[k] as number) - (p0[k] as number))
    if (d + tot * 0.05 > best) { best = d + tot * 0.05; bt = t }
    if (s.e > be) { be = s.e; bte = t }
  }
  return best > 4 ? bt : bte
}

interface Frame { pts: Record<string, THREE.Vector3>; head: THREE.Vector3; muscles: { id: string; a: THREE.Vector3; b: THREE.Vector3; w: number }[] }
const BONES: BoneName[] = ['pelvis', 'lumbar', 'chest', 'neck', 'rGirdle', 'lGirdle', 'rShoulder', 'lShoulder', 'rElbow', 'lElbow', 'rHand', 'lHand', 'rHip', 'lHip', 'rKnee', 'lKnee', 'rAnkle', 'lAnkle', 'rToe', 'lToe', 'rHeel', 'lHeel']

function capture(rig: Rig, ids: string[]): Frame {
  const pts: Record<string, THREE.Vector3> = {}
  for (const b of BONES) pts[b] = rig.bones[b].getWorldPosition(new THREE.Vector3())
  const head = rig.bones.neck.localToWorld(new THREE.Vector3(0, 0.15, 0.01))
  pts.handTip_r = rig.bones.rHand.localToWorld(new THREE.Vector3(0, -0.09, 0))
  pts.handTip_l = rig.bones.lHand.localToWorld(new THREE.Vector3(0, -0.09, 0))
  const muscles = ids.map((id) => {
    const mesh = (rig.muscles as Record<string, THREE.Mesh>)[id]
    if (!mesh) return null
    const s = mesh.scale
    const ax = s.y >= s.x && s.y >= s.z ? new THREE.Vector3(0, 1, 0) : s.x >= s.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)
    const a = mesh.localToWorld(ax.clone().multiplyScalar(0.8)), b = mesh.localToWorld(ax.clone().multiplyScalar(-0.8))
    const w = 2 * Math.min(Math.max(s.x, s.z), Math.max(s.x, s.y, s.z) * 0.7)
    return { id, a, b, w }
  }).filter(Boolean) as Frame['muscles']
  return { pts, head, muscles }
}

const cache = new Map<string, string>()
let shared: Rig | null = null

export function exerciseIllustration(id: string): string | null {
  if (cache.has(id)) return cache.get(id)!
  const m = MOTIONS[id]
  if (!m) return null
  const rig = (shared ??= buildRig())
  const view = viewFor(m)
  const work = m.muscles.work.length ? m.muscles.work : []
  const pin = ground(rig, m, sampleAt(m, 0).pose, null)
  const start = capture(rig, [])
  const tp = peakTime(m)
  ground(rig, m, sampleAt(m, tp).pose, pin)
  const peak = capture(rig, [...work, ...m.muscles.stretch])
  // Trajectoire de l'extrémité qui bouge
  const traj: THREE.Vector3[] = []
  for (let i = 0; i <= 16; i++) { ground(rig, m, sampleAt(m, (tp * i) / 16).pose, pin); traj.push(rig.bones[m.focus.end].getWorldPosition(new THREE.Vector3())) }

  const P = (v: THREE.Vector3): P2 => [view.x(v), -v.y]
  // Côté proche / éloigné
  const nearSide = view.depth(peak.pts.rShoulder) + view.depth(peak.pts.rHip) >= view.depth(peak.pts.lShoulder) + view.depth(peak.pts.lHip) ? 'r' : 'l'
  const farSide = nearSide === 'r' ? 'l' : 'r'

  // Boîte englobante
  const all: P2[] = []
  for (const f of [start, peak]) { for (const k in f.pts) all.push(P(f.pts[k])); all.push(P(f.head)) }
  const eq: string[] = []
  const floorY = 0
  for (const e of m.equipment) {
    if (e.type === 'box') {
      const cx = view.side ? e.pos[2] * (view.x(new THREE.Vector3(0, 0, 1))) : view.x(new THREE.Vector3(e.pos[0], 0, 0))
      const w = view.side ? e.size[2] : e.size[0]
      const x0 = cx - w / 2, y0 = -(e.pos[1] + e.size[1] / 2)
      all.push([x0, y0], [x0 + w, -(e.pos[1] - e.size[1] / 2)])
      eq.push(`<rect x="${x0}" y="${y0}" width="${w}" height="${e.size[1]}" rx="0.02" fill="${COL.equip}" opacity="0.55"/>`)
    } else if (e.type === 'wall') {
      const perpZ = Math.abs(e.rotY % 180) < 1
      if (view.side === perpZ) {
        const x = view.x(new THREE.Vector3(e.pos[0], 0, e.pos[2]))
        all.push([x, -1.9])
        eq.push(`<rect x="${x - 0.015}" y="-1.9" width="0.03" height="1.9" fill="${COL.equip}"/>`)
      }
    } else if (e.type === 'mat') {
      const xs = all.map((p) => p[0])
      eq.push(`<rect x="${Math.min(...xs) - 0.05}" y="-0.012" width="${Math.max(...xs) - Math.min(...xs) + 0.1}" height="0.012" fill="#7FB59A" opacity="0.7"/>`)
    }
  }
  const tools: string[] = []
  for (const e of m.equipment) {
    if (e.type === 'elastic') { const a = P(peak.pts[e.from]), b = P(new THREE.Vector3(...e.anchor)); all.push(b); tools.push(line(a, b, '#D9822B', 0.012, 'stroke-dasharray="0.03 0.02"')) }
    else if (e.type === 'elastic2') tools.push(line(P(peak.pts[e.a]), P(peak.pts[e.b]), '#D9822B', 0.012, 'stroke-dasharray="0.03 0.02"'))
    else if (e.type === 'stick') { const a = P(peak.pts.handTip_r ?? peak.pts[e.a]), b = P(peak.pts.handTip_l ?? peak.pts[e.b]); const d = [b[0] - a[0], b[1] - a[1]], n = Math.hypot(d[0], d[1]) || 1, ext = 0.12; tools.push(line([a[0] - d[0] / n * ext, a[1] - d[1] / n * ext], [b[0] + d[0] / n * ext, b[1] + d[1] / n * ext], '#8A6A48', 0.025)) }
    else if (e.type === 'dumbbell') { const c = P(peak.pts[e.bone === 'rHand' ? 'handTip_r' : e.bone === 'lHand' ? 'handTip_l' : e.bone]); tools.push(`<rect x="${c[0] - 0.06}" y="${c[1] - 0.03}" width="0.12" height="0.06" rx="0.02" fill="#3E4A55"/>`) }
    else if (e.type === 'force') { const c = P(peak.pts[e.bone]); const dx = view.side ? new THREE.Vector3(...e.dir).z * Math.sign(view.x(new THREE.Vector3(0, 0, 1))) : view.x(new THREE.Vector3(...e.dir)); const d: P2 = [dx, -e.dir[1]]; const n = Math.hypot(d[0], d[1]); if (n > 0.1) tools.push(arrow(c, [c[0] + d[0] / n * 0.22, c[1] + d[1] / n * 0.22], COL.work, 0.02)) }
  }

  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1])
  let minX = Math.min(...xs) - 0.14, maxX = Math.max(...xs) + 0.14, minY = Math.min(...ys) - 0.16, maxY = Math.max(floorY + 0.05, Math.max(...ys) + 0.05)
  // Cadre au format 6:5
  const W = maxX - minX, H = maxY - minY, ratio = 1.2
  if (W / H < ratio) { const d = H * ratio - W; minX -= d / 2; maxX += d / 2 } else { const d = W / ratio - H; minY -= d; }
  const vb = `${minX.toFixed(3)} ${minY.toFixed(3)} ${(maxX - minX).toFixed(3)} ${(maxY - minY).toFixed(3)}`

  const body = (f: Frame, kind: 'ghost' | 'peak') => {
    const out: string[] = []
    const c = (side: 'r' | 'l') => (kind === 'ghost' ? COL.ghost : side === farSide ? COL.far : COL.body)
    const limb = (side: 'r' | 'l') => {
      const p = f.pts, s = side
      return [
        polyline([P(p[`${s}Hip`]), P(p[`${s}Knee`]), P(p[`${s}Ankle`])], c(s), 0.085),
        polyline([P(p[`${s}Heel`]), P(p[`${s}Toe`])], c(s), 0.05),
        polyline([P(p[`${s}Shoulder`]), P(p[`${s}Elbow`]), P(p[`${s}Hand`]), P(p[`handTip_${s}`])], c(s), 0.06),
      ].join('')
    }
    out.push(limb(farSide))
    const torsoCol = kind === 'ghost' ? COL.ghost : COL.body
    const mid = f.pts.chest.clone().lerp(f.pts.neck, 0.55)
    out.push(polyline([P(f.pts.pelvis), P(f.pts.lumbar), P(f.pts.chest), P(mid)], torsoCol, 0.16))
    out.push(polyline([P(mid), P(f.pts.neck)], torsoCol, 0.06))
    out.push(`<circle cx="${P(f.head)[0]}" cy="${P(f.head)[1]}" r="0.095" fill="${kind === 'ghost' ? COL.ghost : COL.head}"/>`)
    out.push(limb(nearSide))
    return out.join('')
  }

  const musc = peak.muscles.map((mu) => line(P(mu.a), P(mu.b), work.includes(mu.id as never) ? COL.work : COL.stretch, Math.max(0.04, mu.w), 'opacity="0.92"')).join('')
  // Flèche de trajectoire (décalée de l'extrémité pour rester lisible)
  let arr = ''
  const tp2 = traj.map(P)
  const len = tp2.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - tp2[i - 1][0], p[1] - tp2[i - 1][1]) : 0), 0)
  if (len > 0.08) {
    const d = 'M' + tp2.map((p) => `${p[0].toFixed(3)} ${p[1].toFixed(3)}`).join(' L')
    const a = tp2[tp2.length - 2], b = tp2[tp2.length - 1]
    arr = `<path d="${d}" fill="none" stroke="${COL.arrow}" stroke-width="0.022" stroke-dasharray="0.04 0.025" stroke-linecap="round"/>` + head(a, b, COL.arrow, 0.022)
  }
  const floor = `<line x1="${minX}" y1="0" x2="${maxX}" y2="0" stroke="${COL.floor}" stroke-width="0.012"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" stroke-linecap="round" stroke-linejoin="round">${floor}${eq.join('')}${body(start, 'ghost')}${body(peak, 'peak')}${musc}${tools.join('')}${arr}</svg>`
  cache.set(id, svg)
  return svg
}

function f3(n: number) { return n.toFixed(3) }
function line(a: P2, b: P2, col: string, w: number, extra = '') { return `<line x1="${f3(a[0])}" y1="${f3(a[1])}" x2="${f3(b[0])}" y2="${f3(b[1])}" stroke="${col}" stroke-width="${f3(w)}" ${extra}/>` }
function polyline(p: P2[], col: string, w: number) { return `<polyline points="${p.map((q) => `${f3(q[0])},${f3(q[1])}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${f3(w)}"/>` }
function head(a: P2, b: P2, col: string, w: number) {
  const d = [b[0] - a[0], b[1] - a[1]], n = Math.hypot(d[0], d[1]) || 1, u = [d[0] / n, d[1] / n], s = w * 4
  const l: P2 = [b[0] - u[0] * s - u[1] * s * 0.7, b[1] - u[1] * s + u[0] * s * 0.7], r: P2 = [b[0] - u[0] * s + u[1] * s * 0.7, b[1] - u[1] * s - u[0] * s * 0.7]
  return `<polygon points="${f3(b[0] + u[0] * w)},${f3(b[1] + u[1] * w)} ${f3(l[0])},${f3(l[1])} ${f3(r[0])},${f3(r[1])}" fill="${col}"/>`
}
function arrow(a: P2, b: P2, col: string, w: number) { return line(a, b, col, w) + head(a, b, col, w) }
