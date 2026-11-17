import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { loadAnatomy, type Anatomy } from '../anatomy/loader'
import { buildBodyRig, type BodyRig } from '../anatomy/bodyRig'
import * as THREE from 'three'
import type { Motion } from '../data/motions'
import { applyPose, buildRig, muscleLabel, NEUTRAL, type MuscleId, type Pose, type Rig } from './rig'

export interface ExerciseLayers {
  skin: boolean; skeleton: boolean; allMuscles: boolean
  work: boolean; stretch: boolean; stabilize: boolean
  joint: boolean; equipment: boolean; names: boolean
}

// Vert = ce qu'on travaille (cohérent avec le reste de l'appli) ; le rouge est réservé à la douleur / pathologie
export const ROLE_COLORS = { work: '#2E8B57', stretch: '#2F7FD1', stabilize: '#D9A21B', idle: '#C9A397' }

interface Props {
  motion: Motion
  layers: ExerciseLayers
  playing: boolean
  speed: number
  /** position manuelle dans le cycle (0–1) quand l'animation est en pause */
  phase: number
  simple: boolean
  onTick?: (phase: number, value: number, effort: number) => void
}
type LabelRefs = React.MutableRefObject<Partial<Record<MuscleId, HTMLDivElement | null>>>

const smooth = (x: number) => x * x * (3 - 2 * x)

/** Pose et effort à l'instant t (0–1) du cycle */
export function sample(m: Motion, t: number): { pose: Pose; e: number } {
  const base = { ...NEUTRAL, ...m.base }
  const keys = m.keys
  let i = 0
  while (i < keys.length - 2 && t > keys[i + 1].t) i++
  const a = keys[i], b = keys[i + 1] ?? keys[i]
  const span = Math.max(1e-6, b.t - a.t)
  const k = smooth(Math.min(1, Math.max(0, (t - a.t) / span)))
  const pa = { ...base, ...a.pose }, pb = { ...base, ...b.pose }
  const pose = { ...pa }
  for (const key of Object.keys(pa) as (keyof Pose)[]) pose[key] = pa[key] + (pb[key] - pa[key]) * k
  const e = (a.e ?? 0.5) + ((b.e ?? 0.5) - (a.e ?? 0.5)) * k
  return { pose, e }
}

const tmp = new THREE.Vector3()
const tmp2 = new THREE.Vector3()

/** Applique la pose puis recale le bassin pour garder les pieds d'appui au sol (pointe fixe). */
function poseAndGround(rig: Rig, m: Motion, pose: Pose, pin: { x: number; z: number } | null) {
  applyPose(rig, pose)
  rig.root.updateMatrixWorld(true)
  if (!m.plant) return null
  const feet = Object.entries(m.plant) as ['r' | 'l', number][]
  let dy = 0
  for (const [side, h] of feet) {
    const heel = rig.bones[`${side}Heel`].getWorldPosition(tmp).y
    const toe = rig.bones[`${side}Toe`].getWorldPosition(tmp2).y
    dy += h - (m.contact === 'toe' ? toe : Math.min(heel, toe))
  }
  dy /= feet.length
  rig.root.position.y += dy
  const toePos = rig.bones[`${feet[0][0]}Toe`].getWorldPosition(new THREE.Vector3())
  if (pin) { rig.root.position.x += pin.x - toePos.x; rig.root.position.z += pin.z - toePos.z }
  rig.root.updateMatrixWorld(true)
  return { x: pin ? pin.x : toePos.x, z: pin ? pin.z : toePos.z }
}

