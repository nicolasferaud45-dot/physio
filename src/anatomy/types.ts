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
  /** autres mouvements portés par ce segment */
  alt?: { dof: string; axis: V3; ratio?: number; pivot?: V3 }[]
}

export interface LigamentDef {
  id: string
  mirror?: boolean
  label: string
  simple: string
  a: { seg: string; p: V3 }
  b: { seg: string; p: V3 }
  width: number
  thick?: number
  kind?: 'ligament' | 'tendon'
}

export interface BlendRule {
  /** segment côté « avant » la bande (fixe si absent) */
  from?: string
  /** segment côté « après » la bande */
  seg: string
  center: V3
  /** direction qui pointe vers le côté « from » */
  dir: V3
  band: number
  inRegion: (x: number, y: number, z: number) => boolean
}

export type NerveArea = 'L4' | 'L5' | 'S1' | 'sciatique' | 'fibulaire' | 'tibial' | 'plantaire' | 'C5' | 'C6' | 'C7' | 'median' | 'ulnaire' | 'radial' | 'axillaire' | 'suprascapulaire' | 'cauda'
export interface NerveDef {
  id: string
  label: string
  simple: string
  /** trajet : points rattachés aux segments */
  points: { seg: string; p: V3 }[]
  radius?: number
  /** zone où le patient ressent les symptômes */
  area?: NerveArea
  mirror?: boolean
}

export interface CustomDef {
  id: string
  label: string
  simple: string
  seg: string
  kind: 'cartilage' | 'meniscus' | 'bursa' | 'implant'
  mirror?: boolean
  /** visible seulement pour ces pathologies */
  only?: string[]
  opacity?: number
  build: () => import('three').BufferGeometry
}

export type MuscleGroup = 'extensor' | 'flexor' | 'other'
export interface MuscleDef { name: string; label: string; simple: string; group: MuscleGroup; unit?: string; /** suit un seul segment (pas de déformation) */ rigid?: string }
export interface UnitDef { id: string; label: string; simple: string }

export interface FrictionDef { id: string; label: string; at: { seg: string; p: V3 }; window: [number, number]; arrow: V3 }

export interface PathoVisual {
  /** mouvement montré (degré de liberté) ; le premier par défaut */
  motion?: string
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
  /** nerfs comprimés ou irrités */
  nerves?: string[]
  /** remplace une zone par une prothèse */
  implant?: string[]
  /** étirement imposé à un ligament (entorse) */
  strain?: Record<string, number>
  caption: string
  simpleCaption: string
  /** zone douloureuse sur l'amplitude (degrés) */
  painZone?: [number, number]
  /** au moment où ça fait mal : ce qui souffre, ce qui travaille, ce qu'on va faire (mots simples) */
  suffers?: string[]
  works?: string[]
  todo?: string
  /** affichage par défaut : articulation (muscles estompés) ou complet */
  view?: 'deep' | 'complete'
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
  /** muscles qui ne se déforment pas (tronc) : suivent un seul segment ou restent fixes */
  rigidMuscles?: Record<string, string>
  tendons?: string[]
  /** disques intervertébraux (déformables, aspect cartilage) */
  discs?: string[]
  segments: SegmentDef[]
  /** répartition des tissus déformables (muscles, peau) entre deux segments ; la première règle dont la région contient le sommet s'applique */
  blend: BlendRule | BlendRule[]
  /** ajoute le côté gauche en miroir (rachis) */
  bilateral?: boolean
  /** zones de cartilage peintes sur les os */
  cartilage: { bone: string; test: (x: number, y: number, z: number) => boolean }[]
  ligaments: LigamentDef[]
  customs: CustomDef[]
  nerves?: NerveDef[]
  /** muscles actifs selon le sens du mouvement */
  actions: { increasing: MuscleGroup; decreasing: MuscleGroup; hold: MuscleGroup }
  /** frame : largeur et hauteur (m) à garder visibles */
  camera: { pos: V3; target: V3; fov?: number; frame?: [number, number] }
  arc: { radius: number; offset?: V3 }
  pathologies: Record<string, PathoVisual>
  /** zone à rogner en hauteur pour ne garder que la région (m) */
  clip?: { minY: number; maxY: number }
}
