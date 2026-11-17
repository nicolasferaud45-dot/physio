// Chaînes de compensation : pourquoi une douleur à une articulation en fait apparaître ailleurs.
// Muscles : 'R:' = côté atteint, 'L:' = côté opposé (noms BodyParts3D).
import type { V3 } from '../anatomy/types'

export type Tone = 'bad' | 'over' | 'under'
export interface Step { tone: Tone; title: string; body: string; at: V3; mark: string }
export interface Chain {
  steps: Step[]
  muscles: Record<string, Tone>
  /** répartition du poids côté atteint / côté opposé (membre inférieur) */
  weight?: [number, number]
  tests: string[]
  exercises: string[]
  program: string
}

const R = (names: string[], t: Tone) => Object.fromEntries(names.map((n) => ['R:' + n, t]))
const Lf = (names: string[], t: Tone) => Object.fromEntries(names.map((n) => ['L:' + n, t]))
const QUAD = ['right rectus femoris', 'right vastus lateralis', 'right vastus medialis', 'right vastus intermedius']
const GLUT_MED = ['right gluteus medius', 'right gluteus minimus']
const LOW_BACK = ['right iliocostalis lumborum', 'right longissimus thoracis', 'right quadratus lumborum']
const CALF = ['medial head of right gastrocnemius', 'lateral head of right gastrocnemius', 'right soleus']
const CUFF = ['right supraspinatus', 'right infraspinatus muscle', 'right teres minor', 'right subscapularis']
const NECK_OVER = ['descending part of right trapezius', 'right levator scapulae', 'right sternocleidomastoid', 'right scalenus anterior', 'right scalenus medius']

const KNEE_AT: V3 = [-0.075, 0.43, 0.07]
const HIP_AT: V3 = [-0.12, 0.86, 0.06]
const BACK_AT: V3 = [-0.03, 1.0, 0.0]
const OPP_KNEE: V3 = [0.075, 0.43, 0.07]
const ANKLE_AT: V3 = [-0.075, 0.06, 0.07]
const SHOULDER_AT: V3 = [-0.16, 1.32, 0.07]
const NECK_AT: V3 = [-0.03, 1.42, 0.04]
const ELBOW_AT: V3 = [-0.22, 1.05, 0.07]
const WRIST_AT: V3 = [-0.255, 0.81, 0.11]