function ExerciseRig(p: Props & { labelRefs: LabelRefs; an: Anatomy | null }) {
  const m = p.motion
  const rig = useMemo(() => (p.an ? buildBodyRig(p.an) : buildRig()), [p.an])
  const body = (rig as Partial<BodyRig>).isBody ? (rig as BodyRig & { idleProxy: THREE.Mesh }) : null
  const clock = useRef(0)
  const pin = useRef<{ x: number; z: number } | null>(null)
  const jointMarker = useRef<THREE.Mesh>(null)
  const endMarker = useRef<THREE.Mesh>(null)
  const dynamic = useRef<THREE.Group>(null)

  // Référence de la pointe de pied (t = 0) et trajectoire de l'extrémité qui bouge
  const trajectory = useMemo(() => {
    pin.current = null
    const s0 = sample(m, 0)
    pin.current = poseAndGround(rig, m, s0.pose, null)
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 64; i++) {
      const s = sample(m, i / 64)
      poseAndGround(rig, m, s.pose, pin.current)
      pts.push(rig.bones[m.focus.end].getWorldPosition(new THREE.Vector3()))
    }
    const moving = pts.some((q) => q.distanceTo(pts[0]) > 0.02)
    if (!moving) return null
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false), 128, 0.008, 8, false)
  }, [m, rig])

  // Rôles des muscles
  const roles = useMemo(() => {
    const r = new Map<MuscleId, 'work' | 'stretch' | 'stabilize'>()
    m.muscles.stabilize.forEach((id) => r.set(id, 'stabilize'))
    m.muscles.stretch.forEach((id) => r.set(id, 'stretch'))
    m.muscles.work.forEach((id) => r.set(id, 'work'))
    return r
  }, [m])
  const baseScale = useMemo(() => {
    const s = new Map<MuscleId, THREE.Vector3>()
    for (const [id, mesh] of Object.entries(rig.muscles)) s.set(id as MuscleId, mesh.scale.clone())
    return s
  }, [rig])

  // Matériel attaché à un segment (haltères)
  useEffect(() => {
    const added: THREE.Object3D[] = []
    for (const eq of m.equipment) {
      if (eq.type !== 'dumbbell') continue
      const g = new THREE.Group()
      const mat = new THREE.MeshStandardMaterial({ color: '#4B5B68', metalness: 0.4, roughness: 0.4 })
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12), mat); bar.rotation.z = Math.PI / 2
      const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16), mat); w1.rotation.z = Math.PI / 2; w1.position.x = -0.07
      const w2 = w1.clone(); w2.position.x = 0.07
      g.add(bar, w1, w2); g.position.y = -0.06; g.userData.equipment = true
      rig.bones[eq.bone].add(g); added.push(g)
    }
    return () => added.forEach((o) => o.parent?.remove(o))
  }, [m, rig])

  useFrame((state, dt) => {
    if (p.playing) clock.current = (clock.current + (dt * p.speed) / m.duration) % 1
    else clock.current = p.phase
    const t = clock.current
    const { pose, e } = sample(m, t)
    poseAndGround(rig, m, pose, pin.current)

    // Silhouette / squelette
    const anyMuscle = p.layers.allMuscles || p.layers.work || p.layers.stretch || p.layers.stabilize
    rig.skin.forEach((s) => { s.visible = p.layers.skin })
    rig.materials.skin.opacity = anyMuscle || p.layers.skeleton ? (body ? 0.14 : 0.3) : 0.95
    if (body) body.idleProxy.visible = p.layers.allMuscles
    rig.materials.skin.depthWrite = !(anyMuscle || p.layers.skeleton)
    rig.skeleton.forEach((s) => { s.visible = p.layers.skeleton })

    // Muscles
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260)
    for (const [idStr, mesh] of Object.entries(rig.muscles)) {
      const id = idStr as MuscleId
      const role = roles.get(id)
      const shown = role && p.layers[role]
      const mat = mesh.material as THREE.MeshStandardMaterial
      const bs = baseScale.get(id)!
      if (shown) {
        mesh.visible = true
        mat.color.set(ROLE_COLORS[role]); mat.emissive.set(ROLE_COLORS[role]); mat.opacity = 0.95
        if (role === 'work') { mat.emissiveIntensity = 0.12 + 0.6 * e + 0.12 * pulse * e; mesh.scale.set(bs.x * (1 + 0.1 * e), bs.y * (1 - 0.05 * e), bs.z * (1 + 0.1 * e)) }
        else if (role === 'stretch') { mat.emissiveIntensity = 0.1 + 0.5 * e; mesh.scale.set(bs.x * (1 - 0.06 * e), bs.y * (1 + 0.14 * e), bs.z * (1 - 0.06 * e)) }
        else { mat.emissiveIntensity = 0.18 + 0.2 * pulse; mesh.scale.copy(bs) }
      } else if (p.layers.allMuscles) {
        mesh.visible = true; mat.color.set(ROLE_COLORS.idle); mat.emissiveIntensity = 0; mat.opacity = 0.45; mesh.scale.copy(bs)
      } else mesh.visible = false
      mat.depthWrite = mat.opacity > 0.9
      const el = p.labelRefs.current[id]
      if (el) {
        const v = mesh.getWorldPosition(tmp).project(state.camera)
        const x = ((v.x + 1) / 2) * state.size.width, y = ((1 - v.y) / 2) * state.size.height - 22
        el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
        el.style.visibility = v.z < 1 && mesh.visible ? 'visible' : 'hidden'
      }
    }

    // Articulation sollicitée
    if (jointMarker.current) rig.bones[m.focus.joint].getWorldPosition(jointMarker.current.position)
    if (endMarker.current) rig.bones[m.focus.end].getWorldPosition(endMarker.current.position)

    // Matériel dynamique (élastiques, bâton, flèche de force)
    const g = dynamic.current
    if (g) {
      g.children.forEach((c) => {
        const eq = c.userData.eq as Motion['equipment'][number]
        if (!eq) return
        if (eq.type === 'elastic' || eq.type === 'elastic2' || eq.type === 'stick') {
          const a = eq.type === 'elastic' ? rig.bones[eq.from].getWorldPosition(new THREE.Vector3()) : rig.bones[eq.a].getWorldPosition(new THREE.Vector3())
          const b = eq.type === 'elastic' ? new THREE.Vector3(...eq.anchor) : rig.bones[eq.b].getWorldPosition(new THREE.Vector3())
          if (eq.type !== 'elastic') { a.y -= 0.05; b.y -= 0.05 }
          const mid = a.clone().add(b).multiplyScalar(0.5)
          const len = a.distanceTo(b)
          c.position.copy(mid)
          c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
          c.scale.set(eq.type === 'stick' ? 1 : 1 - 0.3 * e, len, eq.type === 'stick' ? 1 : 1 - 0.3 * e)
        } else if (eq.type === 'force') {
          const arrow = c as THREE.ArrowHelper
          arrow.position.copy(rig.bones[eq.bone].getWorldPosition(new THREE.Vector3()))
          arrow.setLength(0.06 + 0.22 * e, 0.06, 0.045)
        }
      })
    }

    body?.update()
    const v = (pose[m.focus.dof] as number) * (m.focus.sign ?? 1) + (m.focus.offset ?? 0)
    p.onTick?.(t, v, e)
  })

  return (
    <>
      <primitive object={rig.root} />
      {p.layers.joint && (
        <>
          <mesh ref={jointMarker}><sphereGeometry args={[0.045, 24, 16]} /><meshBasicMaterial color="#2F6FA3" transparent opacity={0.45} depthTest={false} /></mesh>
          {trajectory && <mesh geometry={trajectory}><meshBasicMaterial color="#2F6FA3" transparent opacity={0.85} depthTest={false} /></mesh>}
          {trajectory && <mesh ref={endMarker}><sphereGeometry args={[0.022, 16, 12]} /><meshBasicMaterial color="#1F527C" depthTest={false} /></mesh>}
        </>
      )}
      <group ref={dynamic} visible={p.layers.equipment}>
        {m.equipment.map((eq, i) => {
          if (eq.type === 'elastic' || eq.type === 'elastic2') return <mesh key={i} userData={{ eq }}><cylinderGeometry args={[0.008, 0.008, 1, 8]} /><meshStandardMaterial color="#2E9E8F" /></mesh>
          if (eq.type === 'stick') return <mesh key={i} userData={{ eq }}><cylinderGeometry args={[0.014, 0.014, 1, 10]} /><meshStandardMaterial color="#9C7A54" /></mesh>
          if (eq.type === 'force') return <primitive key={i} object={Object.assign(new THREE.ArrowHelper(new THREE.Vector3(...eq.dir).normalize(), new THREE.Vector3(), 0.2, '#2E8B57', 0.06, 0.045), { userData: { eq } })} />
          return null
        })}
      </group>
      {p.layers.equipment && m.equipment.map((eq, i) => {
        if (eq.type === 'box') return <mesh key={i} position={eq.pos}><boxGeometry args={eq.size} /><meshStandardMaterial color={eq.color ?? '#B9C7D2'} roughness={0.8} /></mesh>
        if (eq.type === 'wall') return <mesh key={i} position={eq.pos} rotation={[0, THREE.MathUtils.degToRad(eq.rotY), 0]}><planeGeometry args={[1.6, 2.2]} /><meshStandardMaterial color="#C9D6E0" side={THREE.DoubleSide} transparent opacity={0.35} depthWrite={false} /></mesh>
        if (eq.type === 'mat') return <mesh key={i} position={[0, 0.006, 0.05]}><boxGeometry args={[0.7, 0.012, 2.0]} /><meshStandardMaterial color="#7FB2A0" roughness={0.9} /></mesh>
        if (eq.type === 'elastic') return <mesh key={i} position={eq.anchor}><sphereGeometry args={[0.025, 12, 10]} /><meshStandardMaterial color="#2E9E8F" /></mesh>
        return null
      })}
    </>
  )
}

