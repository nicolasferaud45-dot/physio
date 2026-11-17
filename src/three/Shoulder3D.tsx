import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { Visual3D } from '../data/catalog'

/**
 * Épaule droite en 3D (vue de face), modélisée de façon procédurale pour le prototype.
 * Dans la version finale, ces maillages seront remplacés par un modèle glTF réalisé
 * par un illustrateur médical (squelette + morph targets par pathologie). L'API du
 * composant (props) restera la même.
 */
export interface ShoulderProps {
  visual: Exclude<Visual3D, null>
  sick: boolean
  layers: { bones: boolean; joint: boolean; muscles: boolean; nerves: boolean }
  /** angle d'abduction demandé (degrés) quand l'animation est arrêtée */
  targetAngle: number
  playing: boolean
  /** amplitude maximale (degrés) de l'épaule affichée */
  maxAngle: number
  vulgar: boolean
  controlsEnabled: boolean
  onAngle?: (deg: number) => void
  onCanvas?: (c: HTMLCanvasElement) => void
  /** vue comparée : on n'affiche que les repères liés à la pathologie */
  compact?: boolean
}

const C = {
  bone: '#EFE6D2', cartilage: '#BFD8EA', muscle: '#B8675A', tendon: '#F3EBDD',
  capsule: '#8DB8D8', capsuleSick: '#D7684F', bursa: '#8FC0E0', inflam: '#E4472B', nerve: '#E0B13A',
}

function stripeTexture(base: string, line: string, vertical = false) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = base; g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 256; i += 4) {
    g.strokeStyle = line; g.globalAlpha = 0.25 + Math.random() * 0.35; g.lineWidth = 1 + Math.random()
    g.beginPath()
    if (vertical) { g.moveTo(i, 0); g.lineTo(i + (Math.random() - 0.5) * 6, 256) } else { g.moveTo(0, i); g.lineTo(256, i + (Math.random() - 0.5) * 6) }
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function boneTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = C.bone; g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 900; i++) {
    g.fillStyle = Math.random() > 0.5 ? 'rgba(170,150,110,0.10)' : 'rgba(255,255,255,0.18)'
    g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, Math.random() * 3 + 0.5, 0, Math.PI * 2); g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const tube = (pts: [number, number, number][], r: number, seg = 48) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 16, false)

const HEAD = new THREE.Vector3(-0.05, 0, 0)
const TUBEROSITY_LOCAL = new THREE.Vector3(0.4, 0.2, 0.05)
const BELLY_END = new THREE.Vector3(-0.62, 0.74, -0.05)

interface Label { id: string; pos: [number, number, number]; text: string; red?: boolean }
type LabelRefs = MutableRefObject<Record<string, HTMLDivElement | null>>

function shoulderLabels(p: ShoulderProps): Label[] {
  const lbl = (simple: string, tech: string) => (p.vulgar ? simple : tech)
  const L = p.layers
  const out: Label[] = []
  if (L.bones && !p.compact) out.push({ id: 'acromion', pos: [0.35, 1.3, 0.3], text: lbl("L'os du dessus (acromion)", 'Acromion') })
  if (L.muscles && !p.compact) out.push({ id: 'supra', pos: [-1.9, 0.42, -0.2], text: lbl('Muscle et tendon (coiffe)', 'Supra-épineux') })
  if (L.joint && p.visual === 'conflit') out.push({ id: 'space', pos: [-0.25, 1.5, 0.3], red: p.sick, text: p.sick ? lbl('Ça pince ici en levant le bras', 'Espace sous-acromial réduit') : lbl('Assez de place pour le tendon', 'Espace sous-acromial libre') })
  if (L.joint && p.visual === 'capsulite') out.push({ id: 'capsule', pos: [-0.45, -0.95, 0.55], red: p.sick, text: p.sick ? lbl('Enveloppe épaissie, rétractée', 'Capsule fibrosée') : lbl('Enveloppe souple + repli', 'Capsule + récessus axillaire') })
  if (L.joint && p.visual === 'bursite') out.push({ id: 'bursa', pos: [0.95, 0.72, 0.3], red: p.sick, text: p.sick ? lbl('Coussin gonflé', 'Bourse inflammée') : lbl('Petit coussin (bourse)', 'Bourse sous-acromiale') })
  if (L.nerves) out.push({ id: 'nerve', pos: [-2.3, 1.3, -0.6], text: 'Nerf supra-scapulaire' })
  return out
}
const projV = new THREE.Vector3()

