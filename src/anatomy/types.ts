// Description d'une articulation pour le visualiseur anatomique.
export type V3 = [number, number, number]

export interface SegmentDef {
  id: string
  /** segment parent (repère fixe si absent) */
  parent?: string
  pivot: V3
  axis: V3
  /** degré de liberté qui pilote ce segment ; ratio pour les os qui suivent (rotule) */
  dof: string
  ratio?: number
  /** translation (m) par degré, le long de `slide` (glissement) */
  slide?: V3
}

export interface LigamentDef {
  id: string
  label: string
  simple: string
  a: { seg: string; p: V3 }
  b: { seg: string; p: V3 }
  width: number
  thick?: number
  kind?: 'ligament' | 'tendon'
}

export interface CustomDef {
  id: string
  label: string
  simple: string
  seg: string
  kind: 'cartilage' | 'meniscus' | 'bursa' | 'implant'
  build: () => import('three').BufferGeometry
}

export type MuscleGroup = 'extensor' | 'flexor' | 'other'
export interface MuscleDef { name: string; label: string; simple: string; group: MuscleGroup; unit?: string }
export interface UnitDef { id: string; label: string; simple: string }

export interface FrictionDef { id: string; label: string; at: { seg: string; p: V3 }; window: [number, number]; arrow: V3 }

export interface PathoVisual {
  /** amplitude possible chez le patient */
  rom?: [number, number]
  /** structures lésées (en rouge) : ids de ligaments / customs / muscles */
  damaged?: string[]
  /** structures rompues : affichées en deux moignons */
  torn?: string[]
  friction?: FrictionDef[]
  /** usure du cartilage (épaisseur réduite, rugueux) */
  wear?: string[]
  /** décalage d'un segment (ex. tiroir antérieur) */
  shift?: { seg: string; by: V3 }
  /** remplace une zone par une prothèse */
  implant?: string[]
  /** étirement imposé à un ligament (entorse) */
  strain?: Record<string, number>
  caption: string
  simpleCaption: string
}

export interface JointDef {
  id: string
  label: string
  dofs: { id: string; label: string; min: number; max: number; rest: number; unit?: string }[]
  /** pièces anatomiques réelles ; les os sont rigides et rattachés à un segment */
  bones: { name: string; seg: string; label: string; simple: string; anchor?: V3 }[]
  muscles: MuscleDef[]
  /** groupes fonctionnels (une étiquette par groupe) */
  units: UnitDef[]
  extraMuscles?: string[]
  tendons?: string[]
  segments: SegmentDef[]
  /** répartition des tissus déformables (muscles, peau) entre segment fixe et mobile */
  blend: { center: V3; dir: V3; band: number; seg: string; inRegion: (x: number, y: number, z: number) => boolean }
  /** zones de cartilage peintes sur les os */
  cartilage: { bone: string; test: (x: number, y: number, z: number) => boolean }[]
  ligaments: LigamentDef[]
  customs: CustomDef[]
  /** muscles actifs selon le sens du mouvement */
  actions: { increasing: MuscleGroup; decreasing: MuscleGroup; hold: MuscleGroup }
  camera: { pos: V3; target: V3; fov?: number }
  arc: { seg: string; radius: number; dof: string }
  pathologies: Record<string, PathoVisual>
  /** zone à rogner en hauteur pour ne garder que la région (m) */
  clip?: { minY: number; maxY: number }
}