function CameraRig({ motion }: { motion: Motion }) {
  const { camera, size } = useThree()
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const aspect = size.width / Math.max(1, size.height)
  useEffect(() => {
    // Écran étroit (téléphone en portrait) : on recule la caméra pour garder tout le corps
    const k = aspect < 1.25 ? Math.min(1.9, 1.25 / aspect) : 1
    const t = new THREE.Vector3(...motion.target)
    const pos = new THREE.Vector3(...motion.camera).sub(t).multiplyScalar(k).add(t)
    camera.position.copy(pos)
    controls.current?.target.copy(t)
    controls.current?.update()
  }, [motion, camera, aspect])
  return <OrbitControls ref={controls} enablePan={false} minDistance={1.2} maxDistance={10} target={motion.target} />
}

function Env() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    return () => { env.dispose(); pm.dispose() }
  }, [gl, scene])
  return null
}

export default function ExerciseScene(props: Props) {
  const labelRefs: LabelRefs = useRef({})
  const [an, setAn] = useState<Anatomy | null>(null)
  useEffect(() => { loadAnatomy().then(setAn).catch(() => setAn(null)) }, [])
  const m = props.motion
  const listed = props.layers.names
    ? [...m.muscles.work.filter(() => props.layers.work).map((id) => [id, 'work'] as const), ...m.muscles.stretch.filter(() => props.layers.stretch).map((id) => [id, 'stretch'] as const)]
    : []
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
    <Canvas camera={{ position: props.motion.camera, fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }} style={{ position: 'absolute', inset: 0 }}>
      <hemisphereLight args={['#ffffff', '#c9d6df', 1.0]} />
      <directionalLight position={[2, 4, 3]} intensity={1.5} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#dbe8f5" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><circleGeometry args={[2.2, 64]} /><meshStandardMaterial color="#E6EDF2" roughness={1} /></mesh>
      <Env />
      <ExerciseRig key={an ? 'body' : 'stick'} {...props} an={an} labelRefs={labelRefs} />
      <CameraRig motion={props.motion} />
    </Canvas>
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {listed.map(([id, role]) => (
        <div key={id} ref={(el) => { labelRefs.current[id] = el }} className="label3d" style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden', borderColor: ROLE_COLORS[role] }}>{muscleLabel(id, props.simple)}</div>
      ))}
    </div>
    </div>
  )
}