const knee: Chain = {
  steps: [
    { tone: 'bad', title: 'Le genou fait mal, alors vous le pliez moins', body: 'Vous marchez « jambe raide » et posez moins de poids dessus, sans y penser.', at: KNEE_AT, mark: '1 · Genou' },
    { tone: 'under', title: 'Le quadriceps travaille moins et s\'affaiblit', body: 'Moins de muscle, c\'est moins de protection pour le genou : un cercle vicieux.', at: [-0.09, 0.6, 0.12], mark: '2 · Quadriceps' },
    { tone: 'over', title: 'La hanche et le dos prennent le relais', body: 'Le moyen fessier et les muscles du bas du dos travaillent plus que prévu : ils fatiguent et deviennent douloureux.', at: HIP_AT, mark: '3 · Hanche et dos' },
    { tone: 'over', title: 'L\'autre jambe porte plus', body: 'Plus de poids sur le genou et la cheville opposés : ils peuvent devenir douloureux à leur tour.', at: OPP_KNEE, mark: '4 · Autre genou' },
  ],
  muscles: { ...R(QUAD, 'under'), ...R(GLUT_MED, 'over'), ...R(LOW_BACK, 'over'), ...Lf(LOW_BACK, 'over'), ...Lf(['right vastus lateralis', 'right vastus medialis', 'right rectus femoris', 'medial head of right gastrocnemius', 'right soleus'], 'over') },
  weight: [40, 60],
  tests: ['Force du quadriceps (comparée à l\'autre côté)', 'Test de Trendelenburg', 'Observation de la marche'],
  exercises: ['serre-genou', 'squat-partiel', 'abduction-elastique', 'lomb-pont'],
  program: 'On soigne le genou et on soulage la chaîne : quadriceps, moyen fessier, mobilité du bas du dos, retour à une marche symétrique.',
}
const hip: Chain = {
  steps: [
    { tone: 'bad', title: 'La hanche fait mal, vous l\'épargnez', body: 'Vous penchez le tronc du côté douloureux à chaque pas pour la soulager.', at: HIP_AT, mark: '1 · Hanche' },
    { tone: 'under', title: 'Les fessiers s\'affaiblissent', body: 'Le moyen fessier ne tient plus le bassin : il bascule à chaque pas.', at: [-0.13, 0.9, 0.0], mark: '2 · Fessiers' },
    { tone: 'over', title: 'Le bas du dos compense', body: 'Les muscles du côté du dos tirent pour redresser le bassin : douleurs lombaires.', at: BACK_AT, mark: '3 · Bas du dos' },
    { tone: 'over', title: 'Le genou et l\'autre hanche portent plus', body: 'La charge passe sur l\'autre jambe et sur le genou du même côté.', at: OPP_KNEE, mark: '4 · Autre jambe' },
  ],
  muscles: { ...R(['right gluteus medius', 'right gluteus minimus', 'right gluteus maximus'], 'under'), ...R(['right adductor longus', 'right psoas major'], 'over'), ...R(LOW_BACK, 'over'), ...Lf(LOW_BACK, 'over'), ...Lf(['right gluteus medius', 'right vastus lateralis'], 'over') },
  weight: [42, 58],
  tests: ['Test de Trendelenburg', 'Force des abducteurs', 'Mobilité lombaire'],
  exercises: ['abduction-elastique', 'iso-abduction-hanche', 'lomb-pont', 'lomb-bird-dog'],
  program: 'Renforcer les fessiers, assouplir l\'avant de la hanche, soulager le bas du dos.',
}
const ankle: Chain = {
  steps: [
    { tone: 'bad', title: 'La cheville fait mal ou est instable', body: 'Vous déroulez moins le pied et poussez moins fort en marchant.', at: ANKLE_AT, mark: '1 · Cheville' },
    { tone: 'under', title: 'Le mollet et les fibulaires s\'affaiblissent', body: 'Ils protègent normalement la cheville : moins forts, la cheville se tord plus facilement.', at: [-0.09, 0.25, 0.04], mark: '2 · Mollet' },
    { tone: 'over', title: 'La hanche gère l\'équilibre à la place de la cheville', body: 'Le moyen fessier corrige chaque déséquilibre : il fatigue.', at: HIP_AT, mark: '3 · Hanche' },
    { tone: 'over', title: 'L\'autre jambe pousse pour deux', body: 'Le mollet et le tendon d\'Achille opposés sont surchargés.', at: [0.075, 0.2, 0.04], mark: '4 · Autre mollet' },
  ],
  muscles: { ...R([...CALF, 'right fibularis longus', 'right fibularis brevis'], 'under'), ...R(GLUT_MED, 'over'), ...Lf(CALF, 'over') },
  weight: [42, 58],
  tests: ['Appui unipodal yeux fermés', 'Force des fibulaires', 'Montées sur pointes (nombre)'],
  exercises: ['cheville-equilibre', 'cheville-eversion', 'mollet-montees', 'abduction-elastique'],
  program: 'Renforcer la cheville et le mollet, retrouver l\'équilibre, puis la poussée symétrique.',
}
const back: Chain = {
  steps: [
    { tone: 'bad', title: 'Le dos fait mal, vous bougez « en bloc »', body: 'Vous évitez de vous pencher et raidissez le tronc.', at: BACK_AT, mark: '1 · Bas du dos' },
    { tone: 'under', title: 'Les muscles profonds se mettent en veille', body: 'Multifides et transverse stabilisent moins bien la colonne.', at: [0, 0.97, 0.12], mark: '2 · Muscles profonds' },
    { tone: 'over', title: 'Les hanches et les ischio-jambiers se raidissent', body: 'Ils compensent le manque de mouvement du dos et tirent sur le bassin.', at: [-0.09, 0.62, 0.03], mark: '3 · Arrière des cuisses' },
    { tone: 'over', title: 'Le haut du dos et la nuque se tendent', body: 'La posture protectrice charge les trapèzes : douleurs au cou.', at: NECK_AT, mark: '4 · Nuque' },
  ],
  muscles: { ...R(['right multifidus', 'right transversus abdominis'], 'under'), ...Lf(['right multifidus', 'right transversus abdominis'], 'under'), ...R(['long head of right biceps femoris', 'right semitendinosus', 'right semimembranosus', 'right psoas major'], 'over'), ...Lf(['long head of right biceps femoris', 'right semitendinosus'], 'over'), ...R(['descending part of right trapezius'], 'over'), ...Lf(['descending part of right trapezius'], 'over') },
  tests: ['Contrôle moteur lombo-pelvien', 'Extensibilité des ischio-jambiers'],
  exercises: ['lomb-bird-dog', 'gainage', 'lomb-chat-chameau', 'lomb-marche'],
  program: 'Rebouger le dos, réveiller les muscles profonds, assouplir les hanches.',
}
const neck: Chain = {
  steps: [
    { tone: 'bad', title: 'Le cou fait mal, vous le bloquez', body: 'Vous tournez le tronc plutôt que la tête.', at: NECK_AT, mark: '1 · Cou' },
    { tone: 'under', title: 'Les muscles profonds du cou s\'affaiblissent', body: 'Ils tiennent normalement la tête : les muscles superficiels prennent le relais.', at: [0, 1.43, 0.11], mark: '2 · Muscles profonds' },
    { tone: 'over', title: 'Les trapèzes et les épaules se contractent', body: 'Les épaules montent, les trapèzes deviennent durs et douloureux.', at: [-0.08, 1.4, 0.0], mark: '3 · Trapèzes' },
    { tone: 'over', title: 'Maux de tête et douleurs d\'épaule', body: 'Les tensions remontent vers l\'arrière du crâne et descendent vers l\'épaule.', at: SHOULDER_AT, mark: '4 · Tête et épaule' },
  ],
  muscles: { ...R(['vertical intermediate part of right longus colli', 'right longus capitis'], 'under'), ...Lf(['vertical intermediate part of right longus colli', 'right longus capitis'], 'under'), ...R(NECK_OVER, 'over'), ...Lf(NECK_OVER, 'over'), ...R(['right serratus anterior'], 'under') },
  tests: ['Test de flexion cranio-cervicale', 'Mobilité en rotation'],
  exercises: ['flexion-craniocervicale', 'menton-rentre', 'retraction-scap', 'rotation-cervicale'],
  program: 'Renforcer les muscles profonds du cou, relâcher les trapèzes, bouger souvent.',
}
const shoulder: Chain = {
  steps: [
    { tone: 'bad', title: 'L\'épaule fait mal en levant le bras', body: 'Vous montez l\'épaule vers l\'oreille pour lever le bras.', at: SHOULDER_AT, mark: '1 · Épaule' },
    { tone: 'under', title: 'La coiffe et le dentelé s\'affaiblissent', body: 'Ils centrent la tête de l\'humérus et plaquent l\'omoplate : moins forts, ça pince davantage.', at: [-0.12, 1.25, 0.0], mark: '2 · Coiffe' },
    { tone: 'over', title: 'Le trapèze supérieur et l\'élévateur surchauffent', body: 'Ils haussent l\'épaule à chaque geste : douleurs au cou.', at: [-0.08, 1.4, 0.0], mark: '3 · Trapèze' },
    { tone: 'over', title: 'Le coude et l\'autre bras compensent', body: 'Vous utilisez plus le biceps et l\'autre bras pour les gestes du quotidien.', at: [0.2, 1.1, 0.07], mark: '4 · Autre bras' },
  ],
  muscles: { ...R([...CUFF, 'right serratus anterior', 'ascending part of right trapezius'], 'under'), ...R(['descending part of right trapezius', 'right levator scapulae', 'long head of right biceps brachii'], 'over'), ...Lf(['acromial part of right deltoid', 'descending part of right trapezius'], 'over') },
  tests: ['Dyskinésie scapulaire', 'Force des rotateurs externes'],
  exercises: ['retraction-scap', 're-elastique', 'pompes-mur', 'glissement-mural'],
  program: 'Renforcer la coiffe et l\'omoplate, apprendre à lever le bras sans hausser l\'épaule.',
}
const elbow: Chain = {
  steps: [
    { tone: 'bad', title: 'Le coude fait mal en serrant', body: 'Vous serrez moins fort et changez votre façon de saisir les objets.', at: ELBOW_AT, mark: '1 · Coude' },
    { tone: 'over', title: 'Les extenseurs du poignet sont surchargés', body: 'Ils tirent sur leur attache au coude à chaque prise.', at: [-0.25, 0.95, 0.09], mark: '2 · Avant-bras' },
    { tone: 'over', title: 'L\'épaule et le trapèze prennent le relais', body: 'Vous soulevez « avec l\'épaule » pour épargner le coude.', at: [-0.08, 1.4, 0.0], mark: '3 · Épaule' },
    { tone: 'under', title: 'La main perd de la force', body: 'Moins de force de préhension, des objets qui glissent.', at: WRIST_AT, mark: '4 · Main' },
  ],
  muscles: { ...R(['right extensor carpi radialis brevis', 'right extensor carpi radialis longus', 'right extensor digitorum'], 'over'), ...R(['descending part of right trapezius', 'acromial part of right deltoid'], 'over'), ...R(['right flexor digitorum profundus', 'humeroulnar head of right flexor digitorum superficialis'], 'under') },
  tests: ['Force de préhension (dynamomètre)', 'Extension contrariée du poignet et du majeur'],
  exercises: ['iso-extenseurs', 'extension-poignet-haltere', 'prehension', 'retraction-scap'],
  program: 'Charger progressivement le tendon, renforcer la prise, soulager l\'épaule.',
}
const wrist: Chain = {
  steps: [
    { tone: 'bad', title: 'Le poignet fait mal ou fourmille', body: 'Vous évitez de plier le poignet et utilisez moins la main.', at: WRIST_AT, mark: '1 · Poignet' },
    { tone: 'under', title: 'Les muscles de l\'avant-bras s\'affaiblissent', body: 'La prise devient moins précise et moins forte.', at: [-0.24, 0.92, 0.1], mark: '2 · Avant-bras' },
    { tone: 'over', title: 'Le coude et l\'épaule compensent', body: 'Vous portez avec le bras entier plutôt qu\'avec la main.', at: SHOULDER_AT, mark: '3 · Épaule' },
    { tone: 'over', title: 'L\'autre main fait plus', body: 'La main opposée prend le relais : elle peut se fatiguer à son tour.', at: [0.255, 0.81, 0.11], mark: '4 · Autre main' },
  ],
  muscles: { ...R(['right flexor carpi radialis', 'right flexor digitorum profundus', 'right extensor digitorum'], 'under'), ...R(['long head of right biceps brachii', 'acromial part of right deltoid', 'descending part of right trapezius'], 'over'), ...Lf(['right flexor digitorum profundus', 'right extensor digitorum'], 'over') },
  tests: ['Force de préhension des deux mains', 'Test de Phalen (canal carpien)'],
  exercises: ['mobilite-poignet', 'glissements-tendineux', 'renfo-poignet', 'prehension'],
  program: 'Rendre la mobilité et la force au poignet, réutiliser la main dans les gestes du quotidien.',
}

export const CHAINS: Record<string, Chain> = { genou: knee, hanche: hip, cheville: ankle, lombaire: back, cervical: neck, epaule: shoulder, coude: elbow, poignet: wrist }

/** Chaîne de la pathologie : base régionale, la lésion d'origine en rouge. */
export function chainFor(region: string, damagedMuscles: string[] = []): Chain | null {
  const c = CHAINS[region]
  if (!c) return null
  return { ...c, muscles: { ...c.muscles, ...Object.fromEntries(damagedMuscles.map((m) => ['R:' + m, 'bad' as Tone])) } }
}
