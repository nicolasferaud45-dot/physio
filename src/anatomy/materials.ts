// Matériaux anatomiques : os ivoire mat, cartilage bleu-gris brillant, muscles rouges striés,
// tendons et ligaments blanc nacré, peau en verre dépoli (contour plus visible que le centre).
import * as THREE from 'three'

export const COLORS = {
  bone: new THREE.Color('#E9DDC6'),
  cartilage: new THREE.Color('#9DB4CB'),
  muscle: new THREE.Color('#A2423A'),
  tendon: new THREE.Color('#EDE7DA'),
  ligament: new THREE.Color('#D5E2EE'),
  tension: new THREE.Color('#F08A24'),
  danger: new THREE.Color('#D3361F'),
  skin: new THREE.Color('#E7BFA6'),
  metal: new THREE.Color('#C9CED6'),
}

function fiberTexture() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, 512, 64)
  let x = 0
  // fibres longitudinales : bandes fines de largeur et de teinte variables
  while (x < 512) {
    const w = 1 + Math.random() * 3.5
    const v = 150 + Math.floor(Math.random() * 105)
    g.fillStyle = `rgb(${v},${v},${v})`
    g.fillRect(x, 0, w, 64)
    x += w + Math.random() * 1.2
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}
let fiber: THREE.Texture | null = null
const fiberTex = () => (fiber ??= fiberTexture())

/** Contour plus opaque que le centre (effet verre dépoli / rayons X). */
function rim<T extends THREE.Material>(mat: T, power: number, floor: number): T {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.rimPower = { value: power }
    sh.uniforms.rimFloor = { value: floor }
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float rimPower;\nuniform float rimFloor;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), rimPower);
        gl_FragColor.a *= mix(rimFloor, 1.0, fr);`)
  }
  mat.customProgramCacheKey = () => `rim${power}${floor}`
  return mat
}

export interface MaterialSet {
  bone: THREE.MeshPhysicalMaterial
  muscle: THREE.MeshPhysicalMaterial
  tendon: THREE.MeshPhysicalMaterial
  ligament: THREE.MeshPhysicalMaterial
  cartilage: THREE.MeshPhysicalMaterial
  skin: THREE.MeshPhysicalMaterial
  metal: THREE.MeshPhysicalMaterial
}

export function makeMaterials(xray = false): MaterialSet {
  const bone = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.62, clearcoat: 0.18, clearcoatRoughness: 0.5, sheen: 0.25, sheenColor: new THREE.Color('#fff4dc') })
  const muscle = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, map: fiberTex(), bumpMap: fiberTex(), bumpScale: 1.2, roughness: 0.48, sheen: 0.6, sheenColor: new THREE.Color('#ffb4a2'), sheenRoughness: 0.4, clearcoat: 0.25, clearcoatRoughness: 0.35 })
  const lf = fiberTex().clone(); lf.repeat.set(3, 1); lf.needsUpdate = true
  // tendons/ligaments : fibres longitudinales visibles (sinon ils ressemblent à des plaques lisses)
  const tendon = new THREE.MeshPhysicalMaterial({ color: COLORS.tendon, map: lf, bumpMap: lf, bumpScale: 1.6, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.8, sheenColor: new THREE.Color('#dfe9ff') })
  const ligament = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: false, map: lf, bumpMap: lf, bumpScale: 1.6, roughness: 0.4, clearcoat: 0.7, transparent: true, opacity: 0.92, sheen: 0.6, sheenColor: new THREE.Color('#e6f0ff') })
  const cartilage = new THREE.MeshPhysicalMaterial({ color: COLORS.cartilage, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.95 })
  const skin = rim(new THREE.MeshPhysicalMaterial({ color: COLORS.skin, roughness: 0.55, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.FrontSide, sheen: 0.5, sheenColor: new THREE.Color('#ffd9c4') }), 1.6, 0.35)
  const metal = new THREE.MeshPhysicalMaterial({ color: COLORS.metal, metalness: 1, roughness: 0.22, clearcoat: 0.5 })
  if (xray) {
    for (const m of [bone]) { m.emissive = new THREE.Color('#BFD9FF'); m.emissiveIntensity = 0.25; rim(m, 1.4, 0.55); m.transparent = true; m.depthWrite = false }
  }
  return { bone, muscle, tendon, ligament, cartilage, skin, metal }
}

/** Halo radial (activation, frottement). */
export function glowTexture(color: string) {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  r.addColorStop(0, color); r.addColorStop(0.35, color.replace('1)', '0.55)')); r.addColorStop(1, color.replace('1)', '0)'))
  g.fillStyle = r; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