function Scene(p: ShoulderProps & { labels: Label[]; labelRefs: LabelRefs }) {
  const boneTex = useMemo(boneTexture, [])
  const muscleTex = useMemo(() => stripeTexture('#BE7062', '#7E3B31'), [])
  const deltoidTex = useMemo(() => stripeTexture('#BE7062', '#7E3B31', true), [])

  const boneMat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: boneTex, color: '#ffffff', roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.6 }), [boneTex])
  const cartMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: C.cartilage, roughness: 0.25, clearcoat: 0.8, transmission: 0.1 }), [])
  const muscleMat = useMemo(() => new THREE.MeshStandardMaterial({ map: muscleTex, roughness: 0.55 }), [muscleTex])
  const tendonMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: C.tendon, roughness: 0.35, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') }), [])
  const deltoidMat = useMemo(() => new THREE.MeshStandardMaterial({ map: deltoidTex, transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide, roughness: 0.6 }), [deltoidTex])
  const capsuleMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: C.capsule, transparent: true, opacity: 0.28, depthWrite: false, roughness: 0.2, side: THREE.DoubleSide, emissive: new THREE.Color(C.inflam), emissiveIntensity: 0 }), [])
  const bursaMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: C.bursa, transparent: true, opacity: 0.75, roughness: 0.15, emissive: new THREE.Color(C.inflam), emissiveIntensity: 0 }), [])
  const glowMat = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128
    const g = c.getContext('2d')!
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grd.addColorStop(0, 'rgba(228,71,43,1)'); grd.addColorStop(0.35, 'rgba(228,71,43,0.55)'); grd.addColorStop(1, 'rgba(228,71,43,0)')
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128)
    return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false, depthTest: false })
  }, [])
  const nerveMat = useMemo(() => new THREE.MeshStandardMaterial({ color: C.nerve, roughness: 0.4, emissive: new THREE.Color('#5a4200'), emissiveIntensity: 0.3 }), [])

  const scapulaGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.78, 0.38)
    s.quadraticCurveTo(-1.8, 0.62, -2.85, 0.78)
    s.lineTo(-3.05, 0.25)
    s.quadraticCurveTo(-2.75, -1.2, -2.25, -2.6)
    s.quadraticCurveTo(-1.55, -1.5, -0.86, -0.38)
    s.quadraticCurveTo(-0.7, 0, -0.78, 0.38)
    return new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4 })
  }, [])
  const spineGeo = useMemo(() => tube([[-2.95, 0.52, -0.38], [-1.7, 0.82, -0.36], [-0.7, 1.0, -0.22], [0.05, 1.02, 0.05], [0.42, 0.93, 0.26]], 0.12), [])
  const clavicleGeo = useMemo(() => tube([[0.32, 0.99, 0.36], [-0.55, 1.12, 0.78], [-1.75, 1.06, 1.18], [-2.85, 0.92, 1.25]], 0.1), [])
  const coracoidGeo = useMemo(() => tube([[-0.95, 0.42, -0.12], [-0.72, 0.56, 0.32], [-0.42, 0.44, 0.52]], 0.07, 24), [])
  const bellyGeo = useMemo(() => tube([[-2.75, 0.74, -0.3], [-1.8, 0.82, -0.22], [-1.1, 0.8, -0.12], [BELLY_END.x, BELLY_END.y, BELLY_END.z]], 0.19), [])
  const supNerveGeo = useMemo(() => tube([[-2.7, 1.05, -0.62], [-1.6, 0.66, -0.55], [-1.0, 0.3, -0.5], [-0.8, -0.2, -0.45]], 0.035), [])
  const axNerveGeo = useMemo(() => tube([[-1.2, -0.55, -0.3], [-0.6, -0.78, -0.3], [0.05, -0.72, -0.05], [0.42, -0.5, 0.22]], 0.035), [])
  const cartGeo = useMemo(() => new THREE.SphereGeometry(0.507, 40, 28, -Math.PI / 2, Math.PI, 0.25, Math.PI - 0.5), [])
  const deltoidGeo = useMemo(() => new THREE.SphereGeometry(0.78, 40, 28, -0.9, 2.6, 0.15, 2.2), [])

  const arm = useRef<THREE.Group>(null)
  const tendon = useRef<THREE.Mesh>(null)
  const capsule = useRef<THREE.Mesh>(null)
  const pouch = useRef<THREE.Mesh>(null)
  const bursa = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.Sprite>(null)
  const angle = useRef(0)
  const t0 = useRef(0)
  const lastReported = useRef(-1)

  useEffect(() => { t0.current = performance.now() }, [p.playing])

  useFrame((state, dt) => {
    for (const l of p.labels) {
      const el = p.labelRefs.current[l.id]
      if (!el) continue
      const v = projV.set(...l.pos).project(state.camera)
      el.style.transform = `translate(-50%, -50%) translate(${(((v.x + 1) / 2) * state.size.width).toFixed(1)}px, ${(((1 - v.y) / 2) * state.size.height).toFixed(1)}px)`
      el.style.visibility = v.z < 1 ? 'visible' : 'hidden'
    }
    const time = state.clock.elapsedTime
    const max = p.maxAngle
    let target = Math.min(p.targetAngle, max)
    if (p.playing) {
      const ph = ((performance.now() - t0.current) / 1000) * 0.55
      target = max * (0.5 - 0.5 * Math.cos(ph * Math.PI))
    }
    angle.current += (target - angle.current) * Math.min(1, dt * (p.playing ? 12 : 6))
    const a = angle.current
    const rad = THREE.MathUtils.degToRad(a)
    if (arm.current) arm.current.rotation.z = rad

    // Tendon du supra-épineux : suit la grosse tubérosité
    const tub = TUBEROSITY_LOCAL.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), rad).add(HEAD)
    const ctrl = new THREE.Vector3(-0.12, 0.66, 0).lerp(new THREE.Vector3(-0.2, 0.6, 0.02), Math.min(1, a / 90))
    const curve = new THREE.QuadraticBezierCurve3(BELLY_END, ctrl, tub)
    if (tendon.current) { tendon.current.geometry.dispose(); tendon.current.geometry = new THREE.TubeGeometry(curve, 32, 0.075, 12, false) }

    const pulse = 0.5 + 0.5 * Math.sin(time * 4)
    // Arc douloureux (conflit) : intensité max vers 90°
    const arc = Math.max(0, 1 - Math.abs(a - 90) / 35)
    const conflictSick = p.sick && p.visual === 'conflit'
    const bursitis = p.sick && p.visual === 'bursite'
    const capsulitis = p.sick && p.visual === 'capsulite'

    // Capsule
    if (capsule.current) {
      const s = capsulitis ? [0.56, 0.63, 0.54] : [0.63, 0.72, 0.6]
      capsule.current.scale.set(s[0], s[1], s[2])
      capsuleMat.color.set(capsulitis ? C.capsuleSick : C.capsule)
      capsuleMat.opacity = capsulitis ? 0.4 : 0.22
      capsuleMat.emissiveIntensity = capsulitis ? 0.15 + 0.25 * pulse : 0
    }
    if (pouch.current) {
      pouch.current.visible = !capsulitis
      const unfold = 1 - Math.min(1, a / 120)
      pouch.current.scale.set(0.34, 0.08 + 0.2 * unfold, 0.38)
      pouch.current.position.y = -0.6 + 0.2 * (1 - unfold)
    }
    // Bourse
    if (bursa.current) {
      let sx = 0.5, sy = 0.045, sz = 0.36, red = 0
      if (bursitis) { sx = 0.72; sy = 0.21 + 0.02 * pulse; sz = 0.56; red = 0.7 + 0.4 * pulse }
      if (conflictSick) { sx = 0.5 + 0.08 * arc; sy = 0.05 * (1 - 0.4 * arc); red = arc * (0.9 + 0.4 * pulse) }
      bursa.current.scale.set(sx, sy, sz)
      bursaMat.color.set(red > 0.05 ? '#E07A62' : C.bursa)
      bursaMat.emissiveIntensity = red
    }
    // Halo d'inflammation
    if (glow.current) {
      let o = 0
      if (conflictSick) o = Math.min(1, arc * (0.75 + 0.35 * pulse))
      if (bursitis) o = 0.55 + 0.3 * pulse
      glowMat.opacity = o
      glow.current.scale.setScalar(bursitis ? 1.5 : 1.0 + 0.6 * arc)
    }

    deltoidMat.opacity = 0.17 * Math.max(0, 1 - a / 50)

    const rounded = Math.round(a)
    if (p.onAngle && rounded !== lastReported.current) { lastReported.current = rounded; p.onAngle(rounded) }
  })

  const L = p.layers

  return (
    <>
      <hemisphereLight args={['#ffffff', '#c9d6df', 0.9]} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#dbe8f5" />
      <directionalLight position={[0, -3, 4]} intensity={0.25} />

      <group visible={L.bones}>
        <group position={[-0.75, 0, -0.5]} rotation={[0, -0.55, 0]}><mesh geometry={scapulaGeo} material={boneMat} position={[0.75, 0, -0.05]} /></group>
        <mesh position={[-0.68, 0, -0.08]} scale={[0.14, 0.5, 0.4]} material={boneMat}><sphereGeometry args={[1, 32, 24]} /></mesh>
        <mesh position={[-0.6, 0, -0.06]} scale={[0.05, 0.46, 0.36]} material={cartMat}><sphereGeometry args={[1, 32, 24]} /></mesh>
        <mesh geometry={spineGeo} material={boneMat} scale={[1, 0.7, 1.15]} />
        <mesh geometry={clavicleGeo} material={boneMat} />
        <mesh geometry={coracoidGeo} material={boneMat} />
      </group>

      <group ref={arm} position={HEAD.toArray()}>
        <group visible={L.bones}>
          <mesh material={boneMat}><sphereGeometry args={[0.5, 48, 36]} /></mesh>
          <mesh geometry={cartGeo} material={cartMat} rotation={[0, 0, -0.5]} />
          <mesh position={[0.36, 0.14, 0.05]} material={boneMat}><sphereGeometry args={[0.2, 24, 18]} /></mesh>
          <mesh position={[0.12, -0.02, 0.38]} material={boneMat}><sphereGeometry args={[0.12, 20, 14]} /></mesh>
          <mesh position={[0.12, -0.5, 0]} material={boneMat}><cylinderGeometry args={[0.24, 0.19, 0.5, 32]} /></mesh>
          <mesh position={[0.14, -2.1, 0]} material={boneMat}><cylinderGeometry args={[0.17, 0.16, 3.2, 32]} /></mesh>
        </group>
        <group visible={L.muscles}>
          <mesh geometry={deltoidGeo} material={deltoidMat} position={[0.12, -0.38, 0]} scale={[1, 1.55, 1.02]} />
        </group>
      </group>

      <group visible={L.muscles}>
        <mesh geometry={bellyGeo} material={muscleMat} />
        <mesh ref={tendon} material={tendonMat}><bufferGeometry /></mesh>
      </group>

      <group visible={L.joint}>
        <mesh ref={capsule} material={capsuleMat} position={[-0.3, -0.02, 0]}><sphereGeometry args={[1, 40, 30]} /></mesh>
        <mesh ref={pouch} material={capsuleMat} position={[-0.3, -0.6, 0.02]}><sphereGeometry args={[1, 32, 24]} /></mesh>
        <mesh ref={bursa} material={bursaMat} position={[0.08, 0.7, 0.12]} renderOrder={2}><sphereGeometry args={[1, 40, 24]} /></mesh>
      </group>
      <sprite ref={glow} material={glowMat} position={[0.1, 0.7, 0.3]} />

      <group visible={L.nerves}>
        <mesh geometry={supNerveGeo} material={nerveMat} />
        <mesh geometry={axNerveGeo} material={nerveMat} />
      </group>

      <ShoulderCamera enabled={p.controlsEnabled} />
    </>
  )
}

