// Genou droit (le côté gauche est obtenu par miroir). Repère : mètres, y haut, z avant, x négatif = dehors.
import * as THREE from 'three'
import type { JointDef, V3 } from '../types'

const K: V3 = [-0.075, 0.428, 0.066] // axe de flexion : centre des condyles fémoraux
const PLATEAU_Y = 0.401

function meniscus(cx: number, cz: number, rx: number, rz: number, open: number, openDir: number) {
  // Croissant en coin : section triangulaire, ouverture vers l'échancrure
  const shape = new THREE.Shape()
  shape.moveTo(0, 0); shape.lineTo(0.0075, 0); shape.lineTo(0.0075, 0.0055); shape.lineTo(0, 0.0012); shape.lineTo(0, 0)
  const pts: THREE.Vector3[] = []
  const a0 = openDir + open / 2, a1 = openDir + Math.PI * 2 - open / 2
  for (let k = 0; k <= 48; k++) {
    const a = a0 + ((a1 - a0) * k) / 48
    pts.push(new THREE.Vector3(cx + Math.cos(a) * rx, PLATEAU_Y, cz + Math.sin(a) * rz))
  }
  const path = new THREE.CatmullRomCurve3(pts)
  const g = new THREE.ExtrudeGeometry(shape, { steps: 64, extrudePath: path, bevelEnabled: false })
  // l'extrusion oriente la section selon le repère de Frenet : on l'aplatit vers le haut
  g.computeVertexNormals()
  return g
}

function plateauCartilage(cx: number, cz: number, rx: number, rz: number) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 40, 1)
  g.scale(rx, 0.0025, rz); g.translate(cx, PLATEAU_Y - 0.0005, cz)
  return g
}