/** Cadrage adapté à la forme de l'écran : sur écran étroit, l'épaule est centrée et la caméra recule. */
function ShoulderCamera({ enabled }: { enabled: boolean }) {
  const { camera, size } = useThree()
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const aspect = size.width / Math.max(1, size.height)
  useEffect(() => {
    // Cadre la zone omoplate → humérus (≈ 4,6 × 3,4 unités) quelle que soit la forme du panneau
    const target = new THREE.Vector3(-0.55, -0.2, 0)
    const t = Math.tan(THREE.MathUtils.degToRad(19))
    const dist = Math.max(1.75 / t, 2.35 / (t * aspect))
    camera.position.set(target.x + 0.25, target.y + 0.5, dist)
    controls.current?.target.copy(target)
    controls.current?.update()
  }, [aspect, camera])
  return <OrbitControls ref={controls} enabled={enabled} enablePan={false} minDistance={3} maxDistance={16} />
}

export default function Shoulder3D(props: ShoulderProps) {
  const labelRefs: LabelRefs = useRef({})
  const labels = shoulderLabels(props)
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
    <Canvas
      camera={{ position: [0.95, 0.25, 7.4], fov: 38 }}
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      onCreated={({ gl }) => props.onCanvas?.(gl.domElement)}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene {...props} labels={labels} labelRefs={labelRefs} />
    </Canvas>
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {labels.map((l) => (
        <div key={l.id} ref={(el) => { labelRefs.current[l.id] = el }} className={'label3d' + (l.red ? ' red' : '')} style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden' }}>{l.text}</div>
      ))}
    </div>
    </div>
  )
}