export const KNEE: JointDef = {
  id: 'genou',
  label: 'Genou',
  dofs: [{ id: 'flex', label: 'Flexion du genou', min: 0, max: 135, rest: 0, unit: '°' }],
  bones: [
    { name: 'right femur', seg: 'thigh', label: 'Fémur', simple: 'Os de la cuisse', anchor: [-0.11, 0.5, 0.09] },
    { name: 'right tibia', seg: 'leg', label: 'Tibia', simple: 'Os de la jambe', anchor: [-0.07, 0.3, 0.09] },
    { name: 'right fibula', seg: 'leg', label: 'Fibula (péroné)', simple: 'Petit os de la jambe', anchor: [-0.12, 0.3, 0.055] },
    { name: 'right patella', seg: 'patella', label: 'Rotule (patella)', simple: 'Rotule', anchor: [-0.083, 0.418, 0.113] },
  ],
  muscles: [
    { name: 'right rectus femoris', label: 'Droit fémoral', simple: 'Muscle de devant de la cuisse', group: 'extensor', unit: 'quadriceps' },
    { name: 'right vastus lateralis', label: 'Vaste latéral', simple: 'Muscle de devant (côté extérieur)', group: 'extensor', unit: 'quadriceps' },
    { name: 'right vastus medialis', label: 'Vaste médial', simple: 'Muscle de devant (côté intérieur)', group: 'extensor', unit: 'quadriceps' },
    { name: 'right vastus intermedius', label: 'Vaste intermédiaire', simple: 'Muscle de devant (profond)', group: 'extensor', unit: 'quadriceps' },
    { name: 'long head of right biceps femoris', label: 'Biceps fémoral (long chef)', simple: 'Ischio-jambier extérieur', group: 'flexor', unit: 'ischios' },
    { name: 'short head of right biceps femoris', label: 'Biceps fémoral (court chef)', simple: 'Ischio-jambier extérieur', group: 'flexor', unit: 'ischios' },
    { name: 'right semitendinosus', label: 'Semi-tendineux', simple: 'Ischio-jambier intérieur', group: 'flexor', unit: 'ischios' },
    { name: 'right semimembranosus', label: 'Semi-membraneux', simple: 'Ischio-jambier intérieur', group: 'flexor', unit: 'ischios' },
    { name: 'medial head of right gastrocnemius', label: 'Gastrocnémien médial', simple: 'Mollet (intérieur)', group: 'flexor', unit: 'mollet' },
    { name: 'lateral head of right gastrocnemius', label: 'Gastrocnémien latéral', simple: 'Mollet (extérieur)', group: 'flexor', unit: 'mollet' },
    { name: 'right popliteus', label: 'Poplité', simple: 'Petit muscle derrière le genou', group: 'flexor', unit: 'poplite' },
    { name: 'right gracilis', label: 'Gracile', simple: 'Muscle de l\'intérieur de la cuisse', group: 'flexor', unit: 'patte-oie' },
    { name: 'right sartorius', label: 'Sartorius', simple: 'Muscle en écharpe de la cuisse', group: 'flexor', unit: 'patte-oie' },
  ],
  units: [
    { id: 'quadriceps', label: 'Quadriceps', simple: 'Muscles de devant de la cuisse' },
    { id: 'ischios', label: 'Ischio-jambiers', simple: 'Muscles de derrière la cuisse' },
    { id: 'mollet', label: 'Gastrocnémiens', simple: 'Mollet' },
    { id: 'poplite', label: 'Poplité', simple: 'Petit muscle derrière le genou' },
    { id: 'patte-oie', label: 'Patte d\'oie (gracile, sartorius)', simple: 'Muscles de l\'intérieur du genou' },
  ],
  extraMuscles: ['right soleus', 'right tibialis anterior', 'right fibularis longus', 'right extensor digitorum longus', 'right plantaris', 'right adductor magnus', 'right tensor fasciae latae', 'right tibialis posterior', 'right flexor digitorum longus', 'right fibularis brevis'],
  tendons: ['right iliotibial tract'],
  segments: [
    { id: 'leg', pivot: K, axis: [1, 0, 0], dof: 'flex' },
    { id: 'patella', pivot: [K[0], K[1] + 0.004, K[2] - 0.004], axis: [1, 0, 0], dof: 'flex', ratio: 0.68 },
  ],
  blend: { center: K, dir: [0, 1, 0], band: 0.03, seg: 'leg', inRegion: (x, y) => x < -0.025 && y < 0.62 },
  cartilage: [
    // condyles et trochlée
    { bone: 'right femur', test: (x, y, z) => y < 0.452 && (z < 0.052 ? y < 0.44 : true) && x > -0.112 && x < -0.038 },
    { bone: 'right tibia', test: (_x, y, z) => y > PLATEAU_Y - 0.006 && z > 0.042 && z < 0.098 },
    { bone: 'right patella', test: (_x, y, z) => z < 0.106 && y > 0.4 },
  ],
  ligaments: [
    { id: 'lca', label: 'Ligament croisé antérieur', simple: 'Ligament croisé de devant', a: { seg: 'thigh', p: [-0.088, 0.427, 0.052] }, b: { seg: 'leg', p: [-0.072, PLATEAU_Y, 0.078] }, width: 0.008 },
    { id: 'lcp', label: 'Ligament croisé postérieur', simple: 'Ligament croisé de derrière', a: { seg: 'thigh', p: [-0.064, 0.43, 0.072] }, b: { seg: 'leg', p: [-0.078, 0.393, 0.046] }, width: 0.009 },
    { id: 'lli', label: 'Ligament collatéral médial', simple: 'Ligament de l\'intérieur du genou', a: { seg: 'thigh', p: [-0.035, 0.445, 0.064] }, b: { seg: 'leg', p: [-0.046, 0.335, 0.074] }, width: 0.012, thick: 0.002 },
    { id: 'lle', label: 'Ligament collatéral latéral', simple: 'Ligament de l\'extérieur du genou', a: { seg: 'thigh', p: [-0.116, 0.443, 0.062] }, b: { seg: 'leg', p: [-0.122, 0.385, 0.058] }, width: 0.006 },
    { id: 'tendon-rotulien', label: 'Tendon rotulien', simple: 'Tendon sous la rotule', a: { seg: 'patella', p: [-0.083, 0.401, 0.108] }, b: { seg: 'leg', p: [-0.078, 0.352, 0.103] }, width: 0.022, thick: 0.005, kind: 'tendon' },
    { id: 'tendon-quadricipital', label: 'Tendon quadricipital', simple: 'Tendon au-dessus de la rotule', a: { seg: 'thigh', p: [-0.085, 0.475, 0.1] }, b: { seg: 'patella', p: [-0.084, 0.434, 0.11] }, width: 0.03, thick: 0.006, kind: 'tendon' },
  ],
  customs: [
    { id: 'menisque-medial', label: 'Ménisque médial', simple: 'Ménisque intérieur (amortisseur)', seg: 'leg', kind: 'meniscus', build: () => meniscus(-0.057, 0.069, 0.019, 0.021, 0.9, Math.PI) },
    { id: 'menisque-lateral', label: 'Ménisque latéral', simple: 'Ménisque extérieur (amortisseur)', seg: 'leg', kind: 'meniscus', build: () => meniscus(-0.097, 0.07, 0.016, 0.017, 0.55, 0) },
    { id: 'cartilage-medial', label: 'Cartilage du plateau médial', simple: 'Cartilage (intérieur)', seg: 'leg', kind: 'cartilage', build: () => plateauCartilage(-0.057, 0.069, 0.014, 0.017) },
    { id: 'cartilage-lateral', label: 'Cartilage du plateau latéral', simple: 'Cartilage (extérieur)', seg: 'leg', kind: 'cartilage', build: () => plateauCartilage(-0.097, 0.07, 0.012, 0.014) },
  ],
  actions: { increasing: 'flexor', decreasing: 'extensor', hold: 'extensor' },
  camera: { pos: [-0.62, 0.52, 0.42], target: [-0.078, 0.415, 0.07], fov: 30, frame: [0.3, 0.36] },
  arc: { seg: 'leg', radius: 0.12, dof: 'flex' },
  clip: { minY: 0.12, maxY: 0.74 },
  pathologies: {
    gonarthrose: {
      rom: [5, 110], wear: ['cartilage-medial'], damaged: ['cartilage-medial', 'menisque-medial'],
      friction: [{ id: 'f-med', label: 'FROTTEMENT / COMPRESSION', at: { seg: 'leg', p: [-0.057, PLATEAU_Y + 0.004, 0.068] }, window: [0, 70], arrow: [0, 1, 0] }],
      caption: 'Cartilage du compartiment médial aminci : l\'os frotte en charge.',
      simpleCaption: 'Le cartilage s\'use à l\'intérieur du genou : ça frotte quand on s\'appuie.',
      painZone: [0, 70], suffers: ['Cartilage de l\'intérieur du genou, aminci', 'Os sous le cartilage'], works: ['Quadriceps : il porte le poids du corps'], todo: 'Renforcer le quadriceps et bouger souvent : le cartilage se nourrit du mouvement.',
    },
    sfp: {
      friction: [{ id: 'f-pat', label: 'FROTTEMENT / COMPRESSION', at: { seg: 'patella', p: [-0.083, 0.418, 0.099] }, window: [30, 100], arrow: [0, 0, 1] }],
      damaged: [],
      caption: 'Hyperpression fémoro-patellaire entre 30 et 90° de flexion.',
      simpleCaption: 'La rotule appuie trop fort contre le fémur quand le genou plie.',
      painZone: [30, 90], suffers: ['Cartilage derrière la rotule', 'Rail du fémur (trochlée)'], works: ['Quadriceps : il tire la rotule vers le haut'], todo: 'Renforcer sans passer par la zone rouge, puis l\'élargir progressivement.',
    },
    'tendinopathie-rotulienne': {
      damaged: ['tendon-rotulien'],
      friction: [{ id: 'f-tend', label: 'TENDON SURCHARGÉ', at: { seg: 'patella', p: [-0.083, 0.398, 0.11] }, window: [60, 135], arrow: [0, -1, 0] }],
      caption: 'Surcharge du tendon rotulien à la pointe de la rotule, surtout en flexion chargée.',
      simpleCaption: 'Le tendon sous la rotule est irrité : il fait mal quand on saute ou s\'accroupit.',
      view: 'complete', painZone: [60, 135], suffers: ['Tendon sous la rotule'], works: ['Quadriceps : il tire fort sur le tendon'], todo: 'Charger le tendon progressivement (exercices lents, puis sauts).',
    },
    lca: {
      torn: ['lca'], damaged: ['lca'], shift: { seg: 'leg', by: [0, 0, 0.006] },
      caption: 'Rupture du LCA : le tibia glisse vers l\'avant (tiroir antérieur).',
      simpleCaption: 'Le ligament croisé est rompu : le genou peut « lâcher ».',
      painZone: [0, 25], suffers: ['Ligament croisé antérieur (rompu)'], works: ['Ischio-jambiers : ils retiennent le tibia', 'Quadriceps'], todo: 'Renforcer les muscles qui stabilisent le genou, puis travailler l\'équilibre.',
    },
    menisque: {
      damaged: ['menisque-medial'],
      friction: [{ id: 'f-men', label: 'PINCEMENT DU MÉNISQUE', at: { seg: 'leg', p: [-0.06, PLATEAU_Y + 0.004, 0.052] }, window: [90, 135], arrow: [0, 1, 0] }],
      caption: 'Lésion de la corne postérieure du ménisque médial, pincée en flexion profonde.',
      simpleCaption: 'Le ménisque est fissuré : il se coince quand on plie fort le genou.',
      painZone: [95, 135], suffers: ['Ménisque intérieur, fissuré'], works: ['Ischio-jambiers et mollet'], todo: 'Éviter les flexions profondes au début, renforcer en amplitude confortable.',
    },
    'entorse-lli': {
      damaged: ['lli'], strain: { lli: 0.09 },
      caption: 'Entorse du ligament collatéral médial : mis en tension en valgus.',
      simpleCaption: 'Le ligament de l\'intérieur du genou a été trop étiré.',
      painZone: [20, 60], suffers: ['Ligament de l\'intérieur du genou'], works: ['Quadriceps', 'Muscles de l\'intérieur de la cuisse'], todo: 'Protéger le ligament quelques semaines, puis renforcer et reprendre les pivots.',
    },
    ptg: {
      rom: [0, 110], implant: ['right femur', 'right tibia'],
      caption: 'Prothèse totale : surfaces articulaires remplacées par des pièces métalliques et un insert.',
      simpleCaption: 'Les surfaces usées ont été remplacées par une prothèse.',
      painZone: [90, 110], suffers: ['Tissus autour de la prothèse (cicatrisation)'], works: ['Quadriceps'], todo: 'Regagner la flexion et la force jour après jour.',
    },
  },
}
